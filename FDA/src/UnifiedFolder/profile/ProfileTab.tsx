// Updated ProfileTab component
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { 
  Bell, 
  AlertTriangle, 
  Settings, 
  LogOut,
  ChevronRight,
  Camera,
} from "lucide-react";
import { NotificationsScreen } from "./NotificationsScreen";
import { ReportIssueScreen } from "./ReportIssueScreen";
import { SettingsScreen } from "./SettingsScreen";
import { getCurrentUserData, type UserData, logoutUser } from "../../Firebase/auth"; // Adjust path
import { getRoleBadgeColor, getRoleGradientClasses, getRoleAccentColor, getRoleBackgroundColor } from "../auth/Rolebased";

interface ProfileProps {
  onLogout: () => void;
}

export function ProfileTab({ onLogout }: ProfileProps) {
  const [activeScreen, setActiveScreen] = useState<"main" | "notifications" | "settings" | "report">("main");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUserData();
      setUserData(user);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load user data</p>
          <Button onClick={handleLogout} className="h-9 sm:h-10 text-xs sm:text-sm">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const { role, profile, email } = userData;
  const accentColor = getRoleAccentColor(role);
  
  // Get display name based on role
  const getDisplayName = () => {
    if (role === 'receiver') {
      return profile?.name || email || 'User';
    }
    return profile?.orgName || profile?.contactPerson || email || 'Organization';
  };

  const displayName = getDisplayName();

  const handleAvatarChange = () => {
    console.log("Upload new avatar");
  };

  // Render different screens
  if (activeScreen === "notifications") {
    return <NotificationsScreen onBack={() => setActiveScreen("main")} userData={userData} />;
  }

  if (activeScreen === "settings") {
    return (
      <SettingsScreen 
        userData={userData} 
        onBack={() => setActiveScreen("main")}
        onProfileUpdate={loadUserData} // Refresh data after update
      />
    );
  }

  if (activeScreen === "report") {
    return <ReportIssueScreen onBack={() => setActiveScreen("main")}/>;
  }

  // Main profile screen
  return (
    <div className={`${getRoleBackgroundColor(role)} min-h-screen  pb-20`}>
      {/* Header */}
      <div className={`${getRoleGradientClasses(role)} px-4 sm:px-6 pt-6 pb-8 flex items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg`}>
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Avatar + Camera - Fixed positioning */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 shadow-xl bg-white">
              <AvatarImage src="" alt={displayName} />
              <AvatarFallback className={`text-${accentColor}-600 text-lg sm:text-xl font-bold`}>
                {displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Camera button positioned at bottom-right corner */}
            <button
              onClick={handleAvatarChange}
              className={`absolute bottom-0 left-10 w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-${accentColor}-500 transform translate-x-1 translate-y-1`}
            >
              <Camera className={`text-${accentColor}-600 w-3 h-3 sm:w-4 sm:h-4`} />
            </button>
          </div>

          {/* Name + Role */}
          <div className="flex flex-col justify-center pl-1 sm:pl-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate max-w-[180px] sm:max-w-none">
              {displayName}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
              <Badge className={`${getRoleBadgeColor(role)} border font-medium text-[10px] sm:text-xs`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
              {role !== 'receiver' && profile?.orgType && (
                <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-[10px] sm:text-xs">
                  {profile.orgType}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cards - Fixed vertical centering */}
      <div className="pt-4 px-3 sm:px-4 mt-4 sm:mt-6 space-y-3 sm:space-y-4">
        {/* Notifications Card */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-2xl hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <button 
              onClick={() => setActiveScreen("notifications")}
              className="w-full flex items-center p-3 sm:p-4 hover:bg-muted transition-colors rounded-xl sm:rounded-2xl"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-blue-100 flex-shrink-0">
                  <Bell className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-sm sm:text-lg font-medium truncate">Notifications</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Manage your notifications</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 ml-2" />
            </button>
          </CardContent>
        </Card>

        {/* Report Issues Card */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-2xl hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <button 
              onClick={() => setActiveScreen("report")}
              className="w-full flex items-center p-3 sm:p-4 hover:bg-muted transition-colors rounded-xl sm:rounded-2xl"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-sm sm:text-lg font-medium truncate">Report Issue</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Submit feedback or complaints</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 ml-2" />
            </button>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="shadow-md border-0 rounded-xl sm:rounded-2xl hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <button 
              onClick={() => setActiveScreen("settings")}
              className="w-full flex items-center p-3 sm:p-4 hover:bg-muted transition-colors rounded-xl sm:rounded-2xl"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-sm sm:text-lg font-medium truncate">Settings</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Account and app settings</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 ml-2" />
            </button>
          </CardContent>
        </Card>

        {/* Sign Out Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2 sm:space-x-3 p-3 sm:p-4 h-auto text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors rounded-xl sm:rounded-2xl"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-medium text-sm sm:text-base">Sign Out</span>
        </Button>
      </div>
    </div>  
  );
}