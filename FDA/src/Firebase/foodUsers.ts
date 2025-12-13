// FDA/src/firebase/food.ts - USER FUNCTIONS WITH REAL-TIME UPDATES
import { 
  collection, 
  addDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  getDoc,
  updateDoc, 
  serverTimestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { geocodeAddress} from '../UnifiedFolder/LocationFolder/useGeocoding';
import { DashboardService } from '../UnifiedFolder/services/DashboardServices';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface FoodListing {
  id?: string;
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  quantityUnit: string;
  remainingQuantity: number;
  reservedQuantity: number;
  collectedQuantity: number;
  expiryDate: string;
  tags: string[];
  pickupAddress: string;
  pickupInstructions: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  images: string[];
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  donorId: string;
  donorName: string; 
  donorEmail: string;
  donorType: string; 
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  rating?: number;
  totalRatings?: number;
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodListingInput {
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  quantityUnit: string;
  expiryDate: string;
  tags: string[];
  pickupAddress: string;
  pickupInstructions: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
}


export const FOOD_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

export interface FoodListingInput {
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  quantityUnit: string;
  expiryDate: string;
  tags: string[];
  pickupAddress: string;
  pickupInstructions: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
}


// USER FUNCTIONS

// ORIGINAL FUNCTIONS (keep for compatibility)
export const uploadFoodListing = async (
  foodData: FoodListingInput, 
  images: File[]
): Promise<{success: boolean; error?: string; listingId?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    console.log('🔍 Starting upload process for user:', user.uid);

    // Get donor type and name from user profile
    let donorType = 'individual';
    let donorName = user.displayName || 'Anonymous Donor';
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        donorType = userData.profile?.orgType || 'individual';
        donorName = userData.profile?.orgName || userData.profile?.contactPerson || user.displayName || 'Anonymous Donor';
        console.log('✅ Retrieved donor info:', { donorType, donorName });
      }
    } catch (userError) {
      console.warn('⚠️ Could not fetch user profile:', userError);
    }

    // Improved geocoding with better error handling
    let geolocation = null;
    if (foodData.pickupAddress) {
      try {
        geolocation = await geocodeAddress(foodData.pickupAddress);
        if (geolocation) {
          console.log('✅ Address geocoded successfully');
        } else {
          console.log('ℹ️ No coordinates obtained, proceeding without geolocation');
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding failed, proceeding without coordinates');
        // Don't throw error - continue without coordinates
      }
    }

    // Upload images
    const imageUrls: string[] = [];
    for (const image of images) {
      const imageRef = ref(storage, `Food_Images/${user.uid}/${Date.now()}-${image.name}`);
      const snapshot = await uploadBytes(imageRef, image);
      const downloadURL = await getDownloadURL(snapshot.ref);
      imageUrls.push(downloadURL);
    }

    // Prepare listing data with proper null handling for geolocation
    const listingData: Omit<FoodListing, 'id'> = {
      ...foodData,
      images: imageUrls,
      status: FOOD_STATUS.PENDING,
      donorId: user.uid,
      donorType: donorType,
      donorName: donorName,
      remainingQuantity: foodData.totalQuantity,
      reservedQuantity: 0,
      collectedQuantity: 0,
      rating: 0,
      totalRatings: 0,
      geolocation: geolocation, // This can be null
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clean data to remove undefined values
    const cleanListingData = Object.fromEntries(
      Object.entries(listingData).filter(([_, value]) => value !== undefined)
    );

    console.log('💾 Saving food listing to Firestore');
    const docRef = await addDoc(collection(db, 'foodListings'), cleanListingData);
    console.log('✅ Food listing saved with ID:', docRef.id);

    return { 
      success: true, 
      listingId: docRef.id 
    };
  } catch (error: any) {
    console.error('❌ Error uploading food listing:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to upload food listing' 
    };
  }
};

// REAL-TIME: Get user's food listings with live updates
export const getUserFoodListings = (
  onUpdate: (listings: FoodListing[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const q = query(
      collection(db, 'foodListings'),
      where('donorId', '==', user.uid),
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
            // FIX: Explicitly map rating/totalRatings
            rating: data.rating as number || 0, 
            totalRatings: data.totalRatings as number || 0,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
        } as FoodListing);
        });
        onUpdate(listings);
      },
      (error) => {
        console.error('Real-time user food listings error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time user food listings:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get approved food listings with live updates
export const getApprovedFoodListings = (
  onUpdate: (listings: FoodListing[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'foodListings'),
      where('status', '==', FOOD_STATUS.APPROVED),
      // Sort by availableDate first (most relevant), then by creation date
      orderBy('availableDate', 'asc'),
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const listings: FoodListing[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // --- 🚨 DEBUG LOGGING START 🚨 ---
          const mappedListing = {
            id: doc.id,
            ...data,
            // FIX: Explicitly map rating/totalRatings
            rating: data.rating as number || 0,
            totalRatings: data.totalRatings as number || 0,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
          } as FoodListing;

          console.log(`[FOOD DEBUG] ID: ${doc.id}`);
          console.log(`[FOOD DEBUG] Firestore rating value: ${data.rating}`); // Check original value
          console.log(`[FOOD DEBUG] Mapped rating type/value: ${typeof mappedListing.rating} / ${mappedListing.rating}`); // Check mapped value
          console.log(`[FOOD DEBUG] Mapped totalRatings: ${mappedListing.totalRatings}`);
          // --- 🚨 DEBUG LOGGING END 🚨 ---

          listings.push(mappedListing);
        });
        
        console.log('📦 Food listings loaded:', listings.length);
        onUpdate(listings);
      },
      (error) => {
        console.error('Real-time food listings error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time food listings:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// Cancel user's own food listing with reason (FIREBASE)
export const cancelFoodListing = async (
  listingId: string, 
  cancellationReason: string
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Call the Cloud Function for atomic cancellation and cleanup
    const functions = getFunctions();
    const cancelFunction = httpsCallable<{listingId: string, reason: string}, {success: boolean; message: string}>(
        functions, 
        'adminOrUserCancelFoodListing'
    );

    // Ensure 'result' is declared and used *only* inside the try block
    const result = await cancelFunction({ 
        listingId, 
        reason: cancellationReason 
    });

    if (result.data.success) {
      console.log('✅ Food listing cancelled via Cloud Function');
      return { success: true };
    } else {
      // The use of result.data.message is safe because we are inside the try block
      return { success: false, error: result.data.message || 'Failed to cancel listing via server' };
    }
  } catch (error: any) {
    console.error('Error cancelling food listing:', error);
    // Handle specific function errors
    if (error.code === 'functions/permission-denied') {
        return { success: false, error: 'Permission denied. You may not own this listing.' };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to cancel food listing' 
    };
  }
};

// Update food listing (User function)
export const updateFoodListing = async (
  listingId: string,
  updates: Partial<FoodListingInput>,
  newImages?: File[]
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Verify the user owns this listing
    const listingDoc = await getDoc(doc(db, 'foodListings', listingId));
    if (!listingDoc.exists()) {
      return { success: false, error: 'Listing not found' };
    }

    const listingData = listingDoc.data() as FoodListing;
    if (listingData.donorId !== user.uid) {
      return { success: false, error: 'You can only update your own listings' };
    }

    // GEOCODE THE ADDRESS IF IT CHANGED
    let geolocation = listingData.geolocation;
    if (updates.pickupAddress && updates.pickupAddress !== listingData.pickupAddress && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      try {
        geolocation = await geocodeAddress(updates.pickupAddress);
        console.log('✅ Updated address geocoded successfully:', geolocation);
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding failed for updated address:', geocodeError);
        // Set to null to avoid Firestore errors
        geolocation = null;
      }
    }

    // Handle image uploads if new images are provided
    let imageUrls = listingData.images || [];
    
    if (newImages && newImages.length > 0) {
      // Upload new images
      for (const image of newImages) {
        const imageRef = ref(storage, `Food_Images/${user.uid}/${Date.now()}-${image.name}`);
        const snapshot = await uploadBytes(imageRef, image);
        const downloadURL = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadURL);
      }
    }

    // Prepare update data
     const updateData: any = {
      ...updates,
      updatedAt: new Date()
    };

    // Add geolocation if it was updated - use null instead of undefined
    if (geolocation !== listingData.geolocation) {
      updateData.geolocation = geolocation || null;
    }

    // Only update images if new images were uploaded
    if (newImages && newImages.length > 0) {
      updateData.images = imageUrls;
    }

    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    await updateDoc(doc(db, 'foodListings', listingId), cleanUpdateData);
    
    console.log('✅ Food listing updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating food listing:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update food listing' 
    };
  }
};

// New function for dashboard items
export const getDashboardFoodListings = (
  onUpdate: (listings: FoodListing[]) => void,
  userLocation: { latitude: number; longitude: number } | null,
  limit: number = 3,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'foodListings'),
      where('status', '==', FOOD_STATUS.APPROVED),
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
            // FIX: Explicitly map rating/totalRatings
            rating: data.rating as number || 0,
            totalRatings: data.totalRatings as number || 0,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate()
        } as FoodListing);
        });

        // Apply dashboard filtering
        const dashboardListings = DashboardService.getTopDashboardItems(
          listings, 
          userLocation, 
          limit
        );
        
        onUpdate(dashboardListings);
      },
      (error) => {
        console.error('Real-time dashboard food listings error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time dashboard food listings:', error);
    onError?.(error as Error);
    return () => {};
  }
};