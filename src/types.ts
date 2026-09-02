export type ScreenType = 
  | 'home' 
  | 'scan' 
  | 'inventory'
  | 'inventory_audit'
  | 'orders' 
  | 'finalization' 
  | 'holding_location' 
  | 'data_management' 
  | 'settings' 
  | 'instructions'
  | 'login';

export interface PlantItem {
  id: string;
  name: string; // Common name or description
  botanicalName?: string; // DESCR (e.g. Spiraea jap. Little Princess)
  commonName?: string; // ADDL_DESCR_1 (e.g. Little Princess Japanese Spirea)
  itemNo?: string; // ITEM_NO (e.g. 1000)
  size?: string; // STK_UNIT (e.g. 3 GAL, 5 GAL 18/24")
  lightRequirement: string; // e.g., 'LOW LIGHT', 'BRIGHT INDIRECT', 'FULL SUN', 'PARTIAL SUN'
  price: number; // Primary Retail Price (INV_PRC_1)
  prices?: {
    retail?: number; // INV_PRC_1
    wholesale?: number; // INV_PRC_3
    gardenCenter?: number; // INV_PRC_4
    elite?: number; // INV_PRC_5
  };
  image: string;
  stock: number; // QTY_AVAIL
  quantityCommitted?: number; // QTY_COMMIT
  status: 'critical' | 'warning' | 'healthy';
  barcode: string; // BARCOD
  category?: string; // CATEG_SUBCAT (e.g. G_HOUSE/, RE_WHOLE/)
  holdingLocation?: string; // ADDL_DESCR_2 (e.g. F4B)
  subCategoryCode?: string; // SUBCAT_COD
  statusActive?: boolean; // STAT ('A' = active)
  storeLocId?: string; // LOC_ID (e.g. 101)
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number; // Accuracy radius in meters
    timestamp: string;
  };
}

export interface OrderCartItem {
  plant: PlantItem;
  quantity: number;
  selectedPriceLevel?: 'retail' | 'wholesale' | 'gardenCenter' | 'elite';
  selectedPrice?: number;
  pickedUpQuantity?: number; // Number of units customer has taken (0 to quantity)
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number; // Accuracy radius in meters
    timestamp: string;
  };
}

export interface Order {
  id: string;
  customerName: string;
  itemsCount: number;
  total: number;
  type: 'Pickup' | 'Delivery' | 'Take Now' | 'Pick-up/Delivery';
  scheduledTime?: string;
  scheduledDate?: string; // Formatted YYYY-MM-DD or calendar date
  status: 'Pending' | 'Ready for Pickup' | 'Completed' | 'In Transit' | 'Cancelled' | 'Partial Pickup';
  date: string; // Date entered/created (e.g. "Aug 18, 2026")
  createdAt?: string; // ISO 8601 creation timestamp
  items?: OrderCartItem[];
  holdingLocation?: string;
  notes?: string;
  hasPartialPickup?: boolean; // True if customer took only part of order
  remainingItemsCount?: number; // Number of items still awaiting pickup
  pickedUpItemsCount?: number; // Number of items already taken
  remainingPickupDate?: string; // Estimated date for customer to pick up remainder
  partialPickupNotes?: string; // Specific pickup remarks
  completedAt?: string; // Timestamp when order was completed/picked up
  archived?: boolean; // Archived from active order queue
}

export interface Customer {
  id: string;
  name: string;
  type: 'RETAIL' | 'WHOLESALE' | 'COMMERCIAL';
  accountNo?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  recent?: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  status?: 'Active' | 'Inactive';
}

export interface RecentUpload {
  id: string;
  filename: string;
  date: string;
  time: string;
  size?: string;
  recordsCount?: number;
}

export interface User {
  name: string;
  email: string;
  role: string;
  isLoggedIn: boolean;
}

export interface StockAlertSettings {
  criticalThreshold: number;
  warningThreshold: number;
  alertsEnabled: boolean;
}

export interface HoldingArea {
  id: string;
  title: string;
  subtitle: string;
  category?: string; // 'Retail' | 'B&B' | 'Barn Area' | 'Greenhouses' | 'Loading/Staging' | string
  icon: string;
  isCustom?: boolean;
}

export interface CameraSettings {
  timeoutSeconds: number; // 0 for Never, 10, 15, 30, 60, etc.
}

export interface InventoryCountItem {
  id: string; // Unique entry ID (e.g. "cnt-1725280000-01")
  plantId?: string; // Optional link to baseline plant ID
  itemNo: string; // POS Item # / SKU
  name: string; // Plant common / descriptive name
  botanicalName?: string; // Botanical description
  size: string; // Container / Pot size (e.g., 3 GAL, 5 GAL, #10)
  category?: string; // e.g. G_HOUSE/, RE_WHOLE/, SHRUBS
  barcode?: string; // Barcode / UPC
  price?: number; // Unit retail price
  masterStock: number; // Snapshot of baseline stock at time of count (from uploaded inventory)
  countedQuantity: number; // Quantity physically counted for this entry
  countMode: 'total' | 'cycle_additive'; // 'total' (full replacement count) or 'cycle_additive' (adds to multi-bay count)
  yardLocation: string; // Nursery location/bay from dropdown or custom (e.g., "Greenhouse 1", "Bay 4B")
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number; // in meters
    timestamp: string;
  };
  countedBy: string; // Name of person who counted
  timestamp: string; // ISO creation timestamp
  notes?: string; // Condition, damaged, tags missing, etc.
}

export interface InventoryAuditSession {
  id: string; // e.g. "AUDIT-20260902-01"
  title: string; // e.g. "Fall Physical Inventory Count"
  status: 'in_progress' | 'completed';
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  countedBy: string;
  notes?: string;
  items: InventoryCountItem[];
}

