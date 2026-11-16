/**
 * Firebase Configuration and Initialization
 *
 * Credentials are loaded from environment variables ONLY.
 * Never hardcode Firebase credentials here.
 * Configure your credentials in .env.local (not committed to git).
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

/** Firebase configuration loaded exclusively from environment variables */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID &&
    !import.meta.env.VITE_FIREBASE_MEASUREMENT_ID.includes('REPLACE_WITH')
      ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      : undefined,
};

/** Check if Firebase is properly configured with real credentials */
export function isFirebaseConfigured(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  return !!(
    apiKey &&
    !apiKey.includes('REPLACE_WITH') &&
    projectId &&
    !projectId.includes('REPLACE_WITH')
  );
}

/** Check if Firebase credentials have missing fields */
export function getMissingFirebaseEnvVars(): string[] {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  return requiredVars.filter((varName) => {
    const val = import.meta.env[varName];
    return !val || val.includes('REPLACE_WITH');
  });
}

/** Initialize Firebase app (singleton) */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const USE_EMULATORS = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (isFirebaseConfigured()) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
      });
    } catch {
      db = getFirestore(app);
    }
    storage = getStorage(app);

    if (USE_EMULATORS && import.meta.env.DEV) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      console.info('[Firebase] Connected to local emulators');
    }
  } catch (error) {
    console.warn('[Firebase] Initialization error:', error);
  }
} else {
  console.info(
    '[Firebase] Real credentials not detected in .env.local. Running in architecture mock mode.\n' +
    'To connect live Firebase, fill in VITE_FIREBASE_* variables in .env.local.'
  );
}

export { app, auth, db, storage, firebaseConfig };
