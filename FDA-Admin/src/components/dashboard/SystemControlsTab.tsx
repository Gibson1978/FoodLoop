import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { 
  Users, 
  Package, 
  MapPin, 
  Settings, 
  Search, 
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Building2,
  UserCheck,
  Clock,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  Eye,
  FileText,
  Trash2,
  Shield,
  X,
  Star
} from "lucide-react";
import { 
  approveUserRegistration, 
  rejectUserRegistration, 
  restoreRejectedUser,
  isCurrentUserAdmin,
  suspendUser,
  activateUser,
  deleteUserAccount,
  type UserData,
  USER_STATUS,
  // ADD REAL-TIME IMPORTS
  subscribeToPendingRegistrations,
  subscribeToAllUsers,
  subscribeToRejectedUsers,
  type Unsubscribe as UserUnsubscribe
} from "../../Firebase/auth"; 
import { 
  getAllFoodListings,
  approveFoodListing, 
  rejectFoodListing,
  deleteFoodListingAdmin,
  markListingAsCompleted,
  type FoodListing,
  FOOD_STATUS, 
  type FoodStatus,
  type Unsubscribe as FoodUnsubscribe
} from '../../Firebase/foodAdmin';
import { 
  getAllCampaigns,
  approveCampaign, 
  rejectCampaign,
  deleteCampaignAdmin,
  updateCampaignStatus,
  type Campaign,
  CAMPAIGN_STATUS, 
  type CampaignStatus,
  type Unsubscribe as CampaignUnsubscribe
} from '../../Firebase/campaignAdmin';

// Constants and configuration objects
const USER_ROLE_CONFIG = {
  donor: { className: "bg-blue-100 text-blue-700", label: "Donor" },
  volunteer: { className: "bg-purple-100 text-purple-700", label: "Volunteer" },
  receiver: { className: "bg-orange-100 text-orange-700", label: "Receiver" },
  admin: { className: "bg-red-100 text-red-700", label: "Admin" }
};

const USER_STATUS_CONFIG = {
  [USER_STATUS.APPROVED]: { variant: "secondary", className: "bg-green-100 text-green-700", label: "Active" },
  [USER_STATUS.REJECTED]: { variant: "secondary", className: "bg-orange-100 text-orange-700", label: "Suspended" },
  [USER_STATUS.PENDING]: { variant: "secondary", className: "bg-yellow-100 text-yellow-700", label: "Pending" }
};

