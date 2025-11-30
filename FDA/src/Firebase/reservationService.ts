// FDA/src/firebase/reservationService.ts
import { 
  collection, 
  addDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { UserData } from './auth'; 

export interface FoodReservation {
  id?: string;
  foodListingId: string;
  userId: string;
  userType: 'receiver' | 'volunteer';
  quantity: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  reservedAt: Date;
  updatedAt: Date;
  // Add user data directly in the reservation
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
  // Add user data directly in the registration
  userName: string;
  userEmail: string;
  userPhone?: string;
}

// Reserve food (for both receivers and volunteers)
export const reserveFood = async (
  foodListingId: string, 
  quantity: number,
  userType: 'receiver' | 'volunteer'
): Promise<{success: boolean; error?: string; reservationId?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Check if food listing exists and has enough quantity
    const foodDoc = await getDoc(doc(db, 'foodListings', foodListingId));
    if (!foodDoc.exists()) {
      return { success: false, error: 'Food listing not found' };
    }

    const foodData = foodDoc.data();
    if (foodData.remainingQuantity < quantity) {
      return { success: false, error: 'Not enough quantity available' };
    }

    // 2. Get current user data to include in reservation
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let userName = 'Unknown User';
    let userEmail = user.email || '';
    let userPhone = '';

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
      userPhone = userData.profile?.phone || '';
    }

    // 3. Check if user has a cancelled reservation for this food listing
    const existingReservationQuery = query(
      collection(db, 'foodReservations'),
      where('foodListingId', '==', foodListingId),
      where('userId', '==', user.uid),
      where('status', '==', 'cancelled')
    );
    
    const existingReservations = await getDocs(existingReservationQuery);
    let reservationId: string;
    let existingReservationData: any = null;

    if (!existingReservations.empty) {
      // Use the existing cancelled reservation
      const existingReservation = existingReservations.docs[0];
      reservationId = existingReservation.id;
      existingReservationData = existingReservation.data();
      
      // Update the existing reservation
      await updateDoc(doc(db, 'foodReservations', reservationId), {
        quantity,
        status: 'confirmed',
        updatedAt: new Date(),
        // Update user data in case it changed
        userName,
        userEmail,
        userPhone
      });

      // Calculate quantity difference for food listing update
      const oldQuantity = existingReservationData.quantity || 0;
      const quantityDiff = quantity - oldQuantity;

      // Update food listing quantities with the difference
      // FIX: Both receivers and volunteers should only affect reservedQuantity
      await updateDoc(doc(db, 'foodListings', foodListingId), {
        remainingQuantity: foodData.remainingQuantity - quantityDiff,
        reservedQuantity: (foodData.reservedQuantity || 0) + quantityDiff,
        updatedAt: new Date()
      });

    } else {
      // Create a new reservation record
      const reservationData: Omit<FoodReservation, 'id'> = {
        foodListingId,
        userId: user.uid,
        userType,
        quantity,
        status: 'confirmed',
        reservedAt: new Date(),
        updatedAt: new Date(),
        userName,
        userEmail,
        userPhone
      };

      const reservationRef = await addDoc(collection(db, 'foodReservations'), reservationData);
      reservationId = reservationRef.id;

      // Update food listing quantities for new reservation
      // FIX: Both receivers and volunteers should only affect reservedQuantity
      await updateDoc(doc(db, 'foodListings', foodListingId), {
        remainingQuantity: foodData.remainingQuantity - quantity,
        reservedQuantity: (foodData.reservedQuantity || 0) + quantity,
        updatedAt: new Date()
      });
    }

    return { 
      success: true, 
      reservationId 
    };
  } catch (error: any) {
    console.error('Error reserving food:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to reserve food' 
    };
  }
};

