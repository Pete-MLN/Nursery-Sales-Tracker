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
import { PlantItem, Customer, Employee, Order, RecentUpload, HoldingArea, InventoryAuditSession } from '../types';
import { 
  INITIAL_PLANTS, 
  INITIAL_CUSTOMERS, 
  DEFAULT_CUSTOMER,
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
const INVENTORY_AUDITS_COL = 'inventory_audits';

const handleSnapshotError = (colName: string, err: any) => {
  if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('unavailable') || err?.message?.includes('Could not reach Cloud Firestore')) {
    console.warn(`Firestore [${colName}] operating with offline/local cache:`, err?.message || err);
  } else {
    console.error(`Firestore [${colName}] snapshot error:`, err);
  }
};

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
    // NEVER seed default plants into Firestore. Inventory is populated exclusively by user CSV/Excel uploads or user-created records.

    const customersSnap = await getDocs(collection(db, CUSTOMERS_COL));
    if (customersSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_CUSTOMERS.forEach((customer) => {
        const ref = doc(db, CUSTOMERS_COL, customer.id);
        batch.set(ref, cleanForFirestore(customer));
      });
      await batch.commit();
      console.log('Firestore: Customers initialized');
    } else {
      const cashDoc = await getDoc(doc(db, CUSTOMERS_COL, 'cust-cash'));
      if (!cashDoc.exists()) {
        await setDoc(doc(db, CUSTOMERS_COL, 'cust-cash'), cleanForFirestore(DEFAULT_CUSTOMER));
      }
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
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Could not reach Cloud Firestore')) {
      console.warn('Firestore offline during initial seed check, working with local cache.');
    } else {
      console.error('Error seeding Firestore data:', err);
    }
  }
}

/* --- Real-Time Subscriptions --- */

// Default mock inventory item IDs, item numbers, barcodes, and names to permanently exclude
export const DEFAULT_MOCK_PLANT_IDS = new Set([
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
  'p1000', 'p10006', 'p10007', 'p10007-neg', 'p10008', 'p10009', 'p1001', 'p41796',
  'blk-ts1', 'blk-ts2', 'blk-m1', 'blk-m2', 'blk-st1', 'blk-st2'
]);

export const DEFAULT_MOCK_ITEM_NOS = new Set([
  'BLK-TS1', 'BLK-TS2', 'BLK-M1', 'BLK-M2', 'BLK-ST1', 'BLK-ST2', '10007-NEG'
]);

export const DEFAULT_MOCK_BARCODES = new Set([
  'SOIL01', 'SOIL02', 'MULCH01', 'MULCH02', 'STONE01', 'STONE02'
]);

export function isDefaultMockItem(docId: string, itemNo?: string, barcode?: string, name?: string): boolean {
  const normId = (docId || '').trim().toLowerCase();
  const normItemNo = (itemNo || '').trim().toUpperCase();
  const normBarcode = (barcode || '').trim().toUpperCase();
  const normName = (name || '').trim().toLowerCase();

  if (DEFAULT_MOCK_PLANT_IDS.has(normId)) return true;
  if (normItemNo && DEFAULT_MOCK_ITEM_NOS.has(normItemNo)) return true;
  if (normBarcode && DEFAULT_MOCK_BARCODES.has(normBarcode)) return true;

  if (
    normId.startsWith('blk-') ||
    normItemNo.startsWith('BLK-') ||
    normName.includes('round river gravel') ||
    normName.includes('crushed blue limestone') ||
    normName.includes('premium screened topsoil') ||
    normName.includes('enriched compost & topsoil mix') ||
    (normName.includes('dark shredded') && (normItemNo === 'BLK-M1' || normBarcode === 'MULCH01')) ||
    (normName.includes('black dyed hardwood mulch') && (normItemNo === 'BLK-M2' || normBarcode === 'MULCH02'))
  ) {
    return true;
  }

  return false;
}

export function subscribeToPlants(callback: (plants: PlantItem[]) => void) {
  return onSnapshot(collection(db, PLANTS_COL), (snapshot) => {
    const items: PlantItem[] = [];
    snapshot.forEach((docSnap) => {
      const plant = docSnap.data() as PlantItem;
      const docId = docSnap.id;

      if (isDefaultMockItem(docId, plant.itemNo, plant.barcode, plant.name)) {
        // Auto-purge default mock item from Firestore so it never returns
        deleteDoc(docSnap.ref).catch(() => {});
        return;
      }

      items.push(plant);
    });
    callback(items);
  }, (err) => handleSnapshotError(PLANTS_COL, err));
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  return onSnapshot(collection(db, CUSTOMERS_COL), (snapshot) => {
    const items: Customer[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as Customer);
    });
    callback(items);
  }, (err) => handleSnapshotError(CUSTOMERS_COL, err));
}

export function subscribeToEmployees(callback: (employees: Employee[]) => void) {
  return onSnapshot(collection(db, EMPLOYEES_COL), (snapshot) => {
    const items: Employee[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as Employee);
    });
    callback(items);
  }, (err) => handleSnapshotError(EMPLOYEES_COL, err));
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
  }, (err) => handleSnapshotError(ORDERS_COL, err));
}

export function subscribeToUploads(callback: (uploads: RecentUpload[]) => void) {
  return onSnapshot(collection(db, UPLOADS_COL), (snapshot) => {
    const items: RecentUpload[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as RecentUpload);
    });
    callback(items);
  }, (err) => handleSnapshotError(UPLOADS_COL, err));
}

