import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Interface remains the same
interface ContactRequestData {
    targetUserId: string;
    interactionId: string;
    interactionType: 'food' | 'campaign';
}

/**
 * Securely retrieves the phone number of a Donor or Campaign Organizer (Volunteer).
 * Access is granted if the requesting user (Receiver/Volunteer) is APPROVED.
 * No prior reservation or availability check is performed.
 */
export const getContactDetails = onCall(
    async (request: CallableRequest<ContactRequestData>) => { 
    
    const callerUid = request.auth?.uid;
    const { targetUserId, interactionId, interactionType } = request.data;
    
    // 1. Basic Validation and Authentication
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to request contact information.');
    }

    if (!targetUserId || !interactionId || !interactionType) {
        throw new HttpsError('invalid-argument', 'Missing required parameters: targetUserId, interactionId, and interactionType.');
    }

    // 2. Get the current user's role and status (Caller is expected to be an approved Receiver OR Volunteer)
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();
    
    // Check if the caller is approved and has an authorized role
    if (callerData?.status !== 'approved' || (callerData?.role !== 'receiver' && callerData?.role !== 'volunteer')) {
        throw new HttpsError('permission-denied', 'Only approved Receivers or Volunteers can access contact information.');
    }

    let targetRole: 'donor' | 'volunteer';
    let isAuthorized = false;

    // 3. Simplified Verification: Only check if the target is the correct owner of the item.
    if (interactionType === 'food') {
        targetRole = 'donor';
        
        const listingDoc = await db.collection('foodListings').doc(interactionId).get();
        const listingData = listingDoc.data();

        if (!listingDoc.exists || listingData?.status !== 'approved' || listingData.donorId !== targetUserId) {
            throw new HttpsError('permission-denied', 'Food listing is not active, approved, or targetUserId does not match donor.');
        }

        // Authorization granted if the caller is an approved user and the targetUserId is the correct donor.
        isAuthorized = true;
        
    } else if (interactionType === 'campaign') {
        targetRole = 'volunteer';

        const campaignDoc = await db.collection('campaigns').doc(interactionId).get();
        const campaignData = campaignDoc.data();

        if (!campaignDoc.exists || campaignData?.status !== 'approved' || campaignData.organizerId !== targetUserId) {
            throw new HttpsError('permission-denied', 'Campaign is not active, approved, or targetUserId does not match organizer.');
        }

        // Authorization granted if the caller is an approved user and the targetUserId is the correct organizer.
        isAuthorized = true;

    } else {
         throw new HttpsError('invalid-argument', 'Invalid interactionType specified.');
    }

    if (!isAuthorized) {
        // This line is technically unreachable due to checks above, but kept for robustness.
        throw new HttpsError('permission-denied', `Authorization failed. Could not confirm relationship with the item owner.`);
    }

    // 4. Retrieve and Format the phone number securely
    const targetDoc = await db.collection('users').doc(targetUserId).get();
    const targetData = targetDoc.data();

    let phoneNumber = targetData?.profile?.phone;
    
    if (!phoneNumber) {
        throw new HttpsError('not-found', `Contact information not available for ${targetRole}.`);
    }

    // --- Phone Number Formatting for WhatsApp (Malaysia) ---
    // Remove all non-digit characters
    phoneNumber = phoneNumber.toString().replace(/\D/g, '');
    
    // Malaysia Country Code is +60
    const countryCode = '60';

    // WhatsApp format requires country code without the leading '+' or the local '0'.
    // Remove a leading '0' if it exists (common for Malaysian mobile numbers like 01x-xxx xxxx)
    if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
    }

    // Prepend the country code if it's not already there
    if (!phoneNumber.startsWith(countryCode)) {
        phoneNumber = countryCode + phoneNumber;
    }

    // Return the cleaned, country-coded number
    return { success: true, phoneNumber };
});