const FOOD_STATUS_CONFIG = {
  [FOOD_STATUS.PENDING]: { variant: "secondary", className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  [FOOD_STATUS.APPROVED]: { variant: "secondary", className: "bg-green-100 text-green-700", label: "Approved" },
  [FOOD_STATUS.REJECTED]: { variant: "secondary", className: "bg-red-100 text-red-700", label: "Rejected" },
  [FOOD_STATUS.COMPLETED]: { variant: "secondary", className: "bg-gray-100 text-gray-700", label: "Completed" }
};

const FOOD_CATEGORY_CONFIG = {
  'Fresh Produce': { className: "bg-blue-100 text-blue-700", label: "Fresh Produce" },
  'Cooked Meals': { className: "bg-orange-100 text-orange-700", label: "Cooked Meals" },
  'Shelf Stable': { className: "bg-purple-100 text-purple-700", label: "Shelf Stable" }
};

const CAMPAIGN_STATUS_CONFIG = {
  [CAMPAIGN_STATUS.PENDING]: { variant: "secondary", className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  [CAMPAIGN_STATUS.ONGOING]: { variant: "secondary", className: "bg-green-100 text-green-700", label: "Ongoing" },
  [CAMPAIGN_STATUS.COMPLETED]: { variant: "secondary", className: "bg-gray-100 text-gray-700", label: "Completed" },
  [CAMPAIGN_STATUS.CANCELLED]: { variant: "secondary", className: "bg-red-100 text-red-700", label: "Cancelled" }
};

const CAMPAIGN_CATEGORY_CONFIG = {
  'Canned Items': { className: "bg-blue-100 text-blue-700", label: "Canned Items" },
  'Packaged Food': { className: "bg-orange-100 text-orange-700", label: "Packaged Food" },
  'Mixed Items': { className: "bg-purple-100 text-purple-700", label: "Mixed Items" }
};

// Type definitions for actions
type UserAction = "suspend" | "activate" | "restore" | "delete" | "approve" | "reject";
type FoodAction = "approve" | "reject" | "delete" | "complete";
type CampaignAction = "approve" | "reject" | "delete" | "complete" | "cancel" | "activate";

// Reusable Components
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="text-center py-8">
    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

const ErrorDisplay = ({ error, onDismiss }: { error: string | null; onDismiss: () => void }) => (
  error && (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
      <p className="text-red-700 text-sm font-medium">{error}</p>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0">
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
);

const SearchAndRefreshBar = ({ 
  searchTerm, 
  onSearchChange, 
  onRefresh, 
  loading 
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
}) => (
  <div className="flex gap-3 mb-6">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search users, campaigns, or listings..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 bg-input-background"
      />
    </div>
    <Button 
      variant="outline" 
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  </div>
);

// Star Rating Component
const StarRating = ({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <Star 
            className="h-4 w-4 fill-yellow-400 text-yellow-400 absolute top-0 left-0 overflow-hidden" 
            style={{ width: '50%' }}
          />
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="text-sm text-muted-foreground ml-1">({rating.toFixed(1)})</span>
    </div>
  );
};

// User Management Components
const UserBadges = ({ user, isRejectedUser = false }: { user: UserData; isRejectedUser?: boolean }) => {
  const getStatusBadge = () => {
    if (isRejectedUser) {
      return (
        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
          Rejected
        </Badge>
      );
    }

    const config = USER_STATUS_CONFIG[user.status] || { 
      variant: "secondary", 
      className: "bg-gray-100 text-gray-700", 
      label: user.status 
    };
    
    return (
      <Badge variant={config.variant as "secondary"} className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const getRoleBadge = () => {
    const config = USER_ROLE_CONFIG[user.role as keyof typeof USER_ROLE_CONFIG] || { 
      className: "bg-gray-100 text-gray-700", 
      label: user.role 
    };
    
    return (
      <Badge variant="secondary" className={`text-xs ${config.className}`}>
        {config.label}
        {user.profile?.orgName && " (Org)"}
        {user.role === 'receiver' && !user.profile?.orgName && " (Individual)"}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      {getRoleBadge()}
      {getStatusBadge()}
      {user.profile?.orgType && (
        <Badge variant="outline" className="text-xs">
          {user.profile.orgType}
        </Badge>
      )}
    </div>
  );
};

const UserActions = ({ 
  user, 
  isRejectedUser, 
  onAction, 
  onDeleteClick, 
  deleteConfirm, 
  actionLoading 
}: {
  user: UserData;
  isRejectedUser: boolean;
  onAction: (userId: string, action: UserAction) => void;
  onDeleteClick: (userId: string) => void;
  deleteConfirm: string | null;
  actionLoading: string | null;
}) => {
  const isActive = user.status === USER_STATUS.APPROVED;
  const isSuspended = user.status === USER_STATUS.REJECTED && !isRejectedUser;
  const isPending = user.status === USER_STATUS.PENDING && !isRejectedUser;

  const renderActionButtons = () => {
    // Pending users - show approve/reject buttons
    if (isPending) {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={() => onAction(user.uid, "approve")}
            disabled={actionLoading === user.uid}
          >
            {actionLoading === user.uid ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            Approve
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => onAction(user.uid, "reject")}
            disabled={actionLoading === user.uid}
          >
            {actionLoading === user.uid ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            Reject
          </Button>
        </>
      );
    }

    // Active users - show suspend button
    if (isActive) {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-orange-600 border-orange-600 hover:bg-orange-50"
            onClick={() => onAction(user.uid, "suspend")}
            disabled={actionLoading === user.uid}
          >
            {actionLoading === user.uid ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Ban className="h-3 w-3 mr-1" />
            )}
            Suspend
          </Button>
          {renderDeleteButton()}
        </>
      );
    }

    // Suspended users - show activate button
    if (isSuspended) {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={() => onAction(user.uid, "activate")}
            disabled={actionLoading === user.uid}
          >
            {actionLoading === user.uid ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <UserCheck className="h-3 w-3 mr-1" />
            )}
            Activate
          </Button>
          {renderDeleteButton()}
        </>
      );
    }

    // Rejected users - show restore button
    if (isRejectedUser) {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={() => onAction(user.uid, "restore")}
            disabled={actionLoading === user.uid}
          >
            {actionLoading === user.uid ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3 mr-1" />
            )}
            Restore
          </Button>
          {renderDeleteButton()}
        </>
      );
    }

    return null;
  };

  const renderDeleteButton = () => {
    if (deleteConfirm === user.uid) {
      return (
        <div className="flex gap-1">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onAction(user.uid, "delete")}
            disabled={actionLoading === user.uid}
            className="flex items-center gap-1"
          >
            {actionLoading === user.uid ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Shield className="h-3 w-3" />
            )}
            Confirm
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDeleteClick('')}
            disabled={actionLoading === user.uid}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <Button 
        variant="destructive" 
        size="sm"
        onClick={() => onDeleteClick(user.uid)}
        disabled={actionLoading === user.uid}
        className="flex items-center gap-1"
      >
        <Trash2 className="h-3 w-3" />
        Remove
      </Button>
    );
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="text-blue-600 border-blue-600 hover:bg-blue-50"
        onClick={() => window.open(user.verification?.documentUrl, '_blank')}
        disabled={!user.verification?.documentUrl}
        title={user.verification?.documentUrl ? "View verification document" : "No document available"}
      >
        <FileText className="h-3 w-3 mr-1" />
        View Doc
      </Button>
      {renderActionButtons()}
    </div>
  );
};

