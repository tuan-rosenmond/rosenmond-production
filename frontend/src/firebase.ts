import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDEwsxa9eKXqdOKCq3VhRQn0YrnRWF4aR4",
  authDomain: "rosenmond-produc.firebaseapp.com",
  projectId: "rosenmond-produc",
  storageBucket: "rosenmond-produc.firebasestorage.app",
  messagingSenderId: "193822452089",
  appId: "1:193822452089:web:1a36506388201fb452e7a8",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
}

// Cloud Functions base URL
export const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || "https://europe-west1-rosenmond-produc.cloudfunctions.net";
