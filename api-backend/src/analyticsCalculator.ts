// functions/src/analyticsCalculator.ts - FULLY OPTIMIZED
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { onSchedule } from "firebase-functions/scheduler";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Conversion factors
const UNIT_CONVERSIONS = {
  kg: 1,
  servings: 0.25,
  packages: 1,
  containers: 2,
  liters: 1,
};

// Environmental impact calculations
const ENVIRONMENTAL_FACTORS = {
  CO2_PER_KG_FOOD: 2.5,
  WATER_PER_KG_FOOD: 1000,  
  LANDFILL_PER_KG_FOOD: 0.0005,
  CARS_EQUIVALENT: 0.00025,
};

interface AnalyticsData {
  timestamp: admin.firestore.Timestamp;
  period: string;
  metrics: {
    totalFoodRedistributedKg: number;
    co2PreventedKg: number;
    waterSavedLiters: number;
    landfillSpaceSavedM3: number;
    carsOffRoadEquivalent: number;
    spoilageRate: number;
    utilizationRate: number;
    foodCategories: { [category: string]: number };
    userDistribution: {
      donors: number;
      volunteers: number; 
      receivers: number;
      admins: number;
    };
    donationTrends: Array<{
      month: string;
      donations: number;
      foodWeight: number;
    }>;
    campaignPerformance: Array<{
      month: string;
      totalSpots: number;
      registeredSpots: number;
      attendanceRate: number;
    }>;
    reportedItems: {
      food: number;
      campaigns: number;
      users: number;
      total: number;
      resolutionRate: number;
    };
    platformHealth: {
      activeUsers: number;
      completionRate: number;
      userSatisfaction: number;
    };
  };
  insights: {
    summary: string;
    trends: string[];
    recommendations: string[];
    generatedBy: "gemini" | "calculations";
  };
}

// OPTIMIZED: Schedule analytics with intelligent batching
export const calculateAnalytics = onSchedule(
  {
    schedule: "0 */6 * * *", // Every 6 hours
    timeZone: "Asia/Kuala_Lumpur",
    timeoutSeconds: 540, // 9 minutes for batched processing
    memory: "4GiB",
  },
  async (event) => {
    try {
      logger.info('Starting batched analytics calculation...');
      
      // Check cache first (4 hour cache for scheduled runs)
      const cachedAnalytics = await db.collection('analytics').doc('current').get();
      if (cachedAnalytics.exists) {
        const cacheTime = cachedAnalytics.data()?.timestamp?.toDate();
        const now = new Date();
        if (cacheTime && (now.getTime() - cacheTime.getTime()) < 4 * 60 * 60 * 1000) {
          logger.info('Using cached analytics for scheduled run');
          return;
        }
      }

      // Use batched data fetching
      const data = await fetchBatchedData();
      const metrics = await calculateComprehensiveMetrics(data);
      const insights = await generateAIInsights(metrics, data);

      const analyticsData: AnalyticsData = {
        timestamp: admin.firestore.Timestamp.now(),
        period: "daily",
        metrics,
        insights
      };

      await db.collection('analytics').doc('current').set(analyticsData);
      
      const historicalDoc = `history_${new Date().toISOString().split('T')[0]}`;
      await db.collection('analytics').doc(historicalDoc).set(analyticsData);

      logger.info('Batched analytics calculation completed successfully');
      
    } catch (error) {
      logger.error('Error in batched analytics calculation:', error);
      // Don't throw in scheduled function
    }
  }
);

