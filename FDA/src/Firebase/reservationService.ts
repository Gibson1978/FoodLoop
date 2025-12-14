// FDA/src/firebase/reservationService.ts (REWRITTEN to use Cloud Functions)

import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // NEW IMPORT
import { db, auth } from './firebase';
import type { UserData } from './auth'; 

// Initialize Firebase Functions instance for callable calls
const functions = getFunctions();

// --- Client-Side Interfaces (Kept) ---
export interface FoodReservation {
  id?: string;
  foodListingId: string;
  userId: string;
  userType: 'receiver' | 'volunteer';
  quantity: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  reservedAt: Date;
  updatedAt: Date;
  userName: string;
  userEmail: string;
  userPhone?: string;
}

export interface CampaignRegistration {
  id?: string;
  campaignId: string;
  userId: string;
  status: 'registered' | 'attended' | 'cancelled';
  registeredAt: Date;
  updatedAt: Date;
  userName: string;
  userEmail: string;
  userPhone?: string;
}

// --- CLOUD FUNCTION CALLS (Migrated) ---

// Reserve food (for both receivers and volunteers) - MIGRATED TO CF
export const reserveFood = async (
  foodListingId: string, 
  quantity: number,
  userType: 'receiver' | 'volunteer'
): Promise<{success: boolean; error?: string; reservationId?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }
    
    // Define the client call signature matching the CF payload (ReserveFoodRequest)
    const reserveCF = httpsCallable<{ foodListingId: string, quantity: number, userType: 'receiver' | 'volunteer' }, 
                                    { success: boolean; reservationId?: string; message?: string }>(
      functions, 
      'reserveFoodCF' 
    );

    const result = await reserveCF({ 
      foodListingId, 
      quantity,
      userType
    });

    if (result.data.success) {
      return { 
        success: true, 
        reservationId: result.data.reservationId 
      };
    } else {
      return { success: false, error: result.data.message || 'Failed to reserve food via server' };
    }
  } catch (error: any) {
    console.error('Error reserving food:', error);
    // Handle Callable Function errors (e.g., resource-exhausted)
    return { 
      success: false, 
      error: error.message || 'Failed to reserve food' 
    };
  }
};

// Register for campaign (for receivers) - MIGRATED TO CF
export const registerForCampaign = async (
  campaignId: string
): Promise<{success: boolean; error?: string; registrationId?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }
    
    // Define the client call signature matching the CF payload (RegisterCampaignRequest)
    const registerCF = httpsCallable<{ campaignId: string }, { success: boolean; registrationId?: string; message?: string }>(
      functions, 
      'registerForCampaignCF' 
    );

    const result = await registerCF({ campaignId });

    if (result.data.success) {
      // Note: registrationId might not be returned, but the CF ensures consistency
      return { success: true, registrationId: result.data.registrationId }; 
    } else {
      return { success: false, error: result.data.message || 'Failed to register for campaign via server' };
    }
  } catch (error: any) {
    console.error('Error registering for campaign:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to register for campaign' 
    };
  }
};

// Mark food reservation as completed - MIGRATED TO CF
export const completeFoodReservation = async (
  reservationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }
    
    // Define the client call signature matching the CF payload (CompleteReservationRequest)
    const completeCF = httpsCallable<{ reservationId: string }, { success: boolean; message?: string }>(
      functions, 
      'completeFoodReservationCF' 
    );

    const result = await completeCF({ reservationId });

    if (result.data.success) {
      console.log(`✅ Reservation ${reservationId} marked as completed.`);
      return { success: true };
    } else {
      return { success: false, error: result.data.message || 'Failed to complete reservation via server' };
    }
  } catch (error: any) {
    console.error('Error completing food reservation:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to complete reservation' 
    };
  }
};

// Mark campaign registration as attended - MIGRATED TO CF
export const completeCampaignRegistration = async (
  registrationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Define the client call signature matching the CF payload (CompleteRegistrationRequest)
    const completeCF = httpsCallable<{ registrationId: string }, { success: boolean; message?: string }>(
      functions, 
      'completeCampaignRegistrationCF' 
    );

    const result = await completeCF({ registrationId });

    if (result.data.success) {
      console.log(`✅ Registration ${registrationId} marked as attended`);
      return { success: true };
    } else {
      return { success: false, error: result.data.message || 'Failed to complete registration via server' };
    }
  } catch (error: any) {
    console.error('Error completing campaign registration:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to complete registration' 
    };
  }
};

