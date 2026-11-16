/**
 * Inventory & Stock Management Service
 *
 * Manages raw materials, electronic components, stock adjustments,
 * and immutable stock movement ledgers.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/config/firebase';
import { COLLECTIONS, cleanDocumentData } from './firebase.service';
import type { InventoryItem, StockMovement, StockAdjustment, AdjustmentReason, UnitOfMeasurement } from '@/types/inventory';

// Clean initial state: Starts empty so user can add custom items and verify updates
export const INITIAL_MOCK_INVENTORY: InventoryItem[] = [];

const LOCAL_ITEMS_KEY = 'electro_inventory_items';
const RESET_FLAG_KEY = 'electro_clean_slate_v4';

function checkCleanSlate(): void {
  try {
    if (localStorage.getItem(RESET_FLAG_KEY) !== 'true') {
      localStorage.removeItem(LOCAL_ITEMS_KEY);
      localStorage.removeItem('electro_finished_products');
      localStorage.removeItem('electro_customers');
      localStorage.removeItem('electro_invoices');
      localStorage.removeItem('electro_stock_adjustments');
      localStorage.removeItem('electro_stock_movements');
      localStorage.removeItem('electro_product_boms');
      localStorage.removeItem('electro_production_batches');
      localStorage.setItem(RESET_FLAG_KEY, 'true');
    }
  } catch (err) {
    console.error(err);
  }
}

// Run clean slate check on import
checkCleanSlate();

function getStoredItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ITEMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return [];
}

function saveStoredItems(items: InventoryItem[]): void {
  localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(items));
}

/** Get all inventory items */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const colRef = collection(db, COLLECTIONS.INVENTORY_ITEMS);
      const snapshot = await getDocs(colRef);
      let items = snapshot.docs
        .map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            currentStock: Number(raw.currentStock ?? raw.stock ?? raw.quantity ?? raw.initialStock ?? 0),
            purchasePrice: Number(raw.purchasePrice ?? raw.costPrice ?? raw.unitCost ?? 0),
            sellingPrice: raw.sellingPrice !== undefined ? Number(raw.sellingPrice) : undefined,
            mrp: raw.mrp !== undefined ? Number(raw.mrp) : undefined,
            soldCount: Number(raw.soldCount ?? raw.soldItems ?? raw.totalSold ?? 0),
          } as unknown as InventoryItem;
        })
        .filter((item) => item.isActive !== false);

      // Check fallback collection 'inventory_components' if primary collection was empty
      if (items.length === 0) {
        try {
          const altSnap = await getDocs(collection(db, 'inventory_components'));
          if (altSnap.size > 0) {
            items = altSnap.docs
              .map((d) => {
                const raw = d.data();
                return {
                  id: d.id,
                  ...raw,
                  currentStock: Number(raw.currentStock ?? raw.stock ?? raw.quantity ?? raw.initialStock ?? 0),
                  purchasePrice: Number(raw.purchasePrice ?? raw.costPrice ?? raw.unitCost ?? 0),
                  sellingPrice: raw.sellingPrice !== undefined ? Number(raw.sellingPrice) : undefined,
                  mrp: raw.mrp !== undefined ? Number(raw.mrp) : undefined,
                  soldCount: Number(raw.soldCount ?? raw.soldItems ?? raw.totalSold ?? 0),
                } as unknown as InventoryItem;
              })
              .filter((item) => item.isActive !== false);
          }
        } catch (_) {}
      }

      if (items.length > 0) {
        saveStoredItems(items);
        return items;
      }
    } catch (err) {
      console.warn('[InventoryService] Fetching from Firestore failed, fallback to local storage:', err);
    }
  }
  return getStoredItems();
}

