// FDA-Admin/src/firebase/foodAdmin.ts - FIXED WITH EXPORTS
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy,
  getDoc,
  onSnapshot,
  type Unsubscribe as FirebaseUnsubscribe
} from 'firebase/firestore';
import { db } from './Firebase';
import { isCurrentUserAdmin } from './auth';
import {
  adminApproveFoodListing,
  adminRejectFoodListing,
  adminDeleteFoodListing,
  adminMarkListingCompleted
} from './foodAdminService';

export interface FoodListing {
  id?: string;
  title: string;
  description: string;
  category: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  totalQuantity: number;
  remainingQuantity: number;
  reservedQuantity?: number;
  collectedQuantity?: number;
  quantityUnit: string;
  expiryDate: string;
  tags: string[];
  pickupAddress: string;
  pickupInstructions: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  donorId: string;
  donorName: string;
  donorEmail: string;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  rating?: number;
  totalRatings?: number;
  ratings?: any[];
  // ADD MISSING FIELDS TO MATCH USER INTERFACE
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const FOOD_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type FoodStatus = typeof FOOD_STATUS[keyof typeof FOOD_STATUS];

// Export Unsubscribe type
export type Unsubscribe = FirebaseUnsubscribe;

// REAL-TIME: Get pending food listings with live updates
export const getPendingFoodListings = (
  onUpdate: (listings: FoodListing[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'foodListings'),
      where('status', '==', FOOD_STATUS.PENDING),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const listings: FoodListing[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listings.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as FoodListing);
        });
        onUpdate(listings);
      },
      (error) => {
        console.error('Real-time pending food listings error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time pending food listings:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get all food listings with live updates
export const getAllFoodListings = (
  onUpdate: (listings: FoodListing[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'foodListings'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const listings: FoodListing[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listings.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as FoodListing);
        });
        onUpdate(listings);
      },
      (error) => {
        console.error('Real-time all food listings error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time all food listings:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get completed listings with live updates
export const getCompletedListings = (
  onUpdate: (listings: FoodListing[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'foodListings'),
      where('status', '==', FOOD_STATUS.COMPLETED),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const listings: FoodListing[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listings.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as FoodListing);
        });
        onUpdate(listings);
      },
      (error) => {
        console.error('Real-time completed listings error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time completed listings:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// ACTION FUNCTIONS - Now using server functions
export const approveFoodListing = async (listingId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminApproveFoodListing(listingId);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error approving food listing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to approve listing' 
    };
  }
};

export const rejectFoodListing = async (listingId: string, reason?: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminRejectFoodListing(listingId, reason);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error rejecting food listing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to reject listing' 
    };
  }
};

export const deleteFoodListingAdmin = async (listingId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminDeleteFoodListing(listingId);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error deleting food listing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete listing' 
    };
  }
};

export const markListingAsCompleted = async (listingId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required' 
      };
    }

    const result = await adminMarkListingCompleted(listingId);
    return { success: result.success, error: result.success ? undefined : result.message };
  } catch (error) {
    console.error('Error marking listing as completed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to mark listing as completed' 
    };
  }
};

// Debug function to test URL parsing (Read-only)
export const debugImageUrls = async (listingId: string): Promise<{ urls: string[], paths: string[] }> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Admin privileges required");
    }

    const listingDoc = await getDoc(doc(db, 'foodListings', listingId));
    
    if (!listingDoc.exists()) {
      throw new Error("Food listing not found");
    }

    const listingData = listingDoc.data() as FoodListing;
    const paths: string[] = [];

    if (listingData.images && listingData.images.length > 0) {
      listingData.images.forEach((imageUrl) => {
        const filePath = extractFilePathFromUrl(imageUrl);
        paths.push(filePath || 'Could not extract path');
      });
    }

    return {
      urls: listingData.images || [],
      paths
    };
  } catch (error) {
    console.error("Error debugging image URLs:", error);
    throw error;
  }
};

// Helper function to extract file path from storage URL (Read-only)
const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    const pathMatch = pathname.match(/\/o\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      const encodedPath = pathMatch[1];
      const decodedPath = decodeURIComponent(encodedPath);
      return decodedPath;
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting file path from URL:", error, url);
    return null;
  }
};