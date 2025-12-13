import { Card, CardContent, CardHeader, CardTitle } from "../../UnifiedFolder/ui/card";
import { Button } from "../../UnifiedFolder/ui/button";
import { Badge } from "../../UnifiedFolder/ui/badge";
import { ImageWithFallback } from "../../UnifiedFolder/Images/ImageWithFallback";
import { useState, useEffect } from "react";
import { 
  MapPin, 
  Clock, 
  Users,
  Leaf,
  Heart,
  ArrowRight,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Package
} from "lucide-react";
import { SustainabilityTipCard } from "../../UnifiedFolder/ui/SustainabilityTip";
import { getCurrentUserData, type UserData } from "../../Firebase/auth";
import { getApprovedFoodListings, type FoodListing } from "../../Firebase/foodUsers";
import { getActiveCampaigns, type Campaign } from "../../Firebase/campaignUsers";
import { DashboardService } from "../../UnifiedFolder/services/DashboardServices";
import { useLocation } from "../../UnifiedFolder/LocationFolder/useLocation";
import { UserMetricsService, type UserMetrics } from '../../UnifiedFolder/services/userMetricServices';
import { usePullToRefresh } from "../../UnifiedFolder/services/usePullToRefresh";
import { getUserCampaignRegistrations, getUserFoodReservations, type CampaignRegistration, type FoodReservation } from "../../Firebase/reservationService";

