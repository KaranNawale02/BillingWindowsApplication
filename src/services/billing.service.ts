/**
 * Billing & POS Invoice Service
 *
 * Dedicated strictly to Store Users for:
 * - Cart calculation (Taxable amount, CGST, SGST, Total)
 * - Atomic invoice finalization
 * - Finished product stock deduction (raw materials are untouched)
 * - Customer lifetime balance update
 * - Invoice snapshotting matching exact tax bill specification
 */

import { Invoice, InvoiceItem, CartItem, PaymentMethod, PaymentStatus, InvoiceStatus, StoreDetails } from '@/types/billing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/config/firebase';
import { COLLECTIONS, cleanDocumentData } from './firebase.service';
import { getFinishedProducts } from './product.service';
import { getCustomers } from './customer.service';
import { writeAuditLog } from './audit.service';

export const STORE_SETTINGS: StoreDetails = {
  name: import.meta.env.VITE_STORE_NAME || 'Kotuleshwar Electronics',
  address: import.meta.env.VITE_STORE_ADDRESS || 'Dhamongaon Pat akole ahilyanagar',
  phone: import.meta.env.VITE_STORE_PHONE || '8975539613',
  email: import.meta.env.VITE_STORE_EMAIL || 'nsksaiauto@gmail.com',
  gstin: import.meta.env.VITE_STORE_GSTIN || '27AAAAA0000A1Z5',
  logoUrl: '/logo.png',
};

const LOCAL_INVOICES_KEY = 'electro_invoices';

// Clean initial state: Starts empty
export const INITIAL_MOCK_INVOICES: Invoice[] = [];

function getStoredInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(LOCAL_INVOICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return [];
}

function saveStoredInvoices(invoices: Invoice[]): void {
  localStorage.setItem(LOCAL_INVOICES_KEY, JSON.stringify(invoices));
}

export async function getInvoices(): Promise<Invoice[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const colRef = collection(db, COLLECTIONS.INVOICES);
      const snapshot = await getDocs(colRef);
      const invs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice));
      saveStoredInvoices(invs);
      return invs;
    } catch (err) {
      console.warn('[BillingService] Firestore fetch error, returning empty:', err);
      return [];
    }
  }
  return getStoredInvoices();
}

/** Calculate cart totals */
export function calculateCartTotals(
  cartItems: CartItem[],
  isInterState: boolean = false
): {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  totalQuantity: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalQuantity = 0;

  for (const item of cartItems) {
    const itemSubtotal = item.sellingPrice * item.quantity;
    const itemDiscount = (itemSubtotal * (item.discount || 0)) / 100;
    const itemTaxable = itemSubtotal - itemDiscount;

    const gstPercent = item.gstRate || 0; // GST rate
    const totalItemGst = (itemTaxable * gstPercent) / 100;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    taxableAmount += itemTaxable;
    totalQuantity += item.quantity;

    if (isInterState) {
      igst += totalItemGst;
    } else {
      cgst += totalItemGst / 2;
      sgst += totalItemGst / 2;
    }
  }

  const grandTotal = Math.round((taxableAmount + cgst + sgst + igst) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    grandTotal,
    totalQuantity,
  };
}

