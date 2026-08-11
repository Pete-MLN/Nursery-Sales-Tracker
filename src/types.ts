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
  name: string;
  lightRequirement: string; // e.g., 'LOW LIGHT', 'BRIGHT INDIRECT', 'FULL SUN'
  price: number;
  image: string;
  stock: number;
  status: 'critical' | 'warning' | 'healthy';
  barcode: string;
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
