// functions/reservations.ts (CORRECTED V2 SYNTAX)

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize App (assuming this is done in the main index.ts)
// const app = admin.initializeApp();
const db = admin.firestore();

// ------------------------------------------------------------------
// Type Definitions for Callable Functions
// ------------------------------------------------------------------
interface SubmitRatingRequest {
  targetType: 'food' | 'campaign';
  targetId: string;
  rating: number;
  comment?: string;
  reservationId?: string;
}

interface MarkAllReadRequest {
  // Data is empty, userId is derived from auth context
}

// ------------------------------------------------------------------
// Core Rating Function
// ------------------------------------------------------------------

/**
 * Submits a rating for a food listing or campaign.
 */
export const submitRatingCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<SubmitRatingRequest>) => {
    const user = request.auth;
    if (!user) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { targetType, targetId, rating, comment, reservationId } = request.data;
    
    if (rating < 1 || rating > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Rating must be between 1 and 5.');
    }

    const targetCollection = targetType === 'food' ? 'foodListings' : 'campaigns';
    const targetRef = db.collection(targetCollection).doc(targetId);
    const ratingsCollection = db.collection('ratings');

    let ratingId: string | undefined;

    await db.runTransaction(async (transaction) => {
      // 1. Get Target Data
      const targetDoc = await transaction.get(targetRef);
      if (!targetDoc.exists) {
        throw new functions.https.HttpsError('not-found', `${targetType} not found.`);
      }
      const targetData = targetDoc.data()!;
      
      // 2. Get Rater Data
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User data not found.');
      }
      const userData = userDoc.data()!;
      const raterUserType = userData.role === 'volunteer' ? 'volunteer' : 'receiver';
      const raterUserName = userData.profile?.name || userData.profile?.contactPerson || 'Anonymous User';

      // 3. Check for existing rating by user
      const existingRatingQuery = ratingsCollection
        .where('targetType', '==', targetType)
        .where('targetId', '==', targetId)
        .where('raterUserId', '==', user.uid)
        .limit(1);

      const existingRatingsSnapshot = await transaction.get(existingRatingQuery);
      
      let oldRating = 0; // Used for stats update
      let newRating = rating;

      if (!existingRatingsSnapshot.empty) {
        // A. Update existing rating
        const existingRatingDoc = existingRatingsSnapshot.docs[0];
        ratingId = existingRatingDoc.id;
        oldRating = existingRatingDoc.data().rating;

        transaction.update(existingRatingDoc.ref, {
          rating: newRating,
          comment: comment,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // B. Create new rating
        const newRatingData = {
          targetType,
          targetId,
          targetName: targetData.title,
          ratedUserId: targetType === 'food' ? targetData.donorId : targetData.organizerId,
          ratedUserName: targetType === 'food' ? targetData.donorName : targetData.organizerName,
          ratedUserType: targetType === 'food' ? 'donor' : 'volunteer',
          raterUserId: user.uid,
          raterUserName: raterUserName,
          raterUserType,
          rating: newRating,
          comment: comment,
          reservationId: reservationId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const newRatingRef = ratingsCollection.doc();
        transaction.set(newRatingRef, newRatingData);
        ratingId = newRatingRef.id;
      }

      // 4. Update Target Rating Statistics
      const currentTotalRatings = targetData.totalRatings || 0;
      let newTotalRatings = currentTotalRatings;
      let currentRatingSum = (targetData.rating || 0) * currentTotalRatings;

      if (oldRating > 0) {
        // Update: subtract old rating, add new rating
        currentRatingSum = currentRatingSum - oldRating + newRating;
      } else {
        // New rating: add new rating and increase total count
        currentRatingSum += newRating;
        newTotalRatings += 1;
      }
      
      const newAverageRating = newTotalRatings > 0 ? (currentRatingSum / newTotalRatings) : 0;
      
      // Update the target document (foodListing or campaign)
      transaction.update(targetRef, {
        rating: Math.round(newAverageRating * 10) / 10, // Store rounded to one decimal
        totalRatings: newTotalRatings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    });

    return { success: true, ratingId };
  }
);


// ------------------------------------------------------------------
// Core Notification Function
// ------------------------------------------------------------------

/**
 * Marks all unread notifications for the current user as read using a Batched Write.
 */
export const markAllNotificationsAsReadCF = functions.https.onCall(
  async (request: functions.https.CallableRequest<MarkAllReadRequest>) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const unreadQuery = db.collection('userNotifications')
        .where('userId', '==', userId)
        .where('read', '==', false);

    const querySnapshot = await unreadQuery.get();
    const batch = db.batch();
    
    querySnapshot.forEach((document) => {
        batch.update(document.ref, { 
          read: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    
    return { success: true, count: querySnapshot.size };
  }
);