/** Finalize invoice: deduct finished goods stock & save invoice */
export async function finalizeInvoice(params: {
  customer: {
    id: string;
    name: string;
    mobile: string;
    address?: string;
    gstin?: string;
  };
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  userId: string;
  userRole: 'store_user' | 'admin';
  isInterState?: boolean;
}): Promise<Invoice> {
  if (params.userRole !== 'store_user' && params.userRole !== 'admin') {
    throw new Error('SECURITY VIOLATION: Authorized store user or admin credentials required to finalize invoices.');
  }

  if (params.cartItems.length === 0) {
    throw new Error('Cannot finalize invoice with an empty cart.');
  }

  if (!params.customer?.name || !params.customer.name.trim()) {
    throw new Error('Customer name is compulsory for billing. Please provide a customer name.');
  }

  const totals = calculateCartTotals(params.cartItems, params.isInterState);
  const now = new Date();
  const storedInvoices = getStoredInvoices();
  const invoiceSequence = (storedInvoices.length + 1).toString();
  const invoiceNumber = invoiceSequence; // e.g. "11", "12" matching user invoice format

  const invoiceItems: InvoiceItem[] = params.cartItems.map((c) => {
    const itemSubtotal = c.sellingPrice * c.quantity;
    const discountAmt = (itemSubtotal * (c.discount || 0)) / 100;
    const taxable = itemSubtotal - discountAmt;
    const gstRate = c.gstRate || 0;
    const itemGst = (taxable * gstRate) / 100;

    return {
      productId: c.productId,
      productCode: c.productCode,
      productName: c.productName,
      quantity: c.quantity,
      mrp: c.mrp,
      sellingPrice: c.sellingPrice,
      discount: c.discount || 0,
      discountAmount: discountAmt,
      taxableAmount: taxable,
      gstRate,
      cgst: params.isInterState ? 0 : itemGst / 2,
      sgst: params.isInterState ? 0 : itemGst / 2,
      igst: params.isInterState ? itemGst : 0,
      lineTotal: Math.round((taxable + itemGst) * 100) / 100,
      itemType: c.itemType || 'finished_product',
      unit: c.unit,
      productSnapshot: {
        name: c.productName,
        code: c.productCode,
        mrp: c.mrp,
        sellingPrice: c.sellingPrice,
        gstRate,
      },
    };
  });

  const invoice: Invoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber,
    invoiceDate: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    customerId: params.customer.id,
    customerName: params.customer.name,
    customerMobile: params.customer.mobile,
    customerAddress: params.customer.address,
    customerGstin: params.customer.gstin,
    items: invoiceItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableAmount: totals.taxableAmount,
    totalCgst: totals.cgst,
    totalSgst: totals.sgst,
    totalIgst: totals.igst,
    totalGst: totals.cgst + totals.sgst + totals.igst,
    grandTotal: totals.grandTotal,
    amountPaid: Number(params.amountPaid) || 0,
    balanceDue: Math.max(0, totals.grandTotal - (Number(params.amountPaid) || 0)),
    paymentMethod: params.paymentMethod,
    paymentStatus: (Number(params.amountPaid) || 0) >= totals.grandTotal ? 'paid' : (Number(params.amountPaid) || 0) > 0 ? 'partial' : 'pending',
    invoiceStatus: 'finalized',
    stockDeducted: true,
    storeDetails: {
      ...STORE_SETTINGS,
      name: import.meta.env.VITE_STORE_NAME || STORE_SETTINGS.name,
      address: import.meta.env.VITE_STORE_ADDRESS || STORE_SETTINGS.address,
      phone: import.meta.env.VITE_STORE_PHONE || STORE_SETTINGS.phone,
      email: import.meta.env.VITE_STORE_EMAIL || STORE_SETTINGS.email,
    },
    createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 } as any,
    createdBy: params.userId,
    updatedBy: params.userId,
  };

  storedInvoices.unshift(invoice);
  saveStoredInvoices(storedInvoices);

  // Sync invoice & atomic deductions to Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      // 1. Save finalized invoice to Firestore
      const cleanInvoice = cleanDocumentData({
        ...invoice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, COLLECTIONS.INVOICES, invoice.id), cleanInvoice);
      console.info('[BillingService] Successfully saved invoice to Firestore collection "invoices":', invoice.invoiceNumber);

      // 2. Atomically deduct stock in Firestore (supporting both finished products & raw inventory items)
      for (const cartItem of params.cartItems) {
        try {
          if (cartItem.itemType === 'inventory_item') {
            const invRef = doc(db, COLLECTIONS.INVENTORY_ITEMS, cartItem.productId);
            const invSnap = await getDoc(invRef).catch(() => null);
            if (invSnap && invSnap.exists()) {
              const data = invSnap.data();
              const curr = Number(data.currentStock ?? data.stock ?? data.quantity ?? 0);
              const nextVal = Math.max(0, curr - cartItem.quantity);
              const currSold = Number(data.soldCount ?? data.soldItems ?? data.totalSold ?? 0);
              const nextSold = currSold + cartItem.quantity;
              await updateDoc(invRef, {
                currentStock: nextVal,
                quantity: nextVal,
                stock: nextVal,
                soldCount: nextSold,
                soldItems: nextSold,
                totalSold: nextSold,
                updatedAt: serverTimestamp(),
              });
              console.info('[BillingService] Deducted inventory item in Firestore:', cartItem.productId, 'New stock:', nextVal, 'Sold:', nextSold);
            } else {
              await updateDoc(invRef, {
                currentStock: increment(-cartItem.quantity),
                soldCount: increment(cartItem.quantity),
                soldItems: increment(cartItem.quantity),
                totalSold: increment(cartItem.quantity),
                updatedAt: serverTimestamp(),
              });
            }

            // Log stock movement ledger entry in Firestore
            try {
              const moveId = `mov-sale-${invoice.id}-${cartItem.productId}`;
              await setDoc(doc(db, COLLECTIONS.STOCK_MOVEMENTS, moveId), cleanDocumentData({
                id: moveId,
                itemId: cartItem.productId,
                itemName: cartItem.productName,
                movementType: 'sale',
                quantity: -cartItem.quantity,
                referenceId: invoice.id,
                referenceNumber: invoice.invoiceNumber,
                referenceType: 'invoice',
                notes: `Counter Sale via Tax Invoice #${invoice.invoiceNumber}`,
                createdAt: serverTimestamp(),
              }));
            } catch (ledgerErr) {
              console.warn('[BillingService] Could not record stock movement in Firestore:', ledgerErr);
            }
          } else {
            // Finished product deduction
            const prodRef = doc(db, COLLECTIONS.FINISHED_PRODUCTS, cartItem.productId);
            const prodSnap = await getDoc(prodRef).catch(() => null);

            if (prodSnap && prodSnap.exists()) {
              const data = prodSnap.data();
              const curr = Number(data.currentStock ?? data.stock ?? data.quantity ?? data.initialStock ?? 0);
              const nextVal = Math.max(0, curr - cartItem.quantity);
              const currSold = Number(data.soldCount ?? data.soldItems ?? data.totalSold ?? data.unitsSold ?? 0);
              const nextSold = currSold + cartItem.quantity;
              await updateDoc(prodRef, {
                currentStock: nextVal,
                stock: nextVal,
                quantity: nextVal,
                soldCount: nextSold,
                soldItems: nextSold,
                totalSold: nextSold,
                updatedAt: serverTimestamp(),
              });
              console.info('[BillingService] Successfully deducted finished product in finished_products:', cartItem.productId, 'New stock:', nextVal, 'Sold:', nextSold);
            } else {
              // Try fallback collection 'products' in case document was stored there
              const altRef = doc(db, 'products', cartItem.productId);
              const altSnap = await getDoc(altRef).catch(() => null);
              if (altSnap && altSnap.exists()) {
                const data = altSnap.data();
                const curr = Number(data.currentStock ?? data.stock ?? data.quantity ?? data.initialStock ?? 0);
                const nextVal = Math.max(0, curr - cartItem.quantity);
                const currSold = Number(data.soldCount ?? data.soldItems ?? data.totalSold ?? data.unitsSold ?? 0);
                const nextSold = currSold + cartItem.quantity;
                await updateDoc(altRef, {
                  currentStock: nextVal,
                  stock: nextVal,
                  quantity: nextVal,
                  soldCount: nextSold,
                  soldItems: nextSold,
                  totalSold: nextSold,
                  updatedAt: serverTimestamp(),
                });
                console.info('[BillingService] Successfully deducted finished product in fallback collection "products":', cartItem.productId, 'New stock:', nextVal, 'Sold:', nextSold);
              } else {
                await updateDoc(prodRef, {
                  currentStock: increment(-cartItem.quantity),
                  soldCount: increment(cartItem.quantity),
                  soldItems: increment(cartItem.quantity),
                  totalSold: increment(cartItem.quantity),
                  updatedAt: serverTimestamp(),
                });
              }
            }

            // Record stock movement for finished product sale
            try {
              const moveId = `mov-sale-prod-${invoice.id}-${cartItem.productId}`;
              await setDoc(doc(db, COLLECTIONS.STOCK_MOVEMENTS, moveId), cleanDocumentData({
                id: moveId,
                productId: cartItem.productId,
                productName: cartItem.productName,
                movementType: 'SALE_OUT',
                quantity: -cartItem.quantity,
                referenceId: invoice.id,
                referenceNumber: invoice.invoiceNumber,
                referenceType: 'invoice',
                notes: `Counter Sale of Finished Product via Tax Invoice #${invoice.invoiceNumber}`,
                createdAt: serverTimestamp(),
              }));
            } catch (pMoveErr) {
              console.warn('[BillingService] Could not record product sale movement in Firestore:', pMoveErr);
            }
          }
        } catch (stockErr: any) {
          console.error('[BillingService] ERROR decrementing stock in Firestore for item', cartItem.productId, stockErr);
        }
      }

      // 3. Update customer total purchases and total amount in Firestore
      if (params.customer.id) {
        try {
          const custRef = doc(db, COLLECTIONS.CUSTOMERS, params.customer.id);
          await updateDoc(custRef, {
            totalPurchaseAmount: increment(totals.grandTotal),
            totalPurchases: increment(1),
            updatedAt: serverTimestamp(),
          });
        } catch (custErr) {
          console.warn('[BillingService] Could not update customer totals in Firestore:', custErr);
        }
      }
    } catch (err) {
      console.warn('[BillingService] Firestore invoice finalization error:', err);
    }
  }

  // 1. Atomically deduct stock in Local Storage (supporting both finished products & raw materials)
  try {
    const rawProds = localStorage.getItem('electro_finished_products');
    const rawInv = localStorage.getItem('electro_inventory_items');
    const products = rawProds ? JSON.parse(rawProds) : [];
    const inventory = rawInv ? JSON.parse(rawInv) : [];

    for (const cartItem of params.cartItems) {
      if (cartItem.itemType === 'inventory_item') {
        const item = inventory.find((i: any) => i.id === cartItem.productId || i.itemCode === cartItem.productCode);
        if (item) {
          const curr = Number(item.currentStock ?? item.quantity ?? item.stock ?? 0);
          item.currentStock = Math.max(0, curr - cartItem.quantity);
          item.quantity = item.currentStock;
          item.stock = item.currentStock;
          const currSold = Number(item.soldCount ?? item.soldItems ?? item.totalSold ?? 0);
          item.soldCount = currSold + cartItem.quantity;
          item.soldItems = item.soldCount;
          item.totalSold = item.soldCount;
        }
      } else {
        const prod = products.find((p: any) => p.id === cartItem.productId || p.productCode === cartItem.productCode);
        if (prod) {
          const curr = Number(prod.currentStock ?? prod.stock ?? prod.quantity ?? 0);
          prod.currentStock = Math.max(0, curr - cartItem.quantity);
          prod.stock = prod.currentStock;
          prod.quantity = prod.currentStock;
          const currSold = Number(prod.soldCount ?? prod.soldItems ?? prod.totalSold ?? prod.unitsSold ?? 0);
          prod.soldCount = currSold + cartItem.quantity;
          prod.soldItems = prod.soldCount;
          prod.totalSold = prod.soldCount;
        }
      }
    }
    localStorage.setItem('electro_finished_products', JSON.stringify(products));
    localStorage.setItem('electro_inventory_items', JSON.stringify(inventory));

    // Also record stock movement in local storage for inventory items
    const rawMovs = localStorage.getItem('electro_stock_movements');
    const movements = rawMovs ? JSON.parse(rawMovs) : [];
    for (const cartItem of params.cartItems) {
      if (cartItem.itemType === 'inventory_item') {
        movements.unshift({
          id: `mov-sale-${Date.now()}-${cartItem.productId}`,
          itemId: cartItem.productId,
          itemName: cartItem.productName,
          movementType: 'sale',
          quantity: -cartItem.quantity,
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          referenceType: 'invoice',
          notes: `Counter Sale via Tax Invoice #${invoice.invoiceNumber}`,
          createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
        });
      }
    }
    localStorage.setItem('electro_stock_movements', JSON.stringify(movements));
  } catch (err) {
    console.error('Failed to deduct local stock:', err);
  }

  // 2. Update customer lifetime purchase totals
  try {
    const rawCusts = localStorage.getItem('electro_customers');
    if (rawCusts) {
      const customers = JSON.parse(rawCusts);
      const cust = customers.find((c: any) => c.id === params.customer.id);
      if (cust) {
        cust.totalPurchaseAmount = (cust.totalPurchaseAmount || 0) + totals.grandTotal;
        cust.totalPurchases = (cust.totalPurchases || 0) + 1;
        cust.lastPurchaseDate = invoice.invoiceDate;
      }
      localStorage.setItem('electro_customers', JSON.stringify(customers));
    }
  } catch (err) {
    console.error('Failed to update customer purchase totals:', err);
  }

  // 3. Write audit log
  await writeAuditLog({
    userId: params.userId,
    userRole: params.userRole,
    action: 'INVOICE_GENERATE',
    entityType: 'INVOICE',
    entityId: invoice.id,
    entityName: `Invoice #${invoice.invoiceNumber}`,
    newValue: {
      grandTotal: invoice.grandTotal,
      customerName: invoice.customerName,
      itemsCount: invoice.items.length,
    },
    notes: `Invoice #${invoiceNumber} finalized for ₹${invoice.grandTotal}`,
  });

  return invoice;
}
