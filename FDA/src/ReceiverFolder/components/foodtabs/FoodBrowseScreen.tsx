import { useState, useEffect } from "react";
import { Card, CardContent } from "../../../UnifiedFolder/ui/card";
import { Button } from "../../../UnifiedFolder/ui/button";
import { Input } from "../../../UnifiedFolder/ui/input";
import { Badge } from "../../../UnifiedFolder/ui/badge";
import { ImageWithFallback } from "../../../UnifiedFolder/Images/ImageWithFallback";
import { AdvancedFilterBar } from "../../../UnifiedFolder/ui/AdvancedFilterBar";
import type { FilterOptions } from "../../../UnifiedFolder/ui/AdvancedFilterBar";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../UnifiedFolder/ui/alert-dialog";
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
  XCircle
} from "lucide-react";
import { getApprovedFoodListings, type FoodListing } from "../../../Firebase/foodUsers";
import { useLocation } from "../../../UnifiedFolder/LocationFolder/useLocation";
import { 
  getUserFoodReservations, 
  cancelFoodReservation,
  type FoodReservation 
} from "../../../Firebase/reservationService";
import { RatingDialog } from '../../../UnifiedFolder/modals/RatingDialog';
import { submitRating, getUserRatingForItem } from '../../../Firebase/firebase-rating';
import { toast } from "sonner";

interface FoodBrowseScreenProps {
  onSelectFood: (foodId: string) => void;
}

