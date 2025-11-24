// userMetricsService.ts
import { doc, updateDoc, increment, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase/firebase';

// Interfaces for metrics (separate from auth)
export interface UserMetrics {
  donor?: {
    foodWasteReduced: number;
    peopleHelped: number;
    rating: number;
    totalRatings: number;
    totalDonations: number; 
  };
  volunteer?: {
    hoursVolunteered: number;
    campaignsHeld: number;
    rating: number;
    totalRatings: number;
  };
  receiver?: {
    foodWasteReduced: number;
    reservationsCompleted: number;
    campaignsAttended: number; 
  };
}

// Unit conversions
const UNIT_CONVERSIONS = {
  'kg': 1,
  'servings': 0.25,
  'packages': 1,
  'containers': 2,
  'liters': 1
};

// Service functions
export const UserMetricsService = {
  // Update donor metrics when donation completes
  async updateDonorMetrics(
    donorId: string, 
    quantity: number, 
    unit: string,
    newPeopleHelped: number = 0,
    newRating?: number
  ) {
    const kgDonated = quantity * (UNIT_CONVERSIONS[unit as keyof typeof UNIT_CONVERSIONS] || 1);
    
    const updates: any = {
      'metrics.donor.foodWasteReduced': increment(kgDonated),
      'metrics.donor.peopleHelped': increment(newPeopleHelped),
      'updatedAt': new Date()
    };

    if (newRating) {
      // Handle rating calculation
      const userDoc = await getDoc(doc(db, 'users', donorId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentMetrics = userData.metrics?.donor || { rating: 0, totalRatings: 0 };
        
        const newTotalRatings = currentMetrics.totalRatings + 1;
        const newAverage = ((currentMetrics.rating * currentMetrics.totalRatings) + newRating) / newTotalRatings;
        
        updates['metrics.donor.rating'] = newAverage;
        updates['metrics.donor.totalRatings'] = increment(1);
      }
    }

    await updateDoc(doc(db, 'users', donorId), updates);
  },

  // Update volunteer metrics when campaign completes
  async updateVolunteerMetrics(
    volunteerId: string,
    hours: number = 0,
    newRating?: number
  ) {
    const updates: any = {
      'metrics.volunteer.hoursVolunteered': increment(hours),
      'metrics.volunteer.campaignsHeld': increment(1),
      'updatedAt': new Date()
    };

    if (newRating) {
      // Similar rating logic as donor
      const userDoc = await getDoc(doc(db, 'users', volunteerId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentMetrics = userData.metrics?.volunteer || { rating: 0, totalRatings: 0 };
        
        const newTotalRatings = currentMetrics.totalRatings + 1;
        const newAverage = ((currentMetrics.rating * currentMetrics.totalRatings) + newRating) / newTotalRatings;
        
        updates['metrics.volunteer.rating'] = newAverage;
        updates['metrics.volunteer.totalRatings'] = increment(1);
      }
    }

    await updateDoc(doc(db, 'users', volunteerId), updates);
  },

  // Update receiver metrics when reservation completes
  async updateReceiverMetrics(
    receiverId: string,
    quantity: number,
    unit: string
  ) {
    const kgReceived = quantity * (UNIT_CONVERSIONS[unit as keyof typeof UNIT_CONVERSIONS] || 1);
    
    await updateDoc(doc(db, 'users', receiverId), {
      'metrics.receiver.foodWasteReduced': increment(kgReceived),
      'metrics.receiver.reservationsCompleted': increment(1),
      'updatedAt': new Date()
    });
  },

  // Initialize metrics for new users (call this after user registration)
  async initializeUserMetrics(userId: string, role: string) {
    const baseMetrics: any = {};

    if (role === 'donor') {
      baseMetrics.donor = {
        foodWasteReduced: 0,
        peopleHelped: 0,
        rating: 0,
        totalRatings: 0
      };
    } else if (role === 'volunteer') {
      baseMetrics.volunteer = {
        hoursVolunteered: 0,
        campaignsHeld: 0,
        rating: 0,
        totalRatings: 0
      };
    } else if (role === 'receiver') {
      baseMetrics.receiver = {
        foodWasteReduced: 0,
        reservationsCompleted: 0
      };
    }

    await updateDoc(doc(db, 'users', userId), {
      metrics: baseMetrics,
      updatedAt: new Date()
    });
  },

  // Get user metrics for dashboard (one-time)
  async getUserMetrics(userId: string): Promise<UserMetrics | null> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().metrics || null;
    }
    return null;
  },

  // NEW: Real-time metrics listener
  onUserMetricsChange(
    userId: string, 
    callback: (metrics: UserMetrics | null) => void
  ): () => void {
    const userDocRef = doc(db, 'users', userId);
    
    return onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        callback(userData.metrics || null);
      } else {
        callback(null);
      }
    });
  }
};