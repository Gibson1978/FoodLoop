// metricsTriggers.ts
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";

// Trigger when food listing status changes to completed
export const onFoodListingUpdated = onDocumentWritten(
  "foodListings/{listingId}",
  async (event) => {
    const db = getFirestore();
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return;

    // Trigger on status change to completed OR rating change
    const statusChangedToCompleted =
      beforeData?.status !== "completed" && afterData?.status === "completed";
    const ratingChanged =
      beforeData?.rating !== afterData?.rating && afterData?.status === "completed";

    if (statusChangedToCompleted || ratingChanged) {
      console.log(`🍎 Food listing ${event.params.listingId} updated, recalculating donor metrics`);
      try {
        await calculateDonorMetrics(db, afterData.donorId);
      } catch (error) {
        console.error("Error recalculating donor metrics:", error);
      }
    }
  }
);

// Trigger when campaign status changes to completed
export const onCampaignUpdated = onDocumentWritten(
  "campaigns/{campaignId}",
  async (event) => {
    const db = getFirestore();
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return;

    // Trigger on status change to completed OR rating change
    const statusChangedToCompleted =
      beforeData?.status !== "completed" && afterData?.status === "completed";
    const ratingChanged =
      beforeData?.rating !== afterData?.rating && afterData?.status === "completed";

    if (statusChangedToCompleted || ratingChanged) {
      console.log(`🎯 Campaign ${event.params.campaignId} updated, recalculating volunteer metrics`);
      try {
        await calculateVolunteerMetrics(db, afterData.organizerId);
      } catch (error) {
        console.error("Error recalculating volunteer metrics:", error);
      }
    }
  }
);

// Trigger when reservation status changes to completed
export const onReservationCompleted = onDocumentWritten(
  "foodReservations/{reservationId}",
  async (event) => {
    const db = getFirestore();
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return;

    // Check if status changed to completed
    if (beforeData?.status !== "completed" && afterData?.status === "completed") {
      console.log(`📦 Reservation ${event.params.reservationId} marked as completed`);

      try {
        // Recalculate receiver metrics
        await calculateReceiverMetrics(db, afterData.userId);
        console.log(`📊 Receiver metrics recalculated for: ${afterData.userId}`);

        // Also recalculate donor metrics since this affects their stats
        const foodListing = await db.collection("foodListings")
          .doc(afterData.foodListingId).get();
        if (foodListing.exists) {
          const foodListingData = foodListing.data();
          if (foodListingData) {
            await calculateDonorMetrics(db, foodListingData.donorId);
          }
        }
      } catch (error) {
        console.error("Error recalculating metrics after reservation completion:", error);
      }
    }
  }
);

// Trigger when campaign registration status changes to attended
export const onCampaignRegistrationAttended = onDocumentWritten(
  "campaignRegistrations/{registrationId}",
  async (event) => {
    const db = getFirestore();
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return;

    // Check if status changed to attended
    if (beforeData?.status !== "attended" && afterData?.status === "attended") {
      console.log(`🎪 Campaign registration ${event.params.registrationId} marked as attended`);

      try {
        // Recalculate receiver metrics
        await calculateReceiverMetrics(db, afterData.userId);
        console.log(`📊 Receiver metrics recalculated for: ${afterData.userId}`);
      } catch (error) {
        console.error("Error recalculating receiver metrics after campaign attendance:", error);
      }
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

async function calculateReceiverMetrics(db: FirebaseFirestore.Firestore, receiverId: string) {
  // Get completed food reservations
  const foodReservationsQuery = db.collection("foodReservations")
    .where("userId", "==", receiverId)
    .where("status", "==", "completed");

  const foodSnapshot = await foodReservationsQuery.get();

  let totalFoodWasteReduced = 0;
  let reservationsCompleted = 0;

  const UNIT_CONVERSIONS = {
    kg: 1,
    servings: 0.25,
    packages: 1,
    containers: 2,
    liters: 1,
  };

  // Calculate from food reservations
  for (const doc of foodSnapshot.docs) {
    const reservation = doc.data();

    // Get the food listing to get quantity and unit
    const foodListingDoc = await db.collection("foodListings")
      .doc(reservation.foodListingId).get();
    if (foodListingDoc.exists) {
      const foodListing = foodListingDoc.data();
      if (foodListing) {
        const kgReceived = reservation.quantity *
          (UNIT_CONVERSIONS[foodListing.quantityUnit as keyof typeof UNIT_CONVERSIONS] || 1);

        totalFoodWasteReduced += kgReceived;
      }
    }

    reservationsCompleted += 1;
  }

  // Get attended campaigns
  const campaignRegistrationsQuery = db.collection("campaignRegistrations")
    .where("userId", "==", receiverId)
    .where("status", "==", "attended");

  const campaignSnapshot = await campaignRegistrationsQuery.get();
  const campaignsAttended = campaignSnapshot.size;

  // For campaigns, estimate food waste reduction (average 5kg per campaign attendance)
  const campaignFoodWasteReduced = campaignsAttended * 5;
  totalFoodWasteReduced += campaignFoodWasteReduced;

  // Update receiver metrics
  await db.collection("users").doc(receiverId).update({
    "metrics.receiver.foodWasteReduced": totalFoodWasteReduced,
    "metrics.receiver.reservationsCompleted": reservationsCompleted,
    "metrics.receiver.campaignsAttended": campaignsAttended,
    "updatedAt": new Date(),
  });

  console.log(
    `📊 Receiver ${receiverId} metrics: ${totalFoodWasteReduced}kg waste reduced, ` +
    `${reservationsCompleted} reservations, ${campaignsAttended} campaigns`
  );
}