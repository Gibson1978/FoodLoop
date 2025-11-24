// FDA-Admin/src/firebase/campaignAdmin.ts - FIXED WITH EXPORTS
import { 
  collection, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  type Unsubscribe as FirebaseUnsubscribe
} from 'firebase/firestore';
import { db } from './Firebase';
import { isCurrentUserAdmin } from './auth';
import {
  adminApproveCampaign,
  adminRejectCampaign,
  adminDeleteCampaign,
  adminUpdateCampaignStatus,
} from './campaignAdminService';

export interface Campaign {
  id?: string;
  title: string;
  description: string;
  category: string;
  campaignDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  fullAddress: string;
  totalSpots: number;
  registeredSpots: number;
  availableSpots: number;
  images: string[];
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  organizerOrg?: string;
  rating?: number;
  totalRatings?: number;
  ratings?: any[];
  // ADD MISSING FIELDS TO MATCH USER INTERFACE
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CAMPAIGN_STATUS = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];

// Export Unsubscribe type
export type Unsubscribe = FirebaseUnsubscribe;

// REAL-TIME: Get pending campaigns with live updates
export const getPendingCampaigns = (
  onUpdate: (campaigns: Campaign[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', CAMPAIGN_STATUS.PENDING),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const campaigns: Campaign[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          campaigns.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as Campaign);
        });
        onUpdate(campaigns);
      },
      (error) => {
        console.error('Real-time pending campaigns error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time pending campaigns:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get all campaigns with live updates
export const getAllCampaigns = (
  onUpdate: (campaigns: Campaign[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const campaigns: Campaign[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          campaigns.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as Campaign);
        });
        onUpdate(campaigns);
      },
      (error) => {
        console.error('Real-time all campaigns error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time all campaigns:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get completed campaigns with live updates
export const getCompletedCampaigns = (
  onUpdate: (campaigns: Campaign[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', CAMPAIGN_STATUS.COMPLETED),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const campaigns: Campaign[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          campaigns.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as Campaign);
        });
        onUpdate(campaigns);
      },
      (error) => {
        console.error('Real-time completed campaigns error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time completed campaigns:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// ACTION FUNCTIONS - Using server functions
export const approveCampaign = async (campaignId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminApproveCampaign(campaignId);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error approving campaign:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to approve campaign' 
    };
  }
};

export const rejectCampaign = async (campaignId: string, reason?: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminRejectCampaign(campaignId, reason);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error rejecting campaign:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to reject campaign' 
    };
  }
};

export const deleteCampaignAdmin = async (campaignId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminDeleteCampaign(campaignId);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete campaign' 
    };
  }
};

export const updateCampaignStatus = async (campaignId: string, status: CampaignStatus): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminUpdateCampaignStatus(campaignId, status);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error updating campaign status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update campaign status' 
    };
  }
};