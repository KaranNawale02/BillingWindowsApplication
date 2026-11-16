/**
 * Customer management types.
 */

/** Customer record */
export interface Customer {
  id: string;
  customerName: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  gstin?: string;
  totalPurchaseAmount: number;
  totalPurchaseCount: number;
  lastPurchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/** Customer search result */
export interface CustomerSearchResult {
  customer: Customer;
  matchedOn: 'name' | 'mobile' | 'email';
  score: number;
}

/** Form data for creating/editing a customer */
export interface CustomerFormData {
  customerName: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

/** Customer purchase summary for display */
export interface CustomerPurchaseSummary {
  customerId: string;
  customerName: string;
  totalPurchaseAmount: number;
  totalInvoices: number;
  lastPurchaseDate?: Date;
  averageOrderValue: number;
}
