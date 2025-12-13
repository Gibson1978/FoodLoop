// FDA/src/NotificationsScreen.tsx (FINAL AND CORRECTED VERSION)
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { NotificationDialog } from "./NotificationDialog";
import { 
  ArrowLeft, 
  Bell, 
  Search,
  Filter,
  Package, // Food
  Users, // Campaigns
  AlertCircle, // Reports
  Clock,
  CheckCircle2,
  RefreshCw, // For loading
  XOctagon // For cancellation
} from "lucide-react";
// Assuming getRole... helpers are available
import { getRoleGradientClasses, getRoleBackgroundColor } from "../auth/Rolebased"; // ⬅️ KEEP ONLY ROLE STYLES
import { type UserData } from "../../Firebase/auth";
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification // Use the interface from the service
} from "../../Firebase/notificationFirebase";

// Set component's internal Notification type to be the service type
type Notification = AppNotification; 

interface NotificationsScreenProps {
  onBack: () => void;
  userData: UserData;
  initialView?: string; 
  initialId?: string;
}

// 🚨 NEW HELPER FUNCTION: Maps Notification Type to CSS Classes (Badge/Color)
const getNotificationBadgeStyle = (type: Notification['type']): string => {
    switch (type) {
        case 'listing_status':
        case 'reservation': return 'bg-green-600 hover:bg-green-700 text-white';
        case 'campaign_status':
        case 'registration_status': return 'bg-orange-600 hover:bg-orange-700 text-white';
        case 'cancellation': return 'bg-red-600 hover:bg-red-700 text-white';
        case 'report_response': return 'bg-purple-600 hover:bg-purple-700 text-white';
        case 'admin_alert': return 'bg-blue-600 hover:bg-blue-700 text-white';
        default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
};


export function NotificationsScreen({ onBack, userData, initialView, initialId }: NotificationsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // ... (1. Setup REAL-TIME LISTENER - UNCHANGED)
  useEffect(() => {
    setIsLoading(true);
    setListenerError(null);

    const unsubscribe = subscribeToUserNotifications(
      (newNotifications) => {
        setNotifications(newNotifications);
        setIsLoading(false);
      },
      (error) => {
        setListenerError(error.message);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userData.uid]);


  // ... (2. Handle Initial Deep Link - UNCHANGED)
  useEffect(() => {
    if (!isLoading && initialId && initialView === 'reportDetail' && notifications.length > 0) {
      const targetNotification = notifications.find(n => 
        n.relatedEntityId === initialId && n.relatedEntityType === 'reports'
      );
      
      if (targetNotification) {
        handleNotificationClick(targetNotification);
      }
    }
  }, [isLoading, initialId, initialView, notifications]);

  // 3. Icon and Color Mapping (UNCHANGED)
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'listing_status': 
      case 'reservation': return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />;
      case 'campaign_status': 
      case 'registration_status': return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
      case 'cancellation': 
        return <XOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />;
      case 'report_response': 
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
      case 'admin_alert': 
      default: 
        return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'listing_status':
      case 'reservation': return 'bg-green-100';
      case 'campaign_status': 
      case 'registration_status': return 'bg-orange-100';
      case 'cancellation': return 'bg-red-100';
      case 'report_response': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  };


  // 4. Action Handlers (UNCHANGED)
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      setListenerError("Failed to mark all as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // 5. Filtering Logic (UNCHANGED)
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || notification.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    // 🚨 FIX 1: Using userData.role for background styling
    <div className={`${getRoleBackgroundColor(userData.role)} min-h-screen pb-20`}>
      {/* Header */}
      <div className="overflow-hidden">
        {/* 🚨 FIX 2: Using userData.role for gradient styling */}
        <div className={`${getRoleGradientClasses(userData.role)} px-4 sm:px-6 pt-6 pb-8 flex items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onBack}
                className="text-white hover:!bg-white/20 p-2 sm:p-3"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>

              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center">
                  {isLoading ? (
                    <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-spin" />
                  ) : (
                    <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  )}
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Notifications</h1>
                {unreadCount > 0 ? (
                  <p className="text-white text-sm sm:text-base">{unreadCount} unread notifications</p>
                ) : (
                  <p className="text-white text-sm sm:text-base">You're all caught up!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 px-3 sm:px-4 mt-4 sm:mt-6 space-y-3 sm:space-y-4">
        
        {/* Search and Filter Card (UNCHANGED) */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm rounded-lg"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Select value={filterType} onValueChange={setFilterType} disabled={isLoading}>
                <SelectTrigger className="flex-1 h-10 text-sm rounded-lg">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All Notifications</SelectItem>
                  <SelectItem value="listing_status" className="text-sm">Listing Status</SelectItem>
                  <SelectItem value="reservation" className="text-sm">Reservations</SelectItem>
                  <SelectItem value="campaign_status" className="text-sm">Campaign Status</SelectItem>
                  <SelectItem value="cancellation" className="text-sm">Cancellations</SelectItem>
                  <SelectItem value="report_response" className="text-sm">Reports</SelectItem>
                  <SelectItem value="admin_alert" className="text-sm">Admin/System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Mark All Read Button (UNCHANGED) */}
            {unreadCount > 0 && (
                <div className="flex justify-end pt-2">
                    <Button 
                        variant="link" 
                        size="sm" 
                        onClick={handleMarkAllRead} 
                        disabled={isLoading || isMarkingAll}
                        className="text-xs sm:text-sm p-0 h-auto"
                    >
                        {isMarkingAll ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        {isMarkingAll ? 'Marking...' : 'Mark All as Read'}
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Loading/Error States (UNCHANGED) */}
        {listenerError && (
             <Card className="border-red-500 bg-red-50">
                <CardContent className="p-4 text-red-800 text-sm">Error: {listenerError}</CardContent>
            </Card>
        )}
        {isLoading && !listenerError && (
             <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Connecting to real-time data...</p>
            </div>
        )}
        
        {/* Notifications List */}
        {!isLoading && filteredNotifications.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:bg-gray-50 rounded-xl sm:rounded-2xl"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className={`font-medium text-sm sm:text-base truncate pr-2 ${
                            !notification.read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {notification.read && (
                              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm sm:text-base line-clamp-2 mb-3 ${
                          !notification.read ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {/* Assuming timestamp is a Date object or can be formatted */}
                            <span className="text-xs sm:text-sm text-gray-500">
                                {notification.timestamp instanceof Date 
                                    ? notification.timestamp.toLocaleDateString()
                                    : 'Recently'}
                            </span>
                          </div>
                          {/* 🚨 FIX 3: Use the new dedicated badge function */}
                          <Badge className={`text-xs font-medium px-2 py-1 ${getNotificationBadgeStyle(notification.type)}`}>
                            {notification.type.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        )}

        {/* Empty State (UNCHANGED) */}
        {!isLoading && filteredNotifications.length === 0 && (
            <Card className="border-0 shadow-sm rounded-xl sm:rounded-2xl">
              <CardContent className="text-center py-8 sm:py-12">
                <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-gray-600">No notifications found</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery || filterType !== "all" 
                    ? "Try adjusting your search or filter criteria" 
                    : "You're all caught up! Check back later for updates."}
                </p>
              </CardContent>
            </Card>
        )}
      </div>

      {/* Notification Detail Dialog (UNCHANGED) */}
      {selectedNotification && (
        <NotificationDialog 
          open={!!selectedNotification} 
          onClose={() => setSelectedNotification(null)}
          notification={selectedNotification}
        />
      )}
    </div>
  );
}