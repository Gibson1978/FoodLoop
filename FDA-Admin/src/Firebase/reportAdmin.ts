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
} from 'firebase/firestore';
import { db } from './Firebase';

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

export const reportAdminService = {
  // Real-time reports subscription
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

  // Update report status
  async updateReportStatus(
    reportId: string, 
    status: Report['status'], 
    adminNotes?: string, 
    resolvedBy?: string
  ) {
    const reportRef = doc(db, 'reports', reportId);
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedAt = new Date();
      if (resolvedBy) {
        updateData.resolvedBy = resolvedBy;
      }
    }

    await updateDoc(reportRef, updateData);
  },

  // Get reports by status
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

  // Get reports by type
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