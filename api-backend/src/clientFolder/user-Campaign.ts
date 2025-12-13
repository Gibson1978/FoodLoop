import * as functions from 'firebase-functions';
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
 */
export const registerForCampaignCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<RegisterCampaignRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to register.');
    }

    const { campaignId } = request.data;
    const campaignRef = db.collection('campaigns').doc(campaignId);

    await db.runTransaction(async (transaction) => {
      // 1. Get user data
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User data not found.');
      }
      const userData = userDoc.data()!;
      const userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
      const userEmail = userData.email || '';
      const userPhone = userData.profile?.phone || '';

      // 2. Check campaign and spots
      const campaignDoc = await transaction.get(campaignRef);
      if (!campaignDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Campaign not found.');
      }
      const campaignData = campaignDoc.data()!;
      
      const availableSpots = campaignData.availableSpots || 0;
      const registeredSpots = campaignData.registeredSpots || 0;

      if (availableSpots <= 0) {
        throw new functions.https.HttpsError('resource-exhausted', 'No available spots left.');
      }

      // 3. Check for existing registration (cancelled or active)
      const registrationsQuery = db.collection('campaignRegistrations')
        .where('campaignId', '==', campaignId)
        .where('userId', '==', userId)
        .limit(10); // Check a reasonable limit

      const existingRegistrations = await registrationsQuery.get();
      let existingCancelledDoc = existingRegistrations.docs.find(doc => doc.data().status === 'cancelled');
      let existingActiveDoc = existingRegistrations.docs.find(doc => ['registered', 'attended'].includes(doc.data().status));

      if (existingActiveDoc) {
        throw new functions.https.HttpsError('already-exists', 'You are already registered for this campaign.');
      }
      
      let registrationId: string;
      
      if (existingCancelledDoc) {
        // A. Update existing cancelled registration
        registrationId = existingCancelledDoc.id;
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
 * Marks a campaign registration as attended.
 */
export const completeCampaignRegistrationCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<CompleteRegistrationRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    
    const { registrationId } = request.data;
    const registrationRef = db.collection('campaignRegistrations').doc(registrationId);
    
    await db.runTransaction(async (transaction) => {
      // 1. Get registration data
      const registrationDoc = await transaction.get(registrationRef);
      if (!registrationDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Registration not found.');
      }
      const registrationData = registrationDoc.data()!;
      
      if (registrationData.status === 'attended') {
        throw new functions.https.HttpsError('failed-precondition', 'Registration is already marked as attended.');
      }

      // 2. Check if user is the organizer of this campaign (Authorization)
      const campaignRef = db.collection('campaigns').doc(registrationData.campaignId);
      const campaignDoc = await transaction.get(campaignRef);
      if (!campaignDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Campaign not found.');
      }
      const campaignData = campaignDoc.data()!;
      
      if (campaignData.organizerId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Only the campaign organizer can mark registrations as attended.');
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
 * Cancels a campaign registration and returns the spot to the campaign.
 */
export const cancelCampaignRegistrationCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<CancelRegistrationRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { registrationId } = request.data;
    const registrationRef = db.collection('campaignRegistrations').doc(registrationId);

    await db.runTransaction(async (transaction) => {
      // 1. Get registration data
      const registrationDoc = await transaction.get(registrationRef);
      if (!registrationDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Registration not found.');
      }
      const registrationData = registrationDoc.data()!;
      
      if (registrationData.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only cancel your own registrations.');
      }
      if (registrationData.status === 'attended') {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel an attended registration.');
      }

      const campaignId = registrationData.campaignId;

      // 2. Update registration status
      transaction.update(registrationRef, {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update campaign spots
      const campaignRef = db.collection('campaigns').doc(campaignId);
      const campaignDoc = await transaction.get(campaignRef);
      
      if (campaignDoc.exists) {
        const campaignData = campaignDoc.data()!;
        const registeredSpots = campaignData.registeredSpots || 0;
        const availableSpots = campaignData.availableSpots || 0;
        
        transaction.update(campaignRef, {
          registeredSpots: Math.max(0, registeredSpots - 1),
          availableSpots: availableSpots + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    return { success: true };
  }
);

