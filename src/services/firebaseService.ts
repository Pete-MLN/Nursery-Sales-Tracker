import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlantItem, Customer, Employee, Order, RecentUpload, HoldingArea } from '../types';
import { 
  INITIAL_PLANTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_EMPLOYEES, 
  INITIAL_ORDERS, 
  INITIAL_UPLOADS,
  HOLDING_AREAS
} from '../data/mockData';

const PLANTS_COL = 'plants';
const CUSTOMERS_COL = 'customers';
const EMPLOYEES_COL = 'employees';
const ORDERS_COL = 'orders';
const UPLOADS_COL = 'uploads';
const HOLDING_LOCATIONS_COL = 'holding_locations';

/**
 * Helper to recursively strip undefined properties from an object prior to Firestore operations
 */
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Seed initial mock data into Firestore if collections are empty
 */
export async function seedInitialFirestoreData() {
  try {
    const plantsSnap = await getDocs(collection(db, PLANTS_COL));
    if (plantsSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_PLANTS.forEach((plant) => {
        const ref = doc(db, PLANTS_COL, plant.id);
        batch.set(ref, cleanForFirestore(plant));
      });
      await batch.commit();
      console.log('Firestore: Plants initialized');
    }

    const customersSnap = await getDocs(collection(db, CUSTOMERS_COL));
    if (customersSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_CUSTOMERS.forEach((customer) => {
        const ref = doc(db, CUSTOMERS_COL, customer.id);
        batch.set(ref, cleanForFirestore(customer));
      });
      await batch.commit();
      console.log('Firestore: Customers initialized');
    }

    const employeesSnap = await getDocs(collection(db, EMPLOYEES_COL));
    if (employeesSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_EMPLOYEES.forEach((emp) => {
        const ref = doc(db, EMPLOYEES_COL, emp.id);
        batch.set(ref, cleanForFirestore(emp));
      });
      await batch.commit();
      console.log('Firestore: Employees initialized');
    } else {
      const peteDoc = await getDoc(doc(db, EMPLOYEES_COL, 'emp-pete'));
      if (!peteDoc.exists()) {
        const peteEmp = INITIAL_EMPLOYEES.find(e => e.id === 'emp-pete');
        if (peteEmp) {
          await setDoc(doc(db, EMPLOYEES_COL, 'emp-pete'), cleanForFirestore(peteEmp));
        }
      }
    }

    const uploadsSnap = await getDocs(collection(db, UPLOADS_COL));
    if (uploadsSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_UPLOADS.forEach((upload) => {
        const ref = doc(db, UPLOADS_COL, upload.id);
        batch.set(ref, cleanForFirestore(upload));
      });
      await batch.commit();
      console.log('Firestore: Uploads initialized');
    }

    const holdingSnap = await getDocs(collection(db, HOLDING_LOCATIONS_COL));
    if (holdingSnap.empty) {
      const batch = writeBatch(db);
      HOLDING_AREAS.forEach((area) => {
        const ref = doc(db, HOLDING_LOCATIONS_COL, area.id);
        batch.set(ref, cleanForFirestore(area));
      });
      await batch.commit();
      console.log('Firestore: Holding Locations initialized');
    }

    const ordersSnap = await getDocs(collection(db, ORDERS_COL));
    if (ordersSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_ORDERS.forEach((ord) => {
        const ref = doc(db, ORDERS_COL, ord.id);
        batch.set(ref, cleanForFirestore(ord));
      });
      await batch.commit();
      console.log('Firestore: Orders initialized');
    }
  } catch (err) {
    console.error('Error seeding Firestore data:', err);
  }
}

/* --- Real-Time Subscriptions --- */

export function subscribeToPlants(callback: (plants: PlantItem[]) => void) {
  return onSnapshot(collection(db, PLANTS_COL), (snapshot) => {
    const items: PlantItem[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as PlantItem);
    });
    callback(items);
  }, (err) => console.error('Plants snapshot error:', err));
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  return onSnapshot(collection(db, CUSTOMERS_COL), (snapshot) => {
    const items: Customer[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as Customer);
    });
    callback(items);
  }, (err) => console.error('Customers snapshot error:', err));
}

