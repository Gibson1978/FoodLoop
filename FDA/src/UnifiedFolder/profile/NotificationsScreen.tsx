import { useState } from "react";
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
  Package, 
  Users, 
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { getRoleGradientClasses, getRoleBadgeColor, getRoleBackgroundColor } from "../auth/Rolebased";
import { type UserData } from "../../Firebase/auth";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'food' | 'campaign' | 'system' | 'report';
  timestamp: string;
  read: boolean;
  fullDetails?: string;
}

interface NotificationsScreenProps {
  onBack: () => void;
  userData: UserData;
}

export function NotificationsScreen({ onBack, userData }: NotificationsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
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
      title: 'New Food Available',
      message: 'Fresh vegetables are now available near your location',
      type: 'food',
      timestamp: '3 hours ago',
      read: false,
      fullDetails: 'Green Valley Market has just posted fresh vegetables including lettuce, tomatoes, and bell peppers. These items are located 0.5 miles from your current location and are available for pickup today until 6:00 PM.'
    },
    {
      id: '3',
      title: 'Campaign Update',
      message: 'New volunteers joined your food drive campaign',
      type: 'campaign',
      timestamp: '5 hours ago',
      read: false,
      fullDetails: '3 new volunteers have joined your "Community Food Drive" campaign. Sarah Wilson, Mike Chen, and Lisa Rodriguez are now part of your team. The campaign has reached 85% of its volunteer goal.'
    },
    {
      id: '4',
      title: 'Weekly Food Match',
      message: 'We found 5 new food items that match your preferences',
      type: 'food',
      timestamp: '1 day ago',
      read: true,
      fullDetails: 'Based on your dietary preferences and location, we found 5 new food items: organic apples, whole grain bread, almond milk, fresh salmon, and mixed greens. All items are within 2 miles of your location.'
    },
    {
      id: '5',
      title: 'System Maintenance',
      message: 'Scheduled maintenance completed successfully',
      type: 'system',
      timestamp: '1 day ago',
      read: true,
      fullDetails: 'The scheduled system maintenance has been completed successfully. All features are now fully operational. During the maintenance, we improved the food matching algorithm and enhanced security features.'
    },
    {
      id: '6',
      title: 'Report Response',
      message: 'Your report has been reviewed and resolved',
      type: 'report',
      timestamp: '2 days ago',
      read: true,
      fullDetails: 'Thank you for reporting the inappropriate behavior. Our moderation team has reviewed your report and taken appropriate action. The user has been warned and their account is now under review.'
    }
  ]);

  // Extract role from UserData
  const userRoleString = userData.role;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'food': return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'campaign': return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
      case 'system': return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'report': return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
      default: return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'food': return 'bg-blue-100';
      case 'campaign': return 'bg-orange-100';
      case 'system': return 'bg-blue-100';
      case 'report': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  };

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

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || notification.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`${getRoleBackgroundColor(userRoleString)} min-h-screen pb-20`}>
      {/* Header - Following ProfileTab structure with role-based gradient */}
      <div className="overflow-hidden">
        <div className={`${getRoleGradientClasses(userRoleString)} px-4 sm:px-6 pt-6 pb-8 flex items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg`}>
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
                  <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
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
        {/* Search and Filter Card */}
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
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1 h-10 text-sm rounded-lg">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All Notifications</SelectItem>
                  <SelectItem value="food" className="text-sm">Food Items</SelectItem>
                  <SelectItem value="campaign" className="text-sm">Campaigns</SelectItem>
                  <SelectItem value="system" className="text-sm">System Updates</SelectItem>
                  <SelectItem value="report" className="text-sm">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
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
                        <span className="text-xs sm:text-sm text-gray-500">{notification.timestamp}</span>
                      </div>
                      <Badge className={`text-xs font-medium px-2 py-1 ${getRoleBadgeColor(notification.type)}`}>
                        {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {filteredNotifications.length === 0 && (
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
      </div>

      {/* Notification Detail Dialog */}
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