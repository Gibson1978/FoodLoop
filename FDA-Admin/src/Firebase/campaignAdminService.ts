// FDA-Admin/src/firebase/campaignAdminService.ts - UPDATED with Cancellation Function
import { httpsCallable } from 'firebase/functions';
import { functions } from './Firebase';

// Define the expected return type
interface AdminOperationResult {
  success: boolean;
  message: string;
}

export const adminDeleteCampaign = async (campaignId: string): Promise<AdminOperationResult> => {
  const deleteCampaign = httpsCallable<{ campaignId: string }, AdminOperationResult>(
    functions, 
    'adminDeleteCampaign'
  );
  const result = await deleteCampaign({ campaignId });
  return result.data;
};

export const adminApproveCampaign = async (campaignId: string): Promise<AdminOperationResult> => {
  const approveCampaign = httpsCallable<{ campaignId: string }, AdminOperationResult>(
    functions, 
    'adminApproveCampaign'
  );
  const result = await approveCampaign({ campaignId });
  return result.data;
};

export const adminRejectCampaign = async (campaignId: string, reason?: string): Promise<AdminOperationResult> => {
  const rejectCampaign = httpsCallable<{ campaignId: string; reason?: string }, AdminOperationResult>(
    functions, 
    'adminRejectCampaign'
  );
  const result = await rejectCampaign({ campaignId, reason });
  return result.data;
};

export const adminUpdateCampaignStatus = async (campaignId: string, status: string): Promise<AdminOperationResult> => {
  const updateStatus = httpsCallable<{ campaignId: string; status: string }, AdminOperationResult>(
    functions, 
    'adminUpdateCampaignStatus'
  );
  const result = await updateStatus({ campaignId, status });
  return result.data;
};

// NEW FUNCTION: For Admin to cancel an active campaign and clean up registrations
export const adminCancelCampaign = async (campaignId: string, reason: string): Promise<AdminOperationResult> => {
  const cancelCampaign = httpsCallable<{ campaignId: string; reason: string }, AdminOperationResult>(
    functions, 
    'adminOrUserCancelCampaign'
  );
  // Pass the campaignId and reason to the newly created Cloud Function
  const result = await cancelCampaign({ campaignId, reason }); 
  return result.data;
};