export function subscribeToEmployees(callback: (employees: Employee[]) => void) {
  return onSnapshot(collection(db, EMPLOYEES_COL), (snapshot) => {
    const items: Employee[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as Employee);
    });
    callback(items);
  }, (err) => console.error('Employees snapshot error:', err));
}

export function subscribeToOrders(callback: (orders: Order[]) => void) {
  return onSnapshot(collection(db, ORDERS_COL), (snapshot) => {
    const items: Order[] = [];
    snapshot.forEach((doc) => {
      const order = doc.data() as Order;
      if (order && order.id && !order.id.startsWith('ORD-DRAFT-')) {
        items.push(order);
      }
    });
    callback(items);
  }, (err) => console.error('Orders snapshot error:', err));
}

export function subscribeToUploads(callback: (uploads: RecentUpload[]) => void) {
  return onSnapshot(collection(db, UPLOADS_COL), (snapshot) => {
    const items: RecentUpload[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as RecentUpload);
    });
    callback(items);
  }, (err) => console.error('Uploads snapshot error:', err));
}

export function subscribeToHoldingLocations(callback: (areas: HoldingArea[]) => void) {
  return onSnapshot(collection(db, HOLDING_LOCATIONS_COL), (snapshot) => {
    const items: HoldingArea[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as HoldingArea);
    });
    callback(items);
  }, (err) => console.error('Holding locations snapshot error:', err));
}

/* --- CRUD Helpers --- */

export async function savePlantToFirestore(plant: PlantItem) {
  await setDoc(doc(db, PLANTS_COL, plant.id), cleanForFirestore(plant), { merge: true });
}

export async function batchSavePlantsToFirestore(plants: PlantItem[]) {
  try {
    // Firestore batch limit is 500
    const chunkSize = 400;
    for (let i = 0; i < plants.length; i += chunkSize) {
      const chunk = plants.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((plant) => {
        const ref = doc(db, PLANTS_COL, plant.id);
        batch.set(ref, cleanForFirestore(plant), { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error batch saving plants to Firestore:', err);
  }
}

export async function saveCustomerToFirestore(customer: Customer) {
  await setDoc(doc(db, CUSTOMERS_COL, customer.id), cleanForFirestore(customer), { merge: true });
}

export async function batchSaveCustomersToFirestore(customers: Customer[]) {
  try {
    const chunkSize = 400;
    for (let i = 0; i < customers.length; i += chunkSize) {
      const chunk = customers.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((cust) => {
        const ref = doc(db, CUSTOMERS_COL, cust.id);
        batch.set(ref, cleanForFirestore(cust), { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error batch saving customers to Firestore:', err);
  }
}

export async function deleteCustomerFromFirestore(id: string) {
  await deleteDoc(doc(db, CUSTOMERS_COL, id));
}

export async function saveEmployeeToFirestore(employee: Employee) {
  await setDoc(doc(db, EMPLOYEES_COL, employee.id), cleanForFirestore(employee), { merge: true });
}

export async function deleteEmployeeFromFirestore(id: string) {
  await deleteDoc(doc(db, EMPLOYEES_COL, id));
}

export async function saveOrderToFirestore(order: Order) {
  await setDoc(doc(db, ORDERS_COL, order.id), cleanForFirestore(order), { merge: true });
}

export async function deleteOrderFromFirestore(id: string) {
  await deleteDoc(doc(db, ORDERS_COL, id));
}

export async function saveUploadToFirestore(upload: RecentUpload) {
  await setDoc(doc(db, UPLOADS_COL, upload.id), cleanForFirestore(upload), { merge: true });
}

export async function saveHoldingLocationToFirestore(area: HoldingArea) {
  await setDoc(doc(db, HOLDING_LOCATIONS_COL, area.id), cleanForFirestore(area), { merge: true });
}

export async function batchSaveHoldingLocationsToFirestore(areas: HoldingArea[]) {
  try {
    const batch = writeBatch(db);
    areas.forEach((area) => {
      const ref = doc(db, HOLDING_LOCATIONS_COL, area.id);
      batch.set(ref, cleanForFirestore(area), { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error batch saving holding locations to Firestore:', err);
  }
}

export async function deleteHoldingLocationFromFirestore(id: string) {
  await deleteDoc(doc(db, HOLDING_LOCATIONS_COL, id));
}
