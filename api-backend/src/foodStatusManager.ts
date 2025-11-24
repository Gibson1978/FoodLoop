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
    const bufferTime = 30 * 60 * 1000; // 30 minutes buffer

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

      // 1. Handle APPROVED listings - complete if expired/out of stock
      const approvedQuery = db.collection("foodListings")
        .where("status", "==", "approved");

      const approvedSnapshot = await approvedQuery.get();

      if (!approvedSnapshot.empty) {
        approvedSnapshot.forEach((doc) => {
          const data = doc.data();
          const endDateTime = createLocalDateTime(data.availableDate, data.endTime);

          console.log(`Checking food listing ${doc.id}:`);
          console.log(`- availableDate: ${data.availableDate}`);
          console.log(`- endTime: ${data.endTime}`);
          console.log(`- endDateTime: ${endDateTime.toISOString()}`);
          console.log(`- now: ${now.toISOString()}`);
          console.log(`- isExpired: ${endDateTime < now}`);
          console.log(`- remainingQuantity: ${data.remainingQuantity}`);
          console.log(`- shouldComplete: ${endDateTime < now || data.remainingQuantity <= 0}`);

          // Complete if expired or out of stock
          if (endDateTime < now || data.remainingQuantity <= 0) {
            batch.update(doc.ref, {
              status: "completed",
              updatedAt: new Date(),
            });
            completedCount++;
            console.log(`Marking food listing ${doc.id} as COMPLETED`);
          }
        });
      } else {
        console.log("Food Status Manager: No approved listings found");
      }

      // 2. Handle PENDING listings - reject if significantly expired
      const pendingQuery = db.collection("foodListings")
        .where("status", "==", "pending");

      const pendingSnapshot = await pendingQuery.get();

      if (!pendingSnapshot.empty) {
        pendingSnapshot.forEach((doc) => {
          const data = doc.data();
          const endDateTime = createLocalDateTime(data.availableDate, data.endTime);

          // Reject if significantly expired (with buffer)
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
      console.log(
        `Food Status Manager: Completed ${completedCount} listings, ` +
        `Rejected ${rejectedCount} pending listings`
      );
    } catch (error) {
      console.error("Error in food status manager:", error);
    }
  }
);