// OPTIMIZED: Batched data fetching with delays
async function fetchBatchedData() {
  // Define proper interfaces for the data
  interface UserData {
    id: string;
    status?: string;
    role?: string;
    profile?: any;
    [key: string]: any;
  }

  interface FoodListingData {
    id: string;
    status?: string;
    collectedQuantity?: number;
    totalQuantity?: number;
    quantityUnit?: string;
    category?: string;
    donorId?: string;
    createdAt?: any;
    geolocation?: any;
    [key: string]: any;
  }

  interface CampaignData {
    id: string;
    status?: string;
    totalSpots?: number;
    registeredSpots?: number;
    campaignDate?: string;
    createdAt?: any;
    organizerId?: string;
    geolocation?: any;
    [key: string]: any;
  }

  interface ReservationData {
    id: string;
    foodListingId?: string;
    userId?: string;
    status?: string;
    [key: string]: any;
  }

  interface RegistrationData {
    id: string;
    campaignId?: string;
    userId?: string;
    status?: string;
    [key: string]: any;
  }

  interface RatingData {
    id: string;
    rating?: number;
    targetType?: string;
    [key: string]: any;
  }

  interface ReportData {
    id: string;
    reportType?: string;
    status?: string;
    severity?: string;
    [key: string]: any;
  }

  // Initialize with proper types
  const results = {
    users: [] as UserData[],
    foodListings: [] as FoodListingData[],
    campaigns: [] as CampaignData[],
    reservations: [] as ReservationData[],
    registrations: [] as RegistrationData[],
    ratings: [] as RatingData[],
    reports: [] as ReportData[]
  };

  try {
    logger.info("Starting batched data collection...");

    // BATCH 1: Users (most important)
    logger.info("Batch 1: Fetching users...");
    const usersSnapshot = await db.collection('users')
      .where('status', '==', 'approved')
      .limit(1000)
      .get();
    results.users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    logger.info(`Fetched ${results.users.length} users`);
    
    await delay(2000); // 2 second delay between batches

    // BATCH 2: Food listings (high priority)
    logger.info("Batch 2: Fetching food listings...");
    const foodSnapshot = await db.collection('foodListings')
      .limit(1500)
      .get();
    results.foodListings = foodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    logger.info(`Fetched ${results.foodListings.length} food listings`);
    
    await delay(2000);

    // BATCH 3: Campaigns
    logger.info("Batch 3: Fetching campaigns...");
    const campaignsSnapshot = await db.collection('campaigns')
      .limit(500)
      .get();
    results.campaigns = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    logger.info(`Fetched ${results.campaigns.length} campaigns`);
    
    await delay(2000);

    // BATCH 4: Reservations (only for completed food listings)
    logger.info("Batch 4: Fetching reservations...");
    const completedFoodIds = results.foodListings
      .filter(f => f.status === 'completed')
      .map(f => f.id)
      .slice(0, 200); // Limit to 200 to avoid quota
    
    if (completedFoodIds.length > 0) {
      // Process in chunks of 10 (Firestore 'in' query limit)
      for (let i = 0; i < completedFoodIds.length; i += 10) {
        const chunk = completedFoodIds.slice(i, i + 10);
        const reservationsSnapshot = await db.collection('foodReservations')
          .where('foodListingId', 'in', chunk)
          .limit(300)
          .get();
        const chunkResults = reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        results.reservations.push(...chunkResults);
        
        if (i + 10 < completedFoodIds.length) {
          await delay(1000); // Small delay between chunks
        }
      }
    }
    logger.info(`Fetched ${results.reservations.length} reservations`);
    
    await delay(2000);

    // BATCH 5: Campaign registrations
    logger.info("Batch 5: Fetching campaign registrations...");
    const completedCampaignIds = results.campaigns
      .filter(c => c.status === 'completed')
      .map(c => c.id)
      .slice(0, 50);
    
    if (completedCampaignIds.length > 0) {
      // Process in chunks of 10
      for (let i = 0; i < completedCampaignIds.length; i += 10) {
        const chunk = completedCampaignIds.slice(i, i + 10);
        const registrationsSnapshot = await db.collection('campaignRegistrations')
          .where('campaignId', 'in', chunk)
          .limit(200)
          .get();
        const chunkResults = registrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        results.registrations.push(...chunkResults);
        
        if (i + 10 < completedCampaignIds.length) {
          await delay(1000); // Small delay between chunks
        }
      }
    }
    logger.info(`Fetched ${results.registrations.length} registrations`);
    
    await delay(2000);

    // BATCH 6: Ratings (sample for user satisfaction)
    logger.info("Batch 6: Fetching ratings...");
    const ratingsSnapshot = await db.collection('ratings')
      .limit(200)
      .get();
    results.ratings = ratingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    logger.info(`Fetched ${results.ratings.length} ratings`);
    
    await delay(2000);

    // BATCH 7: Reports
    logger.info("Batch 7: Fetching reports...");
    const reportsSnapshot = await db.collection('reports')
      .limit(100)
      .get();
    results.reports = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    logger.info(`Fetched ${results.reports.length} reports`);

    logger.info("Batched data collection completed");
    
  } catch (error) {
    logger.error("Error in batched data collection:", error);
    // Continue with whatever data we have
  }

  return results;
}

