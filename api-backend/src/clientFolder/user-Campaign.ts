import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize App (assuming this is done in the main index.ts)
// const app = admin.initializeApp();
const db = admin.firestore();


interface RegisterCampaignRequest {
  campaignId: string;
}

interface CompleteRegistrationRequest {
  registrationId: string;
}


interface CancelRegistrationRequest {
  registrationId: string;
}


/**
 * Registers a user for a campaign spot and updates available spots atomically.
 * FIX APPLIED: User data is now fetched using transaction.get() for atomicity.
 */
export const registerForCampaignCF = onCall(
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to register.');
    }

    const { campaignId } = request.data as RegisterCampaignRequest;
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const userRef = db.collection('users').doc(userId); // Define userRef outside

    // --- NON-TRANSACTIONAL READS (Queries) ---
    // Check for existing registration (cancelled or active) - done via query outside TX
    const registrationsQuery = db.collection('campaignRegistrations')
      .where('campaignId', '==', campaignId)
      .where('userId', '==', userId)
      .limit(10); // Check a reasonable limit

    const existingRegistrations = await registrationsQuery.get();
    
    // Check for existing active registration first (status: registered or attended)
    const existingActiveDoc = existingRegistrations.docs.find(doc => ['registered', 'attended'].includes(doc.data().status));
    if (existingActiveDoc) {
      throw new HttpsError('already-exists', 'You are already registered for this campaign.');
    }
    
    // Check for existing cancelled registration
    const existingCancelledDoc = existingRegistrations.docs.find(doc => doc.data().status === 'cancelled');
    // --- END NON-TRANSACTIONAL READS ---


    await db.runTransaction(async (transaction) => {
      // 1. Get user data (FIX: Use transaction.get())
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User data not found.');
      }
      
      const userData = userDoc.data();
      if (!userData) {
          throw new HttpsError('internal', 'User data is empty.');
      }

      const userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
      const userEmail = userData.email || '';
      const userPhone = userData.profile?.phone || '';

      // 2. Check campaign and spots
      const campaignDoc = await transaction.get(campaignRef);
      if (!campaignDoc.exists) {
        throw new HttpsError('not-found', 'Campaign not found.');
      }
      
      const campaignData = campaignDoc.data();
      if (!campaignData) {
          throw new HttpsError('internal', 'Campaign data is empty.');
      }
      
      const availableSpots = campaignData.availableSpots || 0;
      const registeredSpots = campaignData.registeredSpots || 0;

      if (availableSpots <= 0) {
        throw new HttpsError('resource-exhausted', 'No available spots left.');
      }

      
      let registrationId: string;
      
      // 3. Process registration based on non-transactional read result
      if (existingCancelledDoc) {
        // A. Update existing cancelled registration
        registrationId = existingCancelledDoc.id;
        // The transaction applies the write operation to the existing document reference
        transaction.update(existingCancelledDoc.ref, { 
          status: 'registered',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userName,
          userEmail,
          userPhone
        });
      } else {
        // B. Create a new registration record
        const registrationData = {
          campaignId,
          userId,
          status: 'registered',
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userName,
          userEmail,
          userPhone
        };
        const newRegistrationRef = db.collection('campaignRegistrations').doc();
        transaction.set(newRegistrationRef, registrationData);
        registrationId = newRegistrationRef.id;
      }

      // 4. Update campaign spots
      transaction.update(campaignRef, {
        registeredSpots: registeredSpots + 1,
        availableSpots: availableSpots - 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true };
  }
);


/**
 * Marks a campaign registration as attended. (Transaction logic confirmed to be safe).
 */
