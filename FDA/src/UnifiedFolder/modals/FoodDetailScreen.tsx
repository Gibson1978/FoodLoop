// FoodDetailScreen.tsx - Unified version for both receiver and volunteer
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../UnifiedFolder/ui/card";
import { Button } from "../../UnifiedFolder/ui/button";
import { Badge } from "../../UnifiedFolder/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../UnifiedFolder/ui/avatar";
import { Input } from "../../UnifiedFolder/ui/input";
import { ImageWithFallback } from "../../UnifiedFolder/Images/ImageWithFallback";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../UnifiedFolder/ui/alert-dialog";
import { 
  ArrowLeft, 
  MapPin, 
  Clock,
  CheckCircle,
  MessageSquare,
  Navigation,
  AlertTriangle,
  Star,
  Package,
  Calendar,
  Tag,
  UtensilsCrossed,
  ShoppingCart,
  Hotel,
  Store,
  Building2,
  Apple,
  Phone,
  Flag,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { getApprovedFoodListings, type FoodListing } from "../../Firebase/foodUsers";
import { openExternalMapWithAddress } from "../../UnifiedFolder/LocationFolder/ExternalMap";
import { reserveFood } from '../../Firebase/reservationService';

interface FoodDetailScreenProps {
  foodId: string;
  onBack: () => void;
  onReport: (reportType: 'food', targetId: string, targetName: string, reportedUser: any) => void;
  userRole: 'receiver' | 'volunteer';
}

export function FoodDetailScreen({ 
  foodId, 
  onBack, 
  onReport,
  userRole 
}: FoodDetailScreenProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [foodItem, setFoodItem] = useState<FoodListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Theme configuration based on user role
  const themeConfig = {
    volunteer: {
      primary: 'text-green-600',
      bgLight: 'bg-green-50',
      bgHover: 'hover:bg-green-50',
      border: 'border-green-200',
      button: 'bg-green-500 hover:bg-green-600',
      badge: 'bg-green-50 text-green-700 border-green-200',
      accent: 'text-green-600',
      carouselActive: 'bg-green-500',
      carouselInactive: 'bg-green-300'
    },
    receiver: {
      primary: 'text-amber-600',
      bgLight: 'bg-amber-50',
      bgHover: 'hover:bg-amber-50',
      border: 'border-amber-200',
      button: 'bg-red-500 hover:bg-red-600',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      accent: 'text-amber-600',
      carouselActive: 'bg-amber-500',
      carouselInactive: 'bg-amber-300'
    }
  };

  const theme = themeConfig[userRole];

  // Role-specific text
  const roleText = {
    volunteer: {
      headerSubtitle: "Reserve for delivery",
      reserveButton: "Reserve This Food",
      successTitle: "Reservation Successful! 🎉",
      successDescription: (quantity: number, unit: string, title: string) => 
        `You have successfully reserved ${quantity} ${unit} of ${title}. Please contact the donor to coordinate pickup and delivery.`
    },
    receiver: {
      headerSubtitle: "Reserve your meal",
      reserveButton: "Reserve This Food", 
      successTitle: "Reservation Successful! 🎉",
      successDescription: (quantity: number, unit: string, title: string) =>
        `You have successfully reserved ${quantity} ${unit} of ${title}. Please contact the donor to coordinate pickup.`
    }
  };

  const text = roleText[userRole];

  // Fetch food item data from Firebase
  useEffect(() => {
    const unsubscribe = getApprovedFoodListings(
      (listings) => {
        const foundItem = listings.find(item => item.id === foodId);
        setFoodItem(foundItem || null);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching food item:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [foodId]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !foodItem?.images) return;
    
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
    if (foodItem?.images) {
      setCurrentImageIndex(prev => 
        prev === foodItem.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (foodItem?.images) {
      setCurrentImageIndex(prev => 
        prev === 0 ? foodItem.images.length - 1 : prev - 1
      );
    }
  };

  const handleReserve = () => {
    setShowReservationDialog(true);
  };

  const confirmReservation = async () => {
    if (!foodItem) return;
    
    const result = await reserveFood(foodId, reservationQuantity, userRole);
    
    if (result.success) {
      setShowReservationDialog(false);
      setShowSuccessDialog(true);
      // Refresh food item data to show updated quantity
      const unsubscribe = getApprovedFoodListings(
        (listings) => {
          const foundItem = listings.find(item => item.id === foodId);
          setFoodItem(foundItem || null);
        },
        (error) => {
          console.error('Error refreshing food item:', error);
        }
      );
      return () => unsubscribe();
    } else {
      setReservationError(result.error || 'Failed to reserve food');
      setShowReservationDialog(false);
    }
  };

  const handleCallDonor = () => {
    alert(`Calling ${foodItem?.donorName || 'donor'}...`);
  };

  const handleMessageDonor = () => {
    const phoneNumber = "";
    const message = `Hi, I'm interested in your food listing: ${foodItem?.title}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    if (phoneNumber) {
      window.open(whatsappUrl, '_blank');
    } else {
      alert("Donor contact information not available");
    }
  };

  const handleDirections = () => {
    if (foodItem?.pickupAddress) {
      try {
        openExternalMapWithAddress(foodItem.pickupAddress);
      } catch (error) {
        console.error('Error opening maps:', error);
        // Fallback to generic maps URL if there's an error
        window.open('https://www.google.com/maps', '_blank');
      }
    } else {
      // If no address, open generic maps
      window.open('https://www.google.com/maps', '_blank');
    }
  };

  const handleReport = () => {
    if (foodItem) {
      onReport('food', foodId, foodItem.title, {
        id: foodItem.donorId,
        name: foodItem.donorName,
        email: foodItem.donorEmail,
        type: 'donor'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      "Fresh Produce": Apple,
      "Shelf Stable": Package,
      "Cooked Meal": UtensilsCrossed
    };
    return icons[category] || Package;
  };

  const getDonorTypeIcon = (donorType: string) => {
    const icons: { [key: string]: any } = {
      "restaurant": UtensilsCrossed,
      "hotel": Hotel,
      "supermarket": ShoppingCart,
      "grocery": Store
    };
    return icons[donorType] || Building2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center text-gray-600">Loading food details...</div>
      </div>
    );
  }

  if (!foodItem) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center text-gray-600">Food item not found</div>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon(foodItem.category);
  const DonorTypeIcon = getDonorTypeIcon(foodItem.donorName);

  const formatDateTimeDisplay = () => {
    if (foodItem.availableDate && foodItem.startTime && foodItem.endTime) {
      const dateText = new Date(foodItem.availableDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `${dateText} • ${foodItem.startTime} - ${foodItem.endTime}`;
    }
    return "Check availability";
  };

  const getExpiryInfo = () => {
    if (!foodItem.availableDate) return { text: "Check availability", color: "text-gray-600 bg-gray-50 border-gray-200" };
    
    const availableDate = new Date(foodItem.availableDate);
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

  const expiryInfo = getExpiryInfo();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - Improved Design */}
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack} className={`p-2 ${theme.bgHover}`}>
              <ArrowLeft className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.primary}`} />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Food Details</h1>
              <p className="text-xs sm:text-sm text-gray-500">{text.headerSubtitle}</p>
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
          <div 
            ref={imageContainerRef}
            className="aspect-video rounded-xl overflow-hidden relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <ImageWithFallback
              src={foodItem.images?.[currentImageIndex] || '/placeholder-food.jpg'}
              alt={foodItem.title}
              className="w-full h-full object-cover"
            />
            
            {/* Navigation Arrows */}
            {foodItem.images && foodItem.images.length > 1 && (
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
            {foodItem.images && foodItem.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {foodItem.images.length}
              </div>
            )}
          </div>
          
          {/* Dots Indicator - Improved styling */}
          {foodItem.images && foodItem.images.length > 1 && (
            <div className="flex justify-center mt-3 space-x-2">
              {foodItem.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`transition-all duration-300 ${
                    index === currentImageIndex 
                      ? `w-8 h-2 ${theme.carouselActive} rounded-full` 
                      : `w-2 h-2 ${theme.carouselInactive} rounded-full hover:${theme.carouselActive}`
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Food Info */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${theme.primary}`} />
                  <Badge variant="outline" className="text-xs sm:text-sm">
                    {foodItem.category}
                  </Badge>
                  <Badge className={`${expiryInfo.color} border text-xs sm:text-sm`}>
                    <Clock className="w-3 h-3 mr-1" />
                    {expiryInfo.text}
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{foodItem.title}</h1>
                <div className="flex items-center space-x-2 sm:space-x-4 mt-2">
                  <Badge variant="outline" className={`flex items-center gap-1 text-xs sm:text-sm ${theme.badge}`}>
                    <Package className="w-3 h-3" />
                    {foodItem.remainingQuantity} {foodItem.quantityUnit} left
                  </Badge>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 fill-current text-yellow-500" />
                    {foodItem.rating?.toFixed(1) || 'New'}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed text-sm sm:text-base break-words whitespace-pre-wrap">
                {foodItem.description}
              </p>

              {/* Food Tags */}
              {foodItem.tags && foodItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {foodItem.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs sm:text-sm bg-gray-100 text-gray-700">
                      <Tag className="w-2 h-2 sm:w-3 sm:h-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Available Times */}
              <div className={`flex items-center space-x-2 p-3 ${theme.bgLight} rounded-lg border ${theme.border}`}>
                <Calendar className={`w-4 h-4 ${theme.accent} flex-shrink-0`} />
                <div>
                  <p className={`font-medium text-xs sm:text-sm ${theme.accent}`}>Available</p>
                  <p className={`${theme.accent} text-xs sm:text-sm`}>{formatDateTimeDisplay()}</p>
                </div>
              </div>

              {/* Pickup Instructions */}
              {foodItem.pickupInstructions && (
                <div className={`flex items-start space-x-2 sm:space-x-3 p-3 ${theme.bgLight} rounded-lg border ${theme.border}`}>
                  <AlertTriangle className={`w-4 h-4 ${theme.accent} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${theme.accent}`}>Pickup Instructions</p>
                    <p className={`text-xs sm:text-sm ${theme.accent} break-words whitespace-pre-wrap`}>{foodItem.pickupInstructions}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donor Info */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14">
                <AvatarFallback className="bg-blue-500 text-white text-sm sm:text-base">
                  {foodItem.donorName?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <h3 className="font-semibold text-base sm:text-lg truncate text-gray-900">{foodItem.donorName || 'Food Donor'}</h3>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                  <DonorTypeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-600 capitalize truncate">
                    Food Donor
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-medium text-gray-700">{foodItem.rating?.toFixed(1) || 'New'}</span>
                </div>
              </div>
              <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleMessageDonor} className="p-2 sm:p-3 bg-white hover:bg-gray-50">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleCallDonor} className="p-2 sm:p-3 bg-white hover:bg-gray-50">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Pickup */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900">
              <MapPin className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.primary}`} />
              Pickup Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-gray-900 break-words whitespace-pre-wrap">{foodItem.pickupAddress}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDirections}
                className={`shrink-0 text-xs h-9 sm:h-10 ${theme.button} text-white border-transparent`}
              >
                <Navigation className="w-4 h-4 mr-1" />
                Directions
              </Button>
            </div>

            <div className="flex items-start space-x-2 sm:space-x-3">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-gray-900">Pickup Time</p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {formatDateTimeDisplay()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reserve Button */}
        <div className="pb-4 sm:pb-6">
          <Button
            onClick={handleReserve}
            className={`w-full h-12 sm:h-14 ${theme.button} text-white rounded-xl text-base sm:text-lg font-semibold shadow-lg`}
          >
            {text.reserveButton}
          </Button>
        </div>
      </div>

      {/* Reservation Dialog */}
      {showReservationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Reserve Food</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-4 block">Quantity to Reserve</label>
                
                {/* Quantity Selector - Input between + and - buttons */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setReservationQuantity(Math.max(1, reservationQuantity - 1))}
                    disabled={reservationQuantity <= 1}
                    className="h-12 w-12 text-lg flex-shrink-0"
                  >
                    -
                  </Button>
                  
                  <div className="flex-1 flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max={foodItem.remainingQuantity}
                        value={reservationQuantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= foodItem.remainingQuantity) {
                            setReservationQuantity(value);
                          } else if (e.target.value === '') {
                            setReservationQuantity(1);
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || parseInt(e.target.value) < 1) {
                            setReservationQuantity(1);
                          }
                        }}
                        className="text-center text-xl font-bold h-12 border-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">{foodItem.quantityUnit}</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setReservationQuantity(Math.min(foodItem.remainingQuantity, reservationQuantity + 1))}
                    disabled={reservationQuantity >= foodItem.remainingQuantity}
                    className="h-12 w-12 text-lg flex-shrink-0"
                  >
                    +
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Maximum available: {foodItem.remainingQuantity} {foodItem.quantityUnit}
                </p>
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => setShowReservationDialog(false)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReservation}
                className={`flex-1 h-12 ${theme.button} text-white font-semibold`}
              >
                Confirm Reserve
              </Button>
            </div>
          </Card>
        </div>
      )}

      {reservationError && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{reservationError}</p>
          <Button 
            onClick={() => setReservationError(null)}
            className="mt-2 text-red-700 hover:bg-red-100"
            variant="outline"
            size="sm"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="mx-4 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              {text.successTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              {text.successDescription(reservationQuantity, foodItem?.quantityUnit || '', foodItem?.title || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowSuccessDialog(false)}
              className={`${theme.button} text-white px-4 sm:px-6 py-2 text-sm sm:text-base`}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}