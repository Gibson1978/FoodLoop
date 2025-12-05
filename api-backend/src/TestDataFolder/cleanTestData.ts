// functions/src/cleanTestData.ts
import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { 
  cleanTestDataFromFirestore, 
  cleanTestDataFromAuth, 
} from "./testDataHelpers";

export const cleanTestData = onCall(
  {
    enforceAppCheck: false,
    consumeAppCheckToken: false,
    cors: true,
    timeoutSeconds: 300,
  },
  async (request) => {
    try {
      logger.info("cleanTestData function called", { 
        auth: request.auth ? true : false,
        uid: request.auth?.uid 
      });

      // Handle CORS preflight
      if (request.rawRequest.method === 'OPTIONS') {
        return {
          success: true,
          message: 'CORS preflight successful'
        };
      }

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      // Check if user is admin
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (!userData || (userData.role !== 'admin' && !userData.email?.includes('admin'))) {
        throw new HttpsError("permission-denied", "Only administrators can clean test data");
      }

      logger.info("Starting test data cleanup process");
      
      // Clean Firestore data
      const firestoreDeleted = await cleanTestDataFromFirestore();
      logger.info(`Deleted ${firestoreDeleted} Firestore documents`);
      
      // Clean Auth users
      await cleanTestDataFromAuth();


      logger.info("Test data cleanup completed successfully");

      return {
        success: true,
        message: `Successfully cleaned test data: ${firestoreDeleted} documents removed`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error in cleanTestData:", error);
      throw new HttpsError("internal", `Failed to clean test data: ${errorMessage}`);
    }
  }
);