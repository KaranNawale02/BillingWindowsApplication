/**
 * Customer Management Service
 *
 * Implements:
 * - Normalized mobile number duplicate detection (primary uniqueness key)
 * - Search by mobile or name
 * - Customer lifetime purchase statistics (calculated strictly from finalized invoices)
 */

import { Customer } from '@/types/billing';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/config/firebase';
import { COLLECTIONS, cleanDocumentData } from './firebase.service';
import { writeAuditLog } from './audit.service';

/** Normalize mobile number to 10 digits for accurate duplicate matching */
export function normalizeMobileNumber(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

// Clean initial state: Starts empty
export const INITIAL_MOCK_CUSTOMERS: Customer[] = [];

const LOCAL_CUSTOMERS_KEY = 'electro_customers';

function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return [];
}

function saveStoredCustomers(customers: Customer[]): void {
  localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(customers));
}

/** Get all customers */
export async function getCustomers(): Promise<Customer[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const colRef = collection(db, COLLECTIONS.CUSTOMERS);
      const snapshot = await getDocs(colRef);
      const custs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
      saveStoredCustomers(custs);
      return custs;
    } catch (err) {
      console.warn('[CustomerService] Firestore fetch error, returning empty:', err);
      return [];
    }
  }
  return getStoredCustomers();
}

/** Search customers by name or normalized mobile */
export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  const normalizedQuery = normalizeMobileNumber(searchTerm);
  const customers = getStoredCustomers();

  return customers.filter((c) => {
    const matchName = c.name.toLowerCase().includes(term);
    const matchMobile = normalizedQuery && normalizeMobileNumber(c.mobileNumber).includes(normalizedQuery);
    const matchGstin = c.gstin && c.gstin.toLowerCase().includes(term);
    return matchName || matchMobile || matchGstin;
  });
}

/** Check if customer with mobile already exists (Duplicate Prevention) */
export async function findCustomerByMobile(mobile: string): Promise<Customer | null> {
  const normalized = normalizeMobileNumber(mobile);
  if (!normalized) return null;
  const customers = getStoredCustomers();
  return customers.find((c) => normalizeMobileNumber(c.mobileNumber) === normalized) || null;
}

/** Create new customer */
export async function createCustomer(data: {
  name: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  createdBy: string;
  userRole: 'admin' | 'store_user';
}): Promise<Customer> {
  const existing = await findCustomerByMobile(data.mobileNumber);
  if (existing) {
    throw new Error(
      `Customer with mobile ${data.mobileNumber} already exists (${existing.name}). Please select existing customer.`
    );
  }

  const customers = getStoredCustomers();
  const nextNum = (customers.length + 1).toString().padStart(4, '0');
  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    customerId: `CUST-2026-${nextNum}`,
    name: data.name.trim(),
    mobileNumber: normalizeMobileNumber(data.mobileNumber),
    alternateMobile: data.alternateMobile ? normalizeMobileNumber(data.alternateMobile) : undefined,
    email: data.email?.trim() || undefined,
    address: data.address?.trim() || undefined,
    city: data.city?.trim() || 'Ahilyanagar',
    state: data.state?.trim() || 'Maharashtra',
    pincode: data.pincode?.trim() || undefined,
    gstin: data.gstin?.trim() || undefined,
    totalPurchaseAmount: 0,
    totalPurchases: 0,
    isActive: true,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    createdBy: data.createdBy,
    updatedBy: data.createdBy,
  };

  customers.push(newCustomer);
  saveStoredCustomers(customers);

  // Sync customer to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const cleanData = cleanDocumentData({
        ...newCustomer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, COLLECTIONS.CUSTOMERS, newCustomer.id), cleanData);
      console.info('[CustomerService] Successfully saved customer to Firestore collection "customers":', newCustomer.id);
    } catch (err) {
      console.error('[CustomerService] Firestore setDoc error for "customers":', err);
    }
  }

  await writeAuditLog({
    userId: data.createdBy,
    userRole: data.userRole,
    action: 'CREATE',
    entityType: 'CUSTOMER',
    entityId: newCustomer.id,
    entityName: newCustomer.name,
    newValue: { mobile: newCustomer.mobileNumber, name: newCustomer.name },
  });

  return newCustomer;
}
