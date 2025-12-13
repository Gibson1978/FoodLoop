// FoodBrowseScreen.tsx - Final Blocking Loader Implementation
import { useState, useEffect } from "react";
import { Card, CardContent } from "../../UnifiedFolder/ui/card";
import { Button } from "../../UnifiedFolder/ui/button";
import { Input } from "../../UnifiedFolder/ui/input";
import { Badge } from "../../UnifiedFolder/ui/badge";
import { ImageWithFallback } from "../../UnifiedFolder/Images/ImageWithFallback";
import { AdvancedFilterBar } from "../../UnifiedFolder/ui/AdvancedFilterBar";
import type { FilterOptions } from "../../UnifiedFolder/ui/AdvancedFilterBar";
import { 
  Search, 
  Clock, 
  Star,
  Package,
  Tag,
  Calendar,
  RefreshCw,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Leaf,
  Users,
  Flag
} from "lucide-react";
import { getApprovedFoodListings, type FoodListing } from "../../Firebase/foodUsers";
import { useLocation } from "../../UnifiedFolder/LocationFolder/useLocation";
import { 
  getUserFoodReservations, 
  cancelFoodReservation,
  type FoodReservation 
} from "../../Firebase/reservationService";
import { RatingDialog } from '../../UnifiedFolder/modals/RatingDialog';
import { RatingService, type RatingItem } from '../../UnifiedFolder/services/ratingServices';
import { usePullToRefresh } from "../../UnifiedFolder/services/usePullToRefresh";
import { toast } from "sonner";
import { ReportModal } from "../../UnifiedFolder/modals/ReportModal";

interface FoodBrowseScreenProps {
  onSelectFood: (foodId: string) => void;
  userRole: 'receiver' | 'volunteer';
}

