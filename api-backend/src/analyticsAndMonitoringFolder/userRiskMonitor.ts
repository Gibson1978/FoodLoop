// functions/src/userRiskMonitor.ts (FINAL, V2-Compatible Version)

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore"; 
import * as admin from "firebase-admin";
import { logger } from "firebase-functions"; 
import { sendDualNotification } from '../NotificationFolder/notificationUtils'; 


if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// =================================================================
// 1. CONFIGURATION & CONSTANTS
// =================================================================

// --- Risk Thresholds ---
const RISK_WARNING_SCORE = 40;
const RISK_SUSPENSION_SCORE = 75;
const RISK_REMOVAL_SCORE = 95; // Score that triggers Manual Removal Review

// --- Suspension Triggers ---
const REPORT_BURST_COUNT = 3;
const REPORT_BURST_TIME_HOURS = 48;
const REPORT_CUMULATIVE_SUSPENSION = 5; 
const RATING_MIN_COUNT = 10; 
const RATING_SUSPENSION_THRESHOLD = 2.0; 
const NO_SHOW_TRIGGER_THRESHOLD = 3; 

// --- Demerit Points / Decay Factors ---
const DEMERIT_HIGH = 15;
const DEMERIT_MEDIUM = 7;
const DEMERIT_LOW = 2;
const DECAY_30_DAYS = 1.0;
const DECAY_90_DAYS = 0.7;
const DECAY_OVER_90_DAYS = 0.5;