// Register for campaign (for receivers)
// Register for campaign (for receivers) - UPDATED to reuse cancelled registrations
export const registerForCampaign = async (
  campaignId: string
): Promise<{success: boolean; error?: string; registrationId?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Check if campaign exists and has available spots
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const campaignData = campaignDoc.data();
    if (campaignData.availableSpots <= 0) {
      return { success: false, error: 'No available spots left' };
    }

    // 2. Check if user has a cancelled registration for this campaign
    const existingRegistrationQuery = query(
      collection(db, 'campaignRegistrations'),
      where('campaignId', '==', campaignId),
      where('userId', '==', user.uid),
      where('status', '==', 'cancelled')
    );
    
    const existingRegistrations = await getDocs(existingRegistrationQuery);
    let registrationId: string;

    if (!existingRegistrations.empty) {
      // Use the existing cancelled registration
      const existingRegistration = existingRegistrations.docs[0];
      registrationId = existingRegistration.id;
      
      // Get current user data to include in registration
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userName = 'Unknown User';
      let userEmail = user.email || '';
      let userPhone = '';

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
        userPhone = userData.profile?.phone || '';
      }

      // Update the existing registration
      await updateDoc(doc(db, 'campaignRegistrations', registrationId), {
        status: 'registered',
        updatedAt: new Date(),
        // Update user data in case it changed
        userName,
        userEmail,
        userPhone
      });

      // Update campaign spots (reclaim the spot)
      await updateDoc(doc(db, 'campaigns', campaignId), {
        registeredSpots: (campaignData.registeredSpots || 0) + 1,
        availableSpots: campaignData.availableSpots - 1,
        updatedAt: new Date()
      });

    } else {
      // Check if user is already registered (non-cancelled)
      const activeRegistrationQuery = query(
        collection(db, 'campaignRegistrations'),
        where('campaignId', '==', campaignId),
        where('userId', '==', user.uid),
        where('status', 'in', ['registered', 'attended'])
      );
      
      const activeRegistrations = await getDocs(activeRegistrationQuery);
      if (!activeRegistrations.empty) {
        return { success: false, error: 'You are already registered for this campaign' };
      }

      // Get current user data to include in registration
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userName = 'Unknown User';
      let userEmail = user.email || '';
      let userPhone = '';

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        userName = userData.profile?.name || userData.profile?.contactPerson || 'Unknown User';
        userPhone = userData.profile?.phone || '';
      }

      // Create new registration record
      const registrationData: Omit<CampaignRegistration, 'id'> = {
        campaignId,
        userId: user.uid,
        status: 'registered',
        registeredAt: new Date(),
        updatedAt: new Date(),
        userName,
        userEmail,
        userPhone
      };

      const registrationRef = await addDoc(collection(db, 'campaignRegistrations'), registrationData);
      registrationId = registrationRef.id;

      // Update campaign spots
      await updateDoc(doc(db, 'campaigns', campaignId), {
        registeredSpots: (campaignData.registeredSpots || 0) + 1,
        availableSpots: campaignData.availableSpots - 1,
        updatedAt: new Date()
      });
    }

    return { 
      success: true, 
      registrationId 
    };
  } catch (error: any) {
    console.error('Error registering for campaign:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to register for campaign' 
    };
  }
};

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

// Get campaign registrations for a specific campaign (NO LONGER NEEDS USER DATA FETCH)
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

