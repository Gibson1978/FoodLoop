import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../UnifiedFolder/ui/dialog';
import { Button } from '../../../UnifiedFolder/ui/button';
import { Badge } from '../../../UnifiedFolder/ui/badge';
import { Separator } from '../../../UnifiedFolder/ui/separator';
import { Input } from '../../../UnifiedFolder/ui/input';
import { Textarea } from '../../../UnifiedFolder/ui/textarea';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Clock, 
  User,
  AlertCircle,
  X,
  Star,
  Phone,
  Mail,
  Edit,
  Save,
  X as CloseIcon
} from 'lucide-react';
import { ImageWithFallback } from '../../../UnifiedFolder/Images/ImageWithFallback';
import { type Campaign } from '../../../Firebase/campaignUsers';
import { toast } from 'sonner';
import { updateCampaignWithImages } from '../../../Firebase/campaignUsers';
import { getRatingsForTarget, type Rating } from '../../../Firebase/firebase-rating';

interface CampaignDetailDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (campaignId: string) => void;
  onUpdate?: () => void;
}

// Campaign categories
const CAMPAIGN_CATEGORIES = [
  'Canned Items',
  'Packaged Food', 
  'Mixed Items'
] as const;

export function CampaignDetailDialog({ campaign, open, onOpenChange, onCancel, onUpdate }: CampaignDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCampaign, setEditedCampaign] = useState<Partial<Campaign> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Initialize edited campaign when campaign changes
  useEffect(() => {
    if (campaign) {
      setEditedCampaign({ ...campaign });
      // Reset editing state when campaign changes
      setIsEditing(false);
    }
  }, [campaign]);

  // Reset editing state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  if (!campaign) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
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
      case 'ongoing':
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

  const formatDate = (dateInput: string | Date) => {
    if (!dateInput) return 'N/A';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateInput: string | Date) => {
    if (!dateInput) return 'N/A';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render star rating - always show 5 stars, filled based on rating
  const renderStars = (rating: number = 0, size: 'sm' | 'md' = 'sm') => {
    const starSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleCancel = () => {
    if (onCancel && campaign?.id) {
      onCancel(campaign.id);
    }
    onOpenChange(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedCampaign || !campaign.id) return;

    setIsSaving(true);
    try {
      const updates = {
        title: editedCampaign.title || campaign.title,
        description: editedCampaign.description || campaign.description,
        category: editedCampaign.category || campaign.category,
        campaignDate: editedCampaign.campaignDate || campaign.campaignDate,
        startTime: editedCampaign.startTime || campaign.startTime,
        endTime: editedCampaign.endTime || campaign.endTime,
        locationName: editedCampaign.locationName || campaign.locationName,
        fullAddress: editedCampaign.fullAddress || campaign.fullAddress,
        totalSpots: editedCampaign.totalSpots || campaign.totalSpots,
      };

      const result = await updateCampaignWithImages(campaign.id, updates);
      
      if (result.success) {
        toast.success('Campaign updated successfully');
        setIsEditing(false);
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast.error(result.error || 'Failed to update campaign');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedCampaign({ ...campaign });
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedCampaign((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Only allow editing for ongoing campaigns (equivalent to approved listings)
  const canEdit = campaign.status === 'ongoing' && !isEditing;

  const loadAllRatings = async () => {
    if (!campaign?.id) return;
    
    setRatingsLoading(true);
    try {
      const result = await getRatingsForTarget('food', campaign.id, 50); // Load first 50 ratings
      if (result.success && result.data) {
        setAllRatings(result.data);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      toast.error('Failed to load ratings');
    } finally {
      setRatingsLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <DialogTitle className="text-green-900 text-base sm:text-lg">
                {isEditing ? (
                  <Input
                    value={editedCampaign?.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="text-base sm:text-lg"
                  />
                ) : (
                  <span className="truncate">{campaign.title}</span>
                )}
              </DialogTitle>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="h-8 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditing ? 'Edit your campaign details' : 'Complete details for your volunteer campaign'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Images */}
          {campaign.images && campaign.images.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm text-gray-900">Campaign Photos</h4>
              <div className="grid grid-cols-2 gap-2">
                {campaign.images.map((image, index) => (
                  <ImageWithFallback
                    key={index}
                    src={image}
                    alt={`${campaign.title} ${index + 1}`}
                    className="w-full h-20 sm:h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status and Tags */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Badge 
                variant="secondary" 
                className={`text-[10px] sm:text-xs ${getStatusColor(campaign.status)}`}
              >
                {getStatusText(campaign.status)}
              </Badge>
              {isEditing ? (
                <select
                  value={editedCampaign?.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="h-6 text-xs border rounded-lg px-2"
                >
                  <option value="">Select category</option>
                  {CAMPAIGN_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {campaign.category}
                </Badge>
              )}
              
              {/* Rating display - always show 5 stars, only show if rating exists */}
              <div className="flex items-center gap-1">
                {renderStars(campaign.rating || 0)}
                {campaign.rating && campaign.rating > 0 && (
                  <span className="text-[10px] text-gray-500">({campaign.rating.toFixed(1)})</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900">Description</h4>
            {isEditing ? (
              <Textarea
                value={editedCampaign?.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="min-h-[80px] text-xs sm:text-sm"
                placeholder="Describe the campaign..."
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{campaign.description}</p>
            )}
          </div>

          <Separator />

          {/* Date & Time Details */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900">Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <div>
                  <div className="font-medium">Date</div>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedCampaign?.campaignDate || ''}
                      onChange={(e) => handleFieldChange('campaignDate', e.target.value)}
                      className="h-7 text-xs mt-1"
                    />
                  ) : (
                    <div className="truncate">{formatDate(campaign.campaignDate)}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <div>
                  <div className="font-medium">Time</div>
                  {isEditing ? (
                    <div className="flex gap-1 mt-1">
                      <Input
                        type="time"
                        value={editedCampaign?.startTime || ''}
                        onChange={(e) => handleFieldChange('startTime', e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Input
                        type="time"
                        value={editedCampaign?.endTime || ''}
                        onChange={(e) => handleFieldChange('endTime', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="truncate">{campaign.startTime} - {campaign.endTime}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Capacity Information */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              Volunteer Capacity
            </h4>
            {campaign.status === 'completed' ? (
              // For completed campaigns, show only 2 boxes
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center bg-green-50 rounded-lg p-2">
                  <div className="font-semibold text-green-700">Total</div>
                  <div>{campaign.totalSpots} spots</div>
                </div>
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <div className="font-semibold text-blue-700">Registered</div>
                  <div>{campaign.registeredSpots} spots</div>
                </div>
              </div>
            ) : (
              // For other campaigns, show all 3 boxes
              <div className="grid grid-cols-3 gap-2 text-xs">
                {isEditing ? (
                  <div className="text-center bg-green-50 rounded-lg p-2">
                    <Input
                      type="number"
                      value={editedCampaign?.totalSpots || campaign.totalSpots}
                      onChange={(e) => handleFieldChange('totalSpots', parseInt(e.target.value) || campaign.totalSpots)}
                      className="h-6 text-xs text-center font-semibold text-green-700"
                    />
                    <div className="text-[10px] mt-1">Total Spots</div>
                  </div>
                ) : (
                  <div className="text-center bg-green-50 rounded-lg p-2">
                    <div className="font-semibold text-green-700">{campaign.totalSpots}</div>
                    <div className="text-[10px]">Total Spots</div>
                  </div>
                )}
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <div className="font-semibold text-blue-700">{campaign.registeredSpots}</div>
                  <div className="text-[10px]">Registered</div>
                </div>
                <div className="text-center bg-orange-50 rounded-lg p-2">
                  <div className="font-semibold text-orange-700">{campaign.availableSpots}</div>
                  <div className="text-[10px]">Available</div>
                </div>
              </div>
            )}
            {isEditing && (
              <p className="text-[10px] text-gray-500 mt-1">
                Note: Changing total spots will adjust available spots accordingly
              </p>
            )}
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              Location
            </h4>
            <div className="space-y-2">
              {isEditing ? (
                <>
                  <Input
                    value={editedCampaign?.locationName || ''}
                    onChange={(e) => handleFieldChange('locationName', e.target.value)}
                    placeholder="Location name (e.g., Community Center)"
                    className="text-xs sm:text-sm"
                  />
                  <Textarea
                    value={editedCampaign?.fullAddress || ''}
                    onChange={(e) => handleFieldChange('fullAddress', e.target.value)}
                    placeholder="Full address"
                    className="min-h-[60px] text-xs sm:text-sm"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{campaign.locationName}</p>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">{campaign.fullAddress}</p>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Organizer Information (Read-only) */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center gap-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              Organizer Information
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-600">{campaign.organizerName}</span>
              </div>
              {campaign.organizerEmail && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email:
                  </span>
                  <span className="text-gray-600 truncate ml-2">{campaign.organizerEmail}</span>
                </div>
              )}
              {campaign.organizerOrg && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Organization:</span>
                  <span className="text-gray-600">{campaign.organizerOrg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Ratings and Reviews Section */}
          {campaign.totalRatings && campaign.totalRatings > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                  Reviews ({campaign.totalRatings})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAllRatings(true);
                    loadAllRatings();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  View All
                </Button>
              </div>
              
              {/* Show rating summary */}
              <div className="flex items-center gap-2">
                {renderStars(campaign.rating || 0)}
                <span className="text-xs text-gray-600">
                  {campaign.rating?.toFixed(1)} out of 5 ({campaign.totalRatings} reviews)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">No reviews yet</div>
          )}


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <CloseIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Cancel Edit
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  Close
                </Button>
                {canEdit && (
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Cancel Campaign
                  </Button>
                )}
              </>
            )}
          </div>

          {!isEditing && campaign.status === 'ongoing' && (
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-green-700">
                  <p className="font-medium">Campaign is active</p>
                  <p className="text-[10px] sm:text-xs">Volunteers can see and register for this campaign.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={showAllRatings} onOpenChange={setShowAllRatings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reviews for {campaign.title}</DialogTitle>
            <DialogDescription>
              {campaign.totalRatings} reviews • Average rating: {campaign.rating}/5
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {ratingsLoading ? (
              <div className="text-center py-8">Loading reviews...</div>
            ) : allRatings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No reviews yet</div>
            ) : (
              allRatings.map((rating, index) => (
                <div key={rating.id || index} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">{rating.raterUserName}</span>
                    <span className="text-xs text-gray-500">({rating.raterUserType})</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(rating.rating, 'md')}
                    <span className="text-xs text-gray-500">
                      {formatDateTime(rating.createdAt)}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-gray-700 mt-1">{rating.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}