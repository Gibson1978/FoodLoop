// functions/src/transactionNotifications.ts (NEW FILE - Cases 3 & 4)

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { sendDualNotification, sendFCMToTokens } from './notificationUtils';

if (!admin.apps.length) {
    admin.initializeApp();
}

// --- Helper to get the related listing/campaign owner (Donor/Organizer) ---
const getOwnerIdAndTitle = async (entityType: 'foodListings' | 'campaigns', entityId: string) => {
    const docRef = admin.firestore().collection(entityType).doc(entityId);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;

    const data = doc.data();
    const ownerId = entityType === 'foodListings' ? data?.donorId : data?.organizerId;
    const title = data?.title;

    return { ownerId, title };
};

// --- CASE 1: FOOD LISTING APPROVED (NOTIFY DONOR) -----------------------------
export const onFoodListingApproved = onDocumentUpdated('foodListings/{listingId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return null;

    // Trigger only if status changes to 'approved'
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
        const listingId = event.params.listingId;
        const donorId = afterData.donorId;
        const foodTitle = afterData.title || "Food Listing";
        
        if (donorId) {
            await sendDualNotification({
                recipientId: donorId,
                relatedEntityId: listingId,
                relatedEntityType: 'foodListings',
                title: "Listing Approved! 🎉",
                message: `Your food listing "${foodTitle}" has been approved and is now live.`,
                notificationType: 'listing_status', // Case 1 trigger
                fullDetails: `View your listing on the map!`
            });
        }
    }
    return null;
});

// --------------------------------------------------------------------------------------
// --- CASE 2: CAMPAIGN APPROVED (NOTIFY VOLUNTEER/ORGANIZER) ---------------------------
// --------------------------------------------------------------------------------------

export const onCampaignApproved = onDocumentUpdated('campaigns/{campaignId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return null;

    // Trigger only if status changes from anything other than 'approved' to 'approved'
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
        const campaignId = event.params.campaignId;
        const organizerId = afterData.organizerId; // The Volunteer's UID
        const campaignTitle = afterData.title || "Volunteer Campaign";
        
        if (organizerId) {
            await sendDualNotification({
                recipientId: organizerId,
                relatedEntityId: campaignId,
                relatedEntityType: 'campaigns',
                title: "Campaign Approved! 🎉",
                message: `Your campaign "${campaignTitle}" has been approved and is now active for registration.`,
                notificationType: 'campaign_status', // This is the deep link type
                fullDetails: `The campaign is now visible to receivers and ready for volunteers to join.`
            });
        }
    }
    return null;
});

// --------------------------------------------------------------------------------------
// --- CASE 3: RESERVATIONS / REGISTRATIONS (NOTIFY OWNER) ------------------------------
// --------------------------------------------------------------------------------------

// 3a) Food Reservation Made
export const onFoodReservationMade = onDocumentCreated('foodReservations/{reservationId}', async (event) => {
    const reservation = event.data?.data();
    if (!reservation) return null;

    // We only notify on a confirmed reservation (not if an old one is reused/updated, though we listen for onCreate)
    if (reservation.status !== 'confirmed') return null;

    const { foodListingId, userId: receiverId, userName: receiverName, quantity } = reservation;
    const { ownerId: donorId, title: foodTitle } = await getOwnerIdAndTitle('foodListings', foodListingId) || {};

    if (donorId && foodTitle) {
        await sendDualNotification({
            recipientId: donorId,
            relatedEntityId: foodListingId,
            relatedEntityType: 'foodListings',
            title: "New Reservation Made! 📦",
            message: `${receiverName} reserved ${quantity} units of your listing: "${foodTitle}".`,
            notificationType: 'reservation',
            fullDetails: `Reserved by user ${receiverId}. Please arrange pickup time.`
        });
    }

    // Optional: Notify the user who made the reservation (receiver)
    await sendDualNotification({
        recipientId: receiverId,
        relatedEntityId: foodListingId,
        relatedEntityType: 'foodListings',
        title: "Reservation Confirmed ✅",
        message: `Your reservation for "${foodTitle}" has been confirmed.`,
        notificationType: 'reservation',
        fullDetails: `You reserved ${quantity} units. Please coordinate pickup with the donor.`
    });

    return null;
});


// 3b) Campaign Registered
export const onCampaignRegistered = onDocumentCreated('campaignRegistrations/{registrationId}', async (event) => {
    const registration = event.data?.data();
    if (!registration) return null;

    // We only notify on a confirmed registration
    if (registration.status !== 'registered') return null;

    const { campaignId, userId: registrantId, userName: registrantName } = registration;
    const { ownerId: organizerId, title: campaignTitle } = await getOwnerIdAndTitle('campaigns', campaignId) || {};

    if (organizerId && campaignTitle) {
        await sendDualNotification({
            recipientId: organizerId,
            relatedEntityId: campaignId,
            relatedEntityType: 'campaigns',
            title: "New Registration! 📝",
            message: `${registrantName} registered for your campaign: "${campaignTitle}".`,
            notificationType: 'reservation',
            fullDetails: `Registered by user ${registrantId}.`
        });
    }
    
    // Optional: Notify the user who registered (registrant)
     await sendDualNotification({
        recipientId: registrantId,
        relatedEntityId: campaignId,
        relatedEntityType: 'campaigns',
        title: "Registration Confirmed ✅",
        message: `Your registration for "${campaignTitle}" is confirmed.`,
        notificationType: 'reservation',
        fullDetails: `See campaign details for time and location.`
    });

    return null;
});


