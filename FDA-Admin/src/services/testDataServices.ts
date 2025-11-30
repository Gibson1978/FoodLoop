// services/testDataService.ts
import { getFunctions, httpsCallable, type HttpsCallableResult } from "firebase/functions";
import app from "../Firebase/Firebase";

export interface TestDataConfig {
  usersCount: number;
  foodListingsCount: number;
  campaignsCount: number;
  pastMonths: number;
  futureDays: number;
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
      const generateTestDataFunction = httpsCallable<TestDataConfig, GenerateTestDataResponse>(
        this.functions, 
        'generateTestData'
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
      const cleanTestDataFunction = httpsCallable<unknown, CleanTestDataResponse>(
        this.functions, 
        'cleanTestData'
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
      return new Error('Operation timed out: The operation took too long. Try with smaller data sets.');
    } else {
      return new Error(error.message || 'Unknown error occurred. Check console for details.');
    }
  }
}

export const testDataService = new TestDataService();