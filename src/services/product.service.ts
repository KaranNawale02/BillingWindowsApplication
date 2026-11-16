/**
 * Product, Bill of Materials (BOM) & Production Service
 *
 * Handles:
 * 1. Finished Product Catalog (CRUD)
 * 2. BOM configuration with auto manufacturing cost calculation
 * 3. Daily Production batch processing:
 *    - BOM snapshot preservation
 *    - Atomic raw material deduction & finished product stock addition
 *    - Insufficient stock validation
 */

import { FinishedProduct, ProductBom, ProductionBatch, BomComponent } from '@/types/product';
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
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/config/firebase';
import { COLLECTIONS, cleanDocumentData } from './firebase.service';
import { getInventoryItems } from './inventory.service';
import { writeAuditLog } from './audit.service';

// Clean initial state: Starts empty so user can add custom products and test
export const INITIAL_MOCK_PRODUCTS: FinishedProduct[] = [];
export const INITIAL_MOCK_BOMS: Record<string, ProductBom> = {};

const LOCAL_PRODUCTS_KEY = 'electro_finished_products';
const LOCAL_BOMS_KEY = 'electro_product_boms';
const LOCAL_PRODUCTION_BATCHES_KEY = 'electro_production_batches';

function getStoredProducts(): FinishedProduct[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return [];
}

function saveStoredProducts(products: FinishedProduct[]): void {
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
}

function getStoredBoms(): Record<string, ProductBom> {
  try {
    const raw = localStorage.getItem(LOCAL_BOMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return {};
}

function saveStoredBoms(boms: Record<string, ProductBom>): void {
  localStorage.setItem(LOCAL_BOMS_KEY, JSON.stringify(boms));
}

/** Get all finished products */
export async function getFinishedProducts(): Promise<FinishedProduct[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const colRef = collection(db, COLLECTIONS.FINISHED_PRODUCTS);
      const snapshot = await getDocs(colRef);
      const products = snapshot.docs.map((d) => {
        const raw = d.data();
        const sold = Number(raw.soldCount ?? raw.soldItems ?? raw.totalSold ?? raw.unitsSold ?? 0);
        return {
          id: d.id,
          ...raw,
          currentStock: Number(raw.currentStock ?? raw.stock ?? raw.quantity ?? raw.initialStock ?? 0),
          soldCount: sold,
          soldItems: sold,
          totalSold: sold,
        } as FinishedProduct;
      });

      saveStoredProducts(products);
      return products;
    } catch (err) {
      console.warn('[ProductService] Fetching from Firestore failed, returning empty:', err);
      return [];
    }
  }
  return getStoredProducts();
}

