// functions/src/notificationUtils.ts

import * as admin from 'firebase-admin'

if (!admin.apps.length) {
    admin.initializeApp();
}

// --- Interface for internal payload consistency ---
export interface NotificationPayload {
  recipientId: string;
  relatedEntityId: string; 
  relatedEntityType: 'foodListings' | 'campaigns' | 'reports' | 'users';
  title: string;
  message: string;
  notificationType: 'risk_suspension' | 'risk_warning' | 'listing_status' | 'campaign_status' | 'reservation' | 'cancellation' | 'report_response' | 'registration_status' | 'admin_alert' | 'user_status';
  fullDetails?: string; 
}

/**
 * Sends a push notification directly to a list of tokens. Used for bulk actions 
 * like listing cancellations (Case 4) where the tokens are already known/collected.
 * @param registrationTokens Array of FCM tokens to target.
 * @param title The notification title.
 * @param message The notification body.
 * @param data Additional data payload for deep linking.
 */
export const sendFCMToTokens = async (
    registrationTokens: string[], 
    title: string, 
    message: string, 
    data: Record<string, string>
): Promise<void> => {
    if (registrationTokens.length === 0) {
        console.log("No registration tokens provided. Skipping FCM send.");
        return;
    }

    // Construct the notification payload
    const fcmPayload: admin.messaging.MulticastMessage = {
        tokens: registrationTokens,
        notification: {
            title: title,
            body: message,
        },
        data: {
            ...data,
            messageBody: message,
            title: title
        },
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
    };

    try {
        const messaging = admin.messaging();
        // Uses the recommended sendEachForMulticast method (fix for the TypeScript error)
        const response = await messaging.sendEachForMulticast(fcmPayload); 
        console.log(`✅ FCM sent: Successes=${response.successCount}, Failures=${response.failureCount}`);

        // OPTIONAL: Logic to clean up invalid tokens should be implemented here.
        
    } catch (error) {
        console.error("❌ Error sending push notification via sendEachForMulticast:", error);
    }
}

/**
 * Performs the dual action (Firestore Doc + FCM Push) for a single user.
 * This is the core function for direct user communication (Admin -> User status updates).
 * @param payload The structured data for the notification.
 */
export const sendDualNotification = async (payload: NotificationPayload): Promise<void> => {
    const { recipientId, relatedEntityId, relatedEntityType, title, message, notificationType, fullDetails } = payload;
    // Safety check for required fields
    if (!recipientId || !relatedEntityId || !relatedEntityType) {
        console.error("Missing critical ID/Type for dual notification payload. Aborting.");
        return;
    }
    
    // --- 1. WRITE PERSISTENT FIRESTORE DOCUMENT (Notification History) ---
    try {
        await admin.firestore().collection('userNotifications').add({
            userId: recipientId,
            title: title,
            message: message,
            type: notificationType,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            relatedEntityId: relatedEntityId,
            relatedEntityType: relatedEntityType,
            fullDetails: fullDetails || null,
        });
        console.log(`✅ Notification document written for user: ${recipientId}`);
    } catch (error) {
        console.error("❌ Error writing notification document:", error);
    }

    // --- 2. SEND PUSH NOTIFICATION (FCM) ---

    // Get the recipient's document to find their FCM tokens
    const userDoc = await admin.firestore().collection('users').doc(recipientId).get();
    const userData = userDoc.data();

    if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
        console.log(`User ${recipientId} has no FCM tokens registered. Skipping push notification.`);
        return;
    }

    const registrationTokens: string[] = userData.fcmTokens;
    await sendFCMToTokens(registrationTokens, title, message, {
        notificationType,
        relatedEntityId,
        relatedEntityType
    });
};