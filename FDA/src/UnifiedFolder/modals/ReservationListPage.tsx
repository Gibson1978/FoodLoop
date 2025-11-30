// ReservationListPage.tsx - Improved UI with Confirmation Dialog
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  ArrowLeft,
  CheckCircle2,
  Flag,
  Search,
} from 'lucide-react';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { ReportModal } from './ReportModal';
import { reportService } from '../../Firebase/userReport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ReservationUser {
  id: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  quantity?: number;
  reservedAt?: Date;
  registeredAt?: Date;
  status: string;
  userType?: 'receiver' | 'volunteer';
}

interface ReservationListPageProps {
  type: 'food' | 'campaign';
  itemId: string;
  itemName: string;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  onBack: () => void;
}

export function ReservationListPage({
  type,
  itemId,
  itemName,
  currentUser,
  onBack
}: ReservationListPageProps) {
  const [users, setUsers] = useState<ReservationUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ReservationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ReservationUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToComplete, setUserToComplete] = useState<ReservationUser | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (itemId) {
      loadUsers();
    }
  }, [itemId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.userName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (type === 'food') {
        const { getFoodReservationsByListing } = await import('../../Firebase/reservationService');
        const result = await getFoodReservationsByListing(itemId);
        
        if (result.success && result.data) {
          setUsers(result.data.map(reservation => ({
            id: reservation.id!,
            userName: reservation.userName,
            userEmail: reservation.userEmail,
            userPhone: reservation.userPhone,
            quantity: reservation.quantity,
            reservedAt: reservation.reservedAt,
            status: reservation.status,
            userType: reservation.userType
          })));
        } else {
          toast.error(result.error || 'Failed to load reservations');
        }
      } else {
        const { getCampaignRegistrationsByCampaign } = await import('../../Firebase/reservationService');
        const result = await getCampaignRegistrationsByCampaign(itemId);
        
        if (result.success && result.data) {
          setUsers(result.data.map(registration => ({
            id: registration.id!,
            userName: registration.userName,
            userEmail: registration.userEmail,
            userPhone: registration.userPhone,
            registeredAt: registration.registeredAt,
            status: registration.status
          })));
        } else {
          toast.error(result.error || 'Failed to load registrations');
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteClick = (user: ReservationUser) => {
    setUserToComplete(user);
    setShowConfirmDialog(true);
  };

  const handleConfirmComplete = async () => {
    if (!userToComplete) return;

    setCompleting(true);
    try {
      if (type === 'food') {
        const { completeFoodReservation } = await import('../../Firebase/reservationService');
        const result = await completeFoodReservation(userToComplete.id);
        
        if (result.success) {
          toast.success('Reservation marked as completed');
          loadUsers();
        } else {
          toast.error(result.error || 'Failed to complete reservation');
        }
      } else {
        const { completeCampaignRegistration } = await import('../../Firebase/reservationService');
        const result = await completeCampaignRegistration(userToComplete.id);
        
        if (result.success) {
          toast.success('Registration marked as attended');
          loadUsers();
        } else {
          toast.error(result.error || 'Failed to complete registration');
        }
      }
    } catch (error) {
      console.error('Error completing:', error);
      toast.error('Failed to complete');
    } finally {
      setCompleting(false);
      setShowConfirmDialog(false);
      setUserToComplete(null);
    }
  };

  const handleCancelComplete = () => {
    setShowConfirmDialog(false);
    setUserToComplete(null);
  };

  const handleReport = (user: ReservationUser) => {
    setSelectedUser(user);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reportData: any) => {
    try {
      const reportPayload = {
        reportType: reportData.reportType,
        targetId: reportData.targetId,
        targetName: reportData.targetName,
        reportedUser: reportData.reportedUser,
        reporterUser: currentUser,
        reason: reportData.reason,
        description: reportData.description,
        severity: reportData.severity || 'medium',
        evidenceUrls: reportData.evidenceUrls || [],
        timestamp: new Date().toISOString()
      };

      await reportService.submitReport(reportPayload);
      
      toast.success('Report submitted successfully');
      setShowReportModal(false);
      setSelectedUser(null);
      
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report. Please try again.');
    }
  };

  const handleReportClose = () => {
    setShowReportModal(false);
    setSelectedUser(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
      case 'attended':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'registered':
        return 'Registered';
      case 'attended':
        return 'Attended';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getUserTypeColor = (userType?: string) => {
    if (type === 'food') {
      return userType === 'volunteer' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200';
    }
    return 'bg-blue-50 border-blue-200'; // Campaign receivers
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center p-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2 mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {type === 'food' ? 'Food Reservations' : 'Campaign Registrations'}
            </h1>
            <p className="text-sm text-gray-600 truncate">{itemName}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name..."
            className="pl-10 pr-4 py-2 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* User List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No users found' : `No ${type === 'food' ? 'reservations' : 'registrations'} yet`}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card 
                key={user.id} 
                className={`border-2 transition-all hover:shadow-md ${getUserTypeColor(user.userType)}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    {/* User Info - Compact layout */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {user.userName}
                        </span>
                        <Badge className={`text-xs ${getStatusColor(user.status)}`}>
                          {getStatusText(user.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        {user.userEmail && (
                          <span className="truncate max-w-[120px]">
                            {user.userEmail}
                          </span>
                        )}
                        
                        {user.quantity && (
                          <span>
                            {user.quantity} {type === 'food' ? 'units' : 'spots'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Only show complete button for donor/organizer when status is confirmed/registered */}
                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                      {/* Complete Button - Only show for donor/organizer to mark as completed/attended */}
                      {((type === 'food' && user.status === 'confirmed') || 
                        (type === 'campaign' && user.status === 'registered')) && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteClick(user)}
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                          title={`Mark as ${type === 'food' ? 'completed' : 'attended'}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Report Button - Always available */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReport(user)}
                        className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                        title="Report user"
                      >
                        <Flag className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Confirm {type === 'food' ? 'Completion' : 'Attendance'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark{' '}
              <span className="font-semibold text-gray-900">{userToComplete?.userName}</span>'s{' '}
              {type === 'food' ? 'reservation as completed?' : 'registration as attended?'}
              <br />
              <span className="text-xs text-gray-500 mt-1 block">
                This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelComplete}
              disabled={completing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={completing}
              className={`flex-1 ${
                type === 'food' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {completing ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {type === 'food' ? 'Complete Reservation' : 'Mark as Attended'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      {showReportModal && selectedUser && (
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reportType="user"
          targetId={selectedUser.id}
          targetName={selectedUser.userName}
          reportedUser={{
            id: selectedUser.id,
            name: selectedUser.userName,
            email: selectedUser.userEmail || '',
            type: type === 'food' ? (selectedUser.userType || 'receiver') : 'receiver'
          }}
          onClose={handleReportClose}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}