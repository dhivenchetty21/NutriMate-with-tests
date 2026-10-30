import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';

/**
 * Firebase setup for the database (Firestore) and login (Auth).
 * These values are public client config read from .env; access is protected
 * by the Firestore security rules (see FIRESTORE-SETUP.md).
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function isFirestoreConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/** Auth uses the same Firebase project, so the same check applies. */
export function isAuthConfigured(): boolean {
  return isFirestoreConfigured();
}

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let dbInstance: Firestore | null = null;

/**
 * Returns the Firestore database, created once. Returns null when Firebase is
 * not configured, and callers then use local storage only.
 */
export function getDb(): Firestore | null {
  if (!isFirestoreConfigured()) return null;

  if (!dbInstance) {
    const app = getFirebaseApp();
    // Long polling is the standard fix for Firestore streaming issues in React Native.
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }

  return dbInstance;
}

let authInstance: Auth | null = null;

/**
 * Returns Firebase Auth, created once, or null when Firebase is not configured.
 * The session is saved in AsyncStorage so users stay signed in after a restart.
 */
export function getAuthInstance(): Auth | null {
  if (!isAuthConfigured()) return null;

  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }

  return authInstance;
}