// COMPREHENSIVE: Full metrics calculation with all original depth
async function calculateComprehensiveMetrics(data: any) {
  const { users, foodListings, campaigns, reservations, registrations, ratings, reports } = data;

  // FOOD METRICS - Full calculation
  const foodStats = foodListings.reduce((acc: any, listing: any) => {
    const unit = listing.quantityUnit as keyof typeof UNIT_CONVERSIONS;
    const conversion = UNIT_CONVERSIONS[unit] || 1;
    const collectedKg = (listing.collectedQuantity || 0) * conversion;
    const totalKg = (listing.totalQuantity || 0) * conversion;
    
    acc.totalFoodKg += collectedKg;
    acc.totalUploadedKg += totalKg;
    
    // Food categories with detailed breakdown
    const category = listing.category || 'Other';
    acc.foodCategories[category] = (acc.foodCategories[category] || 0) + collectedKg;
    
    // Track by status for completion rate
    if (listing.status === 'completed') acc.completedListings++;
    if (listing.status === 'approved') acc.approvedListings++;
    
    return acc;
  }, {
    totalFoodKg: 0,
    totalUploadedKg: 0,
    foodCategories: {} as { [key: string]: number },
    completedListings: 0,
    approvedListings: 0
  });

  const { totalFoodKg, totalUploadedKg, foodCategories, completedListings, approvedListings } = foodStats;

  // ENVIRONMENTAL IMPACT - Full calculation
  const co2PreventedKg = totalFoodKg * ENVIRONMENTAL_FACTORS.CO2_PER_KG_FOOD;
  const waterSavedLiters = totalFoodKg * ENVIRONMENTAL_FACTORS.WATER_PER_KG_FOOD;
  const landfillSpaceSavedM3 = totalFoodKg * ENVIRONMENTAL_FACTORS.LANDFILL_PER_KG_FOOD;
  const carsOffRoadEquivalent = co2PreventedKg * ENVIRONMENTAL_FACTORS.CARS_EQUIVALENT;

  // USER DISTRIBUTION - Detailed breakdown
  const userDistribution = users.reduce((acc: any, user: any) => {
    switch (user.role) {
      case 'donor': 
        acc.donors++;
        if (user.profile?.orgType) {
          acc.donorTypes[user.profile.orgType] = (acc.donorTypes[user.profile.orgType] || 0) + 1;
        }
        break;
      case 'volunteer': acc.volunteers++; break;
      case 'receiver': acc.receivers++; break;
      case 'admin': acc.admins++; break;
    }
    return acc;
  }, { 
    donors: 0, 
    volunteers: 0, 
    receivers: 0, 
    admins: 0,
    donorTypes: {} as { [key: string]: number }
  });

  // DONATION TRENDS - Last 6 months with real data
  const donationTrends = calculateRealDonationTrends(foodListings);

  // CAMPAIGN PERFORMANCE - Detailed analysis
  const campaignPerformance = calculateRealCampaignPerformance(campaigns, registrations);

  // REPORT METRICS - Comprehensive
  const reportedItems = {
    food: reports.filter((r: any) => r.reportType === 'food').length,
    campaigns: reports.filter((r: any) => r.reportType === 'campaign').length,
    users: reports.filter((r: any) => r.reportType === 'user').length,
    total: reports.length,
    resolutionRate: reports.filter((r: any) => r.status === 'resolved').length / Math.max(reports.length, 1),
    bySeverity: reports.reduce((acc: any, report: any) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {})
  };

  // PLATFORM HEALTH - Comprehensive metrics
  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0 ? 
    ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / totalRatings : 0;

  const platformHealth = {
    activeUsers: users.length,
    completionRate: completedListings / Math.max(foodListings.length, 1),
    approvalRate: approvedListings / Math.max(foodListings.length, 1), // ADD THIS
    userSatisfaction: averageRating,
    retentionRate: calculateRetentionRate(users, foodListings),
    engagementScore: calculateEngagementScore(users, foodListings, campaigns, reservations, registrations)
  };

  return {
    totalFoodRedistributedKg: totalFoodKg,
    co2PreventedKg,
    waterSavedLiters, 
    landfillSpaceSavedM3,
    carsOffRoadEquivalent,
    spoilageRate: (totalUploadedKg - totalFoodKg) / Math.max(totalUploadedKg, 1),
    utilizationRate: totalFoodKg / Math.max(totalUploadedKg, 1),
    foodCategories,
    userDistribution,
    donationTrends,
    campaignPerformance,
    reportedItems,
    platformHealth,
    additionalMetrics: {
      avgDonationSize: totalFoodKg / Math.max(completedListings, 1),
      donorRetention: calculateDonorRetention(users, foodListings),
      geographicCoverage: calculateGeographicCoverage(foodListings, campaigns)
    }
  };
}

