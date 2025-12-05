import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { 
  generateUsers, 
  generateFoodListingsOptimized,
  generateCampaignsOptimized,
  generateReservationsAndRatings,
  generateReports,
  UserData
} from "./testDataHelpers";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 1. GENERATE DATA FUNCTION
export const generateTestData = onCall(
  {
    enforceAppCheck: false,
    consumeAppCheckToken: false,
    cors: true,
    timeoutSeconds: 540,
    memory: "2GiB",
  },
  async (request) => {
    // Handle CORS preflight
    if (request.rawRequest.method === 'OPTIONS') {
      return { success: true, message: 'CORS preflight successful' };
    }

    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      // Check Admin Permissions
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      if (!userData || (userData.role !== 'admin' && !userData.email?.includes('admin'))) {
        throw new HttpsError("permission-denied", "Only administrators can generate test data");
      }

      // FIXED: Adjusted parameters for 6-month timeline
      const {
        usersCount = 50,           
        foodListingsCount = 100,   
        campaignsCount = 50,       
        pastMonths = 6,            
        futureDays = 30,           // Changed from 3 to 30 for more future items
        phase = 'all', 
      } = request.data;

      logger.info(`Starting generation. Phase: ${phase}. Config:`, request.data);

      const results = {
        users: [] as string[],
        foodListings: [] as string[],
        campaigns: [] as string[],
        reservations: [] as string[],
        registrations: [] as string[],
        ratings: [] as string[],
        reports: [] as string[],
      };

      let users: any[] = [];

      // ==========================================
      // PHASE 1: User Handling (Creation OR Fetching)
      // ==========================================
      
      if ((phase === 'all' || phase === 'users') && usersCount > 0) {
        logger.info(`PHASE 1: Generating ${usersCount} NEW users`);
        users = await generateUsersInBatches(usersCount, 20);
        results.users = users.map((u) => u.uid);
        
        // Log user distribution
        const donors = users.filter(u => u.role === 'donor');
        const volunteers = users.filter(u => u.role === 'volunteer');
        const receivers = users.filter(u => u.role === 'receiver');
        
        logger.info(`User distribution: ${donors.length} donors, ${volunteers.length} volunteers, ${receivers.length} receivers`);
      }

      // B. Fetch EXISTING Users if needed
      const phaseRequiresUsers = phase === 'listings' || phase === 'campaigns' || phase === 'relationships';
      
      if (users.length === 0 && phaseRequiresUsers) {
        logger.info("Check: No new users generated. Fetching existing test users...");
        
        const usersSnapshot = await db.collection('users')
          .where('isTestData', '==', true)
          .limit(500) 
          .get();
        
        if (usersSnapshot.empty) {
           throw new HttpsError("failed-precondition", 
             "No test users found. Please run Phase 1 (Users) first.");
        }

        users = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        
        logger.info(`Loaded ${users.length} existing users`);
      }

      // ==========================================
      // PHASE 2: Generate Food Listings
      // ==========================================
      if ((phase === 'all' || phase === 'listings') && foodListingsCount > 0) {
        logger.info(`PHASE 2: Generating ${foodListingsCount} listings`);

        const donors = users.filter(u => u.role === 'donor' && u.status === 'approved');
        if (donors.length === 0) {
           throw new HttpsError("failed-precondition", 
            `Found ${users.length} users but 0 approved donors. Cannot generate food listings.`);
        }
        
        const foodListings = await generateFoodListingsInBatches(
          foodListingsCount, users, pastMonths, futureDays, 50
        );
        results.foodListings = foodListings;
        
        if (foodListings.length > 0) {
          const statusCounts = await getFoodListingStatusCounts(foodListings);
          logger.info(`Food listing status distribution: ${JSON.stringify(statusCounts)}`);
        }
      }

      // ==========================================
      // PHASE 3: Generate Campaigns
      // ==========================================
      if ((phase === 'all' || phase === 'campaigns') && campaignsCount > 0) {
        logger.info(`PHASE 3: Generating ${campaignsCount} campaigns`);
        
        const volunteers = users.filter(u => u.role === 'volunteer' && u.status === 'approved');
        if (volunteers.length === 0) {
           throw new HttpsError("failed-precondition", 
             `Found ${users.length} users but 0 approved volunteers. Cannot generate campaigns.`);
        }
        
        const campaigns = await generateCampaignsInBatches(
          campaignsCount, users, pastMonths, futureDays, 25
        );
        results.campaigns = campaigns;
        
        if (campaigns.length > 0) {
          const statusCounts = await getCampaignStatusCounts(campaigns);
          logger.info(`Campaign status distribution: ${JSON.stringify(statusCounts)}`);
        }
      }

      // ==========================================
      // PHASE 4: Generate SMART Relationships
      // ==========================================
      if (phase === 'relationships') {
        logger.info("PHASE 4: Generating SMART relationships");
        
        // Use the UPDATED smart relationship generator
        const relationshipResults = await generateReservationsAndRatings(
          users, 
          results.foodListings.length > 0 ? results.foodListings : undefined,
          results.campaigns.length > 0 ? results.campaigns : undefined
        );
        
        results.reservations = relationshipResults.reservations;
        results.registrations = relationshipResults.registrations;
        results.ratings = relationshipResults.ratings;
        
        // Generate limited reports
        const reports = await generateReports(
          users, 
          results.foodListings.slice(0, 20),
          results.campaigns.slice(0, 10)
        );
        results.reports = reports;
        
        logger.info(`Generated ${results.reservations.length} reservations, ${results.registrations.length} registrations, ${results.ratings.length} ratings, ${results.reports.length} reports`);
      }

      // And update the return message to reflect that relationships weren't generated:
      return {
        success: true,
        message: `Phase ${phase} completed: ${results.users.length} Users, ${results.foodListings.length} Listings, ${results.campaigns.length} Campaigns`,
        results,
        phase
      };
      
    } catch (error: any) {
      logger.error(`Error in phase ${request.data?.phase || 'all'}:`, error);
      throw new HttpsError("internal", `Failed to generate test data: ${error.message}`);
    }
  }
);


