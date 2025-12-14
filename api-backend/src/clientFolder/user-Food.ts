import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { CallableRequest } from 'firebase-functions/v2/https';

// Initialize App (assuming this is done in the main index.ts)
const db = admin.firestore();

// --- INTERFACES (Remain the same) ---
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
// --- END INTERFACES ---

// Configuration for receiver quantity limit
const RECEIVER_MAX_QUANTITY = 3;
const publicCallableOptions = {
  // Sets the IAM policy to allow "allUsers" to invoke the function (Public access)
  invoker: 'public' as const, 
};
/**
 * Reserves food, updates food listing quantity atomically, and handles re-reservation.
 * FIX APPLIED: Queries are moved outside the transaction. User data is read inside the transaction.
 * NEW LOGIC: Enforces RECEIVER_MAX_QUANTITY for 'receiver' userType.
 */
export const reserveFoodCF = onCall<ReserveFoodRequest>(
  async (request: CallableRequest<ReserveFoodRequest>) => {
    
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to reserve food.');
    }

    const { foodListingId, quantity, userType } = request.data;
    if (quantity <= 0) {
        throw new HttpsError('invalid-argument', 'Quantity must be greater than zero.');
    }

    // NEW LOGIC: Enforce quantity limit based on user type
    if (userType === 'receiver' && quantity > RECEIVER_MAX_QUANTITY) {
        throw new HttpsError('invalid-argument', `Receivers are limited to a maximum reservation of ${RECEIVER_MAX_QUANTITY} units.`);
    }
    // Volunteers (userType: 'volunteer') have no server-side quantity limit.

    const userRef = db.collection('users').doc(userId);
    const foodRef = db.collection('foodListings').doc(foodListingId);
    
    let reservationId: string | undefined = undefined;

    // --- NON-TRANSACTIONAL READS (Queries moved outside TX block for safety) ---
    // 1. Check for existing active reservation (to enforce single active reservation)
    const existingActiveReservationQuery = db.collection('foodReservations')
      .where('foodListingId', '==', foodListingId)
      .where('userId', '==', userId)
      .where('status', 'in', ['confirmed', 'awaiting_pickup']) // Add other active statuses if needed
      .limit(1);

    const existingActiveReservations = await existingActiveReservationQuery.get();

    if (!existingActiveReservations.empty) {
      throw new HttpsError('already-exists', 'You already have an active reservation for this food listing. Please complete or cancel it first.');
    }
    
    // 2. Check for existing *cancelled* reservation (to overwrite/re-reserve)
    const existingCancelledReservationQuery = db.collection('foodReservations')
      .where('foodListingId', '==', foodListingId)
      .where('userId', '==', userId)
      .where('status', '==', 'cancelled')
      .limit(1);
    
    const existingCancelledReservations = await existingCancelledReservationQuery.get();
    // --- END NON-TRANSACTIONAL READS ---

    
    await db.runTransaction(async (transaction) => {
      // 1. Check user data (FIX: Use transaction.get())
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User data not found.');
      }
      const userData = userDoc.data()!;
      const userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
      const userEmail = userData.email || '';
      const userPhone = userData.profile?.phone || '';

      // 2. Check food listing and quantity
      const foodDoc = await transaction.get(foodRef);
      if (!foodDoc.exists) {
        throw new HttpsError('not-found', 'Food listing not found.');
      }
      const foodData = foodDoc.data()!;
      
      const remainingQuantity = foodData.remainingQuantity || 0;
      const reservedQuantity = foodData.reservedQuantity || 0;

      if (remainingQuantity < quantity) {
        throw new HttpsError('resource-exhausted', 'Not enough quantity available.');
      }
      
      
      let quantityDiff = quantity; // Default for new reservation
      
      if (!existingCancelledReservations.empty) {
        // A. Update existing cancelled reservation
        const existingReservationRef = existingCancelledReservations.docs[0].ref;
        const existingReservationData = existingCancelledReservations.docs[0].data();
        const oldQuantity = existingReservationData.quantity || 0;
        
        // Calculate the difference in quantity (for updating remaining/reserved counts)
        quantityDiff = quantity - oldQuantity; 
        
        // Crucial Check: Ensure the new quantity doesn't exceed available stock
        if (remainingQuantity < quantityDiff) {
            throw new HttpsError('resource-exhausted', 'Not enough quantity available to increase the reservation to this amount.');
        }

        reservationId = existingReservationRef.id;
        
        transaction.update(existingReservationRef, {
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

      // 4. Update food listing quantities (Applies quantityDiff)
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
 * Completes a food reservation and updates food listing collected quantity. (Transaction logic confirmed to be safe).
 */
export const completeFoodReservationCF = onCall<CompleteReservationRequest>(
  async (request: CallableRequest<CompleteReservationRequest>) => {
    
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }
    
    const { reservationId } = request.data;
    const reservationRef = db.collection('foodReservations').doc(reservationId);
    
    let foodListingId: string;
    let collectedQuantity: number;

    await db.runTransaction(async (transaction) => {
      // 1. Get reservation data
      const reservationDoc = await transaction.get(reservationRef);
      if (!reservationDoc.exists) {
        throw new HttpsError('not-found', 'Reservation not found.');
      }
      const reservationData = reservationDoc.data()!;
      
      if (reservationData.status === 'completed') {
        throw new HttpsError('failed-precondition', 'Reservation is already completed.');
      }

      foodListingId = reservationData.foodListingId;
      collectedQuantity = reservationData.quantity;

      // 2. Check if user is the donor of this food listing (Authorization)
      const foodListingRef = db.collection('foodListings').doc(foodListingId);
      const foodListingDoc = await transaction.get(foodListingRef);
      if (!foodListingDoc.exists) {
        throw new HttpsError('not-found', 'Food listing not found.');
      }
      const foodListingData = foodListingDoc.data()!;
      
      if (foodListingData.donorId !== userId) {
        throw new HttpsError('permission-denied', 'Only the donor can mark reservations as completed.');
      }

      // 3. Update reservation status
      transaction.update(reservationRef, {
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Update food listing collected quantity
      const currentCollected = foodListingData.collectedQuantity || 0;
      // Also update reservedQuantity to reflect collection (it's no longer 'reserved')
      const reservedQuantity = foodListingData.reservedQuantity || 0;
      
      transaction.update(foodListingRef, {
        collectedQuantity: currentCollected + collectedQuantity,
        reservedQuantity: Math.max(0, reservedQuantity - collectedQuantity), // Decrement reserved count
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true };
  }
);

/**
 * Cancels a food reservation and returns the quantity to the food listing. (Transaction logic confirmed to be safe).
 */
export const cancelFoodReservationCF = onCall<CancelReservationRequest>(
  async (request: CallableRequest<CancelReservationRequest>) => {
    
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { reservationId } = request.data;
    if (!reservationId) {
        throw new HttpsError('invalid-argument', 'Reservation ID is required.');
    }
    const reservationRef = db.collection('foodReservations').doc(reservationId);

    await db.runTransaction(async (transaction) => {
      // 1. Get reservation data (READ 1)
      const reservationDoc = await transaction.get(reservationRef);
      if (!reservationDoc.exists) {
        throw new HttpsError('not-found', 'Reservation not found.');
      }
      
      const reservationData = reservationDoc.data();
      if (!reservationData) {
          throw new HttpsError('internal', 'Reservation data is empty or corrupted.');
      }
      
      if (reservationData.userId !== userId) {
        throw new HttpsError('permission-denied', 'You can only cancel your own reservations.');
      }
      
      // Check status and handle idempotency
      if (reservationData.status === 'completed') {
        throw new HttpsError('failed-precondition', 'Cannot cancel a completed reservation.');
      }
      if (reservationData.status === 'cancelled') {
        // Return early success if already cancelled
        return; // Return void/undefined to signify successful transaction completion
      }

      const foodListingId = reservationData.foodListingId;
      const quantity = reservationData.quantity;
      const originalStatus = reservationData.status;
      
      // --- FIX: READ food listing data BEFORE the update on reservationRef ---
      let foodDoc: admin.firestore.DocumentSnapshot | undefined;
      let foodRef: admin.firestore.DocumentReference | undefined;

      // Only proceed with food listing read if the reservation was active (affected stock)
      if (['confirmed', 'awaiting_pickup'].includes(originalStatus)) {
          foodRef = db.collection('foodListings').doc(foodListingId);
          // 2. Read food listing data (READ 2)
          foodDoc = await transaction.get(foodRef); 
      }
      // -----------------------------------------------------------------------

      // 3. Update reservation status (FIRST WRITE)
      transaction.update(reservationRef, {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Update food listing quantities (SECOND WRITE, conditional)
      if (foodDoc?.exists && foodRef) { // foodDoc will only exist if the originalStatus was active
        const foodData = foodDoc.data();
        
        if (foodData) {
            const remainingQuantity = foodData.remainingQuantity || 0;
            const reservedQuantity = foodData.reservedQuantity || 0;
            
            transaction.update(foodRef, {
              remainingQuantity: remainingQuantity + quantity,
              reservedQuantity: Math.max(0, reservedQuantity - quantity),
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