// functions/src/adminFolder/admin-reports.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Interface matches the callable function's input type
interface UpdateReportStatusData {
  reportId: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedBy?: string;
}

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

/**
 * Callable Cloud Function for administrators to update a report's status and add notes.
 * This is the secure, atomic single point of write that triggers the notification system.
 */
export const adminUpdateReportStatus = functions.https.onCall<
  UpdateReportStatusData
>(async (request): Promise<{success: boolean; message: string}> => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }

  const isAdmin = await verifyAdmin(auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin privileges required");
  }

  const {reportId, status, adminNotes, resolvedBy} = data;
  
  if (!reportId || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Report ID and status are required");
  }

  try {
    const reportRef = admin.firestore().collection("reports").doc(reportId);
    
    // Base update data
    const updateData: Record<string, unknown> = {
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add admin notes if provided
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    // Set resolution fields if the report is finalized
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.resolvedBy = resolvedBy || auth.uid; // Use explicit resolvedBy if provided, otherwise use current admin UID
    } else {
      // Ensure resolved fields are not set for non-final statuses
      updateData.resolvedAt = admin.firestore.FieldValue.delete();
    }

    await reportRef.update(updateData);

    return {success: true, message: `Report ${reportId} status updated to ${status}`};
  } catch (error) {
    console.error("Error in adminUpdateReportStatus:", error);
    throw new functions.https.HttpsError("internal", "Report update failed");
  }
});