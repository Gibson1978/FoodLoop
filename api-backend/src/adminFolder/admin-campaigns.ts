// api-backed/admin-campaigns.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendDualNotification } from '../NotificationFolder/notificationUtils';

// Interfaces (you can export these if needed elsewhere, but not necessary)
interface DeleteCampaignData {
  campaignId: string;
}

interface ApproveCampaignData {
  campaignId: string;
}

interface RejectCampaignData {
  campaignId: string;
  reason?: string;
}

interface UpdateCampaignStatusData {
  campaignId: string;
  status: "ongoing" | "completed" | "cancelled";
}

const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const pathMatch = pathname.match(/\/o\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
    if (url.includes("Campaign_Images")) {
      const directMatch = url.match(/Campaign_Images%2F([^?]+)/);
      if (directMatch && directMatch[1]) {
        return `Campaign_Images/${decodeURIComponent(directMatch[1])}`;
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

// Delete campaign (admin only)
export const adminDeleteCampaign = functions.https.onCall<
DeleteCampaignData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }
  const {campaignId} = data;
  if (!campaignId) {
    throw new functions.https.HttpsError("invalid-argument", "Campaign ID required");
  }
  try {
    const campaignDoc = await admin.firestore()
      .collection("campaigns").doc(campaignId).get();
    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Campaign not found");
    }
    const campaignData = campaignDoc.data();

    // Delete campaign images from storage
    if (campaignData?.images && Array.isArray(campaignData.images)) {
      const bucket = admin.storage().bucket();
      const deletePromises = campaignData.images.map(async (imageUrl: string) => {
        try {
          const filePath = extractFilePathFromUrl(imageUrl);
          if (filePath) {
            await bucket.file(filePath).delete();
          }
        } catch (error) {
          console.error(`Failed to delete campaign image: ${imageUrl}`, error);
        }
      });
      await Promise.all(deletePromises);
    }

    // Delete campaign registrations
    const registrationsSnapshot = await admin.firestore()
      .collection("campaignRegistrations")
      .where("campaignId", "==", campaignId)
      .get();

    const registrationDeletes = registrationsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(registrationDeletes);

    // Delete campaign reviews
    const reviewsSnapshot = await admin.firestore()
      .collection("campaignReviews")
      .where("campaignId", "==", campaignId)
      .get();

    const reviewDeletes = reviewsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(reviewDeletes);

    // Finally delete the campaign
    await admin.firestore().collection("campaigns").doc(campaignId).delete();

    return {success: true, message: "Campaign deleted successfully"};
  } catch (error) {
    console.error("Error in adminDeleteCampaign:", error);
    throw new functions.https.HttpsError("internal", "Delete failed");
  }
});

// Approve campaign (admin only)
export const adminApproveCampaign = functions.https.onCall<
ApproveCampaignData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }

  const {campaignId} = data;
  try {
    const campaignRef = admin.firestore().collection("campaigns").doc(campaignId);
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Campaign not found");
    }
    
    const campaignData = campaignDoc.data();
    const organizerId = campaignData?.organizerId;
    const campaignTitle = campaignData?.title || "Campaign";

    await campaignRef.update({
      status: "approved", 
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // SEND NOTIFICATION (FCM + Firestore Doc)
    if (organizerId) {
        await sendDualNotification({
            recipientId: organizerId,
            relatedEntityId: campaignId,
            relatedEntityType: 'campaigns',
            title: "Campaign Approved! 🎉",
            message: `Your campaign, "${campaignTitle}", has been approved and is now open for registration.`,
            notificationType: 'campaign_status',
            fullDetails: `Status changed to Approved by Admin ${auth.uid}.`
        });
    }
    // -------------------------

    return {success: true, message: "Campaign approved and set to approved"};
  } catch (error) {
    console.error("Error in adminApproveCampaign:", error);
    throw new functions.https.HttpsError("internal", "Approve failed");
  }
});