// --------------------------------------------------------------------------------------
// --- CASE 4: CANCELLATIONS (NOTIFY RECEIVERS/REGISTRANTS) -----------------------------
// --------------------------------------------------------------------------------------

// 4a) Food Listing Cancelled (User or Admin action changes status to 'cancelled')
export const onFoodListingCancelled = onDocumentUpdated('foodListings/{listingId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return null;

    // Trigger only if status changes to 'cancelled'
    if (beforeData.status !== 'cancelled' && afterData.status === 'cancelled') {
        const listingId = event.params.listingId;
        const foodTitle = afterData.title || "Food Listing";
        const cancellationReason = afterData.cancellationReason || "The donor cancelled the listing.";

        // 1. Find all active receivers for this listing
        const reservationsSnapshot = await admin.firestore()
            .collection('foodReservations')
            .where('foodListingId', '==', listingId)
            .where('status', 'in', ['confirmed', 'pending']) // Only active reservations
            .get();

        const receiverUids = new Set<string>();
        const tokensToNotify: string[] = [];
        
        // 2. Collect UIDs of receivers
        reservationsSnapshot.docs.forEach(doc => receiverUids.add(doc.data().userId));
        
        if (receiverUids.size > 0) {
            // 3. Look up all tokens in a single batch read for efficiency
            const userPromises = Array.from(receiverUids).map(uid => 
                admin.firestore().collection('users').doc(uid).get()
            );
            const userDocs = await Promise.all(userPromises);

            userDocs.forEach(userDoc => {
                const userData = userDoc.data();
                if (userData?.fcmTokens && userData.fcmTokens.length > 0) {
                    tokensToNotify.push(...userData.fcmTokens);
                }
            });

            // 4. Write a persistent notification record for each receiver (dual notification method)
            const notificationPromises = Array.from(receiverUids).map(uid => 
                admin.firestore().collection('userNotifications').add({
                    userId: uid,
                    title: "Reservation Cancelled 💔",
                    // UPDATED MESSAGE with apology
                    message: `We apologize! The listing for "${foodTitle}" has been cancelled. Your reservation is no longer active.`,
                    type: 'cancellation',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    read: false,
                    relatedEntityId: listingId,
                    relatedEntityType: 'foodListings',
                    fullDetails: `Reason: ${cancellationReason}. The reserved quantity is now returned to inventory.`
                })
            );
            await Promise.all(notificationPromises);

            // 5. Send bulk FCM push notification
            await sendFCMToTokens(tokensToNotify, 
                "Reservation Cancelled 💔",
                // UPDATED MESSAGE with apology
                `We apologize! The listing for "${foodTitle}" has been cancelled. Tap for details.`,
                { notificationType: 'cancellation', relatedEntityId: listingId, relatedEntityType: 'foodListings' }
            );
        }

        return null;
    }

    return null;
});


// 4b) Campaign Cancelled (User or Admin action changes status to 'cancelled')
export const onCampaignCancelled = onDocumentUpdated('campaigns/{campaignId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return null;

    // Trigger only if status changes to 'cancelled'
    if (beforeData.status !== 'cancelled' && afterData.status === 'cancelled') {
        const campaignId = event.params.campaignId;
        const campaignTitle = afterData.title || "Campaign";
        const cancellationReason = afterData.cancellationReason || "The organizer cancelled the campaign.";

        // 1. Find all active registrations for this campaign
        const registrationsSnapshot = await admin.firestore()
            .collection('campaignRegistrations')
            .where('campaignId', '==', campaignId)
            .where('status', 'in', ['registered', 'pending']) // Only active registrations
            .get();

        const registrantUids = new Set<string>();
        const tokensToNotify: string[] = [];
        
        // 2. Collect UIDs of registrants
        registrationsSnapshot.docs.forEach(doc => registrantUids.add(doc.data().userId));
        
        if (registrantUids.size > 0) {
            // 3. Look up all tokens in a single batch read
            const userPromises = Array.from(registrantUids).map(uid => 
                admin.firestore().collection('users').doc(uid).get()
            );
            const userDocs = await Promise.all(userPromises);

            userDocs.forEach(userDoc => {
                const userData = userDoc.data();
                if (userData?.fcmTokens && userData.fcmTokens.length > 0) {
                    tokensToNotify.push(...userData.fcmTokens);
                }
            });

            // 4. Write a persistent notification record for each registrant
            const notificationPromises = Array.from(registrantUids).map(uid => 
                admin.firestore().collection('userNotifications').add({
                    userId: uid,
                    title: "Campaign Cancelled ❌",
                    // UPDATED MESSAGE with apology
                    message: `We apologize! The campaign "${campaignTitle}" has been cancelled by the organizer.`,
                    type: 'cancellation',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    read: false,
                    relatedEntityId: campaignId,
                    relatedEntityType: 'campaigns',
                    fullDetails: `Reason: ${cancellationReason}. Your spot is no longer reserved.`
                })
            );
            await Promise.all(notificationPromises);

            // 5. Send bulk FCM push notification
            await sendFCMToTokens(tokensToNotify, 
                "Campaign Cancelled ❌",
                // UPDATED MESSAGE with apology
                `We apologize! The campaign "${campaignTitle}" has been cancelled. Tap for details.`,
                { notificationType: 'cancellation', relatedEntityId: campaignId, relatedEntityType: 'campaigns' }
            );
        }

        return null;
    }

    return null;
});