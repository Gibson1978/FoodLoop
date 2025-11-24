import { useState } from "react";
import { Home, Search, MapPin, User } from "lucide-react";
import { Button } from "../UnifiedFolder/ui/button";
import { Tabs, TabsContent } from "../UnifiedFolder/ui/tabs";

import { HomeScreen } from "./components/DashboardTab";
import { FoodBrowseScreen } from "./components/foodtabs/FoodBrowseScreen";
import { FoodDetailScreen } from "./components/foodtabs/FoodDetailScreen";
import { CampaignsScreen } from "./components/campaigns/CampaignsScreen";
import { CampaignDetailScreen } from "./components/campaigns/CampaignDetailScreen";
import { ProfileTab } from "../UnifiedFolder/profile/ProfileTab";
import { ReportModal } from "../UnifiedFolder/modals/ReportModal";
import type { UserData } from "../Firebase/auth";
import { reportService } from "../Firebase/userReport";

interface ReceiverProps {
  onLogout: () => void;
  userData: UserData; 
}

export default function Receiver({ onLogout, userData }: ReceiverProps) {
  const [activeTab, setActiveTab] = useState("home");

  // Detail/Map/Report States
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [mapLocation, setMapLocation] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{
    type: "food" | "volunteer" | "campaign";
    targetId: string;
    targetName: string;
    reportedUser?: any; 
  } | null>(null);

  // Handlers
  const handleSelectFood = (foodId: string) => setSelectedFoodId(foodId);
  const handleSelectCampaign = (campaignId: string) => setSelectedCampaignId(campaignId);

  const handleShowMap = (location: string) => setMapLocation(location);

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
      // Use the userData prop that's passed to the component
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

  // Handle bottom navigation - close any detail views and go to selected tab
  const handleBottomNavClick = (tab: string) => {
    // Close any open detail screens
    setSelectedFoodId(null);
    setSelectedCampaignId(null);
    setMapLocation(null);
    
    // Navigate to the selected tab
    setActiveTab(tab);
  };

  // Handle back from detail screens - go back to appropriate tab
  const handleBackFromDetail = () => {
    setSelectedFoodId(null);
    setSelectedCampaignId(null);
    setMapLocation(null);
    
    // Determine which tab to go back to based on context
    if (selectedFoodId) {
      setActiveTab("browse"); // Food detail -> Food browse
    } else if (selectedCampaignId) {
      setActiveTab("campaigns"); // Campaign detail -> Campaigns
    } else if (mapLocation) {
      setActiveTab("browse"); // Map -> Food browse
    }
  };

  // Check if we're in a detail view
  const isDetailView = selectedFoodId || selectedCampaignId || mapLocation;

  // Conditional content for detail/map/report views
  const renderContent = () => {

    if (selectedFoodId) {
      return (
        <FoodDetailScreen
          foodId={selectedFoodId}
          onBack={handleBackFromDetail}
          onReport={handleReport}     />
      );
    }

    if (selectedCampaignId) {
      return (
        <CampaignDetailScreen
          campaignId={selectedCampaignId}
          onBack={handleBackFromDetail}
          onShowMap={handleShowMap}
          onReport={handleReport}
        />
      );
    }

    // Default tabs view - only show when no detail screens are open
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="home" className="m-0">
          <HomeScreen onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="browse" className="m-0">
          <FoodBrowseScreen onSelectFood={handleSelectFood} />
        </TabsContent>

        <TabsContent value="campaigns" className="m-0">
          <CampaignsScreen
            userRole="recipient"
            onSelectCampaign={handleSelectCampaign}
          />
        </TabsContent>

        <TabsContent value="profile" className="m-0">
          <ProfileTab onLogout={onLogout} />
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="mobile-container overflow-x-hidden min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Main content area */}
        <div className="pb-16"> {/* Add padding to prevent overlap with fixed nav */}
          {renderContent()}
        </div>

        {/* Bottom Navigation - Only show when not in detail view */}
        {!isDetailView && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-orange-100 shadow-lg">
            <div className="flex">
              {/* Home */}
              <Button
                variant={activeTab === "home" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("home")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "home"
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
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
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                }`}
              >
                <Search className="h-4 w-4" />
                <span className="text-xs">Foods</span>
              </Button>

              {/* Campaigns */}
              <Button
                variant={activeTab === "campaigns" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBottomNavClick("campaigns")}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-0 ${
                  activeTab === "campaigns"
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
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
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
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
            reportedUser={reportModal.reportedUser} // Pass the reportedUser
            onClose={handleReportClose}
            onSubmit={handleReportSubmit}
          />
        )}
      </div>
    </div>
  );
}