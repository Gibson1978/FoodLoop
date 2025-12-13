// functions/src/admin-AI.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

class SimpleCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiry) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  async getOrSet(key: string, ttlMinutes: number, fetchFunction: () => Promise<any>): Promise<any> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      logger.debug(`Cache hit: ${key}`);
      return cached.data;
    }
    
    logger.debug(`Cache miss: ${key}`);
    const data = await fetchFunction();
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    });
    
    return data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Initialize cache
const cache = new SimpleCache();

// ============== CONSTANTS FOR IMPACT CALCULATION ==============
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

// ============== INTERFACES (UPDATED for Geographic) ==============
interface UserProfile {
    name?: string;
    orgName?: string;
    orgType?: string;
    contactPerson?: string;
    phone: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      latitude?: number;
      longitude?: number;
    };
    rating?: number;
    totalRatings?: number;
}

interface UserMetrics {
    donor?: {
        foodWasteReduced: number;
        peopleHelped: number;
        rating: number;
        totalDonations: number;
        totalRatings: number;
    };
    volunteer?: {
        campaignsHeld: number;
        hoursVolunteered: number;
        rating: number;
        totalRatings: number;
    };
    // FIXED: Added rating and totalRatings to receiver metrics
    receiver?: {
        campaignsAttended: number;
        foodWasteReduced: number;
        reservationsCompleted: number;
        rating: number;
        totalRatings: number;
    };
}

interface UserData {
  id: string;
  role: 'donor' | 'volunteer' | 'receiver' | 'admin';
  status: 'approved' | 'pending' | 'rejected';
  email: string;
  profile: UserProfile;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
  // New fields from user context
  donorRating?: number;
  donorTotalRatings?: number;
  volunteerRating?: number;
  volunteerTotalRatings?: number;
  metrics?: UserMetrics; 
}

interface FoodListingData {
  id: string;
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  quantityUnit: string;
  remainingQuantity: number;
  reservedQuantity: number;
  collectedQuantity: number;
  status: 'approved' | 'pending' | 'completed' | 'cancelled';
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorType: string;
  createdAt: any;
  updatedAt: any;
  availableDate: string;
  startTime: string;
  endTime: string;
  isTestData?: boolean;
}