export function FoodBrowseScreen({ onSelectFood }: FoodBrowseScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [foodItems, setFoodItems] = useState<FoodListing[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodListing[]>([]);
  const [userReservations, setUserReservations] = useState<FoodReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    foodTypes: [],
    distance: 10,
    donorTypes: [],
    timeOptions: [],
    rating: 0,
    dietaryNeeds: [],
    reserved: null,
    quantity: 0,
  });
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [currentItemForRating, setCurrentItemForRating] = useState<{
    id: string;
    name: string;
    reservationId: string;
  } | null>(null);

  const { 
    userLocation, 
    isLoading: locationLoading,
    error: locationError, 
    refreshLocation,
    calculateDistance 
  } = useLocation();

  // Load user reservations
  const loadUserReservations = async () => {
    try {
      const result = await getUserFoodReservations();
      if (result.success && result.data) {
        setUserReservations(result.data);
      }
    } catch (error) {
      console.error('Error loading user reservations:', error);
    }
  };

  // Refresh all data including location and reservations
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLocation();
      await loadUserReservations();
    } finally {
      setRefreshing(false);
    }
  };

  // REAL-TIME: Set up real-time listener for approved food listings
  useEffect(() => {
    const unsubscribe = getApprovedFoodListings(
      (listings) => {
        setFoodItems(listings);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time food listings error:', error);
        setLoading(false);
      }
    );

    // Load user reservations on component mount
    loadUserReservations();

    return () => unsubscribe();
  }, []);

  // Get user reservation for a specific food item
  const getUserReservationForFood = (foodId: string): FoodReservation | null => {
    return userReservations.find(reservation => 
      reservation.foodListingId === foodId && 
      reservation.status !== 'cancelled'
    ) || null;
  };

  // Filter items based on search, filters, and location
  useEffect(() => {
    let filtered = foodItems.filter(item => {
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

      // Reserved filter - Now using actual reservation data
      let matchesReserved = true;
      if (filters.reserved !== null) {
        const userReservation = getUserReservationForFood(item.id!);
        if (filters.reserved === true) {
          // "My Reservations" - user has an active reservation
          matchesReserved = !!userReservation && userReservation.status === 'confirmed';
        } else {
          // "Available" - user doesn't have a reservation or it's completed/cancelled
          matchesReserved = !userReservation || userReservation.status !== 'confirmed';
        }
      }
      
      return matchesSearch && matchesFoodType && matchesRating && matchesDietary && 
             matchesDonorType && matchesDistance && matchesQuantity && matchesReserved;
    });

    // Sort by distance if location is available
    if (userLocation) {
      filtered = filtered.sort((a, b) => {
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
    }

    setFilteredItems(filtered);
  }, [foodItems, searchQuery, filters, userLocation, calculateDistance, userReservations]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleCardClick = (item: FoodListing) => {
    if (item.id) {
      onSelectFood(item.id);
    }
  };

  const checkUserRating = async (foodId: string) => {
    const result = await getUserRatingForItem('food', foodId);
    if (result.success && result.data) {
      // User has already rated this item
      return result.data;
    }
    return null;
  };

  const handleRateAndComplete = async (reservationId: string, foodItem: FoodListing, event: React.MouseEvent) => {
    event.stopPropagation();
    setCurrentItemForRating({
      id: foodItem.id!,
      name: foodItem.title,
      reservationId: reservationId
    });
    setRatingDialogOpen(true);
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    if (!currentItemForRating) return;

    try {
      const result = await submitRating('food', currentItemForRating.id, {
        rating,
        comment,
      });

      if (result.success) {
        toast.success('Thank you for your rating!');
        await loadUserReservations(); // Refresh to update status
      } else {
        toast.error(result.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };

  const handleCancel = async (reservationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActionLoading(reservationId);
    try {
      const result = await cancelFoodReservation(reservationId);
      if (result.success) {
        toast.success('Reservation cancelled successfully');
        await loadUserReservations(); // Refresh reservations
      } else {
        toast.error(result.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation');
    } finally {
      setActionLoading(null);
    }
  };

  const getExpiryInfo = (item: FoodListing) => {
    if (!item.availableDate) return { text: "Check availability", color: "text-gray-600 bg-gray-50 border-gray-200" };
    
    const availableDate = new Date(item.availableDate);
    const now = new Date();
    const timeDiff = availableDate.getTime() - now.getTime();
    const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
    
    if (hoursDiff <= 2) {
      return { text: `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} left`, color: "text-red-600 bg-red-50 border-red-200" };
    } else if (hoursDiff <= 6) {
      return { text: `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} left`, color: "text-orange-600 bg-orange-50 border-orange-200" };
    } else {
      return { text: `${Math.ceil(hoursDiff / 24)} day${Math.ceil(hoursDiff / 24) !== 1 ? 's' : ''} left`, color: "text-green-600 bg-green-50 border-green-200" };
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      "Fresh Produce": "Fresh Produce",
      "Shelf Stable": "Shelf Stable", 
      "Cooked Meals": "Cooked Meals"
    };
    return categoryMap[category] || category;
  };

  const truncateDescription = (description: string, maxLength: number = 100) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  const formatDateTimeDisplay = (item: FoodListing) => {
    if (item.availableDate && item.startTime && item.endTime) {
      const dateText = new Date(item.availableDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{dateText}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{item.startTime} - {item.endTime}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>Check availability</span>
      </div>
    );
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
    if (!reservation) return null;

    const statusConfig = {
      confirmed: { color: 'bg-blue-100 text-blue-800', text: 'Reserved' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Ready to Rate' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' }
    };

    return statusConfig[reservation.status as keyof typeof statusConfig];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 bg-amber-50 flex items-center justify-center">
        <div className="text-center text-gray-600">Loading food listings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 bg-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-amber-500 px-4 sm:px-6 pt-6 pb-6 flex flex-col justify-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Browse Food</h1>
            <p className="mt-1 text-sm sm:text-base">Find fresh food near you</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || locationLoading}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing || locationLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-5 sm:h-5 text-muted-foreground" />
          <Input
            placeholder="Search for food items..."
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
        <AdvancedFilterBar onFilterChange={handleFilterChange} variant="receiver" />

        {/* Filter Status Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-orange-600">
            <MapPin className="w-4 h-4" />
            <span>
              {userLocation 
                ? `Food within ${filters.distance} km of your location` 
                : 'Showing all food (enable location for distance filtering)'
              }
            </span>
          </div>
          {userLocation && (
            <Badge variant="secondary" className="text-xs text-white bg-amber-500">
              Sorted by Distance
            </Badge>
          )}
        </div>

        {/* Active Filters Summary */}
        {(filters.foodTypes.length > 0 || filters.donorTypes.length > 0 || filters.dietaryNeeds.length > 0 || 
          filters.rating > 0 || filters.quantity > 0 || filters.reserved !== null) && (
          <div className="flex flex-wrap gap-2">
            {filters.foodTypes.length > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                Food Types: {filters.foodTypes.length}
              </Badge>
            )}
            {filters.donorTypes.length > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                Donor Types: {filters.donorTypes.length}
              </Badge>
            )}
            {filters.dietaryNeeds.length > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                Dietary: {filters.dietaryNeeds.length}
              </Badge>
            )}
            {filters.rating > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                {filters.rating}+ Stars
              </Badge>
            )}
            {filters.quantity > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                {filters.quantity === 1 ? 'Small' : filters.quantity === 2 ? 'Medium' : 'Large'} Quantity
              </Badge>
            )}
            {filters.reserved !== null && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                {filters.reserved ? 'My Reservations' : 'Available'}
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

            return (
              <Card 
                key={item.id} 
                className="shadow-sm border border-border cursor-pointer transition-all duration-200 hover:shadow-md"
                onClick={() => handleCardClick(item)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    {/* Image - Full width above content */}
                    <div className="relative m-3 sm:m-4 mb-0">
                      <div className="w-full h-32 sm:h-40 rounded-xl overflow-hidden">
                        <ImageWithFallback
                          src={item.images?.[0] || '/placeholder-food.jpg'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {reservationStatus && (
                        <div className="absolute top-2 right-2">
                          <Badge className={reservationStatus.color}>
                            {reservationStatus.text}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Content below image */}
                    <div className="p-3 sm:p-4 space-y-3">
                      {/* 1. Title and Amount Left */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight pr-2">
                            {item.title}
                          </h3>
                          <div className="flex items-center mt-1 text-sm sm:text-base text-amber-600 font-medium">
                            <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            {item.remainingQuantity} {item.quantityUnit} left
                          </div>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 fill-current text-yellow-500" />
                          {item.rating?.toFixed(1) || 'New'}
                        </div>
                      </div>

                      {/* 2. Food Type, Distance, and Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                          {getCategoryLabel(item.category)}
                        </Badge>
                        {distanceBadge}
                        {item.tags && item.tags.slice(0, 2).map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-xs sm:text-sm px-2 py-1 bg-gray-100"
                          >
                            <Tag className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {item.tags && item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* 3. Description Snippet */}
                      {item.description && (
                        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                          <p className="line-clamp-2">{truncateDescription(item.description, 120)}</p>
                        </div>
                      )}

                      {/* 4. Date and Time */}
                      {formatDateTimeDisplay(item)}

                      {/* 5. Footer with expiry and action buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs sm:text-sm px-2 sm:px-3 py-1 border ${expiryInfo.color}`}
                        >
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          {expiryInfo.text}
                        </Badge>

                        {/* Action Buttons */}
                        {userReservation && (
                          <div className="flex gap-2">
                            {/* Complete/Rate Button - Only enabled when status is completed */}
                            <Button
                              size="sm"
                              onClick={(e) => handleRateAndComplete(userReservation.id!, item, e)}
                              disabled={actionLoading === userReservation.id}
                              className="h-8 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Rate & Complete
                            </Button>
                            
                            {/* Cancel Button - Only enabled when status is confirmed */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleCancel(userReservation.id!, e)}
                              disabled={userReservation.status !== 'confirmed' || actionLoading === userReservation.id}
                              className={`h-8 px-3 text-xs ${
                                userReservation.status === 'confirmed'
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
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
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          type="food"
          itemId={currentItemForRating?.id || ''}
          itemName={currentItemForRating?.name || ''}
          onRated={handleRatingSubmit}
        />
    </div>
  );
}