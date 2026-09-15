import { PlantItem, Order, Customer, RecentUpload, Employee, HoldingArea } from '../types';
import defaultPlantImg from '../assets/images/default_maple_leaf_1786202948974.jpg';

export const DEFAULT_PLANT_IMAGE = defaultPlantImg;

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-pete',
    name: 'Pete',
    email: 'pete@maplelanenursery.com',
    phone: '518-227-1235',
    role: 'Nursery Manager / Owner',
    department: 'Management',
    status: 'Active'
  },
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

export const INITIAL_PLANTS: PlantItem[] = [];

export const DEFAULT_CUSTOMER: Customer = {
  id: 'cust-cash',
  name: 'Walk In Customer',
  accountNo: 'CASH',
  type: 'RETAIL',
  categoryCode: 'RET',
  recent: true
};

export const INITIAL_CUSTOMERS: Customer[] = [
  DEFAULT_CUSTOMER,
  { id: 'c1', name: 'Sarah J.', type: 'RETAIL', accountNo: '1001', categoryCode: 'RET', recent: true, email: 'sarah.jenkins@example.com', phone: '(555) 321-7890' },
  { id: 'c2', name: 'Green Gardens LLC', type: 'WHOLESALE', accountNo: '2045', categoryCode: 'WHO', recent: true, company: 'Green Gardens LLC', email: 'orders@greengardensllc.com', phone: '(555) 456-7890' },
  { id: 'c3', name: 'Mike T.', type: 'RETAIL', accountNo: '1002', categoryCode: 'RET', recent: true, email: 'miket@example.com', phone: '(555) 678-9012' },
  { id: 'c4', name: 'Oakridge Landscaping', type: 'COMMERCIAL', accountNo: '3089', categoryCode: 'LAND', company: 'Oakridge Landscaping', email: 'crew@oakridgelandscape.com', phone: '(555) 890-1234' },
  { id: 'c5', name: 'Sarah Jenkins', type: 'RETAIL', accountNo: '1001', categoryCode: 'RET', email: 'sarah.jenkins@example.com', phone: '(555) 321-7890' }
];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_UPLOADS: RecentUpload[] = [];

import { OFFICIAL_YARD_LOCATIONS } from './yardLocations';

export const HOLDING_AREAS: HoldingArea[] = OFFICIAL_YARD_LOCATIONS;