// =================================================================
// 2. INTERFACES (Core Data Structures)
// =================================================================
interface UserData {
  id: string;
  role: 'donor' | 'volunteer' | 'receiver' | 'admin';
  status: 'approved' | 'pending' | 'suspended' | 'removed' | 'warn';
  email: string;
  profile: { name?: string; orgName?: string; };
  metrics?: any;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface ReportData {
  id: string;
  targetId: string;
  reportedUser: { id: string; type: string; };
  severity: 'low' | 'medium' | 'high';
  reason: string;
  createdAt: admin.firestore.Timestamp;
}

interface RatingData {
  id: string;
  ratedUserId: string;
  rating: number;
  createdAt: admin.firestore.Timestamp;
}

// =================================================================
// 3. CORE HELPER FUNCTIONS
// =================================================================

function safeDateConversion(dateValue: any): Date {
  if (dateValue?.toDate) return dateValue.toDate();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') return new Date(dateValue);
  return new Date(0);
}

function getDecayedReportScore(report: ReportData): number {
  const now = Date.now();
  const reportDate = safeDateConversion(report.createdAt).getTime();
  const daysOld = (now - reportDate) / (1000 * 60 * 60 * 24);

  let score = 0;
  switch (report.severity) {
    case 'high': score = DEMERIT_HIGH; break;
    case 'medium': score = DEMERIT_MEDIUM; break;
    case 'low': score = DEMERIT_LOW; break;
  }

  if (daysOld < 30) { return score * DECAY_30_DAYS; } 
  else if (daysOld < 90) { return score * DECAY_90_DAYS; } 
  else { return score * DECAY_OVER_90_DAYS; }
}

const verifyAdminByFirestore = async (uid: string): Promise<boolean> => {
    try {
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        return userData?.role === "admin" || userData?.isAdmin === true;
    } catch (error) {
        logger.error("Error verifying admin by Firestore:", error);
        return false;
    }
};

// =================================================================
// 4. MAIN RISK CALCULATION AND MONITORING LOGIC
// =================================================================

async function assessUserRisk(
  user: UserData,
  allReports: ReportData[],
  allRatings: RatingData[],
): Promise<{
  action: 'none' | 'warn' | 'suspend';
  score: number;
  reason: string;
  removalReviewRequired: boolean;
  // NEW: Return the breakdown to be saved
  reportBreakdown: { high: number; medium: number; low: number; }; 
}> {
  const userReports = allReports.filter(r => r.reportedUser.id === user.id);
  const userRatings = allRatings.filter(r => r.ratedUserId === user.id);

  let totalDemeritScore = 0;
  userReports.forEach(report => { totalDemeritScore += getDecayedReportScore(report); });
  
  // NEW: Calculate the report breakdown
  const reportBreakdown = userReports.reduce((acc, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, { high: 0, medium: 0, low: 0 } as { high: number; medium: number; low: number; });


  const avgRating = userRatings.length > 0 ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length : 5.0;
  const ratingPenalty = Math.max(0, (5 - avgRating) * 5);
  const riskScore = Math.min(100, Math.round(totalDemeritScore + ratingPenalty));

  let removalReviewRequired = false;
  let action: 'none' | 'warn' | 'suspend' = 'none';
  let reason: string = 'User activity is stable.';

  const burstReports = userReports.filter(r => safeDateConversion(r.createdAt).getTime() >= (Date.now() - (REPORT_BURST_TIME_HOURS * 3600000)));
  const noShowReports = userReports.filter(r => r.reason === 'no_show');

  // 1. HIGH RISK/REMOVAL FLAGGING (Score >= 95)
  if (riskScore >= RISK_REMOVAL_SCORE) {
    removalReviewRequired = true;
    action = 'suspend';
    reason = `RISK_SCORE_EXCEEDED (REMOVAL): Score ${riskScore} exceeds removal threshold of ${RISK_REMOVAL_SCORE}.`;
    return { action, score: riskScore, reason, removalReviewRequired, reportBreakdown };
  }

  // 2. Suspension Triggers
  if (
    burstReports.length >= REPORT_BURST_COUNT || 
    userReports.length >= REPORT_CUMULATIVE_SUSPENSION || 
    (userRatings.length >= RATING_MIN_COUNT && avgRating < RATING_SUSPENSION_THRESHOLD) ||
    (user.role !== 'donor' && noShowReports.length >= NO_SHOW_TRIGGER_THRESHOLD) ||
    riskScore >= RISK_SUSPENSION_SCORE
  ) {
    action = 'suspend';
    if (reason === 'User activity is stable.') {
      reason = `RISK_SCORE_EXCEEDED: Score ${riskScore} exceeds suspension threshold of ${RISK_SUSPENSION_SCORE}.`;
    }
    return { action, score: riskScore, reason, removalReviewRequired, reportBreakdown };
  }

  // 3. Warning Check
  if (riskScore >= RISK_WARNING_SCORE) {
    action = 'warn';
    reason = `RISK_SCORE_WARNING: Score ${riskScore} exceeds warning threshold of ${RISK_WARNING_SCORE}.`;
    return { action, score: riskScore, reason, removalReviewRequired, reportBreakdown };
  }

  return { action: 'none', score: riskScore, reason, removalReviewRequired: false, reportBreakdown };
}

async function executeRiskMonitoring(triggeringUserId?: string): Promise<{ processedUsers: number; actionsTaken: number; }> {
  
  let targetUserIds: string[] = [];

  if (triggeringUserId) {
    targetUserIds = [triggeringUserId];
  } else {
    // Only fetch approved, pending, warn, suspended users
    const snapshot = await db.collection('users').where('status', 'in', ['approved', 'pending', 'warn', 'suspended']).get();
    targetUserIds = snapshot.docs.map(doc => doc.id);
  }

  const userDocs = targetUserIds.length > 0 ? await db.getAll(...targetUserIds.map(id => db.collection('users').doc(id))) : [];
  const users = userDocs.map(doc => ({ id: doc.id, ...doc.data() }) as UserData);
  
  // Fetch ALL reports and ratings for full context/calculation
  const [reportsSnapshot, ratingsSnapshot] = await Promise.all([
    db.collection('reports').get(),
    db.collection('ratings').get(),
  ]);

  const allReports = reportsSnapshot.docs.map(doc => doc.data() as ReportData);
  const allRatings = ratingsSnapshot.docs.map(doc => doc.data() as RatingData);

  let actionsTaken = 0;
  const processedUsers: Promise<void>[] = [];

  for (const user of users) {
    processedUsers.push((async () => {
      const userReports = allReports.filter(r => r.reportedUser.id === user.id);
      const userRatings = allRatings.filter(r => r.ratedUserId === user.id);
      
      const { action, score, reason, removalReviewRequired, reportBreakdown } = await assessUserRisk(user, allReports, allRatings); // MODIFIED

      // --- UNCONDITIONAL BASE METRICS UPDATE (Guaranteed to create riskMetrics field) ---
      const updateData: any = {
        'riskMetrics.currentScore': score,
        'riskMetrics.lastChecked': admin.firestore.FieldValue.serverTimestamp(),
        'riskMetrics.removalReviewRequired': removalReviewRequired,
        'riskMetrics.totalReports': userReports.length, // Ensure totalReports is always updated
        'riskMetrics.reportBreakdown': reportBreakdown, // NEW: Save the severity breakdown
        
        // FIX: Start with current status and only change it if the calculated action demands it.
        status: user.status 
      };
      
      const isSignificantAction = (action !== 'none' && user.status !== action) || 
                                  (action === 'warn' && user.status !== 'warn' && user.status !== 'suspended' && user.status !== 'removed');
      
      if (isSignificantAction) { 
        
        // 1. Create Log for the risk event
        const logData = { 
          userId: user.id,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          actionTaken: action,
          finalRiskScore: score,
          triggerReason: reason,
          removalReviewRequired: removalReviewRequired,
          reportsSnapshot: userReports.map(r => ({ id: r.id, severity: r.severity, reason: r.reason, createdAt: r.createdAt })),
          userMetadata: {
            role: user.role,
            email: user.email,
            currentStatus: user.status,
            name: user.profile?.orgName || user.profile?.name || 'Unknown',
            totalReports: userReports.length,
            avgRating: userRatings.length > 0 ? (userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1) : 5.0,
          },
          reportBreakdown: reportBreakdown, // Save to log as well
        };
        const logRef = await db.collection('riskEventLogs').add(logData);

        updateData['riskMetrics.historyRef'] = logRef.id;

        // 2. Perform Action & Send Notification (MODIFIED STATUS UPDATE HERE)
        let notificationTitle: string = '';
        let notificationMessage: string = '';
        
        if (action === 'suspend') {
            updateData.status = 'suspended'; // Explicitly set to calculated status
            updateData['riskMetrics.suspensionReason'] = reason;
            updateData['riskMetrics.suspensionDate'] = admin.firestore.FieldValue.serverTimestamp();
            actionsTaken++;
            
            notificationTitle = "Account Suspended ❌";
            notificationMessage = `Your account was automatically suspended due to high risk factors. Score: ${score}.`;
            
        } else if (action === 'warn') {
            // Set to warn if calculated.
            updateData.status = 'warn'; 
            
            notificationTitle = "Risk Warning Issued ⚠️";
            notificationMessage = `Your recent activity triggered a risk warning (Score: ${score}). Please review guidelines.`;
        }

        if (notificationTitle) { 
            await sendDualNotification({
                recipientId: user.id,
                relatedEntityId: user.id,
                relatedEntityType: 'users',
                title: notificationTitle,
                message: notificationMessage,
                notificationType: action === 'suspend' ? 'risk_suspension' : 'risk_warning',
                fullDetails: `Trigger: ${reason}`
            });
        }
      } 
      
      // FIX: If action is 'none' but current status is 'warn', revert to 'approved'.
      // This is the only automatic status demotion. This preserves manual 'suspended' status.
      if (action === 'none' && user.status === 'warn') {
          updateData.status = 'approved';
      }
      
      // 3. FINAL UNCONDITIONAL WRITE 
      await db.collection('users').doc(user.id).set(updateData, { merge: true }); 

    })());
  }

  await Promise.all(processedUsers);

  return { processedUsers: users.length, actionsTaken };
}


// =================================================================
// 5. FIREBASE EXPORTS (V2 Triggers)
// =================================================================

// 5.1 SCHEDULED FUNCTION (V2 scheduler)
export const scheduleDailyRiskCheck = onSchedule("0 2 * * *", async (event) => {
  try {
    logger.info("Starting scheduled daily high-risk user monitor (V2).");
    const result = await executeRiskMonitoring();
    logger.info(`Scheduled check complete. Processed ${result.processedUsers} users. Took ${result.actionsTaken} actions.`);
  } catch (error) {
    logger.error("Scheduled risk monitor failed:", error);
  }
});


/**
 * 5.2 DATABASE TRIGGER (V2 firestore.onDocumentWritten)
 */
export const onReportWrite = onDocumentWritten('reports/{reportId}', async (event) => {
    
    const afterData = event.data?.after.data() as ReportData | undefined;
    
    if (!event.data?.after.exists) {
        return null;
    }

    const reportedUserId = afterData?.reportedUser?.id;
    if (!reportedUserId) {
        logger.warn("Report document missing reported user ID.", { reportId: event.params.reportId });
        return null;
    }

    logger.info(`Real-time risk check triggered for user: ${reportedUserId} due to report write (V2).`);
    
    await executeRiskMonitoring(reportedUserId);
    
    return null;
});


/**
 * 5.3 HTTPS Callable function (V2 https.onCall)
 */
export const triggerRiskCheckOnRequest = onCall(
  { timeoutSeconds: 540, memory: "1GiB" },
  async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }
    
    const isAdmin = await verifyAdminByFirestore(request.auth.uid);
    if (!isAdmin) {
        logger.error('Unauthorized access attempt to triggerRiskCheckOnRequest', { uid: request.auth.uid });
        throw new HttpsError("permission-denied", "Admin privileges required to trigger this function.");
    }

    try {
      logger.info("Starting on-request high-risk user monitor triggered by admin.", { adminUid: request.auth.uid });
      const result = await executeRiskMonitoring(); 
      return {
        status: "success",
        message: `Risk monitoring complete. Processed ${result.processedUsers} users and took ${result.actionsTaken} actions.`,
        data: result
      };
    } catch (error) {
      logger.error("On-request risk monitor failed:", error);
      throw new HttpsError("internal", `Risk monitoring failed: ${error}`);
    }
  }
);