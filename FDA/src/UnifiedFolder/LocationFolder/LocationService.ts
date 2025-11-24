// FDA/src/services/LocationService.ts

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration?: number; // in minutes (optional)
}

export class LocationService {
  // Check if geolocation is supported
  static isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Get current position
  static async getCurrentLocation(): Promise<LocationCoords> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error(this.getErrorMessage(error)));
        },
        { 
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Calculate distance between two coordinates using Haversine formula
  static calculateDistance(
    coord1: LocationCoords, 
    coord2: LocationCoords
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = LocationService.deg2rad(coord2.latitude - coord1.latitude); // FIX: Use LocationService.deg2rad instead of this.deg2rad
    const dLon = LocationService.deg2rad(coord2.longitude - coord1.longitude); // FIX: Use LocationService.deg2rad instead of this.deg2rad
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(LocationService.deg2rad(coord1.latitude)) * // FIX: Use LocationService.deg2rad instead of this.deg2rad
      Math.cos(LocationService.deg2rad(coord2.latitude)) * // FIX: Use LocationService.deg2rad instead of this.deg2rad
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions.';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable. Please check your connection.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Unable to get location';
    }
  }
}