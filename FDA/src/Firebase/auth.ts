import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserMetricsService } from '../UnifiedFolder/services/userMetricServices'; 
import { getFunctions, httpsCallable } from 'firebase/functions'

// 🚨 NEW IMPORTS FOR CAPACITOR/FCM INTEGRATION
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging, type GetTokenResult } from '@capacitor-firebase/messaging';
// ---------------------------------------------


// User App Interfaces (Your existing interfaces remain here)
export interface UserRegistrationData {
  email: string;
  password: string;
  role: string;
  name?: string;
  phone: string;
  orgName?: string;
  orgType?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  documentUrl?: string;
}

export interface UserProfile {
  name?: string;
  phone: string;
  orgName?: string;
  orgType?: string;
  contactPerson?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
}

export interface UserData {
  uid: string;
  email: string;
  role: string;
  status: string;
  fcmTokens?: string[];
  profile: UserProfile;
  verification: {
    documentUrl: string;
    verified: boolean;
    documentUploaded?: boolean;
    uploadedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const USER_ROLES = {
  RECEIVER: 'receiver',
  DONOR: 'donor',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin'
} as const;

export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

// --- FCM HELPER FUNCTION (NEW) ---
const getMobileFCMToken = async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
        return null;
    }
    
    try {
        const permissionStatus = await FirebaseMessaging.requestPermissions(); 
        
        if (permissionStatus.receive !== 'granted') {
            console.log('FCM: User denied permissions for token retrieval during login.');
            return null;
        }

        const tokenResult: GetTokenResult = await FirebaseMessaging.getToken();
        return tokenResult.token;

    } catch (error) {
        console.error('Failed to retrieve FCM token during login:', error);
        return null;
    }
};
// ---------------------------------


// --- NEW HELPER FUNCTION: SAVE FCM TOKEN ---
export const saveFcmToken = async (uid: string, newToken: string): Promise<void> => {
    if (!newToken) {
        console.warn('Attempted to save empty FCM token.');
        return;
    }
    const userRef = doc(db, 'users', uid);
    try {
        const userDoc = await getDoc(userRef);
        const currentTokens: string[] = userDoc.exists() ? (userDoc.data().fcmTokens || []) : [];
        
        const filteredTokens = currentTokens.filter(token => token !== newToken);
        
        filteredTokens.push(newToken);

        const tokensToSave = filteredTokens.slice(-5);
        
        await updateDoc(userRef, {
            fcmTokens: tokensToSave,
            updatedAt: new Date()
        });
        console.log(`✅ FCM Token successfully saved/updated for user: ${uid}`);
    } catch (error) {
        console.error('❌ Failed to save FCM token:', error);
    }
};

// Enhanced error handling helper (Your original logic)
const getAuthErrorMessage = (errorCode: string, originalMessage?: string): string => {
  console.log('🔍 Raw error details:', { errorCode, originalMessage });
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful login attempts. Please try again later.';
    default:
      const lowerMessage = (originalMessage || '').toLowerCase();
      if (lowerMessage.includes('network') || lowerMessage.includes('firebase')) {
        return 'Network or service error. Please check your internet connection. If the problem persists, Firebase services might be temporarily unavailable.';
      }
      return `Authentication error: ${originalMessage || 'Please try again later.'}`;
  }
};

const isServiceError = (errorCode: string, originalMessage?: string): boolean => {
  const serviceErrorCodes = [
    'auth/network-request-failed',
    'auth/internal-error',
    'auth/app-not-authorized',
    'auth/app-deleted',
    'auth/api-key-not-valid',
    'auth/configuration-not-found',
    'auth/timeout',
    'auth/operation-not-supported-in-this-environment'
  ];
  
  const lowerMessage = (originalMessage || '').toLowerCase();
  const isServiceRelated = serviceErrorCodes.includes(errorCode) ||
                             lowerMessage.includes('firebase') ||
                             lowerMessage.includes('service') ||
                             lowerMessage.includes('unavailable') ||
                             lowerMessage.includes('quota');
  
  return isServiceRelated;
};

