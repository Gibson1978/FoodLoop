// CampaignDetailScreen.tsx - UPDATED

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../UnifiedFolder/ui/card";
import { Button } from "../../../UnifiedFolder/ui/button";
import { Badge } from "../../../UnifiedFolder/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../../UnifiedFolder/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../UnifiedFolder/ui/alert-dialog";
import { ImageWithFallback } from "../../../UnifiedFolder/Images/ImageWithFallback";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar,
  Users, 
  CheckCircle,
  MessageSquare,
  Navigation,
  Flag,
  AlertTriangle,
  Star,
  Package,
  UtensilsCrossed,
  ShoppingCart,
  Hotel,
  Store,
  Building2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock
} from "lucide-react";
import { getCampaignById, type Campaign } from "../../../Firebase/campaignUsers";
import { openExternalMapWithAddress } from "../../../UnifiedFolder/LocationFolder/ExternalMap";
import { registerForCampaign } from '../../../Firebase/reservationService';
// FIX: Imports for secure contact and Firestore rating fetch
import { getContactByUserId as fetchSecureContactDetails } from "../../../Firebase/auth";
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '../../../Firebase/firebase'; // Assuming 'db' is exported from firebase.ts


interface UserRating {
  rating: number;
  totalRatings: number;
}

// *** NEW HELPER FUNCTION: Fetch User Rating ***
const fetchUserRating = async (userId: string): Promise<UserRating> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        return {
            rating: data.rating as number || 0,
            totalRatings: data.totalRatings as number || 0,
        };
    }
    return { rating: 0, totalRatings: 0 };
};

interface CampaignDetailScreenProps {
  campaignId: string;
  onBack: () => void;
  onShowMap: (location: string) => void;
  onReport: (reportType: 'campaign', targetId: string, targetName: string, reportedUser: any) => void;
}

