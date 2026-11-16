/**
 * Firebase Firestore Service Layer
 *
 * Centralized Firestore utilities with support for offline fallback,
 * transactions, batch writes, and server timestamps.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  writeBatch,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
  Firestore,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/config/firebase';

/** Firestore Collections */
export const COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  INVENTORY_ITEMS: 'inventory_items',
  PRODUCT_CATEGORIES: 'product_categories',
  FINISHED_PRODUCTS: 'finished_products',
  PRODUCT_BOMS: 'product_boms',
  PRODUCTION_BATCHES: 'production_batches',
  PRODUCTION_TRANSACTIONS: 'production_transactions',
  REPAIR_RECORDS: 'repair_records',
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  STOCK_MOVEMENTS: 'stock_movements',
  STOCK_ADJUSTMENTS: 'stock_adjustments',
  SUPPLIERS: 'suppliers',
  AUDIT_LOGS: 'audit_logs',
  APPLICATION_SETTINGS: 'application_settings',
} as const;

/** Get a typed CollectionReference */
export function getCollectionRef(collectionName: string): CollectionReference | null {
  if (!db || !isFirebaseConfigured()) return null;
  return collection(db, collectionName);
}

/** Get a typed DocumentReference */
export function getDocRef(collectionName: string, docId: string): DocumentReference | null {
  if (!db || !isFirebaseConfigured()) return null;
  return doc(db, collectionName, docId);
}

/** Server-side timestamp helper */
export const getNowTimestamp = serverTimestamp;

/** Execute atomic Firestore transaction */
export async function executeTransaction<T>(
  updateFunction: (transaction: import('firebase/firestore').Transaction) => Promise<T>
): Promise<T> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured. Cannot execute transaction.');
  }
  return runTransaction(db, updateFunction);
}

/** Batch write helper */
export function createBatch() {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured. Cannot create batch.');
  }
  return writeBatch(db);
}

/** Strips undefined properties recursively so Firestore setDoc / updateDoc never fails */
export function cleanDocumentData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !('_methodName' in value) && // Firestore FieldValue (serverTimestamp, increment, etc.)
      !('seconds' in value)
    ) {
      result[key] = cleanDocumentData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
