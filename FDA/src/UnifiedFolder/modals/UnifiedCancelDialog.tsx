// UnifiedCancelDialog.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../UnifiedFolder/ui/dialog';
import { Button } from '../../UnifiedFolder/ui/button';
import { Textarea } from '../../UnifiedFolder/ui/textarea';
import { Label } from '../../UnifiedFolder/ui/label';
import { RadioGroup, RadioGroupItem } from '../../UnifiedFolder/ui/radio-group';
import { Badge } from '../../UnifiedFolder/ui/badge';
import { getCurrentUserData } from '../../Firebase/auth';

interface UnifiedCancelDialogProps {
  item: any | null;
  itemType: 'food' | 'campaign';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (itemId: string, reason: string) => void;
}

const CANCELLATION_REASONS = {
  food: [
    "Food is no longer available",
    "Food has spoiled or expired",
    "Change of plans",
    "Found another recipient",
    "Other"
  ],
  campaign: [
    "Insufficient volunteers",
    "Weather conditions",
    "Venue issues",
    "Change of schedule",
    "Personal reasons",
    "Other"
  ]
};

export function UnifiedCancelDialog({
  item,
  itemType,
  open,
  onOpenChange,
  onConfirm,
}: UnifiedCancelDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  // Get user role when dialog opens
  useState(() => {
    const fetchUserRole = async () => {
      const userData = await getCurrentUserData();
      setUserRole(userData?.role || '');
    };
    
    if (open) {
      fetchUserRole();
    }
  });

  const getItemTitle = () => {
    return item?.title || 'Unknown Item';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Available';
      case 'ongoing':
        return 'Active';
      case 'pending':
        return 'Pending Approval';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleSubmit = async () => {
    if (!item?.id || !selectedReason) return;

    setIsSubmitting(true);
    try {
      const finalReason = selectedReason === 'Other' ? customReason : selectedReason;
      await onConfirm(item.id, finalReason);
      setSelectedReason('');
      setCustomReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReason('');
      setCustomReason('');
    }
    onOpenChange(open);
  };

  const reasons = CANCELLATION_REASONS[itemType];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cancel {itemType === 'food' ? 'Food Listing' : 'Campaign'}
            {item?.status && (
              <Badge variant="secondary" className={getStatusColor(item.status)}>
                {getStatusText(item.status)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {itemType === 'food' 
              ? `Please let us know why you're cancelling "${getItemTitle()}". This helps reduce food waste.`
              : `Please let us know why you're cancelling "${getItemTitle()}". This helps us improve our service.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">
              Reason for cancellation *
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={`reason-${reason}`} />
                  <Label htmlFor={`reason-${reason}`} className="text-sm font-normal">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {selectedReason === 'Other' && (
              <div className="mt-2">
                <Textarea
                  placeholder="Please specify your reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              {itemType === 'food' 
                ? 'This information helps us track food availability and reduce waste.'
                : 'This information will be stored for analytics and platform improvement.'
              }
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Keep {itemType === 'food' ? 'Listing' : 'Campaign'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedReason || (selectedReason === 'Other' && !customReason.trim()) || isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : `Confirm Cancellation`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}