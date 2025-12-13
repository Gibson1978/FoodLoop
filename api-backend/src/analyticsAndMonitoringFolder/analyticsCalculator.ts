// functions/src/analyticsCalculator.ts - FINAL PRODUCTION-READY VERSION

import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { onSchedule } from "firebase-functions/scheduler";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.APP_GEMINI_KEY as string);

// Conversion factors
const UNIT_CONVERSIONS = {
  kg: 1,
  servings: 0.25,
  packages: 1,
  containers: 2,
  liters: 1,
};

// Environmental impact calculations (Kept as standard averages)
const ENVIRONMENTAL_FACTORS = {
  CO2_PER_KG_FOOD: 2.5,
  WATER_PER_KG_FOOD: 1000,  
  LANDFILL_PER_KG_FOOD: 0.0005,
  CARS_EQUIVALENT: 0.00025,
};

// --- NEW GEOGRAPHIC THRESHOLD CONSTANTS ---
const GEOGRAPHIC_THRESHOLDS = {
  HIGH_UTILIZATION: 0.8,    // 80%
  LOW_UTILIZATION: 0.3,     // 30%
  LOW_UPLOAD_VS_RECEIVER: 0.5, // 1 listing for every 2 receivers
  MIN_ACTIVITY: 5,           // Min listings + reservations to categorize
};

// --- NEW INTERFACES ---

interface CityAnalysis {
  city: string;
  foodListingDensity: number;
  totalQuantityKg: number;
  collectedQuantityKg: number;
  collectionDensity: number;
  receiverDensity: number;
  donorDensity: number;
  utilizationRate: number;
  status: 'High Need' | 'High Waste' | 'High Efficiency' | 'Low Activity' | 'Unknown';
}

interface GeographicAnalysis {
  totalCities: number;
  byCity: CityAnalysis[];
  keyInsights: {
    highNeedCities: string[];
    highWasteCities: string[];
    highEfficiencyCities: string[];
  };
  // NEW: Include thresholds for AI context
  thresholds: typeof GEOGRAPHIC_THRESHOLDS;
}

