// functions/src/admin-food.ts - FIXED LINE LENGTHS
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendDualNotification } from '../NotificationFolder/notificationUtils';

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
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }

  const {listingId} = data;
  try {
    const listingRef = admin.firestore().collection("foodListings").doc(listingId);
    
    // 1. Get data
    const listingDoc = await listingRef.get();
    if (!listingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listingData = listingDoc.data();
    const donorId = listingData?.donorId;
    const foodTitle = listingData?.title || "Food Listing";

    // 2. Update status
    await listingRef.update({
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. SEND NOTIFICATION (FCM + Firestore Doc)
    if (donorId) {
        await sendDualNotification({
            recipientId: donorId,
            relatedEntityId: listingId,
            relatedEntityType: 'foodListings',
            title: "Listing Approved! ✅",
            message: `Your food listing, "${foodTitle}", has been approved and is now active.`,
            notificationType: 'listing_status',
            fullDetails: `Status changed to Approved by Admin ${auth.uid}.`
        });
    }
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
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }

  const {listingId, reason} = data;
  try {
    const listingRef = admin.firestore().collection("foodListings").doc(listingId);
    
    // 1. Get data
    const listingDoc = await listingRef.get();
    if (!listingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listingData = listingDoc.data();
    const donorId = listingData?.donorId;
    const foodTitle = listingData?.title || "Food Listing";
    const rejectionReason = reason || "Rejected by admin";

    // 2. Update status
    await listingRef.update({
      status: "cancelled", // <-- CORRECT: Updated to "cancelled"
      rejectionReason: rejectionReason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. SEND NOTIFICATION (FCM + Firestore Doc)
    if (donorId) {
        await sendDualNotification({
            recipientId: donorId,
            relatedEntityId: listingId,
            relatedEntityType: 'foodListings',
            title: "Food Listing Rejected ❌", // <-- CHANGED: Notification title
            message: `Your listing, "${foodTitle}", was rejected by the administration.`, // <-- CHANGED: Notification message
            notificationType: 'listing_status',
            fullDetails: `Reason: ${rejectionReason}`
        });
    }
    // ----------------------------

    return {success: true, message: "Listing rejected"}; // Note: Returning a success message with the original client-facing term "rejected" is often fine, but the internal status is "cancelled"
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

export const adminOrUserCancelFoodListing = functions.https.onCall<
RejectFoodListingData 
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const {listingId, reason: cancellationReason} = data;
  try {
    const listingRef = admin.firestore().collection("foodListings").doc(listingId);
    
    // 1. Get data and verify ownership/admin
    const listingDoc = await listingRef.get();
    if (!listingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listingData = listingDoc.data();
    const donorId = listingData?.donorId;
    const isDonor = auth.uid === donorId;
    const isAdmin = await verifyAdmin(auth.uid);

    if (!isDonor && !isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Only the donor or admin can cancel this listing.");
    }
    
    const foodTitle = listingData?.title || "Food Listing";
    const reasonText = cancellationReason || (isDonor ? "Cancelled by donor" : `Cancelled by Admin ${auth.uid}`);

    // 2. Update status
    await listingRef.update({
      status: "cancelled",
      cancellationReason: reasonText,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. CLEANUP: Find and cancel active food reservations
    const reservationsSnapshot = await admin.firestore()
        .collection('foodReservations')
        .where('foodListingId', '==', listingId)
        .where('status', 'in', ['confirmed', 'pending']) // Active reservations
        .get();

    const cleanupPromises = reservationsSnapshot.docs.map(doc => 
        doc.ref.update({
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
    );
    await Promise.all(cleanupPromises);
    console.log(`✅ Cancelled ${reservationsSnapshot.size} active reservations for listing ${listingId}`);


    // 4. SEND NOTIFICATION (Donor/Admin to Donor, and separate trigger for receivers)
    if (isDonor && !isAdmin) {
        // Donor doesn't need a dual notification, just a success message.
        // The transactionNotification listener handles receiver notifications.
    } else if (isAdmin) {
        await sendDualNotification({
            recipientId: donorId,
            relatedEntityId: listingId,
            relatedEntityType: 'foodListings',
            title: "Listing Cancelled ❌",
            message: `Your active listing, "${foodTitle}", was cancelled by the administration.`,
            notificationType: 'listing_status',
            fullDetails: `Reason: ${reasonText}`
        });
    }

    return {success: true, message: "Listing cancelled and reservations cleaned up."};
  } catch (error) {
    console.error("Error in adminOrUserCancelFoodListing:", error);
    throw new functions.https.HttpsError("internal", "Cancellation failed");
  }
});