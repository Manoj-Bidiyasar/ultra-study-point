import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import the Auth service

const firebaseConfig = {
  apiKey: "AIzaSyDWMVhcgMAkKsr2tDV--LLk3uobQx8amBI",
  authDomain: "ultra-study-point.firebaseapp.com",
  projectId: "ultra-study-point",
  storageBucket: "ultra-study-point.firebasestorage.app",
  messagingSenderId: "451199188804",
  appId: "1:451199188804:web:f923c6d7818b8cf52a6111",
  measurementId: "G-LQFLWGYSV3"
};

// Initialize Firebase app only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database
const db = getFirestore(app);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Export both db and auth so they can be used in your pages
export { db, auth };