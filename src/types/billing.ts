import { BaseDocument } from './common';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';
export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'cancelled';
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled';

export interface Customer extends BaseDocument {
  customerId: string;     // Auto-generated: CUST-XXXXXX
  name: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  totalPurchaseAmount: number;
  totalPurchases: number;
  lastPurchaseDate?: import('firebase/firestore').Timestamp;
  isActive: boolean;
}

export interface InvoiceItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  itemType?: 'finished_product' | 'inventory_item';
  unit?: string;
  // Snapshot of product at time of invoice — immutable
  productSnapshot: {
    name: string;
    code: string;
    mrp: number;
    sellingPrice: number;
    gstRate: number;
  };
}

export interface Invoice extends BaseDocument {
  invoiceNumber: string;    // Auto-generated: INV-YYYYMMDD-XXXX
  invoiceDate: import('firebase/firestore').Timestamp;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerGstin?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGst: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus;
  notes?: string;
  storeDetails: StoreDetails;
  cancelledAt?: import('firebase/firestore').Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
  stockDeducted: boolean;
}

export interface StoreDetails {
  name: string;
  address: string;
  phone: string;
  email?: string;
  gstin?: string;
  logoUrl?: string;
}

export interface CartItem {
  productId: string;
  productCode: string;
  productName: string;
  mrp: number;
  sellingPrice: number;
  availableStock: number;
  quantity: number;
  discount: number;
  gstRate: number;
  imageUrl?: string;
  itemType?: 'finished_product' | 'inventory_item';
  unit?: string;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
}

export interface CreateCustomerPayload {
  name: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
}

export interface CreateInvoicePayload {
  customerId: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  notes?: string;
}
