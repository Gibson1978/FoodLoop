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
  X
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'food' | 'campaign' | 'system' | 'report';
  timestamp: string;
  read: boolean;
  fullDetails?: string;
}

interface NotificationDialogProps {
  open: boolean;
  onClose: () => void;
  notification?: Notification;
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'food': return 'bg-green-100';
    case 'campaign': return 'bg-orange-100';
    case 'system': return 'bg-blue-100';
    case 'report': return 'bg-purple-100';
    default: return 'bg-gray-100';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'food': return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />;
    case 'campaign': return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
    case 'system': return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
    case 'report': return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
    default: return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
  }
};

export function NotificationDialog({ open, onClose, notification }: NotificationDialogProps) {
  // If a specific notification is passed, show its details directly
  if (notification) {
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
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
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
                      <span className="text-xs sm:text-sm text-muted-foreground">{notification.timestamp}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs sm:text-sm leading-relaxed">{notification.fullDetails}</p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Original list view implementation
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Food Item Reserved',
      message: 'Someone has reserved your donated bread loaves',
      type: 'food',
      timestamp: '2 hours ago',
      read: false,
      fullDetails: 'John Doe has reserved your "Fresh Bread Loaves" donation. The pickup is scheduled for today at 3:00 PM at Central Food Bank. You can contact them at john.doe@email.com or (555) 123-4567 if you need to coordinate the pickup.'
    },
    {
      id: '2',
      title: 'Campaign Update',
      message: 'New volunteers joined your food drive campaign',
      type: 'campaign',
      timestamp: '5 hours ago',
      read: false,
      fullDetails: '3 new volunteers have joined your "Community Food Drive" campaign. Sarah Wilson, Mike Chen, and Lisa Rodriguez are now part of your team. The campaign has reached 85% of its volunteer goal. You can view their profiles and contact information in the campaign management section.'
    },
    {
      id: '3',
      title: 'System Maintenance',
      message: 'Scheduled maintenance completed successfully',
      type: 'system',
      timestamp: '1 day ago',
      read: true,
      fullDetails: 'The scheduled system maintenance has been completed successfully. All features are now fully operational. During the maintenance, we improved the food matching algorithm, enhanced security features, and fixed several minor bugs reported by users. Thank you for your patience.'
    },
    {
      id: '4',
      title: 'Report Response',
      message: 'Your report has been reviewed and resolved',
      type: 'report',
      timestamp: '2 days ago',
      read: true,
      fullDetails: 'Thank you for reporting the inappropriate behavior. Our moderation team has reviewed your report and taken appropriate action. The user has been warned and their account is now under review. We appreciate your help in keeping our community safe and respectful for everyone.'
    }
  ]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const handleBackFromDetail = () => {
    setSelectedNotification(null);
  };

  const handleClose = () => {
    setSelectedNotification(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] p-0 rounded-xl sm:rounded-2xl">
        {selectedNotification ? (
          // Notification Detail View
          <>
            <DialogHeader className="p-4 sm:p-6 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base sm:text-lg">Notification Details</DialogTitle>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackFromDetail}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs"
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <Card className="border-0 shadow-none bg-muted/30 rounded-lg sm:rounded-xl">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getNotificationColor(selectedNotification.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      {getNotificationIcon(selectedNotification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base">{selectedNotification.title}</CardTitle>
                      <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-muted-foreground">{selectedNotification.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs sm:text-sm leading-relaxed">{selectedNotification.fullDetails}</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          // Notifications List View
          <>
            <DialogHeader className="p-4 sm:p-6 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base sm:text-lg">Notifications</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-2 sm:space-y-3">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer rounded-lg sm:rounded-xl" 
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-xs sm:text-sm truncate ${!notification.read ? 'font-medium' : ''}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-1 sm:space-x-2 ml-1 sm:ml-2">
                              {!notification.read && (
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                              )}
                              {notification.read && (
                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate mb-1 sm:mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">{notification.timestamp}</span>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {notifications.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <Bell className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-2 sm:mb-4" />
                    <h3 className="text-sm sm:text-base mb-1 sm:mb-2">No notifications</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">You're all caught up! Check back later for updates.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}