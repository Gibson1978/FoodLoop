// src/Firebase/userReport
import { collection, addDoc} from 'firebase/firestore';
import { db } from '../Firebase/firebase';

// In your reports.ts - update the Report interface
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

export const reportService = {
  // Submit a new report
 async submitReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...report,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw new Error('Failed to submit report');
    }
  }
};