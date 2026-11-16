/**
 * Billing, invoice, and payment types.
 */

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';
export type GstType = 'CGST_SGST' | 'IGST' | 'NONE';

/** A line item in an invoice (snapshot at time of purchase) */
export interface InvoiceItem {
  productId: string;
  productName: string;
  productCategory: string;
  barcode?: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number;
  discountPercent: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

/** Cart item while billing (before invoice generation) */
export interface CartItem {
  productId: string;
  productName: string;
  productCategory: string;
  barcode?: string;
  availableStock: number;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  gstRate: number;
}

/** Complete invoice record */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerId?: string;
  customerName: string;
  customerMobile?: string;
  customerAddress?: string;
  customerGstin?: string;

  // Store details snapshot
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeGstin?: string;

  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;

  gstType: GstType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceDue: number;

  status: InvoiceStatus;
  notes?: string;

  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

/** Invoice summary for list views */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  createdByName: string;
}
