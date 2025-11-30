// api-backend/src/index.ts
import * as admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configure Firestore settings only once
admin.firestore().settings({ ignoreUndefinedProperties: true });

// Import function groups
export {deleteUserAccount} from "./admin-user";
export {
  adminDeleteFoodListing,
  adminApproveFoodListing,
  adminRejectFoodListing,
  adminMarkListingCompleted,
} from "./admin-food";
export {
  adminDeleteCampaign,
  adminApproveCampaign,
  adminRejectCampaign,
  adminUpdateCampaignStatus,
} from "./admin-campaigns";
export {foodStatusManager} from "./foodStatusManager";
export {campaignStatusManager} from "./campaignStatusManager";
export {geocodeAddress} from "./geocodeAddress";
export {updateRatingStats} from "./ratingAggregator";
export {
  onFoodListingUpdated,
  onCampaignUpdated,
  onReservationCompleted,
  onCampaignRegistrationAttended,
} from "./metricsTrigger"
export{
  dailyMetricsRecalculation,
} from "./dailyMetricRecalculation";
export { generateTestData } from './generateTestData';
export { cleanTestData } from './cleanTestData';
