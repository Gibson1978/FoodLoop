import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize App (assuming this is done in the main index.ts)
// const app = admin.initializeApp();
const db = admin.firestore();

interface ReserveFoodRequest {
  foodListingId: string;
  quantity: number;
  userType: 'receiver' | 'volunteer';
}

interface CancelReservationRequest {
  reservationId: string;
}

interface CompleteReservationRequest {
  reservationId: string;
}

/**
 * Reserves food, updates food listing quantity atomically, and handles re-reservation.
 */
export const reserveFoodCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<ReserveFoodRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to reserve food.');
    }

    // V2 syntax: data is accessed via request.data
    const { foodListingId, quantity, userType } = request.data;
    if (quantity <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Quantity must be greater than zero.');
    }

    // ... (Firestore logic remains the same, using transaction) ...
    const userRef = db.collection('users').doc(userId);
    const foodRef = db.collection('foodListings').doc(foodListingId);
    
    let reservationId: string | undefined = undefined;

    await db.runTransaction(async (transaction) => {
      // 1. Check user data (for logging and reservation info)
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User data not found.');
      }
      const userData = userDoc.data()!;
      const userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
      const userEmail = userData.email || '';
      const userPhone = userData.profile?.phone || '';

      // 2. Check food listing and quantity
      const foodDoc = await transaction.get(foodRef);
      if (!foodDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Food listing not found.');
      }
      const foodData = foodDoc.data()!;
      
      const remainingQuantity = foodData.remainingQuantity || 0;
      const reservedQuantity = foodData.reservedQuantity || 0;

      if (remainingQuantity < quantity) {
        throw new functions.https.HttpsError('resource-exhausted', 'Not enough quantity available.');
      }
      
      // 3. Check for existing *cancelled* reservation
      const existingReservationQuery = db.collection('foodReservations')
        .where('foodListingId', '==', foodListingId)
        .where('userId', '==', userId)
        .where('status', '==', 'cancelled')
        .limit(1);
      
      const existingReservations = await existingReservationQuery.get();
      
      let quantityDiff = quantity; // Default for new reservation
      
      if (!existingReservations.empty) {
        // A. Update existing cancelled reservation
        const existingReservation = existingReservations.docs[0];
        const existingReservationData = existingReservation.data();
        const oldQuantity = existingReservationData.quantity || 0;
        
        quantityDiff = quantity - oldQuantity;
        reservationId = existingReservation.id;
        
        transaction.update(existingReservation.ref, {
          quantity,
          status: 'confirmed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userName,
          userEmail,
          userPhone
        });

      } else {
        // B. Create a new reservation record
        const reservationData = {
          foodListingId,
          userId,
          userType,
          quantity,
          status: 'confirmed',
          reservedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userName,
          userEmail,
          userPhone
        };
        const newReservationRef = db.collection('foodReservations').doc();
        transaction.set(newReservationRef, reservationData);
        reservationId = newReservationRef.id;
      }

      // 4. Update food listing quantities
      transaction.update(foodRef, {
        remainingQuantity: remainingQuantity - quantityDiff,
        reservedQuantity: reservedQuantity + quantityDiff,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    });

    return { 
      success: true, 
      reservationId 
    };
  }
);

/**
 * Completes a food reservation and updates food listing collected quantity.
 */
export const completeFoodReservationCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<CompleteReservationRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    
    const { reservationId } = request.data;
    const reservationRef = db.collection('foodReservations').doc(reservationId);
    
    let foodListingId: string;
    let collectedQuantity: number;

    await db.runTransaction(async (transaction) => {
      // 1. Get reservation data
      const reservationDoc = await transaction.get(reservationRef);
      if (!reservationDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found.');
      }
      const reservationData = reservationDoc.data()!;
      
      if (reservationData.status === 'completed') {
        throw new functions.https.HttpsError('failed-precondition', 'Reservation is already completed.');
      }

      foodListingId = reservationData.foodListingId;
      collectedQuantity = reservationData.quantity;

      // 2. Check if user is the donor of this food listing (Authorization)
      const foodListingRef = db.collection('foodListings').doc(foodListingId);
      const foodListingDoc = await transaction.get(foodListingRef);
      if (!foodListingDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Food listing not found.');
      }
      const foodListingData = foodListingDoc.data()!;
      
      if (foodListingData.donorId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Only the donor can mark reservations as completed.');
      }

      // 3. Update reservation status
      transaction.update(reservationRef, {
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Update food listing collected quantity
      const currentCollected = foodListingData.collectedQuantity || 0;
      transaction.update(foodListingRef, {
        collectedQuantity: currentCollected + collectedQuantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true };
  }
);

/**
 * Cancels a food reservation and returns the quantity to the food listing.
 */
export const cancelFoodReservationCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<CancelReservationRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { reservationId } = request.data;
    const reservationRef = db.collection('foodReservations').doc(reservationId);

    await db.runTransaction(async (transaction) => {
      // 1. Get reservation data
      const reservationDoc = await transaction.get(reservationRef);
      if (!reservationDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found.');
      }
      const reservationData = reservationDoc.data()!;
      
      if (reservationData.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only cancel your own reservations.');
      }
      if (reservationData.status === 'completed') {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel a completed reservation.');
      }

      const foodListingId = reservationData.foodListingId;
      const quantity = reservationData.quantity;

      // 2. Update reservation status
      transaction.update(reservationRef, {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update food listing quantities
      const foodRef = db.collection('foodListings').doc(foodListingId);
      const foodDoc = await transaction.get(foodRef);
      
      if (foodDoc.exists) {
        const foodData = foodDoc.data()!;
        const remainingQuantity = foodData.remainingQuantity || 0;
        const reservedQuantity = foodData.reservedQuantity || 0;
        
        transaction.update(foodRef, {
          remainingQuantity: remainingQuantity + quantity,
          reservedQuantity: Math.max(0, reservedQuantity - quantity),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    return { success: true };
  }
);