// --- Helper Functions (Keep these) ---
async function generateUsersInBatches(totalCount: number, batchSize: number) {
  const allUsers = [];
  const batches = Math.ceil(totalCount / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(batchSize, totalCount - (i * batchSize));
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 2500));
    const batchUsers = await generateUsers(currentBatchSize);
    allUsers.push(...batchUsers);
  }
  return allUsers;
}

async function generateFoodListingsInBatches(totalCount: number, users: any[], pastMonths: number, futureDays: number, batchSize: number) {
  const allListings = [];
  const batches = Math.ceil(totalCount / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(batchSize, totalCount - (i * batchSize));
    const batchListings = await generateFoodListingsOptimized(currentBatchSize, users, pastMonths, futureDays);
    allListings.push(...batchListings);
    if (i < batches - 1) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return allListings;
}

async function generateCampaignsInBatches(totalCount: number, users: any[], pastMonths: number, futureDays: number, batchSize: number) {
  const allCampaigns = [];
  const batches = Math.ceil(totalCount / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(batchSize, totalCount - (i * batchSize));
    const batchCampaigns = await generateCampaignsOptimized(currentBatchSize, users, pastMonths, futureDays);
    allCampaigns.push(...batchCampaigns);
    if (i < batches - 1) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return allCampaigns;
}

async function getFoodListingStatusCounts(listingIds: string[]) {
  if (listingIds.length === 0) return { approved: 0, pending: 0, completed: 0, cancelled: 0 };
  
  const counts = { approved: 0, pending: 0, completed: 0, cancelled: 0 };
  const sampleSize = Math.min(50, listingIds.length);
  const sampleIds = listingIds.slice(0, sampleSize);
  
  for (const id of sampleIds) {
    const doc = await db.collection('foodListings').doc(id).get();
    if (doc.exists) {
      const status = doc.data()?.status;
      if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status as keyof typeof counts]++;
      }
    }
  }
  
  const multiplier = listingIds.length / sampleSize;
  return {
    approved: Math.round(counts.approved * multiplier),
    pending: Math.round(counts.pending * multiplier),
    completed: Math.round(counts.completed * multiplier),
    cancelled: Math.round(counts.cancelled * multiplier)
  };
}

