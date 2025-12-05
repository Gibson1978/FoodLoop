// auth.ts
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
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { auth, db } from './Firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Admin App Interfaces
export interface AdminSignupData {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface UserData {
  isAdmin: boolean;
  uid: string;
  email: string;
  role: string;
  status: string;
  profile: {
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
  };
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

// REAL-TIME LISTENER FUNCTIONS
// Real-time listener for pending registrations
export const subscribeToPendingRegistrations = (
  callback: (users: UserData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'users'),
      where('status', '==', USER_STATUS.PENDING),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const pendingUsers: UserData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Exclude admin users from pending registrations
          if (data.role !== USER_ROLES.ADMIN) {
            pendingUsers.push({
              ...data,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate()
            } as UserData);
          }
        });

        callback(pendingUsers);
      },
      (error) => {
        console.error('Error in pending registrations listener:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up pending registrations listener:', error);
    onError?.(error as Error);
    // Return a no-op function if setup fails
    return () => {};
  }
};

// Real-time listener for all users
export const subscribeToAllUsers = (
  callback: (users: UserData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const users: UserData[] = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          // Don't include admin users in the regular user list
          if (userData.role !== USER_ROLES.ADMIN) {
            users.push({
              ...userData,
              createdAt: userData.createdAt?.toDate(),
              updatedAt: userData.updatedAt?.toDate()
            } as UserData);
          }
        });

        callback(users);
      },
      (error) => {
        console.error('Error in all users listener:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up all users listener:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// Real-time listener for rejected users
export const subscribeToRejectedUsers = (
  callback: (users: UserData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'rejectedUsers'),
      orderBy('rejectedAt', 'desc')
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const rejectedUsers: UserData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          rejectedUsers.push({
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            rejectedAt: data.rejectedAt?.toDate()
          } as unknown as UserData);
        });

        callback(rejectedUsers);
      },
      (error) => {
        console.error('Error in rejected users listener:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up rejected users listener:', error);
    onError?.(error as Error);
    return () => {};
  }
};

// ADMIN AUTHENTICATION FUNCTIONS
// Add this function to your auth.ts
export const submitAdminRegistration = async (adminData: AdminSignupData): Promise<{success: boolean; error?: string; uid?: string}> => {
  try {
    console.log('Starting admin registration submission for:', adminData.email);
    
    // Create auth account
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth, 
      adminData.email, 
      adminData.password
    );
    
    const { uid } = userCredential.user;
    
    // Store in users collection with admin role
    const userDocData = {
      uid,
      email: adminData.email,
      role: USER_ROLES.ADMIN,
      status: USER_STATUS.PENDING, // Admin accounts need approval too
      profile: {
        name: adminData.name,
        phone: adminData.phone
      },
      verification: {
        documentUrl: '',
        verified: false,
        documentUploaded: false
      },
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Admin data to save:', userDocData);
    
    // Store in users collection
    await setDoc(doc(db, 'users', uid), userDocData);

    // Sign out immediately since account is not approved yet
    await signOut(auth);

    console.log('Admin successfully saved to Firestore with UID:', uid);
    return { success: true, uid };
  } catch (error: any) {
    console.error('Admin registration submission error:', error);
    
    // If we created the auth user but failed to save to Firestore, delete the auth user
    if (auth.currentUser) {
      try {
        await auth.currentUser.delete();
      } catch (deleteError) {
        console.error('Failed to cleanup auth user:', deleteError);
      }
    }
    
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code) 
    };
  }
};

export const signUpAdmin = async (adminData: AdminSignupData): Promise<{success: boolean; error?: string}> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth, 
      adminData.email, 
      adminData.password
    );
    
    const { uid } = userCredential.user;

    await setDoc(doc(db, 'users', uid), {
      uid,
      email: adminData.email,
      role: USER_ROLES.ADMIN,
      status: USER_STATUS.APPROVED, // Admins are auto-approved
      profile: {
        name: adminData.name,
        phone: adminData.phone
      },
      verification: {
        documentUrl: '',
        verified: true,
        documentUploaded: false
      },
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Admin signup error:', error);
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code) 
    };
  }
};

