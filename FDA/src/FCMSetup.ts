// FDA/src/FCMSetup.ts (FINAL STABLE VERSION)

import { auth } from './Firebase/firebase';
import { saveFcmToken } from './Firebase/auth';
import { Capacitor } from '@capacitor/core';
import { 
    FirebaseMessaging, 
    type NotificationActionPerformedEvent,
    type GetTokenResult,
    type NotificationReceivedEvent 
} from '@capacitor-firebase/messaging'; 
import { LocalNotifications } from '@capacitor/local-notifications';

// --- CENTRAL NAVIGATION REGISTRATION ---
let globalNavigator: ((screen: string, params?: Record<string, any>) => void) | null = null;

export function registerNavigator(navigator: (screen: string, params?: Record<string, any>) => void) {
    globalNavigator = navigator;
    console.log("FCM Navigator registered for Deep Linking.");
}
// ---------------------------------------

// --- Initialize Local Notifications (Required for Foreground Banner) ---
async function initializeLocalNotifications() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
        // Request permission for local notifications (needed for Android 13+)
        const permissionStatus = await LocalNotifications.requestPermissions();
        if (permissionStatus.display !== 'granted') {
             console.warn('Local Notifications permission not granted. Foreground banners may fail.');
        }
    } catch (error) {
        console.error('Failed to initialize local notifications:', error);
    }
}

// --- Safe payload serialization ---
function serializeNotificationPayload(data: any): Record<string, string> {
    const payload: Record<string, string> = {};
    if (!data || typeof data !== 'object') {
        return payload;
    }
    
    for (const key in data) {
        try {
            const value = data[key];
            if (value === null || value === undefined) {
                continue;
            }
            
            if (typeof value === 'string') {
                payload[key] = value;
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                payload[key] = String(value);
            } else {
                // Stringify complex objects to prevent native crashes
                payload[key] = JSON.stringify(value);
            }
        } catch (error) {
            console.warn(`Failed to serialize key "${key}":`, error);
        }
    }
    return payload;
}


// --- Universal Payload Extractor (Bypasses Type Errors) ---
function extractPayload(event: any): { display: { title: string, body: string }, data: Record<string, any> | null } {
    
    // Assert the entire event as 'any' to bypass strict type checking
    const eventAny = event as any;
    
    // Source 1: event.data (Standard FCM data payload)
    // Source 2: event.notification.data (Sometimes merged here)
    // Source 3: event.notification.extra (Local Notification taps)
    const data = eventAny.data || eventAny.notification?.data || eventAny.notification?.extra || null;
    
    // Fallback display fields
    const title = eventAny.notification?.title || data?.title || "New Notification";
    const body = eventAny.notification?.body || data?.messageBody || "Tap for details.";

    return {
        display: { title, body },
        data: data
    };
}


