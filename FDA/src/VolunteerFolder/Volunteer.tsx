// Volunteer.tsx - FINAL Version with Deep Linking
import { useState, useEffect } from "react";
import { Home, Search, Plus, MapPin, User, Bell } from "lucide-react"; 
import { Button } from "../UnifiedFolder/ui/button";
import { Tabs, TabsContent } from "../UnifiedFolder/ui/tabs";

import { DashboardTab } from "./components/DashboardTab";
import { FoodBrowseScreen } from "../UnifiedFolder/modals/FoodBrowseScreen"; 
import { FoodDetailScreen } from "../UnifiedFolder/modals/FoodDetailScreen";
import { CampaignsTab } from "./components/campaigntabs/CampaignTabs";
import { CreateCampaignTab } from "./components/campaigntabs/CreateCampaignTab";
import { ProfileTab } from "../UnifiedFolder/profile/ProfileTab";
import { ReportModal } from "../UnifiedFolder/modals/ReportModal";
import { ReservationListPage } from "../UnifiedFolder/modals/ReservationListPage";
import { NotificationsScreen } from "../UnifiedFolder/profile/NotificationsScreen"; 
import type { UserData } from "../Firebase/auth";
import { reportService } from "../Firebase/userReport";
import { registerNavigator } from "../FCMSetup"; 

interface VolunteerProps {
  onLogout: () => void;
  userData: UserData; 
}

const NOTIFICATIONS_SCREEN_NAME = 'notifications';

