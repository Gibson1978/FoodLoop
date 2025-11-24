// metricsTriggers.ts
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";

// Trigger when food listing status changes to completed
export const onFoodListingCompleted = onDocumentWritten(
  "foodListings/{listingId}",
  async (event) => {
    const db = getFirestore();
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Check if status changed to completed
    if (beforeData?.status !== "completed" && afterData?.status === "completed") {
      console.log(`🍎 Food listing ${event.params.listingId} marked as completed`);

      try {
        // Recalculate donor metrics
        await recalculateDonorMetrics(db, afterData.donorId);
        console.log(`📊 Donor metrics recalculated for: ${afterData.donorId}`);
      } catch (error) {
        console.error("Error recalculating donor metrics:", error);
      }
    }
  }
);

// Trigger when campaign status changes to completed
export const onCampaignCompleted = onDocumentWritten(
  "campaigns/{campaignId}",
  async (event) => {
    const db = getFirestore();
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Check if status changed to completed
    if (beforeData?.status !== "completed" && afterData?.status === "completed") {
      console.log(`🎯 Campaign ${event.params.campaignId} marked as completed`);

      try {
        // Recalculate volunteer metrics
        await recalculateVolunteerMetrics(db, afterData.organizerId);
        console.log(`📊 Volunteer metrics recalculated for: ${afterData.organizerId}`);
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

    // Check if status changed to completed
    if (beforeData?.status !== "completed" && afterData?.status === "completed") {
      console.log(`📦 Reservation ${event.params.reservationId} marked as completed`);

      try {
        // Recalculate receiver metrics
        await recalculateReceiverMetrics(db, afterData.userId);
        console.log(`📊 Receiver metrics recalculated for: ${afterData.userId}`);

        // Also recalculate donor metrics since this affects their stats
        const foodListing = await db.collection("foodListings")
          .doc(afterData.foodListingId).get();
        if (foodListing.exists) {
          const foodListingData = foodListing.data();
          if (foodListingData) {
            await recalculateDonorMetrics(db, foodListingData.donorId);
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

    // Check if status changed to attended
    if (beforeData?.status !== "attended" && afterData?.status === "attended") {
      console.log(`🎪 Campaign registration ${event.params.registrationId} marked as attended`);

      try {
        // Recalculate receiver metrics
        await recalculateReceiverMetrics(db, afterData.userId);
        console.log(`📊 Receiver metrics recalculated for: ${afterData.userId}`);
      } catch (error) {
        console.error("Error recalculating receiver metrics after campaign attendance:", error);
      }
    }
  }
);

// Helper functions for Admin SDK
async function recalculateDonorMetrics(db: FirebaseFirestore.Firestore, donorId: string) {
  const foodListingsQuery = db.collection("foodListings")
    .where("donorId", "==", donorId)
    .where("status", "==", "completed");

  const snapshot = await foodListingsQuery.get();

  let totalFoodWasteReduced = 0;
  let totalDonations = 0;
  const uniqueReceivers = new Set<string>();

  const UNIT_CONVERSIONS = {
    kg: 1,
    servings: 0.25,
    packages: 1,
    containers: 2,
    liters: 1,
  };

  // Calculate from completed food listings
  for (const doc of snapshot.docs) {
    const listing = doc.data();
    // Use collectedQuantity (actual amount collected) for waste reduction calculation
    const collectedQty = listing.collectedQuantity || 0;
    const kgCollected = collectedQty *
      (UNIT_CONVERSIONS[listing.quantityUnit as keyof typeof UNIT_CONVERSIONS] || 1);

    totalFoodWasteReduced += kgCollected;

    if (collectedQty > 0) {
      totalDonations += 1;
    }

    // Get unique receivers from completed reservations for this listing
    const reservationsQuery = db.collection("foodReservations")
      .where("foodListingId", "==", doc.id)
      .where("status", "==", "completed");

    const reservationsSnapshot = await reservationsQuery.get();
    reservationsSnapshot.forEach(reservationDoc => {
      const reservation = reservationDoc.data();
      uniqueReceivers.add(reservation.userId);
    });
  }

  // People helped = unique receivers who actually collected food
  const peopleHelped = uniqueReceivers.size;

  // Update donor metrics
  await db.collection("users").doc(donorId).update({
    "metrics.donor.foodWasteReduced": totalFoodWasteReduced,
    "metrics.donor.peopleHelped": peopleHelped,
    "metrics.donor.totalDonations": totalDonations,
    "updatedAt": new Date(),
  });

  console.log(
    `📊 Donor ${donorId} metrics: ${totalFoodWasteReduced}kg waste reduced, ` +
    `${peopleHelped} people helped, ${totalDonations} donations`
  );
}

async function recalculateVolunteerMetrics(db: FirebaseFirestore.Firestore, volunteerId: string) {
  const campaignsQuery = db.collection("campaigns")
    .where("organizerId", "==", volunteerId)
    .where("status", "==", "completed");

  const snapshot = await campaignsQuery.get();

  let totalHours = 0;
  let campaignsHeld = 0;

  snapshot.forEach((doc) => {
    const campaign = doc.data();
    campaignsHeld += 1;

    // Calculate hours volunteered from campaign duration
    if (campaign.startTime && campaign.endTime && campaign.campaignDate) {
      try {
        // Create proper datetime objects for accurate duration calculation
        const startDateTime = new Date(`${campaign.campaignDate}T${campaign.startTime}`);
        const endDateTime = new Date(`${campaign.campaignDate}T${campaign.endTime}`);

        // Handle cases where end time might be on next day
        if (endDateTime < startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

        if (hours > 0 && hours < 24) { // Sanity check: reasonable campaign duration
          totalHours += hours;
          console.log(
            `⏱️ Campaign ${doc.id}: ${hours} hours (${campaign.startTime} - ${campaign.endTime})`
          );
        }
      } catch (error) {
        console.error(`Error calculating hours for campaign ${doc.id}:`, error);
      }
    }
  });

  await db.collection("users").doc(volunteerId).update({
    "metrics.volunteer.hoursVolunteered": totalHours,
    "metrics.volunteer.campaignsHeld": campaignsHeld,
    "updatedAt": new Date(),
  });

  console.log(`📊 Volunteer ${volunteerId} metrics: ${totalHours} hours, ${campaignsHeld} campaigns`);
}

async function recalculateReceiverMetrics(db: FirebaseFirestore.Firestore, receiverId: string) {
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