// UnifiedFolder/location/externalMaps.ts
export const openExternalMap = (
  destination: { latitude: number; longitude: number }, 
  address?: string
) => {
  const { latitude, longitude } = destination;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // Apple Maps - prefers coordinates
    window.open(`http://maps.apple.com/?ll=${latitude},${longitude}&z=16`, '_blank');
  } else {
    // Google Maps - use address if available for better accuracy
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
    }
  }
};

export const openExternalMapWithAddress = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
};

// Alternative with directions
export const openExternalMapWithDirections = (
  destination: { latitude: number; longitude: number } | string,
  userLocation?: { latitude: number; longitude: number }
) => {
  let url: string;
  
  if (typeof destination === 'string') {
    // Destination is an address string
    const encodedDestination = encodeURIComponent(destination);
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
  } else {
    // Destination is coordinates
    const { latitude, longitude } = destination;
    url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  
  // Add origin if user location is provided
  if (userLocation) {
    url += `&origin=${userLocation.latitude},${userLocation.longitude}`;
  }
  
  window.open(url, '_blank');
};