import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface DeleteUserRequest {
  userId: string;
}

export const deleteUserAccount = functions.https.onCall(
  async (request: functions.https.CallableRequest<DeleteUserRequest>) => {
    // Verify the caller is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {userId} = request.data;

    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID is required"
      );
    }

    try {
      // Verify the caller is an admin
      const callerDoc = await admin.firestore().collection("users")
        .doc(request.auth.uid).get();
      const callerData = callerDoc.data();

      if (!callerData || callerData.role !== "admin" || !callerData.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required"
        );
      }

      console.log(`Admin ${request.auth.uid} is deleting user ${userId}`);

      // 1. Delete user from Authentication
      await admin.auth().deleteUser(userId);
      console.log(`User ${userId} deleted from Authentication`);

      // 2. Delete user data from Firestore (users collection)
      await admin.firestore().collection("users").doc(userId).delete();
      console.log(`User ${userId} data deleted from Firestore`);

      // 3. Also check and delete from rejectedUsers collection if exists
      try {
        const rejectedDoc = await admin.firestore().collection("rejectedUsers")
          .doc(userId).get();
        if (rejectedDoc.exists) {
          await admin.firestore().collection("rejectedUsers").doc(userId)
            .delete();
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

      // Delete all user's verification files
      const deletePromises = files.map((file) => file.delete());
      await Promise.all(deletePromises);
      console.log(
        `Deleted ${files.length} verification files for user ${userId}`
      );

      return {
        success: true,
        message: `User ${userId} and all associated data deleted successfully`,
      };
    } catch (error: unknown) {
      console.error("Error deleting user:", error);

      // More specific error messages
      if (error instanceof Error && "code" in error) {
        const errorWithCode = error as {code: string; message: string};

        if (errorWithCode.code === "auth/user-not-found") {
          throw new functions.https.HttpsError(
            "not-found",
            "User not found in authentication system"
          );
        }

        if (errorWithCode.code === "storage/object-not-found") {
          // Continue even if storage files aren't found
          console.log("No storage files found to delete");
        }
      }

      const errorMessage = error instanceof Error ? error.message :
        "Unknown error occurred";

      throw new functions.https.HttpsError(
        "internal",
        `Failed to delete user: ${errorMessage}`
      );
    }
  }
);
