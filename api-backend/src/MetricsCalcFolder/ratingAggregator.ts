// functions/src/ratingAggregator.ts
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const updateRatingStats = onDocumentWritten(
  "ratings/{ratingId}",
  async (event) => {
    try {
      const ratingData = event.data?.after.data();
      const previousData = event.data?.before.data();

      // If rating was deleted, use previous data to recalculate
      const targetType = ratingData?.targetType || previousData?.targetType;
      const targetId = ratingData?.targetId || previousData?.targetId;
      const ratedUserId = ratingData?.ratedUserId || previousData?.ratedUserId;
      const ratedUserType = ratingData?.ratedUserType ||
        previousData?.ratedUserType;

      if (!targetType || !targetId || !ratedUserId || !ratedUserType) {
        logger.log("Missing required data for rating aggregation");
        return;
      }

      // Update target (food/campaign) rating stats
      await updateTargetRatingStats(targetType, targetId);

      // Update user (donor/volunteer) rating stats
      await updateUserRatingStats(ratedUserId, ratedUserType);

      logger.log("Successfully updated rating stats");
    } catch (error) {
      logger.error("Error in updateRatingStats:", error);
    }
  }
);

// Helper function to update target rating stats
async function updateTargetRatingStats(targetType: string, targetId: string) {
  const db = admin.firestore();

  // Get all ratings for this target
  const ratingsSnapshot = await db.collection("ratings")
    .where("targetType", "==", targetType)
    .where("targetId", "==", targetId)
    .get();

  const ratings = ratingsSnapshot.docs.map((doc) => doc.data());

  if (ratings.length === 0) {
    // No ratings, set to default
    const targetCollection = targetType === "food" ?
      "foodListings" :
      "campaigns";
    await db.collection(targetCollection).doc(targetId).update({
      rating: 0,
      totalRatings: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  // Calculate average rating
  const totalRating = ratings.reduce(
    (sum: number, r: {rating?: number}) => sum + (r.rating || 0),
    0
  );
  const averageRating = totalRating / ratings.length;

  const targetCollection = targetType === "food" ?
    "foodListings" :
    "campaigns";
  await db.collection(targetCollection).doc(targetId).update({
    rating: Math.round(averageRating * 10) / 10,
    totalRatings: ratings.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Helper function to update user rating stats
async function updateUserRatingStats(userId: string, userType: string) {
  const db = admin.firestore();

  // Get all ratings for this user
  const ratingsSnapshot = await db.collection("ratings")
    .where("ratedUserId", "==", userId)
    .where("ratedUserType", "==", userType)
    .get();

  const ratings = ratingsSnapshot.docs.map((doc) => doc.data());

  if (ratings.length === 0) {
    // No ratings, set to default
    await db.collection("users").doc(userId).update({
      [`${userType}Rating`]: 0,
      [`${userType}TotalRatings`]: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  // Calculate average rating
  const totalRating = ratings.reduce(
    (sum: number, r: {rating?: number}) => sum + (r.rating || 0),
    0
  );
  const averageRating = totalRating / ratings.length;

  await db.collection("users").doc(userId).update({
    [`${userType}Rating`]: Math.round(averageRating * 10) / 10,
    [`${userType}TotalRatings`]: ratings.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}