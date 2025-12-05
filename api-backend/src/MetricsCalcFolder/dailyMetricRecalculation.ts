// dailyMetricsRecalculation.ts
import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";

export const dailyMetricsRecalculation = onSchedule(
  {
    schedule: "0 2 * * *", // 2 AM daily
    timeZone: "UTC",
  },
  async () => {
    const db = getFirestore();
    console.log("🔄 Starting daily metrics recalculation...");

    try {
      // Get all users who are donors or volunteers
      const usersSnapshot = await db.collection("users")
        .where("roles", "array-contains-any", ["donor", "volunteer"])
        .get();

      let processedCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        try {
          // Process donors
          if (userData.roles.includes("donor")) {
            await calculateDonorMetrics(db, userId);
          }

          // Process volunteers
          if (userData.roles.includes("volunteer")) {
            await calculateVolunteerMetrics(db, userId);
          }

          processedCount++;
          console.log(`✅ Processed ${processedCount}/${usersSnapshot.size} users`);

          // Small delay to avoid overwhelming Firestore
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
        }
      }

      console.log(`✅ Daily metrics recalculation completed. Processed ${processedCount} users`);
    } catch (error) {
      console.error("Error in daily metrics recalculation:", error);
    }
  }
);

// Helper functions for Admin SDK
async function calculateDonorMetrics(db: FirebaseFirestore.Firestore, donorId: string) {
  console.log(`📊 Calculating donor metrics for: ${donorId}`);

  const foodListingsQuery = db.collection("foodListings")
    .where("donorId", "==", donorId)
    .where("status", "==", "completed");

  const snapshot = await foodListingsQuery.get();

  const UNIT_CONVERSIONS = {
    kg: 1,
    servings: 0.25,
    packages: 1,
    containers: 2,
    liters: 1,
  };

  let totalFoodWasteReduced = 0;
  let totalDonations = 0;
  const uniqueReceivers = new Set<string>();
  let totalRating = 0;
  let ratingCount = 0;

  // Calculate from completed food listings
  for (const doc of snapshot.docs) {
    const listing = doc.data();

    // Food waste calculation - use collectedQuantity (actual collected amount)
    const collectedQty = listing.collectedQuantity || 0;
    const kgCollected = collectedQty *
      (UNIT_CONVERSIONS[listing.quantityUnit as keyof typeof UNIT_CONVERSIONS] || 1);

    totalFoodWasteReduced += kgCollected;

    if (collectedQty > 0) {
      totalDonations += 1;
    }

    // Rating calculation
    if (listing.rating && listing.rating > 0) {
      totalRating += listing.rating;
      ratingCount++;
    }

    // Unique receivers from completed reservations for this listing
    const reservationsQuery = db.collection("foodReservations")
      .where("foodListingId", "==", doc.id)
      .where("status", "==", "completed");

    const reservationsSnapshot = await reservationsQuery.get();
    reservationsSnapshot.forEach(reservationDoc => {
      const reservation = reservationDoc.data();
      uniqueReceivers.add(reservation.userId);
    });
  }

  const peopleHelped = uniqueReceivers.size;
  const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

  // Update donor metrics
  await db.collection("users").doc(donorId).update({
    "metrics.donor.foodWasteReduced": totalFoodWasteReduced,
    "metrics.donor.peopleHelped": peopleHelped,
    "metrics.donor.totalDonations": totalDonations,
    "metrics.donor.rating": averageRating,
    "metrics.donor.totalRatings": ratingCount,
    "updatedAt": new Date(),
  });

  console.log(
    `📊 Donor ${donorId} metrics: ${totalFoodWasteReduced}kg waste reduced, ` +
    `${peopleHelped} people helped, ${totalDonations} donations, ${averageRating} avg rating`
  );
}

async function calculateVolunteerMetrics(db: FirebaseFirestore.Firestore, volunteerId: string) {
  console.log(`📊 Calculating volunteer metrics for: ${volunteerId}`);

  const campaignsQuery = db.collection("campaigns")
    .where("organizerId", "==", volunteerId)
    .where("status", "==", "completed");

  const snapshot = await campaignsQuery.get();

  let totalHours = 0;
  let campaignsHeld = 0;
  let totalRating = 0;
  let ratingCount = 0;

  snapshot.forEach((doc) => {
    const campaign = doc.data();
    campaignsHeld += 1;

    // Rating calculation
    if (campaign.rating && campaign.rating > 0) {
      totalRating += campaign.rating;
      ratingCount++;
    }

    // Hours calculation from campaign duration
    if (campaign.startTime && campaign.endTime && campaign.campaignDate) {
      try {
        // Helper function - assume times are in Malaysia time (UTC+8)
        const createLocalDateTime = (dateStr: string, timeStr: string): Date => {
          return new Date(`${dateStr}T${timeStr}:00+08:00`);
        };

        const startDateTime = createLocalDateTime(campaign.campaignDate, campaign.startTime);
        const endDateTime = createLocalDateTime(campaign.campaignDate, campaign.endTime);

        // Handle overnight campaigns
        if (endDateTime < startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

        if (hours > 0 && hours < 24) {
          totalHours += hours;
        }
      } catch (error) {
        console.error(`Error calculating hours for campaign ${doc.id}:`, error);
      }
    }
  });

  const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

  await db.collection("users").doc(volunteerId).update({
    "metrics.volunteer.hoursVolunteered": totalHours,
    "metrics.volunteer.campaignsHeld": campaignsHeld,
    "metrics.volunteer.rating": averageRating,
    "metrics.volunteer.totalRatings": ratingCount,
    "updatedAt": new Date(),
  });

  console.log(
    `📊 Volunteer ${volunteerId} metrics: ${totalHours} hours, ` +
    `${campaignsHeld} campaigns, ${averageRating} avg rating`
  );
}