// --- END NEW INTERFACES ---


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
    // NEW: User signup trends
    userSignupTrends: Array<{
      month: string;
      donors: number;
      volunteers: number;
      receivers: number;
      total: number;
    }>;
    // --- START: ADDED FOR LOCATION ANALYSIS ---
    geographicAnalysis: GeographicAnalysis; 
    // --- END: ADDED FOR LOCATION ANALYSIS ---
    keyUsers: {
      highestRated: Array<{ uid: string; displayName: string; role: string; avg: number; count: number }>;
      lowestRated: Array<{ uid: string; displayName: string; role: string; avg: number; count: number }>;
      mostReported: Array<{ uid: string; displayName: string; role: string; count: number; }>;
    };
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
    opportunities: string[];
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
    secrets: ["APP_GEMINI_KEY"],
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
    uid?: string;
    status?: string;
    role?: string;
    profile?: any;
    createdAt?: any;
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
    donorId?: string;
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
    targetUserId?: string;
    targetType?: string;
    [key: string]: any;
  }

  interface ReportData {
    id: string;
    reportType?: string;
    targetUserId?: string;
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
    results.users = usersSnapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
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

// Helper function to safely get a Date object from a Firestore timestamp or string (FIX for 500 error)
function safeGetDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  if (timestamp.toDate) {
    try {
      return timestamp.toDate();
    } catch {
      return null;
    }
  }
  
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

// === NEW: LOCATION-BASED ANALYSIS FUNCTION ===

/**
 * Groups and analyzes food listings, reservations, and users by city to 
 * categorize areas into High Need, High Waste, High Efficiency, or Low Activity.
 */
function calculateGeographicAnalysis(users: any[], foodListings: any[], reservations: any[]): GeographicAnalysis {
  
  const cityDataMap = new Map<string, {
    listings: number;
    totalQuantity: number;
    collectedQuantity: number;
    reservations: number;
    receivers: Set<string>;
    donors: Set<string>;
  }>();

  const getCityKey = (user: any) => user.profile?.address?.city || 'Unknown';
  
  // 1. Analyze Users (for density)
  users.forEach(user => {
    const city = getCityKey(user);
    if (!cityDataMap.has(city)) {
      cityDataMap.set(city, {
        listings: 0,
        totalQuantity: 0,
        collectedQuantity: 0,
        reservations: 0,
        receivers: new Set(),
        donors: new Set(),
      });
    }
    const data = cityDataMap.get(city)!;

    if (user.role === 'receiver') data.receivers.add(user.uid);
    if (user.role === 'donor') data.donors.add(user.uid);
  });
  
  // 2. Analyze Listings (for supply and collection)
  const userMap = new Map(users.map(u => [u.uid, u]));
  foodListings.forEach(listing => {
    const donor = userMap.get(listing.donorId);
    if (!donor) return;
    
    const city = getCityKey(donor);
    if (!cityDataMap.has(city)) {
        cityDataMap.set(city, {
            listings: 0,
            totalQuantity: 0,
            collectedQuantity: 0,
            reservations: 0,
            receivers: new Set(),
            donors: new Set(),
        });
    }
    const data = cityDataMap.get(city)!;

    const unit = listing.quantityUnit as keyof typeof UNIT_CONVERSIONS;
    const conversion = UNIT_CONVERSIONS[unit] || 1;
    const collectedKg = (listing.collectedQuantity || 0) * conversion; 
    const totalKg = (listing.totalQuantity || 0) * conversion;

    data.listings++;
    data.totalQuantity += totalKg;
    data.collectedQuantity += collectedKg;
  });
  
  // 3. Analyze Reservations (for demand/activity)
  reservations.forEach(res => {
    if (res.status === 'completed' || res.status === 'collected') {
      const donor = userMap.get(res.donorId);
      // Fallback: If donor is missing, try to find the listing's original city if listing ID is present
      let city: string;
      if (donor) {
          city = getCityKey(donor);
      } else {
          // Fallback logic to determine location for reservation completion if donor is missing
          // This requires fetching the listing which is outside this local function scope, 
          // so we rely solely on donor location for now as per design.
          return;
      }

      if (cityDataMap.has(city)) {
        cityDataMap.get(city)!.reservations++;
      }
    }
  });

  // 4. Calculate Metrics and Determine Status (Triage)
  const results: CityAnalysis[] = [];
  const keyInsights: GeographicAnalysis['keyInsights'] = {
    highNeedCities: [],
    highWasteCities: [],
    highEfficiencyCities: [],
  };
  
  const highThreshold = GEOGRAPHIC_THRESHOLDS.HIGH_UTILIZATION;
  const lowThreshold = GEOGRAPHIC_THRESHOLDS.LOW_UTILIZATION;
  const lowUploadVsReceiver = GEOGRAPHIC_THRESHOLDS.LOW_UPLOAD_VS_RECEIVER;
  const minActivity = GEOGRAPHIC_THRESHOLDS.MIN_ACTIVITY;

  Array.from(cityDataMap.entries())
    .filter(([city]) => city !== 'Unknown')
    .forEach(([city, data]) => {
      
      const totalActivity = data.listings + data.reservations;
      const utilizationRate = data.totalQuantity > 0 ? data.collectedQuantity / data.totalQuantity : 0;
      
      const uploadVsReceiverRatio = data.listings / Math.max(data.receivers.size, 1);
      
      let status: CityAnalysis['status'] = 'Unknown';
      
      if (totalActivity < minActivity && data.donors.size + data.receivers.size < 5) {
        status = 'Low Activity';
      } else if (utilizationRate < lowThreshold && data.listings > 10) {
        // High Supply, Low Collection = High Waste Risk / Poor Logistics
        status = 'High Waste';
        keyInsights.highWasteCities.push(city);
      } else if (utilizationRate > highThreshold && uploadVsReceiverRatio < lowUploadVsReceiver && data.reservations > 10) {
        // High Collection, Listings are SCARCE relative to receivers (Ratio < 0.5 implies less than 1 listing for every 2 receivers) = High Need
        status = 'High Need';
        keyInsights.highNeedCities.push(city);
      } else if (utilizationRate > highThreshold && data.listings > 10) {
        // High Collection, High Listings = High Efficiency (Successful operation)
        status = 'High Efficiency';
        keyInsights.highEfficiencyCities.push(city);
      } else {
        status = 'Low Activity'; // Default for moderate/low volume areas
      }

      results.push({
        city,
        foodListingDensity: data.listings,
        totalQuantityKg: parseFloat(data.totalQuantity.toFixed(1)),
        collectedQuantityKg: parseFloat(data.collectedQuantity.toFixed(1)),
        collectionDensity: data.reservations,
        receiverDensity: data.receivers.size,
        donorDensity: data.donors.size,
        utilizationRate: parseFloat((utilizationRate * 100).toFixed(1)),
        status,
      });
    });
    
  return {
    totalCities: results.length,
    byCity: results.sort((a, b) => b.totalQuantityKg - a.totalQuantityKg),
    keyInsights,
    thresholds: GEOGRAPHIC_THRESHOLDS, // ADDED THRESHOLDS
  };
}

// === END: NEW LOCATION-BASED ANALYSIS FUNCTION ===

// NEW: Function to calculate user signups over time
function calculateUserSignupTrends(users: any[]) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Look back 6 months

  // Helper to get YYYY-MM format
  const getMonthKey = (date: Date) => date.toISOString().substring(0, 7);
  
  const trendsMap = new Map<string, { donors: number, volunteers: number, receivers: number, total: number }>();

  // Initialize map with last 6 months
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return getMonthKey(date);
  }).reverse();
  
  last6Months.forEach(monthKey => {
    trendsMap.set(monthKey, { donors: 0, volunteers: 0, receivers: 0, total: 0 });
  });

  users.forEach(user => {
    const signupDate = safeGetDate(user.createdAt);
    
    if (signupDate && signupDate.getTime() >= cutoffDate.getTime()) {
      const monthKey = getMonthKey(signupDate);
      if (trendsMap.has(monthKey)) {
        const trend = trendsMap.get(monthKey)!;
        trend.total++;
        switch (user.role) {
          case 'donor': trend.donors++; break;
          case 'volunteer': trend.volunteers++; break;
          case 'receiver': trend.receivers++; break;
        }
        trendsMap.set(monthKey, trend);
      }
    }
  });

  return Array.from(trendsMap.entries()).map(([monthKey, data]) => ({
    month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
    ...data
  }));
}

