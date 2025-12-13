// CampaignsScreen.tsx - Final Blocking Loader Implementation
import { useState, useEffect } from "react"; 
import { Card, CardContent } from "../../../UnifiedFolder/ui/card"; 
import { Button } from "../../../UnifiedFolder/ui/button"; 
import { Input } from "../../../UnifiedFolder/ui/input"; 
import { Badge } from "../../../UnifiedFolder/ui/badge"; 
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
  XCircle,
  Flag
} from "lucide-react";
import { getActiveCampaigns, type Campaign } from "../../../Firebase/campaignUsers";
import { useLocation } from "../../../UnifiedFolder/LocationFolder/useLocation";
import { 
  getUserCampaignRegistrations, 
  cancelCampaignRegistration,
  type CampaignRegistration 
} from "../../../Firebase/reservationService";
import { usePullToRefresh } from "../../../UnifiedFolder/services/usePullToRefresh";
import { toast } from "sonner";
import { RatingDialog } from '../../../UnifiedFolder/modals/RatingDialog';
import { RatingService, type RatingItem } from '../../../UnifiedFolder/services/ratingServices';
import { ReportModal } from "../../../UnifiedFolder/modals/ReportModal";

interface CampaignsScreenProps {
  userRole: 'receiver';
  onSelectCampaign: (campaignId: string) => void;
}