export function CampaignDetailScreen({ 
  campaignId, 
  onBack, 
  onReport 
}: CampaignDetailScreenProps) {
  const [isReserved, setIsReserved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // *** NEW STATE ***
  const [organizerUserRating, setOrganizerUserRating] = useState<UserRating>({ rating: 0, totalRatings: 0 });
  const [organizerPhoneNumber, setOrganizerPhoneNumber] = useState<string | null>(null);

  // Fetch campaign data from Firebase
  useEffect(() => {
    // ... (Existing code for fetching campaign data)
    const unsubscribe = getCampaignById(
      campaignId,
      (campaignData) => {
        setCampaign(campaignData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching campaign:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [campaignId]);

  // *** NEW EFFECT: Fetch Organizer User Rating ***
  useEffect(() => {
    if (campaign?.organizerId) {
        fetchUserRating(campaign.organizerId)
            .then(setOrganizerUserRating)
            .catch(error => {
                console.error("Error fetching organizer user rating:", error);
            });
    }
  }, [campaign?.organizerId]);
  
  // *** Existing useEffect to fetch organizer phone number (FIXED) ***
  useEffect(() => {
    if (campaign?.organizerId) {
      fetchSecureContactDetails( 
        campaign.organizerId, 
        campaignId,           
        'campaign'            
      )
        .then(setOrganizerPhoneNumber)
        .catch(error => {
          console.error("Error fetching organizer phone number:", error);
          setOrganizerPhoneNumber(null);
        });
    } else {
      setOrganizerPhoneNumber(null);
    }
  }, [campaign?.organizerId, campaignId]); 

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !campaign?.images) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const nextImage = () => {
    if (campaign?.images) {
      setCurrentImageIndex(prev => 
        prev === campaign.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (campaign?.images) {
      setCurrentImageIndex(prev => 
        prev === 0 ? campaign.images.length - 1 : prev - 1
      );
    }
  };

  const handleReserve = () => {
    setShowReservationDialog(true);
    };

  const confirmReservation = async () => {
    const result = await registerForCampaign(campaignId);
    
    if (result.success) {
      setShowReservationDialog(false);
      setShowSuccessDialog(true);
      // Refresh campaign data to show updated spots
      const unsubscribe = getCampaignById(
        campaignId,
        (campaignData) => {
          setCampaign(campaignData);
        },
        (error) => {
          console.error('Error refreshing campaign:', error);
        }
      );
      return () => unsubscribe();
    } else {
      // Handle error
      alert(result.error || 'Failed to register for campaign');
    }
  };

  // *** UPDATED handleCallOrganizer ***
  const handleCallOrganizer = () => {
    if (organizerPhoneNumber) {
      window.location.href = `tel:+${organizerPhoneNumber}`;
    } else {
      alert("Organizer contact information not available");
    }
  };

  // *** UPDATED handleMessageOrganizer ***
  const handleMessageOrganizer = () => {
    if (organizerPhoneNumber && campaign) {
      // Clean the phone number for WhatsApp
      const cleanNumber = organizerPhoneNumber.replace(/\D/g, ''); 
      const message = `Hi, I'm interested in your campaign: ${campaign.title} (ID: ${campaign.id}).`;
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
    } else {
      alert("Organizer contact information not available");
    }
  };

  const handleDirections = () => {
    if (campaign?.fullAddress) {
      try {
        openExternalMapWithAddress(campaign.fullAddress);
      } catch (error) {
        console.error('Error opening maps:', error);
        window.open('https://www.google.com/maps', '_blank');
      }
    } else {
      window.open('https://www.google.com/maps', '_blank');
    }
  };

  const handleReport = () => {
    if (campaign) {
      onReport('campaign', campaignId, campaign.title, {
        id: campaign.organizerId,
        name: campaign.organizerName,
        email: campaign.organizerEmail,
        type: 'organizer'
      });
    }
  };

  const getUrgencyColor = () => {
    if (!campaign) return "text-gray-600 bg-gray-50 border-gray-200";
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

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      "Fresh Produce": Package,
      "Shelf Stable": Package,
      "Cooked Meals": UtensilsCrossed
    };
    return icons[category] || Package;
  };

  const getDonorTypeIcon = (organizerOrg: string = '') => {
    const orgLower = organizerOrg.toLowerCase();
    const icons: { [key: string]: any } = {
      "restaurant": UtensilsCrossed,
      "hotel": Hotel,
      "supermarket": ShoppingCart,
      "grocery": Store
    };
    
    if (orgLower.includes('restaurant')) return UtensilsCrossed;
    if (orgLower.includes('hotel')) return Hotel;
    if (orgLower.includes('supermarket') || orgLower.includes('grocery')) return ShoppingCart;
    
    return Building2;
  };

  // FIX 1: Updated getExpiryInfo equivalent for Campaign to use explicit UTC+8 time zone
  const getExpiryInfo = () => {
    if (!campaign?.campaignDate || !campaign.endTime) return { text: "Check availability", color: "text-gray-600 bg-gray-50 border-gray-200" };
    
    // Explicitly create the date/time assuming UTC+8, matching server logic
    const endDateTime = new Date(`${campaign.campaignDate}T${campaign.endTime}:00+08:00`);
    const now = new Date();
    
    const timeDiff = endDateTime.getTime() - now.getTime(); // Difference in milliseconds
    const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60)); // Difference in hours, rounded up
    
    // Determine the text based on hours remaining
    if (hoursDiff <= 0) {
      const hoursAgo = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60));
      
      if (hoursAgo >= 24) { // Arbitrary point past 24 hours to clearly show 'Expired'
        return { text: "Event Ended", color: "text-red-800 bg-red-100 border-red-300" };
      }
      return { text: `Ended (${hoursAgo}h ago)`, color: "text-red-600 bg-red-50 border-red-200" };
    } 
    
    // Display remaining time
    if (hoursDiff <= 24) {
      return { text: `Starts in ${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''}`, color: "text-red-600 bg-red-50 border-red-200" };
    } else {
      const daysDiff = Math.ceil(hoursDiff / 24);
      return { text: `Starts in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`, color: "text-green-600 bg-green-50 border-green-200" };
    }
  };
  
  const expiryInfo = getExpiryInfo();


  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center text-gray-600">Loading campaign details...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center text-gray-600">Campaign not found</div>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon(campaign.category);
  const DonorTypeIcon = getDonorTypeIcon(campaign.organizerOrg);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - Improved Design */}
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2 hover:bg-amber-50">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Campaign Details</h1>
              <p className="text-xs sm:text-sm text-gray-500">Register for food distribution</p>
            </div>
          </div>
          
          {/* Report Button - Top Right */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReport}
            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:text-red-700 hover:border-red-300"
          >
            <Flag className="w-4 h-4 mr-2" />
            Report
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-4 sm:space-y-6">
        {/* Image Carousel with Swipe */}
        <div className="relative">
          {/* FIX 2: Standardize Image Container Size */}
          <div 
            ref={imageContainerRef}
            className="w-full h-60 sm:h-80 rounded-xl overflow-hidden relative" // FIXED: Enforce height
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <ImageWithFallback
              src={campaign.images?.[currentImageIndex] || '/placeholder-campaign.jpg'}
              alt={campaign.title}
              className="w-full h-full object-cover" // Ensures image fills the container
            />
            
            {/* Navigation Arrows */}
            {campaign.images && campaign.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            
            {/* Image Counter */}
            {campaign.images && campaign.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {campaign.images.length}
              </div>
            )}
          </div>
          
          {/* Dots Indicator */}
          {campaign.images && campaign.images.length > 1 && (
            <div className="flex justify-center mt-3 space-x-2">
              {campaign.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex 
                      ? 'w-8 h-2 bg-amber-500 rounded-full' 
                      : 'w-2 h-2 bg-amber-300 rounded-full hover:bg-amber-500'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Campaign Info */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                {/* Category badge with icon */}
                <div className="flex items-center gap-1 mb-2">
                  <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                  <Badge variant="outline" className="text-xs sm:text-sm">
                    {getCategoryLabel(campaign.category)}
                  </Badge>
                </div>
                
                {/* Expiry and spots badges on a new line */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`${expiryInfo.color} border text-xs sm:text-sm`}>
                    <Clock className="w-3 h-3 mr-1" />
                    {expiryInfo.text}
                  </Badge>
                  <Badge className={`${getUrgencyColor()} border text-xs sm:text-sm`}>
                    <Users className="w-3 h-3 mr-1" />
                    {campaign.availableSpots} spots left
                  </Badge>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{campaign.title}</h1>
                <div className="flex items-center space-x-2 sm:space-x-4 mt-2">
                  <Badge variant="outline" className="flex items-center gap-1 text-xs sm:text-sm bg-amber-50 text-amber-700 border-amber-200">
                    <Users className="w-3 h-3" />
                    {campaign.totalSpots} total spots
                  </Badge>
                  {/* FIX RATING: Display rating if it's greater than 0 */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 fill-current text-yellow-500" />
                    {(campaign.rating && campaign.rating > 0) ? campaign.rating.toFixed(1) : 'New'}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed text-sm sm:text-base break-words whitespace-pre-wrap">
                {campaign.description}
              </p>

              {/* Spots Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Registration Progress</span>
                  <span className="font-medium">{campaign.registeredSpots} / {campaign.totalSpots}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-amber-500 rounded-full h-2 transition-all"
                    style={{ width: `${(campaign.registeredSpots / campaign.totalSpots) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round((campaign.registeredSpots / campaign.totalSpots) * 100)}% registered</span>
                  <span>{campaign.availableSpots} spots remaining</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizer Info */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14">
                <AvatarFallback className="bg-blue-500 text-white text-sm sm:text-base">
                  {campaign.organizerName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <h3 className="font-semibold text-base sm:text-lg truncate text-gray-900">{campaign.organizerName}</h3>
                  {campaign.organizerEmail && (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                  <DonorTypeIcon className="mr-2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-600 capitalize truncate">
                    {campaign.organizerOrg || 'Food Distributor'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-500 text-yellow-500 flex-shrink-0 mr-2" />
                  {/* FIX 1: Display ORGANIZER'S USER RATING */}
                  <span className="text-sm sm:text-base font-medium text-gray-700">
                    {organizerUserRating.totalRatings === 0 ? 'New' : organizerUserRating.rating.toFixed(1)}
                  </span>
                  <span className="text-sm sm:text-base text-gray-600 truncate">
                    ({organizerUserRating.totalRatings || 0} ratings)
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 sm:space-x-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMessageOrganizer} 
                  disabled={!organizerPhoneNumber} // *** DISABLED WHEN NO PHONE NUMBER ***
                  className="p-2 sm:p-3 bg-white hover:bg-gray-50"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCallOrganizer} 
                  disabled={!organizerPhoneNumber} // *** DISABLED WHEN NO PHONE NUMBER ***
                  className="p-2 sm:p-3 bg-white hover:bg-gray-50"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-gray-900">
                  {new Date(campaign.campaignDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {campaign.startTime} - {campaign.endTime}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 sm:space-x-3">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-gray-900 break-words whitespace-pre-wrap">{campaign.locationName}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate break-words whitespace-pre-wrap">{campaign.fullAddress}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDirections}
                className="shrink-0 text-xs h-9 sm:h-10 bg-red-500 hover:bg-red-600 text-white border-transparent"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Directions
              </Button>
            </div>

            {/* Special Instructions */}
            {campaign.description && campaign.description.length > 200 && (
              <div className="flex items-start space-x-2 sm:space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800">Event Information</p>
                  <p className="text-xs sm:text-sm text-blue-700">
                    {campaign.description.substring(200)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reserve Button */}
        <div className="pb-4 sm:pb-6">
          {isReserved ? (
            <div className="text-center py-4 sm:py-6 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg sm:text-xl font-semibold text-green-800">Spot Reserved Successfully!</h3>
              <p className="text-sm text-green-700 mt-2">
                Please arrive at the event location during the specified time.
              </p>
            </div>
          ) : campaign.availableSpots > 0 ? (
            <Button
              onClick={handleReserve}
              className="w-full h-12 sm:h-14 bg-red-500 hover:bg-red-600 text-white rounded-xl text-base sm:text-lg font-semibold shadow-lg"
            >
              Register My Spot
            </Button>
          ) : (
            <Button
              disabled
              className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base bg-gray-400 text-white"
            >
              Event Fully Booked
            </Button>
          )}
        </div>
      </div>

      {/* Reservation Dialog */}
      <AlertDialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
        <AlertDialogContent className="mx-4 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Confirm Registration</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Are you sure you want to register for <strong>{campaign.title}</strong>? 
              This will reserve one spot for you at this food distribution event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReservationDialog(false)}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReservation}
              className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              Confirm Registration
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="mx-4 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Registration Successful! 🎉
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              You have successfully registered for <strong>{campaign?.title}</strong>. 
              You'll receive confirmation details shortly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowSuccessDialog(false)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-2 text-sm sm:text-base"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}