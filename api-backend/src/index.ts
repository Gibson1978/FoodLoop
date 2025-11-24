// api-backend/src/index.ts
import * as admin from "firebase-admin";

admin.initializeApp();

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
  onFoodListingCompleted,
  onCampaignCompleted,
  onReservationCompleted,
  onCampaignRegistrationAttended,
} from "./metricsTrigger"