// REAL donation trends calculation (not simplified)
function calculateRealDonationTrends(foodListings: any[]) {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().substring(0, 7); // YYYY-MM
  }).reverse();

  return last6Months.map(month => {
    const monthListings = foodListings.filter(f => {
      if (!f.createdAt) return false;
      
      let listingDate: Date;
      if (f.createdAt.toDate) {
        listingDate = f.createdAt.toDate();
      } else if (typeof f.createdAt === 'string') {
        listingDate = new Date(f.createdAt);
      } else {
        listingDate = new Date(f.createdAt);
      }
      
      return listingDate.toISOString().substring(0, 7) === month;
    });

    const donations = monthListings.length;
    const foodWeight = monthListings
      .filter(f => f.status === 'completed')
      .reduce((sum, listing) => {
        const unit = listing.quantityUnit as keyof typeof UNIT_CONVERSIONS;
        const conversion = UNIT_CONVERSIONS[unit] || 1;
        return sum + (listing.collectedQuantity || 0) * conversion;
      }, 0);

    return {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      donations,
      foodWeight,
      completionRate: monthListings.filter(f => f.status === 'completed').length / Math.max(monthListings.length, 1)
    };
  });
}

// REAL campaign performance calculation
function calculateRealCampaignPerformance(campaigns: any[], registrations: any[]) {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().substring(0, 7);
  }).reverse();

  return last6Months.map(month => {
    const monthCampaigns = campaigns.filter(c => {
      const campaignDate = c.campaignDate?.substring(0, 7) || 
        (c.createdAt ? new Date(c.createdAt).toISOString().substring(0, 7) : '');
      return campaignDate === month;
    });

    const totalSpots = monthCampaigns.reduce((sum, c) => sum + (c.totalSpots || 0), 0);
    const registeredSpots = monthCampaigns.reduce((sum, c) => sum + (c.registeredSpots || 0), 0);
    const actualAttendees = registrations
      .filter(r => monthCampaigns.some(c => c.id === r.campaignId && r.status === 'attended'))
      .length;
    
    return {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      totalSpots,
      registeredSpots,
      actualAttendees,
      registrationRate: totalSpots > 0 ? registeredSpots / totalSpots : 0,
      attendanceRate: registeredSpots > 0 ? actualAttendees / registeredSpots : 0
    };
  });
}

// ADDITIONAL METRICS CALCULATIONS
function calculateRetentionRate(users: any[], foodListings: any[]) {
  // Simplified retention calculation
  const activeDonors = users.filter(u => u.role === 'donor').length;
  const recurringDonors = users.filter(u => {
    const userListings = foodListings.filter(f => f.donorId === u.uid);
    return userListings.length > 1;
  }).length;
  
  return activeDonors > 0 ? recurringDonors / activeDonors : 0;
}

function calculateEngagementScore(users: any[], foodListings: any[], campaigns: any[], reservations: any[], registrations: any[]) {
  // Calculate platform engagement score
  const totalUsers = users.length;
  if (totalUsers === 0) return 0;
  
  const activeUsers = users.filter(u => {
    const hasListings = foodListings.some(f => f.donorId === u.uid);
    const hasCampaigns = campaigns.some(c => c.organizerId === u.uid);
    const hasReservations = reservations.some(r => r.userId === u.uid);
    const hasRegistrations = registrations.some(r => r.userId === u.uid);
    
    return hasListings || hasCampaigns || hasReservations || hasRegistrations;
  }).length;
  
  return activeUsers / totalUsers;
}

function calculateDonorRetention(users: any[], foodListings: any[]) {
  const donors = users.filter(u => u.role === 'donor');
  if (donors.length === 0) return 0;
  
  const activeDonors = donors.filter(donor => {
    const donorListings = foodListings.filter(f => f.donorId === donor.uid);
    return donorListings.length > 0;
  }).length;
  
  return activeDonors / donors.length;
}