export const signInAdmin = async (email: string, password: string): Promise<{
  success: boolean; 
  userData?: UserData; 
  error?: string
}> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const user = userCredential.user;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        if (userData.role === USER_ROLES.ADMIN && userData.isAdmin) {
          return { 
            success: true, 
            userData: {
              ...userData,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt
            }
          };
        } else {
          await signOut(auth);
          return { 
            success: false, 
            error: 'Access denied. Admin privileges required.' 
          };
        }
      }
    }
    
    return { 
      success: false, 
      error: 'User data not found after sign in.' 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code)
    };
  }
};

export const logoutAdmin = async (): Promise<void> => {
  await signOut(auth);
};

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user');
      return false;
    }

    console.log('Checking admin status for user:', user.uid);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('User data for admin check:', {
        uid: userData.uid,
        role: userData.role,
        isAdmin: userData.isAdmin,
        status: userData.status
      });
      
      const isAdmin = userData.role === USER_ROLES.ADMIN && userData.isAdmin === true;
      console.log('Is user admin?', isAdmin);
      return isAdmin;
    }
    
    console.log('User document not found');
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// USER MANAGEMENT FUNCTIONS
export const getPendingRegistrations = async (): Promise<{success: boolean; data?: UserData[]; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to view pending registrations' 
      };
    }

    const q = query(
      collection(db, 'users'),
      where('status', '==', USER_STATUS.PENDING),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const pendingUsers: UserData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Exclude admin users from pending registrations
      if (data.role !== USER_ROLES.ADMIN) {
        pendingUsers.push({
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as UserData);
      }
    });

    return { success: true, data: pendingUsers };
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch pending registrations' 
    };
  }
};

export const getAllUsers = async (): Promise<{success: boolean; data?: UserData[]; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to view all users' 
      };
    }

    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const users: UserData[] = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      // Don't include admin users in the regular user list
      if (userData.role !== USER_ROLES.ADMIN) {
        users.push({
          ...userData,
          createdAt: userData.createdAt?.toDate(),
          updatedAt: userData.updatedAt?.toDate()
        } as UserData);
      }
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching all users:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch users' 
    };
  }
};

// Approve user registration - Update status to 'approved'
export const approveUserRegistration = async (userId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to approve users' 
      };
    }

    console.log('Attempting to approve user:', userId);
    console.log('Current admin UID:', auth.currentUser?.uid);

    // Get current user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { 
        success: false, 
        error: 'User not found' 
      };
    }

    const userData = userDoc.data();
    console.log('User data found:', userData);

    await updateDoc(doc(db, 'users', userId), {
      status: USER_STATUS.APPROVED,
      verification: {
        ...userData.verification,
        verified: true
      },
      updatedAt: new Date()
    });

    console.log('User approved successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error approving user registration:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // More specific error messages
    if (error.code === 'permission-denied') {
      return { 
        success: false, 
        error: 'Permission denied. Check Firestore rules and ensure you have admin privileges.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to approve user registration' 
    };
  }
};


// Reject user registration - Move to rejectedUsers collection
export const rejectUserRegistration = async (userId: string, reason?: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to reject users' 
      };
    }

    console.log('Attempting to reject user:', userId);

    // Get the user data first
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { 
        success: false, 
        error: 'User not found' 
      };
    }

    const userData = userDoc.data();
    console.log('User data to reject:', userData);

    // Create a record in rejectedUsers collection
    await setDoc(doc(db, 'rejectedUsers', userId), {
      ...userData,
      rejectionReason: reason || 'Registration rejected by admin',
      rejectedAt: new Date(),
      rejectedBy: auth.currentUser?.uid
    });

    console.log('User moved to rejectedUsers collection');

    // Delete from users collection
    await deleteDoc(doc(db, 'users', userId));

    console.log('User deleted from users collection');
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting user registration:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    if (error.code === 'permission-denied') {
      return { 
        success: false, 
        error: 'Permission denied. Check Firestore rules for rejectedUsers collection.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to reject user registration' 
    };
  }
};

