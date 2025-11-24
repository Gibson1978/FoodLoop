// FDA/src/App.tsx
import { useState } from "react";
import { LoginForm } from "./UnifiedFolder/auth/LoginForm";
import { SignupForm } from "./UnifiedFolder/auth/SignupForm";
import Volunteer from "./VolunteerFolder/Volunteer";
import Donor from "./DonorFolder/Donor";
import Receiver from "./ReceiverFolder/Receiver";
import type { UserData } from "./Firebase/auth"; 
import { LocationProvider } from "./UnifiedFolder/LocationFolder/LocationContext"; 

type AuthMode = "login" | "signup";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [userData, setUserData] = useState<UserData | null>(null);

  const handleLogin = (userData: UserData) => {
    setIsAuthenticated(true);
    setUserData(userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthMode("login");
    setUserData(null);
  };

  return (
    <LocationProvider>
      {!isAuthenticated ? (
        authMode === "login" ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToSignup={() => setAuthMode("signup")}
          />
        ) : (
          <SignupForm
            onSwitchToLogin={() => setAuthMode("login")}
          />
        )
      ) : !userData ? (
        <div>Error: No user data available</div>
      ) : (
        (() => {
          switch (userData.role) {
            case "volunteer":
              return <Volunteer onLogout={handleLogout} userData={userData} />;
            case "donor":
              return <Donor onLogout={handleLogout} userData={userData} />;
            case "receiver":
              return <Receiver onLogout={handleLogout} userData={userData} />;
            default:
              return <div>Unknown role: {userData.role}</div>;
          }
        })()
      )}
    </LocationProvider>
  );
}