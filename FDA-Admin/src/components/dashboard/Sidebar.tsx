// FDA-Admin/src/components/dashboard/Sidebar.tsx
import { useState, useEffect, useCallback, useRef } from 'react'; 
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  BarChart3,
  User,
  Bot,
  Flag,
  Settings,
  LogOut
} from "lucide-react";
import { type Unsubscribe } from 'firebase/firestore'; 

// --- Logo and Fallback Imports ---
import NourishNowLogoSrc from '../Images/NourishNowLogo.png'; 
import { ImageWithFallback } from '../Images/ImageWithFallback'; 
import PlaceholderLogoSrc from '../Images/NourishNowLogo.png'; 

// --- Auth Imports (USER PENDING & ADMIN PROFILE) ---
import { 
  auth, 
  subscribeToAdminProfile, 
  subscribeToPendingRegistrations, 
  type UserData
} from "../../Firebase/auth"; 

// --- Report Service Import ---
import { subscribeToPendingReportsCount } from "../../Firebase/reportAdmin"; 

// --- Food & Campaign Imports (for System Pending Count) ---
import { getPendingFoodListings } from '../../Firebase/foodAdmin'; 
import { getPendingCampaigns } from '../../Firebase/campaignAdmin'; 


interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  const [adminName, setAdminName] = useState("Alex Johnson"); 
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [systemCount, setSystemCount] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserData | null>(null);

  // Refs for unsubscribe functions
  const unsubscribeRefs = useRef<{
    profile?: Unsubscribe;
    reports?: Unsubscribe;
    
    // System aggregation listeners
    systemUsers?: Unsubscribe; 
    systemFood?: Unsubscribe;
    systemCampaigns?: Unsubscribe;
  }>({});

  // Unified Error Handler
  const handleError = useCallback((name: string, error: Error) => {
    console.error(`Sidebar listener error [${name}]:`, error);
  }, []);

  // 1. Admin Profile Real-time Listener (READ ADMIN NAME)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    unsubscribeRefs.current.profile = subscribeToAdminProfile(
      user.uid,
      (data) => {
        if (data) {
          const name = data.profile?.name || data.profile?.orgName || data.email?.split('@')[0] || "Admin User";
          setAdminName(name);
          setUserProfile(data);
        }
      },
      (error: any) => handleError('Profile', error)
    );

    return () => {
      if (unsubscribeRefs.current.profile) {
        unsubscribeRefs.current.profile();
      }
    };
  }, [handleError]);


  // 2. Report Count Listener Setup (REMOVED ACTIVE TAB CLEARING)
  useEffect(() => {
    // Setup subscription if listener isn't already active
    if (!unsubscribeRefs.current.reports) {
      unsubscribeRefs.current.reports = subscribeToPendingReportsCount(
        (count) => setReportCount(count),
        (error: any) => handleError('Reports', error)
      );
    }
    
    // Cleanup reports listener on unmount
    return () => {
        if (unsubscribeRefs.current.reports) {
            unsubscribeRefs.current.reports();
            unsubscribeRefs.current.reports = undefined;
        }
    };
  }, [handleError]); // Runs once on mount, listener persists regardless of activeTab


  // 3. System Controls Count Listener Setup (Complex Aggregation) (REMOVED ACTIVE TAB CLEARING)
  useEffect(() => {
    // --- Local state aggregation logic ---
    const systemCountsMap = new Map<string, number>();
    
    const updateSystemCount = (source: string, count: number) => {
      systemCountsMap.set(source, count);
      // Sum all current counts in the map
      const newTotal = Array.from(systemCountsMap.values()).reduce((sum, current) => sum + current, 0);
      setSystemCount(newTotal);
    };

    const unsubscribeAllSystem = () => {
        if (unsubscribeRefs.current.systemUsers) unsubscribeRefs.current.systemUsers();
        if (unsubscribeRefs.current.systemFood) unsubscribeRefs.current.systemFood();
        if (unsubscribeRefs.current.systemCampaigns) unsubscribeRefs.current.systemCampaigns();
        unsubscribeRefs.current.systemUsers = undefined;
        unsubscribeRefs.current.systemFood = undefined;
        unsubscribeRefs.current.systemCampaigns = undefined;
    };

    // Setup listeners if they are not already active
    
    // A) Pending Users (using subscribeToPendingRegistrations)
    if (!unsubscribeRefs.current.systemUsers) {
      unsubscribeRefs.current.systemUsers = subscribeToPendingRegistrations(
          (users) => updateSystemCount('users', users.length),
          (error: any) => handleError('SystemUsers', error)
      );
    }

    // B) Pending Food Listings (using getPendingFoodListings)
    if (!unsubscribeRefs.current.systemFood) {
      unsubscribeRefs.current.systemFood = getPendingFoodListings(
          (listings) => updateSystemCount('food', listings.length),
          (error: any) => handleError('SystemFood', error)
      );
    }
    
    // C) Pending Campaigns (using getPendingCampaigns)
    if (!unsubscribeRefs.current.systemCampaigns) {
      unsubscribeRefs.current.systemCampaigns = getPendingCampaigns(
          (campaigns) => updateSystemCount('campaigns', campaigns.length),
          (error: any) => handleError('SystemCampaigns', error)
      );
    }
    
    // Cleanup system listeners on unmount
    return () => {
        // Ensure all system listeners are cleaned up when the component unmounts
        unsubscribeAllSystem();
    };
  }, [handleError]); // Dependency array changed to run once on mount


  // Custom Logo Component Setup
  const LogoComponent = () => (
    <div className="w-20 h-20 relative flex items-center justify-center">
      <ImageWithFallback 
        src={NourishNowLogoSrc} 
        fallbackSrc={PlaceholderLogoSrc}
        alt="NourishNow Logo" 
        className="w-full h-full object-contain" 
        style={{ 
          transform: 'scale(1.5) translateY(-0.55rem)', 
          transformOrigin: 'center' 
        }} 
        wrapperClassName="w-full h-full" 
      />
    </div>
  );

  // Derive menu items based on dynamic count states
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Overview & Stats"
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Account Settings"
    },
    {
      id: "chatbot",
      label: "AI Assistant",
      icon: Bot,
      description: "Data Insights"
    },
    {
      id: "reports",
      label: "Reports",
      icon: Flag,
      description: "User Complaints",
      // Badge logic remains the same (show if count > 0)
      badge: reportCount && reportCount > 0 ? reportCount.toString() : null
    },
    {
      id: "system",
      label: "System Controls",
      icon: Settings,
      description: "Manage Platform",
      // Badge logic remains the same (show if count > 0)
      badge: systemCount && systemCount > 0 ? systemCount.toString() : null 
    }
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <LogoComponent/> 
          <div>
            <h1 className="font-semibold text-foreground font-rounded text-2xl">NoursihNow</h1>
            <p className="text-sm text-muted-foreground">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/api/placeholder/100/100" alt="Admin" />
            <AvatarFallback className="bg-primary text-white">
              {adminName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{adminName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-3 ${
                activeTab === item.id 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-foreground hover:bg-sidebar-accent"
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="text-xs h-5 w-5 p-0 flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-xs ${
                    activeTab === item.id ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="outline"
          className="w-full justify-start text-foreground hover:bg-sidebar-accent"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}