interface CampaignData {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'completed' | 'ongoing' | 'pending' | 'cancelled';
  campaignDate: string;
  startTime: string;
  endTime: string;
  totalSpots: number;
  registeredSpots: number;
  availableSpots: number;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  organizerOrg: string;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

interface ReservationData {
  id: string;
  foodListingId: string;
  userId: string;
  userType: string;
  quantity: number;
  status: string;
  reservedAt: any;
  pickedUpAt: any;
  userName: string;
  userEmail: string;
  userPhone: string;
  donorId: string;
  donorName: string;
  isTestData?: boolean;
}

interface RegistrationData {
  id: string;
  campaignId: string;
  userId: string;
  status: string;
  registeredAt: any;
  attendedAt: any;
  userName: string;
  userEmail: string;
  userPhone: string;
  organizerId: string;
  organizerName: string;
  isTestData?: boolean;
}

interface RatingData {
  id: string;
  targetType: 'food' | 'campaign';
  targetId: string;
  targetName: string;
  ratedUserId: string;
  ratedUserName: string;
  ratedUserType: string;
  raterUserId: string;
  raterUserName: string;
  raterUserType: string;
  rating: number;
  comment: string;
  reservationId?: string;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

interface ReportData {
  id: string;
  reportType: 'food' | 'campaign' | 'user';
  targetId?: string;
  targetName: string;
  reportedUser: {
    id: string;
    name: string;
    email: string;
    type: string;
  };
  reporterUser: {
    id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidenceUrls: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedAt?: any;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

// --- NEW INTERFACE FOR TS FIX ---
interface TrendDataPoint {
  month: string;
  // Donation Trend fields
  completionRate?: number; 
  donations?: number;
  foodWeight?: number;
  // Campaign Performance fields
  actualAttendees?: number;
  attendanceRate?: number;
  registeredSpots?: number;
  registrationRate?: number;
  totalSpots?: number;
}
// --- END NEW INTERFACE ---

// --- NEW GEOGRAPHIC INTERFACES ---

type CityStatus = 'High Need' | 'High Waste' | 'High Efficiency' | 'Low Activity' | 'Unknown';

interface CityAnalysis {
  city: string;
  foodListingDensity: number;
  totalQuantityKg: number;
  collectedQuantityKg: number;
  collectionDensity: number;
  receiverDensity: number;
  donorDensity: number;
  utilizationRate: number;
  status: CityStatus;
}

interface GeographicAnalysis {
  totalCities: number;
  byCity: CityAnalysis[];
  keyInsights: {
    highNeedCities: string[];
    highWasteCities: string[];
    highEfficiencyCities: string[];
  };
  thresholds: {
    HIGH_UTILIZATION: number;
    LOW_UTILIZATION: number;
    LOW_UPLOAD_VS_RECEIVER: number;
    MIN_ACTIVITY: number;
  };
}
// --- END NEW GEOGRAPHIC INTERFACES ---

// ============== NEW CORE METRICS FUNCTION (WITH GEOGRAPHIC SUPPORT) ==============

/**
 * Get comprehensive core operational and impact metrics.
 * This function consolidates the most requested admin stats.
 */
async function getCoreOperationalMetrics(): Promise<any> {
  try {
    // Use cache for frequently accessed data - cache for 5 minutes
    return await cache.getOrSet('core_metrics_full', 5, async () => {
      // Fetch ALL data but optimize the queries
      const [
        usersSnapshot,
        listingsSnapshot,
        campaignsSnapshot,
        ratingsSnapshot,
        reportsSnapshot,
        analyticsDoc, // Fetch analytics doc here for geographic analysis
      ] = await Promise.all([
        db.collection('users').get(), 
        db.collection('foodListings').select('status', 'category', 'totalQuantity', 'quantityUnit', 'collectedQuantity', 'donorType', 'reservedQuantity').get(),
        db.collection('campaigns').select('status', 'category', 'totalSpots', 'registeredSpots').get(),
        db.collection('ratings').select('rating', 'ratedUserId', 'ratedUserType').get(),
        db.collection('reports').select('reportType', 'status', 'reportedUser.id', 'severity').get(),
        db.collection('analytics').doc('current').get() // Fetch analytics document
      ]);

      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as UserData);
      const listings = listingsSnapshot.docs.map(doc => doc.data() as FoodListingData);
      const campaigns = campaignsSnapshot.docs.map(doc => doc.data() as CampaignData);
      const ratings = ratingsSnapshot.docs.map(doc => doc.data() as RatingData);
      const reports = reportsSnapshot.docs.map(doc => doc.data() as ReportData);
      const analyticsData = analyticsDoc.data();

      // --- 1. USER METRICS ---
      const userStats = users.reduce((acc, user) => {
        acc.total++;
        acc.byStatus[user.status] = (acc.byStatus[user.status] || 0) + 1;
        acc.byRole[user.role] = (acc.byRole[user.role] || 0) + 1;
        return acc;
      }, {
        total: 0,
        byStatus: {} as Record<string, number>,
        byRole: {} as Record<string, number>,
        activeUsers: users.filter(u => u.status === 'approved').length,
      });

      // --- 2. LISTING & IMPACT METRICS ---
      const foodStats = listings.reduce((acc, listing) => {
        const unit = listing.quantityUnit as keyof typeof UNIT_CONVERSIONS;
        const conversion = UNIT_CONVERSIONS[unit] || 1;
        const collectedKg = (listing.collectedQuantity || 0) * conversion;
        const totalKg = (listing.totalQuantity || 0) * conversion;

        acc.totalKg += totalKg;
        acc.collectedKg += collectedKg;
        acc.byStatus[listing.status] = (acc.byStatus[listing.status] || 0) + 1;
        acc.categories[listing.category] = (acc.categories[listing.category] || 0) + collectedKg;
        acc.donorTypes[listing.donorType] = (acc.donorTypes[listing.donorType] || 0) + 1;

        return acc;
      }, {
        totalKg: 0,
        collectedKg: 0,
        byStatus: {} as Record<string, number>,
        categories: {} as Record<string, number>,
        donorTypes: {} as Record<string, number>,
      });
      
      const utilizationRate = foodStats.totalKg > 0 ? foodStats.collectedKg / foodStats.totalKg : 0;

      // --- 3. ENVIRONMENTAL IMPACT ---
      const totalFoodRedistributedKg = foodStats.collectedKg;
      const co2PreventedKg = totalFoodRedistributedKg * ENVIRONMENTAL_FACTORS.CO2_PER_KG_FOOD;
      const waterSavedLiters = totalFoodRedistributedKg * ENVIRONMENTAL_FACTORS.WATER_PER_KG_FOOD;
      const landfillSpaceSavedM3 = totalFoodRedistributedKg * ENVIRONMENTAL_FACTORS.LANDFILL_PER_KG_FOOD;
      const carsOffRoadEquivalent = co2PreventedKg * ENVIRONMENTAL_FACTORS.CARS_EQUIVALENT;

      // --- 4. CAMPAIGN METRICS ---
      const campaignStats = campaigns.reduce((acc, campaign) => {
        acc.total++;
        acc.byStatus[campaign.status] = (acc.byStatus[campaign.status] || 0) + 1;
        acc.categories[campaign.category] = (acc.categories[campaign.category] || 0) + 1;
        acc.totalSpots += campaign.totalSpots || 0;
        acc.registeredSpots += campaign.registeredSpots || 0;
        return acc;
      }, {
        total: 0,
        byStatus: {} as Record<string, number>,
        categories: {} as Record<string, number>,
        totalSpots: 0,
        registeredSpots: 0,
      });
      
      const fillRate = campaignStats.totalSpots > 0 ? campaignStats.registeredSpots / campaignStats.totalSpots : 0;

      // --- 5. PERFORMANCE METRICS (Ratings & Reports) ---
      const reportedItems = reports.reduce((acc, report) => {
        acc.total++;
        acc.byType[report.reportType] = (acc.byType[report.reportType] || 0) + 1;
        acc.byStatus[report.status] = (acc.byStatus[report.status] || 0) + 1;
        return acc;
      }, {
        total: 0,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      });
      
      const avgUserRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 5;
        
      // Top/Least Rated and Most Reported - OPTIMIZED: only calculate for users who actually have ratings
      const userPerformance = users.map(user => {
        const userRatings = ratings.filter(r => r.ratedUserId === user.id);
        const userReports = reports.filter(r => r.reportedUser?.id === user.id);
        
        // Use user.metrics if available, otherwise calculate from ratings snapshot
        const avgRating = user.metrics?.donor?.rating || user.metrics?.volunteer?.rating || user.metrics?.receiver?.rating 
          || (userRatings.length > 0 
            ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length 
            : 0); // Use 0 here to distinguish from default 5 rating in old logic

        const name = user.profile?.orgName || user.profile?.contactPerson || user.profile?.name || 'Unknown';
        
        return {
          id: user.id,
          name: name,
          role: user.role,
          avgRating: Number(avgRating.toFixed(1)),
          reportCount: userReports.length,
          totalRatings: user.metrics?.donor?.totalRatings || user.metrics?.volunteer?.totalRatings || user.metrics?.receiver?.totalRatings || userRatings.length
        };
      }).filter(u => u.name !== 'Unknown'); // Filter out users without display names

      const topRatedUsers = userPerformance
        .filter(u => u.avgRating > 0 && u.totalRatings >= 5) // Requires at least 5 ratings to be considered "rated"
        .sort((a, b) => b.avgRating - a.avgRating || b.totalRatings - a.totalRatings)
        .slice(0, 3);
      
      const leastRatedUsers = userPerformance
        .filter(u => u.avgRating > 0 && u.totalRatings >= 5) // Requires at least 5 ratings to be considered "rated"
        .sort((a, b) => a.avgRating - b.avgRating || b.totalRatings - a.totalRatings)
        .slice(0, 3);
      
      const mostReportedUsers = userPerformance
        .filter(u => u.reportCount > 0)
        .sort((a, b) => b.reportCount - a.reportCount)
        .slice(0, 3);

      // --- 6. GEOGRAPHIC ANALYSIS (From analytics document) ---
      const geographicAnalysis = analyticsData?.metrics?.geographicAnalysis || {
        totalCities: 0,
        byCity: [],
        keyInsights: { 
          highNeedCities: [], 
          highWasteCities: [], 
          highEfficiencyCities: [] 
        },
        thresholds: { 
          HIGH_UTILIZATION: 0.8, 
          LOW_UTILIZATION: 0.3, 
          LOW_UPLOAD_VS_RECEIVER: 0.5, 
          MIN_ACTIVITY: 5 
        }
      };
        
      // --- FINAL RETURN STRUCTURE ---
      return {
        overviewTimestamp: new Date().toISOString(),
        analyticsOverview: { // NEW field to inject trend summary/insights
            summary: analyticsData?.insights?.summary || 'No recent summary available.',
            trends: analyticsData?.insights?.trends || [],
            opportunities: analyticsData?.insights?.opportunities || [],
            recommendations: analyticsData?.insights?.recommendations || [], // NEW: includes geo action
        },
        userMetrics: {
          total: userStats.total,
          active: userStats.activeUsers,
          statusBreakdown: userStats.byStatus,
          roleDistribution: userStats.byRole,
        },
        foodListingMetrics: {
          total: listings.length,
          statusBreakdown: foodStats.byStatus,
          totalQuantityKg: Number(foodStats.totalKg.toFixed(1)),
          collectedQuantityKg: Number(foodStats.collectedKg.toFixed(1)),
          utilizationRate: Number((utilizationRate * 100).toFixed(1)),
          mostPopularCategories: Object.entries(foodStats.categories).sort(([, a], [, b]) => b - a).slice(0, 3),
          topDonorSources: Object.entries(foodStats.donorTypes).sort(([, a], [, b]) => b - a).slice(0, 3),
        },
        campaignMetrics: {
          total: campaigns.length,
          statusBreakdown: campaignStats.byStatus,
          totalSpots: campaignStats.totalSpots,
          registeredSpots: campaignStats.registeredSpots,
          fillRate: Number((fillRate * 100).toFixed(1)),
          mostCommonCategories: Object.entries(campaignStats.categories).sort(([, a], [, b]) => b - a).slice(0, 3),
        },
        impactMetrics: {
          foodSavedKg: totalFoodRedistributedKg,
          co2PreventedKg: Number(co2PreventedKg.toFixed(1)),
          waterSavedLiters: waterSavedLiters,
          landfillSavedM3: Number(landfillSpaceSavedM3.toFixed(3)),
          carsOffRoadEquivalent: Number(carsOffRoadEquivalent.toFixed(2)),
        },
        performanceMetrics: {
          avgUserRating: Number(avgUserRating.toFixed(2)),
          reportsTotal: reportedItems.total,
          reportsByType: reportedItems.byType,
          reportsByStatus: reportedItems.byStatus,
          topRatedUsers,
          leastRatedUsers,
          mostReportedUsers,
        },
        geographicAnalysis // NEW: Add geographic analysis
      };
    });
  } catch (error) {
    logger.error('Error in getCoreOperationalMetrics:', error);
    return { error: `Failed to calculate core metrics: ${error}` };
  }
}

// ============== EXISTING TOOL FUNCTIONS ==============

// Helper function for date conversion
function safeDateConversion(dateValue: any): Date {
  if (!dateValue) return new Date();
  if (dateValue.toDate) return dateValue.toDate();
  if (typeof dateValue === 'string') return new Date(dateValue);
  if (dateValue instanceof Date) return dateValue;
  return new Date();
}

/**
 * Get growth metrics comparing current period vs previous period
 */
async function getGrowthMetrics(periodDays = 30): Promise<any> {
  try {
    return await cache.getOrSet(`growth_metrics_${periodDays}`, 10, async () => {
      const now = new Date();
      const currentPeriodStart = new Date(now);
      currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
      
      const previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

      // Use Firestore count queries instead of fetching all documents
      const [
        currentUserCount,
        previousUserCount,
        currentFoodSaved,
        previousFoodSaved
      ] = await Promise.all([
        // Count queries are much more efficient
        db.collection('users')
          .where('createdAt', '>=', currentPeriodStart)
          .count()
          .get()
          .then(snap => snap.data().count || 0),
        
        db.collection('users')
          .where('createdAt', '>=', previousPeriodStart)
          .where('createdAt', '<', currentPeriodStart)
          .count()
          .get()
          .then(snap => snap.data().count || 0),
        
        // For food saved, we need to sum - optimize with batched reads
        calculateFoodQuantityInPeriod(currentPeriodStart, now),
        
        calculateFoodQuantityInPeriod(previousPeriodStart, currentPeriodStart)
      ]);

      // Calculate growth percentages
      const userGrowth = previousUserCount > 0 
        ? ((currentUserCount - previousUserCount) / previousUserCount) * 100 
        : currentUserCount > 0 ? 100 : 0;

      const foodGrowth = previousFoodSaved > 0 
        ? ((currentFoodSaved - previousFoodSaved) / previousFoodSaved) * 100 
        : currentFoodSaved > 0 ? 100 : 0;
        
      // Placeholder for new donor growth
      const currentNewDonors = await db.collection('users')
          .where('role', '==', 'donor')
          .where('createdAt', '>=', currentPeriodStart)
          .count()
          .get()
          .then(snap => snap.data().count || 0);
          
      const previousNewDonors = await db.collection('users')
          .where('role', '==', 'donor')
          .where('createdAt', '>=', previousPeriodStart)
          .where('createdAt', '<', currentPeriodStart)
          .count()
          .get()
          .then(snap => snap.data().count || 0);

      const donorGrowth = previousNewDonors > 0 
        ? ((currentNewDonors - previousNewDonors) / previousNewDonors) * 100 
        : currentNewDonors > 0 ? 100 : 0;
        
      // Placeholder for campaign growth
      const currentCampaigns = await db.collection('campaigns')
          .where('createdAt', '>=', currentPeriodStart)
          .count()
          .get()
          .then(snap => snap.data().count || 0);
          
      const previousCampaigns = await db.collection('campaigns')
          .where('createdAt', '>=', previousPeriodStart)
          .where('createdAt', '<', currentPeriodStart)
          .count()
          .get()
          .then(snap => snap.data().count || 0);

      const campaignGrowth = previousCampaigns > 0 
        ? ((currentCampaigns - previousCampaigns) / previousCampaigns) * 100 
        : currentCampaigns > 0 ? 100 : 0;


      return {
        period: `${periodDays} days`,
        timeRange: {
          current: `${currentPeriodStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
          previous: `${previousPeriodStart.toLocaleDateString()} - ${currentPeriodStart.toLocaleDateString()}`
        },
        metrics: {
          users: {
            current: currentUserCount,
            previous: previousUserCount,
            growth: Number(userGrowth.toFixed(1)),
            trend: userGrowth >= 0 ? 'up' : 'down'
          },
          food: {
            current: currentFoodSaved,
            previous: previousFoodSaved,
            growth: Number(foodGrowth.toFixed(1)),
            trend: foodGrowth >= 0 ? 'up' : 'down'
          },
          campaigns: {
            current: currentCampaigns,
            previous: previousCampaigns,
            growth: Number(campaignGrowth.toFixed(1)),
            trend: campaignGrowth >= 0 ? 'up' : 'down'
          },
          newDonors: {
            current: currentNewDonors,
            previous: previousNewDonors,
            growth: Number(donorGrowth.toFixed(1)),
            trend: donorGrowth >= 0 ? 'up' : 'down'
          }
        },
        summary: {
          overallGrowth: Number(((userGrowth + foodGrowth + campaignGrowth) / 3).toFixed(1))
        }
      };
    });
  } catch (error) {
    logger.error('Critical error in getGrowthMetrics:', error);
    return { 
      error: 'Failed to fetch growth metrics',
      period: `${periodDays} days`,
      metrics: {
        users: { current: 0, previous: 0, growth: 0, trend: 'stable' },
        food: { current: 0, previous: 0, growth: 0, trend: 'stable' },
        campaigns: { current: 0, previous: 0, growth: 0, trend: 'stable' },
        newDonors: { current: 0, previous: 0, growth: 0, trend: 'stable' }
      },
      summary: { overallGrowth: 0 }
    };
  }
}

async function calculateFoodQuantityInPeriod(startDate: Date, endDate: Date): Promise<number> {
  try {
    const listingsSnapshot = await db.collection('foodListings')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<', endDate)
      .select('collectedQuantity', 'quantityUnit') // Only select needed fields
      .limit(1000) // Limit to prevent overload
      .get();
    
    return listingsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data() as FoodListingData;
      const unit = data.quantityUnit as keyof typeof UNIT_CONVERSIONS;
      const conversion = UNIT_CONVERSIONS[unit] || 1;
      return sum + (data.collectedQuantity || 0) * conversion;
    }, 0);
  } catch (error) {
    logger.error('Error calculating food quantity:', error);
    return 0;
  }
}

/**
 * Fetches time-series data required for PDF graphs, usually sourced from 
 * the batched analytics document or calculated directly.
 */
async function getTrendTimeSeriesData(): Promise<{ 
  donationTrends: TrendDataPoint[]; 
  campaignPerformance: TrendDataPoint[]; 
}> {
  try {
    // This assumes the analyticsCalculator stores the detailed trend arrays in the 'current' document
    const analyticsDoc = await db.collection('analytics').doc('current').get();
    
    if (analyticsDoc.exists) {
      const data = analyticsDoc.data()?.metrics || {};
      return {
        donationTrends: (data.donationTrends || []) as TrendDataPoint[],
        campaignPerformance: (data.campaignPerformance || []) as TrendDataPoint[]
      };
    }
    
    return {
      donationTrends: [],
      campaignPerformance: []
    };
  } catch (error) {
    logger.error('Error in getTrendTimeSeriesData:', error);
    return { donationTrends: [], campaignPerformance: [] };
  }
}

/**
 * Detect anomalies in platform activity
 */
async function detectAnomalies(): Promise<any> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get daily data for last 7 days
    const dailyData = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i - 1);
      const dayEnd = new Date(now);
      dayEnd.setDate(dayEnd.getDate() - i);
      
      const [listings, reservations, registrations] = await Promise.all([
        db.collection('foodListings')
          .where('createdAt', '>=', dayStart)
          .where('createdAt', '<', dayEnd)
          .get(),
        db.collection('foodReservations')
          .where('reservedAt', '>=', dayStart)
          .where('reservedAt', '<', dayEnd)
          .get(),
        db.collection('campaignRegistrations')
          .where('registeredAt', '>=', dayStart)
          .where('registeredAt', '<', dayEnd)
          .get()
      ]);

      dailyData.push({
        date: dayStart.toLocaleDateString(),
        listings: listings.size,
        reservations: reservations.size,
        registrations: registrations.size,
        cancellations: reservations.docs.filter(doc => {
          const data = doc.data() as ReservationData;
          return data.status === 'cancelled' || data.status === 'rejected';
        }).length
      });
    }

    // Calculate 30-day averages for comparison
    const [avgListings, avgReservations, avgRegistrations] = await Promise.all([
      db.collection('foodListings')
        .where('createdAt', '>=', thirtyDaysAgo)
        .count()
        .get()
        .then(snap => snap.data().count / 30),
      db.collection('foodReservations')
        .where('reservedAt', '>=', thirtyDaysAgo)
        .count()
        .get()
        .then(snap => snap.data().count / 30),
      db.collection('campaignRegistrations')
        .where('registeredAt', '>=', thirtyDaysAgo)
        .count()
        .get()
        .then(snap => snap.data().count / 30)
    ]);

    // Detect anomalies (more than 50% deviation from average)
    const anomalies: { date: string; type: string; value: number; expected: number; deviation: string; }[] = [];
    
    dailyData.forEach(day => {
      if (day.listings > avgListings * 1.5 || day.listings < avgListings * 0.5) {
        anomalies.push({
          date: day.date,
          type: 'listings',
          value: day.listings,
          expected: Math.round(avgListings),
          deviation: `${Math.round((day.listings / avgListings - 1) * 100)}%`
        });
      }
      
      if (day.reservations > avgReservations * 1.5 || day.reservations < avgReservations * 0.5) {
        anomalies.push({
          date: day.date,
          type: 'reservations',
          value: day.reservations,
          expected: Math.round(avgReservations),
          deviation: `${Math.round((day.reservations / avgReservations - 1) * 100)}%`
        });
      }
      
      if (day.cancellations > avgReservations * 0.3) { // More than 30% of average reservations cancelled
        anomalies.push({
          date: day.date,
          type: 'high_cancellations',
          value: day.cancellations,
          expected: Math.round(avgReservations * 0.1), // Expect 10% cancellation rate
          deviation: `${Math.round((day.cancellations / (avgReservations * 0.1) - 1) * 100)}%`
        });
      }
    });

    return {
      period: 'Last 7 days',
      dailyData: dailyData.reverse(), // Oldest to newest
      thirtyDayAverages: {
        listings: Math.round(avgListings),
        reservations: Math.round(avgReservations),
        registrations: Math.round(avgRegistrations)
      },
      anomalies: anomalies.length > 0 ? anomalies : [],
      status: anomalies.length === 0 ? 'normal' : anomalies.length <= 2 ? 'warning' : 'critical'
    };
  } catch (error) {
    logger.error('Error in detectAnomalies:', error);
    return { error: 'Failed to detect anomalies' };
  }
}

// ===== USER BEHAVIOR =====

/**
 * Segment users by behavior patterns
 */
async function segmentUsersByBehavior(): Promise<any> {
  try {
    // Get all active users
    const usersSnapshot = await db.collection('users')
      .where('status', '==', 'approved')
      .get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserData[];

    // Get platform-wide metrics for comparison
    const [listingsSnapshot, campaignsSnapshot, ratingsSnapshot, reportsSnapshot, registrationsSnapshot] = await Promise.all([
      db.collection('foodListings').get(),
      db.collection('campaigns').get(),
      db.collection('ratings').get(),
      db.collection('reports').get(),
      db.collection('campaignRegistrations').get()
    ]);

    const allListings = listingsSnapshot.docs.map(doc => doc.data() as FoodListingData);
    const allCampaigns = campaignsSnapshot.docs.map(doc => doc.data() as CampaignData);
    const allRatings = ratingsSnapshot.docs.map(doc => doc.data() as RatingData);
    const allReports = reportsSnapshot.docs.map(doc => doc.data() as ReportData);
    const allRegistrations = registrationsSnapshot.docs.map(doc => doc.data() as RegistrationData);

    // Calculate averages for each role
    const usersCountByRole = {
      donor: users.filter(u => u.role === 'donor').length || 1,
      volunteer: users.filter(u => u.role === 'volunteer').length || 1,
      receiver: users.filter(u => u.role === 'receiver').length || 1,
    };
    
    const avgMetrics = {
      donor: {
        avgListings: allListings.filter(l => l.donorId).length / usersCountByRole.donor,
        avgRating: allRatings.filter(r => r.ratedUserType === 'donor').reduce((sum, r) => sum + r.rating, 0) 
                 / allRatings.filter(r => r.ratedUserType === 'donor').length || 4,
        avgReports: allReports.filter(r => r.reportedUser?.type === 'donor').length / usersCountByRole.donor || 0
      },
      volunteer: {
        avgCampaigns: allCampaigns.filter(c => c.organizerId).length / usersCountByRole.volunteer,
        avgRating: allRatings.filter(r => r.ratedUserType === 'volunteer').reduce((sum, r) => sum + r.rating, 0) 
                 / allRatings.filter(r => r.ratedUserType === 'volunteer').length || 4,
        avgReports: allReports.filter(r => r.reportedUser?.type === 'volunteer').length / usersCountByRole.volunteer || 0,
        avgRegistrations: allRegistrations.filter(r => {
          const user = users.find(u => u.id === r.userId);
          return user?.role === 'volunteer';
        }).length / usersCountByRole.volunteer || 0
      },
      receiver: {
        avgReservations: 0,
        avgRating: allRatings.filter(r => r.ratedUserType === 'receiver').reduce((sum, r) => sum + r.rating, 0) 
                 / allRatings.filter(r => r.ratedUserType === 'receiver').length || 4,
        avgReports: allReports.filter(r => r.reportedUser?.type === 'receiver').length / usersCountByRole.receiver || 0,
        avgRegistrations: allRegistrations.filter(r => {
          const user = users.find(u => u.id === r.userId);
          return user?.role === 'receiver';
        }).length / usersCountByRole.receiver || 0
      }
    };

    const segments = await Promise.all(
      users.map(async (user) => {
        let segment = 'inactive';
        let score = 0;
        const reasons: string[] = [];

        // Get user-specific data
        const [userListings, userCampaigns, userRatings, userReports, userRegistrations] = await Promise.all([
          db.collection('foodListings').where('donorId', '==', user.id).get(),
          db.collection('campaigns').where('organizerId', '==', user.id).get(),
          db.collection('ratings').where('ratedUserId', '==', user.id).get(),
          db.collection('reports').where('reportedUser.id', '==', user.id).get(),
          db.collection('campaignRegistrations').where('userId', '==', user.id).get()
        ]);

        const listings = userListings.docs.map(doc => doc.data() as FoodListingData);
        const campaigns = userCampaigns.docs.map(doc => doc.data() as CampaignData);
        const ratings = userRatings.docs.map(doc => doc.data() as RatingData);
        const reports = userReports.docs.map(doc => doc.data() as ReportData);
        const registrations = userRegistrations.docs.map(doc => doc.data() as RegistrationData);

        // Calculate metrics
        if (user.role === 'donor') {
          const listingCount = listings.length;
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 5;
          
          const totalDonated = listings.reduce((sum, l) => sum + (l.collectedQuantity || 0), 0);
          const reportCount = reports.length;
          
          const reportScore = avgMetrics.donor.avgReports > 0 
            ? reportCount / avgMetrics.donor.avgReports 
            : reportCount;

          // Scoring logic
          if (listingCount > avgMetrics.donor.avgListings * 3) {
            score += 3;
            reasons.push('High donation frequency');
          }
          if (avgRating > avgMetrics.donor.avgRating + 0.5) {
            score += 2;
            reasons.push('Excellent ratings');
          }
          if (totalDonated > 100) {
            score += 2;
            reasons.push('Large total donations');
          }
          if (reportScore > 2) {
            score -= 3;
            reasons.push('High report frequency');
          } else if (reportScore > 1) {
            score -= 1;
            reasons.push('Above average reports');
          }

          // Segment classification
          if (score >= 4) segment = 'power_user';
          else if (score >= 1) segment = 'active';
          else if (score <= -2) segment = 'at_risk';
          else if (listingCount === 0) segment = 'new_inactive';
          else segment = 'casual';

          return {
            id: user.id,
            name: user.profile?.orgName || user.profile?.name || 'Unknown',
            role: user.role,
            segment,
            score,
            metrics: {
              listings: listingCount,
              averageRating: Number(avgRating.toFixed(1)),
              totalDonated,
              reports: reportCount,
              reportScore: Number(reportScore.toFixed(1))
            },
            reasons
          };
        }

        if (user.role === 'volunteer') {
          const campaignCount = campaigns.length;
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 5;
          
          const totalParticipants = campaigns.reduce((sum, c) => sum + (c.registeredSpots || 0), 0);
          const reportCount = reports.length;
          const registrationCount = registrations.length;
          
          const reportScore = avgMetrics.volunteer.avgReports > 0 
            ? reportCount / avgMetrics.volunteer.avgReports 
            : reportCount;
          
          const registrationScore = avgMetrics.volunteer.avgRegistrations > 0 
            ? registrationCount / avgMetrics.volunteer.avgRegistrations 
            : registrationCount;

          // Scoring logic
          if (campaignCount > avgMetrics.volunteer.avgCampaigns * 3) {
            score += 3;
            reasons.push('High campaign organization');
          }
          if (registrationScore > 2) {
            score += 2;
            reasons.push('High campaign participation');
          }
          if (avgRating > avgMetrics.volunteer.avgRating + 0.5) {
            score += 2;
            reasons.push('Excellent ratings');
          }
          if (totalParticipants > 50) {
            score += 2;
            reasons.push('Large participant engagement');
          }
          if (reportScore > 2) {
            score -= 3;
            reasons.push('High report frequency');
          } else if (reportScore > 1) {
            score -= 1;
            reasons.push('Above average reports');
          }

          // Segment classification
          if (score >= 4) segment = 'power_user';
          else if (score >= 1) segment = 'active';
          else if (score <= -2) segment = 'at_risk';
          else if (campaignCount === 0 && registrationCount === 0) segment = 'new_inactive';
          else segment = 'casual';

          return {
            id: user.id,
            name: user.profile?.orgName || user.profile?.name || 'Unknown',
            role: user.role,
            segment,
            score,
            metrics: {
              campaigns: campaignCount,
              registrations: registrationCount,
              averageRating: Number(avgRating.toFixed(1)),
              totalParticipants,
              reports: reportCount,
              reportScore: Number(reportScore.toFixed(1))
            },
            reasons
          };
        }

        if (user.role === 'receiver') {
          // For receivers, check reservation patterns
          const reservationsSnapshot = await db.collection('foodReservations')
            .where('userId', '==', user.id)
            .get();
          
          const reservations = reservationsSnapshot.docs.map(doc => doc.data() as ReservationData);
          const reservationCount = reservations.length;
          const completedReservations = reservations.filter(r => 
            r.status === 'completed' || r.status === 'collected'
          ).length;
          const completionRate = reservationCount > 0 
            ? (completedReservations / reservationCount) * 100 
            : 0;
          
          const reportCount = reports.length;
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 5;
          const registrationCount = registrations.length;
          
          const reportScore = avgMetrics.receiver.avgReports > 0 
            ? reportCount / avgMetrics.receiver.avgReports 
            : reportCount;
          
          const registrationScore = avgMetrics.receiver.avgRegistrations > 0 
            ? registrationCount / avgMetrics.receiver.avgRegistrations 
            : registrationCount;

          // Scoring logic
          if (reservationCount > 10) {
            score += 3;
            reasons.push('Frequent reservations');
          }
          if (registrationScore > 2) {
            score += 2;
            reasons.push('Active campaign participation');
          }
          if (completionRate > 80) {
            score += 2;
            reasons.push('High completion rate');
          }
          if (avgRating > avgMetrics.receiver.avgRating + 0.5) {
            score += 1;
            reasons.push('Good ratings');
          }
          if (reportScore > 2) {
            score -= 3;
            reasons.push('High report frequency');
          } else if (reportScore > 1) {
            score -= 1;
            reasons.push('Above average reports');
          }

          // Segment classification
          if (score >= 3) segment = 'power_user';
          else if (score >= 1) segment = 'active';
          else if (score <= -2) segment = 'at_risk';
          else if (reservationCount === 0 && registrationCount === 0) segment = 'new_inactive';
          else segment = 'casual';

          return {
            id: user.id,
            name: user.profile?.name || 'Unknown',
            role: user.role,
            segment,
            score,
            metrics: {
              reservations: reservationCount,
              registrations: registrationCount,
              completionRate: Number(completionRate.toFixed(1)),
              completed: completedReservations,
              reports: reportCount,
              averageRating: Number(avgRating.toFixed(1)),
              reportScore: Number(reportScore.toFixed(1))
            },
            reasons
          };
        }

        return {
          id: user.id,
          name: user.profile?.name || 'Unknown',
          role: user.role,
          segment,
          score,
          metrics: {},
          reasons
        };
      })
    );

    // Group by segment
    const segmentGroups: Record<string, any[]> = {};
    segments.forEach(user => {
      if (!segmentGroups[user.segment]) {
        segmentGroups[user.segment] = [];
      }
      segmentGroups[user.segment].push(user);
    });

    // Calculate percentages
    const totalUsers = segments.length;
    const segmentStats: Record<string, { count: number; percentage: string; averageScore: number }> = {};
    
    Object.keys(segmentGroups).forEach(segment => {
      const usersInSegment = segmentGroups[segment];
      const avgScore = usersInSegment.reduce((sum, u) => sum + u.score, 0) / usersInSegment.length;
      
      segmentStats[segment] = {
        count: usersInSegment.length,
        percentage: `${((usersInSegment.length / totalUsers) * 100).toFixed(1)}%`,
        averageScore: Number(avgScore.toFixed(2))
      };
    });

    return {
      totalUsers,
      segmentStats,
      segments: segmentGroups,
      summary: {
        powerUsers: segmentStats['power_user']?.count || 0,
        atRiskUsers: segmentStats['at_risk']?.count || 0,
        inactiveUsers: (segmentStats['new_inactive']?.count || 0) + (segmentGroups['inactive']?.length || 0),
        communityHealth: totalUsers > 0 
          ? ((segmentStats['power_user']?.count || 0) + (segmentGroups['active']?.length || 0)) / totalUsers * 100 
          : 0
      }
    };
  } catch (error) {
    logger.error('Error in segmentUsersByBehavior:', error);
    return { error: 'Failed to segment users' };
  }
}

// ===== FOOD & CAMPAIGN LOGISTICS =====

/**
 * Analyze food preferences and reservation patterns
 */
async function analyzeFoodPreferences(): Promise<any> {
  try {
    const listingsSnapshot = await db.collection('foodListings')
      .where('status', 'in', ['completed', 'approved'])
      .get();
    
    const listings = listingsSnapshot.docs.map(doc => {
      const data = doc.data() as FoodListingData;
      const timeToReserve = data.reservedQuantity > 0 ? 1 : 0;
      const popularity = data.totalQuantity > 0 
        ? (data.reservedQuantity / data.totalQuantity) * 100 
        : 0;
      
      return {
        ...data,
        popularity: Number(popularity.toFixed(1)),
        timeToReserve,
        docId: doc.id
      };
    });

    // Group by category
    const categoryAnalysis: Record<string, {
      count: number;
      totalQuantity: number;
      reservedQuantity: number;
      collectedQuantity: number;
      popularity: number;
      listings: any[];
      avgTimeToReserve: number;
    }> = {};

    listings.forEach(listing => {
      if (!categoryAnalysis[listing.category]) {
        categoryAnalysis[listing.category] = {
          count: 0,
          totalQuantity: 0,
          reservedQuantity: 0,
          collectedQuantity: 0,
          popularity: 0,
          listings: [],
          avgTimeToReserve: 0
        };
      }
      
      categoryAnalysis[listing.category].count++;
      categoryAnalysis[listing.category].totalQuantity += listing.totalQuantity || 0;
      categoryAnalysis[listing.category].reservedQuantity += listing.reservedQuantity || 0;
      categoryAnalysis[listing.category].collectedQuantity += listing.collectedQuantity || 0;
      categoryAnalysis[listing.category].popularity += listing.popularity;
      categoryAnalysis[listing.category].listings.push({
        id: listing.docId,
        title: listing.title,
        popularity: listing.popularity
      });
    });

    // Calculate averages
    const categories = Object.entries(categoryAnalysis).map(([category, data]) => {
      const avgPopularity = data.count > 0 ? data.popularity / data.count : 0;
      const utilizationRate = data.totalQuantity > 0 
        ? (data.collectedQuantity / data.totalQuantity) * 100 
        : 0;
      
      return {
        category,
        totalListings: data.count,
        totalQuantity: data.totalQuantity,
        reservedQuantity: data.reservedQuantity,
        collectedQuantity: data.collectedQuantity,
        averagePopularity: Number(avgPopularity.toFixed(1)),
        utilizationRate: Number(utilizationRate.toFixed(1)),
        demandLevel: avgPopularity > 70 ? 'High' : avgPopularity > 30 ? 'Medium' : 'Low',
        topListings: data.listings
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 3)
      };
    });

    // Sort by popularity
    categories.sort((a, b) => b.averagePopularity - a.averagePopularity);

    // Identify trends
    const highDemandCategories = categories.filter(c => c.demandLevel === 'High');
    const lowDemandCategories = categories.filter(c => c.demandLevel === 'Low');

    return {
      totalCategories: categories.length,
      totalListings: listings.length,
      categories,
      trends: {
        mostPopular: categories[0] || null,
        leastPopular: categories[categories.length - 1] || null,
        highDemandCount: highDemandCategories.length,
        lowDemandCount: lowDemandCategories.length,
        overallDemand: categories.length > 0 
          ? categories.reduce((sum, c) => sum + c.averagePopularity, 0) / categories.length 
          : 0
      },
      recommendations: {
        promote: highDemandCategories.map(c => c.category).slice(0, 3),
        reconsider: lowDemandCategories.map(c => c.category).slice(0, 3),
        marketingOpportunities: highDemandCategories
          .filter(c => c.totalListings < 5)
          .map(c => c.category)
      }
    };
  } catch (error) {
    logger.error('Error in analyzeFoodPreferences:', error);
    return { error: 'Failed to analyze food preferences' };
  }
}

/**
 * Get collection efficiency metrics
 */
async function getCollectionEfficiencyMetrics(): Promise<any> {
  try {
    // CORRECTED QUERY: Only filter by status to avoid multiple negation operators.
    // The timestamp existence check must be done in memory.
    const reservationsSnapshot = await db.collection('foodReservations')
      .where('status', 'in', ['completed', 'collected'])
      .get(); // Fetch all completed/collected status reservations
    
    // Process and filter in memory
    // Define the type for the processed array item explicitly to include Date objects
    type ProcessedReservation = ReservationData & { 
        hoursToCollect: number, 
        docId: string, 
        reservedDate: Date, 
        pickedUpDate: Date 
    };

    const reservations = reservationsSnapshot.docs
      .map(doc => {
        const data = doc.data() as ReservationData;
        
        // CRITICAL CHECK: Ensure timestamps exist before converting and calculating
        if (!data.reservedAt || !data.pickedUpAt) {
            return null; 
        }

        const reservedDate = safeDateConversion(data.reservedAt); // Date object
        const pickedUpDate = safeDateConversion(data.pickedUpAt); // Date object
        
        // Calculate the difference in hours
        let hoursToCollect = (pickedUpDate.getTime() - reservedDate.getTime()) / (1000 * 60 * 60);
        
        // Handle negative/zero times with a 24-hour fallback
        if (hoursToCollect <= 0) {
            hoursToCollect = 24; 
        }

        return {
          ...data,
          reservedDate, // Date property added here
          pickedUpDate, // Date property added here
          hoursToCollect: hoursToCollect,
          docId: doc.id
        } as ProcessedReservation; // Cast each mapped item
      })
      .filter((res): res is ProcessedReservation => res !== null); // Filter out null entries and assert final type

    if (reservations.length === 0) {
      return {
        totalReservations: 0,
        message: 'No completed reservations with collection data available',
        efficiencyMetrics: { averageHoursToCollect: 'N/A', fastestCollection: 'N/A', slowestCollection: 'N/A', efficiencyScore: 'N/A' },
        collectionTimeDistribution: {},
        donorEfficiency: [],
        temporalPatterns: {},
        recommendations: {}
      };
    }

    // Calculate statistics
    const hoursArray = reservations.map(r => r.hoursToCollect);
    const avgHours = hoursArray.reduce((sum, hours) => sum + hours, 0) / hoursArray.length;
    const minHours = Math.min(...hoursArray);
    const maxHours = Math.max(...hoursArray);
    
    // Calculate efficiency bands
    const within4Hours = reservations.filter(r => r.hoursToCollect <= 4).length;
    const within12Hours = reservations.filter(r => r.hoursToCollect <= 12).length;
    const within24Hours = reservations.filter(r => r.hoursToCollect <= 24).length;
    const beyond24Hours = reservations.filter(r => r.hoursToCollect > 24).length;

    // Group by donor for donor-specific efficiency
    const donorEfficiency: Record<string, {
      count: number;
      totalHours: number;
      avgHours: number;
      reservations: any[];
    }> = {};

    reservations.forEach(res => {
      if (!donorEfficiency[res.donorId]) {
        donorEfficiency[res.donorId] = {
          count: 0,
          totalHours: 0,
          avgHours: 0,
          reservations: []
        };
      }
      
      donorEfficiency[res.donorId].count++;
      donorEfficiency[res.donorId].totalHours += res.hoursToCollect;
      donorEfficiency[res.donorId].reservations.push({
        id: res.docId,
        hoursToCollect: res.hoursToCollect,
        userName: res.userName
      });
    });

    // Calculate averages and sort
    const donorStats = Object.entries(donorEfficiency).map(([donorId, data]) => ({
      donorId,
      donorName: data.reservations[0]?.donorName || 'Unknown',
      reservationCount: data.count,
      averageHours: Number((data.totalHours / data.count).toFixed(1)),
      efficiency: data.totalHours / data.count <= 6 ? 'High' : 
                 data.totalHours / data.count <= 12 ? 'Medium' : 'Low',
      fastestCollection: Math.min(...data.reservations.map(r => r.hoursToCollect)),
      slowestCollection: Math.max(...data.reservations.map(r => r.hoursToCollect))
    })).sort((a, b) => a.averageHours - b.averageHours);

    // Time-based analysis
    const dayOfWeekAnalysis: Record<string, { count: number; totalHours: number; avgHours: number }> = {};
    const hourOfDayAnalysis: Record<number, { count: number; totalHours: number; avgHours: number }> = {};
    
    reservations.forEach(res => {
      // Access the explicit Date properties
      const reservedDate = res.reservedDate; 
      const dayOfWeek = reservedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const hourOfDay = reservedDate.getHours();
      
      // Day of week
      if (!dayOfWeekAnalysis[dayOfWeek]) {
        dayOfWeekAnalysis[dayOfWeek] = { count: 0, totalHours: 0, avgHours: 0 };
      }
      dayOfWeekAnalysis[dayOfWeek].count++;
      dayOfWeekAnalysis[dayOfWeek].totalHours += res.hoursToCollect;
      
      // Hour of day
      if (!hourOfDayAnalysis[hourOfDay]) {
        hourOfDayAnalysis[hourOfDay] = { count: 0, totalHours: 0, avgHours: 0 };
      }
      hourOfDayAnalysis[hourOfDay].count++;
      hourOfDayAnalysis[hourOfDay].totalHours += res.hoursToCollect;
    });

    // Calculate averages
    Object.keys(dayOfWeekAnalysis).forEach(day => {
      dayOfWeekAnalysis[day].avgHours = dayOfWeekAnalysis[day].totalHours / dayOfWeekAnalysis[day].count;
    });
    
    Object.keys(hourOfDayAnalysis).forEach(hour => {
      hourOfDayAnalysis[parseInt(hour)].avgHours = hourOfDayAnalysis[parseInt(hour)].totalHours / hourOfDayAnalysis[parseInt(hour)].count;
    });

    return {
      totalReservations: reservations.length,
      timePeriod: {
        earliest: reservations.reduce((min, r) => r.reservedDate < min ? r.reservedDate : min, new Date()),
        latest: reservations.reduce((max, r) => r.reservedDate > max ? r.reservedDate : max, new Date(0))
      },
      efficiencyMetrics: {
        averageHoursToCollect: Number(avgHours.toFixed(1)),
        fastestCollection: Number(minHours.toFixed(1)),
        slowestCollection: Number(maxHours.toFixed(1)),
        medianHours: hoursArray.sort((a, b) => a - b)[Math.floor(hoursArray.length / 2)],
        efficiencyScore: avgHours <= 6 ? 'Excellent' : avgHours <= 12 ? 'Good' : avgHours <= 24 ? 'Fair' : 'Poor'
      },
      collectionTimeDistribution: {
        within4Hours: {
          count: within4Hours,
          percentage: `${((within4Hours / reservations.length) * 100).toFixed(1)}%`
        },
        within12Hours: {
          count: within12Hours,
          percentage: `${((within12Hours / reservations.length) * 100).toFixed(1)}%`
        },
        within24Hours: {
          count: within24Hours,
          percentage: `${((within24Hours / reservations.length) * 100).toFixed(1)}%`
        },
        beyond24Hours: {
          count: beyond24Hours,
          percentage: `${((beyond24Hours / reservations.length) * 100).toFixed(1)}%`
        }
      },
      donorEfficiency: donorStats,
      temporalPatterns: {
        byDayOfWeek: dayOfWeekAnalysis,
        byHourOfDay: hourOfDayAnalysis,
        bestDay: Object.entries(dayOfWeekAnalysis)
          .reduce((best: [string, { count: number; totalHours: number; avgHours: number }], [day, data]) => {
            return data.avgHours < best[1].avgHours ? [day, data] : best;
          }, ['', { count: 0, totalHours: 0, avgHours: Infinity }])[0],
        bestHour: Object.entries(hourOfDayAnalysis)
          .reduce((best: [string, { count: number; totalHours: number; avgHours: number }], [hour, data]) => {
            return data.avgHours < best[1].avgHours ? [hour, data] : best;
          }, ['0', { count: 0, totalHours: 0, avgHours: Infinity }])[0]
      },
      recommendations: {
        fastestDonors: donorStats.filter(d => d.efficiency === 'High').slice(0, 3),
        slowestDonors: donorStats.filter(d => d.efficiency === 'Low').slice(0, 3),
        optimalTimes: {
          day: Object.entries(dayOfWeekAnalysis)
            .reduce((best, [day, data]) => {
              return data.avgHours < best[1].avgHours ? [day, data] : best;
            }, ['', { count: 0, totalHours: 0, avgHours: Infinity }])[0],
          hour: Object.entries(hourOfDayAnalysis)
            .reduce((best, [hour, data]) => {
              return data.avgHours < best[1].avgHours ? [hour, data] : best;
            }, ['0', { count: 0, totalHours: 0, avgHours: Infinity }])[0]
        }
      }
    };
  } catch (error) {
    const errorMessage = (error as { message?: string }).message || 'An unknown error occurred during efficiency calculation';

    logger.error('Error in getCollectionEfficiencyMetrics:', error);
    return { 
        error: errorMessage,
        totalReservations: 0,
        efficiencyMetrics: { averageHoursToCollect: 'N/A', efficiencyScore: 'ERROR' },
        recommendations: { fastestDonors: [], slowestDonors: [], optimalTimes: { day: 'N/A', hour: 'N/A' } }
    };
  }
}

// Helper functions for the NEW criteria:
function calculateNeedScore(data: any): number {
    // Need is defined by high demand potential: combined count of receivers and volunteers
    return data.receivers + data.volunteers;
}

function calculateWasteRatio(data: any): number {
    // Waste Ratio: (Total Quantity - Collected Quantity) / Total Quantity
    const total = data.totalQuantity || 0;
    const collected = data.collectedQuantity || 0;
    if (total === 0) return 0;
    
    const wasted = Math.max(0, total - collected);
    return wasted / total; // Returns a ratio from 0 to 1
}

function calculateEfficiencyRatio(data: any): number {
    // Efficiency Ratio: Collected Quantity / Total Quantity (Utilization Rate)
    const total = data.totalQuantity || 0;
    const collected = data.collectedQuantity || 0;
    if (total === 0) return 0;
    return collected / total; // Returns a utilization rate from 0 to 1
}

/**
 * Identify geographic coverage gaps (legacy function)
 */
async function identifyCoverageGaps(city?: string): Promise<any> {
  try {
    // Fetch all users, listings, and campaigns (same as before)
    const [usersSnapshot, listingsSnapshot, campaignsSnapshot] = await Promise.all([
        db.collection('users').where('status', '==', 'approved').get(),
        db.collection('foodListings').where('status', 'in', ['approved', 'completed']).get(),
        db.collection('campaigns').where('status', 'in', ['ongoing', 'completed']).get()
    ]);

    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as UserData);
    const listings = listingsSnapshot.docs.map(doc => doc.data() as FoodListingData);
    const campaigns = campaignsSnapshot.docs.map(doc => doc.data() as CampaignData);

    // Grouping by city (omitting internal grouping logic for brevity)
    const cityAnalysis: Record<string, {
      donors: number; volunteers: number; receivers: number; listings: number; campaigns: number; totalUsers: number;
      totalQuantity: number; collectedQuantity: number; userAddresses: string[];
    }> = {};

    // --- User, Listing, and Campaign grouping logic runs here ---
    users.forEach(user => {
        const cityName = user.profile?.address?.city || 'Unknown';
        if (!cityAnalysis[cityName]) {
          cityAnalysis[cityName] = { donors: 0, volunteers: 0, receivers: 0, listings: 0, campaigns: 0, totalUsers: 0, totalQuantity: 0, collectedQuantity: 0, userAddresses: [] };
        }
        cityAnalysis[cityName][`${user.role}s` as keyof typeof cityAnalysis[string]]++;
        cityAnalysis[cityName].totalUsers++;
    });
    
    listings.forEach(listing => {
        const donor = users.find(u => u.id === listing.donorId);
        if (donor) {
            const cityName = donor.profile?.address?.city || 'Unknown';
            if (cityAnalysis[cityName]) {
                cityAnalysis[cityName].listings++;
                const conversion = UNIT_CONVERSIONS[listing.quantityUnit as keyof typeof UNIT_CONVERSIONS] || 1;
                cityAnalysis[cityName].totalQuantity += (listing.totalQuantity || 0) * conversion;
                cityAnalysis[cityName].collectedQuantity += (listing.collectedQuantity || 0) * conversion;
            }
        }
    });
    
    campaigns.forEach(campaign => {
        const organizer = users.find(u => u.id === campaign.organizerId);
        if (organizer) {
            const cityName = organizer.profile?.address?.city || 'Unknown';
            if (cityAnalysis[cityName]) cityAnalysis[cityName].campaigns++;
        }
    });

    // Convert to array and calculate ALL METRICS (Legacy and New)
    const cityData = Object.entries(cityAnalysis)
      .filter(([city, data]) => city !== 'Unknown' && data.totalUsers > 0)
      .map(([city, data]) => {
        
        // --- NEW SCORES (For reliable lists) ---
        const needScore = calculateNeedScore(data);
        const wasteRatio = calculateWasteRatio(data);
        const efficiencyRatio = calculateEfficiencyRatio(data); 
        
        // --- LEGACY SCORES (For AI chat triage) ---
        const overallScore = (calculateCoverageScore(data) + calculateDemandScore(data)) / 2;
      
        return {
          city, ...data,
          overallScore, 
          needScore,
          wasteRatio,
          efficiencyRatio,
        };
      });

    // =========================================================
    // 2. GENERATE NEW KEY INSIGHT LISTS BASED ON NEW CRITERIA
    // =========================================================
    
    // A. HIGH NEED: Top 3 cities by Need Score (Receivers + Volunteers)
    const highNeedCities = cityData
      .sort((a, b) => b.needScore - a.needScore)
      .slice(0, 3)
      .map(c => c.city);

    // B. HIGH WASTE: Top 3 cities by Waste Ratio (highest ratio first). Must have listed some food.
    const highWasteCities = cityData
      .filter(c => c.totalQuantity > 0)
      .sort((a, b) => b.wasteRatio - a.wasteRatio)
      .slice(0, 3)
      .map(c => c.city);

    // C. HIGH EFFICIENCY (Best Covered): Top 3 cities by Efficiency Ratio (highest utilization first). Must have listed some food.
    const highEfficiencyCities = cityData
      .filter(c => c.totalQuantity > 0)
      .sort((a, b) => b.efficiencyRatio - a.efficiencyRatio)
      .slice(0, 3)
      .map(c => c.city);

    // --- FINAL RETURN STRUCTURE ---
    return {
      totalCities: cityData.length,
      // Use the new lists to populate the legacy keys for the AI text generator
      biggestGaps: highNeedCities.map(city => ({ city, priority: 'High' })), // HIGH NEED
      bestCoveredCities: highEfficiencyCities.map(city => ({ city, score: 100 })), // HIGH EFFICIENCY
      recommendations: {
        immediateFocus: highWasteCities, // HIGH WASTE
      },
      // Include the new lists explicitly for the analysis text function to pull
      newKeyInsights: {
        highNeedCities,
        highWasteCities,
        highEfficiencyCities
      },
      allCities: cityData // Includes all cities and their triage score (overallScore)
    };
  } catch (error) {
    logger.error('Error in identifyCoverageGaps (Re-engineered):', error);
    return { error: 'Failed to identify coverage gaps' };
  }
}

// Helper functions for coverage analysis
function calculateCoverageScore(data: any): number {
  let score = 0;
  
  // User diversity (max 30 points)
  if (data.donors > 0) score += 10;
  if (data.volunteers > 0) score += 10;
  if (data.receivers > 0) score += 10;
  
  // Activity level (max 40 points)
  if (data.listings > 0) score += Math.min(data.listings * 2, 20);
  if (data.campaigns > 0) score += Math.min(data.campaigns * 5, 20);
  
  // User density (max 30 points)
  if (data.totalUsers >= 10) score += 30;
  else if (data.totalUsers >= 5) score += 20;
  else if (data.totalUsers >= 2) score += 10;
  else if (data.totalUsers > 0) score += 5;
  
  return Math.min(score, 100);
}

function calculateDemandScore(data: any): number {
  // Based on listings vs users ratio
  const listingsPerDonor = data.donors > 0 ? data.listings / data.donors : 0;
  const quantityPerListing = data.listings > 0 ? data.totalQuantity / data.listings : 0;
  const collectionRate = data.totalQuantity > 0 ? data.collectedQuantity / data.totalQuantity : 0;
  
  let score = 0;
  
  // Donor activity (max 40 points)
  score += Math.min(listingsPerDonor * 10, 40);
  
  // Quantity per listing (max 30 points)
  score += Math.min(quantityPerListing * 2, 30);
  
  // Collection efficiency (max 30 points)
  score += collectionRate * 30;
  
  return Math.min(score, 100);
}

/**
 * Get pending items summary for moderation queue
 */
async function getPendingItemsSummary(): Promise<any> {
  try {
    const [
      pendingListings,
      pendingCampaigns,
      pendingUsers,
      pendingReports
    ] = await Promise.all([
      db.collection('foodListings').where('status', '==', 'pending').count().get(),
      db.collection('campaigns').where('status', '==', 'pending').count().get(),
      db.collection('users').where('status', '==', 'pending').count().get(),
      db.collection('reports').where('status', '==', 'pending').count().get()
    ]);

    const totalPending = 
      pendingListings.data().count + 
      pendingCampaigns.data().count + 
      pendingUsers.data().count + 
      pendingReports.data().count;

    // Get age of oldest pending items
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [oldListings, oldCampaigns, oldUsers] = await Promise.all([
      db.collection('foodListings')
        .where('status', '==', 'pending')
        .where('createdAt', '<', oneWeekAgo)
        .count()
        .get(),
      db.collection('campaigns')
        .where('status', '==', 'pending')
        .where('createdAt', '<', oneWeekAgo)
        .count()
        .get(),
      db.collection('users')
        .where('status', '==', 'pending')
        .where('createdAt', '<', oneWeekAgo)
        .count()
        .get()
    ]);

    return {
      summary: {
        listings: pendingListings.data().count,
        campaigns: pendingCampaigns.data().count,
        users: pendingUsers.data().count,
        reports: pendingReports.data().count,
        total: totalPending
      },
      aging: {
        listingsOver7Days: oldListings.data().count,
        campaignsOver7Days: oldCampaigns.data().count,
        usersOver7Days: oldUsers.data().count,
        totalOverdue: oldListings.data().count + oldCampaigns.data().count + oldUsers.data().count
      },
      priority: {
        high: pendingReports.data().count + oldListings.data().count,
        medium: pendingCampaigns.data().count + oldCampaigns.data().count,
        low: pendingUsers.data().count - oldUsers.data().count
      },
      estimatedTime: {
        minutes: totalPending * 5,
        hours: Math.ceil(totalPending * 5 / 60)
      }
    };
  } catch (error) {
    logger.error('Error in getPendingItemsSummary:', error);
    return { error: 'Failed to fetch pending items summary' };
  }
}

/**
 * Get highest risk user segmentation
 */
async function getHighestRiskSegmentation(): Promise<any> {
  try {
    // Get all users and their risk data
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserData[];

    // Get reports and ratings for risk assessment
    const [reportsSnapshot, ratingsSnapshot] = await Promise.all([
      db.collection('reports').get(),
      db.collection('ratings').get()
    ]);

    const reports = reportsSnapshot.docs.map(doc => doc.data() as ReportData);
    const ratings = ratingsSnapshot.docs.map(doc => doc.data() as RatingData);

    const riskUsers = await Promise.all(
      users.map(async (user) => {
        const userReports = reports.filter(r => r.reportedUser?.id === user.id);
        const userRatings = ratings.filter(r => r.ratedUserId === user.id);
        
        // Get user reservations for no-show calculation
        let noShowCount = 0;
        if (user.role === 'receiver') {
          const reservationsSnapshot = await db.collection('foodReservations')
            .where('userId', '==', user.id)
            .get();
          
          const reservations = reservationsSnapshot.docs.map(doc => doc.data() as ReservationData);
          const completed = reservations.filter(r => 
            r.status === 'completed' || r.status === 'collected'
          ).length;
          noShowCount = reservations.length - completed;
        }

        const avgRating = userRatings.length > 0 
          ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length 
          : 5;

        // Calculate risk score (0-100)
        let riskScore = 0;
        if (user.status === 'rejected') riskScore += 30;
        if (userReports.length > 2) riskScore += userReports.length * 10;
        if (avgRating < 2.5) riskScore += (3 - avgRating) * 15;
        if (noShowCount > 2) riskScore += noShowCount * 5;

        // Cap at 100
        riskScore = Math.min(riskScore, 100);

        return {
          id: user.id,
          name: user.profile?.orgName || user.profile?.name || 'Unknown',
          role: user.role,
          status: user.status,
          riskScore: Math.round(riskScore),
          riskLevel: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
          factors: {
            reports: userReports.length,
            avgRating: Number(avgRating.toFixed(1)),
            noShows: noShowCount,
            accountStatus: user.status
          },
          lastActivity: user.updatedAt ? safeDateConversion(user.updatedAt).toLocaleDateString() : 'Unknown'
        };
      })
    );

    // Segment by risk level and role
    const highRiskUsers = riskUsers.filter(u => u.riskLevel === 'HIGH');
    const mediumRiskUsers = riskUsers.filter(u => u.riskLevel === 'MEDIUM');
    
    const segmentation = {
      byRiskLevel: {
        high: highRiskUsers.length,
        medium: mediumRiskUsers.length,
        low: riskUsers.length - highRiskUsers.length - mediumRiskUsers.length
      },
      byRole: {
        donor: riskUsers.filter(u => u.role === 'donor').length,
        volunteer: riskUsers.filter(u => u.role === 'volunteer').length,
        receiver: riskUsers.filter(u => u.role === 'receiver').length,
        admin: riskUsers.filter(u => u.role === 'admin').length
      },
      highRiskConcentration: {
        donors: highRiskUsers.filter(u => u.role === 'donor').length,
        volunteers: highRiskUsers.filter(u => u.role === 'volunteer').length,
        receivers: highRiskUsers.filter(u => u.role === 'receiver').length,
        biggestSource: highRiskUsers.length > 0 
          ? Object.entries(
              highRiskUsers.reduce((acc, u) => {
                acc[u.role] = (acc[u.role] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).sort((a, b) => b[1] - a[1])[0][0]
          : 'None'
      },
      clusters: {
        repeatOffenders: riskUsers.filter(u => u.factors.reports >= 3).slice(0, 5),
        poorRatedUsers: riskUsers.filter(u => u.factors.avgRating < 2.5).slice(0, 5),
        frequentNoShows: riskUsers.filter(u => u.factors.noShows >= 3).slice(0, 5)
      },
      recommendations: {
        immediateAction: highRiskUsers.slice(0, 3).map(u => ({
          name: u.name,
          role: u.role,
          reason: u.factors.reports > 0 ? 'Multiple reports' : 
                 u.factors.avgRating < 2 ? 'Very low ratings' : 
                 u.factors.noShows > 2 ? 'Frequent no-shows' : 'Account issues'
        })),
        monitoring: mediumRiskUsers.slice(0, 5).map(u => ({
          name: u.name,
          role: u.role,
          riskScore: u.riskScore
        })),
        prevention: riskUsers
          .filter(u => u.riskLevel === 'LOW' && u.factors.reports === 0 && u.factors.avgRating >= 4)
          .slice(0, 3)
          .map(u => ({ name: u.name, role: u.role, successFactors: 'High ratings, no reports' }))
      }
    };

    return {
      totalUsers: riskUsers.length,
      overallRiskScore: riskUsers.length > 0 
        ? riskUsers.reduce((sum, u) => sum + u.riskScore, 0) / riskUsers.length 
        : 0,
      segmentation,
      highRiskUsers: highRiskUsers.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10),
      riskTrend: 'stable'
    };
  } catch (error) {
    logger.error('Error in getHighestRiskSegmentation:', error);
    return { error: 'Failed to analyze risk segmentation' };
  }
}

/**
 * Compare food rescue vs campaigns performance
 */
async function getFoodCampaignComparison(): Promise<any> {
  try {
    // Get food data
    const foodSnapshot = await db.collection('foodListings')
      .where('status', '==', 'completed')
      .get();
    
    const foodListings = foodSnapshot.docs.map(doc => doc.data() as FoodListingData);
    
    // Get campaign data
    const campaignSnapshot = await db.collection('campaigns')
      .where('status', '==', 'completed')
      .get();
    
    const campaigns = campaignSnapshot.docs.map(doc => doc.data() as CampaignData);

    // Calculate food metrics
    const foodMetrics = {
      count: foodListings.length,
      totalQuantity: foodListings.reduce((sum, f) => sum + (f.totalQuantity || 0), 0),
      collectedQuantity: foodListings.reduce((sum, f) => sum + (f.collectedQuantity || 0), 0),
      wastedQuantity: foodListings.reduce((sum, f) => {
        const total = f.totalQuantity || 0;
        const collected = f.collectedQuantity || 0;
        return sum + Math.max(0, total - collected);
      }, 0),
      avgQuantityPerListing: foodListings.length > 0 
        ? foodListings.reduce((sum, f) => sum + (f.totalQuantity || 0), 0) / foodListings.length 
        : 0,
      utilizationRate: foodListings.length > 0 
        ? (foodListings.reduce((sum, f) => sum + (f.collectedQuantity || 0), 0) / 
           foodListings.reduce((sum, f) => sum + (f.totalQuantity || 0), 0)) * 100 
        : 0
    };

    // Calculate campaign metrics
    const campaignMetrics = {
      count: campaigns.length,
      totalSpots: campaigns.reduce((sum, c) => sum + (c.totalSpots || 0), 0),
      registeredSpots: campaigns.reduce((sum, c) => sum + (c.registeredSpots || 0), 0),
      avgParticipants: campaigns.length > 0 
        ? campaigns.reduce((sum, c) => sum + (c.registeredSpots || 0), 0) / campaigns.length 
        : 0,
      fillRate: campaigns.reduce((sum, c) => {
        const total = c.totalSpots || 0;
        const registered = c.registeredSpots || 0;
        return sum + (total > 0 ? (registered / total) * 100 : 0);
      }, 0) / Math.max(campaigns.length, 1),
      avgDuration: 3
    };

    // Get time-based comparison (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [recentFood, recentCampaigns] = await Promise.all([
      db.collection('foodListings')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get(),
      db.collection('campaigns')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get()
    ]);

    const recentFoodListings = recentFood.docs.map(doc => doc.data() as FoodListingData);
    const recentCampaignData = recentCampaigns.docs.map(doc => doc.data() as CampaignData);

    // Calculate growth rates
    const foodGrowth = foodListings.length > 0 && recentFoodListings.length > 0
      ? (recentFoodListings.length / (foodListings.length - recentFoodListings.length)) * 100 
      : recentFoodListings.length > 0 ? 100 : 0;
    
    const campaignGrowth = campaigns.length > 0 && recentCampaignData.length > 0
      ? (recentCampaignData.length / (campaigns.length - recentCampaignData.length)) * 100 
      : recentCampaignData.length > 0 ? 100 : 0;

    // Calculate impact scores
    const foodImpactScore = calculateFoodImpactScore(foodMetrics);
    const campaignImpactScore = calculateCampaignImpactScore(campaignMetrics);

    return {
      timePeriod: 'All Time',
      comparison: {
        food: {
          ...foodMetrics,
          impactScore: foodImpactScore,
          growthRate: Number(foodGrowth.toFixed(1)),
          efficiency: foodMetrics.utilizationRate >= 80 ? 'High' : 
                     foodMetrics.utilizationRate >= 60 ? 'Medium' : 'Low',
          primaryMetric: `${foodMetrics.collectedQuantity} portions saved`,
          secondaryMetric: `${foodMetrics.utilizationRate.toFixed(1)}% utilization`
        },
        campaigns: {
          ...campaignMetrics,
          impactScore: campaignImpactScore,
          growthRate: Number(campaignGrowth.toFixed(1)),
          efficiency: campaignMetrics.fillRate >= 80 ? 'High' : 
                     campaignMetrics.fillRate >= 60 ? 'Medium' : 'Low',
          primaryMetric: `${campaignMetrics.registeredSpots} participants`,
          secondaryMetric: `${campaignMetrics.fillRate.toFixed(1)}% fill rate`
        }
      },
      analysis: {
        overallWinner: foodImpactScore >= campaignImpactScore ? 'Food Rescue' : 'Campaigns',
        scoreDifference: Math.abs(foodImpactScore - campaignImpactScore),
        strengths: {
          food: foodMetrics.utilizationRate >= 70 ? 'High efficiency' : 'Direct impact',
          campaigns: campaignMetrics.fillRate >= 70 ? 'High engagement' : 'Community building'
        },
        weaknesses: {
          food: foodMetrics.utilizationRate < 60 ? 'Low utilization' : 'Limited scale',
          campaigns: campaignMetrics.fillRate < 60 ? 'Low participation' : 'Resource intensive'
        }
      },
      recommendations: {
        focusArea: foodImpactScore >= campaignImpactScore * 1.2 ? 'Campaigns need improvement' :
                  campaignImpactScore >= foodImpactScore * 1.2 ? 'Food rescue needs improvement' :
                  'Both areas balanced',
        specificActions: [
          foodMetrics.utilizationRate < 70 ? 'Improve food listing quality/descriptions' : null,
          campaignMetrics.fillRate < 70 ? 'Enhance campaign marketing/promotion' : null,
          foodGrowth < campaignGrowth ? 'Increase food donation outreach' : null,
          campaignGrowth < foodGrowth ? 'Develop more campaign organizers' : null
        ].filter(Boolean),
        synergyOpportunities: [
          'Combine campaigns with food collection drives',
          'Use campaign volunteers for food distribution',
          'Share success stories across both channels'
        ]
      },
      metricsComparison: {
        volume: foodMetrics.count > campaignMetrics.count ? 'Food has higher volume' : 'Campaigns have higher volume',
        growth: foodGrowth > campaignGrowth ? 'Food growing faster' : 'Campaigns growing faster',
        efficiency: foodMetrics.utilizationRate > campaignMetrics.fillRate ? 'Food more efficient' : 'Campaigns more efficient'
      }
    };
  } catch (error) {
    logger.error('Error in getFoodCampaignComparison:', error);
    return { error: 'Failed to compare food and campaigns' };
  }
}

// Helper functions for impact scoring
function calculateFoodImpactScore(metrics: any): number {
  let score = 0;
  
  // Quantity saved (max 40 points)
  if (metrics.collectedQuantity >= 1000) score += 40;
  else if (metrics.collectedQuantity >= 500) score += 30;
  else if (metrics.collectedQuantity >= 100) score += 20;
  else if (metrics.collectedQuantity >= 10) score += 10;
  else if (metrics.collectedQuantity > 0) score += 5;
  
  // Utilization rate (max 30 points)
  score += Math.min(metrics.utilizationRate * 0.3, 30);
  
  // Waste reduction (max 20 points)
  const wasteRate = metrics.totalQuantity > 0 
    ? (metrics.wastedQuantity / metrics.totalQuantity) * 100 
    : 0;
  score += Math.max(0, 20 - (wasteRate * 0.2));
  
  // Scale (number of listings, max 10 points)
  if (metrics.count >= 50) score += 10;
  else if (metrics.count >= 20) score += 7;
  else if (metrics.count >= 10) score += 5;
  else if (metrics.count >= 5) score += 3;
  else if (metrics.count > 0) score += 1;
  
  return Math.min(score, 100);
}

function calculateCampaignImpactScore(metrics: any): number {
  let score = 0;
  
  // Participant engagement (max 40 points)
  if (metrics.registeredSpots >= 500) score += 40;
  else if (metrics.registeredSpots >= 200) score += 30;
  else if (metrics.registeredSpots >= 100) score += 20;
  else if (metrics.registeredSpots >= 50) score += 15;
  else if (metrics.registeredSpots >= 20) score += 10;
  else if (metrics.registeredSpots > 0) score += 5;
  
  // Fill rate (max 30 points)
  score += Math.min(metrics.fillRate * 0.3, 30);
  
  // Campaign frequency (max 20 points)
  if (metrics.count >= 20) score += 20;
  else if (metrics.count >= 10) score += 15;
  else if (metrics.count >= 5) score += 10;
  else if (metrics.count >= 3) score += 7;
  else if (metrics.count > 0) score += 3;
  
  // Average participation (max 10 points)
  if (metrics.avgParticipants >= 50) score += 10;
  else if (metrics.avgParticipants >= 20) score += 7;
  else if (metrics.avgParticipants >= 10) score += 5;
  else if (metrics.avgParticipants >= 5) score += 3;
  else if (metrics.avgParticipants > 0) score += 1;
  
  return Math.min(score, 100);
}

// ============== UPDATED TOOL INTEGRATION HELPER ==============

/**
 * Parse user message and determine which tools to use
 */
async function executeToolsForQuery(userMessage: string): Promise<{
  response: string;
  data?: any;
  suggestions: string[];
}> {
  const lowerMessage = userMessage.toLowerCase();

  try {
    // ===== USER BEHAVIOR QUERIES (FIXED: MOVED TO TOP PRIORITY) =====
    const coreMetrics = await getCoreOperationalMetrics();
    const p = coreMetrics?.performanceMetrics || {};
    
    // Check for ratings/reports query using new logic
    if (lowerMessage.includes('reported') || lowerMessage.includes('least rating') || 
        lowerMessage.includes('highest rating') || lowerMessage.includes('user performance') ||
        lowerMessage.includes('best rated') || lowerMessage.includes('worst rated') ||
        lowerMessage.includes('top rated') || lowerMessage.includes('lowest rating')) {
      
      // SPECIFIC HANDLING FOR "HIGHEST RATING" QUERIES
      if (lowerMessage.includes('highest rating') || lowerMessage.includes('best rated') || lowerMessage.includes('top rated')) {
        if (p.topRatedUsers?.length > 0) {
          let response = `🏆 Highest Rated Users (Min. 5 Ratings)\n\n`;
          p.topRatedUsers.slice(0, 3).forEach((user: any, index: number) => {
            // Removed * emphasis
            response += `${index + 1}. ${user.name} (${user.role})\n`;
            response += `   * Rating: ${user.avgRating}/5 (${user.totalRatings} ratings)\n`;
            response += `   * User ID: ${user.id}\n`;
          });
          
          if (p.topRatedUsers.length === 0) {
             response = "📊 No detailed rating data available yet. Users need more ratings (min 5) to determine top performers.";
          }
          
          return {
            response,
            data: coreMetrics,
            suggestions: ['View least rated users', 'Check most reported users', 'Analyze collection efficiency']
          };
        } else {
          return {
            response: "📊 No detailed rating data available yet. Users need more ratings (min 5) to determine top performers.",
            suggestions: ['Check platform overview', 'View user segmentation', 'Monitor new users']
          };
        }
      }
      
      // SPECIFIC HANDLING FOR "LEAST RATING" OR "WORST RATED" QUERIES
      if (lowerMessage.includes('least rating') || lowerMessage.includes('worst rated') || lowerMessage.includes('lowest rating')) {
        if (p.leastRatedUsers?.length > 0) {
          let response = `⚠️ Lowest Rated Users (Min. 5 Ratings)\n\n`;
          p.leastRatedUsers.slice(0, 3).forEach((user: any, index: number) => {
            // Removed * emphasis
            response += `${index + 1}. ${user.name} (${user.role})\n`;
            response += `   * Rating: ${user.avgRating}/5 (${user.totalRatings} ratings)\n`;
            response += `   * User ID: ${user.id}\n`;
          });
          
          return {
            response,
            data: coreMetrics,
            suggestions: ['Review user reports', 'Check risk segmentation', 'View highest rated users']
          };
        } else {
          return {
            response: "✅ All users meet minimum rating requirements (or have fewer than 5 ratings). No users are currently flagged as low-rated.",
            suggestions: ['Check platform overview', 'View user segmentation']
          };
        }
      }
      
      // SPECIFIC HANDLING FOR "REPORTED" QUERIES
      if (lowerMessage.includes('reported') || lowerMessage.includes('most reported')) {
        if (p.mostReportedUsers?.length > 0) {
          let response = `🚨 Most Reported Users\n\n`;
          p.mostReportedUsers.slice(0, 3).forEach((user: any, index: number) => {
            response += `${index + 1}. ${user.name} (${user.role})\n`;
            response += `   * Reports: ${user.reportCount}\n`;
            response += `   * Current Avg Rating: ${user.avgRating || 'N/A'}/5\n`;
            response += `   * User ID: ${user.id}\n`;
          });
          
          return {
            response,
            data: coreMetrics,
            suggestions: ['Review reports', 'Check risk segmentation', 'View pending reports']
          };
        } else {
          return {
            response: "✅ No users with significant report counts. Platform community is healthy!",
            suggestions: ['Check platform overview', 'View pending reports']
          };
        }
      }
      
      // GENERAL USER PERFORMANCE OVERVIEW (if none of the specific queries matched)
      let response = `👤 User Performance Overview\n\n`;
      
      response += `Top Rated Users (Avg. 5+ ratings):\n`;
      if (p.topRatedUsers?.length > 0) {
        p.topRatedUsers.slice(0, 3).forEach((user: any, index: number) => {
          response += `${index + 1}. ${user.name} (${user.role}): ${user.avgRating}/5\n`;
        });
      } else {
        response += `No top performers found.\n`;
      }
      
      response += `\nMost Reported Users:\n`;
      if (p.mostReportedUsers?.length > 0) {
        p.mostReportedUsers.slice(0, 3).forEach((user: any, index: number) => {
          response += `${index + 1}. ${user.name} (${user.role}): ${user.reportCount} reports\n`;
        });
      } else {
        response += `No significant reports.\n`;
      }
      
      response += `\nCommunity Health: ${p.avgUserRating?.toFixed(1) || 'N/A'}/5 average rating`;
      
      return {
        response,
        data: coreMetrics,
        suggestions: ['View highest rated', 'Check least rated', 'Analyze risk segmentation']
      };
    }

    // ===== CORE METRICS QUERIES (General Overview) =====
    if (lowerMessage.includes('overview') || lowerMessage.includes('dashboard') || 
        lowerMessage.includes('stats') || lowerMessage.includes('how many') ||
        lowerMessage.includes('summary')) {
      const coreMetrics = await getCoreOperationalMetrics();
      
      // Use safe access with optional chaining and nullish coalescing
      const u = coreMetrics?.userMetrics || {};
      const f = coreMetrics?.foodListingMetrics || {};
      const c = coreMetrics?.campaignMetrics || {};
      const i = coreMetrics?.impactMetrics || {};
      const p = coreMetrics?.performanceMetrics || {};
      
      // Removed * emphasis, keeping * for bullet points
      return {
        response: `📊 Platform Operational Overview\n\n` +
                `* Users: ${u.total || 0} total (${u.active || 0} active)\n` +
                `  - Donors: ${u.roleDistribution?.donor || 0}, Receivers: ${u.roleDistribution?.receiver || 0}\n` +
                `  - Volunteers: ${u.roleDistribution?.volunteer || 0}\n` +
                `  - Pending Approvals: ${u.statusBreakdown?.pending || 0}\n\n` +
                `* Food Listings: ${f.total || 0} total\n` +
                `  - Completed: ${f.statusBreakdown?.completed || 0}, Pending: ${f.statusBreakdown?.pending || 0}\n` +
                `  - Utilization Rate: ${f.utilizationRate || 0}%\n\n` +
                `* Campaigns: ${c.total || 0} total\n` +
                `  - Registered Spots: ${c.registeredSpots || 0}/${c.totalSpots || 0}\n` +
                `  - Fill Rate: ${c.fillRate || 0}%\n\n` +
                `* Impact: ${i.foodSavedKg?.toFixed(0) || 0} kg saved\n` +
                `  - CO2 Reduced: ${i.co2PreventedKg?.toFixed(0) || 0} kg\n` +
                `  - Water Saved: ${i.waterSavedLiters?.toLocaleString() || 0} L\n\n` +
                `* Performance:\n` +
                `  - Avg User Rating: ${p.avgUserRating?.toFixed(1) || 'N/A'}/5\n` +
                `  - Reports Total: ${p.reportsTotal || 0}`,
        data: coreMetrics,
        suggestions: ['Show geographic insights', 'View campaign categories', 'Get growth metrics']
      };
    }

    // ===== NEW GEOGRAPHIC ANALYSIS QUERIES =====
    if (lowerMessage.includes('coverage') || lowerMessage.includes('geographic') || 
        lowerMessage.includes('location') || lowerMessage.includes('high need') ||
        lowerMessage.includes('high waste') || lowerMessage.includes('city analysis')) {
      
      const coreMetrics = await getCoreOperationalMetrics();
      const geoAnalysis = coreMetrics?.geographicAnalysis as GeographicAnalysis | undefined;

      if (!geoAnalysis || geoAnalysis.totalCities === 0) {
        return {
          response: "🗺️ Geographic Analysis Unavailable\n\nNo location data is currently available or pre-calculated.",
          suggestions: ['Run manual analytics', 'View platform overview', 'Check data quality']
        };
      }
      
      const highNeed = geoAnalysis.keyInsights.highNeedCities.slice(0, 3);
      const highWaste = geoAnalysis.keyInsights.highWasteCities.slice(0, 3);
      const totalAnalyzed = geoAnalysis.totalCities;

      // Extract the structured Geo Action/Summary (the FIRST recommendation)
      const geoActionInsight = coreMetrics?.analyticsOverview?.recommendations?.[0] || "Problem/Summary: No immediate strategic problem identified. Primary Action: Conduct proactive market research in adjacent cities.";
      
      const geoActionParts = geoActionInsight.split('Primary Action:');
      const problemSummary = geoActionParts[0].replace('Problem/Summary:', '').trim();
      const primaryAction = geoActionParts[1] ? geoActionParts[1].trim() : "Action details not available.";

      let response = `🗺️ Geographic Intervention Areas (${totalAnalyzed} Cities)\n\n`;
      
      response += `🔥 High Need Areas (Target for Receiver/Supply Acquisition):\n`;
      if (highNeed.length > 0) {
        response += `* Cities: ${highNeed.join(', ')}\n`;
        response += `* Threshold: Utilization > ${geoAnalysis.thresholds.HIGH_UTILIZATION * 100}% AND Low Listing/Receiver Ratio.\n\n`;
      } else {
        response += `* No cities currently meet the strict High Need criteria.\n\n`;
      }

      response += `🗑️ High Waste Risk Areas (Target for Logistics/Donor Education):\n`;
      if (highWaste.length > 0) {
        response += `* Cities: ${highWaste.join(', ')}\n`;
        response += `* Threshold: Utilization < ${geoAnalysis.thresholds.LOW_UTILIZATION * 100}% AND High Listing Volume.\n\n`;
      } else {
        response += `* No cities currently show severe High Waste Risk.\n\n`;
      }

      response += `🎯 AI STRATEGIC FOCUS (Most Critical Action):\n`;
      response += `* Problem/Summary: ${problemSummary}\n`;
      response += `* Primary Action: ${primaryAction}`;

      return {
        response,
        data: coreMetrics,
        suggestions: ['Generate impact report', 'Analyze collection efficiency', 'View raw city list']
      };
    }
    
    // ===== GROWTH & ANALYTICS QUERIES =====
    if (lowerMessage.includes('growth') || lowerMessage.includes('trend') || 
        lowerMessage.includes('month over month') || lowerMessage.includes('mom')) {
      const daysMatch = lowerMessage.match(/(\d+)\s+days/i) || lowerMessage.match(/last\s+(\d+)/i);
      const days = daysMatch ? parseInt(daysMatch[1]) : 30;
      
      const growthData = await getGrowthMetrics(days);
      
      // Safe access with optional chaining and nullish coalescing
      const userGrowth = growthData?.metrics?.users?.growth ?? 0;
      const foodGrowth = growthData?.metrics?.food?.growth ?? 0;
      const campaignGrowth = growthData?.metrics?.campaigns?.growth ?? 0;
      const newDonors = growthData?.metrics?.newDonors?.current ?? 0;
      const donorGrowth = growthData?.metrics?.newDonors?.growth ?? 0;
      const overallGrowth = growthData?.summary?.overallGrowth ?? 0;
      const totalUsers = growthData?.totalApprovedUsers ?? 0;
      
      // Removed * emphasis, keeping * for bullet points
      return {
        response: `📈 Platform Growth Analysis (Last ${days} Days)\n\n` +
                 `Total Approved Users: ${totalUsers}\n` +
                 `* User Growth: ${userGrowth >= 0 ? '+' : ''}${userGrowth.toFixed(1)}%\n` +
                 `* Food Saved Growth: ${foodGrowth >= 0 ? '+' : ''}${foodGrowth.toFixed(1)}%\n` +
                 `* Campaign Growth: ${campaignGrowth >= 0 ? '+' : ''}${campaignGrowth.toFixed(1)}%\n` +
                 `* New Donors: ${newDonors} (+${donorGrowth.toFixed(1)}%)\n\n` +
                 `Overall Trend: ${overallGrowth >= 0 ? 'Upward' : 'Downward'}`,
        data: growthData,
        suggestions: ['Compare with previous period', 'View detailed metrics', 'Generate growth report']
      };
    }

    if (lowerMessage.includes('anomaly') || lowerMessage.includes('unusual') || 
        lowerMessage.includes('spike') || lowerMessage.includes('drop')) {
      const anomalyData = await detectAnomalies();
      
      // Removed * emphasis, keeping * for bullet points
      if (!anomalyData?.anomalies || anomalyData.anomalies.length === 0) {
        return {
          response: "✅ No Anomalies Detected\n\nPlatform activity is within normal ranges for the last 7 days. Everything looks stable!",
          data: anomalyData,
          suggestions: ['Monitor real-time activity', 'Set up alerts', 'View historical patterns']
        };
      }
      
      let response = `⚠️ Anomalies Detected\n\n`;
      anomalyData.anomalies.slice(0, 3).forEach((anomaly: any) => {
        response += `* ${anomaly.date}: ${anomaly.type} (${anomaly.deviation} from expected)\n`;
      });
      
      if (anomalyData.anomalies.length > 3) {
        response += `\n...and ${anomalyData.anomalies.length - 3} more anomalies`;
      }
      
      response += `\n\nStatus: ${(anomalyData.status || 'normal').toUpperCase()}`;
      
      return {
        response,
        data: anomalyData,
        suggestions: ['Investigate anomalies', 'View all anomalies', 'Check system logs']
      };
    }
    
    // ===== USER BEHAVIOR QUERIES =====
    
    if (lowerMessage.includes('segment') || lowerMessage.includes('user type') || 
        lowerMessage.includes('power user') || lowerMessage.includes('at risk')) {
      const segmentationData = await segmentUsersByBehavior();
      
      const powerUsers = segmentationData?.summary?.powerUsers ?? 0;
      const atRiskUsers = segmentationData?.summary?.atRiskUsers ?? 0;
      const inactiveUsers = segmentationData?.summary?.inactiveUsers ?? 0;
      const communityHealth = segmentationData?.summary?.communityHealth ?? 0;

      let response = `🎯 User Segmentation Analysis\n\n`;
      // Removed * emphasis
      response += `* Power Users: ${powerUsers}\n`;
      response += `* At-Risk Users: ${atRiskUsers}\n`;
      response += `* Inactive Users: ${inactiveUsers}\n`;
      response += `* Community Health: ${communityHealth.toFixed(1)}%\n\n`;
      
      // Add top segments
      Object.entries(segmentationData?.segmentStats || {})
        .slice(0, 3)
        .forEach(([segment, data]: [string, any]) => {
          response += `${segment.replace('_', ' ').toUpperCase()}: ${data.count || 0} users (${data.percentage || '0%'})\n`;
        });
      
      return {
        response,
        data: segmentationData,
        suggestions: ['View all segments', 'Target power users', 'Intervene with at-risk users']
      };
    }

    // ===== FOOD & CAMPAIGN QUERIES =====
    if (lowerMessage.includes('food preference') || lowerMessage.includes('popular food') || 
        lowerMessage.includes('most wanted') || lowerMessage.includes('food category') ||
        lowerMessage.includes('most donated') || lowerMessage.includes('food type')) {
      
      const preferenceData = await analyzeFoodPreferences();
      
      if (preferenceData.error) {
        return {
          response: `🥦 Food Analysis Unavailable\n\n${preferenceData.error}`,
          suggestions: ['Try again', 'Check food listings', 'View platform overview']
        };
      }
      
      const mostPopular = preferenceData?.trends?.mostPopular;
      const leastPopular = preferenceData?.trends?.leastPopular;
      const highDemandCategories = preferenceData?.categories?.filter((c: any) => c.demandLevel === 'High') || [];
      
      let response = `🥦 Food Preference Analysis\n\n`;
      
      if (mostPopular) {
        // Removed * emphasis
        response += `🏆 Most Popular: ${mostPopular.category}\n`;
        response += `* Average Popularity: ${mostPopular.averagePopularity || 0}%\n`;
        response += `* Total Listings: ${mostPopular.totalListings || 0}\n\n`;
      }
      
      if (highDemandCategories.length > 0) {
        response += `🔥 High Demand Categories:\n`;
        highDemandCategories.slice(0, 3).forEach((cat: any) => {
          response += `* ${cat.category}: ${cat.averagePopularity || 0}% popularity\n`;
        });
        response += `\n`;
      }
      
      if (leastPopular) {
        // Removed * emphasis
        response += `📉 Least Popular: ${leastPopular.category}\n`;
        response += `* Consider: ${preferenceData?.recommendations?.reconsider?.[0] || 'Review listing quality'}\n\n`;
      }
      
      response += `Recommendations:\n`;
      preferenceData?.recommendations?.promote?.slice(0, 3).forEach((item: string, index: number) => {
        response += `${index + 1}. Promote ${item}\n`;
      });
      
      return {
        response,
        data: preferenceData,
        suggestions: ['View all categories', 'Analyze low-demand items', 'Optimize inventory mix']
      };
    }
    
    if (lowerMessage.includes('efficiency') || lowerMessage.includes('collection time') || 
        lowerMessage.includes('pickup speed') || lowerMessage.includes('fastest')) {
      const efficiencyData = await getCollectionEfficiencyMetrics();
      
      const avgHours = efficiencyData?.efficiencyMetrics?.averageHoursToCollect ?? 0;
      const fastestCollection = efficiencyData?.efficiencyMetrics?.fastestCollection ?? 0;
      const slowestCollection = efficiencyData?.efficiencyMetrics?.slowestCollection ?? 0;
      const efficiencyScore = efficiencyData?.efficiencyMetrics?.efficiencyScore ?? 'N/A';
      
      let response = `⚡ Collection Efficiency Analysis\n\n`;
      // Removed * emphasis
      response += `* Average Time: ${avgHours.toFixed(1)} hours\n`;
      response += `* Fastest: ${fastestCollection.toFixed(1)} hours\n`;
      response += `* Slowest: ${slowestCollection.toFixed(1)} hours\n`;
      response += `* Efficiency Score: ${efficiencyScore}\n\n`;
      
      response += `Best Performing Donors:\n`;
      efficiencyData?.recommendations?.fastestDonors?.slice(0, 3).forEach((donor: any) => {
        response += `* ${donor.donorName || 'Unknown'}: ${donor.averageHours || 0} hours avg\n`;
      });
      
      return {
        response,
        data: efficiencyData,
        suggestions: ['View all donors', 'Analyze slow collections', 'Optimize pickup routes']
      };
    }

    if (lowerMessage.includes('coverage') || lowerMessage.includes('map') || 
        lowerMessage.includes('location') || lowerMessage.includes('geographic')) {
      const cityMatch = lowerMessage.match(/in\s+([a-zA-Z\s]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : undefined;
      
      const coverageData = await identifyCoverageGaps(city);
      
      const totalCities = coverageData?.totalCities ?? 0;
      const bestCovered = coverageData?.bestCoveredCities?.[0]?.city || 'N/A';
      const biggestGap = coverageData?.biggestGaps?.[0]?.city || 'N/A';
      
      let response = `🗺️ Geographic Coverage Analysis (Legacy)\n\n`;
      
      if (city) {
        // Removed * emphasis
        response += `* ${city} Coverage: ${coverageData?.analysis?.status || 'N/A'}\n`;
        response += `* Score: ${coverageData?.analysis?.overallScore?.toFixed(1) ?? 'N/A'}/100\n`;
        response += `* Rank: ${coverageData?.comparison?.rank || 'N/A'}/${coverageData?.comparison?.totalCities || 0}\n\n`;
        
        response += `Identified Gaps:\n`;
        coverageData?.analysis?.gaps?.slice(0, 3).forEach((gap: string) => {
          response += `* ${gap}\n`;
        });
      } else {
        response += `* Total Cities Covered: ${totalCities}\n`;
        response += `* Best Covered: ${bestCovered}\n`;
        response += `* Biggest Gap: ${biggestGap}\n\n`;
        
        response += `Priority Focus Areas:\n`;
        coverageData?.recommendations?.immediateFocus?.slice(0, 3).forEach((cityName: string) => {
          response += `* ${cityName}\n`;
        });
      }
      
      return {
        response,
        data: coverageData,
        suggestions: ['View geographic insights (AI)', 'View detailed map', 'Analyze specific city']
      };
    }

    // ===== ADMIN UTILITIES QUERIES =====
    if (lowerMessage.includes('pending') || lowerMessage.includes('moderation') || 
        lowerMessage.includes('queue') || lowerMessage.includes('awaiting')) {
      const pendingData = await getPendingItemsSummary();
      
      const totalPending = pendingData?.summary?.total ?? 0;
      const overdue = pendingData?.aging?.totalOverdue ?? 0;
      const minutes = pendingData?.estimatedTime?.minutes ?? 0;
      
      let response = `⏳ Moderation Queue Summary\n\n`;
      response += `* Total Pending: ${totalPending}\n`;
      response += `* Listings: ${pendingData?.summary?.listings ?? 0}\n`;
      response += `* Campaigns: ${pendingData?.summary?.campaigns ?? 0}\n`;
      response += `* Users: ${pendingData?.summary?.users ?? 0}\n`;
      response += `* Reports: ${pendingData?.summary?.reports ?? 0}\n\n`;
      
      response += `* Estimated Time: ${minutes} minutes\n`;
      response += `* Overdue (>7 days): ${overdue}`;
      
      return {
        response,
        data: pendingData,
        suggestions: ['Process listings', 'Review campaigns', 'Approve users', 'Handle reports']
      };
    }

    if (lowerMessage.includes('risk segmentation') || lowerMessage.includes('high risk') || 
        lowerMessage.includes('problem users') || lowerMessage.includes('user risk')) {
      const riskData = await getHighestRiskSegmentation();
      
      const highRisk = riskData?.segmentation?.byRiskLevel?.high ?? 0;
      const mediumRisk = riskData?.segmentation?.byRiskLevel?.medium ?? 0;
      const overallRiskScore = riskData?.overallRiskScore ?? 0;
      const biggestSource = riskData?.segmentation?.highRiskConcentration?.biggestSource ?? 'N/A';
      const donorsAtRisk = riskData?.segmentation?.highRiskConcentration?.donors ?? 0;
      const volunteersAtRisk = riskData?.segmentation?.highRiskConcentration?.volunteers ?? 0;

      let response = `⚠️ Risk Segmentation Analysis\n\n`;
      response += `* High Risk Users: ${highRisk}\n`;
      response += `* Medium Risk Users: ${mediumRisk}\n`;
      response += `* Overall Risk Score: ${overallRiskScore.toFixed(1)}/100\n\n`;
      
      response += `* Biggest Source of Risk: ${biggestSource}\n`;
      response += `* Donors at High Risk: ${donorsAtRisk}\n`;
      response += `* Volunteers at High Risk: ${volunteersAtRisk}`;
      
      return {
        response,
        data: riskData,
        suggestions: ['Review high-risk users', 'Take action on reports', 'Monitor medium-risk users']
      };
    }

    if ((lowerMessage.includes('compare') && (lowerMessage.includes('food') || lowerMessage.includes('campaign'))) ||
        lowerMessage.includes('vs') || lowerMessage.includes('versus')) {
      const comparisonData = await getFoodCampaignComparison();
      
      const overallWinner = comparisonData?.analysis?.overallWinner || 'N/A';
      const foodImpactScore = comparisonData?.comparison?.food?.impactScore ?? 0;
      const campaignsImpactScore = comparisonData?.comparison?.campaigns?.impactScore ?? 0;
      const foodStrengths = comparisonData?.analysis?.strengths?.food || 'N/A';
      const campaignsStrengths = comparisonData?.analysis?.strengths?.campaigns || 'N/A';
      const focusArea = comparisonData?.recommendations?.focusArea || 'N/A';
      
      let response = `🆚 Food Rescue vs Campaigns Comparison\n\n`;
      // Removed * emphasis
      response += `* Winner: ${overallWinner}\n`;
      response += `* Food Impact Score: ${foodImpactScore.toFixed(1)}/100\n`;
      response += `* Campaigns Impact Score: ${campaignsImpactScore.toFixed(1)}/100\n\n`;
      
      response += `* Food Strengths: ${foodStrengths}\n`;
      response += `* Campaigns Strengths: ${campaignsStrengths}\n\n`;
      
      response += `Recommendation: ${focusArea}`;
      
      return {
        response,
        data: comparisonData,
        suggestions: ['View detailed comparison', 'Optimize food rescue', 'Enhance campaigns', 'Create synergy']
      };
    }

    // Default response if no tool matches - FIXED PROMPT AND SUGGESTIONS
    // The final conversational fallback logic is in the main export function (adminAiChat).
    
    return {
      response: "🤖 Enhanced AI Assistant Ready\n\nI can now analyze your platform data in these areas:\n\n" +
               "* Core Metrics (Overview, Impact)\n" +
               "* Growth & Trends (Daily/Monthly Analysis)\n" +
               "* User Behavior (Ratings, Reports, Segmentation)\n" +
               "* Geographic Analysis (High Need, High Waste Areas)\n" +
               "* Logistics (Efficiency, Coverage, Food Preferences)\n" +
               "* Admin Queue (Pending Items, High-Risk Users)\n" +
               "* Performance Comparison (Food Rescue vs. Campaigns)\n\n" +
               "Try asking: 'Show me platform overview' or 'Show geographic insights'",
      suggestions: [
        'Show geographic insights',
        'Get platform overview',
        'Can I have the highest rating users?',
        'Analyze collection efficiency',
        'View pending items'
      ]
    };

  } catch (error) {
    logger.error('Error in executeToolsForQuery:', error);
    return {
      response: "I encountered an error while analyzing your request. Please try again or ask a different question.",
      suggestions: ['Try again', 'Get platform overview', 'Contact support']
    };
  }
}

// ============== FIXED generateAnalysisText FUNCTION with Trend Analysis ==============

function generateAnalysisText(coreData: any, growthData: any, efficiencyData: any, coverageData: any, trendData: { donationTrends: TrendDataPoint[]; campaignPerformance: TrendDataPoint[]; }): string {
  // Safely extract ALL necessary data points from the comprehensive data objects
  const foodSaved = coreData?.impactMetrics?.foodSavedKg || 0;
  const waterSavedLiters = coreData?.impactMetrics?.waterSavedLiters || 0;
  const co2ReducedKg = coreData?.impactMetrics?.co2PreventedKg || 0;
  const landfillSaved = coreData?.impactMetrics?.landfillSavedM3 || 0;
  
  const totalUsers = coreData?.userMetrics?.total || 0;
  const activeUsers = coreData?.userMetrics?.active || 0;
  const activeRate = totalUsers > 0 ? parseFloat(((activeUsers / totalUsers) * 100).toFixed(1)) : 0;
  const userRoleDistribution = coreData?.userMetrics?.roleDistribution || {};
  
  const totalListings = coreData?.foodListingMetrics?.total || 0;
  const foodCollectedKg = coreData?.foodListingMetrics?.collectedQuantityKg || 0;
  const utilizationRate = coreData?.foodListingMetrics?.utilizationRate || 0;
  const mostPopularCategories = coreData?.foodListingMetrics?.mostPopularCategories || [];
  
  const totalCampaigns = coreData?.campaignMetrics?.total || 0;
  const campaignFillRate = coreData?.campaignMetrics?.fillRate || 0;
  const registeredSpots = coreData?.campaignMetrics?.registeredSpots || 0;
  const totalSpots = coreData?.campaignMetrics?.totalSpots || 0;
  
  const avgUserRating = coreData?.performanceMetrics?.avgUserRating || 5;
  const reportsTotal = coreData?.performanceMetrics?.reportsTotal || 0;
  const topRatedUsers = coreData?.performanceMetrics?.topRatedUsers || [];
  const mostReportedUsers = coreData?.performanceMetrics?.mostReportedUsers || [];
  
  const userGrowth = growthData?.metrics?.users?.growth || 0;
  const foodGrowth = growthData?.metrics?.food?.growth || 0;
  const growthPeriod = growthData?.period || '30 days';
  
  const efficiencyScore = efficiencyData?.efficiencyMetrics?.efficiencyScore || 'N/A';
  const avgCollectionTime = efficiencyData?.efficiencyMetrics?.averageHoursToCollect || 'N/A';
  const fastestCollection = efficiencyData?.efficiencyMetrics?.fastestCollection || 'N/A';
  const slowestCollection = efficiencyData?.efficiencyMetrics?.slowestCollection || 'N/A';
  const fastestDonors = efficiencyData?.recommendations?.fastestDonors?.slice(0, 3).map((d: any) => d.donorName).join(', ') || 'None identified';
  
  const totalCities = coverageData?.totalCities || 0;

  // --- GEOGRAPHIC EXTRACTION FIX: PULL FROM NEW KEY INSIGHTS ---
  const newInsights = coverageData?.newKeyInsights;
  
  // Use the new, reliable lists directly for the report (HIGH EFFICIENCY, HIGH NEED, HIGH WASTE)
  const bestCovered = newInsights?.highEfficiencyCities?.join(', ') || 
                      coverageData?.bestCoveredCities?.slice(0, 3).map((c: any) => c.city).join(', ') || 
                      'No standout regions';
                      
  const gapCities = newInsights?.highNeedCities?.join(', ') || 
                    coverageData?.biggestGaps?.slice(0, 3).map((c: any) => c.city).join(', ') || 
                    'No major gaps identified';
                    
  const immediateFocus = newInsights?.highWasteCities?.join(', ') || 
                         coverageData?.recommendations?.immediateFocus?.slice(0, 3).join(', ') || 
                         'All regions stable';
  
  // --- TREND ANALYSIS (NEW SECTION) ---
  const donationTrends = trendData?.donationTrends || [];
  const campaignPerformance = trendData?.campaignPerformance || [];

  let donationTrendAnalysis = '';
  if (donationTrends.length > 1) {
      const lastMonth = donationTrends[donationTrends.length - 1];
      const prevMonth = donationTrends[donationTrends.length - 2];
      
      // FIX: Use nullish coalescing (?? 0) to handle potentially undefined values
      const lastFoodWeight = lastMonth.foodWeight ?? 0;
      const prevFoodWeight = prevMonth.foodWeight ?? 0;
      
      const foodChange = lastFoodWeight - prevFoodWeight;
      const foodTrend = foodChange > 0 ? 'increasing' : foodChange < 0 ? 'decreasing' : 'stable';
      
      donationTrendAnalysis = `Donation trends show a ${foodTrend} trajectory in food weight over the last two months, with ${lastFoodWeight.toFixed(0)} kg saved in ${lastMonth.month}. `;
      if (foodTrend === 'increasing') {
          donationTrendAnalysis += `This positive momentum suggests donor outreach efforts are successful.`;
      } else if (foodTrend === 'decreasing') {
          donationTrendAnalysis += `Further investigation into recent donor activity is recommended to reverse this decline.`;
      }
  } else {
      donationTrendAnalysis = `No sufficient time-series data is available to analyze donation trends.`;
  }
  
  let campaignTrendAnalysis = '';
  if (campaignPerformance.length > 1) {
      const lastMonth = campaignPerformance[campaignPerformance.length - 1];
      const prevMonth = campaignPerformance[campaignPerformance.length - 2];
      
      // FIX: Use nullish coalescing (?? 0) to handle potentially undefined values
      const lastAttendanceRate = lastMonth.attendanceRate ?? 0;
      const prevAttendanceRate = prevMonth.attendanceRate ?? 0;

      const attendanceChange = lastAttendanceRate - prevAttendanceRate;
      const attendanceTrend = attendanceChange > 0 ? 'improving' : attendanceChange < 0 ? 'declining' : 'stable';
      
      campaignTrendAnalysis = `Campaign performance shows an ${attendanceTrend} attendance rate, with the last recorded attendance at ${lastAttendanceRate.toFixed(1)}%. `;
      if (attendanceTrend === 'improving') {
          campaignTrendAnalysis += `This is a strong indicator of successful campaign execution and participant commitment.`;
      } else if (attendanceTrend === 'declining') {
          campaignTrendAnalysis += `Efforts should focus on reducing no-show rates and improving campaign promotion.`;
      }
  } else {
      campaignTrendAnalysis = `No sufficient time-series data is available to analyze campaign performance trends.`;
  }
  // --- END TREND ANALYSIS ---
  
  // Extract the primary Geo Action/Summary (the FIRST recommendation)
  const geoActionInsight = coreData?.analyticsOverview?.recommendations?.[0] || 'Problem/Summary: No immediate strategic problem identified. Primary Action: Conduct proactive market research in adjacent cities.';

  // Build dynamic analysis text
  let analysis = "";
  
  analysis += `# NourishNow Platform Impact Report\n\n`;
  
  // ============ EXECUTIVE SUMMARY ============
  analysis += `## Executive Summary\n\n`;
  analysis += `The NourishNow platform continues to demonstrate significant impact in food redistribution and waste reduction efforts. `;
  
  // Dynamic summary based on data
  if (userGrowth > 20) {
    analysis += `The platform is experiencing rapid growth with a ${userGrowth.toFixed(1)}% increase in users over the last ${growthPeriod}. `;
  } else if (userGrowth > 0) {
    analysis += `The platform shows steady growth with a ${userGrowth.toFixed(1)}% increase in users over the last ${growthPeriod}. `;
  } else {
    analysis += `The platform maintains stable operations with consistent user engagement. `;
  }
  
  analysis += `With ${activeUsers} active users (${activeRate}% engagement rate), the platform has successfully redirected ${foodSaved.toFixed(0)} kg of food from waste streams, `;
  
  if (utilizationRate > 80) {
    analysis += `demonstrating excellent utilization at ${utilizationRate.toFixed(1)}% collection efficiency. `;
  } else if (utilizationRate > 60) {
    analysis += `demonstrating solid utilization at ${utilizationRate.toFixed(1)}% collection efficiency. `;
  } else {
    analysis += `with collection efficiency at ${utilizationRate.toFixed(1)}%, indicating room for improvement. `;
  }
  
  analysis += `\n\n`;
  
  // ============ ENVIRONMENTAL IMPACT ============
  analysis += `## Environmental Impact\n\n`;
  analysis += `The platform's environmental contributions are substantial:\n`;
  analysis += `* Food Waste Prevented: ${foodSaved.toFixed(0)} kg (equivalent to ${Math.round(foodSaved / 1000)} metric tons)\n`;
  analysis += `* Water Conservation: ${waterSavedLiters.toLocaleString()} liters\n`;
  analysis += `* CO₂ Emissions Reduced: ${co2ReducedKg.toFixed(0)} kg\n`;
  analysis += `* Landfill Space Saved: ${landfillSaved.toFixed(3)} m³\n`;
  
  if (co2ReducedKg > 10000) {
    analysis += `* Environmental Equivalent: This CO₂ reduction is comparable to taking ${Math.round(co2ReducedKg / 4000)} cars off the road for a year.\n`;
  }
  
  analysis += `\n`;
  
  // ============ SOCIAL & ECONOMIC IMPACT ============
  analysis += `## Social & Economic Impact\n\n`;
  analysis += `* People Assisted: Approximately ${Math.round(Number(foodSaved) * 5).toLocaleString()} meals provided\n`;
  analysis += `* Economic Value Created: RM ${Math.round(Number(foodSaved) * 10).toLocaleString()} in food value redistributed\n`;
  analysis += `* Community Engagement: ${activeUsers} active participants across ${totalCities} cities\n`;
  analysis += `* Volunteer Impact: ${userRoleDistribution.volunteer || 0} volunteers organizing ${totalCampaigns} campaigns\n`;
  analysis += `* Food Collected: ${foodCollectedKg.toFixed(0)} kg of food successfully collected and redistributed\n`;
  
  analysis += `\n`;
  
  // ============ PLATFORM PERFORMANCE ============
  analysis += `## Platform Performance Metrics\n\n`;
  analysis += `### User Engagement\n`;
  analysis += `* Total Registered Users: ${totalUsers}\n`;
  analysis += `* Active Users: ${activeUsers} (${activeRate}% engagement rate)\n`;
  analysis += `* User Growth Rate: ${userGrowth >= 0 ? '+' : ''}${userGrowth.toFixed(1)}%\n`;
  analysis += `* Average User Rating: ${avgUserRating.toFixed(1)}/5\n`;
  
  analysis += `\n### Food Operations\n`;
  analysis += `* Food Listings: ${totalListings}\n`;
  analysis += `* Food Collected: ${foodCollectedKg.toFixed(0)} kg\n`;
  analysis += `* Utilization Rate: ${utilizationRate.toFixed(1)}%\n`;
  analysis += `* Food Saved Growth: ${foodGrowth >= 0 ? '+' : ''}${foodGrowth.toFixed(1)}%\n`;
  analysis += `* Most Popular Categories: ${mostPopularCategories.map(([cat, amt]: [string, number]) => `${cat} (${amt.toFixed(0)}kg)`).join(', ')}\n`;
  
  analysis += `\n### Campaign Performance\n`;
  analysis += `* Total Campaigns: ${totalCampaigns}\n`;
  analysis += `* Fill Rate: ${campaignFillRate.toFixed(1)}%\n`;
  analysis += `* Total Participants: ${registeredSpots}/${totalSpots}\n`;
  
  analysis += `\n### Donation Trend Analysis\n`;
  analysis += donationTrendAnalysis;
  
  analysis += `\n### Campaign Performance Trend\n`;
  analysis += campaignTrendAnalysis;
  
  analysis += `\n### Operational Efficiency\n`;
  analysis += `* Collection Efficiency Score: ${efficiencyScore}\n`;
  analysis += `* Average Collection Time: ${avgCollectionTime} hours\n`;
  analysis += `* Fastest Collection: ${fastestCollection} hours\n`;
  analysis += `* Slowest Collection: ${slowestCollection} hours\n`;
  
  analysis += `\n`;
  
  // ============ GEOGRAPHIC COVERAGE ============
  analysis += `## Geographic Coverage & Distribution\n\n`;
  
  // Insert the structured AI recommendation here (which the PDF Document will pull out)
  analysis += `${geoActionInsight}\n\n`; 
  
  analysis += `### Current Geographic Status\n`;
  analysis += `* Cities Covered: ${totalCities}\n`;
  analysis += `* Best Covered Cities: ${bestCovered}\n`; // HIGH EFFICIENCY
  analysis += `* Areas Needing Attention: ${gapCities}\n`; // HIGH NEED
  analysis += `* Immediate Focus Areas: ${immediateFocus}\n`; // HIGH WASTE
  
  analysis += `\n`;
  
  // ============ USER PERFORMANCE HIGHLIGHTS ============
  analysis += `## User Performance Highlights\n\n`;
  if (topRatedUsers.length > 0) {
    analysis += `### Top Rated Users\n`;
    topRatedUsers.slice(0, 3).forEach((user: any) => {
      analysis += `* ${user.name} (${user.role}): ${user.avgRating}/5 rating\n`;
    });
    analysis += `\n`;
  }
  
  if (fastestDonors !== 'None identified') {
    analysis += `### Most Efficient Donors\n`;
    analysis += `* ${fastestDonors}\n`;
    analysis += `\n`;
  }
  
  // ============ RISK & QUALITY METRICS ============
  analysis += `## Risk & Quality Metrics\n\n`;
  analysis += `* Total Reports Filed: ${reportsTotal}\n`;
  if (mostReportedUsers.length > 0) {
    analysis += `* Users Requiring Attention: ${mostReportedUsers.length}\n`;
  }
  analysis += `* Community Health Index: ${(avgUserRating * 20).toFixed(0)}/100\n`;
  
  analysis += `\n`;
  
  // ============ STRATEGIC RECOMMENDATIONS (Non-Geo) ============
  analysis += `## General Platform Recommendations\n\n`;
  
  let recommendationCount = 1;
  
  // Dynamic recommendations based on data
  if (utilizationRate < 70) {
    analysis += `${recommendationCount++}. Improve Collection Efficiency: Current utilization rate of ${utilizationRate.toFixed(1)}% is below the 70% target. Focus on:\n`;
    analysis += `   * Better donor-receiver matching\n`;
    analysis += `   * Optimized collection scheduling\n`;
    analysis += `   * Recognizing efficient donors like ${fastestDonors.split(',')[0] || 'top performers'}\n\n`;
  }
  
  if (activeRate < 50) {
    analysis += `${recommendationCount++}. Boost User Engagement: Only ${activeRate}% of users are active. Consider:\n`;
    analysis += `   * Re-engagement campaigns for inactive users\n`;
    analysis += `   * Loyalty programs for frequent donors/receivers\n`;
    analysis += `   * Improved notification systems\n\n`;
  }
  
  if (campaignFillRate < 70) {
    analysis += `${recommendationCount++}. Enhance Campaign Participation: Fill rate of ${campaignFillRate.toFixed(1)}% indicates room for growth:\n`;
    analysis += `   * Better campaign marketing\n`;
    analysis += `   * More diverse campaign types\n`;
    analysis += `   * Volunteer incentive programs\n\n`;
  }
  
  if (gapCities !== 'No major gaps identified' && recommendationCount <= 3) {
    analysis += `${recommendationCount++}. Address Geographic Gaps (Legacy): Focus expansion efforts on ${gapCities}:\n`;
    analysis += `   * Targeted marketing in these regions\n`;
    analysis += `   * Partner with local organizations\n`;
    analysis += `   * Recruit local ambassadors\n\n`;
  }
  
  if (recommendationCount === 1) {
    analysis += `1. Continue Current Success: Platform performance is strong across metrics\n`;
    analysis += `2. Scale Operations: Consider expanding to ${totalCities + 3} cities\n`;
    analysis += `3. Enhance Features: Develop new tools for donors and receivers\n`;
  }
  
  analysis += `\n`;
  
  // ============ CONCLUSION ============
  analysis += `## Conclusion\n\n`;
  
  if (userGrowth > 10 && utilizationRate > 70) {
    analysis += `The platform is performing exceptionally well with strong growth (${userGrowth.toFixed(1)}%) and high efficiency (${utilizationRate.toFixed(1)}%). `;
    analysis += `Continued focus on geographic expansion and user engagement will drive further impact.\n`;
  } else if (userGrowth > 5 || utilizationRate > 60) {
    analysis += `The platform shows solid performance with positive trends in key metrics. `;
    analysis += `Addressing the specific recommendations above will help achieve even greater impact.\n`;
  } else {
    analysis += `The platform provides valuable community service with room for optimization. `;
    analysis += `Focusing on the strategic recommendations will enhance efficiency and growth.\n`;
  }
  
  analysis += `\nReport generated by NourishNow AI Assistant on ${new Date().toLocaleDateString('en-MY', { 
    year: 'numeric', 
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
  
  return analysis;
}

// ============== MAIN CALLABLE FUNCTION ==============
export const adminAiChat = onCall(
  {
    secrets: ["APP_GEMINI_KEY"],
    memory: "4GiB",
    timeoutSeconds: 540, // Increased to 9 minutes for report generation
  },
  async (request) => {
    try {
      // Authentication check
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }
      
      const { userMessage, history = [] } = request.data as { userMessage: string; history: any[] };

      if (!userMessage) {
        throw new HttpsError("invalid-argument", "Message is required.");
      }

      // Initialize AI
      const apiKey = process.env.APP_GEMINI_KEY;
      if (!apiKey) {
        throw new HttpsError("internal", "AI service configuration error");
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });

      const lowerMessage = userMessage.toLowerCase();
      
      // Check for report request (now using new Core Metrics for foundation)
      if (lowerMessage.includes('impact report') || lowerMessage.includes('generate report') || lowerMessage.includes('pdf report')) {
        
        // Initialize with default values
        let efficiencyData = { efficiencyMetrics: { efficiencyScore: 'N/A', averageHoursToCollect: 'N/A' } };
        let coverageData = { totalCities: 0 };
        let trendData: { donationTrends: TrendDataPoint[]; campaignPerformance: TrendDataPoint[]; } = { donationTrends: [], campaignPerformance: [] }; // NEW initialization
        
        // Use sequential execution with optimized data fetching
        const coreData = await getCoreOperationalMetrics();
        const growthData = await getGrowthMetrics(30);
        
        // Only fetch additional data if needed (lazy loading)
        // Also fetch trend data for the PDF graphs
        try {
          efficiencyData = await getCollectionEfficiencyMetrics();
          coverageData = await identifyCoverageGaps();
          trendData = await getTrendTimeSeriesData(); // NEW CALL
        } catch (error) {
          logger.error('Error fetching secondary data:', error);
          // Use default values if fetch fails
        }

        // Safely extract data
        const userGrowth = growthData?.metrics?.users?.growth ?? 0;
        const totalUsers = coreData?.userMetrics?.total ?? 0;
        const activeUsers = coreData?.userMetrics?.active ?? 0;
        const foodSaved = coreData?.impactMetrics?.foodSavedKg?.toFixed(0) ?? 0;
        const efficiencyScore = efficiencyData?.efficiencyMetrics?.efficiencyScore ?? 'N/A';
        const totalCities = coverageData?.totalCities ?? 0;

        // Create report data - PASSING MINIMAL DATA AND THE CORE DATA OBJECT
        const reportData: any = { // Use 'any' here as the final ReportData type is constructed in PDFService
          title: "Comprehensive Platform Impact Report",
          period: new Date().toLocaleDateString('en-MY', { 
            year: 'numeric', 
            month: 'long',
            day: 'numeric'
          }),
          // Pass coreData directly for pdfService.ts to use
          coreData: coreData, 
          // Pass trend data directly for pdfService.ts to use
          donationTrends: trendData.donationTrends, 
          campaignPerformance: trendData.campaignPerformance,
          
          // Pass the comprehensive analysis text
          analysis: generateAnalysisText(coreData, growthData, efficiencyData, coverageData, trendData), 
          
          // Placeholder values (pdfService handles defaults and mappings from coreData)
          utilizationRate: coreData?.foodListingMetrics?.utilizationRate?.toString() || 'N/A',
          totalRegistrations: coreData?.campaignMetrics?.registeredSpots || 0,
          
          // Legacy/derived values (set to 0/N/A, pdfService will correct them from coreData)
          foodSavedKg: 0,
          waterSavedKL: 0,
          co2ReducedTons: 0,
          peopleHelped: 0,
          economicValue: 'RM 0',
          activeDonors: 0,
          completedCampaigns: 0,
          
          // Optional/other data used in PDF component
          noShowRate: 'N/A',
          avgParticipantsPerCampaign: coreData?.campaignMetrics?.totalSpots > 0 
            ? Math.round(coreData.campaignMetrics.registeredSpots / coreData.campaignMetrics.total)
            : 'N/A',
          totalReservations: 0,
          topDonorsCount: coreData?.foodListingMetrics?.topDonorSources?.length || 0,
          superVolunteersCount: 0,
          foodCategories: coreData?.foodListingMetrics?.mostPopularCategories?.reduce((acc: any, [category, amount]: [string, number]) => {
            acc[category] = amount;
            return acc;
          }, {}) || {}
        };

        // Removed * emphasis
        return { 
          response: `📊 Platform Impact Report Generated\n\n` +
                  `I've compiled comprehensive data:\n\n` +
                  `* Total Users: ${totalUsers} (${activeUsers} active)\n` +
                  `* Growth Analysis: ${userGrowth >= 0 ? '+' : ''}${userGrowth.toFixed(1)}%\n` +
                  `* Food Impact: ${foodSaved} kg saved\n` +
                  `* Collection Efficiency: ${efficiencyScore}\n` +
                  `* Geographic Coverage: ${totalCities} cities\n\n` +
                  `Ready to download the detailed report?`,
          report: reportData,
          suggestions: ['Download PDF report', 'View executive summary', 'Share with stakeholders']
        };
      }

      // Use enhanced tools to handle specific data queries
      const toolResponse = await executeToolsForQuery(userMessage);
      
      // If tools found a match, return their response
      if (toolResponse.response.includes('📊') || toolResponse.response.includes('🏆') || toolResponse.response.includes('⚠️') || toolResponse.response.includes('🚨') || toolResponse.response.includes('🎯') || toolResponse.response.includes('🥦') || toolResponse.response.includes('⚡') || toolResponse.response.includes('🗺️') || toolResponse.response.includes('⏳') || toolResponse.response.includes('🆚')) {
        return {
          response: toolResponse.response,
          data: toolResponse.data,
          suggestions: toolResponse.suggestions
        };
      }

      // For more complex/conversational queries, use AI with context from tools
      const [coreData, growthData, analyticsDoc] = await Promise.all([
        getCoreOperationalMetrics(),
        getGrowthMetrics(30),
        db.collection('analytics').doc('current').get() // Fetch analytics doc for trend context
      ]);

      // Safe access
      const coreDataSafe = coreData && typeof coreData === 'object' ? coreData : {};
      const growthDataSafe = growthData && typeof growthData === 'object' ? growthData : {};
      const analyticsData = analyticsDoc.data();

      const userGrowth = growthDataSafe?.metrics?.users?.growth ?? 0;
      const totalUsers = coreDataSafe?.userMetrics?.total ?? 0;
      const activeUsers = coreDataSafe?.userMetrics?.active ?? 0;
      const foodSaved = coreDataSafe?.impactMetrics?.foodSavedKg?.toFixed(0) ?? 0;
      
      // Inject knowledge from analytics trends/summary into the prompt
      const trendSummary = analyticsData?.insights?.summary || 'No recent operational summary found.';
      const detailedTrends = analyticsData?.insights?.trends || [];
      const trendContext = detailedTrends.map((t: string) => ` - ${t}`).join('\n') || 'No specific trend data available.';

      const updatedHistory = [
        ...history,
        {
          role: 'user',
          parts: `Platform context: ${totalUsers} total users (${activeUsers} active), ${userGrowth}% recent growth, ${foodSaved}kg food saved. User question: ${userMessage}`
        }
      ];
      const conversationContext = updatedHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts}`)
        .join('\n\n');

      const prompt = `You are FoodAI, an intelligent, analytical, and friendly assistant for a food redistribution platform. 
      Your primary goal is to provide insight and analysis, not just raw numbers. 
      Be concise, use emojis when appropriate, and always infer context (e.g., if asked for a top item, analyze the data and present the top item without prompting the user for more detail).
      STRICT RULE: DO NOT USE BOLD TEXT, HASHMARKS (#), OR DOUBLE ASTERISKS (**). Use single asterisks (*) ONLY for bullet points. Do not use asterisks or underscores for emphasis/italic.

      Current Platform Context:
      - Total Users: ${totalUsers} (${activeUsers} active)
      - Recent User Growth: ${userGrowth}% over last 30 days
      - Food Saved: ${foodSaved} kg redistributed
      - Active Engagement: ${((activeUsers / totalUsers) * 100).toFixed(1)}% of users are active
      - Food Impact: Equivalent to ${Math.floor(Number(foodSaved) / 2.5)} car emissions prevented

      Platform Operational Knowledge (Analyze and reference this for knowledge-based queries):
      Overall Health Summary: ${trendSummary}
      Current Key Trends: 
      ${trendContext}

      Conversation History:
      ${conversationContext}

      Assistant:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // FIXED: Markdown cleanup (Goal 3) - Keeping only bullet points
      let cleanResponseText = responseText;
      // 1. Remove all bolding/emphasis markers (including * emphasis)
      cleanResponseText = cleanResponseText.replace(/\*\*(.*?)\*\*/g, '$1'); 
      cleanResponseText = cleanResponseText.replace(/__(.*?)__/g, '$1');    
      cleanResponseText = cleanResponseText.replace(/([^\n])\*(.*?)\*/g, '$1$2'); // Remove inline *emphasis*
      cleanResponseText = cleanResponseText.replace(/_([^_]*)_/g, '$1'); // Remove inline _emphasis_
      
      // 2. Remove leading/trailing quotes often added by AI
      cleanResponseText = cleanResponseText.replace(/^"|"$/g, ''); 
      cleanResponseText = cleanResponseText.trim();

      return {
        response: cleanResponseText,
        suggestions: ['Show geographic insights', 'Get platform overview', 'Compare food vs campaigns']
      };

    } catch (error: any) {
      logger.error('Admin AI Chat Function Failed:', error);
      
      if (error.code === 'unauthenticated') {
        throw new HttpsError("unauthenticated", "Authentication required");
      }
      
      throw new HttpsError("internal", `AI service error: ${error.message}`);
    }
  }
);