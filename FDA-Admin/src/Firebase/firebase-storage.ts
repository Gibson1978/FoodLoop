// admin-storage.ts
import { 
  ref, 
  getDownloadURL,
  getMetadata ,
} from 'firebase/storage';
import { storage } from './Firebase'; 

/**
 * Get download URL for a verification document (for admin viewing)
 */
export const getVerificationDocumentUrl = async (fileUrl: string): Promise<string> => {
  try {
    // If it's already a full URL, return it
    if (fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    // If it's a storage path, get the download URL
    const fileRef = ref(storage, fileUrl);
    return await getDownloadURL(fileRef);
    
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw new Error('Unable to access verification document');
  }
};

/**
 * Get document metadata (admin function)
 */
export const getDocumentMetadata = async (fileUrl: string) => {
  try {
    const fileRef = ref(storage, fileUrl);
    const metadata = await getMetadata(fileRef);
    
    return {
      name: metadata.name,
      size: metadata.size,
      contentType: metadata.contentType,
      timeCreated: metadata.timeCreated,
      updated: metadata.updated
    };
  } catch (error) {
    console.error('Error getting document metadata:', error);
    return null;
  }
};