// functions/src/generateTestData.ts
import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { 
  generateUsers, 
  generateFoodListingsWithRetry, 
  generateCampaignsWithRetry,
  generateReservationsAndRatings,
  generateReports
} from "./testDataHelpers";

const db = admin.firestore();

export const generateTestData = onCall(
  {
    enforceAppCheck: false,
    consumeAppCheckToken: false,
    cors: true,
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (request) => {
    if (request.rawRequest.method === 'OPTIONS') {
      return {
        success: true,
        message: 'CORS preflight successful'
      };
    }

    try {
      logger.info("generateTestData function called", { 
        auth: request.auth ? true : false,
        uid: request.auth?.uid 
      });

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      // Check if user is admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (!userData || (userData.role !== 'admin' && !userData.email?.includes('admin'))) {
        throw new HttpsError("permission-denied", "Only administrators can generate test data");
      }

      const data = request.data;
      const {
        usersCount = 50,
        foodListingsCount = 200,
        campaignsCount = 50,
        pastMonths = 6,
        futureDays = 30,
      } = data;

      logger.info("Starting test data generation", {
        usersCount,
        foodListingsCount,
        campaignsCount,
        pastMonths,
        futureDays
      });

      const results = {
        users: [] as string[],
        foodListings: [] as string[],
        campaigns: [] as string[],
        reservations: [] as string[],
        registrations: [] as string[],
        ratings: [] as string[],
        reports: [] as string[],
      };

      // Generate users - now with single source of truth
      const users = await generateUsers(usersCount);
      results.users = users.map((u) => u.uid);
      logger.info(`Generated ${users.length} users with test passwords in users collection`);

      // Generate food listings with retry logic
      const foodListings = await generateFoodListingsWithRetry(
        foodListingsCount, users, pastMonths, futureDays
      );
      results.foodListings = foodListings;
      logger.info(`Generated ${foodListings.length} food listings`);

      // Generate campaigns with retry logic
      const campaigns = await generateCampaignsWithRetry(
        campaignsCount, users, pastMonths, futureDays
      );
      results.campaigns = campaigns;
      logger.info(`Generated ${campaigns.length} campaigns`);

      // Generate reservations and ratings
      const reservationsData = await generateReservationsAndRatings(
        users, foodListings, campaigns
      );
      results.reservations = reservationsData.reservations;
      results.registrations = reservationsData.registrations;
      results.ratings = reservationsData.ratings;
      
      logger.info(
        `Generated ${reservationsData.reservations.length} reservations, ` +
        `${reservationsData.registrations.length} registrations, ` +
        `${reservationsData.ratings.length} ratings`
      );

      // Generate reports
      const reports = await generateReports(users, foodListings, campaigns);
      results.reports = reports;
      logger.info(`Generated ${reports.length} reports`);

      return {
        success: true,
        message: `Generated test data: ${users.length} users, ` +
                 `${foodListings.length} food listings, ${campaigns.length} campaigns, ` +
                 `${reservationsData.reservations.length} reservations, ` +
                 `${reservationsData.registrations.length} registrations, ` +
                 `${reservationsData.ratings.length} ratings, ${reports.length} reports\n` +
                 `Test passwords are stored in the users collection as 'testPassword' field.`,
        results,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error generating test data:", error);
      throw new HttpsError("internal", `Failed to generate test data: ${errorMessage}`);
    }
  }
);