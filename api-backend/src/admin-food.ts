// functions/src/admin-food.ts - FIXED LINE LENGTHS
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface DeleteFoodListingData {
  listingId: string;
}

interface ApproveFoodListingData {
  listingId: string;
}

interface RejectFoodListingData {
  listingId: string;
  reason?: string;
}

interface MarkListingCompletedData {
  listingId: string;
}

const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const pathMatch = pathname.match(/\/o\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
    if (url.includes("Food_Images")) {
      const directMatch = url.match(/Food_Images%2F([^?]+)/);
      if (directMatch && directMatch[1]) {
        return `Food_Images/${decodeURIComponent(directMatch[1])}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error extracting file path:", error);
    return null;
  }
};

const verifyAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === "admin" || userData?.isAdmin === true;
  } catch (error) {
    console.error("Error verifying admin:", error);
    return false;
  }
};

export const adminDeleteFoodListing = functions.https.onCall<
DeleteFoodListingData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }
  const {listingId} = data;
  if (!listingId) {
    throw new functions.https.HttpsError("invalid-argument", "ID required");
  }
  try {
    const listingDoc = await admin.firestore()
      .collection("foodListings").doc(listingId).get();
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listingData = listingDoc.data();
    if (listingData?.images && Array.isArray(listingData.images)) {
      const bucket = admin.storage().bucket();
      const deletePromises = listingData.images.map(async (imageUrl: string) => {
        try {
          const filePath = extractFilePathFromUrl(imageUrl);
          if (filePath) {
            await bucket.file(filePath).delete();
          }
        } catch (error) {
          console.error(`Failed to delete image: ${imageUrl}`, error);
        }
      });
      await Promise.all(deletePromises);
    }
    await admin.firestore().collection("foodListings").doc(listingId).delete();
    return {success: true, message: "Listing deleted successfully"};
  } catch (error) {
    console.error("Error in adminDeleteFoodListing:", error);
    throw new functions.https.HttpsError("internal", "Delete failed");
  }
});

export const adminApproveFoodListing = functions.https.onCall<
ApproveFoodListingData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }
  const {listingId} = data;
  try {
    await admin.firestore().collection("foodListings").doc(listingId).update({
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {success: true, message: "Listing approved"};
  } catch (error) {
    console.error("Error in adminApproveFoodListing:", error);
    throw new functions.https.HttpsError("internal", "Approve failed");
  }
});

export const adminRejectFoodListing = functions.https.onCall<
RejectFoodListingData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }
  const {listingId, reason} = data;
  try {
    await admin.firestore().collection("foodListings").doc(listingId).update({
      status: "rejected",
      rejectionReason: reason || "Rejected by admin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {success: true, message: "Listing rejected"};
  } catch (error) {
    console.error("Error in adminRejectFoodListing:", error);
    throw new functions.https.HttpsError("internal", "Reject failed");
  }
});

export const adminMarkListingCompleted = functions.https.onCall<
MarkListingCompletedData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }
  const {listingId} = data;
  try {
    await admin.firestore().collection("foodListings").doc(listingId).update({
      status: "completed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {success: true, message: "Listing completed"};
  } catch (error) {
    console.error("Error in adminMarkListingCompleted:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Complete operation failed"
    );
  }
});