export function subscribeToHoldingLocations(callback: (areas: HoldingArea[]) => void) {
  return onSnapshot(collection(db, HOLDING_LOCATIONS_COL), (snapshot) => {
    const items: HoldingArea[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as HoldingArea);
    });
    callback(items);
  }, (err) => handleSnapshotError(HOLDING_LOCATIONS_COL, err));
}

export function subscribeToAuditSessions(callback: (audits: InventoryAuditSession[]) => void) {
  return onSnapshot(collection(db, INVENTORY_AUDITS_COL), (snapshot) => {
    const items: InventoryAuditSession[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as InventoryAuditSession);
    });
    callback(items);
  }, (err) => handleSnapshotError(INVENTORY_AUDITS_COL, err));
}

/* --- CRUD Helpers --- */

export async function savePlantToFirestore(plant: PlantItem) {
  await setDoc(doc(db, PLANTS_COL, plant.id), cleanForFirestore(plant), { merge: true });
}

export async function deletePlantFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, PLANTS_COL, id));
  } catch (err) {
    console.error('Error deleting plant from Firestore:', err);
  }
}

/**
 * Permanently purge all default/mock inventory items from Firestore
 */
export async function purgeAllDefaultInventoryItemsFromFirestore() {
  try {
    // 1. Direct deletion of known default mock IDs
    for (const id of DEFAULT_MOCK_PLANT_IDS) {
      try {
        const plantRef = doc(db, PLANTS_COL, id);
        const plantDoc = await getDoc(plantRef);
        if (plantDoc.exists()) {
          await deleteDoc(plantRef);
          console.log(`Permanently purged default plant doc ${id} from Firestore`);
        }
      } catch (e) {
        // Continue
      }
    }

    // 2. Query scan to catch any documents matching default mock criteria
    const plantsSnap = await getDocs(collection(db, PLANTS_COL));
    const batch = writeBatch(db);
    let count = 0;

    plantsSnap.forEach((docSnap) => {
      const data = docSnap.data() as PlantItem;
      const docId = docSnap.id;

      if (isDefaultMockItem(docId, data.itemNo, data.barcode, data.name)) {
        batch.delete(docSnap.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Batch permanently purged ${count} default mock items from Firestore`);
    }
  } catch (err) {
    console.warn('Could not complete default items purge from Firestore:', err);
  }
}

// Alias for backwards compatibility
export const purgeUnwantedDefaultProductsFromFirestore = purgeAllDefaultInventoryItemsFromFirestore;

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

/**
 * Fully synchronizes imported inventory from a CSV/Excel file with Firestore:
 * 1. Writes/updates all plants present in the uploaded dataset.
 * 2. Deletes any legacy or previous plant documents in Firestore that are NOT present in this upload.
 */
export async function syncImportedInventoryToFirestore(newPlants: PlantItem[]) {
  try {
    const validIds = new Set(newPlants.map(p => p.id));
    const validItemNos = new Set(newPlants.filter(p => p.itemNo).map(p => p.itemNo!.trim().toUpperCase()));
    const validBarcodes = new Set(newPlants.filter(p => p.barcode && p.barcode.length > 2).map(p => p.barcode!.trim().toUpperCase()));

    // 1. Purge ONLY confirmed mock demo items (e.g., BLK-TS1, SOIL01).
    // NEVER purge real nursery inventory records, previously uploaded stock, or plants referenced in orders!
    const snapshot = await getDocs(collection(db, PLANTS_COL));
    const toDelete: string[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as PlantItem;
      const docId = docSnap.id;
      const itemNo = (data.itemNo || '').trim().toUpperCase();
      const barcode = (data.barcode || '').trim().toUpperCase();

      // Only mark default mock demo items for deletion
      if (isDefaultMockItem(docId, itemNo, barcode, data.name)) {
        toDelete.push(docId);
      }
    });

    // 2. Batch delete confirmed mock items
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} mock demo items from Firestore...`);
      const deleteChunkSize = 400;
      for (let i = 0; i < toDelete.length; i += deleteChunkSize) {
        const chunk = toDelete.slice(i, i + deleteChunkSize);
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          batch.delete(doc(db, PLANTS_COL, id));
        });
        await batch.commit();
      }
    }

    // 3. Batch save all plants from the uploaded CSV
    await batchSavePlantsToFirestore(newPlants);
    console.log(`Successfully synced ${newPlants.length} uploaded plants to Firestore.`);
  } catch (err) {
    console.error('Error syncing imported inventory to Firestore:', err);
    // Fallback: at least save the new plants
    await batchSavePlantsToFirestore(newPlants);
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
    const chunkSize = 400;
    for (let i = 0; i < areas.length; i += chunkSize) {
      const chunk = areas.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((area) => {
        const ref = doc(db, HOLDING_LOCATIONS_COL, area.id);
        batch.set(ref, cleanForFirestore(area), { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error batch saving holding locations to Firestore:', err);
  }
}

export async function deleteHoldingLocationFromFirestore(id: string) {
  await deleteDoc(doc(db, HOLDING_LOCATIONS_COL, id));
}

export async function saveAuditSessionToFirestore(audit: InventoryAuditSession) {
  await setDoc(doc(db, INVENTORY_AUDITS_COL, audit.id), cleanForFirestore(audit), { merge: true });
}

export async function deleteAuditSessionFromFirestore(id: string) {
  await deleteDoc(doc(db, INVENTORY_AUDITS_COL, id));
}
