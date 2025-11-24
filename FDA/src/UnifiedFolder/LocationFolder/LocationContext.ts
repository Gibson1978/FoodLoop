// FDA/src/contexts/LocationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LocationService, type LocationCoords } from './LocationService';

interface LocationContextType {
  userLocation: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
  hasPermission: boolean;
}

// Create context with undefined as default
const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Use regular function instead of React.FC to avoid JSX issues
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Cache utilities
  const cacheLocation = (location: LocationCoords): void => {
    localStorage.setItem('userLocation', JSON.stringify({
      ...location,
      timestamp: Date.now()
    }));
  };

  const getCachedLocation = (): LocationCoords | null => {
    try {
      const cached = localStorage.getItem('userLocation');
      if (!cached) return null;

      const locationData = JSON.parse(cached);
      // Consider location valid for 30 minutes
      if (Date.now() - locationData.timestamp < 30 * 60 * 1000) {
        const { timestamp, ...location } = locationData;
        return location;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Try to load cached location on mount
  useEffect(() => {
    const cachedLocation = getCachedLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setHasPermission(true);
    }
  }, []);

  const refreshLocation = async (): Promise<void> => {
    if (!LocationService.isSupported()) {
      setError('Geolocation not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const location = await LocationService.getCurrentLocation();
      setUserLocation(location);
      setHasPermission(true);
      cacheLocation(location);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: LocationContextType = {
    userLocation,
    isLoading,
    error,
    refreshLocation,
    hasPermission
  };

  return React.createElement(
    LocationContext.Provider,
    { value: contextValue },
    children
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}