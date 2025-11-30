import { Button } from '../../UnifiedFolder/ui/button';
import { Badge } from '../../UnifiedFolder/ui/badge';
import { Plus, TrendingUp, Users, Utensils, MapPin, Home, Package, Calendar, Star } from 'lucide-react';
import { SustainabilityTipCard } from '../../UnifiedFolder/ui/SustainabilityTip';
import { useState, useEffect } from 'react';
import { getCurrentUserData, type UserData } from '../../Firebase/auth';
import { getUserFoodListings, type FoodListing } from '../../Firebase/foodUsers'; // REAL-TIME: Import the real-time version
import { ImageWithFallback } from '../../UnifiedFolder/Images/ImageWithFallback';
import { UserMetricsService, type UserMetrics } from '../../UnifiedFolder/services/userMetricServices';

interface DashboardTabProps {
  onNavigateToUpload: () => void;
  onNavigateToListingDetail: (listingId: string) => void;
}

export function DashboardTab({ onNavigateToUpload, onNavigateToListingDetail }: DashboardTabProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [activeListings, setActiveListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);

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

  // REAL-TIME: Use useEffect to set up real-time listener
  useEffect(() => {
    if (!userData) return;

    // Set up real-time listener for user's food listings
    const unsubscribe = getUserFoodListings(
      (listings) => {
        // Filter for active listings (approved status)
        const active = listings.filter(listing => 
          listing.status === 'approved'
        );
        setActiveListings(active);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time listings error:', error);
        setLoading(false);
      }
    );

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, [userData]); // Re-run when userData changes

  const loadUserData = async () => {
    try {
      const user = await getCurrentUserData();
      setUserData(user);
    } catch (error) {
      console.error("Error loading user data:", error);
      setLoading(false);
    }
  };

  // REMOVED: The old loadActiveListings function since we're using real-time now

  const getDisplayName = () => {
    if (!userData) return 'Donor';
    
    if (userData.role === 'receiver') {
      return userData.profile?.name || userData.email || 'Donor';
    }
    return userData.profile?.orgName || userData.profile?.contactPerson || userData.email || 'Organization';
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAvailabilityText = (listing: FoodListing) => {
    if (!listing.availableDate) return 'Date not set';
    
    const dateText = formatDate(listing.availableDate);
    if (listing.startTime && listing.endTime) {
      return `${dateText}, ${listing.startTime} - ${listing.endTime}`;
    }
    return dateText;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Available';
      case 'pending':
        return 'Pending';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const handleListingClick = (listing: FoodListing) => {
    if (listing.id) {
      onNavigateToListingDetail(listing.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const displayName = getDisplayName();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 p-6 flex flex-col min-h-[150px] sm:min-h-[150px] justify-center rounded-b-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl text-white">Welcome back,</h1>
            <h2 className="text-xl sm:text-2xl font-bold truncate">{displayName}!</h2>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">Ready to make a difference today? 👋</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 sm:space-y-6 pb-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Share Food Today</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                Help reduce waste by listing your surplus food
              </p>
              <Button 
                onClick={onNavigateToUpload}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-9 sm:h-10 text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Upload Food
              </Button>
            </div>
            <Utensils className="h-12 w-12 sm:h-16 sm:w-16 text-blue-300 flex-shrink-0 ml-3" />
          </div>
        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Active Listings */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <Utensils className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <div className="text-base sm:text-lg font-medium text-blue-600">{activeListings.length}</div>
            <div className="text-[10px] sm:text-xs text-gray-500">Active Listings</div>
          </div>
          
          {/* Food Waste Reduced */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            </div>
            <div className="text-base sm:text-lg font-medium text-green-600">
              {userMetrics?.donor?.foodWasteReduced || 0} kg
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500">Waste Reduced</div>
          </div>
          
          {/* People Helped */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
            </div>
            <div className="text-base sm:text-lg font-medium text-orange-600">
              {userMetrics?.donor?.peopleHelped || 0}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500">People Helped</div>
          </div>
          
          {/* Rating */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
            </div>
            <div className="text-base sm:text-lg font-medium text-yellow-500">
              {userMetrics?.donor?.rating ? userMetrics.donor.rating.toFixed(1) : '0.0'}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500">Rating</div>
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg">
          <div className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4">
            <h3 className="text-base sm:text-lg font-semibold">Active Listings</h3>
            <span className="text-xs sm:text-sm text-gray-500">
              {activeListings.length} {activeListings.length === 1 ? 'listing' : 'listings'}
            </span>
          </div>
          
          {activeListings.length === 0 ? (
            <div className="text-center px-4 pb-6">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">No active listings yet</p>
              <Button 
                onClick={onNavigateToUpload}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 sm:p-2">
              {activeListings.map((listing) => (
                <div 
                  key={listing.id} 
                  className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => handleListingClick(listing)}>
                  <div className="flex gap-3 sm:gap-4">
                    {/* Food Listing Image */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden">
                        <ImageWithFallback
                          src={listing.images?.[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1 sm:mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{listing.title}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs sm:text-sm text-gray-600">{listing.category}</p>
                            <p className="text-xs sm:text-sm text-gray-800 font-medium">
                              {listing.remainingQuantity} {listing.quantityUnit} remaining
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Availability */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mb-1">
                          <Calendar className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                          <span className="truncate">{getAvailabilityText(listing)}</span>
                        </div>
                        
                        {/* Location */}
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                          <MapPin className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                          <span className="truncate">{listing.pickupAddress}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] sm:text-xs text-gray-500">
                          Posted: {formatDate(listing.createdAt)}
                        </div>
                        
                        <Badge 
                          className={`text-[10px] sm:text-xs ${getStatusColor(listing.status)}`}
                        >
                          {getStatusText(listing.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips Card */}
        <SustainabilityTipCard />
      </div>
    </div>
  );
}