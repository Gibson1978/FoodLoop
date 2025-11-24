import { useState } from "react";
import { LoginForm } from "./components/auth/LoginForm";
import { SignupForm } from "./components/auth/SignupForm";
import { Sidebar } from "./components/dashboard/Sidebar";
import { DashboardStats } from "./components/dashboard/DashboardStats";
import { ProfileTab } from "./components/dashboard/ProfileTab";
import { ChatbotTab } from "./components/dashboard/ChatbotTab";
import { ReportsTab } from "./components/dashboard/ReportsTab";
import { SystemControlsTab } from "./components/dashboard/SystemControlsTab";

type AuthMode = "login" | "signup";
type DashboardTab = "dashboard" | "profile" | "chatbot" | "reports" | "system";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");

  const handleLogin = (email: string, password: string) => {
    // Mock authentication - in real app, validate credentials
    setIsAuthenticated(true);
  };

  const handleSignup = (data: any) => {
    // Mock signup - in real app, create account
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab("dashboard");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardStats />;
      case "profile":
        return <ProfileTab />;
      case "chatbot":
        return <ChatbotTab />;
      case "reports":
        return <ReportsTab />;
      case "system":
        return <SystemControlsTab />;
      default:
        return <DashboardStats />;
    }
  };

  if (!isAuthenticated) {
    return authMode === "login" ? (
      <LoginForm
        onLogin={handleLogin}
        onSwitchToSignup={() => setAuthMode("signup")}
      />
    ) : (
      <SignupForm
        onSignup={handleSignup}
        onSwitchToLogin={() => setAuthMode("login")}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as DashboardTab)}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}