interface HomeScreenProps {
  onNavigate: (tab: string, itemId?: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [recommendedFood, setRecommendedFood] = useState<FoodListing[]>([]);
  const [recommendedCampaigns, setRecommendedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [foodLoading, setFoodLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [userReservations, setUserReservations] = useState<FoodReservation[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<CampaignRegistration[]>([]);
  
  const { 
    userLocation, 
    isLoading: locationLoading, 
    error: locationError, 
    refreshLocation 
  } = useLocation();

  // Pull to refresh handler
  const handleRefresh = async () => {
    await refreshLocation();
    // The real-time listeners will automatically update with new data
  };

  const { 
    refreshing, 
    onTouchStart, 
    onTouchMove, 
    onTouchEnd 
  } = usePullToRefresh(handleRefresh);

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  // Add this useEffect for real-time metrics
  useEffect(() => {
    if (!userData) return;

    const unsubscribeMetrics = UserMetricsService.onUserMetricsChange(
      userData.uid,
      (metrics) => {
        setUserMetrics(metrics);
      }
    );

    return () => unsubscribeMetrics();
  }, [userData]);

  // Load user reservations and registrations
    useEffect(() => {
      if (!userData) return;

      const loadUserBookings = async () => {
        try {
          // Load food reservations
          const reservationsResult = await getUserFoodReservations();
          if (reservationsResult.success && reservationsResult.data) {
            setUserReservations(reservationsResult.data);
          }

          // Load campaign registrations
          const registrationsResult = await getUserCampaignRegistrations();
          if (registrationsResult.success && registrationsResult.data) {
            setUserRegistrations(registrationsResult.data);
          }
        } catch (error) {
          console.error('Error loading user bookings:', error);
        }
      };

      loadUserBookings();
    }, [userData]);

  // Set up real-time listeners when user data is loaded
  useEffect(() => {
    if (!userData) return;

    const unsubscribeFood = getApprovedFoodListings(
      (listings) => {
        setFoodLoading(true);
        try {
          // Filter out reserved food items
          const availableFood = filterReservedItems(listings, userReservations, []);
          const topFoodListings = DashboardService.getTopDashboardItemsEnhanced(
            availableFood,
            userLocation,
            3
          );
          setRecommendedFood(topFoodListings);
        } catch (error) {
          console.error('Error processing food listings:', error);
          setRecommendedFood(listings.slice(0, 3));
        } finally {
          setFoodLoading(false);
        }
      },
      (error) => {
        console.error('Real-time food listings error:', error);
        setFoodLoading(false);
      }
    );

    const unsubscribeCampaigns = getActiveCampaigns(
      (campaigns) => {
        setCampaignLoading(true);
        try {
          // Filter out registered campaigns
          const availableCampaigns = filterReservedItems(campaigns, [], userRegistrations);
          const topCampaigns = DashboardService.getTopDashboardItemsEnhanced(
            availableCampaigns,
            userLocation,
            3
          );
          setRecommendedCampaigns(topCampaigns);
        } catch (error) {
          console.error('Error processing campaigns:', error);
          setRecommendedCampaigns(campaigns.slice(0, 3));
        } finally {
          setCampaignLoading(false);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Real-time campaigns error:', error);
        setCampaignLoading(false);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeFood();
      unsubscribeCampaigns();
    };
  }, [userData, userLocation, userReservations, userRegistrations]);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUserData();
      setUserData(user);
    } catch (error) {
      console.error("Error loading user data:", error);
      setLoading(false);
      setFoodLoading(false);
      setCampaignLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getDisplayName = () => {
    if (!userData) return 'Receiver';
    
    if (userData.role === 'receiver') {
      return userData.profile?.name || userData.email || 'Receiver';
    }
    return userData.profile?.orgName || userData.profile?.contactPerson || userData.email || 'Organization';
  };

  const [currentFoodSlide, setCurrentFoodSlide] = useState(0);
  const [currentCampaignSlide, setCurrentCampaignSlide] = useState(0);

  // Auto-slide effects
  useEffect(() => {
    if (recommendedFood.length > 1) {
      const foodTimer = setInterval(() => {
        setCurrentFoodSlide((prev) => (prev + 1) % recommendedFood.length);
      }, 4000);
      return () => clearInterval(foodTimer);
    }
  }, [recommendedFood.length]);

  useEffect(() => {
    if (recommendedCampaigns.length > 1) {
      const campaignTimer = setInterval(() => {
        setCurrentCampaignSlide((prev) => (prev + 1) % recommendedCampaigns.length);
      }, 5000);
      return () => clearInterval(campaignTimer);
    }
  }, [recommendedCampaigns.length]);

  const filterReservedItems = <T extends { id?: string }>(
    items: T[], 
    reservations: FoodReservation[], 
    registrations: CampaignRegistration[]
  ): T[] => {
    return items.filter(item => {
      // Check if item is a food listing and user has reserved it
      const isFoodReserved = reservations.some(reservation => 
        reservation.foodListingId === item.id && 
        reservation.status !== 'cancelled'
      );
      
      // Check if item is a campaign and user has registered for it
      const isCampaignRegistered = registrations.some(registration => 
        registration.campaignId === item.id && 
        registration.status !== 'cancelled'
      );
      
      return !isFoodReserved && !isCampaignRegistered;
    });
  };

  // Navigation functions for food slider
  const nextFoodSlide = () => {
    setCurrentFoodSlide((prev) => (prev + 1) % recommendedFood.length);
  };

  const prevFoodSlide = () => {
    setCurrentFoodSlide((prev) => (prev - 1 + recommendedFood.length) % recommendedFood.length);
  };

  // Navigation functions for campaign slider
  const nextCampaignSlide = () => {
    setCurrentCampaignSlide((prev) => (prev + 1) % recommendedCampaigns.length);
  };

  const prevCampaignSlide = () => {
    setCurrentCampaignSlide((prev) => (prev - 1 + recommendedCampaigns.length) % recommendedCampaigns.length);
  };

  // FIX: Adapted formatFoodTimeDisplay for receiver dashboard list
  const formatFoodTimeDisplay = (item: FoodListing) => {
    if (item.availableDate && item.startTime && item.endTime) {
      const dateText = new Date(item.availableDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      // Returns an object containing the date and time strings separately
      return {
        date: dateText,
        time: `${item.startTime} - ${item.endTime}`
      };
    }
    return { date: "Check availability", time: "" };
  };

  const formatCampaignTimeDisplay = (campaign: Campaign) => {
    if (campaign.campaignDate && campaign.startTime && campaign.endTime) {
      const dateText = new Date(campaign.campaignDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return {
        date: dateText,
        time: `${campaign.startTime} - ${campaign.endTime}`
      };
    }
    return { date: "Check availability", time: "" };
  };

  // Handle food item click - navigate to browse tab and select the food
  const handleFoodItemClick = (foodId: string) => {
    onNavigate('browse', foodId);
  };

  // Handle campaign item click - navigate to campaigns tab and select the campaign
  const handleCampaignItemClick = (campaignId: string) => {
    onNavigate('campaigns', campaignId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName();

  return (
    <div 
      className="min-h-screen bg-amber-50"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 flex justify-center pt-4 z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            <span className="text-sm text-amber-600">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Header - Removed Refresh Button */}
      <div className="bg-gradient-to-r from-red-500 to-amber-500 px-4 pt-6 pb-8 flex flex-col justify-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-white">{getGreeting()}, {displayName}!</h1>
            <p className="text-amber-100 mt-1 text-sm">Ready to find food near you?</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Location Status Banner with improved messaging */}
      {locationError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">
            {locationError.includes('denied') 
              ? 'Location access denied. Please enable location permissions.' 
              : locationError
            }
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshLocation}
            className="text-red-700 hover:bg-red-100 ml-auto"
          >
            {locationError.includes('denied') ? 'Enable Location' : 'Retry'}
          </Button>
        </div>
      )}

      {!userLocation && !locationLoading && !locationError && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-amber-700 text-sm">Enable location for personalized food recommendations</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshLocation}
            className="text-amber-700 hover:bg-amber-100 ml-auto"
          >
            Enable
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="p-3 space-y-4 pb-20">
        {/* Impact Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Food Waste Reduced */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Package className="w-3 h-3 text-amber-600" />
              </div>
              <div className="text-base font-medium text-amber-600">
                {userMetrics?.receiver?.foodWasteReduced || 0} kg
              </div>
              <div className="text-xs text-muted-foreground">Food Waste Reduced</div>
            </CardContent>
          </Card>
          
          {/* Reservations Completed */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Calendar className="w-3 h-3 text-orange-600" />
              </div>
              <div className="text-base font-medium text-orange-600">
                {userMetrics?.receiver?.reservationsCompleted || 0}
              </div>
              <div className="text-xs text-muted-foreground">Reservations Completed</div>
            </CardContent>
          </Card>
          
          {/* Campaigns Attended */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Users className="w-3 h-3 text-purple-600" />
              </div>
              <div className="text-base font-medium text-purple-600">
                {userMetrics?.receiver?.campaignsAttended || 0}
              </div>
              <div className="text-xs text-muted-foreground">Events Attended</div>
            </CardContent>
          </Card>
        </div>

        {/* Location Loading State */}
        {locationLoading && (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <p className="text-sm text-muted-foreground">Getting your location for personalized recommendations...</p>
            </CardContent>
          </Card>
        )}

        {/* Recommended Food Section */}
        {foodLoading ? (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading food recommendations...</p>
            </CardContent>
          </Card>
        ) : recommendedFood.length > 0 ? (
          <>
            {/* Food Slider - Added View All button */}
            <Card className="shadow-lg border-0 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between ">
                <CardTitle className="text-base">
                  Recommended Food
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate('browse')}
                  className="text-primary text-xs h-8"
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <div className="overflow-hidden rounded-lg bg-gray-100 h-32">
                    <div 
                      className="flex transition-transform duration-300 ease-in-out h-full"
                      style={{ transform: `translateX(-${currentFoodSlide * 100}%)` }}
                    >
                      {recommendedFood.map((item) => (
                        <div 
                          key={item.id} 
                          className="min-w-full h-full flex-shrink-0 cursor-pointer"
                          onClick={() => handleFoodItemClick(item.id!)}
                        >
                          <div className="relative h-full w-full">
                            <ImageWithFallback
                              src={item.images?.[0] || '/placeholder-food.jpg'}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm stroke-text">{item.title}</h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Slide Indicators */}
                  {recommendedFood.length > 1 && (
                    <div className="flex justify-center mt-3 space-x-2">
                      {recommendedFood.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentFoodSlide(index)}
                          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                            index === currentFoodSlide 
                            ? 'w-8 h-2 bg-amber-500 rounded-full' 
                            : 'w-2 h-2 bg-amber-300 rounded-full hover:bg-amber-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {recommendedFood.length > 1 && (
                    <>
                      <button
                        onClick={prevFoodSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextFoodSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Food List */}
            <Card className="shadow-lg border-0 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Quick Browse</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate('browse')}
                  className="text-primary text-xs h-8"
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedFood.map((item) => {
                  const foodTime = formatFoodTimeDisplay(item);
                  return (
                    <Card 
                      key={item.id} 
                      className="shadow-sm border-0 hover:shadow-md transition-shadow cursor-pointer rounded-lg"
                      onClick={() => handleFoodItemClick(item.id!)}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <ImageWithFallback
                            src={item.images?.[0] || '/placeholder-food.jpg'}
                            alt={item.title}
                            className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                {/* FIX 2: Truncate title to one line */}
                                <h4 className="font-medium text-gray-900 text-sm truncate">{item.title}</h4>
                                <p className="text-xs text-gray-600 truncate">{item.donorName}</p>
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                                <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                                {/* FIX RATING: Use simplified check */}
                                {(item.rating && item.rating > 0) ? item.rating.toFixed(1) : 'New'}
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-xs text-gray-500 ">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className="mr-2">{foodTime.date}</span>
                                <Clock className="h-3 w-3" />
                                <span>{foodTime.time}</span>
                              </span>
                              <span className="text-amber-600 font-medium">
                                {item.remainingQuantity} {item.quantityUnit} left
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0 bg-gray-100"
                                >
                                  {item.category}
                                </Badge>
                                {item.tags?.slice(0, 2).map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs px-2 py-0 bg-gray-100"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👀</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Looking for Food</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We're currently searching for food donations in your area.
              </p>
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700">
                  💡 <strong>Tip:</strong> Food donations often appear in the morning and evening
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended Campaigns Section */}
        {campaignLoading ? (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading events...</p>
            </CardContent>
          </Card>
        ) : recommendedCampaigns.length > 0 ? (
          <>
            {/* Campaigns Slider */}
            <Card className="shadow-lg border-0 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Food Distribution Events</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate('campaigns')}
                  className="text-primary text-xs h-8"
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <div className="overflow-hidden rounded-lg bg-gray-100 h-32">
                    <div 
                      className="flex transition-transform duration-300 ease-in-out h-full"
                      style={{ transform: `translateX(-${currentCampaignSlide * 100}%)` }}
                    >
                      {recommendedCampaigns.map((campaign) => (
                        <div 
                          key={campaign.id} 
                          className="min-w-full h-full flex-shrink-0 cursor-pointer"
                          onClick={() => handleCampaignItemClick(campaign.id!)}
                        >
                          <div className="relative h-full w-full">
                            <ImageWithFallback
                              src={campaign.images?.[0] || '/placeholder-campaign.jpg'}
                              alt={campaign.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm stroke-text">{campaign.title}</h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Slide Indicators */}
                  {recommendedCampaigns.length > 1 && (
                    <div className="flex justify-center mt-3 space-x-2">
                      {recommendedCampaigns.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentCampaignSlide(index)}
                          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                            index === currentCampaignSlide 
                            ? 'w-8 h-2 bg-amber-500 rounded-full' 
                            : 'w-2 h-2 bg-amber-300 rounded-full hover:bg-amber-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {recommendedCampaigns.length > 1 && (
                    <>
                      <button
                        onClick={prevCampaignSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextCampaignSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campaigns List */}
            <Card className="shadow-lg border-0 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Upcoming Events</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate('campaigns')}
                  className="text-primary text-xs h-8"
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedCampaigns.map((campaign) => {
                  // Move variable declaration here, before return
                  const campaignTime = formatCampaignTimeDisplay(campaign);
                  return (
                    <Card 
                      key={campaign.id} 
                      className="shadow-sm border-0 hover:shadow-md transition-shadow cursor-pointer rounded-lg"
                      onClick={() => campaign.id && handleCampaignItemClick(campaign.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <ImageWithFallback
                            src={campaign.images?.[0] || '/placeholder-campaign.jpg'}
                            alt={campaign.title}
                            className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm truncate">{campaign.title}</h4>
                                {/* FIX 1: Truncate Volunteer Name */}
                                <p className="text-xs text-gray-600 truncate">{campaign.organizerName}</p>
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                                <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                                {/* FIX RATING: Use simplified check */}
                                {(campaign.rating && campaign.rating > 0) ? campaign.rating.toFixed(1) : 'New'}
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-xs text-gray-500">
                              <div className="flex items-center gap-2"> {/* Increased gap */}
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="mr-2">{campaignTime.date}</span> {/* Added margin */}
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>{campaignTime.time}</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                {/* FIX 2: Truncate Location Name */}
                                <span className="break-words whitespace-pre-wrap flex-1 min-w-0 truncate">{campaign.locationName}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {campaign.category}
                              </Badge>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Users className="w-3 h-3 mr-1" />
                                {campaign.availableSpots} spots left
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Scheduled</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We're currently looking for upcoming food distribution events in your area.
              </p>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-700">
                  💡 <strong>Tip:</strong> Community events are often scheduled on weekends and holidays
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State when no recommendations */}
        {!locationLoading && recommendedFood.length === 0 && recommendedCampaigns.length === 0 && (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🕵️‍♂️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Mission: Food Finding</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {userLocation 
                  ? "Our food detectives are on the case! 🕵️‍♀️ Nothing to rescue in your area yet, but we're sniffing out new donations."
                  : "Even Sherlock Holmes needs a location! 🔍 Enable location so we can find food mysteries near you."
                }
              </p>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <p className="text-xs text-amber-700 font-medium">
                  🍕 <strong>Pro Tip:</strong> Food donations are like ninjas - they appear when you least expect them!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Card */}
        <SustainabilityTipCard />
      </div>
    </div>
  );
}