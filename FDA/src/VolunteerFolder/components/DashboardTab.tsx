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
  AlertCircle
} from "lucide-react";
import { SustainabilityTipCard } from "../../UnifiedFolder/ui/SustainabilityTip";
import { getCurrentUserData, type UserData } from "../../Firebase/auth";
import { getApprovedFoodListings, type FoodListing } from "../../Firebase/foodUsers";
import { getUserCampaigns, type Campaign } from "../../Firebase/campaignUsers";
import { DashboardService } from "../../UnifiedFolder/services/DashboardServices";
import { useLocation } from "../../UnifiedFolder/LocationFolder/useLocation";
import { UserMetricsService, type UserMetrics } from "../../UnifiedFolder/services/userMetricServices";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export function DashboardTab({ onNavigate }: DashboardProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [recommendedFood, setRecommendedFood] = useState<FoodListing[]>([]);
  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    userLocation, 
    isLoading: locationLoading, 
    error: locationError, 
    refreshLocation,
  } = useLocation();

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  // Add this useEffect for real-time metrics
  useEffect(() => {
    if (!userData) return;

    // Set up real-time metrics listener
    const unsubscribeMetrics = UserMetricsService.onUserMetricsChange(
      userData.uid,
      (metrics) => {
        setUserMetrics(metrics);
      }
    );

    return () => unsubscribeMetrics();
  }, [userData]);

  // Refresh all data including location
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLocation();
      // The real-time listeners will automatically update with new location
    } finally {
      setRefreshing(false);
    }
  };

  // Set up real-time listeners when user data is loaded
  useEffect(() => {
    if (!userData) return;

    const unsubscribeFood = getApprovedFoodListings(
      (listings) => {
        // Only process if we have location or location is loading
        if (userLocation || locationLoading) {
          const topFoodListings = DashboardService.getTopDashboardItemsEnhanced(
            listings,
            userLocation,
            3
          );
          setRecommendedFood(topFoodListings);
        }
      },
      (error) => {
        console.error('Real-time food listings error:', error);
      }
    );

    const unsubscribeCampaigns = getUserCampaigns(
      (campaigns) => {
        // Filter for ongoing campaigns that this volunteer is organizing
        const activeCampaigns = campaigns.filter(campaign => 
          campaign.status === 'ongoing' && campaign.organizerId === userData.uid
        );
        
        setUserCampaigns(activeCampaigns);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time campaigns error:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeFood();
      unsubscribeCampaigns();
    };
  }, [userData, userLocation, locationLoading]);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUserData();
      setUserData(user);
    } catch (error) {
      console.error("Error loading user data:", error);
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getDisplayName = () => {
    if (!userData) return 'Volunteer';
    
    if (userData.role === 'receiver') {
      return userData.profile?.name || userData.email || 'Volunteer';
    }
    return userData.profile?.orgName || userData.profile?.contactPerson || userData.email || 'Organization';
  };

  const [currentFoodSlide, setCurrentFoodSlide] = useState(0);

  useEffect(() => {
    if (recommendedFood.length > 0) {
      const foodTimer = setInterval(() => {
        setCurrentFoodSlide((prev) => (prev + 1) % recommendedFood.length);
      }, 4000);
      return () => clearInterval(foodTimer);
    }
  }, [recommendedFood.length]);

  const nextFoodSlide = () => {
    setCurrentFoodSlide((prev) => (prev + 1) % recommendedFood.length);
  };

  const prevFoodSlide = () => {
    setCurrentFoodSlide((prev) => (prev - 1 + recommendedFood.length) % recommendedFood.length);
  };

  const formatFoodTimeDisplay = (item: FoodListing) => {
    if (item.availableDate && item.startTime && item.endTime) {
      const dateText = new Date(item.availableDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return (
        <div className="flex flex-col">
          <span>{dateText}</span>
          <span className="text-gray-400 text-xs">{item.startTime} - {item.endTime}</span>
        </div>
      );
    }
    return "Check availability";
  };

  const formatCampaignDate = (campaign: Campaign) => {
    return campaign.campaignDate ? new Date(campaign.campaignDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) : "Date not set";
  };

  const formatCampaignDateTime = (campaign: Campaign) => {
    if (campaign.campaignDate && campaign.startTime && campaign.endTime) {
      return `${formatCampaignDate(campaign)} • ${campaign.startTime} - ${campaign.endTime}`;
    }
    return "Check schedule";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const displayName = getDisplayName();

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header with Refresh Button */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-500 px-4 pt-6 pb-8 flex flex-col justify-center min-h-[150px] rounded-b-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-white">{getGreeting()}, {displayName}!</h1>
            <p className="text-green-100 mt-1 text-sm">Ready to help your community today?</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
          </div>
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

      {!userLocation && !locationLoading && !locationError && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-amber-700 text-sm">Enable location for personalized recommendations</span>
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
        <div className="grid grid-cols-2 gap-2">
          {/* Active Campaigns */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Calendar className="w-3 h-3 text-green-600" />
              </div>
              <div className="text-base font-medium text-green-600">{userCampaigns.length}</div>
              <div className="text-xs text-muted-foreground">Active Campaigns</div>
            </CardContent>
          </Card>
          
          {/* Campaigns Held */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Users className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-base font-medium text-blue-600">
                {userMetrics?.volunteer?.campaignsHeld || 0}
              </div>
              <div className="text-xs text-muted-foreground">Campaigns Held</div>
            </CardContent>
          </Card>
          
          {/* Hours Volunteered */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Clock className="w-3 h-3 text-purple-600" />
              </div>
              <div className="text-base font-medium text-purple-600">
                {userMetrics?.volunteer?.hoursVolunteered || 0}
              </div>
              <div className="text-xs text-muted-foreground">Hours Volunteered</div>
            </CardContent>
          </Card>
          
          {/* Rating */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-3 text-center">
              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Star className="w-3 h-3 text-yellow-500" />
              </div>
              <div className="text-base font-medium text-yellow-500">
                {userMetrics?.volunteer?.rating ? userMetrics.volunteer.rating.toFixed(1) : '0.0'}
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </CardContent>
          </Card>
        </div>

        {/* Location Loading State */}
        {locationLoading && (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">Getting your location...</p>
            </CardContent>
          </Card>
        )}

        {/* Recommended Food Section */}
        {recommendedFood.length > 0 && (
          <>
            {/* Food Slider */}
            <Card className="shadow-lg border-0 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Available Food Pickups</CardTitle>
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
                        <div key={item.id} className="min-w-full h-full flex-shrink-0">
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
                                  <p className="text-xs text-gray-200 mt-1">
                                    {item.donorName} • {item.rating ? `${item.rating.toFixed(1)} ⭐` : 'New'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Slide Indicators */}
                  <div className="flex justify-center mt-3 space-x-2">
                    {recommendedFood.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentFoodSlide(index)}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          index === currentFoodSlide ? 'bg-primary' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>

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
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Quick Pickups</CardTitle>
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
                {recommendedFood.map((item) => (
                  <Card 
                    key={item.id} 
                    className="shadow-sm border-0 hover:shadow-md transition-shadow cursor-pointer rounded-lg"
                    onClick={() => onNavigate('browse')}
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
                              <h4 className="font-medium text-gray-900 text-sm truncate">{item.title}</h4>
                              <p className="text-xs text-gray-600 truncate">{item.donorName}</p>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                              <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                              {item.rating?.toFixed(1) || 'New'}
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatFoodTimeDisplay(item)}
                            </span>
                            <span className="text-green-600 font-medium">
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
                ))}
              </CardContent>
            </Card>
          </>
        )}

        {/* Your Active Campaigns Section */}
        {userCampaigns.length > 0 && (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Your Active Campaigns</CardTitle>
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
              {userCampaigns.map((campaign) => (
                <Card 
                  key={campaign.id} 
                  className="shadow-sm border-0 hover:shadow-md transition-shadow cursor-pointer rounded-lg"
                  onClick={() => onNavigate('campaigns')}
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
                            <p className="text-xs text-gray-600 truncate">{campaign.organizerOrg || campaign.organizerName}</p>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                            <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                            {campaign.rating?.toFixed(1) || 'New'}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatCampaignDateTime(campaign)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {campaign.locationName}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">
                            {campaign.category}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Users className="w-3 h-3 mr-1" />
                            {campaign.registeredSpots} / {campaign.totalSpots} registered
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty States */}
        {!locationLoading && recommendedFood.length === 0 && userCampaigns.length === 0 && (
          <Card className="shadow-lg border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-2">No recommendations available</h3>
              <p className="text-muted-foreground mb-4">
                {userLocation 
                  ? "No food pickups found near your location. Try refreshing or check back later."
                  : "Enable location services to see personalized food recommendations near you."
                }
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Recommendations
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tips Card */}
        <SustainabilityTipCard />
      </div>
    </div>
  );
}