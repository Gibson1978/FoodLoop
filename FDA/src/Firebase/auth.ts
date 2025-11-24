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

// User App Interfaces
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

// Enhanced error handling helper
const getAuthErrorMessage = (errorCode: string, originalMessage?: string): string => {
  console.log('🔍 Raw error details:', { errorCode, originalMessage });
  
  switch (errorCode) {
    // User-facing authentication errors
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful login attempts. Please try again later.';
    
    // Network and connectivity errors
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/web-storage-unsupported':
    case 'auth/internal-error':
      return 'Browser storage issue. Please try clearing your browser cache or using a different browser.';
    
    // Firebase service errors
    case 'auth/app-not-authorized':
      return 'Firebase app not authorized. This may be a configuration issue.';
    case 'auth/app-deleted':
      return 'Firebase app has been deleted. Please contact support.';
    case 'auth/api-key-not-valid':
      return 'Invalid Firebase configuration. Please contact support.';
    case 'auth/configuration-not-found':
      return 'Firebase configuration error. Please contact support.';
    
    // Timeout and operation errors
    case 'auth/timeout':
      return 'Request timed out. Please check your connection and try again.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'This operation is not supported in your current environment.';
    
    // Generic error codes that might indicate service issues
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Firebase Authentication.';
    case 'auth/requires-recent-login':
      return 'Please log in again to complete this action.';
    
    // Default case with more context
    default:
      // Check if the original message indicates network issues
      const lowerMessage = (originalMessage || '').toLowerCase();
      if (lowerMessage.includes('network') || 
          lowerMessage.includes('internet') || 
          lowerMessage.includes('offline') ||
          lowerMessage.includes('failed to fetch') ||
          lowerMessage.includes('firebase') ||
          errorCode.includes('network')) {
        return 'Network or service error. Please check your internet connection. If the problem persists, Firebase services might be temporarily unavailable.';
      }
      
      // Check for quota exceeded (common during development)
      if (lowerMessage.includes('quota') || errorCode.includes('quota-exceeded')) {
        return 'Authentication quota exceeded. This might be a temporary Firebase limitation. Please try again later.';
      }
      
      // Generic but more informative message
      return `Authentication error: ${originalMessage || 'Please try again later.'}`;
  }
};

// Helper to detect service-related errors
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

// Enhanced error handler with detailed logging
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

