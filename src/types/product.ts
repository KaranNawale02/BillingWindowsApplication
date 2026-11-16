import { BaseDocument } from './common';

export interface FinishedProduct extends BaseDocument {
  productCode: string;    // Auto-generated: PRD-XXXXXX
  name: string;
  description?: string;
  category: string;
  barcode?: string;
  imageUrl?: string;
  mrp: number;
  sellingPrice: number;
  manufacturingCost: number;
  minimumSellingPrice?: number;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  currentBomId?: string;
  tags?: string[];
  soldCount?: number;
  soldItems?: number;
  totalSold?: number;
}

export interface BomComponent {
  inventoryItemId: string;
  inventoryItemName: string;
  partNumber?: string;
  quantityRequired: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface ProductBom extends BaseDocument {
  productId: string;
  productName: string;
  version: number;
  components: BomComponent[];
  totalManufacturingCost: number;
  isCurrent: boolean;
  notes?: string;
}

export interface ProductCategory extends BaseDocument {
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ProductionBatch extends BaseDocument {
  batchNumber: string;    // Auto-generated: BTH-YYYYMMDD-XXXX
  productId: string;
  productName: string;
  bomId: string;
  bomVersion: number;
  quantityProduced: number;
  bomSnapshot: BomComponent[];  // Snapshot at time of production
  totalMaterialCost: number;
  productionDate: import('firebase/firestore').Timestamp;
  notes?: string;
  stockMovementIds: string[];
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  category: string;
  barcode?: string;
  mrp: number;
  sellingPrice: number;
  minimumSellingPrice?: number;
  minimumStock: number;
  tags?: string[];
}

export interface CreateBomPayload {
  productId: string;
  components: Array<{
    inventoryItemId: string;
    quantityRequired: number;
  }>;
  notes?: string;
}

export interface CreateProductionBatchPayload {
  productId: string;
  quantityProduced: number;
  productionDate: Date;
  notes?: string;
}
