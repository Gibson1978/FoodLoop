// FDA/src/services/DashboardServices.ts

import { LocationService, type LocationCoords } from '../../UnifiedFolder/LocationFolder/LocationService';

export interface SortableItem {
  id?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  } | null;
  rating?: number;
  donorId?: string;
  organizerId?: string; // For campaigns
  title?: string;
  [key: string]: any;
}

export class DashboardService {
  // Always returns items, even with invalid/missing data
  static getTopDashboardItems<T extends SortableItem>(
    items: T[], 
    userLocation: LocationCoords | null,
    limit: number = 3
  ): T[] {
    
    if (!items || items.length === 0) {
      return [];
    }

    // If we have very few items, just return them ALL (don't filter by unique donors)
    if (items.length <= limit) {
      console.log(`📦 Few items (${items.length} <= ${limit}), returning all items`);
      // Sort them properly but return all
      if (userLocation) {
        return this.sortByRatingAndDistance(items, userLocation);
      } else {
        return this.sortByRating(items);
      }
    }

    let sortedItems: T[];
    
    if (userLocation) {
      sortedItems = this.sortByRatingAndDistance(items, userLocation);
    } else {
      sortedItems = this.sortByRating(items);
    }

    console.log(`📊 Sorted ${sortedItems.length} items, now prioritizing unique donors`);
    const finalResult = this.prioritizeUniqueDonorsWithFallback(sortedItems, limit);
    console.log(`✅ Final result: ${finalResult.length} items`);
    return finalResult;
  }

  private static sortByRatingAndDistance<T extends SortableItem>(
    items: T[], 
    userLocation: LocationCoords
  ): T[] {
    return [...items].sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      
      // First sort by rating (descending)
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      
      // If ratings are equal, try to sort by distance
      const hasLocationA = a.geolocation && 
        typeof a.geolocation.latitude === 'number' && 
        typeof a.geolocation.longitude === 'number';
      
      const hasLocationB = b.geolocation && 
        typeof b.geolocation.latitude === 'number' && 
        typeof b.geolocation.longitude === 'number';

      if (hasLocationA && hasLocationB) {
        const distanceA = LocationService.calculateDistance(userLocation, a.geolocation!);
        const distanceB = LocationService.calculateDistance(userLocation, b.geolocation!);
        return distanceA - distanceB;
      }
      
      if (hasLocationA) return -1;
      if (hasLocationB) return 1;
      
      // If neither has location, maintain original order
      return 0;
    });
  }

  private static sortByRating<T extends SortableItem>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });
  }

  /**
   * NEW METHOD: Prioritizes unique donors but fills with same donor if needed
   */
  private static prioritizeUniqueDonorsWithFallback<T extends SortableItem>(
    sortedItems: T[], 
    limit: number
  ): T[] {
    const result: T[] = [];
    const usedDonorIds = new Set<string>();
    
    console.log(`👥 Starting unique donor prioritization with ${sortedItems.length} items, limit: ${limit}`);

    // Phase 1: Try to get unique donors in sorted order
    for (const item of sortedItems) {
      if (result.length >= limit) break;
      
      const donorId = item.donorId || item.organizerId;
      
      if (donorId) {
        if (!usedDonorIds.has(donorId)) {
          usedDonorIds.add(donorId);
          result.push(item);
          console.log(`✅ Added unique donor item: ${item.title} from donor ${donorId}`);
        }
      } else {
        // Items without donorId are always considered unique
        result.push(item);
        console.log(`✅ Added item without donor ID: ${item.title}`);
      }
    }

    console.log(`📊 After unique donor phase: ${result.length} items, ${usedDonorIds.size} unique donors`);

    // Phase 2: If we need more items, fill with remaining best items (even from same donors)
    if (result.length < limit) {
      console.log(`🔄 Need ${limit - result.length} more items, filling with best available`);
      
      for (const item of sortedItems) {
        if (result.length >= limit) break;
        
        // Skip items already in result
        if (!result.includes(item)) {
          result.push(item);
          const donorId = item.donorId || item.organizerId;
          console.log(`➕ Added additional item: ${item.title} from donor ${donorId}`);
        }
      }
    }

    console.log(`🎯 Final selection: ${result.length} items`);
    return result;
  }

  /**
   * This method is only used when we specifically want unique donors
   */
  private static getUniqueDonorsByDonorId<T extends SortableItem>(items: T[]): T[] {
    const seenDonorIds = new Set<string>();
    const result: T[] = [];
    
    for (const item of items) {
      const donorId = item.donorId || item.organizerId;
      if (donorId && !seenDonorIds.has(donorId)) {
        seenDonorIds.add(donorId);
        result.push(item);
      } else if (!donorId) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Shuffle array for random selection when ratings are equal
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Enhanced version that handles the case when all ratings are equal
   */
  static getTopDashboardItemsEnhanced<T extends SortableItem>(
    items: T[], 
    userLocation: LocationCoords | null,
    limit: number = 3
  ): T[] {
    
    if (!items || items.length === 0) {
      return [];
    }

    // If we have very few items, just return them ALL
    if (items.length <= limit) {
      console.log(`📦 Few items (${items.length} <= ${limit}), returning all`);
      if (userLocation) {
        return this.sortByRatingAndDistance(items, userLocation);
      } else {
        return this.sortByRating(items);
      }
    }

    let sortedItems: T[];
    
    if (userLocation) {
      sortedItems = this.sortByRatingAndDistance(items, userLocation);
    } else {
      sortedItems = this.sortByRating(items);
    }

    // Check if all ratings are equal (or all 0)
    const allSameRating = sortedItems.every(item => 
      (item.rating || 0) === (sortedItems[0]?.rating || 0)
    );

    // If all ratings are the same, shuffle for variety
    if (allSameRating) {
      console.log('🎲 All items have same rating, shuffling for variety');
      sortedItems = this.shuffleArray(sortedItems);
    }

    return this.prioritizeUniqueDonorsWithFallback(sortedItems, limit);
  }

  // Fallback method for emergency use
  static getFallbackItems<T extends SortableItem>(items: T[], limit: number = 3): T[] {
    if (!items || items.length === 0) return [];
    
    // Just return first 'limit' items as fallback
    return items.slice(0, limit);
  }
}