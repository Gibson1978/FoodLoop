// api-backend/src/index.ts
import * as admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configure Firestore settings only once
admin.firestore().settings({ ignoreUndefinedProperties: true });

// Import function groups
export {  
  deleteUserAccount, 
  approveUserRegistration, 
  rejectUserRegistration,
  restoreRejectedUser,
  suspendUser,
  activateUser} from "./adminFolder/admin-user";

export {
  adminDeleteFoodListing,
  adminApproveFoodListing,
  adminRejectFoodListing,
  adminMarkListingCompleted,
  adminOrUserCancelFoodListing,
} from "./adminFolder/admin-food";

export {
  adminDeleteCampaign,
  adminApproveCampaign,
  adminRejectCampaign,
  adminUpdateCampaignStatus,
  adminOrUserCancelCampaign,
} from "./adminFolder/admin-campaigns";

export { adminUpdateReportStatus } from "./adminFolder/admin-report"

export {foodStatusManager} from "./foodStatusManager";

export {campaignStatusManager} from "./campaignStatusManager";

export {geocodeAddress} from "./geocodeAddress";

export {updateRatingStats} from "./MetricsCalcFolder/ratingAggregator";

export {
  onFoodListingUpdated,
  onCampaignUpdated,
  onReservationCompleted,
  onCampaignRegistrationAttended,
} from "./MetricsCalcFolder/metricsTrigger"

export{
  dailyMetricsRecalculation,
} from "./MetricsCalcFolder/dailyMetricRecalculation";

export { 
  generateTestData, 
  generateRelationshipsOnly  } from './TestDataFolder/generateTestData'

export { cleanTestData } from './TestDataFolder/cleanTestData';

export { 
  calculateAnalytics,
  calculateAnalyticsManual} from './analyticsAndMonitoringFolder/analyticsCalculator'

export {adminAiChat} from './adminFolder/admin-AI'

export {
  scheduleDailyRiskCheck, 
  triggerRiskCheckOnRequest, 
  onReportWrite } from './analyticsAndMonitoringFolder/userRiskMonitor'

export {
  onFoodReservationMade,
  onCampaignRegistered, 
  onFoodListingCancelled, 
  onCampaignCancelled, 
  onCampaignApproved, 
  onFoodListingApproved} from './NotificationFolder/transactionNotification'

export {
  onUserRegistrationApprovedV2,
  onReportStatusUpdated, 
  onUserActivated, 
  onUserSuspended } from './NotificationFolder/userNotification'

export {getContactDetails} from './getContact'

export {reserveFoodCF, completeFoodReservationCF ,cancelFoodReservationCF} from './clientFolder/user-Food'

export {registerForCampaignCF, completeCampaignRegistrationCF, cancelCampaignRegistrationCF} from './clientFolder/user-Campaign'

export {markAllNotificationsAsReadCF,submitRatingCF} from './clientFolder/user-Utils'