/** Add a new inventory item / raw material (Admin role) */
export async function addInventoryItem(
  payload: {
    name: string;
    category: string;
    description?: string;
    manufacturer?: string;
    modelNumber?: string;
    partNumber?: string;
    unit: UnitOfMeasurement;
    purchasePrice: number;
    sellingPrice?: number;
    mrp?: number;
    initialStock: number;
    minimumStock: number;
    bufferStock?: number;
    supplierName?: string;
    barcode?: string;
  },
  adminUserId: string
): Promise<InventoryItem> {
  const items = getStoredItems();
  const nextNum = (items.length + 1).toString().padStart(4, '0');
  const now = new Date();

  const newItem: InventoryItem = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    itemCode: `INV-RAW-${nextNum}`,
    name: payload.name.trim(),
    category: payload.category || 'General Components',
    description: payload.description?.trim(),
    manufacturer: payload.manufacturer?.trim(),
    modelNumber: payload.modelNumber?.trim(),
    partNumber: payload.partNumber?.trim(),
    unit: payload.unit || 'pcs',
    purchasePrice: Number(payload.purchasePrice) || 0,
    sellingPrice: payload.sellingPrice !== undefined ? Number(payload.sellingPrice) : undefined,
    mrp: payload.mrp !== undefined ? Number(payload.mrp) : undefined,
    currentStock: Number(payload.initialStock) || 0,
    minimumStock: Number(payload.minimumStock) || 5,
    bufferStock: Number(payload.bufferStock) || 0,
    supplierName: payload.supplierName?.trim(),
    barcode: payload.barcode?.trim() || undefined,
    isActive: true,
    createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    createdBy: adminUserId,
    updatedBy: adminUserId,
  };

  items.unshift(newItem);
  saveStoredItems(items);

  // Write directly to Cloud Firestore when configured
  if (isFirebaseConfigured() && db) {
    try {
      const cleanData = cleanDocumentData({
        ...newItem,
        currentStock: Number(newItem.currentStock) || 0,
        stock: Number(newItem.currentStock) || 0,
        quantity: Number(newItem.currentStock) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, COLLECTIONS.INVENTORY_ITEMS, newItem.id), cleanData);
      console.info('[InventoryService] Successfully saved item to Firestore collection "inventory_items":', newItem.id);
    } catch (err: any) {
      console.error('[InventoryService] Firestore setDoc error for "inventory_items":', err);
      // Attempt write to fallback collection 'inventory_components'
      try {
        const cleanData = cleanDocumentData({
          ...newItem,
          currentStock: Number(newItem.currentStock) || 0,
          stock: Number(newItem.currentStock) || 0,
          quantity: Number(newItem.currentStock) || 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'inventory_components', newItem.id), cleanData);
        console.info('[InventoryService] Successfully saved item to fallback collection "inventory_components":', newItem.id);
      } catch (fbErr: any) {
        console.error('[InventoryService] Both collections failed to save in Firestore:', fbErr);
        throw new Error(
          `Firebase Error: ${err?.message || 'Permission denied'}. Please ensure Firestore security rules allow read/write to "inventory_items".`
        );
      }
    }
  }

  return newItem;
}

/** Sync all local inventory items to Firestore */
export async function syncLocalInventoryToFirestore(): Promise<{ synced: number; failed: number }> {
  if (!isFirebaseConfigured() || !db) return { synced: 0, failed: 0 };
  const items = getStoredItems();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const cleanData = cleanDocumentData({
        ...item,
        currentStock: Number(item.currentStock) || 0,
        stock: Number(item.currentStock) || 0,
        quantity: Number(item.currentStock) || 0,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, COLLECTIONS.INVENTORY_ITEMS, item.id), cleanData);
      synced++;
    } catch (e) {
      failed++;
    }
  }
  return { synced, failed };
}

/** Update an existing inventory item */
export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>,
  adminUserId: string
): Promise<InventoryItem> {
  const items = getStoredItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) throw new Error(`Item ${id} not found.`);

  const old = items[index];
  const updated: InventoryItem = {
    ...old,
    ...updates,
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    updatedBy: adminUserId,
  };

  items[index] = updated;
  saveStoredItems(items);

  // Sync update to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const cleanUpdates = cleanDocumentData({
        ...updates,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTIONS.INVENTORY_ITEMS, id), cleanUpdates);
    } catch (err) {
      try {
        const cleanUpdates = cleanDocumentData({
          ...updates,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'inventory_components', id), cleanUpdates);
      } catch (_) {}
    }
  }

  return updated;
}

/** Delete / Deactivate an inventory item */
export async function deleteInventoryItem(id: string, adminUserId: string): Promise<void> {
  const items = getStoredItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return;

  const item = items[index];
  items.splice(index, 1);
  saveStoredItems(items);

  // Sync deletion to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.INVENTORY_ITEMS, id));
    } catch (err) {
      try {
        await deleteDoc(doc(db, 'inventory_components', id));
      } catch (_) {}
    }
  }
}

/** Get low stock inventory items */
export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getInventoryItems();
  return items.filter((item) => item.currentStock <= item.minimumStock);
}

/** Record manual stock adjustment with required audit log */
export async function recordStockAdjustment(params: {
  itemId: string;
  newStock: number;
  reason: AdjustmentReason;
  customReason?: string;
  notes?: string;
  adminUserId: string;
  adminUserRole: 'admin';
}): Promise<{ adjustment: StockAdjustment; item: InventoryItem }> {
  const items = getStoredItems();
  const itemIndex = items.findIndex((i) => i.id === params.itemId);

  if (itemIndex === -1) {
    throw new Error(`Inventory item with ID ${params.itemId} not found.`);
  }

  const item = items[itemIndex];
  const previousStock = item.currentStock;
  const difference = params.newStock - previousStock;

  const adjustment: StockAdjustment = {
    id: `adj-${Date.now()}`,
    itemId: item.id,
    itemName: item.name,
    previousStock,
    newStock: params.newStock,
    difference,
    adjustmentReason: params.reason,
    customReason: params.customReason,
    notes: params.notes,
    stockMovementId: `mov-${Date.now()}`,
    adjustmentDate: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    createdBy: params.adminUserId,
    updatedBy: params.adminUserId,
  };

  item.currentStock = params.newStock;
  items[itemIndex] = item;
  saveStoredItems(items);

  // Sync adjustment to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, COLLECTIONS.INVENTORY_ITEMS, item.id), {
        currentStock: params.newStock,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, COLLECTIONS.STOCK_ADJUSTMENTS, adjustment.id), cleanDocumentData({
        ...adjustment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    } catch (err) {
      console.error('[InventoryService] Firestore adjustment sync error:', err);
    }
  }

  return { adjustment, item };
}