async function getCampaignStatusCounts(campaignIds: string[]) {
  if (campaignIds.length === 0) return { approved: 0, pending: 0, completed: 0, cancelled: 0 };
  
  const counts = { approved: 0, pending: 0, completed: 0, cancelled: 0 };
  const sampleSize = Math.min(30, campaignIds.length);
  const sampleIds = campaignIds.slice(0, sampleSize);
  
  for (const id of sampleIds) {
    const doc = await db.collection('campaigns').doc(id).get();
    if (doc.exists) {
      const status = doc.data()?.status;
      if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status as keyof typeof counts]++;
      }
    }
  }
  
  const multiplier = campaignIds.length / sampleSize;
  return {
    approved: Math.round(counts.approved * multiplier),
    pending: Math.round(counts.pending * multiplier),
    completed: Math.round(counts.completed * multiplier),
    cancelled: Math.round(counts.cancelled * multiplier)
  };
}

export const generateRelationshipsOnly = onCall(
  {
    enforceAppCheck: false,
    consumeAppCheckToken: false,
    cors: true,
    timeoutSeconds: 540,
    memory: "2GiB",
  },
  async (request) => {
    if (request.rawRequest.method === 'OPTIONS') {
      return { success: true, message: 'CORS preflight successful' };
    }

    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      // Check Admin Permissions
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      if (!userData || (userData.role !== 'admin' && !userData.email?.includes('admin'))) {
        throw new HttpsError("permission-denied", "Only administrators can generate relationships");
      }

      logger.info("Starting smart relationship generation...");

      // Get all test users
      const usersSnapshot = await db.collection('users')
        .where('isTestData', '==', true)
        .limit(500)
        .get();
      
      if (usersSnapshot.empty) {
        throw new HttpsError("failed-precondition", 
          "No test users found. Please generate users first.");
      }

      const users: UserData[] = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        email: doc.data().email || '',
        role: doc.data().role || 'receiver',
        profile: {
          name: doc.data().profile?.name || '',
          orgName: doc.data().profile?.orgName || '',
          orgType: doc.data().profile?.orgType || '',
          contactPerson: doc.data().profile?.contactPerson || '',
          phone: doc.data().profile?.phone || '',
          address: doc.data().profile?.address || {
            street: '',
            city: '',
            postalCode: '',
            state: '',
            latitude: 0,
            longitude: 0
          }
        },
        status: doc.data().status || 'pending',
        verification: {
          documentUrl: doc.data().verification?.documentUrl || '',
          verified: doc.data().verification?.verified || false,
          documentUploaded: doc.data().verification?.documentUploaded || false,
          uploadedAt: doc.data().verification?.uploadedAt?.toDate() || new Date()
        },
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        isTestData: doc.data().isTestData || false,
        dietaryRestrictions: doc.data().dietaryRestrictions || [],
        familySize: doc.data().familySize || 1
      }));

      // Use the UPDATED smart generator
      const results = await generateReservationsAndRatings(users);

      return {
        success: true,
        message: `Smart relationships generated: ${results.reservations.length} reservations, ${results.registrations.length} registrations, ${results.ratings.length} ratings`,
        results
      };
      
    } catch (error: any) {
      logger.error(`Error in smart relationship generation:`, error);
      throw new HttpsError("internal", `Failed to generate relationships: ${error.message}`);
    }
  }
);