const handleAuthError = (error: any) => {
  const errorCode = error?.code || 'unknown';
  const errorMessage = error?.message || 'No error message';
  
  console.error('🚨 AUTH ERROR DETAILS:', {
    code: errorCode,
    message: errorMessage,
    fullError: error,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  
  const userMessage = getAuthErrorMessage(errorCode, errorMessage);
  const isServiceIssue = isServiceError(errorCode, errorMessage);
  
  return {
    userMessage,
    isServiceIssue,
    originalError: error
  };
};

const checkFirebaseStatus = async (): Promise<{ isUp: boolean; message?: string }> => {
  try {
    const response = await fetch('https://firebase.googleapis.com/$discovery/rest?version=v1', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return { isUp: true };
  } catch (error) {
    return { 
      isUp: false, 
      message: 'Unable to reach Firebase services. Please check your internet connection.' 
    };
  }
};

// Submit user registration
export const submitUserRegistration = async (userData: UserRegistrationData): Promise<{success: boolean; error?: string; uid?: string}> => {
  try {
    const status = await checkFirebaseStatus();
    if (!status.isUp) {
      return { success: false, error: 'Firebase services are currently unavailable. Please check your internet connection and try again.' };
    }

    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const { uid } = userCredential.user;

    const userDocData = {
      uid,
      email: userData.email,
      role: userData.role,
      status: USER_STATUS.PENDING,
      profile: {
        phone: userData.phone,
        ...(userData.role === USER_ROLES.RECEIVER && { name: userData.name }),
        ...(userData.role !== USER_ROLES.RECEIVER && { 
          orgName: userData.orgName,
          contactPerson: userData.contactPerson,
          ...(userData.orgType && { orgType: userData.orgType })
        }),
        ...(userData.address && userData.city && userData.postalCode && {
          address: {
            street: userData.address,
            city: userData.city,
            postalCode: userData.postalCode
          }
        })
      },
      verification: {
        documentUrl: userData.documentUrl || '',
        verified: false,
        documentUploaded: !!userData.documentUrl,
        uploadedAt: userData.documentUrl ? new Date() : null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', uid), userDocData);

    try {
      await UserMetricsService.initializeUserMetrics(uid, userData.role);
    } catch (metricsError) {
      console.warn('⚠️ Failed to initialize user metrics, but user was created:', metricsError);
    }

    return { success: true, uid };
  } catch (error: any) {
    const { userMessage, isServiceIssue } = handleAuthError(error);
    
    if (auth.currentUser) {
      try {
        await auth.currentUser.delete();
      } catch (deleteError) {
        console.error('❌ Failed to cleanup auth user:', deleteError);
      }
    }
    
    let finalErrorMessage = userMessage;
    if (isServiceIssue) {
      const status = await checkFirebaseStatus();
      if (!status.isUp) {
        finalErrorMessage += ' Firebase services appear to be down.';
      }
    }
    
    return { success: false, error: finalErrorMessage };
  }
};

// Update user verification document
export const updateUserVerificationDocument = async (userId: string, documentUrl: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'verification.documentUrl': documentUrl,
      'verification.documentUploaded': true,
      'verification.uploadedAt': new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating user verification document:', error);
    throw new Error('Failed to update verification document');
  }
};

// Login function - INTEGRATED FCM TOKEN SAVE
export const signInUser = async (email: string, password: string): Promise<{success: boolean; error?: string; userData?: UserData}> => {
  try {
    const status = await checkFirebaseStatus();
    if (!status.isUp) {
      return { success: false, error: 'Firebase services are currently unavailable. Please check your internet connection and try again.' };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: 'Account not found. Please contact support.' };
    }

    const userData = userDoc.data() as UserData;
    
    if (userData.status !== USER_STATUS.APPROVED) {
      await signOut(auth);
      return { success: false, error: 'Your account is pending approval. Please wait for administrator approval.' };
    }


    // --- 🚨 CRITICAL FIX: Use the new helper to get and save the token ---
    try {
        const fcmToken = await getMobileFCMToken();
        
        if (fcmToken) {
            await saveFcmToken(uid, fcmToken); 
        } else {
            console.log('ℹ️ FCM token skipped (not on mobile or permission denied).');
        }
    } catch (e) {
        console.warn('Could not save FCM token after login', e);
    }
    // -------------------------------------------------------------------

    return { success: true, userData };
  } catch (error: any) {
    const { userMessage } = handleAuthError(error);
    return { success: false, error: userMessage };
  }
};

// Check if user is logged in and approved
export const checkAuthStatus = async (): Promise<{isLoggedIn: boolean; userData?: UserData; error?: string}> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return { isLoggedIn: false };
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      return { isLoggedIn: false, error: 'Account not found.' };
    }

    const userData = userDoc.data() as UserData;
    
    if (userData.status !== USER_STATUS.APPROVED) {
      await signOut(auth);
      return { isLoggedIn: false, error: 'Your account is pending approval.' };
    }

    return { isLoggedIn: true, userData };
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
    return { isLoggedIn: false, error: 'Failed to verify authentication status.' };
  }
};