const UserCard = ({ 
  user, 
  isRejectedUser = false, 
  onAction, 
  onDeleteClick, 
  deleteConfirm, 
  actionLoading 
}: {
  user: UserData;
  isRejectedUser?: boolean;
  onAction: (userId: string, action: UserAction) => void;
  onDeleteClick: (userId: string) => void;
  deleteConfirm: string | null;
  actionLoading: string | null;
}) => {
  const getDisplayName = (user: UserData) => {
    if (user.role === 'receiver') {
      return user.profile?.name || user.email || 'Unknown User';
    }
    return user.profile?.orgName || user.profile?.contactPerson || user.email || 'Unknown Organization';
  };

  const getUserType = (user: UserData) => {
    return user.role === 'receiver' ? "individual" : "organization";
  };

  const displayName = getDisplayName(user);
  const userType = getUserType(user);

  return (
    <div className={`border rounded-lg p-4 ${isRejectedUser ? 'bg-red-50 border-red-200' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{displayName}</h4>
              {userType === "organization" && (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {user.email}
            </div>
            <UserBadges user={user} isRejectedUser={isRejectedUser} />
            {isRejectedUser && (user as any).rejectionReason && (
              <div className="mt-1 text-xs text-red-600">
                <strong>Reason:</strong> {(user as any).rejectionReason}
              </div>
            )}
          </div>
        </div>
        
        <UserActions 
          user={user}
          isRejectedUser={isRejectedUser}
          onAction={onAction}
          onDeleteClick={onDeleteClick}
          deleteConfirm={deleteConfirm}
          actionLoading={actionLoading}
        />
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>
            {isRejectedUser 
              ? `Submitted ${user.createdAt?.toLocaleDateString() || 'Unknown date'}`
              : `Joined ${user.createdAt?.toLocaleDateString() || 'Unknown date'}`
            }
          </span>
        </div>
        <span>•</span>
        {isRejectedUser ? (
          <span>Rejected {(user as any).rejectedAt?.toLocaleDateString() || 'Unknown date'}</span>
        ) : (
          <span>Last updated {user.updatedAt?.toLocaleDateString() || 'Unknown date'}</span>
        )}
        {user.profile?.phone && (
          <>
            <span>•</span>
            <span>Phone: {user.profile.phone}</span>
          </>
        )}
        {user.verification?.documentUploaded && (
          <>
            <span>•</span>
            <span className="text-green-600">Document Uploaded</span>
          </>
        )}
      </div>

      {user.profile?.address && (
        <div className="mt-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 inline mr-1" />
          {user.profile.address.street}, {user.profile.address.city}, {user.profile.address.postalCode}
        </div>
      )}
    </div>
  );
};

// Food Management Components
const FoodBadges = ({ status, category }: { status: FoodStatus; category: string }) => {
  const statusConfig = FOOD_STATUS_CONFIG[status] || { 
    variant: "secondary", 
    className: "bg-gray-100 text-gray-700", 
    label: status 
  };
  
  const categoryConfig = FOOD_CATEGORY_CONFIG[category as keyof typeof FOOD_CATEGORY_CONFIG] || { 
    className: "bg-gray-100 text-gray-700", 
    label: category 
  };

  return (
    <div className="flex items-center gap-3 mb-2">
      <Badge variant={statusConfig.variant as "secondary"} className={`text-xs ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
      <Badge variant="secondary" className={`text-xs ${categoryConfig.className}`}>
        {categoryConfig.label}
      </Badge>
    </div>
  );
};

const FoodCard = ({ 
  listing, 
  onAction, 
  actionLoading
}: {
  listing: FoodListing;
  onAction: (id: string, action: FoodAction, reason?: string) => void;
  actionLoading: string | null;
}) => {
  const [showImages, setShowImages] = useState(false);
  const now = new Date();
  
  const endDateTime = new Date(`${listing.availableDate}T${listing.endTime}`);
  
  const isExpired = endDateTime < now;
  const isAlmostExpired = endDateTime < new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const isOutOfStock = listing.remainingQuantity <= 0;
  
  const isPendingAndExpired = listing.status === FOOD_STATUS.PENDING && isExpired;
  const isApprovedAndShouldComplete = listing.status === FOOD_STATUS.APPROVED && (isExpired || isOutOfStock);
  const isCancelled = listing.status === FOOD_STATUS.CANCELLED;

  return (
    <div className={`border rounded-lg p-4 bg-white ${
      isPendingAndExpired ? 'border-red-200 bg-red-50' : 
      isApprovedAndShouldComplete ? 'border-orange-200 bg-orange-50' :
      isCancelled ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">{listing.title}</h3>
              <FoodBadges status={listing.status} category={listing.category} />
              {listing.tags && listing.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {listing.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {isPendingAndExpired && (
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Expired - Needs Review
              </Badge>
            )}
            {isApprovedAndShouldComplete && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {isExpired && isOutOfStock ? 'Expired & Out of Stock' : 
                 isExpired ? 'Expired' : 'Out of Stock'}
              </Badge>
            )}
            {isAlmostExpired && listing.status === FOOD_STATUS.APPROVED && !isExpired && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Expiring Soon
              </Badge>
            )}
          </div>

          {isCancelled && listing.cancellationReason && (
              <div className="mb-3 p-2 bg-gray-100 rounded text-sm">
                <strong>Cancellation Reason:</strong> {listing.cancellationReason}
                {listing.cancelledAt && (
                  <span className="text-gray-600 ml-2">
                    on {listing.cancelledAt.toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Donor:</span> {listing.donorName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Qty:</span> {listing.totalQuantity}
                    {listing.remainingQuantity !== undefined && (
                      <span className={`text-xs ml-1 ${
                        isOutOfStock ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        ({listing.remainingQuantity} left)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Best Before:</span> {new Date(listing.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {listing.description && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Description:</span>
                  <p className="mt-1 leading-relaxed">{listing.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">
                    <span className="font-medium">Pickup:</span> {listing.pickupAddress}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Date:</span> {new Date(listing.availableDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Time:</span> {listing.startTime} - {listing.endTime}
                  </span>
                </div>
              </div>

              {listing.pickupInstructions && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Instructions:</span>
                  <p className="mt-1 leading-relaxed">{listing.pickupInstructions}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border">
                <h5 className="font-medium text-gray-700 mb-2 text-sm">Food Rating</h5>
                {listing.rating ? (
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <StarRating rating={listing.rating} />
                    </div>
                    {listing.totalRatings && (
                      <p className="text-xs text-gray-600 text-center">
                        {listing.totalRatings} rating{listing.totalRatings !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs text-center">No ratings</p>
                )}
                
                <div className="flex flex-col gap-1 mt-2">
                  {listing.reservedQuantity !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Reserved:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {listing.reservedQuantity}
                      </Badge>
                    </div>
                  )}
                  {listing.collectedQuantity !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Collected:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {listing.collectedQuantity}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {listing.images && listing.images.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => setShowImages(!showImages)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {showImages ? 'Hide' : 'View'} ({listing.images.length})
                  </Button>
                )}

                {listing.status === FOOD_STATUS.PENDING && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => onAction(listing.id!, "approve")}
                      disabled={actionLoading === listing.id}
                    >
                      {actionLoading === listing.id ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => onAction(listing.id!, "reject", isPendingAndExpired ? "Auto-rejected: Listing has expired" : "Rejected by admin")}
                      disabled={actionLoading === listing.id}
                    >
                      {actionLoading === listing.id ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {isPendingAndExpired ? 'Auto-Reject' : 'Reject'}
                    </Button>
                  </>
                )}

                {(listing.status === FOOD_STATUS.APPROVED || listing.status === FOOD_STATUS.REJECTED || listing.status === FOOD_STATUS.COMPLETED) && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onAction(listing.id!, "delete")}
                    disabled={actionLoading === listing.id}
                  >
                    {actionLoading === listing.id ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {listing.createdAt?.toLocaleDateString()}</span>
            </div>
            <span>•</span>
            <span>Updated {listing.updatedAt?.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {showImages && listing.images && listing.images.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h5 className="font-medium mb-3 text-sm text-gray-700">Food Images ({listing.images.length})</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {listing.images.map((image, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                  <img
                    src={image}
                    alt={`Food image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <p className="text-xs text-center text-gray-600 mt-1">
                  Image {index + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Campaign Management Components
const CampaignBadges = ({ status, category }: { status: CampaignStatus; category: string }) => {
  const statusConfig = CAMPAIGN_STATUS_CONFIG[status] || { 
    variant: "secondary", 
    className: "bg-gray-100 text-gray-700", 
    label: status 
  };
  
  const categoryConfig = CAMPAIGN_CATEGORY_CONFIG[category as keyof typeof CAMPAIGN_CATEGORY_CONFIG] || { 
    className: "bg-gray-100 text-gray-700", 
    label: category 
  };

  return (
    <div className="flex items-center gap-3 mb-2">
      <Badge variant={statusConfig.variant as "secondary"} className={`text-xs ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
      <Badge variant="secondary" className={`text-xs ${categoryConfig.className}`}>
        {categoryConfig.label}
      </Badge>
    </div>
  );
};

const CampaignCard = ({ 
  campaign, 
  onAction, 
  actionLoading
}: {
  campaign: Campaign;
  onAction: (id: string, action: CampaignAction, reason?: string) => void;
  actionLoading: string | null;
}) => {
  const [showImages, setShowImages] = useState(false);
  const now = new Date();

  const endDateTime = new Date(`${campaign.campaignDate}T${campaign.endTime}`);
  
  const isExpired = endDateTime < now;
  const isAlmostExpired = endDateTime < new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const isOngoingAndExpired = campaign.status === CAMPAIGN_STATUS.ONGOING && isExpired;
  const isCancelled = campaign.status === CAMPAIGN_STATUS.CANCELLED;

  return (
    <div className={`border rounded-lg p-4 bg-white ${
      isOngoingAndExpired ? 'border-orange-200 bg-orange-50' : 
      isCancelled ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">{campaign.title}</h3>
              <CampaignBadges status={campaign.status} category={campaign.category} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {isOngoingAndExpired && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Expired - Will Auto-Complete
              </Badge>
            )}
            {isAlmostExpired && campaign.status === CAMPAIGN_STATUS.ONGOING && !isExpired && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Ending Soon
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
              <Users className="h-3 w-3 mr-1" />
              {campaign.registeredSpots}/{campaign.totalSpots} registered
            </Badge>
          </div>
          
          {isCancelled && campaign.cancellationReason && (
            <div className="mb-3 p-2 bg-gray-100 rounded text-sm">
              <strong>Cancellation Reason:</strong> {campaign.cancellationReason}
              {campaign.cancelledAt && (
                <span className="text-gray-600 ml-2">
                  on {campaign.cancelledAt.toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Organizer:</span> {campaign.organizerName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Email:</span> {campaign.organizerEmail}
                  </span>
                </div>
              </div>

              {campaign.description && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Description:</span>
                  <p className="mt-1 leading-relaxed">{campaign.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">
                    <span className="font-medium">Location:</span> {campaign.locationName}
                  </span>
                </div>
                <div className="flex items-start gap-2 ml-6">
                  <span className="text-gray-600">{campaign.fullAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Date:</span> {new Date(campaign.campaignDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium">Time:</span> {campaign.startTime} - {campaign.endTime}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border">
                <h5 className="font-medium text-gray-700 mb-2 text-sm">Campaign Rating</h5>
                {campaign.rating ? (
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <StarRating rating={campaign.rating} />
                    </div>
                    {campaign.totalRatings && (
                      <p className="text-xs text-gray-600 text-center">
                        {campaign.totalRatings} rating{campaign.totalRatings !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs text-center">No ratings</p>
                )}
                
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Total Spots:</span>
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                      {campaign.totalSpots}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Available:</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {campaign.availableSpots}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {campaign.images && campaign.images.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => setShowImages(!showImages)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {showImages ? 'Hide' : 'View'} ({campaign.images.length})
                  </Button>
                )}

                {campaign.status === CAMPAIGN_STATUS.PENDING && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => onAction(campaign.id!, "approve")}
                      disabled={actionLoading === campaign.id}
                    >
                      {actionLoading === campaign.id ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => onAction(campaign.id!, "reject", "Rejected by admin")}
                      disabled={actionLoading === campaign.id}
                    >
                      {actionLoading === campaign.id ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      Reject
                    </Button>
                  </>
                )}

                {campaign.status === CAMPAIGN_STATUS.ONGOING && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      onClick={() => onAction(campaign.id!, "cancel", "Cancelled by admin")}
                      disabled={actionLoading === campaign.id}
                    >
                      {actionLoading === campaign.id ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      Cancel
                    </Button>
                  </>
                )}

                {campaign.status === CAMPAIGN_STATUS.COMPLETED && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => onAction(campaign.id!, "activate")}
                    disabled={actionLoading === campaign.id}
                  >
                    {actionLoading === campaign.id ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <UserCheck className="h-3 w-3 mr-1" />
                    )}
                    Reactivate
                  </Button>
                )}

                {(campaign.status === CAMPAIGN_STATUS.CANCELLED || campaign.status === CAMPAIGN_STATUS.COMPLETED) && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onAction(campaign.id!, "delete")}
                    disabled={actionLoading === campaign.id}
                  >
                    {actionLoading === campaign.id ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {campaign.createdAt?.toLocaleDateString()}</span>
            </div>
            <span>•</span>
            <span>Updated {campaign.updatedAt?.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {showImages && campaign.images && campaign.images.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h5 className="font-medium mb-3 text-sm text-gray-700">Campaign Images ({campaign.images.length})</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {campaign.images.map((image, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                  <img
                    src={image}
                    alt={`Campaign image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <p className="text-xs text-center text-gray-600 mt-1">
                  Image {index + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
export function SystemControlsTab() {
  // State variables
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "suspended" | "rejected">("all");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "donor" | "volunteer" | "receiver">("all");
  const [foodStatusFilter, setFoodStatusFilter] = useState<"all" | FoodStatus>("all");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<"all" | "Fresh Produce" | "Cooked Meals" | "Shelf Stable">("all");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [campaignCategoryFilter, setCampaignCategoryFilter] = useState<"all" | "Canned Items" | "Packaged Food" | "Mixed Items">("all");
  
  const [pendingRegistrations, setPendingRegistrations] = useState<UserData[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserData[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<UserData[]>([]);
  const [allFoodListings, setAllFoodListings] = useState<FoodListing[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Refs for unsubscribe functions - UPDATED TO INCLUDE USER LISTENERS
  const unsubscribeRefs = useRef<{
    campaigns?: CampaignUnsubscribe;
    foodListings?: FoodUnsubscribe;
    pendingUsers?: UserUnsubscribe;
    allUsers?: UserUnsubscribe;
    rejectedUsers?: UserUnsubscribe;
  }>({});

  // Admin check
  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (isAdmin) {
      loadTabData();
    }
  }, [activeTab, isAdmin]);

  // Cleanup subscriptions on unmount - UPDATED TO INCLUDE USER LISTENERS
  useEffect(() => {
    return () => {
      if (unsubscribeRefs.current.campaigns) {
        unsubscribeRefs.current.campaigns();
      }
      if (unsubscribeRefs.current.foodListings) {
        unsubscribeRefs.current.foodListings();
      }
      if (unsubscribeRefs.current.pendingUsers) {
        unsubscribeRefs.current.pendingUsers();
      }
      if (unsubscribeRefs.current.allUsers) {
        unsubscribeRefs.current.allUsers();
      }
      if (unsubscribeRefs.current.rejectedUsers) {
        unsubscribeRefs.current.rejectedUsers();
      }
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        setError("Access denied. Admin privileges required.");
      }
    } catch (err) {
      setError("Failed to verify admin status.");
      console.error("Admin check error:", err);
    }
  };

  // UPDATED LOAD TAB DATA WITH REAL-TIME USER LISTENERS
  const loadTabData = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cleanup previous subscriptions
      if (unsubscribeRefs.current.campaigns) {
        unsubscribeRefs.current.campaigns();
        unsubscribeRefs.current.campaigns = undefined;
      }
      if (unsubscribeRefs.current.foodListings) {
        unsubscribeRefs.current.foodListings();
        unsubscribeRefs.current.foodListings = undefined;
      }
      if (unsubscribeRefs.current.pendingUsers) {
        unsubscribeRefs.current.pendingUsers();
        unsubscribeRefs.current.pendingUsers = undefined;
      }
      if (unsubscribeRefs.current.allUsers) {
        unsubscribeRefs.current.allUsers();
        unsubscribeRefs.current.allUsers = undefined;
      }
      if (unsubscribeRefs.current.rejectedUsers) {
        unsubscribeRefs.current.rejectedUsers();
        unsubscribeRefs.current.rejectedUsers = undefined;
      }

      switch (activeTab) {
        case "pending":
          await setupPendingUsersRealtime();
          break;
        case "users":
          await setupUsersRealtime();
          break;
        case "campaigns":
          await setupCampaignsRealtime();
          break;
        case "listings":
          await setupFoodListingsRealtime();
          break;
        default:
          break;
      }
    } catch (err) {
      setError(`Failed to load ${activeTab} data`);
      console.error(`Load ${activeTab} data error:`, err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAdmin]);

  // NEW REAL-TIME SETUP FUNCTIONS FOR USERS
  const setupPendingUsersRealtime = useCallback(() => {
    return new Promise<void>((resolve) => {
      unsubscribeRefs.current.pendingUsers = subscribeToPendingRegistrations(
        (users) => {
          console.log('Real-time pending users update:', users.length);
          setPendingRegistrations(users);
          resolve();
        },
        (error) => {
          console.error('Real-time pending users error:', error);
          setError('Failed to load pending users in real-time');
          resolve();
        }
      );
    });
  }, []);

  const setupUsersRealtime = useCallback(() => {
    return new Promise<void>((resolve) => {
      let resolvedCount = 0;
      const checkResolved = () => {
        resolvedCount++;
        if (resolvedCount === 2) resolve();
      };

      // Subscribe to approved users
      unsubscribeRefs.current.allUsers = subscribeToAllUsers(
        (users) => {
          console.log('Real-time all users update:', users.length);
          setApprovedUsers(users);
          checkResolved();
        },
        (error) => {
          console.error('Real-time all users error:', error);
          setError('Failed to load all users in real-time');
          checkResolved();
        }
      );

      // Subscribe to rejected users
      unsubscribeRefs.current.rejectedUsers = subscribeToRejectedUsers(
        (users) => {
          console.log('Real-time rejected users update:', users.length);
          setRejectedUsers(users);
          checkResolved();
        },
        (error) => {
          console.error('Real-time rejected users error:', error);
          setError('Failed to load rejected users in real-time');
          checkResolved();
        }
      );
    });
  }, []);

  // EXISTING REAL-TIME SETUP FUNCTIONS FOR CAMPAIGNS AND FOOD LISTINGS
  const setupCampaignsRealtime = useCallback(() => {
    return new Promise<void>((resolve) => {
      unsubscribeRefs.current.campaigns = getAllCampaigns(
        (campaigns) => {
          console.log('Real-time campaigns update:', campaigns.length);
          setAllCampaigns(campaigns);
          resolve();
        },
        (error) => {
          console.error('Real-time campaigns error:', error);
          setError('Failed to load campaigns in real-time');
          resolve();
        }
      );
    });
  }, []);

  const setupFoodListingsRealtime = useCallback(() => {
    return new Promise<void>((resolve) => {
      unsubscribeRefs.current.foodListings = getAllFoodListings(
        (listings) => {
          console.log('Real-time food listings update:', listings.length);
          setAllFoodListings(listings);
          resolve();
        },
        (error) => {
          console.error('Real-time food listings error:', error);
          setError('Failed to load food listings in real-time');
          resolve();
        }
      );
    });
  }, []);

  // Action handlers - UPDATED TO REMOVE MANUAL RELOADING
  const handleRegistrationAction = async (userId: string, action: "approve" | "reject") => {
    if (!isAdmin) return;
    
    setActionLoading(userId);
    setError(null);
    
    try {
      const result = action === "approve" 
        ? await approveUserRegistration(userId)
        : await rejectUserRegistration(userId);
      
      if (result?.success) {
        // No need to manually reload - real-time listeners will handle updates
        console.log(`User ${action}d successfully`);
      } else {
        setError(result?.error || `Failed to ${action} registration`);
      }
    } catch (err) {
      setError(`Failed to ${action} registration`);
      console.error(`Registration action error (${action}):`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserAction = async (userId: string, action: UserAction) => {
    if (!isAdmin) return;
    
    setActionLoading(userId);
    setError(null);
    setDeleteConfirm(null);
    
    try {
      let result;
      switch (action) {
        case "suspend":
          result = await suspendUser(userId);
          break;
        case "activate":
          result = await activateUser(userId);
          break;
        case "restore":
          result = await restoreRejectedUser(userId);
          break;
        case "delete":
          result = await deleteUserAccount(userId);
          break;
        default:
          throw new Error(`Unknown user action: ${action}`);
      }
      
      if (result?.success) {
        // No need to manually reload - real-time listeners will handle updates
        console.log(`User ${action}d successfully`);
      } else {
        setError(result?.error || `Failed to ${action} user`);
      }
    } catch (err) {
      setError(`Failed to ${action} user`);
      console.error(`User action error (${action}):`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFoodListingAction = async (listingId: string, action: FoodAction, reason?: string) => {
    if (!isAdmin) return;
    
    setActionLoading(listingId);
    setError(null);
    
    try {
      let result;
      switch (action) {
        case "approve":
          result = await approveFoodListing(listingId);
          break;
        case "reject":
          result = await rejectFoodListing(listingId, reason);
          break;
        case "delete":
          result = await deleteFoodListingAdmin(listingId);
          break;
        case "complete":
          result = await markListingAsCompleted(listingId);
          break;
        default:
          throw new Error(`Unknown food action: ${action}`);
      }
      
      if (result?.success) {
        // No need to manually reload - real-time will handle it
        console.log(`Food listing ${action}d successfully`);
      } else {
        setError(result?.error || `Failed to ${action} food listing`);
      }
    } catch (err) {
      setError(`Failed to ${action} food listing`);
      console.error(`Food listing action error (${action}):`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: CampaignAction, reason?: string) => {
    if (!isAdmin) return;
    
    setActionLoading(campaignId);
    setError(null);
    
    try {
      let result;
      switch (action) {
        case "approve":
          result = await approveCampaign(campaignId);
          break;
        case "reject":
          result = await rejectCampaign(campaignId, reason);
          break;
        case "delete":
          result = await deleteCampaignAdmin(campaignId);
          break;
        case "complete":
          result = await updateCampaignStatus(campaignId, CAMPAIGN_STATUS.COMPLETED);
          break;
        case "cancel":
          result = await updateCampaignStatus(campaignId, CAMPAIGN_STATUS.CANCELLED);
          break;
        case "activate":
          result = await updateCampaignStatus(campaignId, CAMPAIGN_STATUS.ONGOING);
          break;
        default:
          throw new Error(`Unknown campaign action: ${action}`);
      }
      
      if (result?.success) {
        // No need to manually reload - real-time will handle it
        console.log(`Campaign ${action}d successfully`);
      } else {
        setError(result?.error || `Failed to ${action} campaign`);
      }
    } catch (err) {
      setError(`Failed to ${action} campaign`);
      console.error(`Campaign action error (${action}):`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (userId: string) => setDeleteConfirm(userId);
  const clearError = () => setError(null);

  // Filtering and data calculations
  const getDisplayName = useCallback((user: UserData) => {
    if (user.role === 'receiver') {
      return user.profile?.name || user.email || 'Unknown User';
    }
    return user.profile?.orgName || user.profile?.contactPerson || user.email || 'Unknown Organization';
  }, []);

  const filteredPendingRegistrations = pendingRegistrations.filter(registration => {
    const displayName = getDisplayName(registration).toLowerCase();
    const matchesSearch = 
      displayName.includes(searchTerm.toLowerCase()) ||
      registration.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = userRoleFilter === "all" || registration.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredApprovedUsers = approvedUsers.filter(user => {
    if (user.status === USER_STATUS.PENDING) return false;
    const displayName = getDisplayName(user).toLowerCase();
    const matchesSearch = 
      displayName.includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = userStatusFilter === "all" || 
      (userStatusFilter === "active" && user.status === USER_STATUS.APPROVED) ||
      (userStatusFilter === "suspended" && user.status === USER_STATUS.REJECTED);
    const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const filteredRejectedUsers = rejectedUsers.filter(user => {
    const displayName = getDisplayName(user).toLowerCase();
    const matchesSearch = 
      displayName.includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = userStatusFilter === "all" || userStatusFilter === "rejected";
    const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getUsersToDisplay = () => {
    if (userStatusFilter === "rejected") {
      return filteredRejectedUsers;
    }
    return filteredApprovedUsers.filter(user => user.status !== USER_STATUS.PENDING);
  };

  const getFilteredFoodListings = useCallback(() => {
    let filtered = allFoodListings;
    if (foodStatusFilter !== "all") {
      filtered = filtered.filter(listing => listing.status === foodStatusFilter);
    }
    if (foodCategoryFilter !== "all") {
      filtered = filtered.filter(listing => listing.category === foodCategoryFilter);
    }
    return filtered;
  }, [allFoodListings, foodStatusFilter, foodCategoryFilter]);

  const getFilteredCampaigns = useCallback(() => {
    let filtered = allCampaigns;
    if (campaignStatusFilter !== "all") {
      filtered = filtered.filter(campaign => campaign.status === campaignStatusFilter);
    }
    if (campaignCategoryFilter !== "all") {
      filtered = filtered.filter(campaign => campaign.category === campaignCategoryFilter);
    }
    return filtered;
  }, [allCampaigns, campaignStatusFilter, campaignCategoryFilter]);

  // Count calculations
  const pendingCounts = {
    total: pendingRegistrations.length,
    donors: pendingRegistrations.filter(r => r.role === 'donor').length,
    volunteers: pendingRegistrations.filter(r => r.role === 'volunteer').length,
    receivers: pendingRegistrations.filter(r => r.role === 'receiver').length
  };

  const userCounts = {
    total: approvedUsers.filter(u => u.status !== USER_STATUS.PENDING).length + rejectedUsers.length,
    active: approvedUsers.filter(u => u.status === USER_STATUS.APPROVED).length,
    suspended: approvedUsers.filter(u => u.status === USER_STATUS.REJECTED).length,
    rejected: rejectedUsers.length,
    donors: approvedUsers.filter(u => u.role === 'donor' && u.status !== USER_STATUS.PENDING).length + rejectedUsers.filter(u => u.role === 'donor').length,
    volunteers: approvedUsers.filter(u => u.role === 'volunteer' && u.status !== USER_STATUS.PENDING).length + rejectedUsers.filter(u => u.role === 'volunteer').length,
    receivers: approvedUsers.filter(u => u.role === 'receiver' && u.status !== USER_STATUS.PENDING).length + rejectedUsers.filter(u => u.role === 'receiver').length
  };

  const foodCounts = {
    total: allFoodListings.length,
    pending: allFoodListings.filter(l => l.status === FOOD_STATUS.PENDING).length,
    approved: allFoodListings.filter(l => l.status === FOOD_STATUS.APPROVED).length,
    rejected: allFoodListings.filter(l => l.status === FOOD_STATUS.REJECTED).length,
    completed: allFoodListings.filter(l => l.status === FOOD_STATUS.COMPLETED).length
  };

  const campaignCounts = {
    total: allCampaigns.length,
    pending: allCampaigns.filter(c => c.status === CAMPAIGN_STATUS.PENDING).length,
    ongoing: allCampaigns.filter(c => c.status === CAMPAIGN_STATUS.ONGOING).length,
    completed: allCampaigns.filter(c => c.status === CAMPAIGN_STATUS.COMPLETED).length,
    cancelled: allCampaigns.filter(c => c.status === CAMPAIGN_STATUS.CANCELLED).length
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">Admin privileges are required to access system controls.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            System Controls
          </CardTitle>
          <CardDescription>
            Validate and manage users, campaigns, and food listings across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchAndRefreshBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={loadTabData}
            loading={loading}
          />

          <ErrorDisplay error={error} onDismiss={clearError} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending ({pendingCounts.total})
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users ({userCounts.total})
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Campaigns ({allCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="listings" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Food Listings ({allFoodListings.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="mt-6">
              <div className="mb-4">
                <h3 className="font-medium mb-3">Pending Registrations</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <div className="flex gap-2">
                      {[
                        { value: "all", label: `All (${pendingCounts.total})` },
                        { value: "donor", label: `Donors (${pendingCounts.donors})` },
                        { value: "volunteer", label: `Volunteers (${pendingCounts.volunteers})` },
                        { value: "receiver", label: `Receivers (${pendingCounts.receivers})` }
                      ].map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={userRoleFilter === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUserRoleFilter(value as any)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <LoadingSpinner message="Loading pending registrations..." />
              ) : (
                <div className="space-y-3">
                  {filteredPendingRegistrations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending registrations found.
                    </div>
                  ) : (
                    filteredPendingRegistrations.map((registration) => (
                      <UserCard
                        key={registration.uid}
                        user={registration}
                        onAction={handleRegistrationAction as (userId: string, action: UserAction) => void}
                        onDeleteClick={handleDeleteClick}
                        deleteConfirm={deleteConfirm}
                        actionLoading={actionLoading}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <div className="mb-4">
                <h3 className="font-medium mb-3">User Management</h3>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex gap-2">
                      {[
                        { value: "active", label: `Active (${userCounts.active})` },
                        { value: "suspended", label: `Suspended (${userCounts.suspended})` },
                        { value: "rejected", label: `Rejected (${userCounts.rejected})` }
                      ].map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={userStatusFilter === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUserStatusFilter(value as any)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <div className="flex gap-2">
                      {["all", "donor", "volunteer", "receiver"].map((role) => (
                        <Button
                          key={role}
                          variant={userRoleFilter === role ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUserRoleFilter(role as any)}
                        >
                          {role === "all" ? "All Roles" : role.charAt(0).toUpperCase() + role.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <LoadingSpinner message="Loading users..." />
              ) : (
                <div className="space-y-3">
                  {getUsersToDisplay().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {userStatusFilter === "active" && "No active users found."}
                      {userStatusFilter === "suspended" && "No suspended users found."}
                      {userStatusFilter === "rejected" && "No rejected users found."}
                    </div>
                  ) : (
                    getUsersToDisplay().map((user) => (
                      <UserCard
                        key={user.uid}
                        user={user}
                        isRejectedUser={userStatusFilter === "rejected"}
                        onAction={handleUserAction}
                        onDeleteClick={handleDeleteClick}
                        deleteConfirm={deleteConfirm}
                        actionLoading={actionLoading}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="mt-6">
              <div className="mb-4">
                <h3 className="font-medium mb-3">Campaign Management</h3>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex gap-2">
                      {[
                        { value: "all", label: `All (${campaignCounts.total})` },
                        { value: CAMPAIGN_STATUS.PENDING, label: `Pending (${campaignCounts.pending})` },
                        { value: CAMPAIGN_STATUS.ONGOING, label: `Ongoing (${campaignCounts.ongoing})` },
                        { value: CAMPAIGN_STATUS.COMPLETED, label: `Completed (${campaignCounts.completed})` },
                        { value: CAMPAIGN_STATUS.CANCELLED, label: `Cancelled (${campaignCounts.cancelled})` }
                      ].map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={campaignStatusFilter === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCampaignStatusFilter(value as any)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <div className="flex gap-2">
                      {["all", "Canned Items", "Packaged Food", "Mixed Items"].map((category) => (
                        <Button
                          key={category}
                          variant={campaignCategoryFilter === category ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCampaignCategoryFilter(category as any)}
                        >
                          {category === "all" ? "All Categories" : category}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <LoadingSpinner message="Loading campaigns..." />
              ) : (
                <div className="space-y-4">
                  {getFilteredCampaigns().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No campaigns found matching the current filters.
                    </div>
                  ) : (
                    getFilteredCampaigns().map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onAction={handleCampaignAction}
                        actionLoading={actionLoading}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Listings Tab */}
            <TabsContent value="listings" className="mt-6">
              <div className="mb-4">
                <h3 className="font-medium mb-3">Food Listings Management</h3>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex gap-2">
                      {[
                        { value: "all", label: `All (${foodCounts.total})` },
                        { value: FOOD_STATUS.PENDING, label: `Pending (${foodCounts.pending})` },
                        { value: FOOD_STATUS.APPROVED, label: `Approved (${foodCounts.approved})` },
                        { value: FOOD_STATUS.REJECTED, label: `Rejected (${foodCounts.rejected})` },
                        { value: FOOD_STATUS.COMPLETED, label: `Completed (${foodCounts.completed})` }
                      ].map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={foodStatusFilter === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFoodStatusFilter(value as any)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <div className="flex gap-2">
                      {["all", "Fresh Produce", "Cooked Meals", "Shelf Stable"].map((category) => (
                        <Button
                          key={category}
                          variant={foodCategoryFilter === category ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFoodCategoryFilter(category as any)}
                        >
                          {category === "all" ? "All Categories" : category}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <LoadingSpinner message="Loading food listings..." />
              ) : (
                <div className="space-y-4">
                  {getFilteredFoodListings().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No food listings found matching the current filters.
                    </div>
                  ) : (
                    getFilteredFoodListings().map((listing) => (
                      <FoodCard
                        key={listing.id}
                        listing={listing}
                        onAction={handleFoodListingAction}
                        actionLoading={actionLoading}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}