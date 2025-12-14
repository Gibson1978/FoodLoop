// FDA/src/firebase/ratingService.ts (REWRITTEN to use Cloud Function for submitRating)
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit,
  startAfter,
  type DocumentSnapshot
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // NEW IMPORT
import { db, auth } from './firebase';

// Initialize Firebase Functions instance for callable calls
const functions = getFunctions();

// --- Client-Side Interfaces (Kept) ---
export interface Rating {
  id?: string;
  targetType: 'food' | 'campaign';
  targetId: string;
  targetName: string;
  ratedUserId: string;
  ratedUserName: string;
  ratedUserType: 'donor' | 'volunteer';
  raterUserId: string;
  raterUserName: string;
  raterUserType: 'receiver' | 'volunteer';
  rating: number; // 1-5
  comment?: string;
  reservationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingCounts: { [key: number]: number }; // Count of 1-star, 2-star, etc.
}

// Submit a rating - MIGRATED TO CF
export const submitRating = async (
  targetType: 'food' | 'campaign',
  targetId: string,
  ratingData: {
    rating: number;
    comment?: string;
    reservationId?: string;
  }
): Promise<{success: boolean; error?: string; ratingId?: string}> => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'User must be authenticated' };
    }

    // Define the client call signature matching the CF payload (SubmitRatingRequest)
    const submitRatingCF = httpsCallable<{ 
      targetType: 'food' | 'campaign', 
      targetId: string, 
      rating: number, 
      comment?: string, 
      reservationId?: string 
    }, { success: boolean; ratingId?: string; message?: string }>(
      functions, 
      'submitRatingCF' 
    );
    
    const result = await submitRatingCF({
      targetType,
      targetId,
      ...ratingData
    });

    if (result.data.success) {
      return { 
        success: true, 
        ratingId: result.data.ratingId 
      };
    } else {
      return { success: false, error: result.data.message || 'Failed to submit rating via server' };
    }
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    // Handle Callable Function errors (e.g., invalid-argument)
    return { 
      success: false, 
      error: error.message || 'Failed to submit rating' 
    };
  }
};

// Get ratings for a specific target with pagination (RETAINED CLIENT-SIDE)
export const getRatingsForTarget = async (
  targetType: 'food' | 'campaign',
  targetId: string,
  pageLimit: number = 10,
  lastDoc?: DocumentSnapshot
): Promise<{success: boolean; data?: Rating[]; lastVisible?: DocumentSnapshot; error?: string}> => {
  try {
    let q = query(
      collection(db, 'ratings'),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const ratings: Rating[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ratings.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Rating);
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { 
      success: true, 
      data: ratings,
      lastVisible 
    };
  } catch (error: any) {
    console.error('Error fetching ratings:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch ratings' 
    };
  }
};

// Get rating statistics for a target (RETAINED CLIENT-SIDE)
export const getRatingStats = async (
  targetType: 'food' | 'campaign',
  targetId: string
): Promise<{success: boolean; data?: RatingStats; error?: string}> => {
  try {
    const q = query(
      collection(db, 'ratings'),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId)
    );

    const querySnapshot = await getDocs(q);
    const ratings: Rating[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ratings.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Rating);
    });

    if (ratings.length === 0) {
      return { 
        success: true, 
        data: {
          averageRating: 0,
          totalRatings: 0,
          ratingCounts: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        } 
      };
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    ratings.forEach(rating => {
      ratingCounts[rating.rating as keyof typeof ratingCounts]++;
    });

    return {
      success: true,
      data: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        ratingCounts
      }
    };
  } catch (error: any) {
    console.error('Error fetching rating stats:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch rating statistics' 
    };
  }
};

// Check if user has rated an item (RETAINED CLIENT-SIDE)
export const getUserRatingForItem = async (
  targetType: 'food' | 'campaign',
  targetId: string
): Promise<{success: boolean; data?: Rating; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    const q = query(
      collection(db, 'ratings'),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      where('raterUserId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: true, data: undefined };
    }

    const ratingDoc = querySnapshot.docs[0];
    const data = ratingDoc.data();
    const rating: Rating = {
      id: ratingDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Rating;

    return { success: true, data: rating };
  } catch (error: any) {
    console.error('Error getting user rating:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get user rating' 
    };
  }
};