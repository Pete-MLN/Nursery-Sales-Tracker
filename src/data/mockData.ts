import { PlantItem, Order, Customer, RecentUpload, Employee } from '../types';
import defaultPlantImg from '../assets/images/default_maple_leaf_1786202948974.jpg';

export const DEFAULT_PLANT_IMAGE = defaultPlantImg;

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Alex Rivera',
    email: 'alex@maplelanenursery.com',
    phone: '(555) 234-5678',
    role: 'Operations Lead',
    department: 'Logistics',
    status: 'Active'
  },
  {
    id: 'emp-2',
    name: 'Maria Santos',
    email: 'maria@maplelanenursery.com',
    phone: '(555) 876-5432',
    role: 'Greenhouse Supervisor',
    department: 'Plant Care',
    status: 'Active'
  },
  {
    id: 'emp-3',
    name: 'David Chen',
    email: 'david.chen@maplelanenursery.com',
    phone: '(555) 345-6789',
    role: 'Inventory Specialist',
    department: 'Warehouse',
    status: 'Active'
  },
  {
    id: 'emp-4',
    name: 'Sarah Miller',
    email: 'sarah.m@maplelanenursery.com',
    phone: '(555) 987-6543',
    role: 'Order Fulfillment',
    department: 'Sales & Delivery',
    status: 'Active'
  }
];

export const INITIAL_PLANTS: PlantItem[] = [
  {
    id: 'p1',
    name: 'Golden Pothos',
    lightRequirement: 'LOW LIGHT',
    price: 22.50,
    image: DEFAULT_PLANT_IMAGE,
    stock: 85,
    status: 'healthy',
    barcode: '89012345601',
  },
  {
    id: 'p2',
    name: 'Fiddle Leaf Fig',
    lightRequirement: 'BRIGHT INDIRECT',
    price: 65.00,
    image: DEFAULT_PLANT_IMAGE,
    stock: 12,
    status: 'warning',
    barcode: '89012345602',
  },
  {
    id: 'p3',
    name: 'Monstera Deliciosa (8")',
    lightRequirement: 'BRIGHT INDIRECT',
    price: 45.00,
    image: DEFAULT_PLANT_IMAGE,
    stock: 4,
    status: 'critical',
    barcode: '89012345603',
  },
  {
    id: 'p4',
    name: 'Ficus Lyrata (10")',
    lightRequirement: 'BRIGHT LIGHT',
    price: 78.00,
    image: DEFAULT_PLANT_IMAGE,
    stock: 12,
    status: 'warning',
    barcode: '89012345604',
  },
  {
    id: 'p5',
    name: 'Pothos Golden (6")',
    lightRequirement: 'LOW LIGHT',
    price: 18.00,
    image: DEFAULT_PLANT_IMAGE,
    stock: 85,
    status: 'healthy',
    barcode: '89012345605',
  },
  {
    id: 'p6',
    name: 'Snake Plant Laurentii',
    lightRequirement: 'LOW TO BRIGHT',
    price: 29.99,
    image: DEFAULT_PLANT_IMAGE,
    stock: 42,
    status: 'healthy',
    barcode: '89012345606',
  },
  {
    id: 'p7',
    name: 'Succulent Concrete Arrangement',
    lightRequirement: 'FULL SUN',
    price: 34.00,
    image: DEFAULT_PLANT_IMAGE,
    stock: 28,
    status: 'healthy',
    barcode: '89012345607',
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Sarah J.', type: 'RETAIL', recent: true },
  { id: 'c2', name: 'Green Gardens LLC', type: 'WHOLESALE', recent: true },
  { id: 'c3', name: 'Mike T.', type: 'RETAIL', recent: true },
  { id: 'c4', name: 'Oakridge Landscaping', type: 'COMMERCIAL' },
  { id: 'c5', name: 'Sarah Jenkins', type: 'RETAIL' }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-992',
    customerName: 'Sarah Jenkins',
    itemsCount: 2,
    total: 87.50,
    type: 'Pickup',
    scheduledTime: '2:00 PM',
    status: 'Pending',
    date: 'Today',
    holdingLocation: 'Greenhouse B, Aisle 4, Bay 12',
    items: [
      {
        plant: INITIAL_PLANTS[0], // Golden Pothos
        quantity: 1,
      },
      {
        plant: INITIAL_PLANTS[1], // Fiddle Leaf Fig
        quantity: 1,
      }
    ]
  },
  {
    id: 'ORD-994',
    customerName: 'Green Gardens LLC',
    itemsCount: 5,
    total: 245.00,
    type: 'Delivery',
    scheduledTime: '4:30 PM',
    status: 'Pending',
    date: 'Today',
    holdingLocation: 'Holding Area C - Staging Freight',
    items: [
      { plant: INITIAL_PLANTS[2], quantity: 2 },
      { plant: INITIAL_PLANTS[6], quantity: 3 }
    ]
  },
  {
    id: 'ORD-90210-A',
    customerName: 'Sarah Jenkins',
    itemsCount: 14,
    total: 1450.00,
    type: 'Take Now',
    scheduledTime: '10/27/2023',
    status: 'Ready for Pickup',
    date: 'Oct 24, 2023',
    holdingLocation: 'Greenhouse B, Aisle 4, Bay 12',
    items: [
      { plant: INITIAL_PLANTS[0], quantity: 3 },
      { plant: INITIAL_PLANTS[1], quantity: 2 },
      { plant: INITIAL_PLANTS[3], quantity: 5 }
    ]
  }
];

export const INITIAL_UPLOADS: RecentUpload[] = [
  {
    id: 'u1',
    filename: 'inventory_Q3_final.csv',
    date: 'Oct 24, 2023',
    time: '14:32',
    size: '1.4 MB',
    recordsCount: 1240
  },
  {
    id: 'u2',
    filename: 'wholesale_clients_list.xlsx',
    date: 'Oct 22, 2023',
    time: '09:15',
    size: '850 KB',
    recordsCount: 380
  },
  {
    id: 'u3',
    filename: 'autumn_stock_adjustments.csv',
    date: 'Oct 18, 2023',
    time: '16:45',
    size: '420 KB',
    recordsCount: 150
  }
];

export const HOLDING_AREAS = [
  {
    id: 'area_a',
    title: 'Holding Area A',
    subtitle: 'North Greenhouse, Aisles 1-5',
    icon: 'warehouse',
  },
  {
    id: 'area_b',
    title: 'Holding Area B',
    subtitle: 'Outdoor Shade Structure',
    icon: 'deck',
  },
  {
    id: 'area_c',
    title: 'Holding Area C',
    subtitle: 'Staging for Outbound Freight',
    icon: 'local_shipping',
  },
  {
    id: 'left_in_place',
    title: 'Left in Place',
    subtitle: 'Keep in current physical location',
    icon: 'pin_drop',
  }
];