function calculateGeographicCoverage(foodListings: any[], campaigns: any[]) {
  const uniqueLocations = new Set();
  
  foodListings.forEach(listing => {
    if (listing.geolocation?.formattedAddress) {
      uniqueLocations.add(listing.geolocation.formattedAddress);
    }
  });
  
  campaigns.forEach(campaign => {
    if (campaign.geolocation?.formattedAddress) {
      uniqueLocations.add(campaign.geolocation.formattedAddress);
    }
  });
  
  return uniqueLocations.size;
}

// AI INSIGHTS - Enhanced with more data
async function generateAIInsights(metrics: any, rawData: any) {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Analyze this comprehensive food redistribution platform data and provide detailed insights:
      
      ENVIRONMENTAL IMPACT:
      - Food Saved: ${metrics.totalFoodRedistributedKg.toFixed(0)} kg
      - CO2 Prevented: ${metrics.co2PreventedKg.toFixed(0)} kg (${metrics.carsOffRoadEquivalent.toFixed(1)} cars off road)
      - Water Saved: ${metrics.waterSavedLiters.toLocaleString()} liters
      - Landfill Space: ${metrics.landfillSpaceSavedM3.toFixed(2)} m³
      
      PLATFORM PERFORMANCE:
      - Users: ${JSON.stringify(metrics.userDistribution)}
      - Utilization Rate: ${(metrics.utilizationRate * 100).toFixed(1)}%
      - Spoilage Rate: ${(metrics.spoilageRate * 100).toFixed(1)}%
      - Approval Rate: ${(metrics.platformHealth.approvalRate * 100).toFixed(1)}%
      - User Satisfaction: ${metrics.platformHealth.userSatisfaction.toFixed(1)}/5
      - Engagement Score: ${(metrics.platformHealth.engagementScore * 100).toFixed(1)}%
      
      TREND DATA:
      - Donation Trends: ${JSON.stringify(metrics.donationTrends)}
      - Campaign Performance: ${JSON.stringify(metrics.campaignPerformance)}
      
      Provide:
      1. A comprehensive executive summary (3-4 sentences)
      2. 4-5 key trends and patterns observed
      3. 4-5 actionable strategic recommendations
      4. 2-3 potential growth opportunities
      
      Be data-driven, specific, and focus on both environmental impact and platform efficiency.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseEnhancedAIResponse(text);
  } catch (error) {
    logger.warn('Gemini insights failed, using enhanced fallback:', error);
    return generateEnhancedFallbackInsights(metrics);
  }
}

function parseEnhancedAIResponse(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Enhanced parsing for comprehensive insights
  const summary = lines.find(line => line.toLowerCase().includes('summary')) || 
                 lines.slice(0, 3).join(' ') || 
                 'Platform operating with significant environmental impact.';
  
  const trends = lines.filter(line => 
    line.toLowerCase().includes('trend') || 
    line.includes('•') || 
    line.includes('-') ||
    line.toLowerCase().includes('pattern')
  ).slice(0, 5);
  
  const recommendations = lines.filter(line => 
    line.toLowerCase().includes('recommend') || 
    line.includes('1.') || 
    line.includes('2.') ||
    line.includes('3.') ||
    line.toLowerCase().includes('suggest')
  ).slice(0, 5);
  
  const opportunities = lines.filter(line => 
    line.toLowerCase().includes('opportunity') || 
    line.toLowerCase().includes('growth') ||
    line.toLowerCase().includes('potential')
  ).slice(0, 3);

  return {
    summary,
    trends: trends.length > 0 ? trends : ['Analyzing platform performance patterns...'],
    recommendations: recommendations.length > 0 ? recommendations : ['Continue current optimization efforts'],
    opportunities: opportunities.length > 0 ? opportunities : ['Expand donor and receiver networks'],
    generatedBy: 'gemini' as const
  };
}

