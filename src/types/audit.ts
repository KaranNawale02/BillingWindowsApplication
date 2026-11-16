import { BaseDocument, FirestoreTimestamp } from './common';
import { UserRole } from './user';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STOCK_INCREASE'
  | 'STOCK_DECREASE'
  | 'STOCK_ADJUSTMENT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'INVOICE_GENERATE'
  | 'INVOICE_CANCEL'
  | 'PRODUCTION_ENTRY'
  | 'REPAIR_CREATE'
  | 'REPAIR_UPDATE'
  | 'USER_CREATE'
  | 'USER_ROLE_CHANGE'
  | 'SETTINGS_UPDATE';

export type AuditEntityType =
  | 'INVENTORY_ITEM'
  | 'STOCK_ADJUSTMENT'
  | 'PRODUCT'
  | 'BOM'
  | 'PRODUCTION_BATCH'
  | 'REPAIR_RECORD'
  | 'CUSTOMER'
  | 'INVOICE'
  | 'USER'
  | 'SYSTEM_SETTINGS';

export interface AuditLog extends BaseDocument {
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  timestamp: FirestoreTimestamp;
  notes?: string;
}

export interface CreateAuditLogPayload {
  userId: string;
  userEmail?: string;
  userRole: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  notes?: string;
}
