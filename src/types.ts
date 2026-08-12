export type ScreenType = 
  | 'home' 
  | 'scan' 
  | 'inventory'
  | 'orders' 
  | 'finalization' 
  | 'holding_location' 
  | 'data_management' 
  | 'settings' 
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
}

export interface OrderCartItem {
  plant: PlantItem;
  quantity: number;
  gpsLocation?: {
    latitude: number;
    longitude: number;
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
  status: 'Pending' | 'Ready for Pickup' | 'Completed' | 'In Transit';
  date: string;
  items?: OrderCartItem[];
  holdingLocation?: string;
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
