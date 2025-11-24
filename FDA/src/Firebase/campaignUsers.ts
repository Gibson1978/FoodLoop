// FDA/src/firebase/campaigns.ts - CAMPAIGN FUNCTIONS WITH REAL-TIME UPDATES
import { 
  collection, 
  addDoc, 
  doc, 
  getDocs, 
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
import { getCurrentUserData } from './auth';
import { geocodeAddress} from '../UnifiedFolder/LocationFolder/useGeocoding';
import { DashboardService } from '../UnifiedFolder/services/DashboardServices';

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
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null; // Allow null
  createdAt: Date;
  updatedAt: Date;
}

export const CAMPAIGN_STATUS = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export interface CampaignInput {
  title: string;
  description: string;
  category: string;
  campaignDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  fullAddress: string;
  totalSpots: number;
}


// REAL-TIME: Get active campaigns with live updates
export const getActiveCampaigns = (
  onUpdate: (campaigns: Campaign[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', CAMPAIGN_STATUS.ONGOING),
      orderBy('campaignDate', 'asc')
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
            updatedAt: data.updatedAt?.toDate()
          } as Campaign);
        });
        onUpdate(campaigns);
      },
      (error) => {
        console.error('Real-time campaigns error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time campaigns:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get user's campaigns with live updates
export const getUserCampaigns = (
  onUpdate: (campaigns: Campaign[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const q = query(
      collection(db, 'campaigns'),
      where('organizerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // REAL-TIME: Returns unsubscribe function for cleanup
    return onSnapshot(q, 
      (querySnapshot) => {
        const campaigns: Campaign[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          campaigns.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          } as Campaign);
        });
        onUpdate(campaigns);
      },
      (error) => {
        console.error('Real-time user campaigns error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time user campaigns:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// REAL-TIME: Get specific campaign with live updates
export const getCampaignById = (
  campaignId: string,
  onUpdate: (campaign: Campaign | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    
    // REAL-TIME: Returns unsubscribe function for cleanup
    return onSnapshot(campaignRef, 
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const campaign: Campaign = {
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          } as Campaign;
          onUpdate(campaign);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.error('Real-time campaign error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time campaign:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// Get all campaigns (for admin or public view)
export const getAllCampaigns = async (): Promise<{success: boolean; data?: Campaign[]; error?: string}> => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const campaigns: Campaign[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      campaigns.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Campaign);
    });

    console.log(`✅ Found ${campaigns.length} total campaigns`);
    return { success: true, data: campaigns };
  } catch (error) {
    console.error('❌ Error fetching all campaigns:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch campaigns' 
    };
  }
};

// Keep original one-time functions for compatibility
export const getActiveCampaignsOnce = async (): Promise<{success: boolean; data?: Campaign[]; error?: string}> => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', CAMPAIGN_STATUS.ONGOING),
      orderBy('campaignDate', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const campaigns: Campaign[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      campaigns.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Campaign);
    });

    return { success: true, data: campaigns };
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch active campaigns' 
    };
  }
};

// ORIGINAL FUNCTIONS (keep for compatibility)
export const createCampaign = async (
  campaignData: CampaignInput, 
  images: File[]
): Promise<{success: boolean; error?: string; campaignId?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const currentUserData = await getCurrentUserData();
    if (!currentUserData) {
      return { success: false, error: 'User data not found. Please log in again.' };
    }

    // Improved geocoding with proper error handling
    let geolocation = null;
    if (campaignData.fullAddress) {
      try {
        geolocation = await geocodeAddress(campaignData.fullAddress);
        if (geolocation) {
          console.log('✅ Campaign address geocoded successfully');
        } else {
          console.log('ℹ️ No coordinates obtained, proceeding without geolocation');
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding failed, proceeding without coordinates');
        // Continue without geolocation
      }
    }

    // Upload images
    const imageUrls: string[] = [];
    for (const image of images) {
      const imageRef = ref(storage, `Campaign_Images/${user.uid}/${Date.now()}-${image.name}`);
      const snapshot = await uploadBytes(imageRef, image);
      const downloadURL = await getDownloadURL(snapshot.ref);
      imageUrls.push(downloadURL);
    }

    const organizerName = currentUserData.profile?.orgName || 
                         currentUserData.profile?.contactPerson || 
                         user.displayName || 
                         'Volunteer';
    
    const organizerOrg = currentUserData.profile?.orgName || 'Individual Volunteer';

    // Prepare campaign data with proper null handling
    const campaignDoc: Omit<Campaign, 'id'> = {
      ...campaignData,
      images: imageUrls,
      status: CAMPAIGN_STATUS.PENDING,
      organizerId: user.uid,
      organizerName: organizerName,
      organizerEmail: user.email || '',
      organizerOrg: organizerOrg,
      registeredSpots: 0,
      availableSpots: campaignData.totalSpots,
      rating: 0,
      totalRatings: 0,
      geolocation: geolocation, // This can be null
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clean data to avoid Firestore errors
    const cleanCampaignData = Object.fromEntries(
      Object.entries(campaignDoc).filter(([_, value]) => value !== undefined)
    );

    console.log('💾 Saving campaign to Firestore');
    const docRef = await addDoc(collection(db, 'campaigns'), cleanCampaignData);
    console.log('✅ Campaign created with ID:', docRef.id);

    return { 
      success: true, 
      campaignId: docRef.id 
    };
  } catch (error: any) {
    console.error('❌ Error creating campaign:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create campaign' 
    };
  }
};

export const getUserCampaignsOnce = async (): Promise<{success: boolean; data?: Campaign[]; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const q = query(
      collection(db, 'campaigns'),
      where('organizerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const campaigns: Campaign[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      campaigns.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Campaign);
    });

    return { success: true, data: campaigns };
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch your campaigns' 
    };
  }
};

export const getCampaignByIdOnce = async (campaignId: string): Promise<{success: boolean; data?: Campaign; error?: string}> => {
  try {
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const data = campaignDoc.data();
    const campaign: Campaign = {
      id: campaignDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Campaign;

    return { success: true, data: campaign };
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch campaign' 
    };
  }
};

// Update campaign with image handling (Volunteer function)
export const updateCampaignWithImages = async (
  campaignId: string,
  updates: Partial<CampaignInput>,
  newImages?: File[]
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Verify the user owns this campaign
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const campaignData = campaignDoc.data() as Campaign;
    if (campaignData.organizerId !== user.uid) {
      return { success: false, error: 'You can only update your own campaigns' };
    }

    // GEOCODE THE ADDRESS IF IT CHANGED
    let geolocation = campaignData.geolocation;
    if (updates.fullAddress && updates.fullAddress !== campaignData.fullAddress) {
      try {
        geolocation = await geocodeAddress(updates.fullAddress);
        console.log('✅ Updated campaign address geocoded successfully:', geolocation);
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding failed for updated address:', geocodeError);
        // Keep existing geolocation if new one fails
      }
    }

    // Handle image uploads if new images are provided
    let imageUrls = campaignData.images || [];
    
    if (newImages && newImages.length > 0) {
      // Upload new images
      for (const image of newImages) {
        const imageRef = ref(storage, `Campaign_Images/${user.uid}/${Date.now()}-${image.name}`);
        const snapshot = await uploadBytes(imageRef, image);
        const downloadURL = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadURL);
      }
    }

    // Calculate available spots if totalSpots is being updated
    let availableSpots = campaignData.availableSpots;
    if (updates.totalSpots !== undefined) {
      const registeredSpots = campaignData.registeredSpots || 0;
      availableSpots = Math.max(0, updates.totalSpots - registeredSpots);
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updatedAt: new Date()
    };

    // Add geolocation if it was updated
    if (geolocation !== campaignData.geolocation) {
      updateData.geolocation = geolocation;
    }

    // Only update images if new images were uploaded
    if (newImages && newImages.length > 0) {
      updateData.images = imageUrls;
    }

    if (updates.totalSpots !== undefined) {
      updateData.availableSpots = availableSpots;
    }

    await updateDoc(doc(db, 'campaigns', campaignId), updateData);
    
    console.log('✅ Campaign updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update campaign' 
    };
  }
};

