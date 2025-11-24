import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Bell,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";

export function ProfileTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "Alex Johnson",
    email: "alex.johnson@foodredist.org",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    joinDate: "January 2024"
  });

  const notifications = [
    {
      id: 1,
      type: "success",
      title: "Donation Received",
      message: "Fresh Market donated 25kg of produce",
      time: "5 minutes ago",
      read: false
    },
    {
      id: 2,
      type: "info",
      title: "New NGO Registration",
      message: "Helping Hands NGO submitted verification documents",
      time: "1 hour ago",
      read: false
    },
    {
      id: 3,
      type: "warning",
      title: "Low Inventory Alert",
      message: "Westside location running low on storage space",
      time: "3 hours ago",
      read: true
    },
    {
      id: 4,
      type: "info",
      title: "System Update",
      message: "Platform maintenance scheduled for tonight",
      time: "1 day ago",
      read: true
    }
  ];

  const messages = [
    {
      id: 1,
      sender: "City Food Bank",
      subject: "Pickup Schedule Change",
      preview: "We need to reschedule tomorrow's pickup to 2 PM...",
      time: "30 minutes ago",
      read: false
    },
    {
      id: 2,
      sender: "Fresh Market",
      subject: "Weekly Donation Report",
      preview: "Here's our weekly donation summary and upcoming...",
      time: "2 hours ago",
      read: false
    },
    {
      id: 3,
      sender: "System Admin",
      subject: "Monthly Analytics Ready",
      preview: "Your monthly platform analytics report is ready...",
      time: "1 day ago",
      read: true
    }
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Save profile data
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Manage your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/api/placeholder/150/150" alt="Profile" />
                <AvatarFallback className="bg-primary text-white text-lg">AJ</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{profileData.name}</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-700 mt-1">
                  Platform Administrator
                </Badge>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Photo
                </Button>
              </div>
            </div>

            <Separator />

            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Member Since</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{profileData.joinDate}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Notifications
              <Badge variant="destructive" className="text-xs">
                {notifications.filter(n => !n.read).length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Recent platform alerts and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    !notification.read ? "bg-accent/10" : "bg-muted/30"
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <span className="text-xs text-muted-foreground">{notification.time}</span>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Inbox */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Messages Inbox
            <Badge variant="destructive" className="text-xs">
              {messages.filter(m => !m.read).length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Direct messages from NGOs and donors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/5 transition-colors ${
                  !message.read ? "border-primary/20 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{message.sender}</h4>
                    <span className="text-xs text-muted-foreground">{message.time}</span>
                  </div>
                  <h5 className="text-sm font-medium mb-1">{message.subject}</h5>
                  <p className="text-sm text-muted-foreground">{message.preview}</p>
                </div>
                {!message.read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}