// Reject campaign (admin only)
export const adminRejectCampaign = functions.https.onCall<
RejectCampaignData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }

  const {campaignId, reason} = data;
  try {
    const campaignRef = admin.firestore().collection("campaigns").doc(campaignId);
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Campaign not found");
    }

    const campaignData = campaignDoc.data();
    const organizerId = campaignData?.organizerId;
    const campaignTitle = campaignData?.title || "Campaign";
    const rejectionReason = reason || "Rejected by admin";

    await campaignRef.update({
      status: "cancelled", // Using cancelled for rejection
      rejectionReason: rejectionReason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // SEND NOTIFICATION (FCM + Firestore Doc)
    if (organizerId) {
        await sendDualNotification({
            recipientId: organizerId,
            relatedEntityId: campaignId,
            relatedEntityType: 'campaigns',
            title: "Campaign Rejected ❌",
            message: `Your campaign, "${campaignTitle}", was rejected by the administration.`,
            notificationType: 'campaign_status',
            fullDetails: `Reason: ${rejectionReason}`
        });
    }
    // -------------------------

    return {success: true, message: "Campaign rejected"};
  } catch (error) {
    console.error("Error in adminRejectCampaign:", error);
    throw new functions.https.HttpsError("internal", "Reject failed");
  }
});

// Update campaign status (admin only)
export const adminUpdateCampaignStatus = functions.https.onCall<
UpdateCampaignStatusData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin required");
  }
  const {campaignId, status} = data;
  if (!campaignId || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Campaign ID and status required");
  }
  if (!["ongoing", "completed", "cancelled"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status");
  }
  try {
    const campaignDoc = await admin.firestore()
      .collection("campaigns").doc(campaignId).get();
    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Campaign not found");
    }

    // Use a simple object without custom types
    const updateData: Record<string, unknown> = {
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // If marking as completed, we can add additional logic here if needed
    if (status === "completed") {
      const dataWithCompleted = updateData as Record<string, unknown>;
      dataWithCompleted.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await admin.firestore().collection("campaigns").doc(campaignId).update(updateData);

    return {success: true, message: `Campaign status updated to ${status}`};
  } catch (error) {
    console.error("Error in adminUpdateCampaignStatus:", error);
    throw new functions.https.HttpsError("internal", "Status update failed");
  }
});

export const adminOrUserCancelCampaign = functions.https.onCall<
RejectCampaignData // Reuse interface
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const {campaignId, reason: cancellationReason} = data;
  try {
    const campaignRef = admin.firestore().collection("campaigns").doc(campaignId);
    
    // 1. Get data and verify ownership/admin
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Campaign not found");
    }

    const campaignData = campaignDoc.data();
    const organizerId = campaignData?.organizerId;
    const isOrganizer = auth.uid === organizerId;
    const isAdmin = await verifyAdmin(auth.uid);

    if (!isOrganizer && !isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Only the organizer or admin can cancel this campaign.");
    }
    
    const campaignTitle = campaignData?.title || "Campaign";
    const reasonText = cancellationReason || (isOrganizer ? "Cancelled by organizer" : `Cancelled by Admin ${auth.uid}`);

    // 2. Update status
    await campaignRef.update({
      status: "cancelled",
      cancellationReason: reasonText,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. CLEANUP: Find and cancel active campaign registrations
    const registrationsSnapshot = await admin.firestore()
        .collection('campaignRegistrations')
        .where('campaignId', '==', campaignId)
        .where('status', 'in', ['registered', 'pending']) // Active registrations
        .get();

    const cleanupPromises = registrationsSnapshot.docs.map(doc => 
        doc.ref.update({
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
    );
    await Promise.all(cleanupPromises);
    console.log(`✅ Cancelled ${registrationsSnapshot.size} active registrations for campaign ${campaignId}`);


    // 4. SEND NOTIFICATION (Organizer/Admin to Organizer, and separate trigger for registrants)
    if (isOrganizer && !isAdmin) {
        // Organizer doesn't need a dual notification, just a success message.
        // The transactionNotification listener handles registrant notifications.
    } else if (isAdmin) {
        await sendDualNotification({
            recipientId: organizerId,
            relatedEntityId: campaignId,
            relatedEntityType: 'campaigns',
            title: "Campaign Cancelled ❌",
            message: `Your active campaign, "${campaignTitle}", was cancelled by the administration.`,
            notificationType: 'campaign_status',
            fullDetails: `Reason: ${reasonText}`
        });
    }

    return {success: true, message: "Campaign cancelled and registrations cleaned up."};
  } catch (error) {
    console.error("Error in adminOrUserCancelCampaign:", error);
    throw new functions.https.HttpsError("internal", "Cancellation failed");
  }
});