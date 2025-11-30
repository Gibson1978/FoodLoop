import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../UnifiedFolder/ui/card';
import { Button } from '../../UnifiedFolder/ui/button';
import { Badge } from '../../UnifiedFolder/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../UnifiedFolder/ui/tabs';
import { 
  Calendar, 
  Package,
  List,
  Star,
} from 'lucide-react';
import { ImageWithFallback } from '../../UnifiedFolder/Images/ImageWithFallback';
import { ListingDetailDialog } from './ListingDetailDialog';
import { UnifiedCancelDialog } from '../../UnifiedFolder/modals/UnifiedCancelDialog';
import { toast } from 'sonner';
import { getUserFoodListings, type FoodListing } from '../../Firebase/foodUsers'; 
import type { UserData } from '../../Firebase/auth';

interface ListingsTabProps {
  onNavigateToUpload: () => void;
  onNavigateToReservations?: (listingId: string, listingName: string) => void;
  userData?: UserData;
  autoOpenListingId?: string | null;
  onAutoOpenComplete?: () => void; 
}

export function ListingsTab({ onNavigateToUpload, onNavigateToReservations, userData, autoOpenListingId, onAutoOpenComplete }: ListingsTabProps) {
  const [selectedListing, setSelectedListing] = useState<FoodListing | null>(null);
  const [itemToCancel, setItemToCancel] = useState<FoodListing | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [activeListings, setActiveListings] = useState<FoodListing[]>([]);
  const [completedListings, setCompletedListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // REAL-TIME: Set up real-time listener for user's food listings
  useEffect(() => {
    const unsubscribe = getUserFoodListings(
      (listings) => {
        // Active listings: approved status
        const active = listings.filter(listing => 
          listing.status === 'approved'
        );
        
        // Completed listings: completed status
        const completed = listings.filter(listing => 
          listing.status === 'completed'
        );

        setActiveListings(active);
        setCompletedListings(completed);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Real-time listings error:', error);
        setError('Failed to load your listings');
        setLoading(false);
        toast.error('Failed to load your listings');
      }
    );

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (autoOpenListingId && !loading && !error) {
      // Wait a tiny bit for the tab to render properly
      const timer = setTimeout(() => {
        const listing = activeListings.find(l => l.id === autoOpenListingId) || 
                       completedListings.find(l => l.id === autoOpenListingId);
        
        if (listing) {
          setSelectedListing(listing);
          setIsDialogOpen(true);
        }
        
        // Notify parent that we've processed the auto-open
        if (onAutoOpenComplete) {
          onAutoOpenComplete();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoOpenListingId, loading, error, activeListings, completedListings, onAutoOpenComplete]);

  // Remove the old useEffect that used selectedListingId

  // Update dialog handler to not clear autoOpenListingId (parent handles that)
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
  };

  const handleViewDetails = (listing: FoodListing) => {
    setSelectedListing(listing);
    setIsDialogOpen(true);
  };

  // Handle cancellation with reason
  const handleCancelListing = async (listingId: string, reason: string) => {
    try {
      const { cancelFoodListing } = await import('../../Firebase/foodUsers');
      const result = await cancelFoodListing(listingId, reason);
      
      if (result.success) {
        toast.success('Listing cancelled successfully');
        // REAL-TIME: No need to manually reload - real-time listener will update automatically
        setIsCancelDialogOpen(false);
        setItemToCancel(null);
      } else {
        toast.error(result.error || 'Failed to cancel listing');
      }
    } catch (error) {
      console.error('Error cancelling listing:', error);
      toast.error('Failed to cancel listing');
    }
  };

  // Open cancellation dialog
  const openCancelDialog = (listing: FoodListing) => {
    setItemToCancel(listing);
    setIsCancelDialogOpen(true);
  };

  // Handle cancel from ListingDetailDialog (takes listingId string)
  const handleCancelFromDialog = (listingId: string) => {
    const listing = activeListings.find(l => l.id === listingId) || completedListings.find(l => l.id === listingId);
    if (listing) {
      openCancelDialog(listing);
    }
  };

  // REAL-TIME: This function is still needed for when user updates listing through dialog
  const handleListingUpdated = () => {
    // REAL-TIME: No need to manually reload - real-time listener will update automatically
    setIsDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Available';
      case 'pending':
        return 'Pending Approval';
      case 'rejected':
        return 'Rejected';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
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

  // Format availability text using new data structure
  const getAvailabilityText = (listing: FoodListing) => {
    if (!listing.availableDate) return 'Date not set';
    
    const dateText = formatDate(listing.availableDate);
    if (listing.startTime && listing.endTime) {
      return `${dateText}, ${listing.startTime} - ${listing.endTime}`;
    }
    return dateText;
  };

  // Render star rating - always show 5 stars, filled based on rating
  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleViewReservations = (listing: FoodListing) => {
    if (onNavigateToReservations && listing.id) {
      onNavigateToReservations(listing.id, listing.title);
    } else if (!listing.id) {
      console.error('Listing ID is undefined');
      toast.error('Cannot view reservations: Listing ID is missing');
    }
  };


  if (loading) {
    return (
      <div className='space-y-4 min-h-screen overflow-hidden'>
        <div className="bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
            <div className="items-center">
              <List className="h-8 w-8 mb-2" />
            </div>
            <div className="pl-4">
              <h1 className="text-xl font-bold mb-1">My Food Listings</h1>
              <p className="text-xs text-blue-100">Manage your food donations and track their impact</p>
            </div>
          </div>
        </div>
        <div className="p-3 flex justify-center">
          <div className="text-center">Loading your listings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-4 min-h-screen'>
        <div className="bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
            <div className="items-center">
              <List className="h-8 w-8 mb-2" />
            </div>
            <div className="pl-4">
              <h1 className="text-xl font-bold mb-1">My Food Listings</h1>
              <p className="text-xs text-blue-100">Manage your food donations and track their impact</p>
            </div>
          </div>
        </div>
        <div className="p-3 flex justify-center">
          <Card className="shadow-sm border-0 rounded-xl">
            <CardContent className="p-6 text-center">
              <Package className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 text-sm mb-1">Error Loading Listings</h3>
              <p className="text-gray-600 text-xs mb-3">{error}</p>
              <Button 
                className="bg-blue-500 hover:bg-blue-600 h-9 text-xs"
                onClick={() => window.location.reload()} // Refresh page to retry
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4 min-h-screen'>
      {/* Header */}
      <div className="bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
          <div className="items-center">
            <List className="h-8 w-8 mb-2" />
          </div>

          <div className="pl-4">
            <h1 className="text-xl font-bold mb-1">My Food Listings</h1>
            <p className="text-xs text-blue-100">Manage your food donations and track their impact</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active" className="text-xs py-2">
              Active ({activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs py-2">
              Completed ({completedListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeListings.length === 0 ? (
              <Card className="shadow-sm border-0 rounded-xl">
                <CardContent className="p-6 text-center">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 text-sm mb-1">No active listings</h3>
                  <p className="text-gray-600 text-xs mb-3">Start sharing food with your community</p>
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 h-9 text-xs"
                    onClick={onNavigateToUpload}
                  >
                    Add Food Listing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeListings.map((listing) => (
                <Card key={listing.id} className="shadow-sm border-0 rounded-xl cursor-pointer hover:shadow-md transition-shadow relative">
                  <CardContent className="p-3" onClick={() => handleViewDetails(listing)}>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden">
                          <ImageWithFallback
                            src={listing.images?.[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{listing.title}</h3>
                            <p className="text-gray-600 text-xs truncate">{listing.category}</p>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] ${getStatusColor(listing.status)}`}
                          >
                            {getStatusText(listing.status)}
                          </Badge>
                        </div>
                        
                        {/* Key Metadata - Quantity Information */}
                        <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
                          <div className="text-center bg-blue-50 rounded p-1">
                            <div className="font-semibold text-blue-700">Total</div>
                            <div>{listing.totalQuantity} {listing.quantityUnit}</div>
                          </div>
                          <div className="text-center bg-green-50 rounded p-1">
                            <div className="font-semibold text-green-700">Remaining</div>
                            <div>{listing.remainingQuantity} {listing.quantityUnit}</div>
                          </div>
                          <div className="text-center bg-orange-50 rounded p-1">
                            <div className="font-semibold text-orange-700">Reserved</div>
                            <div>{listing.reservedQuantity} {listing.quantityUnit}</div>
                          </div>
                          <div className="text-center bg-purple-50 rounded p-1">
                            <div className="font-semibold text-purple-700">Collected</div>
                            <div>{listing.collectedQuantity} {listing.quantityUnit}</div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="space-y-1 text-[10px] text-gray-500 mb-2">
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="h-2 w-2 flex-shrink-0" />
                            <span className="truncate">Available: {getAvailabilityText(listing)}</span>
                          </span>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {renderStars(listing.rating)}
                            {listing.rating && listing.rating > 0 && (
                              <span className="text-[10px] text-gray-500">({listing.rating.toFixed(1)})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Check Reservation button positioned at bottom right */}
                    {listing.status === 'approved' && (
                      <div className="absolute bottom-3 right-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReservations(listing);
                          }}
                          className="h-8 px-2 text-[10px] border-blue-200 text-blue-600 hover:bg-blue-50 bg-white shadow-sm"
                        >
                          View Reservations
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCancelDialog(listing);
                          }}
                          className="h-8 px-2 text-[10px] border-red-200 text-red-600 hover:bg-red-50 bg-white shadow-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    
                    {/* Cancel button positioned at bottom right */}
                    {listing.status === 'approved' && (
                      <div className="absolute bottom-3 right-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCancelDialog(listing);
                          }}
                          className="h-8 px-2 text-[10px] border-red-200 text-red-600 hover:bg-red-50 bg-white shadow-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedListings.length === 0 ? (
              <Card className="shadow-sm border-0 rounded-xl">
                <CardContent className="p-6 text-center">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 text-sm mb-1">No completed donations yet</h3>
                  <p className="text-gray-600 text-xs">Your completed food donations will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedListings.map((listing) => (
                <Card key={listing.id} className="shadow-sm border-0 rounded-xl cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3" onClick={() => handleViewDetails(listing)}>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-lg overflow-hidden">
                          <ImageWithFallback
                            src={listing.images?.[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover opacity-75"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{listing.title}</h3>
                            <p className="text-gray-600 text-xs truncate">{listing.category}</p>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0 text-[10px]">
                            Completed
                          </Badge>
                        </div>
                        
                        {/* Key Metadata - Quantity Information */}
                        <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
                          <div className="text-center bg-blue-50 rounded p-1">
                            <div className="font-semibold text-blue-700">Total</div>
                            <div>{listing.totalQuantity} {listing.quantityUnit}</div>
                          </div>
                          <div className="text-center bg-green-50 rounded p-1">
                            <div className="font-semibold text-green-700">Remaining</div>
                            <div>{listing.remainingQuantity} {listing.quantityUnit}</div>
                          </div>
                          <div className="text-center bg-orange-50 rounded p-1">
                            <div className="font-semibold text-orange-700">Reserved</div>
                            <div>{listing.reservedQuantity} {listing.quantityUnit}</div>
                          </div>
                          <div className="text-center bg-purple-50 rounded p-1">
                            <div className="font-semibold text-purple-700">Collected</div>
                            <div>{listing.collectedQuantity} {listing.quantityUnit}</div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="space-y-1 text-[10px] text-gray-500 mb-2">
                          <div className="flex items-center gap-1 truncate">
                            <Calendar className="h-2 w-2 flex-shrink-0" />
                            <span className="truncate">Completed: {formatDate(listing.updatedAt)}</span>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {renderStars(listing.rating)}
                            {listing.rating && listing.rating > 0 && (
                              <span className="text-[10px] text-gray-500">({listing.rating.toFixed(1)})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <ListingDetailDialog
          listing={selectedListing}
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange} 
          onCancel={handleCancelFromDialog}
          onUpdate={handleListingUpdated}
        />

        <UnifiedCancelDialog
          item={itemToCancel}
          itemType="food"
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          onConfirm={handleCancelListing}
        />
      </div>
    </div>
  );
}