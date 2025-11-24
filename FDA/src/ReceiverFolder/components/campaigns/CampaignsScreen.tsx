import { useState, useEffect } from "react"; 
import { Card, CardContent } from "../../../UnifiedFolder/ui/card"; 
import { Button } from "../../../UnifiedFolder/ui/button"; 
import { Input } from "../../../UnifiedFolder/ui/input"; 
import { Badge } from "../../../UnifiedFolder/ui/badge"; 
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../UnifiedFolder/ui/alert-dialog"; 
import { ImageWithFallback } from "../../../UnifiedFolder/Images/ImageWithFallback"; 
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Star, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { getActiveCampaigns, type Campaign } from "../../../Firebase/campaignUsers";
import { useLocation } from "../../../UnifiedFolder/LocationFolder/useLocation";
import { 
  getUserCampaignRegistrations, 
  completeCampaignRegistration, 
  cancelCampaignRegistration,
  type CampaignRegistration 
} from "../../../Firebase/reservationService";
import { toast } from "sonner";

interface CampaignsScreenProps {
  userRole: 'recipient';
  onSelectCampaign: (campaignId: string) => void;
}

export function CampaignsScreen({ userRole, onSelectCampaign }: CampaignsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<CampaignRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { 
    userLocation, 
    isLoading: locationLoading,
    error: locationError, 
    refreshLocation,
    calculateDistance 
  } = useLocation();

  // Load user registrations
  const loadUserRegistrations = async () => {
    try {
      const result = await getUserCampaignRegistrations();
      if (result.success && result.data) {
        setUserRegistrations(result.data);
      }
    } catch (error) {
      console.error('Error loading user registrations:', error);
    }
  };

  // REAL-TIME: Set up real-time listener for active campaigns
  useEffect(() => {
    const unsubscribe = getActiveCampaigns(
      (campaignsList) => {
        setCampaigns(campaignsList);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time campaigns error:', error);
        setLoading(false);
      }
    );

    // Load user registrations on component mount
    loadUserRegistrations();

    return () => unsubscribe();
  }, []);

  // Refresh all data including location and registrations
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLocation();
      await loadUserRegistrations();
    } finally {
      setRefreshing(false);
    }
  };

  // Get user registration for a specific campaign
  const getUserRegistrationForCampaign = (campaignId: string): CampaignRegistration | null => {
    return userRegistrations.find(registration => 
      registration.campaignId === campaignId && 
      registration.status !== 'cancelled'
    ) || null;
  };

  // Filter and sort campaigns based on search and location
  useEffect(() => {
    let filtered = campaigns.filter(campaign => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = campaign.title.toLowerCase().includes(q) ||
        campaign.description.toLowerCase().includes(q) ||
        campaign.organizerName.toLowerCase().includes(q);
      
      return matchesSearch;
    });

    // Sort by distance if location is available
    if (userLocation && campaigns.length > 0) {
      filtered = filtered.sort((a, b) => {
        if (!a.geolocation) return 1;
        if (!b.geolocation) return -1;
        
        const campaignLocationA = {
          latitude: a.geolocation.latitude,
          longitude: a.geolocation.longitude
        };
        const campaignLocationB = {
          latitude: b.geolocation.latitude,
          longitude: b.geolocation.longitude
        };
        
        const distA = calculateDistance(userLocation, campaignLocationA);
        const distB = calculateDistance(userLocation, campaignLocationB);
        return distA - distB;
      });
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery, userLocation, calculateDistance]);

  const handleComplete = async (registrationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActionLoading(registrationId);
    try {
      const result = await completeCampaignRegistration(registrationId);
      if (result.success) {
        toast.success('Registration marked as attended!');
        await loadUserRegistrations(); // Refresh registrations
      } else {
        toast.error(result.error || 'Failed to mark as attended');
      }
    } catch (error) {
      console.error('Error completing registration:', error);
      toast.error('Failed to mark as attended');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (registrationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActionLoading(registrationId);
    try {
      const result = await cancelCampaignRegistration(registrationId);
      if (result.success) {
        toast.success('Registration cancelled successfully');
        await loadUserRegistrations(); // Refresh registrations
      } else {
        toast.error(result.error || 'Failed to cancel registration');
      }
    } catch (error) {
      console.error('Error cancelling registration:', error);
      toast.error('Failed to cancel registration');
    } finally {
      setActionLoading(null);
    }
  };

  const getUrgencyColor = (campaign: Campaign) => {
    if (campaign.availableSpots <= 5) return "text-red-600 bg-red-50 border-red-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      "Fresh Produce": "Fresh Produce",
      "Shelf Stable": "Shelf Stable", 
      "Cooked Meals": "Cooked Meals"
    };
    return categoryMap[category] || category;
  };

  const getDistanceBadge = (campaign: Campaign) => {
    if (!userLocation || !campaign.geolocation) return null;
    
    const campaignLocation = {
      latitude: campaign.geolocation.latitude,
      longitude: campaign.geolocation.longitude
    };
    const distance = calculateDistance(userLocation, campaignLocation);
    return (
      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
        <MapPin className="w-3 h-3 mr-1" />
        {distance.toFixed(1)} km
      </Badge>
    );
  };

  const getRegistrationStatus = (campaignId: string) => {
    const registration = getUserRegistrationForCampaign(campaignId);
    if (!registration) return null;

    const statusConfig = {
      registered: { color: 'bg-blue-100 text-blue-800', text: 'Registered' },
      attended: { color: 'bg-green-100 text-green-800', text: 'Ready to Rate' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' }
    };

    return statusConfig[registration.status as keyof typeof statusConfig];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 bg-amber-50 flex items-center justify-center">
        <div className="text-center text-gray-600">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 bg-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-amber-500 px-4 sm:px-6 pt-6 pb-6 flex flex-col justify-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Food Distribution Events</h1>
            <p className="mt-1 text-sm sm:text-base">Register your spot for community food distributions</p>
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
            placeholder="Search for food distributions..."
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
        {/* Location-based Filter Info */}
        {userLocation && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <MapPin className="w-4 h-4" />
              <span>Campaigns sorted by distance from your location</span>
            </div>
            <Badge variant="secondary" className="text-xs text-white bg-amber-500">
              Sorted by Distance
            </Badge>
          </div>
        )}

        {/* Campaign List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredCampaigns.map((campaign) => {
            const distanceBadge = getDistanceBadge(campaign);
            const userRegistration = getUserRegistrationForCampaign(campaign.id!);
            const registrationStatus = getRegistrationStatus(campaign.id!);

            return (
              <Card 
                key={campaign.id}
                className={`shadow-sm border border-border cursor-pointer transition-all duration-200 hover:shadow-md ${
                  campaign.availableSpots <= 0 && !userRegistration ? 'opacity-60' : ''
                }`}
                onClick={() => campaign.availableSpots > 0 && !userRegistration && onSelectCampaign(campaign.id!)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    {/* Image in its own rounded container */}
                    <div className="relative m-3 sm:m-4 mb-0">
                      <div className="w-full h-32 sm:h-40 rounded-xl overflow-hidden">
                        <ImageWithFallback
                          src={campaign.images?.[0] || '/placeholder-campaign.jpg'}
                          alt={campaign.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {campaign.availableSpots <= 0 && !userRegistration && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <span className="text-white text-xs sm:text-sm font-medium px-2 py-1 sm:px-3 sm:py-2 bg-black/70 rounded-lg">Fully Booked</span>
                        </div>
                      )}
                      {registrationStatus && (
                        <div className="absolute top-2 right-2">
                          <Badge className={registrationStatus.color}>
                            {registrationStatus.text}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Content below image */}
                    <div className="p-3 sm:p-4 space-y-3">
                      {/* 1. Title and Rating */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight pr-2">
                            {campaign.title}
                          </h3>
                          <div className="flex items-center mt-1 text-sm sm:text-base text-amber-600 font-medium">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            {campaign.availableSpots} spots left
                          </div>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 fill-current text-yellow-500" />
                          {campaign.rating?.toFixed(1) || 'New'}
                        </div>
                      </div>

                      {/* 2. Category, Distance, and Organizer */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                          {getCategoryLabel(campaign.category)}
                        </Badge>
                        {distanceBadge}
                        <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1 bg-gray-100">
                          By {campaign.organizerName}
                        </Badge>
                      </div>

                      {/* 3. Event Date and Time */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(campaign.campaignDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{campaign.startTime} - {campaign.endTime}</span>
                        </div>
                      </div>

                      {/* 4. Location */}
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                        <span className="truncate">
                          {campaign.locationName}
                        </span>
                      </div>

                      {/* 5. Description Snippet */}
                      {campaign.description && (
                        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                          <p className="line-clamp-2">
                            {campaign.description.length > 120 
                              ? campaign.description.substring(0, 120) + '...' 
                              : campaign.description
                            }
                          </p>
                        </div>
                      )}
                      
                      {/* 6. Footer with urgency and action buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs sm:text-sm px-2 sm:px-3 py-1 border ${getUrgencyColor(campaign)}`}
                        >
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          {campaign.availableSpots <= 5 ? 'Few spots left' : 'Spots available'}
                        </Badge>

                        {/* Action Buttons */}
                        {userRegistration && (
                          <div className="flex gap-2">
                            {/* Complete/Rate Button - Only enabled when status is attended */}
                            <Button
                              size="sm"
                              onClick={(e) => handleComplete(userRegistration.id!, e)}
                              disabled={userRegistration.status !== 'attended' || actionLoading === userRegistration.id}
                              className={`h-8 px-3 text-xs ${
                                userRegistration.status === 'attended' 
                                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {userRegistration.status === 'attended' ? 'Rate & Complete' : 'Complete'}
                            </Button>
                            
                            {/* Cancel Button - Only enabled when status is registered */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleCancel(userRegistration.id!, e)}
                              disabled={userRegistration.status !== 'registered' || actionLoading === userRegistration.id}
                              className={`h-8 px-3 text-xs ${
                                userRegistration.status === 'registered'
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

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Search className="w-6 h-6 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">No events found</h3>
            <p className="text-muted-foreground text-sm sm:text-lg mb-4">
              {userLocation 
                ? "Try adjusting your search or check back later for new distributions."
                : "Enable location services to see campaigns near you."
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
    </div>
  );
}