// Get rejected users
export const getRejectedUsers = async (): Promise<{success: boolean; data?: UserData[]; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to view rejected users' 
      };
    }

    const q = query(
      collection(db, 'rejectedUsers'),
      orderBy('rejectedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const rejectedUsers: UserData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rejectedUsers.push({
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate()
      } as unknown as UserData);
    });

    return { success: true, data: rejectedUsers };
  } catch (error) {
    console.error('Error fetching rejected users:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch rejected users' 
    };
  }
};

// Restore rejected user (move back to users collection as pending)
export const restoreRejectedUser = async (userId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to restore users' 
      };
    }

    // Get the rejected user data
    const rejectedDoc = await getDoc(doc(db, 'rejectedUsers', userId));
    if (!rejectedDoc.exists()) {
      return { 
        success: false, 
        error: 'Rejected user not found' 
      };
    }

    const userData = rejectedDoc.data();
    
    // Remove rejection-specific fields and set status back to pending
    const { rejectionReason, rejectedAt, rejectedBy, ...userDataToRestore } = userData;

    // Restore to users collection with pending status
    await setDoc(doc(db, 'users', userId), {
      ...userDataToRestore,
      status: USER_STATUS.PENDING,
      updatedAt: new Date()
    });

    // Delete from rejectedUsers collection
    await deleteDoc(doc(db, 'rejectedUsers', userId));

    return { success: true };
  } catch (error) {
    console.error('Error restoring rejected user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to restore user' 
    };
  }
};

export const suspendUser = async (userId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to suspend users' 
      };
    }

    await updateDoc(doc(db, 'users', userId), {
      status: USER_STATUS.REJECTED,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error suspending user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to suspend user' 
    };
  }
};

export const activateUser = async (userId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to activate users' 
      };
    }

    await updateDoc(doc(db, 'users', userId), {
      status: USER_STATUS.APPROVED,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error activating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to activate user' 
    };
  }
};

// DELETE USER ACCOUNT FUNCTION (Client-side call to Cloud Function)
export const deleteUserAccount = async (userId: string): Promise<{success: boolean; error?: string}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Admin privileges required to delete users' 
      };
    }

    console.log('Attempting to delete user:', userId);

    // Initialize Cloud Functions
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable<{userId: string}, {success: boolean; message?: string}>(functions, 'deleteUserAccount');

    // Call the Cloud Function with timeout
    const result = await Promise.race([
      deleteUserFunction({ userId }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Function call timeout')), 30000)
      )
    ]);
    
    console.log('Cloud Function response:', result);

    if (result.data.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.data.message || 'Failed to delete user account' 
      };
    }
  } catch (error: any) {
    console.error('Error deleting user account:', error);
    
    // Enhanced error handling
    if (error.code === 'functions/not-found') {
      return { 
        success: false, 
        error: 'Delete function not found. Please deploy the Cloud Function first.' 
      };
    }
    
    if (error.code === 'functions/permission-denied') {
      return { 
        success: false, 
        error: 'Permission denied. Admin privileges required.' 
      };
    }
    
    if (error.code === 'functions/unauthenticated') {
      return { 
        success: false, 
        error: 'Authentication required. Please sign in again.' 
      };
    }

    if (error.code === 'functions/internal') {
      return { 
        success: false, 
        error: 'Server error. The delete function may not be properly deployed or configured.' 
      };
    }

    if (error.message === 'Function call timeout') {
      return { 
        success: false, 
        error: 'Request timeout. The function is taking too long to respond.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to delete user account. Please check if the Cloud Function is deployed.' 
    };
  }
};

// Helper function for user-friendly error messages
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export { Unsubscribe };
