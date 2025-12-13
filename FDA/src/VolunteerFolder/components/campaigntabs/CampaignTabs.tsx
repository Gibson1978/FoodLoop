// CampaignTabs.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../UnifiedFolder/ui/card';
import { Button } from '../../../UnifiedFolder/ui/button';
import { Badge } from '../../../UnifiedFolder/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../UnifiedFolder/ui/tabs';
import { 
  MapPin, 
  Calendar, 
  Users,
  List,
  Star,
} from 'lucide-react';
import { ImageWithFallback } from '../../../UnifiedFolder/Images/ImageWithFallback';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import { UnifiedCancelDialog } from '../../../UnifiedFolder/modals/UnifiedCancelDialog';
import { toast } from 'sonner';
import { getUserCampaigns, cancelCampaign, type Campaign } from '../../../Firebase/campaignUsers';
import type { UserData } from '../../../Firebase/auth';

interface CampaignsTabProps {
  onNavigateToCreate: () => void;
  onNavigateToRegistrations?: (campaignId: string, campaignName: string) => void; 
  userData?: UserData;
  autoOpenCampaignId?: string | null; // REQUIRED: Prop to receive ID from Dashboard/Deep Link
  onAutoOpenComplete?: () => void; // REQUIRED: Prop to clear ID once dialog is opened
}

