
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBACpVUy_Bret45H_PCUlowjnQsyEBBSfQ",
  authDomain: "asraful-tailor.firebaseapp.com",
  projectId: "asraful-tailor",
  storageBucket: "asraful-tailor.appspot.com",
  messagingSenderId: "429079322510",
  appId: "1:429079322510:web:8b33432cd4f3d376c28edf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const auth = getAuth(app);

// Force Bangladesh region for SMS and UI
auth.languageCode = 'bn';

// Set persistence to Local
setPersistence(auth, browserLocalPersistence).catch(console.error);
