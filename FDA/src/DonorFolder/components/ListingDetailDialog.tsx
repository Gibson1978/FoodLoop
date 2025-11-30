// Updated ListingDetailDialog.tsx with enhanced editing visuals
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../UnifiedFolder/ui/dialog';
import { Button } from '../../UnifiedFolder/ui/button';
import { Badge } from '../../UnifiedFolder/ui/badge';
import { Separator } from '../../UnifiedFolder/ui/separator';
import { Input } from '../../UnifiedFolder/ui/input';
import { Textarea } from '../../UnifiedFolder/ui/textarea';
import { 
  MapPin, 
  Calendar, 
  Package, 
  Clock, 
  AlertCircle,
  X,
  Star,
  Edit,
  Save,
  X as CloseIcon,
  User
} from 'lucide-react';
import { ImageWithFallback } from '../../UnifiedFolder/Images/ImageWithFallback';
import { toast } from 'sonner';
import { updateFoodListing, type FoodListing} from '../../Firebase/foodUsers';
import { getRatingsForTarget, type Rating } from '../../Firebase/firebase-rating';

interface ListingDetailDialogProps {
  listing: FoodListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (listingId: string) => void;
  onUpdate?: () => void;
}

// Food categories and quantity units
const FOOD_CATEGORIES = [
  'Fresh Produce',
  'Cooked Meal', 
  'Shelf Stable'
] as const;

const QUANTITY_UNITS = [
  'servings',
  'kg',
  'pieces',
  'packages',
  'containers',
  'litres'
] as const;