// Check registration status
export const checkRegistrationStatus = async (): Promise<{status: 'pending' | 'approved' | 'rejected' | 'not_found'; data?: UserData}> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return { status: 'not_found' };
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      return { status: userData.status as 'pending' | 'approved' | 'rejected', data: userData };
    }

    return { status: 'not_found' };
  } catch (error) {
    console.error('❌ Error checking registration status:', error);
    return { status: 'not_found' };
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('❌ Error during logout:', error);
    throw error;
  }
};

// Get current user data
export const getCurrentUserData = async (): Promise<UserData | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      if (userData.status === USER_STATUS.APPROVED) {
        return userData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting current user data:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<{success: boolean; error?: string}> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return { success: false, error: 'User account not found' };
    }

    const userData = userDoc.data() as UserData;
    if (userData.status !== USER_STATUS.APPROVED) {
      return { success: false, error: 'Only approved users can update profiles' };
    }

    await updateDoc(doc(db, 'users', user.uid), {
      profile: profileData,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile. Please try again.' };
  }
};

export async function getContactByUserId(
  uid: string, 
  interactionId: string, 
  interactionType: 'food' | 'campaign'
): Promise<string | null> {
  try {
    const functions = getFunctions();
    
    // Define the client call signature for the Cloud Function
    type RequestData = { targetUserId: string, interactionId: string, interactionType: 'food' | 'campaign' };
    type ResponseData = { success: boolean; phoneNumber: string };
    
    const getContact = httpsCallable<RequestData, ResponseData>(
      functions, 
      'getContactDetails' // Name of the V2 callable function deployed in index.ts
    );

    console.log(`📞 Attempting secure contact retrieval for user: ${uid} via Cloud Function...`);

    const result = await getContact({ 
      targetUserId: uid, 
      interactionId: interactionId, 
      interactionType: interactionType 
    });

    if (result.data.success && result.data.phoneNumber) {
      console.log('✅ Contact retrieved successfully.');
      return result.data.phoneNumber;
    }
    
    // Log function errors returned from the server
    console.warn('⚠️ Server refused contact retrieval:', result.data);
    return null;

  } catch (error: any) {
    // Handle specific HttpsErrors (e.g., 'permission-denied', 'not-found')
    const errorMessage = error.message || 'Failed to retrieve contact due to server error.';
    console.error(`❌ Error fetching secure contact for ${uid}:`, errorMessage);
    return null;
  }
}

// Export error helpers for external use
export { getAuthErrorMessage, isServiceError, checkFirebaseStatus, handleAuthError };
