import { BaseDocument } from './common';

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'production'
  | 'repair'
  | 'adjustment'
  | 'return'
  | 'damaged'
  | 'lost';

export type UnitOfMeasurement = 'pcs' | 'meters' | 'kg' | 'grams' | 'liters' | 'ml' | 'rolls' | 'sheets' | 'sets' | 'pairs';

export interface InventoryItem extends BaseDocument {
  itemCode: string;        // Auto-generated: INV-XXXXXX
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
  currentStock: number;
  minimumStock: number;
  bufferStock: number;
  supplierId?: string;
  supplierName?: string;
  barcode?: string;
  imageUrl?: string;
  isActive: boolean;
  tags?: string[];
}

export interface InventoryCategory extends BaseDocument {
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
}

export interface StockMovement extends BaseDocument {
  itemId: string;
  itemName: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceType?: 'production' | 'repair' | 'adjustment' | 'purchase' | 'sale' | 'invoice';
  referenceNumber?: string;
  notes?: string;
  supplierId?: string;
  unitCost?: number;
}

export interface StockAdjustment extends BaseDocument {
  itemId: string;
  itemName: string;
  previousStock: number;
  newStock: number;
  difference: number;
  adjustmentReason: AdjustmentReason;
  customReason?: string;
  adjustmentDate: import('firebase/firestore').Timestamp;
  notes?: string;
  stockMovementId: string;
}

export type AdjustmentReason =
  | 'physical_count'
  | 'damaged'
  | 'lost'
  | 'found'
  | 'received'
  | 'returned'
  | 'correction'
  | 'other';

export interface AddInventoryItemPayload {
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
  bufferStock: number;
  supplierId?: string;
  barcode?: string;
  tags?: string[];
}

export interface UpdateStockPayload {
  itemId: string;
  quantity: number;
  movementType: StockMovementType;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  unitCost?: number;
}

export interface StockAdjustmentPayload {
  itemId: string;
  newStock: number;
  adjustmentReason: AdjustmentReason;
  customReason?: string;
  notes?: string;
}
