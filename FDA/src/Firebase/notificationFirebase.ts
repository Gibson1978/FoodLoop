// FDA/src/firebase/notificationClient.ts (New Client Service)

import { 
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  type Unsubscribe,
  getDocs
} from 'firebase/firestore';
import { db, auth } from './firebase'; // Assuming access to auth and db instances

// Client-side Interface for the Notification Document
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'listing_status' | 'campaign_status' | 'reservation' | 'cancellation' | 'report_response' | 'registration_status' | 'admin_alert';
  timestamp: Date;
  read: boolean;
  relatedEntityId: string; 
  relatedEntityType: 'foodListings' | 'campaigns' | 'reports' | 'users';
  fullDetails?: string; 
}


// --- 1. REAL-TIME LISTENER FOR USER'S NOTIFICATIONS ---
/**
 * Subscribes to the current user's notifications in real-time.
 */
export const subscribeToUserNotifications = (
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to view notifications.');
    }

    const q = query(
      collection(db, 'userNotifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(100) // Limit to a reasonable number for performance
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const notifications: AppNotification[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to Date object
            timestamp: data.timestamp?.toDate()
          } as AppNotification);
        });
        
        onUpdate(notifications);
      },
      (error) => {
        console.error('Real-time notifications error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up real-time notifications:', error);
    onError?.(error as Error);
    return () => {};
  }
};


// --- 2. MARK NOTIFICATION AS READ ---
/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = async (notificationId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const notificationRef = doc(db, 'userNotifications', notificationId);
    
    await updateDoc(notificationRef, {
      read: true
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to mark as read.' };
  }
};


// --- 3. MARK ALL NOTIFICATIONS AS READ ---
/**
 * Marks all unread notifications for the current user as read (query-based).
 */
export const markAllNotificationsAsRead = async (): Promise<{success: boolean; count: number; error?: string}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated.');
    }

    const unreadQuery = query(
        collection(db, 'userNotifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
    );

    const querySnapshot = await getDocs(unreadQuery);
    const updatePromises: Promise<void>[] = [];
    
    querySnapshot.forEach((document) => {
        updatePromises.push(updateDoc(document.ref, { read: true }));
    });

    await Promise.all(updatePromises);
    
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, count: 0, error: 'Failed to mark all as read.' };
  }
};