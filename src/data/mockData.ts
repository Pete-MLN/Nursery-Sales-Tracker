import { PlantItem, Order, Customer, RecentUpload, Employee, HoldingArea } from '../types';
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
    id: 'p1000',
    itemNo: '1000',
    name: 'Little Princess Japanese Spirea',
    commonName: 'Little Princess Japanese Spirea',
    botanicalName: 'Spiraea jap. Little Princess',
    size: '3 GAL',
    lightRequirement: 'FULL SUN',
    price: 46.80,
    prices: {
      retail: 46.80,
      wholesale: 36.00,
      gardenCenter: 20.00,
      elite: 18.00
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 13,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: '42724',
    category: 'G_HOUSE/',
    holdingLocation: 'F4B',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'p10006',
    itemNo: '10006',
    name: 'Blue Prince Holly',
    commonName: 'Blue Prince Holly',
    botanicalName: 'Ilex m. Blue Prince',
    size: '5 GAL 18/24"',
    lightRequirement: 'PARTIAL SUN',
    price: 72.15,
    prices: {
      retail: 72.15,
      wholesale: 55.50
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 0,
    quantityCommitted: 0,
    status: 'critical',
    barcode: '41198',
    category: 'RE_WHOLE/',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'p10007',
    itemNo: '10007',
    name: 'Kickin® Purple Aster',
    commonName: 'Kickin® Purple Aster',
    botanicalName: 'Aster n. Kickin® Purple',
    size: '2 GAL',
    lightRequirement: 'FULL SUN',
    price: 26.00,
    prices: {
      retail: 26.00,
      wholesale: 20.00
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 0,
    quantityCommitted: 0,
    status: 'critical',
    barcode: '41688',
    category: 'PERN_RE-W/',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'p10008',
    itemNo: '10008',
    name: 'Black-Eyed Susan',
    commonName: 'Black-Eyed Susan',
    botanicalName: 'Rudbeckia f. Goldblitz',
    size: '1 GAL',
    lightRequirement: 'FULL SUN',
    price: 19.00,
    prices: {
      retail: 19.00,
      wholesale: 15.00
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 14,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: '41689',
    category: 'PERN_RE-W/',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'p10009',
    itemNo: '10009',
    name: 'Brown-Eyed Susan',
    commonName: 'Brown-Eyed Susan',
    botanicalName: 'Rudbeckia triloba',
    size: '1 GAL',
    lightRequirement: 'FULL SUN',
    price: 20.15,
    prices: {
      retail: 20.15,
      wholesale: 15.50,
      gardenCenter: 15.50,
      elite: 15.50
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 0,
    quantityCommitted: 0,
    status: 'critical',
    barcode: '41690',
    category: 'PERN_RE-W/',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'p1001',
    itemNo: '1001',
    name: 'Little Princess Japanese Spirea',
    commonName: 'Little Princess Japanese Spirea',
    botanicalName: 'Spiraea jap. Little Princess',
    size: '7 GAL',
    lightRequirement: 'FULL SUN',
    price: 83.20,
    prices: {
      retail: 83.20,
      wholesale: 64.00,
      gardenCenter: 34.00,
      elite: 32.00
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 20,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: '41691',
    category: 'G_HOUSE/',
    holdingLocation: 'F4B',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'p41796',
    itemNo: '41796',
    name: 'Emerald Green Arborvitae',
    commonName: 'Emerald Green Arborvitae',
    botanicalName: 'Thuja occidentalis Emerald',
    size: '3 GAL',
    lightRequirement: 'FULL SUN',
    price: 38.50,
    prices: {
      retail: 38.50,
      wholesale: 29.00,
      gardenCenter: 24.00,
      elite: 22.00
    },
    image: DEFAULT_PLANT_IMAGE,
    stock: 28,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: '41796',
    category: 'EVERGREEN/',
    holdingLocation: 'E2A',
    statusActive: true,
    storeLocId: '101'
  },
  // Bulk Products (MULCH, STONE, TOP SOIL)
  {
    id: 'blk-m1',
    itemNo: 'BLK-M1',
    name: 'Dark Shredded Bark Mulch',
    commonName: 'Dark Shredded Bark Mulch',
    botanicalName: 'Bulk Mulch - Natural Dark Bark',
    size: 'Yard',
    lightRequirement: 'BULK MAT',
    price: 42.00,
    prices: { retail: 42.00, wholesale: 34.00 },
    image: DEFAULT_PLANT_IMAGE,
    stock: 250,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: 'MULCH01',
    category: 'MULCH',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'blk-m2',
    itemNo: 'BLK-M2',
    name: 'Black Dyed Hardwood Mulch',
    commonName: 'Black Dyed Hardwood Mulch',
    botanicalName: 'Bulk Mulch - Black Dyed',
    size: 'Yard',
    lightRequirement: 'BULK MAT',
    price: 45.00,
    prices: { retail: 45.00, wholesale: 36.00 },
    image: DEFAULT_PLANT_IMAGE,
    stock: 180,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: 'MULCH02',
    category: 'MULCH',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'blk-ts1',
    itemNo: 'BLK-TS1',
    name: 'Premium Screened Topsoil',
    commonName: 'Screened Topsoil',
    botanicalName: 'Bulk Soil - Screened Topsoil',
    size: 'Yard',
    lightRequirement: 'BULK MAT',
    price: 38.00,
    prices: { retail: 38.00, wholesale: 30.00 },
    image: DEFAULT_PLANT_IMAGE,
    stock: 320,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: 'SOIL01',
    category: 'TOP SOIL',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'blk-ts2',
    itemNo: 'BLK-TS2',
    name: 'Enriched Compost & Topsoil Mix',
    commonName: 'Compost & Soil Blend',
    botanicalName: 'Bulk Soil - 50/50 Organic Mix',
    size: 'Yard',
    lightRequirement: 'BULK MAT',
    price: 44.00,
    prices: { retail: 44.00, wholesale: 35.00 },
    image: DEFAULT_PLANT_IMAGE,
    stock: 150,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: 'SOIL02',
    category: 'TOP SOIL',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'blk-st1',
    itemNo: 'BLK-ST1',
    name: '3/4" Round River Gravel Stone',
    commonName: '3/4 River Stone',
    botanicalName: 'Bulk Aggregate - River Stone',
    size: 'Ton',
    lightRequirement: 'BULK MAT',
    price: 68.00,
    prices: { retail: 68.00, wholesale: 54.00 },
    image: DEFAULT_PLANT_IMAGE,
    stock: 90,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: 'STONE01',
    category: 'STONE',
    statusActive: true,
    storeLocId: '101'
  },
  {
    id: 'blk-st2',
    itemNo: 'BLK-ST2',
    name: 'Crushed Blue Limestone (3/4")',
    commonName: '3/4 Crushed Blue Stone',
    botanicalName: 'Bulk Aggregate - Crushed Stone',
    size: 'Ton',
    lightRequirement: 'BULK MAT',
    price: 62.00,
    prices: { retail: 62.00, wholesale: 48.00 },
    image: DEFAULT_PLANT_IMAGE,
    stock: 110,
    quantityCommitted: 0,
    status: 'healthy',
    barcode: 'STONE02',
    category: 'STONE',
    statusActive: true,
    storeLocId: '101'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Sarah J.', type: 'RETAIL', recent: true, email: 'sarah.jenkins@example.com', phone: '(555) 321-7890' },
  { id: 'c2', name: 'Green Gardens LLC', type: 'WHOLESALE', recent: true, company: 'Green Gardens LLC', email: 'orders@greengardensllc.com', phone: '(555) 456-7890' },
  { id: 'c3', name: 'Mike T.', type: 'RETAIL', recent: true, email: 'miket@example.com', phone: '(555) 678-9012' },
  { id: 'c4', name: 'Oakridge Landscaping', type: 'COMMERCIAL', company: 'Oakridge Landscaping', email: 'crew@oakridgelandscape.com', phone: '(555) 890-1234' },
  { id: 'c5', name: 'Sarah Jenkins', type: 'RETAIL', email: 'sarah.jenkins@example.com', phone: '(555) 321-7890' }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-992',
    customerName: 'Sarah Jenkins',
    itemsCount: 2,
    total: 87.50,
    type: 'Pickup',
    scheduledTime: '2:00 PM',
    scheduledDate: '2026-08-18',
    status: 'Pending',
    date: 'Aug 18, 2026',
    createdAt: '2026-08-18T08:30:00.000Z',
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
    scheduledDate: '2026-08-18',
    status: 'Pending',
    date: 'Aug 17, 2026',
    createdAt: '2026-08-17T14:15:00.000Z',
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
    scheduledTime: '10:00 AM',
    scheduledDate: '2023-10-27',
    status: 'Ready for Pickup',
    date: 'Oct 24, 2023',
    createdAt: '2023-10-24T09:00:00.000Z',
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

export const HOLDING_AREAS: HoldingArea[] = [
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
