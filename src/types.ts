export type ScreenType = 
  | 'home' 
  | 'scan' 
  | 'inventory'
  | 'inventory_audit'
  | 'stock_notifications'
  | 'orders' 
  | 'finalization' 
  | 'holding_location' 
  | 'data_management' 
  | 'settings' 
  | 'instructions' 
  | 'login';

export interface GPSLocationEntry {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number; // Accuracy radius in meters
  timestamp: string;
  label?: string; // Optional user label, e.g. "Bed 4", "Greenhouse 2", "North Yard"
  notes?: string; // Optional notes, e.g. "10 pots", "Back left corner"
  quantity?: number; // Optional count at this specific spot
}

export type DiscountType = 'fixed_price' | 'percentage';
export type MarkdownMethodType = 'percentage' | 'fixed_price' | 'dollar_off';

export interface OrderItemMarkdown {
  type: MarkdownMethodType;
  value: number; // percentage (e.g. 20), fixed price ($15.00), or dollar off ($5.00)
  reason?: string; // Reason description e.g. "Plant Imperfection / Blemish", "Volume / Quantity Deal"
  customReason?: string;
  originalPrice: number; // Base unit price before markdown
  markdownPrice: number; // Final discounted unit price for this order
  savingsPerUnit: number; // Dollar savings per unit
  appliedAt: string; // ISO date timestamp
}

export interface PlantSaleDiscount {
  type: DiscountType; // 'fixed_price' (e.g. $29.99 specific lower price) or 'percentage' (e.g. 20% off)
  value: number; // Specific sale price in dollars OR discount percentage (1-100)
  salePrice?: number; // Precalculated unit sale price
  saleLabel?: string; // Optional label/tag e.g. "Fall Special", "Clearance", "Overstock"
  active: boolean; // Whether the sale is currently enabled
  appliedAt?: string; // ISO date timestamp
}

export interface PlantItem {
  id: string;
  name: string; // Common name or description
  descr?: string; // Directly from uploaded column "DESCR"
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
  saleDiscount?: PlantSaleDiscount; // Sale pricing discount (specific lower price or % off)
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
  gpsLocations?: GPSLocationEntry[];
}

export interface OrderCartItem {
  plant: PlantItem;
  quantity: number;
  selectedPriceLevel?: 'retail' | 'wholesale' | 'gardenCenter' | 'elite';
  selectedPrice?: number;
  saleDiscount?: PlantSaleDiscount; // Snapshot of discount applied to this line item
  orderMarkdown?: OrderItemMarkdown; // Current order only markdown (one-time discount, does NOT touch master inventory)
  originalPrice?: number; // Base retail price prior to discount
  pickedUpQuantity?: number; // Number of units customer has taken (0 to quantity)
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number; // Accuracy radius in meters
    timestamp: string;
  };
  gpsLocations?: GPSLocationEntry[];
  itemNotes?: string;
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
  updatedAt?: string; // ISO 8601 modification timestamp
  modifiedAt?: string; // ISO 8601 modification timestamp alias
  items?: OrderCartItem[];
  holdingLocation?: string;
  notes?: string;
  poNumber?: string; // Optional PO Number or Job/Project Name
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
  categoryCode?: string; // CATEG_COD from CounterPoint (e.g. 'WHO', 'RET', 'LAND', 'GARD')
  priceLevelNo?: string; // PRC_LVL from CounterPoint (e.g. '1', '3', '4', '5')
  defaultPriceLevel?: 'retail' | 'wholesale' | 'gardenCenter' | 'elite';
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
  type?: 'inventory' | 'customer' | 'employee';
}

export interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  isAdmin?: boolean;
  avatarIcon?: string; // e.g. 'crown', 'sprout', 'tree', 'flower', 'leaf', 'shield', etc.
  avatarColor?: string; // hex code
  phone?: string;
  department?: string;
  status?: 'active' | 'inactive';
  password?: string;
  createdAt?: string;
  lastLoginAt?: string;
  isLoggedIn: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  isAdmin: boolean;
  avatarIcon: string;
  avatarColor: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt?: string;
}

export const AVATAR_ICON_OPTIONS = [
  { id: 'crown', label: 'Crown / Admin', emoji: '👑' },
  { id: 'sprout', label: 'Sprout', emoji: '🌱' },
  { id: 'tree', label: 'Pine / Tree', emoji: '🌲' },
  { id: 'flower', label: 'Flora / Flower', emoji: '🌸' },
  { id: 'leaf', label: 'Botanical Leaf', emoji: '🍃' },
  { id: 'shield', label: 'Shield / Guard', emoji: '🛡️' },
  { id: 'sun', label: 'Sunshine', emoji: '☀️' },
  { id: 'tractor', label: 'Tractor / Field', emoji: '🚜' },
  { id: 'truck', label: 'Delivery Truck', emoji: '🚚' },
  { id: 'wrench', label: 'Maintenance / Ops', emoji: '🔧' },
  { id: 'scissors', label: 'Pruners / Shears', emoji: '✂️' },
  { id: 'droplets', label: 'Irrigation', emoji: '💧' },
  { id: 'compass', label: 'Yard Compass', emoji: '🧭' },
  { id: 'star', label: 'Star / Lead', emoji: '⭐' },
  { id: 'heart', label: 'Heart / Care', emoji: '❤️' },
  { id: 'user', label: 'Standard User', emoji: '👤' },
] as const;

export const AVATAR_COLOR_OPTIONS = [
  { hex: '#012d1d', label: 'Deep Forest Green' },
  { hex: '#0e6c4a', label: 'Mid Green' },
  { hex: '#16a34a', label: 'Vibrant Leaf' },
  { hex: '#059669', label: 'Emerald' },
  { hex: '#0284c7', label: 'Sky Blue' },
  { hex: '#1d4ed8', label: 'Royal Blue' },
  { hex: '#7c3aed', label: 'Violet' },
  { hex: '#d97706', label: 'Amber / Sun' },
  { hex: '#dc2626', label: 'Crimson' },
  { hex: '#db2777', label: 'Rose Flora' },
] as const;

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