export function FoodBrowseScreen({ onSelectFood, userRole }: FoodBrowseScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [foodItems, setFoodItems] = useState<FoodListing[]>([]);
  const [userReservations, setUserReservations] = useState<FoodReservation[]>([]);
  const [loading, setLoading] = useState(true); // Tracks initial listings load
  const [initialLoading, setInitialLoading] = useState(true); // BLOCKING LOADER STATE
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<{[key: string]: boolean}>({});
  const [filters, setFilters] = useState<FilterOptions>({
    foodTypes: [],
    distance: 50,
    donorTypes: [],
    timeOptions: [],
    rating: 0,
    dietaryNeeds: [],
    reserved: null,
    quantity: 0,
  });
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [currentItemForRating, setCurrentItemForRating] = useState<RatingItem | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [currentItemForReport, setCurrentItemForReport] = useState<{
    id: string;
    name: string;
    type: 'food';
    reportedUser?: {
      id: string;
      name: string;
      email: string;
      type: 'donor' | 'volunteer' | 'receiver' | 'organizer';
    };
  } | null>(null);

  const { 
    userLocation, 
    isLoading: locationLoading,
    error: locationError, 
    refreshLocation,
    calculateDistance 
  } = useLocation();

  // Theme configuration based on user role
  const themeConfig = {
    volunteer: {
      bg: 'bg-green-50',
      gradient: 'from-emerald-600 to-green-500',
      accent: 'bg-green-600 hover:bg-green-700',
      accentLight: 'bg-green-50 text-green-700',
      badge: 'bg-green-500 text-white',
      text: 'text-green-600'
    },
    receiver: {
      bg: 'bg-amber-50',
      gradient: 'from-red-500 to-amber-500',
      accent: 'bg-amber-600 hover:bg-amber-700',
      accentLight: 'bg-amber-50 text-amber-700',
      badge: 'bg-amber-500 text-white',
      text: 'text-amber-600'
    }
  };

  const theme = themeConfig[userRole];

  // Role-specific text
  const roleText = {
    volunteer: {
      title: "Browse Food",
      subtitle: "Find food to collect and deliver",
      searchPlaceholder: "Search for food items to collect...",
      reservedFilter: "My Collections",
      quantityLabel: (level: number) => {
        if (level === 1) return 'Small';
        if (level === 2) return 'Medium';
        return 'Large';
      }
    },
    receiver: {
      title: "Browse Food", 
      subtitle: "Find fresh food near you",
      searchPlaceholder: "Search for food items...",
      reservedFilter: "My Reservations",
      quantityLabel: (level: number) => {
        if (level === 1) return 'Small';
        if (level === 2) return 'Medium';
        return 'Large';
      }
    }
  };

  const text = roleText[userRole];

  // 1. CONSOLIDATED STATUS LOAD FUNCTION
  const loadUserReservationsAndRatings = async () => { 
    try {
      const result = await getUserFoodReservations();
      if (result.success && result.data) {
        setUserReservations(result.data);
        const ratings = await RatingService.loadUserRatings(result.data, 'food');
        setUserRatings(ratings);
      }
      return true; // Success
    } catch (error) {
      console.error('Error loading user reservations and ratings:', error);
      return false; // Failure
    }
  };

  // 2. BLOCKING INITIAL LOAD EFFECT
  useEffect(() => {
    // Flag to track when food listings finish loading
    let foodListingsLoaded = false;
    // Flag to track when user status finishes loading
    let userStatusLoaded = false;
    
    // Function to check if everything is ready
    const checkReady = () => {
      if (foodListingsLoaded && userStatusLoaded) {
        setInitialLoading(false); // Remove the blocking loader
      }
    };

    // A. Start status load (reservations + ratings)
    loadUserReservationsAndRatings().then(() => {
      userStatusLoaded = true;
      checkReady();
    });

    // B. Start real-time listener for food listings
    const unsubscribeFood = getApprovedFoodListings(
      (listings) => {
        setFoodItems(listings);
        setLoading(false);
        
        // Ensure listings are processed
        foodListingsLoaded = true;
        checkReady();
      },
      (error) => {
        console.error('Real-time food listings error:', error);
        setLoading(false);
        foodListingsLoaded = true;
        checkReady();
      }
    );

    return () => unsubscribeFood();
  }, []); // Run only on mount

  // Refresh all data including location and reservations
  const handleRefresh = async () => {
    await refreshLocation();
    await loadUserReservationsAndRatings(); 
    // Note: Food listings update automatically via the real-time listener
  };

  const { 
    refreshing, 
    onTouchStart, 
    onTouchMove, 
    onTouchEnd 
  } = usePullToRefresh(handleRefresh);

  // Get user reservation for a specific food item
  const getUserReservationForFood = (foodId: string): FoodReservation | null => {
    return userReservations.find(reservation => 
      reservation.foodListingId === foodId && 
      reservation.status !== 'cancelled'
    ) || null;
  };

  // FIX: Updated getExpiryInfo to use explicit UTC+8 time zone for accurate calculations
  const getExpiryInfo = (item: FoodListing) => {
    if (!item.availableDate || !item.endTime) return { text: "Check availability", color: "text-gray-600 bg-gray-50 border-gray-200" };
    
    // Explicitly create the date/time assuming UTC+8, matching server logic
    const endDateTime = new Date(`${item.availableDate}T${item.endTime}:00+08:00`);
    const now = new Date();
    
    const timeDiff = endDateTime.getTime() - now.getTime(); // Difference in milliseconds
    const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60)); // Difference in hours, rounded up
    
    // Determine the text based on hours remaining
    if (hoursDiff <= 0) {
      // If end time is in the past, calculate how many hours ago it was
      const hoursAgo = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60));
      // Now check if it's within the 24-hour grace period defined on the server (RatingService)
      if (RatingService.isInGracePeriod(item.availableDate, item.endTime)) {
        return { 
            text: `Ended - Rating Period (${hoursAgo}h ago)`, 
            color: "text-purple-600 bg-purple-50 border-purple-200" 
        };
      }
      return { text: "Expired", color: "text-red-800 bg-red-100 border-red-300" };
    } 
    
    // Display remaining time
    if (hoursDiff <= 2) {
      return { text: `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} left`, color: "text-red-600 bg-red-50 border-red-200" };
    } else if (hoursDiff <= 6) {
      return { text: `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} left`, color: "text-orange-600 bg-orange-50 border-orange-200" };
    } else {
      const daysDiff = Math.ceil(hoursDiff / 24);
      return { text: `${daysDiff} day${daysDiff !== 1 ? 's' : ''} left`, color: "text-green-600 bg-green-50 border-green-200" };
    }
  };

  // FIX: Updated isInGracePeriod to use the explicit UTC+8 time zone for accurate checks
  const isInGracePeriod = (item: FoodListing): boolean => {
    return RatingService.isInGracePeriod(item.availableDate, item.endTime);
  };
  
  // IMMEDIATE FILTERING: Filter items on every render without useEffect delay
  const filterItems = () => {
    return foodItems.filter(item => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.donorType && item.donorType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      
      // Food type filter
      const matchesFoodType = filters.foodTypes.length === 0 || 
                             filters.foodTypes.includes(item.category);
      
      // Rating filter
      const matchesRating = filters.rating === 0 || (item.rating || 0) >= filters.rating;
      
      // Dietary needs filter
      let matchesDietary = true;
      if (filters.dietaryNeeds.length > 0 && item.tags) {
        matchesDietary = filters.dietaryNeeds.some(need => 
          item.tags.some(tag => 
            tag.toLowerCase().includes(need.toLowerCase()) ||
            need.toLowerCase().includes(tag.toLowerCase())
          )
        );
      }

      let matchesDonorType = true;
      if (filters.donorTypes.length > 0) {
        matchesDonorType = Boolean(item.donorType && filters.donorTypes.includes(item.donorType));
      }

      // Distance filter with fallback for items without geolocation
      let matchesDistance = true;
      if (userLocation && item.geolocation) {
        const foodLocation = {
          latitude: item.geolocation.latitude,
          longitude: item.geolocation.longitude
        };
        const distance = calculateDistance(userLocation, foodLocation);
        matchesDistance = distance <= filters.distance;
      }
      else if (!item.geolocation) {
        matchesDistance = true;
      }
      else if (!userLocation) {
        matchesDistance = true;
      }

      // Quantity filter
      let matchesQuantity = true;
      if (filters.quantity > 0) {
        const quantityLevel = filters.quantity;
        if (quantityLevel === 1) matchesQuantity = item.remainingQuantity < 50;
        if (quantityLevel === 2) matchesQuantity = item.remainingQuantity >= 50 && item.remainingQuantity <= 100;
        if (quantityLevel === 3) matchesQuantity = item.remainingQuantity > 100;
      }

      // **GRACE PERIOD FILTER LOGIC (FIXED)**
      const isInRatingPeriod = getExpiryInfo(item).text.includes('Rating Period');
      const userReservation = getUserReservationForFood(item.id!);
      const hasCompletedReservation = !!userReservation && 
                                    userReservation.status === 'completed';

      // Hide rating period items unless user has completed reservation
      if (isInRatingPeriod && !hasCompletedReservation) {
        return false;
      }
      // **END GRACE PERIOD FILTER**

      // Reserved filter - Now using actual reservation data
      let matchesReserved = true;
        if (filters.reserved !== null) {
          // Re-get userReservation for clarity, although it's already computed
          const currentReservation = getUserReservationForFood(item.id!);
          
          if (filters.reserved === 'my') {
            // "My Reservations" - user has an active reservation
            matchesReserved = !!currentReservation && currentReservation.status === 'confirmed';
          } else if (filters.reserved === 'available') {
            // "Available" - user doesn't have a reservation or it's completed/cancelled
            matchesReserved = !currentReservation || currentReservation.status !== 'confirmed';
          } else if (filters.reserved === 'completed') {
            // "Completed" - reservation is completed (regardless of user role)
            matchesReserved = currentReservation?.status === 'completed';
          }
        }
      
      return matchesSearch && matchesFoodType && matchesRating && matchesDietary && 
             matchesDonorType && matchesDistance && matchesQuantity && matchesReserved;
    });
  };

  // PRIORITY SORTING: Ready to Rate at the top
  const getSortedItems = (items: FoodListing[]) => {
    if (items.length === 0) return items;
    
    // Prioritize "Ready to Rate" items at the very top of the list
    return [...items].sort((a, b) => {
      // Logic to determine if an item is "Ready to Rate"
      const isReadyToRateA = 
        getUserReservationForFood(a.id!)?.status === 'completed' &&
        isInGracePeriod(a) &&
        !userRatings[a.id!];
        
      const isReadyToRateB = 
        getUserReservationForFood(b.id!)?.status === 'completed' &&
        isInGracePeriod(b) &&
        !userRatings[b.id!];
        
      // 1. Prioritize Ready to Rate: A > B = -1
      if (isReadyToRateA && !isReadyToRateB) return -1;
      if (!isReadyToRateA && isReadyToRateB) return 1;
      
      // If both are or both are not "Ready to Rate", fall back to distance sorting (2)
      if (!userLocation) return 0; // If no location, maintain current order

      // 2. Fallback: Distance Sorting (existing logic)
      if (!a.geolocation && !b.geolocation) return 0;
      if (!a.geolocation) return 1;
      if (!b.geolocation) return -1;
      
      const foodLocationA = {
        latitude: a.geolocation.latitude,
        longitude: a.geolocation.longitude
      };
      const foodLocationB = {
        latitude: b.geolocation.latitude,
        longitude: b.geolocation.longitude
      };
      
      const distA = calculateDistance(userLocation, foodLocationA);
      const distB = calculateDistance(userLocation, foodLocationB);
      return distA - distB;
    });
  };

  // Get filtered items immediately
  const filteredItems = getSortedItems(filterItems());

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleCardClick = (item: FoodListing) => {
    // Card click logic is now simple since initialLoading handles the block
    if (item.id) {
      onSelectFood(item.id);
    }
  };

  const handleRateAndComplete = async (reservationId: string, item: FoodListing) => {
    setCurrentItemForRating({
      id: item.id!,
      name: item.title,
      reservationId: reservationId,
      type: 'food' 
    });
    setRatingDialogOpen(true);
  };

  const handleReport = (item: FoodListing) => {
    setCurrentItemForReport({
      id: item.id!,
      name: item.title,
      type: 'food',
      reportedUser: {
        id: item.donorId || 'unknown',
        name: item.donorName || 'Unknown Donor',
        email: '',
        type: 'donor'
      }
    });
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (reportData: any) => {
    // Here you would send the report data to your backend
    console.log('Report submitted:', reportData);
    toast.success('Report submitted successfully');
    setReportModalOpen(false);
    setCurrentItemForReport(null);
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    const result = await RatingService.submitRating(currentItemForRating, rating, comment);
    
    if (result.success) {
      setUserRatings(prev => ({
        ...prev,
        [currentItemForRating!.id]: true
      }));
    } else {
      toast.error(result.error || 'Failed to submit rating');
    }
  };

  const handleCancel = async (reservationId: string) => {
    setActionLoading(reservationId);
    try {
      const result = await cancelFoodReservation(reservationId);
      if (result.success) {
        toast.success(userRole === 'volunteer' ? 'Collection cancelled successfully' : 'Reservation cancelled successfully');
        await loadUserReservationsAndRatings();
      } else {
        toast.error(result.error || 'Failed to cancel');
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error('Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const getDistanceBadge = (item: FoodListing) => {
    if (!userLocation || !item.geolocation) {
      return (
        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
          <MapPin className="w-3 h-3 mr-1" />
          Location unknown
        </Badge>
      );
    }
    
    const foodLocation = {
      latitude: item.geolocation.latitude,
      longitude: item.geolocation.longitude
    };
    
    try {
      const distance = calculateDistance(userLocation, foodLocation);
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          <MapPin className="w-3 h-3 mr-1" />
          {distance.toFixed(1)} km
        </Badge>
      );
    } catch (error) {
      console.error('Error calculating distance:', error);
      return (
        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
          <MapPin className="w-3 h-3 mr-1" />
          Distance error
        </Badge>
      );
    }
  };

  const getReservationStatus = (foodId: string) => {
    const reservation = getUserReservationForFood(foodId);
    return RatingService.getRatingStatus(reservation, userRatings, 'food');
  };

  const truncateDescription = (description: string, maxLength: number = 100) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  // 3. FULL SCREEN BLOCKING LOADER CHECK
  if (initialLoading) {
    return (
      <div className={`min-h-screen bg-background pb-20 ${theme.bg} flex items-center justify-center`}>
        <div className="text-center text-gray-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          Loading listings and your status...
        </div>
      </div>
    );
  }


  return (
    <>
      <div 
        className={`min-h-screen pb-20 ${theme.bg}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="fixed top-0 left-0 right-0 flex justify-center pt-4 z-50">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 animate-spin ${theme.text}`} />
              <span className={`text-sm ${theme.text}`}>Refreshing...</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={`bg-gradient-to-r ${theme.gradient} px-4 sm:px-6 pt-6 pb-6 flex flex-col justify-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{text.title}</h1>
              <p className="mt-1 text-sm sm:text-base">{text.subtitle}</p>
            </div>
            {userRole === 'volunteer' && (
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-5 sm:h-5 text-muted-foreground" />
            <Input
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 sm:h-12 bg-white rounded-xl border-0 text-foreground text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Location Status Banner */}
        {locationError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{locationError}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshLocation}
              className="text-red-700 hover:bg-red-100 ml-auto"
            >
              Retry
            </Button>
          </div>
        )}

        {locationLoading && (
          <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-blue-700 text-sm">Updating your location...</span>
          </div>
        )}

        <div className="px-3 sm:px-4 space-y-4 sm:space-y-6 pt-4">
          {/* Advanced Filter Bar */}
          <AdvancedFilterBar onFilterChange={handleFilterChange} variant={userRole} />

          {/* Filter Status Info */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-xs ${theme.text}`}>
              <MapPin className="w-4 h-4" />
              <span>
                {userLocation 
                  ? `Food within ${filters.distance} km of your location` 
                  : 'Showing all food (enable location for distance filtering)'
                }
              </span>
            </div>
            {userLocation && (
              <Badge variant="secondary" className={`text-xs text-white ${theme.badge}`}>
                Sorted by Distance
              </Badge>
            )}
          </div>

          {/* Active Filters Summary */}
          {(filters.foodTypes.length > 0 || filters.donorTypes.length > 0 || filters.dietaryNeeds.length > 0 || 
            filters.rating > 0 || filters.quantity > 0 || filters.reserved !== null) && (
            <div className="flex flex-wrap gap-2">
              {filters.foodTypes.length > 0 && (
                <Badge variant="outline" className={`text-xs ${theme.accentLight}`}>
                  Food Types: {filters.foodTypes.length}
                </Badge>
              )}
              {filters.donorTypes.length > 0 && (
                <Badge variant="outline" className={`text-xs ${theme.accentLight}`}>
                  Donor Types: {filters.donorTypes.length}
                </Badge>
              )}
              {filters.dietaryNeeds.length > 0 && (
                <Badge variant="outline" className={`text-xs ${theme.accentLight}`}>
                  Dietary: {filters.dietaryNeeds.length}
                </Badge>
              )}
              {filters.rating > 0 && (
                <Badge variant="outline" className={`text-xs ${theme.accentLight}`}>
                  {filters.rating}+ Stars
                </Badge>
              )}
              {filters.quantity > 0 && (
                <Badge variant="outline" className={`text-xs ${theme.accentLight}`}>
                  {text.quantityLabel(filters.quantity)} Quantity
                </Badge>
              )}
              {filters.reserved !== null && (
                <Badge variant="outline" className={`text-xs ${theme.accentLight}`}>
                  {filters.reserved ? text.reservedFilter : 'Available'}
                </Badge>
              )}
            </div>
          )}

          {/* Food Items */}
          <div className="space-y-3 sm:space-y-4">
            {filteredItems.map((item) => {
              const expiryInfo = getExpiryInfo(item);
              const distanceBadge = getDistanceBadge(item);
              const userReservation = getUserReservationForFood(item.id!);
              const reservationStatus = getReservationStatus(item.id!);
              const isGracePeriod = isInGracePeriod(item);
              const isRated = userRatings[item.id!];
              const isCompleted = userReservation?.status === 'completed';
              const isInRatingPeriod = expiryInfo.text.includes('Rating Period');
              const isDisabled = isRated || (isCompleted && !isGracePeriod);
              
              return (
                <Card 
                  key={item.id} 
                  className={`shadow-sm border border-border transition-all duration-200 hover:shadow-md relative ${
                    // Gray out logic is now simple: rely on isDisabled
                    isDisabled
                      ? 'opacity-60 cursor-not-allowed bg-gray-50' 
                      : 'cursor-pointer'
                  }`}
                  onClick={isDisabled ? undefined : () => handleCardClick(item)}
                >
                  {/* Big Rated Overlay - Centered and Prominent */}
                  {isRated && (
                    <div className="absolute inset-0 bg-black/10 rounded-lg flex items-center justify-center z-20">
                      <div className="bg-white/95 rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg border">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <span className="text-xl font-bold text-green-700">Rated</span>
                      </div>
                    </div>
                  )}

                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      {/* Image with Status Badges */}
                      <div className="relative m-3 sm:m-4 mb-0">
                        <div className={`w-full h-32 sm:h-40 rounded-xl overflow-hidden ${
                          isDisabled ? 'grayscale' : ''
                        }`}>
                          <ImageWithFallback
                            src={item.images?.[0] || '/placeholder-food.jpg'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </div>
                      </div>

                      {/* Status Badges - Top Right of Entire Card */}
                      <div className="absolute top-4 right-4 flex flex-col gap-1 z-20">
                        {reservationStatus && (
                          <Badge className={`${reservationStatus.color} text-xs font-medium h-8 px-3 flex items-center`}>
                            {reservationStatus.text}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Content below image - Improved Layout */}
                      <div className="p-3 sm:p-4 space-y-3">
                        {/* Title and Rating on same line */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-base sm:text-lg leading-tight ${
                              isDisabled ? 'text-gray-500' : 'text-foreground'
                            }`}>
                              {item.title}
                            </h3>
                          </div>
                          {/* Rating moved to be beside title */}
                          <div className={`flex items-center text-sm whitespace-nowrap flex-shrink-0 ${
                            isDisabled ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>
                            <Star className="w-4 h-4 mr-1 fill-current text-yellow-500" />
                            {(item.rating && item.rating > 0) ? item.rating.toFixed(1) : 'New'}
                          </div>
                        </div>

                        {/* Quantity and Category */}
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center text-sm font-medium ${
                            isDisabled ? 'text-gray-400' : userRole === 'volunteer' ? 'text-green-600' : 'text-amber-600'
                          }`}>
                            <Package className="w-4 h-4 mr-2" />
                            {item.remainingQuantity} {item.quantityUnit} left
                          </div>
                          <Badge variant="outline" className={`text-xs px-2 py-1 ${
                            isDisabled 
                              ? 'bg-gray-100 text-gray-500 border-gray-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {item.category}
                          </Badge>
                        </div>

                        {/* Distance and Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          {distanceBadge}
                          {item.tags && item.tags.slice(0, 2).map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className={`text-xs px-2 py-1 ${
                                isDisabled ? 'bg-gray-100 text-gray-400' : 'bg-gray-100'
                              }`}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Description */}
                        {item.description && (
                          <div className={`text-xs sm:text-sm leading-relaxed ${
                            isDisabled ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <p className="line-clamp-2 break-words whitespace-pre-wrap">
                              {truncateDescription(item.description, 120)}
                            </p>
                          </div>
                        )}

                        {/* Date and Time */}
                        <div className={isDisabled ? 'opacity-50' : ''}>
                          {item.availableDate && item.startTime && item.endTime ? (
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  {new Date(item.availableDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>{item.startTime} - {item.endTime}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>Check availability</span>
                            </div>
                          )}
                        </div>

                        {/* Donor Info */}
                        <div className={`flex items-start text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Users className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="break-words whitespace-pre-wrap flex-1 min-w-0">
                            By {item.donorName}
                          </span>
                          {item.donorType && (
                            <Badge variant="outline" className="ml-2 text-xs bg-gray-50 flex-shrink-0">
                              {item.donorType}
                            </Badge>
                          )}
                        </div>

                        {/* Footer with expiry and action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-3 py-1 border ${
                              isDisabled ? 'bg-gray-100 text-gray-400 border-gray-200' : expiryInfo.color
                            }`}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {expiryInfo.text}
                          </Badge>

                          {/* Action Buttons - Report replaces Cancel when completed */}
                          {userReservation && (
                          <div className="flex gap-2">
                            {userReservation.status === 'completed' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => !isRated && handleRateAndComplete(userReservation.id!, item)}
                                  // Disable if already rated
                                  disabled={isRated || actionLoading === userReservation.id}
                                  className={`h-8 px-3 text-xs ${
                                    isRated
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'border-green-700 bg-green-600 text-white'
                                  }`}
                                >
                                  {isRated ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Rated
                                    </>
                                  ) : (
                                    <>
                                      <Star className="w-3 h-3 mr-1" />
                                      Rate
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReport(item)}
                                  disabled={actionLoading === userReservation.id} 
                                  className="h-8 px-3 text-xs border-red-600 text-white bg-red-600 hover:bg-red-100"
                                >
                                  <Flag className="w-3 h-3 mr-1" />
                                  Report
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(userReservation.id!)}
                                // Disable if already rated
                                disabled={userReservation.status !== 'confirmed' || actionLoading === userReservation.id || isRated}
                                className={`h-8 px-3 text-xs ${
                                  (userReservation.status === 'confirmed' && !isRated)
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Search className="w-6 h-6 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">No food items found</h3>
              <p className="text-muted-foreground text-sm sm:text-lg mb-4">
                {userLocation 
                  ? "Try adjusting your search filters or check back later for new listings."
                  : "Enable location services to see food near you."
                }
              </p>
              {!userLocation && !locationLoading && (
                <Button onClick={refreshLocation} variant="outline">
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable Location
                </Button>
              )}
            </div>
          )}
        </div>

        <RatingDialog
          userType={userRole}
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          type="food"
          itemId={currentItemForRating?.id || ''}
          itemName={currentItemForRating?.name || ''}
          onRated={handleRatingSubmit}
        />
      </div>

      {/* Report Modal */}
      {currentItemForReport && (
        <ReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          reportType="food"
          targetId={currentItemForReport.id}
          targetName={currentItemForReport.name}
          reportedUser={currentItemForReport.reportedUser}
          onClose={() => {
            setReportModalOpen(false);
            setCurrentItemForReport(null);
          }}
          onSubmit={handleReportSubmit}
        />
      )}
    </>
  );
}