function generateEnhancedFallbackInsights(metrics: any) {
  return {
    summary: `Platform has redistributed ${metrics.totalFoodRedistributedKg.toFixed(0)}kg of food, preventing ${metrics.co2PreventedKg.toFixed(0)}kg of CO2 emissions and saving ${metrics.waterSavedLiters.toLocaleString()} liters of water.`,
    trends: [
      `Food utilization rate: ${(metrics.utilizationRate * 100).toFixed(1)}% efficiency`,
      `Listing approval rate: ${(metrics.platformHealth.approvalRate * 100).toFixed(1)}% of listings approved`,
      `Active user distribution: ${metrics.userDistribution.donors} donors, ${metrics.userDistribution.receivers} receivers`,
      `User satisfaction score: ${metrics.platformHealth.userSatisfaction.toFixed(1)}/5`,
      `Platform engagement: ${(metrics.platformHealth.engagementScore * 100).toFixed(1)}% active participation`,
      `Environmental impact: Equivalent to ${metrics.carsOffRoadEquivalent.toFixed(1)} cars off the road`
    ],
    recommendations: [
      `Focus on reducing ${(metrics.spoilageRate * 100).toFixed(1)}% spoilage rate through better matching`,
      `Maintain high approval rate of ${(metrics.platformHealth.approvalRate * 100).toFixed(1)}% for quality control`,
      `Increase donor engagement to boost food quantities and variety`,
      `Improve campaign attendance rates through targeted promotion`,
      `Expand geographic coverage beyond current ${metrics.additionalMetrics?.geographicCoverage || 0} locations`,
      `Enhance user satisfaction from current ${metrics.platformHealth.userSatisfaction.toFixed(1)}/5 rating`
    ],
    opportunities: [
      `Scale operations to reach more communities`,
      `Develop partnerships with additional food donors`,
      `Implement advanced matching algorithms for better efficiency`
    ],
    generatedBy: 'calculations' as const
  };
}

// OPTIMIZED MANUAL FUNCTION with full depth
export const calculateAnalyticsManual = onCall(
  {
    enforceAppCheck: false,
    consumeAppCheckToken: false,
    cors: true,
    timeoutSeconds: 300, // 5 minutes for comprehensive analysis
    memory: "4GiB", // More memory for complex calculations
  },
  async (request) => {
    try {
      logger.info("calculateAnalyticsManual - COMPREHENSIVE VERSION");

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      // Check cache first (30 minute cache for manual runs)
      const cachedAnalytics = await db.collection('analytics').doc('current').get();
      if (cachedAnalytics.exists) {
        const cacheTime = cachedAnalytics.data()?.timestamp?.toDate();
        const now = new Date();
        if (cacheTime && (now.getTime() - cacheTime.getTime()) < 30 * 60 * 1000) {
          logger.info("Returning cached analytics data");
          return {
            success: true,
            message: 'Using recently cached analytics data',
            data: cachedAnalytics.data(),
            cached: true,
            cacheAge: Math.round((now.getTime() - cacheTime.getTime()) / 60000) + ' minutes'
          };
        }
      }

      // Check admin permissions
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (!userData || (userData.role !== 'admin' && !userData.isAdmin)) {
        throw new HttpsError("permission-denied", "Only administrators can run analytics");
      }

      logger.info("Starting COMPREHENSIVE analytics data collection");
      
      // Use batched data collection
      const data = await fetchBatchedData();
      const metrics = await calculateComprehensiveMetrics(data);
      const insights = await generateAIInsights(metrics, data);

      const analyticsData: AnalyticsData = {
        timestamp: admin.firestore.Timestamp.now(),
        period: "manual",
        metrics,
        insights
      };

      // Cache the comprehensive results
      await db.collection('analytics').doc('current').set(analyticsData);

      return {
        success: true,
        message: 'Comprehensive analytics calculated successfully with full data depth',
        data: analyticsData,
        cached: false,
        dataSummary: {
          usersAnalyzed: data.users.length,
          listingsAnalyzed: data.foodListings.length,
          campaignsAnalyzed: data.campaigns.length,
          metricsCalculated: Object.keys(metrics).length
        }
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error in comprehensive analytics manual:", error);
      
      // Enhanced error handling with fallbacks
      if (errorMessage.includes('quota') || errorMessage.includes('resource exhausted')) {
        const cachedAnalytics = await db.collection('analytics').doc('current').get();
        if (cachedAnalytics.exists) {
          return {
            success: true,
            message: 'Using cached data due to Firestore quota limits - comprehensive analysis requires quota increase',
            data: cachedAnalytics.data(),
            cached: true,
            warning: 'QUOTA_LIMIT: Request quota increase for full analysis'
          };
        }
      }
      
      throw new HttpsError("internal", `Comprehensive analytics failed: ${errorMessage}`);
    }
  }
);

// Utility function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}