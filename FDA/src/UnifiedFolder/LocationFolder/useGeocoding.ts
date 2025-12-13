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
    
    // Try Cloud Function with retry
    const result = await retryCloudFunctionGeocode(address, 3);
    if (result) {
      return result;
    }
    
    console.log('📍 All geocoding attempts failed');
    return null;
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

const retryCloudFunctionGeocode = async (
  address: string, 
  maxRetries: number
): Promise<GeocodeResult | null> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for geocoding`);
        // Exponential backoff: wait longer between retries
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await delay(delayMs);
      }
      
      const result = await cloudFunctionGeocode(address);
      if (result) {
        return result;
      }
      
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Geocoding attempt ${attempt} failed:`, error.message || error);
      
      // Don't retry on certain errors
      if (error.code === 'functions/not-found' || 
          error.code === 'functions/internal' ||
          error.code === 'functions/permission-denied') {
        console.warn('⚠️ Non-retryable error, stopping retries');
        break;
      }
    }
  }
  
  if (lastError) {
    throw lastError;
  }
  
  return null;
};

// Utility function for delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};