// NEW: Function to calculate key users (ratings/reports) - FIXED NAME/RATING EXTRACTION
function calculateKeyUsers(users: any[], ratings: any[], reports: any[]) {
  // 1. Calculate Average Ratings per User
  const userRatings = new Map<string, { count: number, sum: number, avg: number, uid: string, role: string, displayName: string }>();
  
  users.forEach(u => {
    // Determine the most descriptive display name
    const name = u.profile?.orgName || u.profile?.contactPerson || u.profile?.name;
    const displayName = name || (u.uid ? `User ${u.uid.substring(0, 5)}` : 'Unknown User');

    // Attempt to initialize with existing user document rating/count if available (e.g., donorRating)
    const initialRating = u.donorRating || u.receiverRating || u.rating || 0;
    const initialCount = u.donorTotalRatings || u.receiverTotalRatings || u.totalRatings || 0;
    
    userRatings.set(u.uid, { 
      count: initialCount, 
      sum: initialRating * initialCount, 
      avg: initialCount > 0 ? initialRating : 0, 
      uid: u.uid, 
      role: u.role || 'user', 
      displayName: displayName
    });
  });

  // Override or update ratings based on the dedicated ratings collection
  ratings.forEach(r => {
    const targetUid = r.targetUserId || r.targetId; // Support different field names
    if (userRatings.has(targetUid) && r.rating !== undefined) {
      const entry = userRatings.get(targetUid)!;
      entry.count++;
      entry.sum += (r.rating || 0);
      entry.avg = entry.sum / entry.count;
      userRatings.set(targetUid, entry);
    }
  });

  const ratedUsers = Array.from(userRatings.values()).filter(u => u.count > 0);
  
  // 2. Calculate Reports per User (FIXED LOGIC)
  const userReports = new Map<string, number>();
  reports.forEach(r => {
    let targetUid = r.targetUserId || r.targetId;
    
    // CRITICAL FIX: Prioritize getting the User ID from the nested 'reportedUser' map
    if (r.reportedUser?.id) {
        targetUid = r.reportedUser.id;
    } 
    // If it's a direct user report, use targetUserId/targetId
    else if (r.reportType === 'user' && (r.targetUserId || r.targetId)) {
        targetUid = r.targetUserId || r.targetId;
    } else {
        // Skip reports where a target user cannot be clearly identified
        return; 
    }
    
    if (targetUid) {
        userReports.set(targetUid, (userReports.get(targetUid) || 0) + 1);
    }
  });
  
  // FIXED: Robustly get display name for reported users
  const reportedUsers = Array.from(userReports.entries()).map(([uid, count]) => {
    const user = users.find(u => u.uid === uid);
    // Determine the most descriptive display name for reported users
    const name = user?.profile?.orgName || user?.profile?.contactPerson || user?.profile?.name;
    const displayName = name || (uid ? `User ${uid.substring(0, 5)}` : 'Unknown User');
    
    return {
      uid,
      count,
      role: user?.role || 'user',
      displayName: displayName
    };
  }).sort((a, b) => b.count - a.count);

  // 3. Find Top Users
  const sortedByRating = [...ratedUsers].sort((a, b) => b.avg - a.avg);
  
  return {
    highestRated: sortedByRating.slice(0, 1).map(u => ({ ...u, avg: parseFloat(u.avg.toFixed(2)) })),
    lowestRated: sortedByRating
      .filter(u => u.avg > 0 && u.count >= 2) // At least 2 ratings for fair assessment
      .slice(-3)
      .sort((a, b) => a.avg - b.avg)
      .map(u => ({ ...u, avg: parseFloat(u.avg.toFixed(2)) })),
    mostReported: reportedUsers.slice(0, 3)
  };
}

