/**
 * Authentication and User Management Types
 * Roles: 'admin' | 'store_user'
 */

export type UserRole = 'admin' | 'store_user';

export interface AppUser {
  uid: string;
  id?: string; // backwards compatibility alias for uid
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  storeId?: string;
  createdAt: any;
  updatedAt: any;
  lastLogin?: any;
  profileImageUrl?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface RolePermissions {
  canAccessAdmin: boolean;
  canAccessBilling: boolean;
  canManageInventory: boolean;
  canManageProducts: boolean;
  canManageProduction: boolean;
  canManageRepairs: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canViewCustomers: boolean;
  canCreateInvoices: boolean;
  canViewInvoices: boolean;
  canAdjustStock: boolean;
  canAccessSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessAdmin: true,
    canAccessBilling: false,       // Admin CANNOT access billing or create invoices
    canManageInventory: true,
    canManageProducts: true,
    canManageProduction: true,
    canManageRepairs: true,
    canManageUsers: true,
    canViewReports: true,
    canViewCustomers: true,
    canCreateInvoices: false,      // Admin CANNOT generate bills
    canViewInvoices: true,
    canAdjustStock: true,
    canAccessSettings: true,
  },
  store_user: {
    canAccessAdmin: false,         // Store User CANNOT access admin modules
    canAccessBilling: true,
    canManageInventory: false,
    canManageProducts: false,
    canManageProduction: false,
    canManageRepairs: false,
    canManageUsers: false,
    canViewReports: false,
    canViewCustomers: true,        // Customer lookup & create during billing only
    canCreateInvoices: true,
    canViewInvoices: true,         // Permitted billing history
    canAdjustStock: false,
    canAccessSettings: false,
  },
};

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
