// ratingService.ts
import { submitRating, getUserRatingForItem } from '../../Firebase/firebase-rating';
import { toast } from 'sonner';

export interface RatingItem {
  id: string;
  name: string;
  reservationId: string;
  type: 'food' | 'campaign';
}

export class RatingService {
  static async submitRating(
    currentItem: RatingItem | null,
    rating: number,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!currentItem) return { success: false, error: 'No item selected' };

    try {
      const result = await submitRating(currentItem.type, currentItem.id, {
        rating,
        comment,
        reservationId: currentItem.reservationId
      });

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to submit rating' };
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      return { success: false, error: 'Failed to submit rating' };
    }
  }

  static async loadUserRatings(
    reservations: any[],
    type: 'food' | 'campaign'
  ): Promise<{[key: string]: boolean}> {
    const ratings: {[key: string]: boolean} = {};
    
    for (const reservation of reservations) {
      const isCompleted = type === 'food' 
        ? reservation.status === 'completed'
        : reservation.status === 'attended';
      
      if (isCompleted) {
        const itemId = type === 'food' ? reservation.foodListingId : reservation.campaignId;
        const result = await getUserRatingForItem(type, itemId);
        ratings[itemId] = result.success && !!result.data;
      }
    }
    
    return ratings;
  }

  static isInGracePeriod(availableDate?: string, endTime?: string): boolean {
    if (!availableDate || !endTime) return false;
    
    const endDateTime = new Date(`${availableDate}T${endTime}:00+08:00`);
    const gracePeriodEnd = new Date(endDateTime.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    const now = new Date();
    
    return now > endDateTime && now < gracePeriodEnd;
  }

  static getRatingStatus(
    reservation: any,
    userRatings: {[key: string]: boolean},
    type: 'food' | 'campaign'
  ) {
    if (!reservation) return null;

    const itemId = type === 'food' ? reservation.foodListingId : reservation.campaignId;
    const isRated = userRatings[itemId];
    
    const statusConfig = {
      food: {
        confirmed: { color: 'bg-blue-100 text-blue-800', text: 'Reserved' },
        completed: { 
          color: isRated ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800', 
          text: isRated ? 'Rated' : 'Ready to Rate' 
        },
        cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' }
      },
      campaign: {
        registered: { color: 'bg-blue-100 text-blue-800', text: 'Registered' },
        attended: { 
          color: isRated ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800', 
          text: isRated ? 'Rated' : 'Ready to Rate' 
        },
        cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' }
      }
    };

    const config = statusConfig[type];
    return config[reservation.status as keyof typeof config];
  }
}