// Check Firebase service status
const checkFirebaseStatus = async (): Promise<{ isUp: boolean; message?: string }> => {
  try {
    console.log('🔍 Checking Firebase service status...');
    const response = await fetch('https://firebase.googleapis.com/$discovery/rest?version=v1', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log('✅ Firebase services appear to be reachable');
    return { isUp: true };
  } catch (error) {
    console.error('❌ Firebase services unreachable:', error);
    return { 
      isUp: false, 
      message: 'Unable to reach Firebase services. Please check your internet connection.' 
    };
  }
};

// Submit user registration - UPDATED WITH METRICS
export const submitUserRegistration = async (userData: UserRegistrationData): Promise<{success: boolean; error?: string; uid?: string}> => {
  try {
    console.log('🚀 Starting registration submission for:', userData.email);
    
    // Check Firebase status first
    const status = await checkFirebaseStatus();
    if (!status.isUp) {
      return { 
        success: false, 
        error: 'Firebase services are currently unavailable. Please check your internet connection and try again.' 
      };
    }

    // Create auth account
    console.log('🔐 Creating Firebase auth account...');
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const { uid } = userCredential.user;
    console.log('✅ Auth account created with UID:', uid);

    // Prepare user document data
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

    console.log('💾 Saving user data to Firestore:', userDocData);
    
    // Store in users collection
    await setDoc(doc(db, 'users', uid), userDocData);
    console.log('✅ User data saved to Firestore');

    // ✅ FIXED: Initialize user metrics - call the method correctly
    try {
      await UserMetricsService.initializeUserMetrics(uid, userData.role);
      console.log('📊 User metrics initialized for role:', userData.role);
    } catch (metricsError) {
      console.warn('⚠️ Failed to initialize user metrics, but user was created:', metricsError);
      // Don't fail the entire registration if metrics fail
    }

    console.log('👤 User remains authenticated for file upload process');
    
    return { success: true, uid };
  } catch (error: any) {
    console.error('❌ Registration submission failed:', error);
    
    const { userMessage, isServiceIssue } = handleAuthError(error);
    
    // If we created the auth user but failed to save to Firestore, try to cleanup
    if (auth.currentUser) {
      try {
        console.log('🧹 Cleaning up auth user due to failure...');
        await auth.currentUser.delete();
        console.log('✅ Auth user cleanup successful');
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
    
    return { 
      success: false,
      error: finalErrorMessage 
    };
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
    console.log('User verification document updated successfully');
  } catch (error) {
    console.error('Error updating user verification document:', error);
    throw new Error('Failed to update verification document');
  }
};

// Login function
export const signInUser = async (email: string, password: string): Promise<{success: boolean; error?: string; userData?: UserData}> => {
  try {
    console.log('🔐 Attempting login for:', email);
    
    // Check Firebase status first
    const status = await checkFirebaseStatus();
    if (!status.isUp) {
      return { 
        success: false, 
        error: 'Firebase services are currently unavailable. Please check your internet connection and try again.' 
      };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;
    console.log('✅ Firebase auth successful for UID:', uid);

    // Check if user exists in Firestore
    console.log('🔍 Checking user data in Firestore...');
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      console.error('❌ User document not found in Firestore for UID:', uid);
      await signOut(auth);
      return { 
        success: false, 
        error: 'Account not found. Please contact support.' 
      };
    }

    const userData = userDoc.data() as UserData;
    console.log('📋 User data retrieved:', { 
      uid: userData.uid, 
      status: userData.status, 
      role: userData.role 
    });
    
    if (userData.status !== USER_STATUS.APPROVED) {
      console.warn('⚠️ User not approved, status:', userData.status);
      await signOut(auth);
      return { 
        success: false, 
        error: 'Your account is pending approval. Please wait for administrator approval.' 
      };
    }

    console.log('✅ Login successful for user:', userData.email);
    return { success: true, userData };
  } catch (error: any) {
    console.error('❌ Login failed:', error);
    
    const { userMessage, isServiceIssue } = handleAuthError(error);
    let finalErrorMessage = userMessage;
    
    if (isServiceIssue) {
      const status = await checkFirebaseStatus();
      if (!status.isUp) {
        finalErrorMessage += ' Firebase services appear to be down.';
      }
    }
    
    return { 
      success: false, 
      error: finalErrorMessage 
    };
  }
};

// Check if user is logged in and approved
export const checkAuthStatus = async (): Promise<{isLoggedIn: boolean; userData?: UserData; error?: string}> => {
  try {
    console.log('🔍 Checking auth status...');
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return { isLoggedIn: false };
    }

    console.log('👤 Current user UID:', user.uid);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.error('❌ User document not found for UID:', user.uid);
      await signOut(auth);
      return { 
        isLoggedIn: false, 
        error: 'Account not found.' 
      };
    }

    const userData = userDoc.data() as UserData;
    console.log('📋 User status:', userData.status);
    
    if (userData.status !== USER_STATUS.APPROVED) {
      console.warn('⚠️ User not approved, status:', userData.status);
      await signOut(auth);
      return { 
        isLoggedIn: false, 
        error: 'Your account is pending approval.' 
      };
    }

    console.log('✅ Auth status check passed for user:', userData.email);
    return { isLoggedIn: true, userData };
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
    return { 
      isLoggedIn: false, 
      error: 'Failed to verify authentication status.' 
    };
  }
};

// Check registration status
export const checkRegistrationStatus = async (): Promise<{status: 'pending' | 'approved' | 'rejected' | 'not_found'; data?: UserData}> => {
  try {
    console.log('🔍 Checking registration status...');
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ No user authenticated');
      return { status: 'not_found' };
    }

    console.log('👤 Checking registration for UID:', user.uid);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      console.log('📋 Registration status found:', userData.status);
      return { status: userData.status as 'pending' | 'approved' | 'rejected', data: userData };
    }

    console.log('❌ No registration data found for user');
    return { status: 'not_found' };
  } catch (error) {
    console.error('❌ Error checking registration status:', error);
    return { status: 'not_found' };
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    console.log('🚪 Logging out user...');
    await signOut(auth);
    console.log('✅ User logged out successfully');
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
      console.log('❌ No user authenticated');
      return null;
    }

    console.log('🔍 Getting user data for UID:', user.uid);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      if (userData.status === USER_STATUS.APPROVED) {
        console.log('✅ User data retrieved successfully');
        return userData;
      } else {
        console.warn('⚠️ User not approved, status:', userData.status);
      }
    } else {
      console.error('❌ User document not found');
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
    console.log('📝 Updating user profile...');
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Verify user is approved before allowing profile update
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.error('❌ User account not found');
      return { success: false, error: 'User account not found' };
    }

    const userData = userDoc.data() as UserData;
    if (userData.status !== USER_STATUS.APPROVED) {
      console.error('❌ User not approved, status:', userData.status);
      return { success: false, error: 'Only approved users can update profiles' };
    }

    await updateDoc(doc(db, 'users', user.uid), {
      profile: profileData,
      updatedAt: new Date()
    });

    console.log('✅ Profile updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error updating user profile:', error);
    return { 
      success: false, 
      error: 'Failed to update profile. Please try again.' 
    };
  }
};

// Export error helpers for external use
export { getAuthErrorMessage, isServiceError, checkFirebaseStatus, handleAuthError };