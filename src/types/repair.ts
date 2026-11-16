/**
 * Repair management types.
 */

export type RepairStatus =
  | 'RECEIVED'
  | 'UNDER_INSPECTION'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PARTS'
  | 'COMPLETED'
  | 'DELIVERED';

export type RemovedComponentDisposition =
  | 'DISCARDED'
  | 'RETURNED_TO_INVENTORY'
  | 'RETAINED_FOR_INSPECTION';

/** A component used or removed during repair */
export interface RepairComponent {
  componentId: string;
  componentName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isReplacement: boolean;        // true = new part added, false = old part removed
  removedDisposition?: RemovedComponentDisposition;
}

/** Complete repair record */
export interface RepairRecord {
  id: string;
  repairId: string;              // Human-readable repair number (e.g., REP-2026-0001)
  customerName?: string;
  customerContact?: string;
  productName: string;
  productId?: string;
  repairDate: Date;
  problemDescription: string;
  technicianName: string;
  technicianId?: string;
  status: RepairStatus;
  componentsUsed: RepairComponent[];
  repairCost: number;
  labourCost: number;
  totalCost: number;
  notes?: string;
  completedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/** Form data for creating/editing a repair record */
export interface RepairFormData {
  customerName?: string;
  customerContact?: string;
  productName: string;
  productId?: string;
  repairDate: Date;
  problemDescription: string;
  technicianName: string;
  technicianId?: string;
  notes?: string;
}