export const completeCampaignRegistrationCF = onCall(
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }
    
    const { registrationId } = request.data as CompleteRegistrationRequest;
    const registrationRef = db.collection('campaignRegistrations').doc(registrationId);
    
    await db.runTransaction(async (transaction) => {
      // 1. Get registration data
      const registrationDoc = await transaction.get(registrationRef);
      if (!registrationDoc.exists) {
        throw new HttpsError('not-found', 'Registration not found.');
      }
      
      const registrationData = registrationDoc.data();
      if (!registrationData) {
          throw new HttpsError('internal', 'Registration data is empty.');
      }
      
      if (registrationData.status === 'attended') {
        throw new HttpsError('failed-precondition', 'Registration is already marked as attended.');
      }

      // 2. Check if user is the organizer of this campaign (Authorization)
      const campaignRef = db.collection('campaigns').doc(registrationData.campaignId);
      const campaignDoc = await transaction.get(campaignRef);
      if (!campaignDoc.exists) {
        throw new HttpsError('not-found', 'Campaign not found.');
      }
      
      const campaignData = campaignDoc.data();
      if (!campaignData) {
          throw new HttpsError('internal', 'Campaign data is empty.');
      }
      
      if (campaignData.organizerId !== userId) {
        throw new HttpsError('permission-denied', 'Only the campaign organizer can mark registrations as attended.');
      }

      // 3. Update registration status
      transaction.update(registrationRef, {
        status: 'attended',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Update campaign attended count
      const currentAttended = campaignData.attendedSpots || 0;
      transaction.update(campaignRef, {
        attendedSpots: currentAttended + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true };
  }
);


/**
 * Cancels a campaign registration and returns the spot to the campaign. (Transaction logic confirmed to be safe).
 */
/**
 * Cancels a campaign registration and returns the spot to the campaign.
 */
export const cancelCampaignRegistrationCF = onCall(
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { registrationId } = request.data as CancelRegistrationRequest;
    if (!registrationId) {
        throw new HttpsError('invalid-argument', 'Registration ID is required.');
    }
    const registrationRef = db.collection('campaignRegistrations').doc(registrationId);

    await db.runTransaction(async (transaction) => {
      // 1. Get registration data (READ 1)
      const registrationDoc = await transaction.get(registrationRef);
      if (!registrationDoc.exists) {
        throw new HttpsError('not-found', 'Registration not found.');
      }
      
      const registrationData = registrationDoc.data();
      if (!registrationData) {
          throw new HttpsError('internal', 'Registration data is empty or corrupted.');
      }
      
      if (registrationData.userId !== userId) {
        throw new HttpsError('permission-denied', 'You can only cancel your own registrations.');
      }
      
      // Check status and handle idempotency
      if (registrationData.status === 'attended') {
        throw new HttpsError('failed-precondition', 'Cannot cancel an attended registration.');
      }
      if (registrationData.status === 'cancelled') {
        // Return early success if already cancelled
        return;
      }

      const campaignId = registrationData.campaignId;
      const originalStatus = registrationData.status;

      // --- FIX: READ campaign document BEFORE the update on registrationRef ---
      let campaignDoc: admin.firestore.DocumentSnapshot | undefined;
      let campaignRef: admin.firestore.DocumentReference | undefined;

      // Only proceed with campaign read if the status was 'registered' (affected spot count)
      if (originalStatus === 'registered') {
          campaignRef = db.collection('campaigns').doc(campaignId);
          // 2. Read campaign data (READ 2)
          campaignDoc = await transaction.get(campaignRef); 
      }
      // -----------------------------------------------------------------------

      // 3. Update registration status (FIRST WRITE)
      transaction.update(registrationRef, {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Update campaign spots (SECOND WRITE, conditional)
      if (campaignDoc?.exists && campaignRef) { // campaignDoc will only exist if the originalStatus was 'registered'
        const campaignData = campaignDoc.data();
        
        if (campaignData) {
            const registeredSpots = campaignData.registeredSpots || 0;
            const availableSpots = campaignData.availableSpots || 0;
            
            transaction.update(campaignRef, {
              registeredSpots: Math.max(0, registeredSpots - 1),
              availableSpots: availableSpots + 1,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
      }

      // ** FIX: Add explicit return for successful path **
      return; 
    });

    return { success: true };
  }
);