// Cancel food reservation - MIGRATED TO CF
export const cancelFoodReservation = async (
  reservationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }
    
    // Define the client call signature matching the CF payload (CancelReservationRequest)
    const cancelCF = httpsCallable<{ reservationId: string }, { success: boolean; message?: string }>(
      functions, 
      'cancelFoodReservationCF' 
    );

    const result = await cancelCF({ reservationId });

    if (result.data.success) {
      return { success: true };
    } else {
      return { success: false, error: result.data.message || 'Failed to cancel reservation via server' };
    }
  } catch (error: any) {
    console.error('Error cancelling food reservation:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to cancel reservation' 
    };
  }
};

// Cancel campaign registration - MIGRATED TO CF
export const cancelCampaignRegistration = async (
  registrationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Define the client call signature matching the CF payload (CancelRegistrationRequest)
    const cancelCF = httpsCallable<{ registrationId: string }, { success: boolean; message?: string }>(
      functions, 
      'cancelCampaignRegistrationCF' 
    );

    const result = await cancelCF({ registrationId });

    if (result.data.success) {
      return { success: true };
    } else {
      return { success: false, error: result.data.message || 'Failed to cancel registration via server' };
    }
  } catch (error: any) {
    console.error('Error cancelling campaign registration:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to cancel registration' 
    };
  }
};

// --- CLIENT-SIDE READ FUNCTIONS (Retained) ---

// Get user's food reservations
export const getUserFoodReservations = async (): Promise<{success: boolean; data?: FoodReservation[]; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const q = query(
      collection(db, 'foodReservations'),
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    const reservations: FoodReservation[] = [];

    querySnapshot.forEach((document) => {
      const data = document.data();
      reservations.push({
        id: document.id,
        ...data,
        reservedAt: data.reservedAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as FoodReservation);
    });

    return { success: true, data: reservations };
  } catch (error: any) {
    console.error('Error fetching user reservations:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch reservations' 
    };
  }
};

// Get user's campaign registrations
export const getUserCampaignRegistrations = async (): Promise<{success: boolean; data?: CampaignRegistration[]; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const q = query(
      collection(db, 'campaignRegistrations'),
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    const registrations: CampaignRegistration[] = [];

    querySnapshot.forEach((document) => {
      const data = document.data();
      registrations.push({
        id: document.id,
        ...data,
        registeredAt: data.registeredAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as CampaignRegistration);
    });

    return { success: true, data: registrations };
  } catch (error: any) {
    console.error('Error fetching user registrations:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch registrations' 
    };
  }
};

// Get food reservations for a specific listing with user info
export const getFoodReservationsByListing = async (
  foodListingId: string
): Promise<{success: boolean; data?: FoodReservation[]; error?: string}> => {
  try {
    const q = query(
      collection(db, 'foodReservations'),
      where('foodListingId', '==', foodListingId)
    );

    const querySnapshot = await getDocs(q);
    const reservations: FoodReservation[] = [];

    querySnapshot.forEach((document) => {
      const data = document.data();
      reservations.push({
        id: document.id,
        ...data,
        reservedAt: data.reservedAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as FoodReservation);
    });

    return { success: true, data: reservations };
  } catch (error: any) {
    console.error('Error fetching food reservations:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch reservations' 
    };
  }
};

// Get campaign registrations for a specific campaign
export const getCampaignRegistrationsByCampaign = async (
  campaignId: string
): Promise<{success: boolean; data?: CampaignRegistration[]; error?: string}> => {
  try {
    const q = query(
      collection(db, 'campaignRegistrations'),
      where('campaignId', '==', campaignId)
    );

    const querySnapshot = await getDocs(q);
    const registrations: CampaignRegistration[] = [];

    querySnapshot.forEach((document) => {
      const data = document.data();
      registrations.push({
        id: document.id,
        ...data,
        registeredAt: data.registeredAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as CampaignRegistration);
    });

    return { success: true, data: registrations };
  } catch (error: any) {
    console.error('Error fetching campaign registrations:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch registrations' 
    };
  }
};