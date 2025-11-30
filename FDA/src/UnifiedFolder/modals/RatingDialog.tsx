// RatingDialog.tsx
import { useState, forwardRef } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Star, CheckCircle2 } from 'lucide-react';

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'food' | 'campaign';
  itemId: string;
  itemName: string;
  onRated: (rating: number, comment?: string) => void;
  userType: 'volunteer' | 'receiver';
}

export const RatingDialog = forwardRef<HTMLDivElement, RatingDialogProps>(
  ({ open, onOpenChange, type, itemId, itemName, onRated, userType }, ref) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Theme colors based on user type
    const themeConfig = {
      volunteer: {
        button: 'bg-green-600 hover:bg-green-700',
        success: 'bg-green-100 text-green-600',
        text: 'text-green-600'
      },
      receiver: {
        button: 'bg-red-600 hover:bg-red-700',
        success: 'bg-red-100 text-red-600',
        text: 'text-red-600'
      }
    };

    const theme = themeConfig[userType];

    const handleSubmit = async () => {
      if (rating === 0) {
        alert('Please select a rating');
        return;
      }

      setLoading(true);
      try {
        await onRated(rating, comment);
        setShowSuccess(true);
      } catch (error) {
        console.error('Error in rating dialog:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleSuccessClose = () => {
      setShowSuccess(false);
      setRating(0);
      setComment('');
      onOpenChange(false);
    };

    const handleClose = () => {
      if (!loading) {
        setRating(0);
        setComment('');
        onOpenChange(false);
      }
    };

    return (
      <>
        {/* Rating Dialog */}
        <Dialog open={open && !showSuccess} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md" ref={ref}>
            <DialogHeader>
              <DialogTitle>Rate Your Experience</DialogTitle>
              <DialogDescription>
                How was your experience with {itemName}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Star Rating */}
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                    disabled={loading}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Rating Labels */}
              <div className="text-center text-sm text-gray-600">
                {rating === 0 && 'Select your rating'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Optional Comment</label>
                <Textarea
                  placeholder="Share your experience (optional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || rating === 0}
                className={theme.button}
              >
                {loading ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccess} onOpenChange={handleSuccessClose}>
          <DialogContent className="sm:max-w-md" ref={ref}>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 ${theme.success} rounded-full flex items-center justify-center`}>
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </div>
              <DialogTitle className="text-center">Rating Submitted!</DialogTitle>
              <DialogDescription className="text-center">
                Thank you for your feedback on {itemName}. Your rating helps improve the community experience.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex justify-center">
              <Button onClick={handleSuccessClose} className={theme.button}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

RatingDialog.displayName = 'RatingDialog';