import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { 
  Bell, 
  Package, 
  Users, 
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  XOctagon, // New Icon for Cancellation
  RefreshCw // New Icon for System/Admin Alert
} from "lucide-react";
// 🚨 FIX 1: Import the real AppNotification interface from the service file
import { type AppNotification } from "../../Firebase/notificationFirebase"; 

// 🚨 FIX 2: Set the component's internal Notification type to the service type
interface Notification extends AppNotification {}

interface NotificationDialogProps {
  open: boolean;
  onClose: () => void;
  notification?: Notification; // Now correctly uses the AppNotification structure
}

// 🚨 FIX 3: Update Color Helper to use Server-Side Types
const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'listing_status': 
    case 'reservation': return 'bg-green-100'; // Food/Transaction
    case 'campaign_status': 
    case 'registration_status': return 'bg-orange-100'; // Campaign/Registration
    case 'report_response': return 'bg-purple-100'; // Report Response
    case 'cancellation': return 'bg-red-100'; // Cancellation
    case 'admin_alert': return 'bg-blue-100'; // Generic Admin Alert
    default: return 'bg-gray-100';
  }
};

// 🚨 FIX 4: Update Icon Helper to use Server-Side Types
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'listing_status': 
    case 'reservation': return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />;
    case 'campaign_status': 
    case 'registration_status': return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
    case 'report_response': return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
    case 'cancellation': return <XOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />;
    case 'admin_alert': return <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
    default: return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
  }
};

export function NotificationDialog({ open, onClose, notification }: NotificationDialogProps) {
  // If a specific notification is passed, show its details directly
  if (notification) {
    // Format timestamp dynamically as it is now a Date object
    const formattedTimestamp = notification.timestamp instanceof Date 
        ? notification.timestamp.toLocaleString() 
        : notification.timestamp; 
        
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] p-0 rounded-xl sm:rounded-2xl">
          <DialogHeader className="p-4 sm:p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-bold">Notification Details</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="px-4 sm:px-6 pb-4 sm:pb-6 max-h-[70vh]">
            <Card className="border-0 shadow-none bg-muted/30 rounded-lg sm:rounded-xl">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-base font-bold">{notification.title}</CardTitle>
                    <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground">{formattedTimestamp}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{notification.fullDetails || notification.message}</p>
                {notification.relatedEntityId && (
                    <div className="mt-3 text-xs text-muted-foreground">
                        <span className="font-medium">{notification.relatedEntityType?.toUpperCase()}:</span> {notification.relatedEntityId}
                    </div>
                )}
              </CardContent>
            </Card>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback for list view when used incorrectly (this component should only handle the detail)
  return null; 
}