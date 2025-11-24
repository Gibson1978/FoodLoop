// Firebase/firebase-storage.ts
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { storage, auth } from './firebase';

/**
 * Uploads verification document to Firebase Storage in the Authentication Folder
 * Returns the download URL to be stored in Firestore
 */
export const uploadVerificationDocument = async (file: File, userId?: string): Promise<string> => {
  try {
    console.log('Starting file upload process...');
    console.log('File details:', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      userId 
    });

    let userUID: string;

    if (userId) {
      // Use provided userId (for registration before auth creation)
      userUID = userId;
      console.log('Using provided userId:', userUID);
    } else {
      // Use current authenticated user
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('User must be authenticated to upload files');
      }
      userUID = user.uid;
      console.log('Using authenticated user UID:', userUID);
    }

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, or PDF files only.');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `verification-${timestamp}.${fileExtension}`;
    
    // Use the existing "Authentication Folder" structure
    const storageRef = ref(storage, `Authentication_Folder/${userUID}/${fileName}`);
    
    console.log('Uploading to path:', `Authentication_Folder/${userUID}/${fileName}`);
    
    // Upload file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userUID,
        originalName: file.name,
        uploadTime: new Date().toISOString()
      }
    };
    
    console.log('Starting uploadBytes...');
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('Upload completed, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Document uploaded successfully to Authentication Folder. URL:', downloadURL);
    return downloadURL;
    
  } catch (error) {
    console.error('Error uploading verification document:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('Storage access denied. Please check your Firebase Storage rules.');
      } else if (error.message.includes('storage/retry-limit-exceeded')) {
        throw new Error('Upload failed due to network issues. Please try again.');
      } else if (error.message.includes('storage/unknown')) {
        throw new Error('Unknown storage error occurred. Please try again.');
      }
      throw error;
    }
    
    throw new Error('Failed to upload verification document. Please try again.');
  }
};

/**
 * Upload food images to Food Images folder
 */
export const uploadFoodImage = async (file: File, userId: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `food-${timestamp}.${fileExtension}`;
    
    const storageRef = ref(storage, `Food_Images/${userId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Food image uploaded successfully. URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading food image:', error);
    throw new Error('Failed to upload food image. Please try again.');
  }
};

/**
 * Upload campaign images to Campaign Images folder
 */
export const uploadCampaignImage = async (file: File, userId: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `campaign-${timestamp}.${fileExtension}`;
    
    const storageRef = ref(storage, `Campaign_Images/${userId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Campaign image uploaded successfully. URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading campaign image:', error);
    throw new Error('Failed to upload campaign image. Please try again.');
  }
};

export const uploadReportEvidence = async (file: File, userId?: string): Promise<string> => {
  try {
    console.log('Starting report evidence upload process...');
    console.log('File details:', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      userId 
    });

    let userUID: string;

    if (userId) {
      userUID = userId;
      console.log('Using provided userId:', userUID);
    } else {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('User must be authenticated to upload report evidence');
      }
      userUID = user.uid;
      console.log('Using authenticated user UID:', userUID);
    }

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/heic', 'image/heif'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, PDF, or HEIC files only.');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `evidence-${timestamp}.${fileExtension}`;
    
    // Use the "Report_Evidence_Folder" structure
    const storageRef = ref(storage, `Report_Evidence_Folder/${userUID}/${fileName}`);
    
    console.log('Uploading to path:', `Report_Evidence_Folder/${userUID}/${fileName}`);
    
    // Upload file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userUID,
        originalName: file.name,
        uploadTime: new Date().toISOString(),
        purpose: 'report_evidence'
      }
    };
    
    console.log('Starting uploadBytes for report evidence...');
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('Upload completed, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Report evidence uploaded successfully. URL:', downloadURL);
    return downloadURL;
    
  } catch (error) {
    console.error('Error uploading report evidence:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('Storage access denied. Please check your Firebase Storage rules.');
      } else if (error.message.includes('storage/retry-limit-exceeded')) {
        throw new Error('Upload failed due to network issues. Please try again.');
      } else if (error.message.includes('storage/unknown')) {
        throw new Error('Unknown storage error occurred. Please try again.');
      }
      throw error;
    }
    
    throw new Error('Failed to upload report evidence. Please try again.');
  }
};