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
export { generateTestData, generateRelationshipsOnly  } from './TestDataFolder/generateTestData'
export { cleanTestData } from './TestDataFolder/cleanTestData';
export { calculateAnalytics, calculateAnalyticsManual} from './analyticsCalculator'
