import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";

export const campaignStatusManager = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "UTC",
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const ratingGracePeriod = 24 * 60 * 60 * 1000; // 24 hours grace period for ratings
    const pendingBufferTime = 24 * 60 * 60 * 1000; // 24 hours buffer for pending campaigns

    // Early return: Skip during low-activity hours (12 AM - 6 AM UTC)
    const hour = now.getUTCHours();
    if (hour >= 0 && hour < 6) {
      console.log("Campaign Status Manager: Skipping during low-activity hours");
      return;
    }

    try {
      let completedCount = 0;
      let cancelledCount = 0;
      const batch = db.batch();

      console.log("Campaign Status Manager: Starting hourly check...");

      // Helper function - assume times are in Malaysia time (UTC+8)
      const createLocalDateTime = (dateStr: string, timeStr: string): Date => {
        return new Date(`${dateStr}T${timeStr}:00+08:00`);
      };

      // 1. Handle ONGOING campaigns - complete if expired AND grace period has passed
      const ongoingQuery = db.collection("campaigns")
        .where("status", "==", "ongoing");

      const ongoingSnapshot = await ongoingQuery.get();

      if (!ongoingSnapshot.empty) {
        ongoingSnapshot.forEach((doc) => {
          const data = doc.data();
          const endDateTime = createLocalDateTime(data.campaignDate, data.endTime);
          const completionDeadline = new Date(endDateTime.getTime() + ratingGracePeriod);

          console.log(`Checking campaign ${doc.id}:`);
          console.log(`- campaignDate: ${data.campaignDate}`);
          console.log(`- endTime: ${data.endTime}`);
          console.log(`- endDateTime: ${endDateTime.toISOString()}`);
          console.log(`- completionDeadline: ${completionDeadline.toISOString()}`);
          console.log(`- now: ${now.toISOString()}`);
          console.log(`- isPastDeadline: ${completionDeadline < now}`);

          // Complete only if past the completion deadline (end time + grace period)
          if (completionDeadline < now) {
            batch.update(doc.ref, {
              status: "completed",
              updatedAt: new Date(),
            });
            completedCount++;
            console.log(`Marking campaign ${doc.id} as COMPLETED (past grace period)`);
          }
        });
      } else {
        console.log("Campaign Status Manager: No ongoing campaigns found");
      }

      // 2. Handle PENDING campaigns - cancel if significantly expired
      const pendingQuery = db.collection("campaigns")
        .where("status", "==", "pending");

      const pendingSnapshot = await pendingQuery.get();

      if (!pendingSnapshot.empty) {
        pendingSnapshot.forEach((doc) => {
          const data = doc.data();
          const endDateTime = createLocalDateTime(data.campaignDate, data.endTime);

          console.log(`Checking pending campaign ${doc.id}:`);
          console.log(`- endDateTime: ${endDateTime.toISOString()}`);
          console.log(`- buffer cutoff: ${new Date(now.getTime() - pendingBufferTime).toISOString()}`);

          // Cancel if significantly expired (with buffer) - no grace period for pending
          const isSignificantlyExpired = endDateTime < new Date(now.getTime() - pendingBufferTime);

          if (isSignificantlyExpired) {
            batch.update(doc.ref, {
              status: "cancelled",
              cancellationReason: "Auto-cancelled: Campaign expired",
              updatedAt: new Date(),
            });
            cancelledCount++;
            console.log(`Marking pending campaign ${doc.id} as CANCELLED`);
          }
        });
      } else {
        console.log("Campaign Status Manager: No pending campaigns found");
      }

      // Early return: No changes needed
      if (completedCount === 0 && cancelledCount === 0) {
        console.log("Campaign Status Manager: No status changes needed");
        return;
      }

      // Commit changes if any
      await batch.commit();
      if (completedCount > 0) {
        console.log("🔄 Recalculating metrics for completed campaigns...");
        // Get unique organizer IDs from completed campaigns
        const organizerIds = new Set<string>();
        ongoingSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "completed") {
            organizerIds.add(data.organizerId);
          }
        });

        // Recalculate metrics for each organizer
        for (const organizerId of organizerIds) {
          try {
            await calculateVolunteerMetrics(db, organizerId);
          } catch (error) {
            console.error(`Error recalculating metrics for organizer ${organizerId}:`, error);
          }
        }
      }
      console.log(
        `Campaign Status Manager: Completed ${completedCount} campaigns, ` +
        `Cancelled ${cancelledCount} pending campaigns`
      );
    } catch (error) {
      console.error("Error in campaign status manager:", error);
    }
  }
);

function calculateVolunteerMetrics(db: FirebaseFirestore.Firestore, organizerId: string) {
  throw new Error("Function not implemented.");
}
