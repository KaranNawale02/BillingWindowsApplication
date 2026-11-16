/**
 * Authentication Service
 *
 * Supports both live Firebase Auth with Firestore user roles,
 * and seamless fallback with realistic mock users for development.
 */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db, isFirebaseConfigured, firebaseConfig } from '@/config/firebase';
import { COLLECTIONS } from './firebase.service';
import type { AppUser, UserRole } from '@/types/auth';

const STORAGE_KEY_MOCK_USER = 'electro_mock_user';
const STORAGE_KEY_ALL_USERS = 'electro_users_list';

export const MOCK_ADMIN_USER: AppUser = {
  uid: 'admin-usr-001',
  id: 'admin-usr-001',
  email: 'admin@kotuleshwar.com',
  displayName: 'Admin Manager',
  role: 'admin',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-11-01'),
  lastLogin: new Date(),
};

export const MOCK_STORE_USER: AppUser = {
  uid: 'store-usr-002',
  id: 'store-usr-002',
  email: 'billing@kotuleshwar.com',
  displayName: 'POS Cashier / Store Operator',
  role: 'store_user',
  isActive: true,
  createdAt: new Date('2026-02-15'),
  updatedAt: new Date('2026-11-01'),
  lastLogin: new Date(),
};

const DEFAULT_MOCK_USERS: AppUser[] = [MOCK_ADMIN_USER, MOCK_STORE_USER];

function getStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALL_USERS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(DEFAULT_MOCK_USERS));
  return DEFAULT_MOCK_USERS;
}

function saveStoredUsers(users: AppUser[]): void {
  localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(users));
}

type AuthStateCallback = (appUser: AppUser | null, firebaseUser: FirebaseUser | null) => void;
const subscribers: Set<AuthStateCallback> = new Set();

function notifySubscribers(appUser: AppUser | null, fbUser: FirebaseUser | null = null) {
  subscribers.forEach((cb) => cb(appUser, fbUser));
}

/** Subscribe to auth state changes */
export function subscribeToAuthState(callback: AuthStateCallback): () => void {
  subscribers.add(callback);

  if (isFirebaseConfigured() && auth) {
    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && db) {
        try {
          const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            const appUser: AppUser = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: data.displayName || firebaseUser.displayName || 'User',
              role: (data.role as UserRole) || 'store_user',
              isActive: data.isActive ?? true,
              storeId: data.storeId,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
              lastLogin: new Date(),
            };
            callback(appUser, firebaseUser);
            return;
          }
        } catch (err) {
          console.error('[AuthService] Error fetching user role from Firestore:', err);
        }
      }
      callback(null, null);
    });

    return () => {
      subscribers.delete(callback);
      unsubscribeFirebase();
    };
  } else {
    // Offline / Mock mode: read persisted mock session
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MOCK_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        callback({ ...parsed, createdAt: new Date(parsed.createdAt), updatedAt: new Date(parsed.updatedAt) }, null);
      } else {
        callback(null, null);
      }
    } catch {
      callback(null, null);
    }

    return () => {
      subscribers.delete(callback);
    };
  }
}

/** Backwards-compatible alias for subscribeToAuthState */
export const onAuthChange = (callback: (user: AppUser | null) => void) => {
  return subscribeToAuthState((appUser) => callback(appUser));
};