export default function Volunteer({ onLogout, userData }: VolunteerProps) {
  const [activeTab, setActiveTab] = useState("home");

  // NEW: State for current detail/modal view beyond the main tabs
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [viewParams, setViewParams] = useState<Record<string, any>>({});

  // Detail/Map/Report States
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  // RENAMED for consistency with Donor: This holds the ID passed to CampaignsTab for auto-open
  const [autoOpenCampaignId, setAutoOpenCampaignId] = useState<string | null>(null); 
  
  const [mapLocation, setMapLocation] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{
    type: "food" | "volunteer" | "campaign";
    targetId: string;
    targetName: string;
    reportedUser?: any;
  } | null>(null);

  // Add reservation list page state
  const [reservationListPage, setReservationListPage] = useState<{
    type: 'food' | 'campaign';
    itemId: string;
    itemName: string;
  } | null>(null);

  // Handlers
  const handleSelectFood = (foodId: string) => setSelectedFoodId(foodId);

  const handleReport = (
    type: "food" | "campaign",
    targetId: string,
    targetName: string,
    reportedUser?: any
  ) => {
    setReportModal({ type, targetId, targetName, reportedUser });
  };

  const handleReportSubmit = async (reportData: any) => {
    try {
      const currentUser = {
        id: userData.uid, 
        name: userData.profile?.name || userData.profile?.contactPerson || 'Unknown User', 
        email: userData.email
      };

      const reportPayload = {
        reportType: reportData.reportType,
        targetId: reportData.targetId,
        targetName: reportData.targetName,
        reportedUser: reportData.reportedUser,
        reporterUser: currentUser, 
        reason: reportData.reason,
        description: reportData.description,
        severity: reportData.severity || 'medium',
        evidenceUrls: reportData.evidenceUrls || [], 
        timestamp: new Date().toISOString()
      };

      await reportService.submitReport(reportPayload);
      
      console.log("Report submitted with evidence:", reportPayload);
      setReportModal(null);
      
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleReportClose = () => setReportModal(null);

  // NEW: Centralized Navigation Function for FCM Deep Linking
  const navigate = (screen: string, params: Record<string, any> = {}) => {
      // 1. Reset any open modals/views
      setSelectedFoodId(null);
      setAutoOpenCampaignId(null); // Use new state
      setMapLocation(null);
      setReservationListPage(null); 
      
      // 2. Handle known detail/list screens that use local state
      if (screen === 'ListingDetail' && params.listingId) { 
          setSelectedFoodId(params.listingId);
          setActiveTab('browse'); 
          setCurrentView(null);
      } else if (screen === 'CampaignDetail' && params.campaignId) { 
          // FIX: Use new state variable for auto-open
          setAutoOpenCampaignId(params.campaignId);
          setActiveTab('campaigns'); 
          setCurrentView(null);
      } else if (screen === NOTIFICATIONS_SCREEN_NAME || screen === 'UserReportHistory') {
          setCurrentView(NOTIFICATIONS_SCREEN_NAME);
          setActiveTab('profile'); 
      } else if (screen === 'VolunteerCampaignDetail' && params.campaignId) { 
          // FIX: Use new state variable for auto-open
          setAutoOpenCampaignId(params.campaignId);
          setActiveTab('campaigns'); 
          setCurrentView(null);
      } else if (screen === 'VolunteerRegistrationsList' && params.campaignId) { 
          setReservationListPage({
              type: 'campaign',
              itemId: params.campaignId,
              itemName: 'Registrants List' 
          });
          setActiveTab('campaigns'); 
          setCurrentView(null);
      } else if (screen === 'Dashboard' || screen === 'home') {
          setActiveTab('home');
          setCurrentView(null);
      } else {
          // Fallback to generic tab
          setActiveTab(screen); 
          setCurrentView(null);
      }
      setViewParams(params);
  };

  // 3. Register the navigator function with FCM setup on mount
  useEffect(() => {
      registerNavigator(navigate);
  }, []);

  // Handle bottom navigation - close any detail views and go to selected tab
  const handleBottomNavClick = (tab: string) => {
    setCurrentView(null); // Clear any open view
    navigate(tab);
  };

  // Handle back from detail screens - go back to appropriate tab
  const handleBackFromDetail = () => {
    if (currentView) {
      setCurrentView(null);
      setViewParams({});
    } else if (reservationListPage) {
      setReservationListPage(null);
      setActiveTab("campaigns"); // Back from list to campaign tab
    } else if (selectedFoodId) {
      setSelectedFoodId(null);
      setActiveTab("browse");
    } else if (autoOpenCampaignId) { // Check autoOpenId
      setAutoOpenCampaignId(null);
      setActiveTab("campaigns");
    } else if (mapLocation) {
      setMapLocation(null);
      setActiveTab("browse");
    }
  };

  // Check if we're in a detail view OR a special view
  const isDetailView = selectedFoodId || autoOpenCampaignId || mapLocation || reservationListPage || currentView;

  const handleNavigateToCreate = () => {
    setActiveTab("upload");
  };

  // FIX: Updated handleNavigate to use autoOpenCampaignId for campaign details
  const handleNavigate = (tab: string, itemId?: string) => {
    if (itemId) {
      if (tab === 'browse') {
        setSelectedFoodId(itemId);
      } else if (tab === 'campaigns') {
        // Set the ID to trigger auto-open in CampaignsTab
        setAutoOpenCampaignId(itemId); 
      }
    }
    setActiveTab(tab);
  };

  // Show reservation list page if active
  if (reservationListPage) {
    return (
      <ReservationListPage
        type={reservationListPage.type}
        itemId={reservationListPage.itemId}
        itemName={reservationListPage.itemName}
        currentUser={{
          id: userData.uid,
          name: userData.profile?.name || userData.profile?.contactPerson || 'Volunteer User',
          email: userData.email
        }}
        onBack={() => setReservationListPage(null)}
      />
    );
  }

  // Conditional content for detail/map/report views
  const renderContent = () => {
    if (currentView === NOTIFICATIONS_SCREEN_NAME) {
      return (
        <NotificationsScreen 
          onBack={handleBackFromDetail} 
          userData={userData}
          initialView={viewParams.reportId ? 'reportDetail' : 'list'} 
          initialId={viewParams.reportId} 
        />
      );
    }
    
    if (selectedFoodId) {
      return (
        <FoodDetailScreen
          foodId={selectedFoodId}
          onBack={handleBackFromDetail}
          onReport={handleReport}
          userRole="volunteer" 
        />
      );
    }

    // Default tabs view - only show when no detail screens are open
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="home" className="m-0">
           {/* Passed down the correct navigation prop */}
           <DashboardTab onNavigate={handleNavigate} /> 
        </TabsContent>

        <TabsContent value="browse" className="m-0">
          <FoodBrowseScreen 
            onSelectFood={handleSelectFood}
            userRole="volunteer"
          />
        </TabsContent>

        <TabsContent value="upload" className="m-0">
          <CreateCampaignTab />
        </TabsContent>

        <TabsContent value="campaigns" className="m-0">
          <CampaignsTab 
            onNavigateToCreate={handleNavigateToCreate}  
            onNavigateToRegistrations={(campaignId: string, campaignName: string) => {
              setReservationListPage({
                type: 'campaign',
                itemId: campaignId,
                itemName: campaignName
              });
            }}
            userData={userData}
            autoOpenCampaignId={autoOpenCampaignId} // Pass the ID down
            onAutoOpenComplete={() => setAutoOpenCampaignId(null)} // Clear the ID after use
          />
        </TabsContent>

        <TabsContent value="profile" className="m-0">
          <ProfileTab onLogout={onLogout} />
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Main content area */}
        <div className="pb-16">
          {renderContent()}
        </div>

        {/* Bottom Navigation - 5 buttons - Only show when not in detail view */}
        {!isDetailView && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-blue-100 shadow-lg">
            <div className="flex">
              {/* Home */}
              <Button
                variant={activeTab === "home" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("home")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "home"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <Home className="h-4 w-4" />
                <span className="text-xs">Home</span>
              </Button>

              {/* Browse */}
              <Button
                variant={activeTab === "browse" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("browse")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "browse"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <Search className="h-4 w-4" />
                <span className="text-xs">Browse</span>
              </Button>

              {/* Upload */}
              <Button
                variant={activeTab === "upload" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("upload")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "upload"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs">Create</span>
              </Button>

              {/* Campaigns */}
              <Button
                variant={activeTab === "campaigns" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("campaigns")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "campaigns"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span className="text-xs">Campaigns</span>
              </Button>

              {/* Profile */}
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("profile")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "profile"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <User className="h-4 w-4" />
                <span className="text-xs">Profile</span>
              </Button>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {reportModal && (
          <ReportModal
            open={!!reportModal}
            onOpenChange={(open) => !open && setReportModal(null)}
            reportType={reportModal.type}
            targetId={reportModal.targetId}
            targetName={reportModal.targetName}
            reportedUser={reportModal.reportedUser}
            onClose={handleReportClose}
            onSubmit={handleReportSubmit}
          />
        )}
      </div>
    </div>
  );
}