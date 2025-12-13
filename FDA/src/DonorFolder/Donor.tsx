// Donor.tsx - FINAL Version with Deep Linking
import { Button } from "../UnifiedFolder/ui/button";
import { Tabs, TabsContent } from "../UnifiedFolder/ui/tabs";
import { ProfileTab } from "../UnifiedFolder/profile/ProfileTab";
import { DashboardTab } from './components/DashboardTab';
import { ListingsTab } from './components/ListingsTab';
import { UploadFoodTab } from './components/UploadFoodTab';
import { useState, useEffect } from "react";
import {
  Home,
  User,
  List,
  Upload,
  Bell // ADDED Bell
} from "lucide-react";
import type { UserData } from "../Firebase/auth";
import { ReportModal } from "../UnifiedFolder/modals/ReportModal";
import { NotificationsScreen } from "../UnifiedFolder/profile/NotificationsScreen"; 
import { reportService } from "../Firebase/userReport";
import { ReservationListPage } from "../UnifiedFolder/modals/ReservationListPage"; 
import { registerNavigator } from "../FCMSetup"; 

interface DonorProps {
  onLogout: () => void;
  userData: UserData;
}

const NOTIFICATIONS_SCREEN_NAME = 'notifications';

export default function Donor({ onLogout, userData }: DonorProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null); 
  const [autoOpenListingId, setAutoOpenListingId] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [viewParams, setViewParams] = useState<Record<string, any>>({});
  
  const [reportModal, setReportModal] = useState<{
    type: "food" | "volunteer" | "campaign";
    targetId: string;
    targetName: string;
    reportedUser?: any;
  } | null>(null);

  const [reservationListPage, setReservationListPage] = useState<{
    type: 'food' | 'campaign';
    itemId: string;
    itemName: string;
  } | null>(null);

  // NEW: Centralized Navigation Function for FCM Deep Linking
  const navigate = (screen: string, params: Record<string, any> = {}) => {
      // 1. Reset any open modals/views
      setSelectedListingId(null);
      setAutoOpenListingId(null);
      setReservationListPage(null); 
      
      // 2. Handle known detail/list screens that use local state
      if (screen === 'DonorListingDetail' && params.listingId) { // Case 1 status
          setAutoOpenListingId(params.listingId);
          setActiveTab('listing'); 
          setCurrentView(null);
      } else if (screen === 'DonorReservationsList' && params.listingId) { // Case 3a reservation
          setReservationListPage({
              type: 'food',
              itemId: params.listingId,
              itemName: 'Reservations List' 
          });
          setActiveTab('listing'); 
          setCurrentView(null);
      } else if (screen === NOTIFICATIONS_SCREEN_NAME || screen === 'UserReportHistory') {
          setCurrentView(NOTIFICATIONS_SCREEN_NAME);
          setActiveTab('profile'); 
      } else if (screen === 'Dashboard' || screen === 'dashboard') {
          setActiveTab('dashboard');
          setCurrentView(null);
      } else {
          // Fallback to tab
          setActiveTab(screen); 
          setCurrentView(null);
      }
      setViewParams(params);
  };

  // 3. Register the navigator function with FCM setup on mount
  useEffect(() => {
      registerNavigator(navigate);
  }, []);
  
  const handleNavigateToUpload = () => {
    setActiveTab("upload");
    setCurrentView(null);
  };

  const handleReportSubmit = async (reportData: any) => {
    try {
      const currentUser = {
        id: userData.uid,
        name: userData.profile?.name || userData.profile?.contactPerson || 'Donor User',
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
      
      console.log("Report submitted successfully:", reportPayload);
      setReportModal(null);
      
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleReportClose = () => setReportModal(null);

  // Check if we are in a special view
  const isDetailView = reservationListPage || currentView;

  // Show reservation list page if active
  if (reservationListPage) {
    return (
      <ReservationListPage
        type={reservationListPage.type}
        itemId={reservationListPage.itemId}
        itemName={reservationListPage.itemName}
        currentUser={{
          id: userData.uid,
          name: userData.profile?.name || userData.profile?.contactPerson || 'Donor User',
          email: userData.email
        }}
        onBack={() => setReservationListPage(null)}
      />
    );
  }
  
  // Conditional content for detail/map/report views
  const renderContent = () => {
    // NEW: Highest priority is the Notification Screen
    if (currentView === NOTIFICATIONS_SCREEN_NAME) {
      return (
        <NotificationsScreen 
          onBack={() => setCurrentView(null)} 
          userData={userData}
          initialView={viewParams.reportId ? 'reportDetail' : 'list'}
          initialId={viewParams.reportId}
        />
      );
    }
    
    // Default tabs view
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="dashboard" className="m-0">
          <DashboardTab 
            onNavigateToUpload={handleNavigateToUpload}
            onNavigateToListingDetail={(listingId) => {
              setActiveTab('listing');
              setAutoOpenListingId(listingId);
            }}
          />
        </TabsContent>
        <TabsContent value="upload" className="m-0">
          <UploadFoodTab/>
        </TabsContent>
        <TabsContent value="listing" className="m-0">
          <ListingsTab 
            onNavigateToUpload={handleNavigateToUpload}
            onNavigateToReservations={(listingId: string, listingName: string) => {
              setReservationListPage({
                type: 'food',
                itemId: listingId,
                itemName: listingName
              });
            }}
            userData={userData}
            autoOpenListingId={autoOpenListingId} 
            onAutoOpenComplete={() => setAutoOpenListingId(null)} 
          />
        </TabsContent>
        <TabsContent value="profile" className="m-0">
          <ProfileTab 
            onLogout={onLogout}
          />
        </TabsContent>
      </Tabs>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50">
      <div className="min-h-screen bg-white relative">
        <div className="bg-blue-50 pb-10 sm:pb-24">
        
          {/* Main content area */}
          <div className="pb-16">
            {renderContent()}
          </div>

        {/* Bottom Navigation */}
        {!isDetailView && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-green-100 shadow-lg safe-area-bottom">
            <div className="max-w-md mx-auto px-2 sm:px-4">
              <div className="flex">
                {/* Dashboard */}
                <Button
                  variant={activeTab === "dashboard" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex-1 flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 px-0 min-h-0 ${
                    activeTab === "dashboard"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  } rounded-l`}
                >
                  <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs font-medium">Home</span>
                </Button>

                {/* Upload */}
                <Button
                  variant={activeTab === "upload" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 px-0 min-h-0 ${
                    activeTab === "upload"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  } rounded-l`}
                >
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs font-medium">Upload</span>
                </Button>

                {/* Listings */}
                <Button
                  variant={activeTab === "listing" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("listing")}
                  className={`flex-1 flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 px-0 min-h-0 ${
                    activeTab === "listing"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  } rounded-l`}
                >
                  <List className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs font-medium">My Listings</span>
                </Button>

                {/* Profile */}
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("profile")}
                  className={`flex-1 flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 px-0 min-h-0 ${
                    activeTab === "profile"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  } rounded-l`}
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs font-medium">Profile</span>
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>

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