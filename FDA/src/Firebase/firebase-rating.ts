// FDA/src/firebase/ratingService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit,
  startAfter,
  updateDoc,
  getDoc,
  type DocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface Rating {
  id?: string;
  // What is being rated
  targetType: 'food' | 'campaign';
  targetId: string;
  targetName: string;
  
  // Who is being rated (donor/volunteer)
  ratedUserId: string;
  ratedUserName: string;
  ratedUserType: 'donor' | 'volunteer';
  
  // Who is rating
  raterUserId: string;
  raterUserName: string;
  raterUserType: 'receiver' | 'volunteer';
  
  // Rating data
  rating: number; // 1-5
  comment?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingCounts: { [key: number]: number }; // Count of 1-star, 2-star, etc.
}

// Submit a rating
export const submitRating = async (
  targetType: 'food' | 'campaign',
  targetId: string,
  ratingData: {
    rating: number;
    comment?: string;
  }
): Promise<{success: boolean; error?: string; ratingId?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be authenticated' };
    }

    // 1. Get target details (food/campaign)
    const targetCollection = targetType === 'food' ? 'foodListings' : 'campaigns';
    const targetDoc = await getDoc(doc(db, targetCollection, targetId));
    if (!targetDoc.exists()) {
      return { success: false, error: `${targetType} not found` };
    }

    const targetData = targetDoc.data();
    
    // 2. Get user data for rater
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return { success: false, error: 'User data not found' };
    }

    const userData = userDoc.data();
    const raterUserType = userData.role === 'volunteer' ? 'volunteer' : 'receiver';

    // 3. Check if user already rated this item
    const existingRatingQuery = query(
      collection(db, 'ratings'),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      where('raterUserId', '==', user.uid)
    );

    const existingRatings = await getDocs(existingRatingQuery);
    
    let ratingId: string;

    if (!existingRatings.empty) {
      // Update existing rating
      const existingRating = existingRatings.docs[0];
      ratingId = existingRating.id;
      await updateDoc(doc(db, 'ratings', ratingId), {
        rating: ratingData.rating,
        comment: ratingData.comment,
        updatedAt: new Date()
      });
    } else {
      // Create new rating
      const rating: Omit<Rating, 'id'> = {
        targetType,
        targetId,
        targetName: targetData.title,
        ratedUserId: targetType === 'food' ? targetData.donorId : targetData.organizerId,
        ratedUserName: targetType === 'food' ? targetData.donorName : targetData.organizerName,
        ratedUserType: targetType === 'food' ? 'donor' : 'volunteer',
        raterUserId: user.uid,
        raterUserName: userData.profile?.name || userData.profile?.contactPerson || 'Anonymous User',
        raterUserType,
        rating: ratingData.rating,
        comment: ratingData.comment,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const ratingRef = await addDoc(collection(db, 'ratings'), rating);
      ratingId = ratingRef.id;
    }

    // NOTE: Rating aggregation is now handled by Cloud Function
    // The Cloud Function will automatically update food/campaign and user stats

    return { success: true, ratingId };
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to submit rating' 
    };
  }
};

// Get ratings for a specific target with pagination
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

// Get rating statistics for a target
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

// Check if user has rated an item
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