// Mark food reservation as completed
export const completeFoodReservation = async (
  reservationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Get the reservation data
    const reservationDoc = await getDoc(doc(db, 'foodReservations', reservationId));
    if (!reservationDoc.exists()) {
      return { success: false, error: 'Reservation not found' };
    }

    const reservationData = reservationDoc.data();
    
    // 2. Check if user is the donor of this food listing
    const foodListingDoc = await getDoc(doc(db, 'foodListings', reservationData.foodListingId));
    if (!foodListingDoc.exists()) {
      return { success: false, error: 'Food listing not found' };
    }

    const foodListingData = foodListingDoc.data();
    
    if (foodListingData.donorId !== user.uid) {
      return { success: false, error: 'Only the donor can mark reservations as completed' };
    }

    // 3. Check if reservation is already completed
    if (reservationData.status === 'completed') {
      return { success: false, error: 'Reservation is already completed' };
    }

    // 4. Update reservation status to completed
    await updateDoc(doc(db, 'foodReservations', reservationId), {
      status: 'completed',
      updatedAt: serverTimestamp()
    });

    // 5. Update food listing collected quantity (ACTUAL COLLECTION)
    const collectedQuantity = reservationData.quantity;
    
    await updateDoc(doc(db, 'foodListings', reservationData.foodListingId), {
      collectedQuantity: (foodListingData.collectedQuantity || 0) + collectedQuantity,
      updatedAt: new Date()
    });

    console.log(`✅ Reservation ${reservationId} marked as completed. Collected: ${collectedQuantity}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error completing food reservation:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to complete reservation' 
    };
  }
};

// Mark campaign registration as attended
export const completeCampaignRegistration = async (
  registrationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Get the registration data
    const registrationDoc = await getDoc(doc(db, 'campaignRegistrations', registrationId));
    if (!registrationDoc.exists()) {
      return { success: false, error: 'Registration not found' };
    }

    const registrationData = registrationDoc.data();
    
    // 2. Check if user is the organizer of this campaign
    const campaignDoc = await getDoc(doc(db, 'campaigns', registrationData.campaignId));
    if (!campaignDoc.exists()) {
      return { success: false, error: 'Campaign not found' };
    }

    const campaignData = campaignDoc.data();
    
    if (campaignData.organizerId !== user.uid) {
      return { success: false, error: 'Only the campaign organizer can mark registrations as attended' };
    }

    // 3. Check if registration is already attended
    if (registrationData.status === 'attended') {
      return { success: false, error: 'Registration is already marked as attended' };
    }

    // 4. Update registration status to attended
    await updateDoc(doc(db, 'campaignRegistrations', registrationId), {
      status: 'attended',
      updatedAt: serverTimestamp()
    });

    // 5. Update campaign attended count
    await updateDoc(doc(db, 'campaigns', registrationData.campaignId), {
      attendedSpots: (campaignData.attendedSpots || 0) + 1,
      updatedAt: new Date()
    });

    console.log(`✅ Registration ${registrationId} marked as attended`);

    return { success: true };
  } catch (error: any) {
    console.error('Error completing campaign registration:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to complete registration' 
    };
  }
};

export const cancelFoodReservation = async (
  reservationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Get the reservation to check ownership and get food listing info
    const reservationDoc = await getDoc(doc(db, 'foodReservations', reservationId));
    if (!reservationDoc.exists()) {
      return { success: false, error: 'Reservation not found' };
    }

    const reservationData = reservationDoc.data();
    
    // 2. Check if user owns this reservation
    if (reservationData.userId !== user.uid) {
      return { success: false, error: 'You can only cancel your own reservations' };
    }

    // 3. Check if reservation is already completed
    if (reservationData.status === 'completed') {
      return { success: false, error: 'Cannot cancel a completed reservation' };
    }

    // 4. Update reservation status to cancelled
    await updateDoc(doc(db, 'foodReservations', reservationId), {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });

    // 5. Update food listing quantities - return the reserved quantity
    // FIX: Both receivers and volunteers should only affect reservedQuantity
    const foodDoc = await getDoc(doc(db, 'foodListings', reservationData.foodListingId));
    if (foodDoc.exists()) {
      const foodData = foodDoc.data();
      const quantity = reservationData.quantity;
      
      await updateDoc(doc(db, 'foodListings', reservationData.foodListingId), {
        remainingQuantity: foodData.remainingQuantity + quantity,
        reservedQuantity: Math.max(0, (foodData.reservedQuantity || 0) - quantity),
        updatedAt: new Date()
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling food reservation:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to cancel reservation' 
    };
  }
};

// Cancel campaign registration
export const cancelCampaignRegistration = async (
  registrationId: string
): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Get the registration to check ownership and get campaign info
    const registrationDoc = await getDoc(doc(db, 'campaignRegistrations', registrationId));
    if (!registrationDoc.exists()) {
      return { success: false, error: 'Registration not found' };
    }

    const registrationData = registrationDoc.data();
    
    // 2. Check if user owns this registration
    if (registrationData.userId !== user.uid) {
      return { success: false, error: 'You can only cancel your own registrations' };
    }

    // 3. Check if registration is already attended
    if (registrationData.status === 'attended') {
      return { success: false, error: 'Cannot cancel an attended registration' };
    }

    // 4. Update registration status to cancelled
    await updateDoc(doc(db, 'campaignRegistrations', registrationId), {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });

    // 5. Update campaign spots - return the spot
    const campaignDoc = await getDoc(doc(db, 'campaigns', registrationData.campaignId));
    if (campaignDoc.exists()) {
      const campaignData = campaignDoc.data();
      
      await updateDoc(doc(db, 'campaigns', registrationData.campaignId), {
        registeredSpots: Math.max(0, (campaignData.registeredSpots || 0) - 1),
        availableSpots: (campaignData.availableSpots || 0) + 1,
        updatedAt: new Date()
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling campaign registration:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to cancel registration' 
    };
  }
};