export function ListingDetailDialog({ listing, open, onOpenChange, onCancel, onUpdate }: ListingDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedListing, setEditedListing] = useState<Partial<FoodListing> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Initialize edited listing when listing changes
  useEffect(() => {
    if (listing) {
      setEditedListing({ ...listing });
      // Reset editing state when listing changes
      setIsEditing(false);
    }
  }, [listing]);

  // Reset editing state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  if (!listing) return null;

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
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
    if (onCancel && listing.id) {
      onCancel(listing.id);
    }
    onOpenChange(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedListing || !listing.id) return;

    setIsSaving(true);
    try {
      const updates = {
        title: editedListing.title || listing.title,
        description: editedListing.description || listing.description,
        category: editedListing.category || listing.category,
        totalQuantity: editedListing.totalQuantity || listing.totalQuantity,
        quantityUnit: editedListing.quantityUnit || listing.quantityUnit,
        expiryDate: editedListing.expiryDate || listing.expiryDate,
        tags: editedListing.tags || listing.tags || [],
        pickupAddress: editedListing.pickupAddress || listing.pickupAddress,
        pickupInstructions: editedListing.pickupInstructions || listing.pickupInstructions,
        availableDate: editedListing.availableDate || listing.availableDate,
        startTime: editedListing.startTime || listing.startTime,
        endTime: editedListing.endTime || listing.endTime,
      };

      const result = await updateFoodListing(listing.id, updates);
      
      if (result.success) {
        toast.success('Listing updated successfully');
        setIsEditing(false);
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast.error(result.error || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedListing({ ...listing });
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedListing((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const canEdit = listing.status === 'approved' && !isEditing;

  const loadAllRatings = async () => {
    if (!listing?.id) return;
    
    setRatingsLoading(true);
    try {
      const result = await getRatingsForTarget('food', listing.id, 50); // Load first 50 ratings
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
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <DialogTitle className="text-blue-900 text-base sm:text-lg">
                {isEditing ? (
                  <Input
                    value={editedListing?.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="text-base sm:text-lg"
                  />
                ) : (
                  <span className="truncate">{listing.title}</span>
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
            {isEditing ? 'Edit your food listing details' : 'Complete details for your food listing'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Images - Read only for now */}
          {listing.images && listing.images.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm text-gray-900">Photos</h4>
              <div className="grid grid-cols-2 gap-2">
                {listing.images.map((image, index) => (
                  <ImageWithFallback
                    key={index}
                    src={image}
                    alt={`${listing.title} ${index + 1}`}
                    className="w-full h-20 sm:h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status and Tags */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {isEditing ? (
                <Input
                  value={editedListing?.tags?.join(', ') || ''}
                  onChange={(e) => handleFieldChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                  placeholder="Tags (comma separated)"
                  className="text-xs h-6 border rounded-lg px-2"
                />
              ) : (
                listing.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs">
                    {tag}
                  </Badge>
                ))
              )}
              
              {/* Rating display - always show 5 stars */}
              {listing.totalRatings && listing.totalRatings > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                      Reviews ({listing.totalRatings})
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
                    {renderStars(listing.rating || 0)}
                    <span className="text-xs text-gray-600">
                      {listing.rating?.toFixed(1)} out of 5 ({listing.totalRatings} reviews)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">No reviews yet</div>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900">Description</h4>
            {isEditing ? (
              <Textarea
                value={editedListing?.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="min-h-[80px] text-xs sm:text-sm border rounded-lg"
                placeholder="Describe the food items..."
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-all whitespace-pre-wrap max-w-full overflow-hidden">
                {listing.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            {/* Food Category Dropdown */}
            <div className="flex items-center gap-2 text-gray-600">
              <Package className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
              {isEditing ? (
                <select
                  value={editedListing?.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="w-full h-8 text-xs border rounded-lg px-2"
                >
                  <option value="">Select category</option>
                  {FOOD_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="truncate">{listing.category}</span>
              )}
            </div>

            {/* Quantity Display */}
            {!isEditing && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium truncate">
                  {listing.totalQuantity} {listing.quantityUnit} 
                  {listing.remainingQuantity !== undefined && (
                    <span className="text-gray-500 text-xs ml-1">
                      ({listing.remainingQuantity} left)
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {/* Expiry Date */}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
              {isEditing ? (
                <Input
                  type="date"
                  value={editedListing?.expiryDate || ''}
                  onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
                  className="h-8 text-xs border rounded-lg"
                />
              ) : (
                <span className="truncate">Best before: {formatDate(listing.expiryDate)}</span>
              )}
            </div>
            
            {/* Created Date - Read only */}
            {!isEditing && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Posted: {formatDate(listing.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Enhanced Quantity Editing Section */}
          {isEditing && (
            <>
              <Separator />
              <div className="space-y-1 sm:space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-gray-900">Quantity Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-blue-50 rounded-lg p-2">
                    <div className="font-semibold text-blue-700 mb-1">Total Quantity</div>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number"
                        value={editedListing?.totalQuantity || ''}
                        onChange={(e) => handleFieldChange('totalQuantity', parseInt(e.target.value) || listing.totalQuantity)}
                        className="h-6 text-xs text-center font-semibold text-blue-700"
                        min="1"
                      />
                      <select
                        value={editedListing?.quantityUnit || ''}
                        onChange={(e) => handleFieldChange('quantityUnit', e.target.value)}
                        className="h-6 text-xs border rounded text-center"
                      >
                        <option value="">Select unit</option>
                        {QUANTITY_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-2">
                    <div className="font-semibold text-green-700">Remaining</div>
                    <div className="text-sm font-semibold text-green-700 mt-1">
                      {listing.remainingQuantity} {listing.quantityUnit}
                    </div>
                  </div>
                  <div className="text-center bg-orange-50 rounded-lg p-2">
                    <div className="font-semibold text-orange-700">Reserved</div>
                    <div className="text-sm font-semibold text-orange-700 mt-1">
                      {listing.reservedQuantity} {listing.quantityUnit}
                    </div>
                  </div>
                  <div className="text-center bg-purple-50 rounded-lg p-2">
                    <div className="font-semibold text-purple-700">Collected</div>
                    <div className="text-sm font-semibold text-purple-700 mt-1">
                      {listing.collectedQuantity} {listing.quantityUnit}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Note: Changing total quantity will affect remaining quantity accordingly
                </p>
              </div>
            </>
          )}

          {/* Availability Times */}
          <Separator />
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900">Availability</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div>
                <span className="font-medium">Date:</span>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedListing?.availableDate || ''}
                    onChange={(e) => handleFieldChange('availableDate', e.target.value)}
                    className="h-8 text-xs mt-1 border rounded-lg"
                  />
                ) : (
                  <div className="truncate">{formatDate(listing.availableDate)}</div>
                )}
              </div>
              <div>
                <span className="font-medium">Time:</span>
                {isEditing ? (
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="time"
                      value={editedListing?.startTime || ''}
                      onChange={(e) => handleFieldChange('startTime', e.target.value)}
                      className="h-8 text-xs border rounded-lg"
                    />
                    <Input
                      type="time"
                      value={editedListing?.endTime || ''}
                      onChange={(e) => handleFieldChange('endTime', e.target.value)}
                      className="h-8 text-xs border rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="truncate">{listing.startTime} - {listing.endTime}</div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-1 sm:space-y-2">
            <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              Pickup Location
            </h4>
            {isEditing ? (
              <>
                <Textarea
                  value={editedListing?.pickupAddress || ''}
                  onChange={(e) => handleFieldChange('pickupAddress', e.target.value)}
                  placeholder="Full pickup address"
                  className="min-h-[60px] text-xs sm:text-sm border rounded-lg"
                />
                <Input
                  value={editedListing?.pickupInstructions || ''}
                  onChange={(e) => handleFieldChange('pickupInstructions', e.target.value)}
                  placeholder="Pickup instructions (optional)"
                  className="text-xs sm:text-sm border rounded-lg"
                />
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-gray-600 break-all whitespace-pre-wrap max-w-full overflow-hidden">
                  {listing.pickupAddress}
                </p>
                {listing.pickupInstructions && (
                  <p className="text-[10px] sm:text-xs text-gray-500 bg-gray-50 p-2 rounded break-all whitespace-pre-wrap max-w-full overflow-hidden">
                    {listing.pickupInstructions}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Enhanced Quantity Tracking - Read only */}
          {!isEditing && (
            <>
              <Separator />
              <div className="space-y-1 sm:space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-gray-900">Quantity Tracking</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-blue-50 rounded-lg p-2">
                    <div className="font-semibold text-blue-700">Total</div>
                    <div>{listing.totalQuantity} {listing.quantityUnit}</div>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-2">
                    <div className="font-semibold text-green-700">Remaining</div>
                    <div>{listing.remainingQuantity} {listing.quantityUnit}</div>
                  </div>
                  <div className="text-center bg-orange-50 rounded-lg p-2">
                    <div className="font-semibold text-orange-700">Reserved</div>
                    <div>{listing.reservedQuantity} {listing.quantityUnit}</div>
                  </div>
                  <div className="text-center bg-purple-50 rounded-lg p-2">
                    <div className="font-semibold text-purple-700">Collected</div>
                    <div>{listing.collectedQuantity} {listing.quantityUnit}</div>
                  </div>
                </div>
              </div>
            </>
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
                {listing.status === 'approved' && (
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Cancel Listing
                  </Button>
                )}
              </>
            )}
          </div>

          {!isEditing && listing.status === 'approved' && (
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-blue-700">
                  <p className="font-medium">Listing is active</p>
                  <p className="text-[10px] sm:text-xs">People can see and request pickup for this food.</p>
                </div>
              </div>
            </div>
          )}

          <Dialog open={showAllRatings} onOpenChange={setShowAllRatings}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Reviews for {listing.title}</DialogTitle>
                <DialogDescription>
                  {listing.totalRatings} reviews • Average rating: {listing.rating}/5
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
        </div>
      </DialogContent>
    </Dialog>
    
  );
}