// COMPREHENSIVE: Full metrics calculation with all original depth
async function calculateComprehensiveMetrics(data: any) {
  const { users, foodListings, campaigns, reservations, registrations, ratings, reports } = data;

  // FOOD METRICS - Full calculation
  const foodStats = foodListings.reduce((acc: any, listing: any) => {
    const unit = listing.quantityUnit as keyof typeof UNIT_CONVERSIONS;
    const conversion = UNIT_CONVERSIONS[unit] || 1;
    // Safely use 0 if quantity is missing
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

  // NEW USER SIGNUP TRENDS
  const userSignupTrends = calculateUserSignupTrends(users);
  
  // NEW KEY USER METRICS
  const keyUsers = calculateKeyUsers(users, ratings, reports);
  
  // === NEW: GEOGRAPHIC ANALYSIS ===
  const geographicAnalysis = calculateGeographicAnalysis(users, foodListings, reservations);

  // REPORT METRICS - Comprehensive
  const reportedItems = {
    food: reports.filter((r: any) => r.reportType === 'food').length,
    campaigns: reports.filter((r: any) => r.reportType === 'campaign').length,
    users: reports.filter((r: any) => r.reportType === 'user' || r.targetType === 'user').length,
    total: reports.length,
    resolutionRate: reports.filter((r: any) => r.status === 'resolved').length / Math.max(reports.length, 1),
    bySeverity: reports.reduce((acc: any, report: any) => {
      const severity = report.severity || 'medium';
      acc[severity] = (acc[severity] || 0) + 1;
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
    approvalRate: approvedListings / Math.max(foodListings.length, 1),
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
    userSignupTrends,
    geographicAnalysis, // ADDED
    keyUsers,
    reportedItems,
    platformHealth,
    additionalMetrics: {
      avgDonationSize: totalFoodKg / Math.max(completedListings, 1),
      donorRetention: calculateDonorRetention(users, foodListings),
      geographicCoverage: calculateGeographicCoverage(foodListings, campaigns)
    }
  };
}

// REAL donation trends calculation (with robust date check)
function calculateRealDonationTrends(foodListings: any[]) {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().substring(0, 7); // YYYY-MM
  }).reverse();

  return last6Months.map(month => {
    const monthListings = foodListings.filter(f => {
      
      const listingDate = safeGetDate(f.createdAt);
      if (!listingDate) return false;
      
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

// REAL campaign performance calculation (with robust date check)
function calculateRealCampaignPerformance(campaigns: any[], registrations: any[]) {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().substring(0, 7);
  }).reverse();

  return last6Months.map(month => {
    const monthCampaigns = campaigns.filter(c => {
      // Robustly check campaignDate (string) or createdAt (timestamp)
      let comparisonMonth = '';
      if (c.campaignDate && typeof c.campaignDate === 'string' && c.campaignDate.length >= 7) {
        comparisonMonth = c.campaignDate.substring(0, 7);
      } else {
        const campaignDate = safeGetDate(c.createdAt);
        if (campaignDate) {
          comparisonMonth = campaignDate.toISOString().substring(0, 7);
        }
      }
        
      if (!comparisonMonth) return false;
      
      return comparisonMonth === month;
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

// ADDITIONAL METRICS CALCULATIONS (existing functions below)
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
    // Check if geolocation has a city or address to count coverage
    if (listing.geolocation?.city) {
      uniqueLocations.add(listing.geolocation.city);
    } else if (listing.geolocation?.formattedAddress) {
      // Fallback to full address as a unique location proxy
      uniqueLocations.add(listing.geolocation.formattedAddress);
    }
  });
  
  campaigns.forEach(campaign => {
    if (campaign.geolocation?.city) {
      uniqueLocations.add(campaign.geolocation.city);
    } else if (campaign.geolocation?.formattedAddress) {
      uniqueLocations.add(campaign.geolocation.formattedAddress);
    }
  });
  
  return uniqueLocations.size;
}

// AI INSIGHTS - Enhanced with actionable prompt
async function generateAIInsights(metrics: any, rawData: any) {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Use 2.0 flash as confirmed working
    
    const geoThresholds = metrics.geographicAnalysis.thresholds;
    
    const prompt = `
      Analyze this comprehensive food redistribution platform data and provide highly detailed and actionable insights.
      
      ENVIRONMENTAL IMPACT SUMMARY:
      - Food Saved: ${metrics.totalFoodRedistributedKg.toFixed(0)} kg
      - CO2 Prevented: ${metrics.co2PreventedKg.toFixed(0)} kg
      
      PLATFORM PERFORMANCE & EFFICIENCY:
      - Utilization Rate: ${(metrics.utilizationRate * 100).toFixed(1)}%
      - Spoilage Rate: ${(metrics.spoilageRate * 100).toFixed(1)}%
      
      GEOGRAPHIC ANALYSIS (CRITICAL FOR STRATEGY):
      - Total Cities: ${metrics.geographicAnalysis.totalCities}
      - Thresholds: ${JSON.stringify(geoThresholds)}
      - Key Insights: ${JSON.stringify(metrics.geographicAnalysis.keyInsights)}
      - City Data Sample (Top 3): ${metrics.geographicAnalysis.byCity.slice(0, 3).map((c: any) => `${c.city} (${c.status} - ${c.utilizationRate}% utilization, ${c.receiverDensity} receivers)`).join('; ')}
      
      
      CRITICAL INSTRUCTION: The FIRST item in your "recommendations" list MUST be the single most important and targeted geographic action. It must clearly state the problem and the immediate action required based on the data provided. Use the EXACT format:
      "Problem/Summary: [The problem description, referencing specific cities/stats]. Primary Action: [The detailed solution]."

      Example of desired output for the first recommendation: "Problem/Summary: High Waste Risk is concentrated in Subang Jaya (29% utilization) and Shah Alam (28.6% utilization), which is below the target ${geoThresholds.LOW_UTILIZATION * 100}% threshold. Primary Action: Implement targeted donor education and route optimization in these two specific cities to boost utilization."

      Your output MUST be a single JSON object matching the requested schema. Do not include any text outside the JSON block.
      
      JSON Schema:
      {
        "summary": "A comprehensive executive summary (3-4 sentences).",
        "trends": ["Trend 1 with detailed comment on significance/implications (e.g., 'Increasing utilization rate suggests better matching algorithm is working').", "Trend 2 with detailed comment...", "..."],
        "recommendations": ["Recommendation 1 (MUST be the Primary Geo Action/Summary as instructed above).", "Recommendation 2 (General platform recommendation).", "..."],
        "opportunities": ["Opportunity 1 (2-3 high-impact growth ideas based on geographic and efficiency data).", "Opportunity 2..."]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Use the reliable JSON parser
    return parseEnhancedAIResponseJSON(text);

  } catch (error) {
    logger.error('Gemini insights FAILED TO GENERATE JSON. Falling back to calculation results:', error);
    return generateEnhancedFallbackInsights(metrics);
  }
}

function parseEnhancedAIResponseJSON(text: string) {
    try {
        // Strip markdown code block wrapper if present
        const jsonString = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        
        const jsonObject = JSON.parse(jsonString);

        // Map the properties to the AnalyticsData insights interface
        return {
            summary: jsonObject.summary || 'AI Summary unavailable.',
            trends: jsonObject.trends || ['AI trends unavailable.'],
            recommendations: jsonObject.recommendations || ['AI recommendations unavailable.'],
            opportunities: jsonObject.opportunities || ['AI opportunities unavailable.'],
            generatedBy: 'gemini' as const
        };
    } catch (e) {
        logger.error('JSON parsing failed:', e);
        // Fall back to a simplified structure if JSON is malformed
        return {
            summary: 'AI output malformed. Check function logs.',
            trends: ['AI output malformed.'],
            recommendations: ['AI output malformed.'],
            opportunities: ['AI output malformed.'],
            generatedBy: 'gemini' as const
        };
    }
}

function generateEnhancedFallbackInsights(metrics: any) {
  return {
    summary: `Platform has redistributed ${metrics.totalFoodRedistributedKg.toFixed(0)}kg of food, preventing ${metrics.co2PreventedKg.toFixed(0)}kg of CO2 emissions and saving ${metrics.waterSavedLiters.toLocaleString()} liters of water.`,
    trends: [
      `Food utilization rate: ${(metrics.utilizationRate * 100).toFixed(1)}% efficiency`,
      `Geographic focus: ${metrics.geographicAnalysis.keyInsights.highNeedCities.length} cities identified as High Need`,
      `Platform engagement: ${(metrics.platformHealth.engagementScore * 100).toFixed(1)}% active participation`,
      `Environmental impact: Equivalent to ${metrics.carsOffRoadEquivalent.toFixed(1)} cars off the road`
    ],
    recommendations: [
      `Target expansion in High Need Cities: ${metrics.geographicAnalysis.keyInsights.highNeedCities.slice(0, 3).join(', ')}`,
      `Investigate efficiency issues in High Waste Cities: ${metrics.geographicAnalysis.keyInsights.highWasteCities.slice(0, 3).join(', ')}`,
      `Focus on reducing ${(metrics.spoilageRate * 100).toFixed(1)}% spoilage rate through better matching`
    ],
    opportunities: [
      `Scale operations to reach more communities`,
      `Develop partnerships with additional food donors`,
      `Implement advanced matching algorithms for better efficiency`
    ],
    generatedBy: 'calculations' as const
  };
}

// MODIFIED MANUAL FUNCTION with FIXED CORS logic and PHASED execution
export const calculateAnalyticsManual = onCall(
  {
    enforceAppCheck: false,
    consumeAppCheckToken: false,
    cors: '*', // Explicitly allow all origins to bypass previous 403 CORS error
    timeoutSeconds: 540, // Set to max 9 minutes as requested
    memory: "4GiB", 
    secrets: ["APP_GEMINI_KEY"],
  },
  async (request) => {
    
    try {
      logger.info("calculateAnalyticsManual - PHASED COMPREHENSIVE VERSION");

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      const STATE_DOC_ID = 'manual_run_state';
      const stateDocRef = db.collection('analytics_jobs').doc(STATE_DOC_ID);
      
      // Check admin permissions
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (!userData || (userData.role !== 'admin' && !userData.isAdmin)) {
        throw new HttpsError("permission-denied", "Only administrators can run analytics");
      }

      // --- CACHE CHECK (Only check if starting a new run) ---
      const { phase = 'all' } = request.data || {};
      
      if (phase === 'all' || phase === 'fetch') {
        const cachedAnalytics = await db.collection('analytics').doc('current').get();
        if (cachedAnalytics.exists) {
          const cacheTime = cachedAnalytics.data()?.timestamp?.toDate();
          const now = new Date();
          // CACHE DISABLED FOR TESTING: 1 second threshold
          if (cacheTime && (now.getTime() - cacheTime.getTime()) < 1 * 1000) { 
            logger.info("Returning cached analytics data");
            return {
              success: true,
              message: 'Using recently cached analytics data',
              data: cachedAnalytics.data(),
              cached: true,
              cacheAge: Math.round((now.getTime() - cacheTime.getTime()) / 60000) + ' minutes',
              phase: 'complete',
              nextPhase: 'none'
            };
          }
        }
      }
      // --- END CACHE CHECK ---

      // Load current state for phased execution
      const currentState = (await stateDocRef.get()).data() || {};
      let data: any = currentState.rawData || {};
      let metrics: any = currentState.metrics || {};

      const currentPhase = phase === 'all' ? 'fetch' : phase;
      let nextPhase = '';
      let message = '';
      
      if (currentPhase === 'fetch') {
        logger.info("Phase: FETCH_DATA - Starting batched data collection...");
        data = await fetchBatchedData();
        
        // Save state and set next phase
        await stateDocRef.set({ 
          rawData: data, 
          phase: 'data_fetched', 
          timestamp: admin.firestore.Timestamp.now() 
        });
        nextPhase = 'calculate';
        message = 'Phase 1/3 (Fetch Data) completed. Data fetched successfully.';
        
      } else if (currentPhase === 'calculate') {
        if (!data || Object.keys(data).length === 0 || !data.users) {
          throw new HttpsError('failed-precondition', 'Raw data not found in state. Run phase "fetch" first.');
        }
        logger.info("Phase: CALCULATE_METRICS - Starting comprehensive metrics calculation...");
        metrics = await calculateComprehensiveMetrics(data);
        
        // Save state and set next phase
        await stateDocRef.set({ 
          rawData: data, 
          metrics: metrics, 
          phase: 'metrics_calculated', 
          timestamp: admin.firestore.Timestamp.now() 
        }, { merge: true });
        nextPhase = 'insights';
        message = 'Phase 2/3 (Calculate Metrics) completed. Metrics calculated successfully.';
        
      } else if (currentPhase === 'insights') {
        if (!metrics || Object.keys(metrics).length === 0) {
          throw new HttpsError('failed-precondition', 'Metrics not found in state. Run phases "fetch" and "calculate" first.');
        }
        logger.info("Phase: GENERATE_INSIGHTS - Starting AI insight generation and finalization...");
        
        const insights = await generateAIInsights(metrics, data);
        
        const analyticsData: AnalyticsData = {
          timestamp: admin.firestore.Timestamp.now(),
          period: "manual",
          metrics,
          insights
        };
        
        // Finalize: Cache the comprehensive results and clear state
        await db.collection('analytics').doc('current').set(analyticsData);
        await stateDocRef.delete(); // Clear temporary state
        
        nextPhase = 'none';
        message = 'Phase 3/3 (Generate Insights & Finalize) completed. Comprehensive analytics successfully generated and cached!';
        
        // Final response for the last phase
        return {
          success: true,
          message: message,
          data: analyticsData,
          cached: false,
          phase: 'complete',
          nextPhase: 'none',
          dataSummary: {
            usersAnalyzed: data.users?.length || 0,
            listingsAnalyzed: data.foodListings?.length || 0,
            campaignsAnalyzed: data.campaigns?.length || 0,
            metricsCalculated: Object.keys(metrics).length
          }
        };
      } else {
        throw new HttpsError('invalid-argument', 'Invalid phase specified. Must be "fetch", "calculate", "insights", or "all".');
      }

      // Intermediate response for phased execution
      return {
        success: true,
        message: message,
        phase: currentPhase,
        nextPhase: nextPhase,
        dataSummary: {
          usersAnalyzed: data.users?.length || 0,
          listingsAnalyzed: data.foodListings?.length || 0,
          campaignsAnalyzed: data.campaigns?.length || 0,
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
            message: 'Using cached data due to Firestore quota limits - please check logs for partial completion status.',
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