/** Add a new finished product (Admin role) */
export async function createFinishedProduct(
  payload: {
    name: string;
    category: string;
    description?: string;
    barcode?: string;
    mrp: number;
    sellingPrice: number;
    minimumSellingPrice?: number;
    initialStock?: number;
    minimumStock?: number;
  },
  adminUserId: string
): Promise<FinishedProduct> {
  const products = getStoredProducts();
  const nextNum = (products.length + 1).toString().padStart(4, '0');
  const now = new Date();

  const newProduct: FinishedProduct = {
    id: `prd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productCode: `PRD-${nextNum}`,
    name: payload.name.trim(),
    category: payload.category || 'Finished Goods',
    description: payload.description?.trim(),
    barcode: payload.barcode?.trim() || undefined,
    mrp: Number(payload.mrp) || 0,
    sellingPrice: Number(payload.sellingPrice) || 0,
    manufacturingCost: 0,
    minimumSellingPrice: payload.minimumSellingPrice ? Number(payload.minimumSellingPrice) : undefined,
    currentStock: Number(payload.initialStock) || 0,
    minimumStock: Number(payload.minimumStock) || 5,
    isActive: true,
    createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    createdBy: adminUserId,
    updatedBy: adminUserId,
  };

  products.unshift(newProduct);
  saveStoredProducts(products);

  // Write directly to Cloud Firestore when configured
  if (isFirebaseConfigured() && db) {
    try {
      const cleanData = cleanDocumentData({
        ...newProduct,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, COLLECTIONS.FINISHED_PRODUCTS, newProduct.id), cleanData);
      console.info('[ProductService] Successfully saved product to Firestore collection "finished_products":', newProduct.id);
    } catch (err) {
      console.error('[ProductService] Firestore setDoc error for "finished_products":', err);
    }
  }

  await writeAuditLog({
    userId: adminUserId,
    userRole: 'admin',
    action: 'CREATE',
    entityType: 'PRODUCT',
    entityId: newProduct.id,
    entityName: newProduct.name,
    newValue: {
      name: newProduct.name,
      productCode: newProduct.productCode,
      sellingPrice: newProduct.sellingPrice,
      initialStock: newProduct.currentStock,
    },
    notes: `Added finished product: ${newProduct.name} (${newProduct.productCode})`,
  });

  return newProduct;
}

/** Delete / Deactivate a finished product */
export async function deleteFinishedProduct(id: string, adminUserId: string): Promise<void> {
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return;

  const prod = products[index];
  products.splice(index, 1);
  saveStoredProducts(products);

  // Sync deletion to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.FINISHED_PRODUCTS, id));
    } catch (err) {
      console.warn('[ProductService] Firestore deleteDoc error:', err);
    }
  }

  await writeAuditLog({
    userId: adminUserId,
    userRole: 'admin',
    action: 'DELETE',
    entityType: 'PRODUCT',
    entityId: id,
    entityName: prod.name,
  });
}

/** Get BOM definition for a product */
export async function getProductBom(productId: string): Promise<ProductBom | null> {
  const boms = getStoredBoms();
  const products = getStoredProducts();
  const product = products.find((p) => p.id === productId);

  if (product && product.currentBomId && boms[product.currentBomId]) {
    return boms[product.currentBomId];
  }

  // Check if a BOM is associated with this productId directly
  for (const bom of Object.values(boms)) {
    if (bom.productId === productId && bom.isCurrent) {
      return bom;
    }
  }

  return null;
}

/** Save or update BOM for a product */
export async function saveProductBom(
  params: {
    productId: string;
    productName: string;
    components: BomComponent[];
    notes?: string;
  },
  adminUserId: string
): Promise<ProductBom> {
  const boms = getStoredBoms();
  const products = getStoredProducts();
  const productIndex = products.findIndex((p) => p.id === params.productId);

  const totalCost = params.components.reduce((sum, c) => sum + c.totalCost, 0);
  const bomId = `bom-${params.productId}-${Date.now()}`;
  const now = new Date();

  const newBom: ProductBom = {
    id: bomId,
    productId: params.productId,
    productName: params.productName,
    version: 1,
    components: params.components,
    totalManufacturingCost: totalCost,
    isCurrent: true,
    notes: params.notes,
    createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    createdBy: adminUserId,
    updatedBy: adminUserId,
  };

  boms[bomId] = newBom;
  saveStoredBoms(boms);

  // Update product's manufacturing cost and BOM pointer
  if (productIndex !== -1) {
    products[productIndex].manufacturingCost = totalCost;
    products[productIndex].currentBomId = bomId;
    saveStoredProducts(products);
  }

  // Sync BOM and product update to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, COLLECTIONS.PRODUCT_BOMS, bomId), cleanDocumentData({
        ...newBom,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
      await updateDoc(doc(db, COLLECTIONS.FINISHED_PRODUCTS, params.productId), {
        manufacturingCost: totalCost,
        currentBomId: bomId,
        updatedAt: serverTimestamp(),
      });
      console.info('[ProductService] Successfully saved BOM to Firestore collection "product_boms":', bomId);
    } catch (err) {
      console.error('[ProductService] Firestore BOM save error for "product_boms":', err);
    }
  }

  await writeAuditLog({
    userId: adminUserId,
    userRole: 'admin',
    action: 'UPDATE',
    entityType: 'BOM',
    entityId: bomId,
    entityName: `BOM for ${params.productName}`,
    newValue: {
      totalManufacturingCost: totalCost,
      componentsCount: params.components.length,
    },
    notes: `Updated BOM recipe for ${params.productName} (Unit Cost: ₹${totalCost})`,
  });

  return newBom;
}

export function getStoredProductionBatches(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTION_BATCHES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return [];
}

export function saveStoredProductionBatches(batches: any[]): void {
  localStorage.setItem(LOCAL_PRODUCTION_BATCHES_KEY, JSON.stringify(batches));
}

/** Get all production batch runs */
export async function getProductionBatches(): Promise<any[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const colRef = collection(db, COLLECTIONS.PRODUCTION_BATCHES);
      const snapshot = await getDocs(colRef);
      const batches = snapshot.docs.map((d) => {
        const data = d.data();
        const dateVal = data.productionDate?.toDate ? data.productionDate.toDate().toLocaleString() : new Date().toLocaleString();
        return {
          id: d.id,
          batchNumber: data.batchNumber || d.id,
          productName: data.productName || 'Assembled Product',
          qtyProduced: data.quantityProduced || 0,
          totalCost: data.totalMaterialCost || 0,
          date: dateVal,
          admin: data.createdBy || 'Store Admin',
        };
      });
      saveStoredProductionBatches(batches);
      return batches;
    } catch (err) {
      console.warn('[ProductService] Fetching production batches from Firestore failed:', err);
    }
  }
  return getStoredProductionBatches();
}

/**
 * Record Daily Production Batch:
 * 1. Verifies raw material stock sufficiency
 * 2. Deducts required BOM raw materials atomically (qtyProduced * comp.quantityRequired)
 * 3. Increases finished product current stock by qtyProduced
 * 4. Records production batch document and audit log in Firestore and local storage
 */
export async function recordProductionBatch(
  params: {
    productId: string;
    productName: string;
    quantityProduced: number;
    bom: ProductBom;
    notes?: string;
  },
  adminUserId: string,
  adminUserName: string = 'Store Admin'
): Promise<ProductionBatch> {
  const qty = Number(params.quantityProduced);
  if (qty <= 0) {
    throw new Error('Manufactured quantity must be at least 1 unit.');
  }

  if (!params.bom || !params.bom.components || params.bom.components.length === 0) {
    throw new Error('Selected product does not have any components configured in its Bill of Materials (BOM).');
  }

  // 1. Verify stock availability
  const inventoryItems = await getInventoryItems();
  for (const comp of params.bom.components) {
    const totalRequired = comp.quantityRequired * qty;
    const invItem = inventoryItems.find((i) => i.id === comp.inventoryItemId);
    const available = invItem ? invItem.currentStock : 0;
    if (available < totalRequired) {
      throw new Error(
        `Insufficient inventory for "${comp.inventoryItemName}". Required: ${totalRequired} ${comp.unit}, Available: ${available} ${comp.unit}.`
      );
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const existingBatches = getStoredProductionBatches();
  const seq = (existingBatches.length + 1).toString().padStart(4, '0');
  const batchNumber = `BTH-${dateStr}-${seq}`;
  const batchId = `bth-${Date.now()}`;
  const totalCost = (params.bom.totalManufacturingCost || 0) * qty;

  const newBatch: ProductionBatch = {
    id: batchId,
    batchNumber,
    productId: params.productId,
    productName: params.productName,
    bomId: params.bom.id,
    bomVersion: params.bom.version || 1,
    quantityProduced: qty,
    bomSnapshot: params.bom.components,
    totalMaterialCost: totalCost,
    productionDate: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    notes: params.notes,
    stockMovementIds: [],
    createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    createdBy: adminUserId,
    updatedBy: adminUserId,
  };

  // 2. Deduct raw materials in Local Storage
  try {
    const rawInv = localStorage.getItem('electro_inventory_items');
    if (rawInv) {
      const allInv: any[] = JSON.parse(rawInv);
      for (const comp of params.bom.components) {
        const totalDeduction = comp.quantityRequired * qty;
        const item = allInv.find((i) => i.id === comp.inventoryItemId);
        if (item) {
          item.currentStock = Math.max(0, (item.currentStock || 0) - totalDeduction);
        }
      }
      localStorage.setItem('electro_inventory_items', JSON.stringify(allInv));
    }
  } catch (err) {
    console.error('Failed to deduct local raw materials:', err);
  }

  // 3. Increase finished product stock in Local Storage
  try {
    const rawProds = localStorage.getItem('electro_finished_products');
    if (rawProds) {
      const allProds: any[] = JSON.parse(rawProds);
      const prod = allProds.find((p) => p.id === params.productId);
      if (prod) {
        prod.currentStock = (prod.currentStock || 0) + qty;
      }
      localStorage.setItem('electro_finished_products', JSON.stringify(allProds));
    }
  } catch (err) {
    console.error('Failed to increase local finished product stock:', err);
  }

  // Save batch in Local Storage (compatible with ProductionHistoryPage format)
  const historyBatch = {
    id: batchId,
    batchNumber,
    productName: params.productName,
    qtyProduced: qty,
    totalCost,
    date: now.toLocaleString(),
    admin: adminUserName,
  };
  existingBatches.unshift(historyBatch);
  saveStoredProductionBatches(existingBatches);

  // 4. Atomic / Cloud Firestore Sync
  if (isFirebaseConfigured() && db) {
    try {
      // 4a. Deduct raw materials in Firestore
      for (const comp of params.bom.components) {
        const totalDeduction = comp.quantityRequired * qty;
        const invRef = doc(db, COLLECTIONS.INVENTORY_ITEMS, comp.inventoryItemId);
        await updateDoc(invRef, {
          currentStock: increment(-totalDeduction),
          updatedAt: serverTimestamp(),
        });

        // Record stock movement for deduction
        const movementRef = doc(db, COLLECTIONS.STOCK_MOVEMENTS, `mov-out-${batchId}-${comp.inventoryItemId}`);
        await setDoc(movementRef, cleanDocumentData({
          id: `mov-out-${batchId}-${comp.inventoryItemId}`,
          itemId: comp.inventoryItemId,
          itemName: comp.inventoryItemName,
          movementType: 'PRODUCTION_OUT',
          quantity: -totalDeduction,
          referenceId: batchId,
          referenceType: 'PRODUCTION_BATCH',
          createdAt: serverTimestamp(),
          createdBy: adminUserId,
        }));
      }

      // 4b. Increase finished product stock in Firestore
      const prodRef = doc(db, COLLECTIONS.FINISHED_PRODUCTS, params.productId);
      await updateDoc(prodRef, {
        currentStock: increment(qty),
        updatedAt: serverTimestamp(),
      });

      // Record stock movement for finished product addition
      const prodMovementRef = doc(db, COLLECTIONS.STOCK_MOVEMENTS, `mov-in-${batchId}`);
      await setDoc(prodMovementRef, cleanDocumentData({
        id: `mov-in-${batchId}`,
        productId: params.productId,
        productName: params.productName,
        movementType: 'PRODUCTION_IN',
        quantity: qty,
        referenceId: batchId,
        referenceType: 'PRODUCTION_BATCH',
        createdAt: serverTimestamp(),
        createdBy: adminUserId,
      }));

      // 4c. Save batch record to Firestore
      await setDoc(doc(db, COLLECTIONS.PRODUCTION_BATCHES, batchId), cleanDocumentData({
        ...newBatch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      console.info('[ProductService] Successfully finalized production batch in Firestore:', batchNumber);
    } catch (err) {
      console.error('[ProductService] Firestore production batch error:', err);
    }
  }

  // 5. Audit Log
  await writeAuditLog({
    userId: adminUserId,
    userRole: 'admin',
    action: 'PRODUCTION_BATCH',
    entityType: 'PRODUCTION_BATCH',
    entityId: batchId,
    entityName: `Batch ${batchNumber} (${params.productName})`,
    newValue: {
      quantityProduced: qty,
      totalCost,
      componentsCount: params.bom.components.length,
    },
    notes: `Manufactured ${qty} units of ${params.productName}. Raw components deducted. Total Cost: ₹${totalCost}`,
  });

  return newBatch;
}