// Cancel campaign with reason
export const cancelCampaign = async (
  campaignId: string,
  cancellationReason: string
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Verify the user owns this campaign
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const campaignData = campaignDoc.data() as Campaign;
    if (campaignData.organizerId !== user.uid) {
      return { success: false, error: 'You can only cancel your own campaigns' };
    }

    // Update status to cancelled with reason
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: 'cancelled',
      cancellationReason: cancellationReason,
      cancelledAt: serverTimestamp(),
      cancelledBy: user.uid,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Campaign cancelled with reason:', cancellationReason);
    return { success: true };
  } catch (error) {
    console.error('❌ Error cancelling campaign:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to cancel campaign' 
    };
  }
};

// Register for a campaign spot (Receiver function)
export const registerForCampaign = async (campaignId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const campaignData = campaignDoc.data() as Campaign;
    
    // Check if campaign is active
    if (campaignData.status !== CAMPAIGN_STATUS.ONGOING) {
      return { success: false, error: 'Campaign is not active for registration' };
    }

    // Check if there are available spots
    if (campaignData.availableSpots <= 0) {
      return { success: false, error: 'No available spots left' };
    }

    // Update campaign spots
    await updateDoc(doc(db, 'campaigns', campaignId), {
      registeredSpots: (campaignData.registeredSpots || 0) + 1,
      availableSpots: campaignData.availableSpots - 1,
      updatedAt: new Date()
    });

    console.log('✅ Successfully registered for campaign');
    return { success: true };
  } catch (error) {
    console.error('❌ Error registering for campaign:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to register for campaign' 
    };
  }
};

