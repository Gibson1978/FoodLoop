// FDA/src/App.tsx (FIXED: Calls async FCM Setup)

import { useState, useEffect  } from "react";
import { LoginForm } from "./UnifiedFolder/auth/LoginForm";
import { SignupForm } from "./UnifiedFolder/auth/SignupForm";
import Volunteer from "./VolunteerFolder/Volunteer";
import Donor from "./DonorFolder/Donor";
import Receiver from "./ReceiverFolder/Receiver";
import type { UserData } from "./Firebase/auth"; 
import { LocationProvider } from "./UnifiedFolder/LocationFolder/LocationContext"; 
import { setupFCMListeners, requestUserPermissionAndGetToken } from "./FCMSetup"; 
import { Capacitor } from '@capacitor/core'; 
import { App as capApp } from '@capacitor/app';

type AuthMode = "login" | "signup";

// Determine if the environment is a true native mobile platform (iOS/Android)
const IS_MOBILE = Capacitor.isNativePlatform();
console.log(`App Launch: IS_MOBILE=${IS_MOBILE}`);


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [userData, setUserData] = useState<UserData | null>(null);

  // FDA/src/App.tsx (Updated useEffect)

  useEffect(() => {
    if (IS_MOBILE) {
      console.log("FCM Setup: Starting listeners");
      
      // Small delay to ensure Capacitor is fully initialized
      const timer = setTimeout(() => {
        setupFCMListeners();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      console.log("FCM Setup: Running on web/desktop. FCM listeners skipped.");
    }
  }, []);

  useEffect(() => {
    if (!IS_MOBILE) return; // Exit if not mobile

    let listenerRef: { remove: () => Promise<void> | void }; 

    // Define the async setup function
    const setupListener = async () => {
        const listener = await capApp.addListener('backButton', () => {
            const currentPath = window.location.pathname; 
            const authExitScreens = ['/', '/login', '/signup']; 

            // =========================================================
            // SCENARIO A: User is NOT authenticated (Original logic)
            // =========================================================
            if (!isAuthenticated) {
                if (window.confirm('Press OK to exit the app.')) {
                    capApp.exitApp();
                }
            } 
            // =========================================================
            // SCENARIO B: User IS authenticated (Functional Fix Applied)
            // =========================================================
            else {
                // Determine the correct dashboard path based on role
                const dashboardPath = (() => {
                    if (!userData?.role) return '/dashboard'; // Fallback
                    switch (userData.role) {
                        case 'volunteer': return '/volunteer';
                        case 'donor': return '/donor';
                        case 'receiver': return '/receiver';
                        default: return '/dashboard';
                    }
                })();

                const isRootDashboard = currentPath === dashboardPath;
                // If history length is short, assume it's the root of the app
                const isHistoryStart = window.history.length <= 2; 

                if (isRootDashboard || isHistoryStart) {
                    // SCENARIO B1: At the root, prompt to exit.
                    if (window.confirm('Press OK to exit the app.')) {
                        capApp.exitApp();
                    }
                } 
                // 🚨 FUNCTIONAL FIX: Change SCENARIO B2 logic:
                // If we are logged in, but the path is stuck on an auth screen,
                // we assume they are *entering* the app from a deep link or similar.
                // We should push the correct dashboard path onto the history.
                else if (authExitScreens.includes(currentPath)) {
                    // Instead of full reload (window.location.replace), 
                    // we'll navigate back one more time, relying on the component 
                    // to render the correct view (which it should, based on role).
                    window.history.back(); 

                } else {
                    // SCENARIO B3: Deep navigation. Go back one step.
                    window.history.back(); 
                }
            }
        });
        // CRITICAL FIX: Save the resolved listener object
        listenerRef = listener;
    };

    setupListener();

    // 🚨 TYPESCRIPT FIX: Cleanup function must be SYNCHRONOUS
    return () => {
        if (listenerRef) {
            listenerRef.remove();
        }
    };
}, [isAuthenticated, userData]);

  // Update token request effect
  useEffect(() => {
    if (isAuthenticated && IS_MOBILE) {
      console.log("FCM Token: Authenticated on mobile. Requesting token.");
      
      // Small delay to ensure FCM is ready
      const timer = setTimeout(() => {
        requestUserPermissionAndGetToken();
      }, 1500);
      
      return () => clearTimeout(timer);
    } else if (isAuthenticated && !IS_MOBILE) {
      console.log("FCM Token: Authenticated on web. Token saving skipped.");
    }
  }, [isAuthenticated]);

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
        // Renders Login/Signup forms if not authenticated
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
        // Renders the main app content based on the user role
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