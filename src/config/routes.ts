/**
 * Application route constants.
 * Centralized route definitions prevent hardcoded strings across the codebase.
 */

export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    INVENTORY: {
      ROOT: '/admin/inventory',
      ALL_ITEMS: '/admin/inventory/items',
      ADD_ITEM: '/admin/inventory/items/add',
      EDIT_ITEM: (id: string) => `/admin/inventory/items/${id}/edit`,
      ITEM_DETAIL: (id: string) => `/admin/inventory/items/${id}`,
      STOCK_ADJUSTMENTS: '/admin/inventory/adjustments',
      STOCK_MOVEMENTS: '/admin/inventory/movements',
      LOW_STOCK: '/admin/inventory/low-stock',
    },
    PRODUCTS: {
      ROOT: '/admin/products',
      ALL_PRODUCTS: '/admin/products/list',
      ADD_PRODUCT: '/admin/products/add',
      EDIT_PRODUCT: (id: string) => `/admin/products/${id}/edit`,
      PRODUCT_BOM: (id: string) => `/admin/products/${id}/bom`,
    },
    PRODUCTION: {
      ROOT: '/admin/production',
      NEW_ENTRY: '/admin/production/new',
      HISTORY: '/admin/production/history',
    },
    REPAIRS: {
      ROOT: '/admin/repairs',
      NEW_REPAIR: '/admin/repairs/new',
      EDIT_REPAIR: (id: string) => `/admin/repairs/${id}/edit`,
      REPAIR_DETAIL: (id: string) => `/admin/repairs/${id}`,
      HISTORY: '/admin/repairs/history',
    },
    CUSTOMERS: '/admin/customers',
    REPORTS: {
      ROOT: '/admin/reports',
      SALES: '/admin/reports/sales',
      INVENTORY: '/admin/reports/inventory',
      PRODUCTION: '/admin/reports/production',
      REPAIRS: '/admin/reports/repairs',
      INVOICE_HISTORY: '/admin/reports/invoices',
    },
    SUPPLIERS: '/admin/suppliers',
    USER_MANAGEMENT: '/admin/users',
    SETTINGS: '/admin/settings',
    AUDIT_LOGS: '/admin/audit-logs',
  },

  // Store User routes
  STORE: {
    BILLING: '/store/billing',
    CUSTOMERS: '/store/customers',
    BILLING_HISTORY: '/store/billing/history',
    INVOICE_DETAIL: (id: string) => `/store/billing/invoice/${id}`,
  },
} as const;

/** Routes accessible only to Admin role */
export const ADMIN_ROUTES = ['/admin'];

/** Routes accessible only to Store User role */
export const STORE_ROUTES = ['/store'];
