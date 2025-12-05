// services/testDataServices.ts
import { getFunctions, httpsCallable, type HttpsCallableResult } from "firebase/functions";
import app, { auth } from "../Firebase/Firebase";

export interface TestDataConfig {
  usersCount: number;
  foodListingsCount: number;
  campaignsCount: number;
  pastMonths: number;
  futureDays: number;
  phase?: 'users' | 'listings' | 'campaigns' | 'relationships' | 'all';
  skipRelationships?: boolean;
}

export interface GenerateTestDataResponse {
  success: boolean;
  message: string;
  results: {
    users: string[];
    foodListings: string[];
    campaigns: string[];
    reservations: string[];
    registrations: string[];
    ratings: string[];
    reports: string[];
  };
  phase?: string;
  totalOperations?: number;
}

export interface CleanTestDataResponse {
  success: boolean;
  message: string;
}

class TestDataService {
  private functions;

  constructor() {
    this.functions = getFunctions(app);
    // Optional: Set region if needed
    // this.functions = getFunctions(app, 'us-central1');
  }

  async generateTestData(config: TestDataConfig): Promise<GenerateTestDataResponse> {
    try {
      // FIX: Added timeout option here
      const generateTestDataFunction = httpsCallable<TestDataConfig, GenerateTestDataResponse>(
        this.functions, 
        'generateTestData',
        { timeout: 540000 } // 9 minutes (matches server timeout)
      );
      
      console.log('Sending generate test data request with config:', config);
      const result: HttpsCallableResult<GenerateTestDataResponse> = await generateTestDataFunction(config);
      console.log('Generate test data response:', result.data);
      
      return result.data;
    } catch (error: any) {
      console.error('Error generating test data:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async cleanTestData(): Promise<CleanTestDataResponse> {
    try {
      // FIX: Added timeout option here as well, just in case cleaning takes time
      const cleanTestDataFunction = httpsCallable<unknown, CleanTestDataResponse>(
        this.functions, 
        'cleanTestData',
        { timeout: 540000 } // 9 minutes
      );
      
      console.log('Sending clean test data request');
      const result: HttpsCallableResult<CleanTestDataResponse> = await cleanTestDataFunction({});
      console.log('Clean test data response:', result.data);
      
      return result.data;
    } catch (error: any) {
      console.error('Error cleaning test data:', error);
      
      // More detailed error logging
      if (error.details) {
        console.error('Error details:', error.details);
      }
      if (error.code) {
        console.error('Error code:', error.code);
      }
      
      throw this.handleFirebaseError(error);
    }
  }

  private handleFirebaseError(error: any): Error {
    console.log('Handling Firebase error:', {
      code: error.code,
      message: error.message,
      details: error.details
    });

    if (error.code === 'permission-denied') {
      return new Error('Permission denied: You need admin privileges to perform this action');
    } else if (error.code === 'unauthenticated') {
      return new Error('Authentication failed: Please log in again');
    } else if (error.code === 'internal') {
      return new Error(`Server error: ${error.message || 'Please check the function logs in Firebase Console'}`);
    } else if (error.code === 'deadline-exceeded') {
      return new Error('Operation timed out on the client. The server might still be processing. Check Firestore in a few minutes.');
    } else {
      return new Error(error.message || 'Unknown error occurred. Check console for details.');
    }
  }

  // Add this to your testDataServices:
  async generateRelationshipsOnly(): Promise<GenerateTestDataResponse> {
    try {
      const generateRelationshipsOnlyFunction = httpsCallable<unknown, GenerateTestDataResponse>(
        this.functions, 
        'generateRelationshipsOnly', // This matches the exported function name in your Cloud Functions
        { timeout: 540000 } // 9 minutes
      );
      
      console.log('Sending generate relationships only request');
      const result: HttpsCallableResult<GenerateTestDataResponse> = await generateRelationshipsOnlyFunction({});
      console.log('Generate relationships only response:', result.data);
      
      return result.data;
    } catch (error: any) {
      console.error('Error generating relationships:', error);
      throw this.handleFirebaseError(error);
    }
  }
}



export const testDataService = new TestDataService();