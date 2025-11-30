import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";

export const foodStatusManager = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "UTC",
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const bufferTime = 30 * 60 * 1000; // 30 minutes buffer for pending listings
    const ratingGracePeriod = 24 * 60 * 60 * 1000; // 24 hours grace period for ratings

    // Early return: Skip during low-activity hours (12 AM - 6 AM UTC)
    const hour = now.getUTCHours();
    if (hour >= 0 && hour < 6) {
      console.log("Food Status Manager: Skipping during low-activity hours");
      return;
    }

    try {
      let completedCount = 0;
      let rejectedCount = 0;
      const batch = db.batch();

      console.log("Food Status Manager: Starting hourly check...");

      // Helper function - assume times are in Malaysia time (UTC+8)
      const createLocalDateTime = (dateStr: string, timeStr: string): Date => {
        return new Date(`${dateStr}T${timeStr}:00+08:00`);
      };

      // 1. Handle APPROVED listings - complete if expired AND grace period has passed
      const approvedQuery = db.collection("foodListings")
        .where("status", "==", "approved");

      const approvedSnapshot = await approvedQuery.get();

      if (!approvedSnapshot.empty) {
        approvedSnapshot.forEach((doc) => {
          const data = doc.data();
          const endDateTime = createLocalDateTime(data.availableDate, data.endTime);
          const completionDeadline = new Date(endDateTime.getTime() + ratingGracePeriod);

          console.log(`Checking food listing ${doc.id}:`);
          console.log(`- availableDate: ${data.availableDate}`);
          console.log(`- endTime: ${data.endTime}`);
          console.log(`- endDateTime: ${endDateTime.toISOString()}`);
          console.log(`- completionDeadline: ${completionDeadline.toISOString()}`);
          console.log(`- now: ${now.toISOString()}`);
          console.log(`- isPastDeadline: ${completionDeadline < now}`);
          console.log(`- remainingQuantity: ${data.remainingQuantity}`);

          // Complete only if past the completion deadline (end time + grace period)
          // This gives users time to rate after the actual end time
          if (completionDeadline < now) {
            batch.update(doc.ref, {
              status: "completed",
              updatedAt: new Date(),
            });
            completedCount++;
            console.log(`Marking food listing ${doc.id} as COMPLETED (past grace period)`);
          }
        });
      } else {
        console.log("Food Status Manager: No approved listings found");
      }

      // 2. Handle PENDING listings - reject if significantly expired (no grace period for pending)
      const pendingQuery = db.collection("foodListings")
        .where("status", "==", "pending");

      const pendingSnapshot = await pendingQuery.get();

      if (!pendingSnapshot.empty) {
        pendingSnapshot.forEach((doc) => {
          const data = doc.data();
          const endDateTime = createLocalDateTime(data.availableDate, data.endTime);

          // Reject if significantly expired (with buffer) - no grace period for pending
          const isSignificantlyExpired = endDateTime < new Date(now.getTime() - bufferTime);

          if (isSignificantlyExpired) {
            batch.update(doc.ref, {
              status: "rejected",
              rejectionReason: "Auto-rejected: Food listing expired",
              updatedAt: new Date(),
            });
            rejectedCount++;
            console.log(`Marking pending food listing ${doc.id} as REJECTED`);
          }
        });
      } else {
        console.log("Food Status Manager: No pending listings found");
      }

      // Early return: No changes needed
      if (completedCount === 0 && rejectedCount === 0) {
        console.log("Food Status Manager: No status changes needed");
        return;
      }

      // Commit changes if any
      await batch.commit();

      if (completedCount > 0) {
        console.log("🔄 Recalculating metrics for completed food listings...");
        // Get unique donor IDs from completed listings
        const donorIds = new Set<string>();
        approvedSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "completed") {
            donorIds.add(data.donorId);
          }
        });

        // Recalculate metrics for each donor
        for (const donorId of donorIds) {
          try {
            await calculateDonorMetrics(db, donorId);
          } catch (error) {
            console.error(`Error recalculating metrics for donor ${donorId}:`, error);
          }
        }
      }
      console.log(
        `Food Status Manager: Completed ${completedCount} listings, ` +
        `Rejected ${rejectedCount} pending listings`
      );
    } catch (error) {
      console.error("Error in food status manager:", error);
    }
  }
);

function calculateDonorMetrics(db: FirebaseFirestore.Firestore, donorId: string) {
  throw new Error("Function not implemented.");
}