// --- Handle notification tap (ULTIMATE CRASH-PROOFING) ---
function handleNotificationTap(data: any) {
    if (!data || typeof data !== 'object' || !globalNavigator) {
        console.error("FCM Tap Crash: Invalid data or missing navigator.");
        globalNavigator?.('notifications'); 
        return;
    }

    // Aggressive safety check and type coercion
    const notificationType = String(data.notificationType || '').trim();
    const relatedEntityId = String(data.relatedEntityId || '').trim();
    const relatedEntityType = String(data.relatedEntityType || '').trim();
    
    // Early exit if critical data is missing (prevents navigation crash)
    if (!relatedEntityId || !notificationType || !relatedEntityType) {
        console.error(`FCM Tap: Missing critical data. Type='${notificationType}', ID='${relatedEntityId}', Entity='${relatedEntityType}'.`);
        globalNavigator?.('notifications'); 
        return;
    }

    const navigate = globalNavigator;

    try {
        switch (notificationType) {
            case 'listing_status':
            case 'campaign_status': {
                const screen = relatedEntityType === 'foodListings' ? 'DonorListingDetail' : 'VolunteerCampaignDetail';
                const idKey = relatedEntityType === 'foodListings' ? 'listingId' : 'campaignId';
                navigate(screen, { [idKey]: relatedEntityId });
                break;
            }
            case 'reservation': {
                const screen = relatedEntityType === 'foodListings' ? 'DonorReservationsList' : 'VolunteerRegistrationsList';
                const idKey = relatedEntityType === 'foodListings' ? 'listingId' : 'campaignId';
                navigate(screen, { [idKey]: relatedEntityId });
                break;
            }
            case 'cancellation': {
                const screen = relatedEntityType === 'foodListings' ? 'ListingDetail' : 'CampaignDetail';
                const idKey = relatedEntityType === 'foodListings' ? 'listingId' : 'campaignId';
                navigate(screen, { [idKey]: relatedEntityId, status: 'cancelled' });
                break;
            }
            case 'report_response': {
                navigate('UserReportHistory', { reportId: relatedEntityId });
                break;
            }
            case 'registration_status': {
                navigate('Dashboard');
                break;
            }
            default:
                console.warn(`FCM Tap: Unknown notificationType: ${notificationType}`);
                navigate('notifications');
                break;
        }
        
        console.log(`✅ Deep Link Successful: Navigated to ${notificationType}`);

    } catch (e) {
        // CATCH ALL: If the navigation function itself throws an error, catch it!
        console.error("❌ CRITICAL CRASH CAUGHT in Deep Link Logic:", e);
        globalNavigator?.('Dashboard');
    }
}

// --- 1. Function to get and save the token ---
export async function requestUserPermissionAndGetToken() {
    const user = auth.currentUser;
    if (!user) {
        console.log("FCM: User not authenticated. Skipping token setup.");
        return;
    }
    
    try {
        await initializeLocalNotifications();
        
        const permissionStatus = await FirebaseMessaging.requestPermissions(); 
        
        if (permissionStatus.receive === 'granted') {
            const tokenResult: GetTokenResult = await FirebaseMessaging.getToken();
            const token = tokenResult.token;

            console.log('FCM Token Retrieved:', token);
            await saveFcmToken(user.uid, token);
        } else {
            console.log('FCM: User denied notification permissions.');
        }
    } catch (error) {
        console.error('FCM Error during token setup:', error);
    }
}

// --- 2. Function to handle listeners ---
export function setupFCMListeners() {
    if (!Capacitor.isNativePlatform()) return;
    
    initializeLocalNotifications();

    try {
        // A. Listener for messages received while the app is in the foreground
        FirebaseMessaging.addListener('notificationReceived', async (event: NotificationReceivedEvent) => { 
            const { display, data } = extractPayload(event);
            
            console.log('FCM: Foreground Notification Received:', { display, data });

            if (!data) {
                console.warn("FCM: Received foreground notification with no data payload. Skipping local notification.");
                return;
            }
            
            try {
                // Schedule local notification
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: display.title,
                            body: display.body,
                            id: Math.floor(Math.random() * 10000), 
                            extra: serializeNotificationPayload(data),
                            schedule: { at: new Date(Date.now() + 100) },
                        }
                    ]
                });
                
                console.log('Local notification scheduled successfully');
                
            } catch (e) {
                console.error("❌ Failed to schedule local notification:", e);
            }
        });

        // B. Listener for when the user taps a notification
        FirebaseMessaging.addListener('notificationActionPerformed', (event: NotificationActionPerformedEvent) => {
            console.log('FCM: Notification tapped:', event);
            
            // Use the same universal extractor here for data payload
            const { data } = extractPayload(event);
            
            if (data) {
                handleNotificationTap(data);
            } else {
                console.error("FCM Tap: No payload found for deep linking.");
                globalNavigator?.('notifications');
            }
        });

        // C. Optional: Listener for token refresh
        FirebaseMessaging.addListener('tokenReceived', async (event) => {
            const user = auth.currentUser;
            if (user) {
                try {
                    await saveFcmToken(user.uid, event.token);
                    console.log('Refreshed FCM token saved to Firestore');
                } catch (error) {
                    console.error('Failed to save refreshed token:', error);
                }
            }
        });

        console.log("FCM Listeners Started Successfully");
        
    } catch (error) {
        console.error("Failed to set up FCM listeners:", error);
    }
}