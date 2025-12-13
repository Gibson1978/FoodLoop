// functions/src/admin-user.ts (Modified Server File)

import * as functions from "firebase-functions/v2"; // Use V2 imports
import { HttpsError } from "firebase-functions/v2/https"; // Use V2 HttpsError
import * as admin from "firebase-admin";

// Initialize Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();


// --- Helper to verify admin status (V2 compatible) ---
const verifyAdmin = async (auth: functions.https.CallableRequest["auth"]) => {
  // 1. Check if user is authenticated
  if (!auth?.uid) {
    throw new HttpsError( // Use V2 HttpsError
      "unauthenticated",
      "User must be authenticated"
    );
  }
  
  const callerDoc = await db.collection("users").doc(auth.uid).get();
  const callerData = callerDoc.data();

  // 2. Check for admin role
  if (!callerData || callerData.role !== "admin" || !callerData.isAdmin) {
    throw new HttpsError( // Use V2 HttpsError
      "permission-denied",
      "Admin privileges required"
    );
  }
};


// 1. APPROVE USER REGISTRATION
export const approveUserRegistration = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string }>) => {
    await verifyAdmin(request.auth);
    const { userId } = request.data;

    try {
      await db.collection("users").doc(userId).set({
        status: 'approved',
        verification: { verified: true },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`User ${userId} approved by admin.`);
      return { success: true, message: "User approved successfully." };
    } catch (error) {
      console.error("Error approving user:", error);
      throw new HttpsError("internal", "Failed to approve user.");
    }
  }
);

// 2. REJECT USER REGISTRATION (Moves to rejectedUsers collection)
export const rejectUserRegistration = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string, reason?: string }>) => {
    await verifyAdmin(request.auth);
    const { userId, reason } = request.data;

    const userRef = db.collection("users").doc(userId);
    const rejectedRef = db.collection("rejectedUsers").doc(userId);

    return db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found.");
      }
      
      // 1. Move data to rejectedUsers collection
      transaction.set(rejectedRef, {
        ...userDoc.data(),
        rejectionReason: reason || 'Registration rejected by admin',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectedBy: request.auth?.uid,
      });

      // 2. Delete from users collection
      transaction.delete(userRef);

      console.log(`User ${userId} rejected and moved by admin.`);
      return { success: true, message: "User rejected successfully." };
    });
  }
);


// 3. RESTORE REJECTED USER (Moves back to users collection as pending)
export const restoreRejectedUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string }>) => {
    await verifyAdmin(request.auth);
    const { userId } = request.data;

    const userRef = db.collection("users").doc(userId);
    const rejectedRef = db.collection("rejectedUsers").doc(userId);

    return db.runTransaction(async (transaction) => {
      const rejectedDoc = await transaction.get(rejectedRef);
      if (!rejectedDoc.exists) {
        throw new HttpsError("not-found", "Rejected user not found.");
      }

      const userData = rejectedDoc.data();
      if (!userData) {
          throw new HttpsError("internal", "Rejected user data is empty.");
      }
      
      const { rejectionReason, rejectedAt, rejectedBy, ...userDataToRestore } = userData;

      // 2. Restore to users collection with PENDING status
      transaction.set(userRef, {
        ...userDataToRestore,
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Delete from rejectedUsers collection
      transaction.delete(rejectedRef);

      console.log(`User ${userId} restored to pending by admin.`);
      return { success: true, message: "User restored successfully." };
    });
  }
);


// 4. SUSPEND USER ACCOUNT (Sets status to 'rejected')
export const suspendUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string }>) => {
    await verifyAdmin(request.auth);
    const { userId } = request.data;

    try {
      await db.collection("users").doc(userId).set({
        status: 'suspended', 
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`User ${userId} suspended by admin.`);
      return { success: true, message: "User suspended successfully." };
    } catch (error) {
      console.error("Error suspending user:", error);
      throw new HttpsError("internal", "Failed to suspend user.");
    }
  }
);


// 5. ACTIVATE USER ACCOUNT (Sets status to 'approved')
export const activateUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string }>) => {
    await verifyAdmin(request.auth);
    const { userId } = request.data;

    try {
      await db.collection("users").doc(userId).set({
        status: 'approved',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`User ${userId} activated by admin.`);
      return { success: true, message: "User activated successfully." };
    } catch (error) {
      console.error("Error activating user:", error);
      throw new HttpsError("internal", "Failed to activate user.");
    }
  }
);

// 6. DELETE USER ACCOUNT (Renamed to match client-side call)
export const deleteUserAccount = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string }>) => {
    // 1. Verify the caller is an admin
    await verifyAdmin(request.auth);
    
    const {userId} = request.data;
    // ... (rest of the deleteUserAccount logic remains the same, using db) ...
    if (!userId) {
      throw new HttpsError(
        "invalid-argument",
        "User ID is required"
      );
    }

    try {
      console.log(`Admin ${request.auth!.uid} is deleting user ${userId}`);

      // 1. Delete user from Authentication
      await admin.auth().deleteUser(userId);
      console.log(`User ${userId} deleted from Authentication`);

      // 2. Delete user data from Firestore (users collection)
      await db.collection("users").doc(userId).delete();
      console.log(`User ${userId} data deleted from Firestore`);

      // 3. Delete from rejectedUsers collection if exists
      try {
        const rejectedDoc = await db.collection("rejectedUsers").doc(userId).get();
        if (rejectedDoc.exists) {
          await db.collection("rejectedUsers").doc(userId).delete();
          console.log(`User ${userId} data deleted from rejectedUsers`);
        }
      } catch (rejectedError) {
        console.log(`No rejected user data found for ${userId}`);
      }

      // 4. Delete user's verification documents from Storage
      const bucket = admin.storage().bucket();
      const [files] = await bucket.getFiles({
        prefix: `Authentication_Folder/${userId}/`,
      });

      const deletePromises = files.map((file) => file.delete());
      await Promise.all(deletePromises);
      console.log(`Deleted ${files.length} verification files for user ${userId}`);

      return {
        success: true,
        message: `User ${userId} and all associated data deleted successfully`,
      };
    } catch (error: unknown) {
      console.error("Error deleting user:", error);

      const errorMessage = error instanceof Error ? error.message :
        "Unknown error occurred";

      throw new HttpsError(
        "internal",
        `Failed to delete user: ${errorMessage}`
      );
    }
  }
);