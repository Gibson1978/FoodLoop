// src/firebase/adminFoodService.ts - UPDATED with Cancellation Function
import { httpsCallable } from 'firebase/functions';
import { functions } from './Firebase';

// Define the expected return type
interface AdminOperationResult {
  success: boolean;
  message: string;
}

export const adminDeleteFoodListing = async (listingId: string): Promise<AdminOperationResult> => {
  const deleteFoodListing = httpsCallable<{ listingId: string }, AdminOperationResult>(
    functions, 
    'adminDeleteFoodListing'
  );
  const result = await deleteFoodListing({ listingId });
  return result.data;
};

export const adminApproveFoodListing = async (listingId: string): Promise<AdminOperationResult> => {
  const approveFoodListing = httpsCallable<{ listingId: string }, AdminOperationResult>(
    functions, 
    'adminApproveFoodListing'
  );
  const result = await approveFoodListing({ listingId });
  return result.data;
};

export const adminRejectFoodListing = async (listingId: string, reason?: string): Promise<AdminOperationResult> => {
  const rejectFoodListing = httpsCallable<{ listingId: string; reason?: string }, AdminOperationResult>(
    functions, 
    'adminRejectFoodListing'
  );
  const result = await rejectFoodListing({ listingId, reason });
  return result.data;
};

export const adminMarkListingCompleted = async (listingId: string): Promise<AdminOperationResult> => {
  const markCompleted = httpsCallable<{ listingId: string }, AdminOperationResult>(
    functions, 
    'adminMarkListingCompleted'
  );
  const result = await markCompleted({ listingId });
  return result.data;
};

export const adminCancelFoodListing = async (listingId: string, reason: string): Promise<AdminOperationResult> => {
  const cancelListing = httpsCallable<{ listingId: string; reason: string }, AdminOperationResult>(
    functions, 
    'adminOrUserCancelFoodListing'
  );
  // Pass the listingId and reason to the newly created Cloud Function
  const result = await cancelListing({ listingId, reason }); 
  return result.data;
};