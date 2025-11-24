import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../UnifiedFolder/ui/dialog';
import { Button } from '../../../UnifiedFolder/ui/button';
import { Textarea } from '../../../UnifiedFolder/ui/textarea';
import { Label } from '../../../UnifiedFolder/ui/label';
import type { Campaign } from '../../../Firebase/campaignUsers';

interface CancelCampaignDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (campaignId: string, reason: string) => void;
}

export function CancelCampaignDialog({
  campaign,
  open,
  onOpenChange,
  onConfirm,
}: CancelCampaignDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!campaign?.id || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(campaign.id, reason.trim());
      setReason(''); // Reset form
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason(''); // Reset when dialog closes
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Campaign</DialogTitle>
          <DialogDescription>
            Please let us know why you're cancelling "{campaign?.title}". This helps us improve our service.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cancellation-reason" className="text-sm font-medium">
              Reason for cancellation *
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="e.g., Change of plans, insufficient volunteers, weather conditions, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
            />
            <p className="text-xs text-gray-500">
              This information will be stored for analytics and platform improvement.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Keep Campaign
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}