// Cancel registration for a campaign spot (Receiver function)
export const cancelCampaignRegistration = async (campaignId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const campaignData = campaignDoc.data() as Campaign;
    
    // Update campaign spots
    await updateDoc(doc(db, 'campaigns', campaignId), {
      registeredSpots: Math.max(0, (campaignData.registeredSpots || 0) - 1),
      availableSpots: campaignData.availableSpots + 1,
      updatedAt: new Date()
    });

    console.log('✅ Successfully cancelled campaign registration');
    return { success: true };
  } catch (error) {
    console.error('❌ Error cancelling campaign registration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to cancel registration' 
    };
  }
};

// Get campaigns by category
export const getCampaignsByCategory = async (category: string): Promise<{success: boolean; data?: Campaign[]; error?: string}> => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('category', '==', category),
      where('status', '==', CAMPAIGN_STATUS.ONGOING),
      orderBy('campaignDate', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const campaigns: Campaign[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      campaigns.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Campaign);
    });

    console.log(`✅ Found ${campaigns.length} campaigns in category: ${category}`);
    return { success: true, data: campaigns };
  } catch (error) {
    console.error('❌ Error fetching campaigns by category:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch campaigns by category' 
    };
  }
};

// Search campaigns by title or description
export const searchCampaigns = async (searchTerm: string): Promise<{success: boolean; data?: Campaign[]; error?: string}> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation that fetches all and filters client-side
    // For production, consider using Algolia or Firebase Extensions for search
    
    const allCampaignsResult = await getAllCampaigns();
    if (!allCampaignsResult.success || !allCampaignsResult.data) {
      return allCampaignsResult;
    }

    const searchLower = searchTerm.toLowerCase();
    const filteredCampaigns = allCampaignsResult.data.filter(campaign => 
      campaign.title.toLowerCase().includes(searchLower) ||
      campaign.description.toLowerCase().includes(searchLower) ||
      campaign.locationName.toLowerCase().includes(searchLower)
    );

    console.log(`🔍 Found ${filteredCampaigns.length} campaigns matching: ${searchTerm}`);
    return { success: true, data: filteredCampaigns };
  } catch (error) {
    console.error('❌ Error searching campaigns:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to search campaigns' 
    };
  }
};

// New function for dashboard campaigns
export const getDashboardCampaigns = (
  onUpdate: (campaigns: Campaign[]) => void,
  userLocation: { latitude: number; longitude: number } | null,
  limit: number = 3,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', CAMPAIGN_STATUS.ONGOING),
      orderBy('campaignDate', 'asc')
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
            updatedAt: data.updatedAt?.toDate()
          } as Campaign);
        });

        // Apply dashboard filtering
        const dashboardCampaigns = DashboardService.getTopDashboardItems(
          campaigns, 
          userLocation, 
          limit
        );
        
        onUpdate(dashboardCampaigns);
      },
      (error) => {
        console.error('Real-time dashboard campaigns error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time dashboard campaigns:', error);
    onError?.(error as Error);
    return () => {};
  }
};