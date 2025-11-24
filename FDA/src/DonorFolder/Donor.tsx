// Donor.tsx - Fixed version
import { Button } from "../UnifiedFolder/ui/button";
import { Tabs, TabsContent } from "../UnifiedFolder/ui/tabs";
import { ProfileTab } from "../UnifiedFolder/profile/ProfileTab";
import { DashboardTab } from './components/DashboardTab';
import { ListingsTab } from './components/ListingsTab';
import { UploadFoodTab } from './components/UploadFoodTab';
import { useState } from "react";
import {
  Home,
  User,
  List,
  Upload,
} from "lucide-react";
import type { UserData } from "../Firebase/auth";
import { ReportModal } from "../UnifiedFolder/modals/ReportModal";
import { reportService } from "../Firebase/userReport";
import { ReservationListPage } from "../UnifiedFolder/modals/ReservationListPage"; 

interface DonorProps {
  onLogout: () => void;
  userData: UserData;
}

export default function Donor({ onLogout, userData }: DonorProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
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

  const handleNavigateToUpload = () => {
    setActiveTab("upload");
  };

  const handleNavigateToListings = () => {
    setActiveTab("listing");
  };

  // Report handler for donor to report receivers/volunteers
  const handleReport = (
    type: "food" | "campaign" | "volunteer",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50">
      <div className="min-h-screen bg-white relative">
        <div className="bg-blue-50 pb-10 sm:pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="dashboard" className="m-0">
              <DashboardTab 
                onNavigateToUpload={handleNavigateToUpload}
              />
            </TabsContent>
            <TabsContent value="upload" className="m-0">
              <UploadFoodTab onNavigateToListings={handleNavigateToListings} />
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
              />
            </TabsContent>
            <TabsContent value="profile" className="m-0">
              <ProfileTab 
                onLogout={onLogout}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom Navigation */}
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