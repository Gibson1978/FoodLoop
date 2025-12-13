// functions/src/userManagementNotifications.ts (FINAL V2 TRIGGERS)

// Import V2 trigger functions
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { sendDualNotification } from './notificationUtils'; 
import { sendApprovalEmail } from './emailUtils'; 


// --- Case 6: Registration Approved (Sends Email) ---
/**
 * Triggers when a user's document is updated.
 * Sends a welcome/approval email if the status changes from anything to 'approved' (Case 6).
 */
export const onUserRegistrationApprovedV2 = onDocumentUpdated({
    document: 'users/{userId}',
    secrets: ['SENDGRID_API_KEY_CLEAN']
}, async (event) => {
    
    // 1. Data Check (More robust for onDocumentUpdated)
    if (!event.data || !event.data.before || !event.data.after) {
        console.log("Firestore event received, but missing BEFORE or AFTER data. Aborting function execution.");
        return null;
    }
    
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const userId = event.params.userId;

    const statusBefore = beforeData.status;
    const statusAfter = afterData.status;

    // 2. Trigger Condition Check
    if (statusBefore !== 'approved' && statusAfter === 'approved') {
        
        const userEmail = afterData.email;
        // Use a safe way to get the user's name
        const userName = afterData.profile?.name || 
                         afterData.profile?.orgName || 
                         afterData.profile?.contactPerson || 
                         'Valued User';

        console.log(`[Case 6] Detected registration approval for user ${userId} (${userEmail}). Sending email.`);
        
        if (userEmail) {
            // 3. Call the utility function (which handles the secret internally)
            await sendApprovalEmail(userEmail, userName);
            console.log(`[Case 6] Successfully sent approval email to ${userEmail}.`);
        } else {
            console.warn(`[Case 6] User ${userId} is approved but has no email address.`);
        }
        
        return null;
    }
    
    // Document was updated, but not for approval status—exit normally.
    return null;
});


// --- Case 5: Admin Response to Report (Sends Push/History) ---
/**
 * Triggers when a report document is updated (i.e., when an admin acts on it).
 * Sends notifications to the reporter about the report's progress (Case 5).
 */
export const onReportStatusUpdated = onDocumentUpdated('reports/{reportId}', async (event) => {
    
    if (!event.data) {
        console.log("No data found in event. Aborting.");
        return null;
    }
    
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const reportId = event.params.reportId;

    const statusBefore = beforeData.status;
    const statusAfter = afterData.status;
    const adminNotesBefore = beforeData.adminNotes;
    const adminNotesAfter = afterData.adminNotes;

    // Condition to trigger notification: Status change OR Admin Note added/changed (unless going from resolved/dismissed to itself)
    const isStatusUpdate = statusBefore !== statusAfter && (statusAfter === 'under_review' || statusAfter === 'resolved' || statusAfter === 'dismissed');
    // Trigger if admin notes change AND the new note isn't empty, regardless of status (as admin might just add notes to pending/review)
    const isNoteUpdate = adminNotesBefore !== adminNotesAfter && adminNotesAfter; 
    
    if (isStatusUpdate || isNoteUpdate) {
        
        const reporter = afterData.reporterUser;

        if (!reporter?.id) {
            console.log(`[Case 5] Report ${reportId} has no reporter ID. Skipping notification.`);
            return null;
        }

        const resolutionType = statusAfter === 'resolved' ? 'Resolved' : 
            statusAfter === 'dismissed' ? 'Dismissed' : 
            statusAfter === 'under_review' ? 'Under Review' : 'Response Sent';
        
        // Refined messaging to include admin note if present
        const noteSnippet = adminNotesAfter ? `: "${adminNotesAfter.substring(0, 50)}..."` : '.';

        let titleMessage: string;
        let bodyMessage: string;

        if (isStatusUpdate) {
            titleMessage = `Report Status: ${resolutionType}`;
            bodyMessage = `Your report regarding "${afterData.targetName}" is now ${resolutionType}. An admin responded${noteSnippet}`;
        } else { // isNoteUpdate only
            titleMessage = `Admin Response Received`;
            bodyMessage = `An admin has added notes to your report regarding "${afterData.targetName}". Status: ${statusAfter}`;
        }
        
        const adminNoteText = adminNotesAfter || 'No specific notes were provided.';

        // --- Send Notification to REPORTER (Case 5) ---
        await sendDualNotification({
            recipientId: reporter.id,
            relatedEntityId: reportId,
            relatedEntityType: 'reports',
            title: titleMessage,
            message: bodyMessage,
            notificationType: 'report_response',
            fullDetails: `Resolution Status: ${statusAfter}. Admin Note: ${adminNoteText}`
        });

        return null;
    }

    return null;
});

export const onUserSuspended = onDocumentUpdated('users/{userId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return null;
    
    // Check for status change to 'rejected' (used for suspension in client-side)
    const statusBefore = beforeData.status;
    const statusAfter = afterData.status;
    const userId = event.params.userId;

    if (statusBefore !== 'rejected' && statusAfter === 'rejected') {
        const userEmail = afterData.email;
        const reason = afterData.riskMetrics?.suspensionReason || 'Administrator action.';
        
        console.log(`[Case 7] Detected user suspension for ${userId}. Sending notification.`);

        // --- Send Notification to User ---
        await sendDualNotification({
            recipientId: userId,
            relatedEntityId: userId,
            relatedEntityType: 'users',
            title: "Account Suspended ⚠️",
            message: `Your account status has been changed to suspended. Please review your user history.`,
            notificationType: 'user_status',
            fullDetails: `Reason: ${reason}. You will be unable to perform actions until reactivated.`
        });
        
        return null;
    }
    return null;
});

export const onUserActivated = onDocumentUpdated('users/{userId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return null;
    
    // Check for status change to 'approved' from 'rejected' (reactivation)
    const statusBefore = beforeData.status;
    const statusAfter = afterData.status;
    const userId = event.params.userId;

    if (statusBefore === 'rejected' && statusAfter === 'approved') {
        
        console.log(`[Case 8] Detected user reactivation for ${userId}. Sending notification.`);

        // --- Send Notification to User ---
        await sendDualNotification({
            recipientId: userId,
            relatedEntityId: userId,
            relatedEntityType: 'users',
            title: "Account Activated! ✅",
            message: `Your account has been reactivated. You can now resume normal platform activities.`,
            notificationType: 'user_status',
            fullDetails: `Thank you for addressing the past issues. Welcome back!`
        });
        
        return null;
    }
    return null;
});