/** Log in with email and password */
export async function loginWithEmailPassword(email: string, password: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();

  // If Firebase is configured and alive, use real Firebase Auth
  if (isFirebaseConfigured() && auth && db) {
    let fbUser: FirebaseUser | null = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      fbUser = cred.user;
    } catch (signInErr: any) {
      console.warn('[AuthService] signInWithEmailAndPassword notice:', signInErr?.code || signInErr?.message);
      // If user does not exist in Firebase Auth yet, auto-register
      if (
        signInErr?.code === 'auth/invalid-credential' ||
        signInErr?.code === 'auth/user-not-found' ||
        signInErr?.code === 'auth/invalid-login-credentials'
      ) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          fbUser = newCred.user;
          console.info('[AuthService] Auto-registered user in Firebase Auth:', fbUser.uid);
        } catch (regErr) {
          console.warn('[AuthService] Auto-registration failed:', regErr);
        }
      }
    }

    if (fbUser) {
      const isAdminRole = cleanEmail.includes('admin');
      let displayName = isAdminRole ? 'Admin Manager' : 'Store Operator';
      let userRole: UserRole = isAdminRole ? 'admin' : 'store_user';

      // Try reading custom profile from Firestore /users if available
      try {
        const userDocRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.displayName) displayName = data.displayName;
          if (data.role) userRole = data.role as UserRole;
        } else {
          // Attempt to create profile if permitted
          await setDoc(userDocRef, {
            uid: fbUser.uid,
            email: cleanEmail,
            displayName,
            role: userRole,
            isActive: true,
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      } catch (_) {}

      const appUser: AppUser = {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: fbUser.email || cleanEmail,
        displayName,
        role: userRole,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
      };

      localStorage.setItem(STORAGE_KEY_MOCK_USER, JSON.stringify(appUser));
      notifySubscribers(appUser, fbUser);
      return appUser;
    }
  }

  // Development Mock Auth fallback
  if (cleanEmail.includes('admin') || cleanEmail === 'admin@electrostore.com') {
    if (password.length < 4) {
      throw new Error('Invalid credentials. Password too short.');
    }
    const adminUser = { ...MOCK_ADMIN_USER, email: cleanEmail, lastLogin: new Date() };
    localStorage.setItem(STORAGE_KEY_MOCK_USER, JSON.stringify(adminUser));
    notifySubscribers(adminUser, null);
    return adminUser;
  }

  if (cleanEmail.includes('store') || cleanEmail.includes('billing') || cleanEmail === 'billing@electrostore.com') {
    if (password.length < 4) {
      throw new Error('Invalid credentials. Password too short.');
    }
    const storeUser = { ...MOCK_STORE_USER, email: cleanEmail, lastLogin: new Date() };
    localStorage.setItem(STORAGE_KEY_MOCK_USER, JSON.stringify(storeUser));
    notifySubscribers(storeUser, null);
    return storeUser;
  }

  // Check custom created mock users
  const customUsers = getStoredUsers();
  const found = customUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (found) {
    if (found.isActive === false) {
      throw new Error('This user account is deactivated.');
    }
    const updated = { ...found, lastLogin: new Date() };
    localStorage.setItem(STORAGE_KEY_MOCK_USER, JSON.stringify(updated));
    notifySubscribers(updated, null);
    return updated;
  }

  throw new Error('Invalid credentials. For quick demo access, use the demo credentials on screen.');
}

/** Log out current session */
export async function logout(): Promise<void> {
  if (isFirebaseConfigured() && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[AuthService] Firebase signOut error:', err);
    }
  }
  localStorage.removeItem(STORAGE_KEY_MOCK_USER);
  notifySubscribers(null, null);
}

/** Fetch all users for Admin User Management */
export async function getAllUsers(): Promise<AppUser[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const colRef = collection(db, COLLECTIONS.USERS);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          id: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || 'Staff Member',
          role: (data.role as UserRole) || 'store_user',
          isActive: data.isActive ?? true,
          storeId: data.storeId,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          lastLogin: data.lastLogin?.toDate?.() || undefined,
        };
      });
    } catch (err) {
      console.warn('[AuthService] Firestore fetch users error, falling back:', err);
    }
  }

  return getStoredUsers();
}

/**
 * Admin Action: Create a new user account (Admin or Store User)
 * In live Firebase, uses a secondary App instance to create Auth credentials
 * without disrupting the currently logged-in Admin session.
 */
export async function createUserAccount(
  payload: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
  },
  adminUserId: string
): Promise<AppUser> {
  const cleanEmail = payload.email.trim().toLowerCase();

  if (isFirebaseConfigured() && db) {
    const secondaryAppName = `SecondaryApp-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Create user in Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        cleanEmail,
        payload.password
      );

      const newUid = userCred.user.uid;

      // 2. Create corresponding user profile in Cloud Firestore
      const userDocRef = doc(db, COLLECTIONS.USERS, newUid);
      const newUserData = {
        uid: newUid,
        email: cleanEmail,
        displayName: payload.displayName.trim(),
        role: payload.role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: adminUserId,
      };

      await setDoc(userDocRef, newUserData);

      // 3. Sign out of secondary auth & delete app instance
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      const createdUser: AppUser = {
        uid: newUid,
        id: newUid,
        email: cleanEmail,
        displayName: payload.displayName.trim(),
        role: payload.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return createdUser;
    } catch (err: any) {
      try {
        await deleteApp(secondaryApp);
      } catch {}
      throw new Error(err.message || 'Failed to create user in Firebase.');
    }
  }

  // Offline / Mock mode fallback
  const users = getStoredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error(`A user with email ${cleanEmail} already exists.`);
  }

  const newMockUser: AppUser = {
    uid: `usr-${Date.now()}`,
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    displayName: payload.displayName.trim(),
    role: payload.role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: undefined,
  };

  users.push(newMockUser);
  saveStoredUsers(users);

  return newMockUser;
}

/** Toggle User Active Status */
export async function toggleUserStatus(userId: string, currentStatus: boolean, adminUserId: string): Promise<void> {
  const newStatus = !currentStatus;

  if (isFirebaseConfigured() && db) {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userDocRef, {
      isActive: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: adminUserId,
    });
  } else {
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.uid === userId);
    if (idx !== -1) {
      users[idx].isActive = newStatus;
      saveStoredUsers(users);
    }
  }
}
