// admin-app/src/services/reportAdmin.ts
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from './Firebase';

interface ReportUnsubscribe extends Unsubscribe {}

const subscribeToPendingReportsCount = (
  callback: (count: number) => void,
  onError?: (error: Error) => void
): ReportUnsubscribe => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      // We only care about the size of the snapshot for the count
      callback(querySnapshot.size);
    }, 
    (error) => {
      console.error('Real-time pending reports count error:', error);
      onError?.(error);
    });
  } catch (error) {
    console.error('Error setting up pending reports count listener:', error);
    onError?.(error as Error);
    return () => {};
  }
};

export { subscribeToPendingReportsCount };

export interface Report {
  id?: string;
  reportType: 'food' | 'campaign' | 'system' | 'user';
  targetId?: string;
  targetName: string;
  reportedUser: {
    id: string;
    name: string;
    email: string;
    type: 'donor' | 'volunteer' | 'receiver';
  };
  reporterUser?: {
    id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidenceUrls?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ⬅️ MIGRATED: Function to call the Cloud Function for atomic update
const adminUpdateReportStatusService = httpsCallable<{ 
  reportId: string, 
  status: Report['status'], 
  adminNotes?: string, 
  resolvedBy?: string 
}, { success: boolean; message: string }>(
  functions, 
  'adminUpdateReportStatus' // Assuming the Cloud Function is named this
);

export const reportAdminService = {
  // Real-time reports subscription - REMAINS ON CLIENT
  subscribeToReports(callback: (reports: Report[]) => void) {
    const q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const reports = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to Date
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate() || undefined,
        } as Report;
      });
      callback(reports);
    });
  },

  // ⬅️ MIGRATED: Update report status - NOW CALLS CLOUD FUNCTION
  async updateReportStatus(
    reportId: string, 
    status: Report['status'], 
    adminNotes?: string, 
    resolvedBy?: string
  ) {
    try {
        const result = await adminUpdateReportStatusService({
            reportId,
            status,
            adminNotes,
            resolvedBy
        });

        if (!result.data.success) {
            throw new Error(result.data.message || 'Server failed to update report.');
        }
    } catch (error) {
        console.error("Error calling adminUpdateReportStatus Cloud Function:", error);
        throw error;
    }
  },

  // Get reports by status - REMAINS ON CLIENT
  async getReportsByStatus(status: Report['status']) {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt?.toDate() || undefined,
    })) as Report[];
  },

  // Get reports by type - REMAINS ON CLIENT
  async getReportsByType(reportType: Report['reportType']) {
    const q = query(
      collection(db, 'reports'),
      where('reportType', '==', reportType),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt?.toDate() || undefined,
    })) as Report[];
  }
};