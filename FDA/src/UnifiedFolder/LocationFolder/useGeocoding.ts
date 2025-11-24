// FDA/src/firebase/geocoding.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../Firebase/firebase';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  try {
    console.log('📍 Attempting to geocode address:', address);
    
    // Strategy: Try Cloud Function first, then fall back to direct API
    try {
      // First try Cloud Function
      const result = await cloudFunctionGeocode(address);
      if (result) {
        return result;
      }
    } catch (cloudError) {
      console.warn('⚠️ Cloud Function geocoding failed, trying direct API...', cloudError);
    }

    // Fall back to direct geocoding if Cloud Function fails
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      console.log('📍 Using direct Google Maps API as fallback');
      return await directGeocode(address, apiKey);
    } else {
      console.log('📍 No API key found, cannot geocode address');
      return null;
    }
  } catch (error: any) {
    console.error('❌ All geocoding methods failed:', error);
    console.warn('⚠️ Proceeding without coordinates');
    return null;
  }
};

// Cloud Function geocoding
const cloudFunctionGeocode = async (address: string): Promise<GeocodeResult | null> => {
  try {
    console.log('📍 Calling Cloud Function for geocoding');
    
    // Use simpler typing to avoid TypeScript issues
    const geocodeFunction = httpsCallable(functions, 'geocodeAddress');
    
    const result = await geocodeFunction({ address });
    
    console.log('✅ Cloud Function geocoding successful:', result.data);
    return result.data as GeocodeResult;
  } catch (error: any) {
    console.error('❌ Cloud Function geocoding failed:', error);
    
    // Handle specific error types
    if (error.code === 'functions/not-found') {
      console.warn('⚠️ Cloud Function not found. Make sure it is deployed.');
    } else if (error.code === 'functions/unavailable') {
      console.warn('⚠️ Cloud Function unavailable. Check your internet connection.');
    } else if (error.code === 'functions/internal') {
      console.warn('⚠️ Cloud Function internal error.');
    }
    
    throw error; // Re-throw to trigger fallback
  }
};

// Direct geocoding as fallback
const directGeocode = async (address: string, apiKey: string): Promise<GeocodeResult | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === "OK" && result.results[0]) {
      const location = result.results[0].geometry.location;
      const formattedAddress = result.results[0].formatted_address;
      
      console.log('✅ Direct geocoding successful:', { latitude: location.lat, longitude: location.lng });
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: formattedAddress
      };
    } else if (result.status === "ZERO_RESULTS") {
      console.warn('⚠️ No results found for address:', address);
      return null;
    } else {
      console.warn('⚠️ Geocoding API returned status:', result.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Direct geocoding failed:', error);
    return null;
  }
};