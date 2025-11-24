import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase config interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyBSbR4XGJtJR2PHXAUiuFpLmsiWtfOBUYM",
  authDomain: "food-redistribution-app-c088e.firebaseapp.com",
  projectId: "food-redistribution-app-c088e",
  storageBucket: "food-redistribution-app-c088e.firebasestorage.app",
  messagingSenderId: "650017508269",
  appId: "1:650017508269:web:811f476e1f60d34e1e6f24",
  measurementId: "G-KVLY9GJG47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;