export function CampaignsTab({ onNavigateToCreate, onNavigateToRegistrations, userData, autoOpenCampaignId, onAutoOpenComplete }: CampaignsTabProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [itemToCancel, setItemToCancel] = useState<Campaign | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // REAL-TIME: Set up real-time listener for user's campaigns
  useEffect(() => {
    const unsubscribe = getUserCampaigns(
      (campaigns) => {
        // Active campaigns: approved status
        const active = campaigns.filter(campaign => 
          campaign.status === 'approved'
        );
        
        // Completed campaigns: completed status
        const completed = campaigns.filter(campaign => 
          campaign.status === 'completed'
        );

        setActiveCampaigns(active);
        setCompletedCampaigns(completed);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Real-time campaigns error:', error);
        setError('Failed to load your campaigns');
        setLoading(false);
        toast.error('Failed to load your campaigns');
      }
    );

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  // FIX: useEffect to handle auto-opening the dialog when autoOpenCampaignId is set
  useEffect(() => {
    if (autoOpenCampaignId && !loading && !error) {
      // Find the campaign in either active or completed lists
      const campaign = activeCampaigns.find(c => c.id === autoOpenCampaignId) || 
                     completedCampaigns.find(c => c.id === autoOpenCampaignId);
      
      if (campaign) {
        setSelectedCampaign(campaign);
        setIsDialogOpen(true);
      }
      
      // Clear the ID after attempting to open
      if (onAutoOpenComplete) {
        onAutoOpenComplete();
      }
    }
  }, [autoOpenCampaignId, loading, error, activeCampaigns, completedCampaigns, onAutoOpenComplete]);


  const handleViewRegistrations = (campaign: Campaign) => {
    if (onNavigateToRegistrations && campaign.id) {
      onNavigateToRegistrations(campaign.id, campaign.title);
    } else if (!campaign.id) {
      console.error('Campaign ID is undefined');
      toast.error('Cannot view registrations: Campaign ID is missing');
    }
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDialogOpen(true);
  };

  const handleCancelCampaign = async (campaignId: string, reason: string) => {
    try {
      // Call the user-level function which internally calls the Cloud Function
      const result = await cancelCampaign(campaignId, reason);
      
      if (result.success) {
        toast.success('Campaign cancelled successfully');
        // REAL-TIME: Listener handles status change
        setIsCancelDialogOpen(false);
        setItemToCancel(null);
      } else {
        // Correctly handle result.error from the client function
        toast.error(result.error || 'Failed to cancel campaign');
      }
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      toast.error('Failed to cancel campaign');
    }
  };

  // Open cancellation dialog
  const openCancelDialog = (campaign: Campaign) => {
    setItemToCancel(campaign);
    setIsCancelDialogOpen(true);
  };

  // Handle cancel from CampaignDetailDialog (takes campaignId string)
  const handleCancelFromDialog = (campaignId: string) => {
    const campaign = activeCampaigns.find(c => c.id === campaignId) || completedCampaigns.find(c => c.id === campaignId);
    if (campaign) {
      openCancelDialog(campaign);
    }
  };

  // REAL-TIME: This function is still needed for when user updates campaign through dialog
  const handleCampaignUpdated = () => {
    // REAL-TIME: No need to manually reload - real-time listener will update automatically
    setIsDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Active';
      case 'pending':
        return 'Pending Approval';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
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

  // UPDATED: Show date above time
  const formatDateTime = (date: string, startTime: string, endTime: string) => {
    const dateText = formatDate(date);
    const timeText = `${startTime} - ${endTime}`;
    return (
      <div className="flex flex-col">
        <span>{dateText}</span>
        <span className="text-gray-400">{timeText}</span>
      </div>
    );
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

  if (loading) {
    return (
      <div className="space-y-4 min-h-screen overflow-hidden pb-20">
        <div className="bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
            <div className="items-center">
              <List className="h-8 w-8 mb-2" />
            </div>
            <div className="pl-4">
              <h1 className="text-xl font-bold mb-1">My Campaigns</h1>
              <p className="text-xs text-green-100">Manage your volunteer campaigns and track participation</p>
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex justify-center items-center py-8">
            <div className="text-center">Loading campaigns...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 min-h-screen overflow-hidden pb-20">
        <div className="bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
            <div className="items-center">
              <List className="h-8 w-8 mb-2" />
            </div>
            <div className="pl-4">
              <h1 className="text-xl font-bold mb-1">My Campaigns</h1>
              <p className="text-xs text-green-100">Manage your volunteer campaigns and track participation</p>
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex justify-center items-center py-8">
            <div className="text-center text-red-600">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-green-50 space-y-4 min-h-screen overflow-hidden pb-20'>
      {/* Header */}
      <div className="bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
          <div className="items-center">
            <List className="h-8 w-8 mb-2" />
          </div>

          <div className="pl-4">
            <h1 className="text-xl font-bold mb-1">My Campaigns</h1>
            <p className="text-xs text-green-100">Manage your volunteer campaigns and track participation</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active" className="text-xs py-2">
              Active ({activeCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs py-2">
              Completed ({completedCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeCampaigns.length === 0 ? (
              <Card className="shadow-sm border-0 rounded-xl">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 text-sm mb-1">No active campaigns</h3>
                  <p className="text-gray-600 text-xs mb-3">Start organizing volunteer activities for your community</p>
                  <Button 
                    className="bg-green-500 hover:bg-green-600 h-9 text-xs"
                    onClick={onNavigateToCreate}
                  >
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeCampaigns.map((campaign) => (
                <Card key={campaign.id} className="shadow-sm border-0 rounded-xl cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3" onClick={() => handleViewDetails(campaign)}>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden">
                          <ImageWithFallback
                            src={campaign.images?.[0]}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{campaign.title}</h3>
                            <p className="text-gray-600 text-xs truncate">{campaign.category}</p>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] ${getStatusColor(campaign.status)}`}
                          >
                            {getStatusText(campaign.status)}
                          </Badge>
                        </div>
                        
                        {/* Key Metadata - Volunteer Capacity */}
                        <div className="grid grid-cols-3 gap-2 mb-2 text-[10px]">
                          <div className="text-center bg-green-50 rounded p-1">
                            <div className="font-semibold text-green-700">Total</div>
                            <div>{campaign.totalSpots} spots</div>
                          </div>
                          <div className="text-center bg-blue-50 rounded p-1">
                            <div className="font-semibold text-blue-700">Registered</div>
                            <div>{campaign.registeredSpots} spots</div>
                          </div>
                          <div className="text-center bg-orange-50 rounded p-1">
                            <div className="font-semibold text-orange-700">Available</div>
                            <div>{campaign.availableSpots} spots</div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="space-y-1 text-[10px] text-gray-500 mb-2">
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="h-2 w-2 flex-shrink-0" />
                            {formatDateTime(campaign.campaignDate, campaign.startTime, campaign.endTime)}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-2 w-2 flex-shrink-0" />
                            <span className="truncate">{campaign.locationName}</span>
                          </span>
                        </div>

                        {/* Rating and Buttons Container */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          {/* Rating */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {renderStars(campaign.rating)}
                            {campaign.rating && campaign.rating > 0 && (
                              <span className="text-[10px] text-gray-500">({campaign.rating.toFixed(1)})</span>
                            )}
                          </div>
                          
                          {/* Action Buttons - FIXED: standardized height to h-8 */}
                          {campaign.status === 'approved' && (
                            <div className="flex gap-1.5 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleViewRegistrations(campaign);
                                }}
                                className="h-8 px-2 text-[10px] border-blue-200 text-blue-600 hover:bg-blue-50 bg-white shadow-sm whitespace-nowrap"
                              >
                                View Registrations
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  openCancelDialog(campaign);
                                }}
                                className="h-8 px-2 text-[10px] border-red-200 text-red-600 hover:bg-red-50 bg-white shadow-sm whitespace-nowrap"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedCampaigns.length === 0 ? (
              <Card className="shadow-sm border-0 rounded-xl">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 text-sm mb-1">No completed campaigns</h3>
                  <p className="text-gray-600 text-xs">Your completed campaigns will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedCampaigns.map((campaign) => (
                <Card key={campaign.id} className="shadow-sm border-0 rounded-xl cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3" onClick={() => handleViewDetails(campaign)}>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden">
                          <ImageWithFallback
                            src={campaign.images?.[0]}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{campaign.title}</h3>
                            <p className="text-gray-600 text-xs truncate">{campaign.category}</p>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0 text-[10px]">
                            Completed
                          </Badge>
                        </div>
                        
                        {/* Key Metadata - Volunteer Participation */}
                        <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
                          <div className="text-center bg-green-50 rounded p-1">
                            <div className="font-semibold text-green-700">Total Capacity</div>
                            <div>{campaign.totalSpots} spots</div>
                          </div>
                          <div className="text-center bg-blue-50 rounded p-1">
                            <div className="font-semibold text-blue-700">Participated</div>
                            <div>{campaign.registeredSpots} volunteers</div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="space-y-1 text-[10px] text-gray-500 mb-2">
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="h-2 w-2 flex-shrink-0" />
                            {formatDateTime(campaign.campaignDate, campaign.startTime, campaign.endTime)}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-2 w-2 flex-shrink-0" />
                            <span className="truncate">{campaign.locationName}</span>
                          </span>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            {renderStars(campaign.rating)}
                            {campaign.rating && campaign.rating > 0 && (
                              <span className="text-[10px] text-gray-500">({campaign.rating.toFixed(1)})</span>
                            )}
                          </div>
                          {/* No buttons for completed listings */}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <CampaignDetailDialog
          campaign={selectedCampaign}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onCancel={handleCancelFromDialog}
          onUpdate={handleCampaignUpdated}
        />

        <UnifiedCancelDialog
          item={itemToCancel}
          itemType="campaign"
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          onConfirm={handleCancelCampaign}
        />
      </div>
    </div>
  );
}