export function CampaignsScreen({ userRole, onSelectCampaign }: CampaignsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<CampaignRegistration[]>([]);
  const [loading, setLoading] = useState(true); // Tracks initial listings load
  const [initialLoading, setInitialLoading] = useState(true); // BLOCKING LOADER STATE
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [currentItemForRating, setCurrentItemForRating] = useState<RatingItem | null>(null);
  const [currentItemForReport, setCurrentItemForReport] = useState<{
    id: string;
    name: string;
    type: 'campaign';
    reportedUser?: {
      id: string;
      name: string;
      email: string;
      type: 'donor' | 'volunteer' | 'receiver' | 'organizer';
    };
  } | null>(null);
  const [userRatings, setUserRatings] = useState<{[key: string]: boolean}>({});
  
  const { 
    userLocation, 
    isLoading: locationLoading,
    error: locationError, 
    refreshLocation,
    calculateDistance 
  } = useLocation();

  // Theme configuration
  const theme = {
    bg: 'bg-amber-50',
    gradient: 'from-red-500 to-amber-500',
    accent: 'bg-amber-600 hover:bg-amber-700',
    accentLight: 'bg-amber-50 text-amber-700',
    badge: 'bg-amber-500 text-white',
    text: 'text-amber-600'
  };

  // 1. CONSOLIDATED STATUS LOAD FUNCTION
  const loadUserRegistrationsAndRatings = async () => { 
    try {
      const result = await getUserCampaignRegistrations();
      if (result.success && result.data) {
        setUserRegistrations(result.data);

        // Load user ratings immediately after registrations are loaded
        const ratings = await RatingService.loadUserRatings(result.data, 'campaign');
        setUserRatings(ratings);
      }
      return true; // Success
    } catch (error) {
      console.error('Error loading user registrations and ratings:', error);
      return false; // Failure
    }
  };

  // 2. BLOCKING INITIAL LOAD EFFECT
  useEffect(() => {
    // Flag to track when campaign listings finish loading
    let campaignsListingsLoaded = false;
    // Flag to track when user status finishes loading
    let userStatusLoaded = false;
    
    // Function to check if everything is ready
    const checkReady = () => {
      if (campaignsListingsLoaded && userStatusLoaded) {
        setInitialLoading(false); // Remove the blocking loader
      }
    };

    // A. Start status load (registrations + ratings)
    loadUserRegistrationsAndRatings().then(() => {
      userStatusLoaded = true;
      checkReady();
    });

    // B. Start real-time listener for campaigns
    const unsubscribe = getActiveCampaigns(
      (campaignsList) => {
        setCampaigns(campaignsList);
        setLoading(false);
        
        // Ensure listings are processed
        campaignsListingsLoaded = true;
        checkReady();
      },
      (error) => {
        console.error('Real-time campaigns error:', error);
        setLoading(false);
        campaignsListingsLoaded = true;
        checkReady();
      }
    );

    return () => unsubscribe();
  }, []); // Run only on mount

  // Refresh all data including location and registrations
  const handleRefresh = async () => {
    await refreshLocation();
    await loadUserRegistrationsAndRatings(); // USE NEW FUNCTION
    // Note: Campaign listings update automatically via the real-time listener
  };

  const { 
    refreshing, 
    pullDistance, 
    onTouchStart, 
    onTouchMove, 
    onTouchEnd 
  } = usePullToRefresh(handleRefresh);

  // Get user registration for a specific campaign
  const getUserRegistrationForCampaign = (campaignId: string): CampaignRegistration | null => {
    return userRegistrations.find(registration => 
      registration.campaignId === campaignId && 
      registration.status !== 'cancelled'
    ) || null;
  };
  
  // FIX: Updated isInGracePeriod to use the explicit UTC+8 time zone for accurate checks
  const isInGracePeriod = (item: Campaign): boolean => {
    return RatingService.isInGracePeriod(item.campaignDate, item.endTime);
  };

  // Get expiry info for campaign
  const getExpiryInfo = (campaign: Campaign) => {
    if (!campaign.campaignDate || !campaign.endTime) return { text: "Check availability", color: "text-gray-600 bg-gray-50 border-gray-200" };
    
    const endDateTime = new Date(`${campaign.campaignDate}T${campaign.endTime}:00+08:00`);
    const now = new Date();
    
    const timeDiff = endDateTime.getTime() - now.getTime();
    const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
    
    if (hoursDiff <= 0) {
      const hoursAgo = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60));
      if (RatingService.isInGracePeriod(campaign.campaignDate, campaign.endTime)) {
        return { 
          text: `Ended - Rating Period (${hoursAgo}h ago)`, 
          color: "text-purple-600 bg-purple-50 border-purple-200" 
        };
      }
      return { text: "Expired", color: "text-red-800 bg-red-100 border-red-300" };
    } 
    
    if (hoursDiff <= 2) {
      return { text: `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} left`, color: "text-red-600 bg-red-50 border-red-200" };
    } else if (hoursDiff <= 6) {
      return { text: `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} left`, color: "text-orange-600 bg-orange-50 border-orange-200" };
    } else {
      const daysDiff = Math.ceil(hoursDiff / 24);
      return { text: `${daysDiff} day${daysDiff !== 1 ? 's' : ''} left`, color: "text-green-600 bg-green-50 border-green-200" };
    }
  };

  // IMMEDIATE FILTERING: Filter campaigns on every render without useEffect delay
  const filterCampaigns = () => {
    return campaigns.filter(campaign => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = campaign.title.toLowerCase().includes(q) ||
        campaign.description.toLowerCase().includes(q) ||
        campaign.organizerName.toLowerCase().includes(q);
      
      // Check if campaign is in rating period
      const isInRatingPeriod = getExpiryInfo(campaign).text.includes('Rating Period');
      const userRegistration = getUserRegistrationForCampaign(campaign.id!);
      const hasAttended = !!userRegistration && userRegistration.status === 'attended';

      // Hide rating period campaigns unless user has attended
      if (isInRatingPeriod && !hasAttended) {
        return false;
      }
      
      // Check user registration status
      const hasActiveInteraction = !!userRegistration && 
                                   (userRegistration.status === 'registered' || 
                                    userRegistration.status === 'attended');

      // Check time status using explicit UTC+8 conversion
      const endDateTime = new Date(`${campaign.campaignDate}T${campaign.endTime}:00+08:00`);
      const now = new Date();
      const isPastEndTime = endDateTime < now;

      // VISIBILITY RULE: Hide if: (Expired AND User has NO active interaction)
      if (isPastEndTime && !hasActiveInteraction) {
          // Campaign is past its end time AND the user has no history with it.
          return false;
      }
      
      return matchesSearch;
    });
  };

  // PRIORITY SORTING: Ready to Rate at the top
  const getSortedCampaigns = (items: Campaign[]) => {
    if (items.length === 0) return items;
    
    // Prioritize "Ready to Rate" items at the very top of the list
    return [...items].sort((a, b) => {
      // Logic to determine if a campaign is "Ready to Rate"
      const isReadyToRateA = 
        getUserRegistrationForCampaign(a.id!)?.status === 'attended' &&
        isInGracePeriod(a) &&
        !userRatings[a.id!];
        
      const isReadyToRateB = 
        getUserRegistrationForCampaign(b.id!)?.status === 'attended' &&
        isInGracePeriod(b) &&
        !userRatings[b.id!];

      // 1. Prioritize Ready to Rate: A > B = -1
      if (isReadyToRateA && !isReadyToRateB) return -1;
      if (!isReadyToRateA && isReadyToRateB) return 1;
      
      // If both are or both are not "Ready to Rate", fall back to distance sorting (2)
      if (!userLocation || items.length === 0) return 0; // If no location, maintain current order

      // 2. Fallback: Distance Sorting (existing logic)
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
  };

  // Get filtered campaigns immediately
  const filteredCampaigns = getSortedCampaigns(filterCampaigns());

  const handleRateAndComplete = async (registrationId: string, item: Campaign) => {
    setCurrentItemForRating({
      id: item.id!,
      name: item.title,
      reservationId: registrationId,
      type: 'campaign'
    });
    setRatingDialogOpen(true);
  };

  const handleReport = (campaign: Campaign) => {
    setCurrentItemForReport({
      id: campaign.id!,
      name: campaign.title,
      type: 'campaign',
      reportedUser: {
        id: campaign.organizerId || 'unknown',
        name: campaign.organizerName || 'Unknown Organizer',
        email: '',
        type: 'organizer'
      }
    });
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (reportData: any) => {
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

  const handleCancel = async (registrationId: string) => {
    setActionLoading(registrationId);
    try {
      const result = await cancelCampaignRegistration(registrationId);
      if (result.success) {
        toast.success('Registration cancelled successfully');
        await loadUserRegistrationsAndRatings();
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
    return RatingService.getRatingStatus(registration, userRatings, 'campaign');
  };

  // 3. FULL SCREEN BLOCKING LOADER CHECK
  if (initialLoading) {
    return (
      <div className={`min-h-screen bg-background pb-20 ${theme.bg} flex items-center justify-center`}>
        <div className="text-center text-gray-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          Loading events and your status...
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
              <h1 className="text-xl sm:text-2xl font-bold text-white">Food Distribution Events</h1>
              <p className="mt-1 text-sm sm:text-base">Find community food distributions near you</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-5 sm:h-5 text-muted-foreground" />
            <Input
              placeholder="Search for food distribution events..."
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
              <div className={`flex items-center gap-2 text-xs ${theme.text}`}>
                <MapPin className="w-4 h-4" />
                <span>Campaigns sorted by distance from your location</span>
              </div>
              <Badge variant="secondary" className={`text-xs text-white ${theme.badge}`}>
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
              const expiryInfo = getExpiryInfo(campaign);
              const isGracePeriod = isInGracePeriod(campaign);
              const isRated = userRatings[campaign.id!];
              const isAttended = userRegistration?.status === 'attended';
              const isDisabled = isRated || (isAttended && !isGracePeriod);
              const isFullyBooked = campaign.availableSpots <= 0 && !userRegistration;
              const isInRatingPeriod = expiryInfo.text.includes('Rating Period');
              
              return (
                <Card 
                  key={campaign.id}
                  className={`shadow-sm border border-border transition-all duration-200 hover:shadow-md relative ${
                    // Gray out logic is now simple: rely on isDisabled
                    isDisabled
                      ? 'opacity-60 cursor-not-allowed bg-gray-50' 
                      : 'cursor-pointer'
                  }`}
                  onClick={() => {
                    // Only allow clicking if not grayed out AND not fully booked AND no active registration
                    if (isDisabled) return;
                    if (!isFullyBooked && !userRegistration) {
                      onSelectCampaign(campaign.id!);
                    }
                  }}
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
                            src={campaign.images?.[0] || '/placeholder-campaign.jpg'}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </div>
                        
                        {/* Status Overlays */}
                        {isFullyBooked && (
                          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                            <span className="text-white text-sm font-medium px-3 py-2 bg-black/70 rounded-lg">
                              Fully Booked
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Badges - Top Right of Entire Card */}
                      <div className="absolute top-4 right-4 flex flex-col gap-1 z-20">
                        {registrationStatus && (
                          <Badge className={`${registrationStatus.color} text-xs font-medium h-8 px-3 flex items-center`}>
                            {registrationStatus.text}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Content below image */}
                      <div className="p-3 sm:p-4 space-y-3">
                        {/* Title and Rating on same line */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-base sm:text-lg leading-tight ${
                              isDisabled ? 'text-gray-500' : 'text-foreground'
                            }`}>
                              {campaign.title}
                            </h3>
                          </div>
                          {/* Rating moved to be beside title */}
                          <div className={`flex items-center text-sm whitespace-nowrap flex-shrink-0 ${
                            isDisabled ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>
                            <Star className="w-4 h-4 mr-1 fill-current text-yellow-500" />
                            {(campaign.rating && campaign.rating > 0) ? campaign.rating.toFixed(1) : 'New'}
                          </div>
                        </div>

                        {/* Spots and Category */}
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center text-sm font-medium ${
                            isDisabled ? 'text-gray-400' : 'text-amber-600'
                          }`}>
                            <Users className="w-4 h-4 mr-2" />
                            {campaign.availableSpots} spots left
                          </div>
                          <Badge variant="outline" className={`text-xs px-2 py-1 ${
                            isDisabled 
                              ? 'bg-gray-100 text-gray-500 border-gray-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {campaign.category}
                          </Badge>
                        </div>

                        {/* Distance and Organizer */}
                        <div className="flex flex-wrap items-center gap-2">
                          {distanceBadge}
                          <Badge variant="secondary" className={`text-xs px-2 py-1 ${
                            isDisabled ? 'bg-gray-100 text-gray-400' : 'bg-gray-100'
                          }`}>
                            By {campaign.organizerName}
                          </Badge>
                        </div>

                        {/* Event Date and Time */}
                        <div className={`flex items-center gap-4 text-xs ${
                          isDisabled ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {new Date(campaign.campaignDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{campaign.startTime} - {campaign.endTime}</span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className={`flex items-start text-xs sm:text-sm ${
                          isDisabled ? 'text-gray-400' : 'text-muted-foreground'
                        }`}>
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="break-words whitespace-pre-wrap flex-1 min-w-0">
                            {campaign.locationName}
                          </span>
                        </div>

                        {/* Description */}
                        {campaign.description && (
                          <div className={`text-xs sm:text-sm leading-relaxed ${
                            isDisabled ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <p className="line-clamp-2 break-words whitespace-pre-wrap">
                              {campaign.description.length > 120 
                                ? campaign.description.substring(0, 120) + '...' 
                                : campaign.description
                              }
                            </p>
                          </div>
                        )}
                        
                        {/* Footer with urgency and action buttons */}
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

                          {/* Action Buttons - Report replaces Cancel when attended */}
                          {userRegistration && (
                          <div className="flex gap-2">
                            {/* Rate Button - shown when attended */}
                            {userRegistration.status === 'attended' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => !isRated && handleRateAndComplete(userRegistration.id!, campaign)}
                                  // Disable if already rated
                                  disabled={isRated || actionLoading === userRegistration.id}
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
                                  onClick={() => handleReport(campaign)}
                                  disabled={actionLoading === userRegistration.id} 
                                  className="h-8 px-3 text-xs border-red-200 text-white bg-red-600 hover:bg-red-50"
                                >
                                  <Flag className="w-3 h-3 mr-1" />
                                  Report
                                </Button>
                              </>
                            ) : (
                              // Cancel button for registered status
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(userRegistration.id!)}
                                // Disable if already rated
                                disabled={userRegistration.status !== 'registered' || actionLoading === userRegistration.id || isRated}
                                className={`h-8 px-3 text-xs ${
                                  (userRegistration.status === 'registered' && !isRated)
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

        <RatingDialog
          userType={"receiver"}
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          type="campaign"
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
          reportType="campaign"
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