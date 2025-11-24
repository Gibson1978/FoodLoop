// FDA/src/hooks/useLocation.ts (REPLACE entirely)
import { useLocation as useLocationContext } from './LocationContext';
import { LocationService } from './LocationService';

// This hook now uses the context instead of managing its own state
export const useLocation = () => {
  const context = useLocationContext();
  
  return {
    ...context,
    isSupported: LocationService.isSupported(),
    calculateDistance: LocationService.calculateDistance
  };
};