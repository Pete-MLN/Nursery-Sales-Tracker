import React, { useState, useEffect } from 'react';
import { ScreenType, User, Order, OrderCartItem, PlantItem, RecentUpload, Customer, Employee, StockAlertSettings, HoldingArea, InventoryAuditSession } from './types';
import { INITIAL_PLANTS, INITIAL_ORDERS, INITIAL_UPLOADS, INITIAL_CUSTOMERS, DEFAULT_CUSTOMER, INITIAL_EMPLOYEES, HOLDING_AREAS } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { ScanScreen } from './components/ScanScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { InventoryAuditScreen } from './components/InventoryAuditScreen';
import { HoldingLocationScreen } from './components/HoldingLocationScreen';
import { OrderFinalizationScreen } from './components/OrderFinalizationScreen';
import { DataManagementScreen } from './components/DataManagementScreen';
import { OrdersScreen } from './components/OrdersScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { InstructionsScreen } from './components/InstructionsScreen';
import { LoginScreen } from './components/LoginScreen';
import { AppStartupProgressRing, LastUploadDatesInfo } from './components/AppStartupProgressRing';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  seedInitialFirestoreData,
  subscribeToPlants,
  subscribeToCustomers,
  subscribeToEmployees,
  subscribeToOrders,
  subscribeToUploads,
  subscribeToHoldingLocations,
  subscribeToAuditSessions,
  savePlantToFirestore,
  batchSavePlantsToFirestore,
  syncImportedInventoryToFirestore,
  isDefaultMockItem,
  saveCustomerToFirestore,
  batchSaveCustomersToFirestore,
  deleteCustomerFromFirestore,
  saveEmployeeToFirestore,
  deleteEmployeeFromFirestore,
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  saveUploadToFirestore,
  saveHoldingLocationToFirestore,
  batchSaveHoldingLocationsToFirestore,
  deleteHoldingLocationFromFirestore,
  saveAuditSessionToFirestore
} from './services/firebaseService';
import { sanitizeCustomerName } from './utils/customerNameCleaner';
import { flushOfflineSyncQueue, clearActiveDraft, OrderDraft } from './services/orderAutoSaveService';

export function extractLastUploadDates(uploadsList: RecentUpload[]): LastUploadDatesInfo {
  const getTimestamp = (u: RecentUpload): number => {
    const match = (u.id || '').match(/^u-(\d+)$/);
    if (match) return parseInt(match[1], 10);
    const parsed = Date.parse(`${u.date} ${u.time || ''}`);
    if (!isNaN(parsed)) return parsed;
    return 0;
  };

  const isCustomerUpload = (u: RecentUpload): boolean => {
    const fn = (u.filename || '').toLowerCase();
    return u.type === 'customer' || fn.includes('cust') || fn.includes('client');
  };

  const isInventoryUpload = (u: RecentUpload): boolean => {
    const fn = (u.filename || '').toLowerCase();
    return u.type === 'inventory' || fn.includes('avail') || fn.includes('inv') || fn.includes('plant') || fn.includes('stock');
  };

  const sorted = [...uploadsList].sort((a, b) => getTimestamp(b) - getTimestamp(a));
  const latestInv = sorted.find(isInventoryUpload);
  const latestCust = sorted.find(isCustomerUpload);

  const formatDisplay = (u?: RecentUpload) => {
    if (!u) return {};
    let dateStr = u.date;
    if (dateStr === 'Today') {
      const ts = getTimestamp(u);
      if (ts > 0) {
        dateStr = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return {
      date: dateStr,
      time: u.time,
      filename: u.filename,
      count: u.recordsCount
    };
  };

  const inv = formatDisplay(latestInv);
  const cust = formatDisplay(latestCust);

  return {
    inventoryDate: inv.date || 'Sep 14, 2026',
    inventoryTime: inv.time || '11:26 AM',
    inventoryFilename: inv.filename || 'Availability_Complete_101.csv',
    inventoryCount: inv.count,
    customerDate: cust.date || 'Sep 10, 2026',
    customerTime: cust.time || '03:44 PM',
    customerFilename: cust.filename || 'Customers.csv',
    customerCount: cust.count
  };
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [user, setUser] = useState<User>(() => {
    // Check localStorage for saved session
    const savedLocal = localStorage.getItem('nursery_user_session');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed && typeof parsed === 'object' && parsed.isLoggedIn) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed parsing local user session:', e);
      }
    }
    // Check sessionStorage
    const savedSession = sessionStorage.getItem('nursery_user_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && typeof parsed === 'object' && parsed.isLoggedIn) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed parsing session user session:', e);
      }
    }
    // Default active demo user session
    return {
      name: 'Pete',
      email: 'pete@maplelanenursery.com',
      role: 'General Manager',
      isLoggedIn: true
    };
  });

  const [inventory, setInventory] = useState<PlantItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [uploads, setUploads] = useState<RecentUpload[]>(INITIAL_UPLOADS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);

  const ensureLeftInPlaceFirst = (list: HoldingArea[]): HoldingArea[] => {
    const leftItem = list.find(a => a.id === 'left_in_place') || { 
      id: 'left_in_place', 
      title: 'Left in Place', 
      subtitle: 'Keep in current physical location (no relocation needed)', 
      category: 'Special', 
      icon: 'pin_drop' 
    };
    const rest = list.filter(a => a.id !== 'left_in_place');
    return [leftItem, ...rest];
  };

  const [holdingAreas, setHoldingAreas] = useState<HoldingArea[]>(() => {
    const saved = localStorage.getItem('nursery_holding_areas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 100) return ensureLeftInPlaceFirst(parsed);
      } catch (e) {
        // Fallback to default
      }
    }
    return ensureLeftInPlaceFirst(HOLDING_AREAS);
  });
  const [auditSessions, setAuditSessions] = useState<InventoryAuditSession[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['home']);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // App startup loading & synchronization progress
  const [isAppStarting, setIsAppStarting] = useState<boolean>(true);
  const [syncProgress, setSyncProgress] = useState<number>(18);
  const [syncStatusText, setSyncStatusText] = useState<string>('Connecting to database...');
  const [syncSubStatusText, setSyncSubStatusText] = useState<string>('Initializing Maple Lane database & pricing...');
  const [isSyncReady, setIsSyncReady] = useState<boolean>(false);

  // Track last upload dates for Inventory and Customer datasets
  const [lastUploads, setLastUploads] = useState<LastUploadDatesInfo>(() => {
    const cached = localStorage.getItem('nursery_last_upload_dates');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.inventoryDate || parsed.customerDate)) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      inventoryDate: 'Sep 14, 2026',
      inventoryTime: '11:26 AM',
      inventoryFilename: 'Availability_Complete_101.csv',
      inventoryCount: 4134,
      customerDate: 'Sep 10, 2026',
      customerTime: '03:44 PM',
      customerFilename: 'Customers.csv',
      customerCount: 2399
    };
  });

  // Global Stock Alert Thresholds State with local persistence
  const [stockAlertSettings, setStockAlertSettings] = useState<StockAlertSettings>(() => {
    const saved = localStorage.getItem('nursery_stock_alert_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return { criticalThreshold: 0, warningThreshold: 5, alertsEnabled: true };
  });

  const handleUpdateStockAlertSettings = (newSettings: StockAlertSettings) => {
    setStockAlertSettings(newSettings);
    localStorage.setItem('nursery_stock_alert_settings', JSON.stringify(newSettings));
  };

  // Camera Auto-Shutoff Timeout (in seconds, default 15s, 0 = disabled / never)
  const [cameraTimeout, setCameraTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('nursery_camera_timeout');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 15;
  });

  const handleUpdateCameraTimeout = (seconds: number) => {
    setCameraTimeout(seconds);
    localStorage.setItem('nursery_camera_timeout', seconds.toString());
  };

  // Sync Firebase Auth state if available
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const authUser: User = {
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Nursery Staff',
          email: fbUser.email || 'staff@maplelanenursery.com',
          role: 'Nursery Manager',
          isLoggedIn: true
        };
        setUser(authUser);
        localStorage.setItem('nursery_user_session', JSON.stringify(authUser));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Initialize and subscribe to real-time Firestore updates for multi-device syncing
  useEffect(() => {
    let plantsReceived = false;
    let customersReceived = false;
    let holdingReceived = false;
    let isCompleted = false;

    // Smooth progress tick while waiting for network handshake
    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev < 42) return prev + 4;
        if (prev < 68 && !plantsReceived) return prev + 1.5;
        return prev;
      });
    }, 150);

    const finishStartup = () => {
      if (isCompleted) return;
      isCompleted = true;
      clearInterval(progressInterval);

      // Smoothly advance progress indicator through to 100% so percentage never freezes or disappears
      setSyncProgress((prev) => Math.max(prev, 78));
      
      setTimeout(() => {
        setSyncProgress((prev) => Math.max(prev, 94));
      }, 120);

      setTimeout(() => {
        setSyncProgress(100);
        setIsSyncReady(true);
        setSyncStatusText('System Ready to Start Orders');
        setSyncSubStatusText('Catalog, pricing, and staging locations synchronized.');
        
        setTimeout(() => {
          setIsAppStarting(false);
        }, 650);
      }, 260);
    };

    const checkReadiness = () => {
      if (plantsReceived && (customersReceived || holdingReceived)) {
        finishStartup();
      }
    };

    // Safety fallback: if network is slow or offline, complete cleanly within 3.5s
    const safetyTimeout = setTimeout(() => {
      finishStartup();
    }, 3500);

    seedInitialFirestoreData();

    const unsubPlants = subscribeToPlants((data) => {
      if (data && data.length > 0) {
        // Exclude any default mock items
        const cleanedData = data.filter(p => !isDefaultMockItem(p.id, p.itemNo, p.barcode, p.name));

        // Deduplicate plants to prevent duplicate entries from past imports or overlapping IDs
        const deduped: PlantItem[] = [];
        const seenKeys = new Set<string>();

        for (const p of cleanedData) {
          const itemNoKey = (p.itemNo || '').trim().toUpperCase();
          const nameKey = (p.name || '').trim().toUpperCase().replace(/\s+/g, ' ');
          const barcodeKey = (p.barcode || '').trim().toUpperCase();

          const isDuplicate =
            (itemNoKey && seenKeys.has(`item:${itemNoKey}`)) ||
            (nameKey && seenKeys.has(`name:${nameKey}`)) ||
            (barcodeKey && barcodeKey.length > 2 && seenKeys.has(`barcode:${barcodeKey}`)) ||
            seenKeys.has(`id:${p.id}`);

          if (!isDuplicate) {
            if (itemNoKey) seenKeys.add(`item:${itemNoKey}`);
            if (nameKey) seenKeys.add(`name:${nameKey}`);
            if (barcodeKey && barcodeKey.length > 2) seenKeys.add(`barcode:${barcodeKey}`);
            seenKeys.add(`id:${p.id}`);
            deduped.push({ ...p });
          } else {
            const existing = deduped.find(u =>
              (itemNoKey && (u.itemNo || '').trim().toUpperCase() === itemNoKey) ||
              (nameKey && (u.name || '').trim().toUpperCase().replace(/\s+/g, ' ') === nameKey) ||
              (barcodeKey && barcodeKey.length > 2 && (u.barcode || '').trim().toUpperCase() === barcodeKey) ||
              u.id === p.id
            );
            if (existing) {
              if (!existing.gpsLocation && p.gpsLocation) existing.gpsLocation = p.gpsLocation;
              if ((!existing.holdingLocation || existing.holdingLocation === '') && p.holdingLocation) existing.holdingLocation = p.holdingLocation;
              if (p.stock > existing.stock) existing.stock = p.stock;
              if (p.price && (!existing.price || existing.price === 0)) existing.price = p.price;
              if (p.prices && (!existing.prices || Object.keys(existing.prices).length === 0)) existing.prices = p.prices;
            }
          }
        }
        setInventory(deduped);
        plantsReceived = true;
        setSyncProgress((prev) => Math.max(prev, 72));
        setSyncStatusText('Syncing plant catalog & pricing...');
        setSyncSubStatusText(`Loaded ${deduped.length} plant varieties and multi-tier pricing`);
        checkReadiness();
      }
    });
    const unsubCustomers = subscribeToCustomers((data) => {
      if (data && data.length > 0) {
        const cashCust = data.find(c => c.accountNo === 'CASH' || c.id === 'cust-cash' || c.name.toLowerCase() === 'walk in customer');
        if (cashCust) {
          const others = data.filter(c => c !== cashCust);
          setCustomers([cashCust, ...others]);
        } else {
          setCustomers([DEFAULT_CUSTOMER, ...data]);
        }
      } else {
        setCustomers(INITIAL_CUSTOMERS);
      }
      customersReceived = true;
      setSyncProgress((prev) => Math.max(prev, 88));
      checkReadiness();
    });
    const unsubEmployees = subscribeToEmployees((data) => {
      if (data && data.length > 0) setEmployees(data);
    });
    const unsubOrders = subscribeToOrders((data) => {
      if (data && data.length > 0) {
        const validOrders = data.filter(o => o && o.id && !o.id.startsWith('ORD-DRAFT-'));
        setOrders(validOrders.length > 0 ? validOrders : INITIAL_ORDERS);

        // Clean up any stale draft orders saved previously in Firestore
        data.filter(o => o && o.id && o.id.startsWith('ORD-DRAFT-')).forEach(draftOrder => {
          deleteOrderFromFirestore(draftOrder.id).catch(() => {});
        });

        // keep activeOrder updated if changed on another phone
        if (activeOrder) {
          const fresh = validOrders.find(o => o.id === activeOrder.id);
          if (fresh) setActiveOrder(fresh);
        }
      } else {
        setOrders(INITIAL_ORDERS);
      }
    });
    const unsubUploads = subscribeToUploads((data) => {
      if (data && data.length > 0) {
        setUploads(data);
        const latest = extractLastUploadDates(data);
        setLastUploads(latest);
        localStorage.setItem('nursery_last_upload_dates', JSON.stringify(latest));
      }
    });
    const unsubHoldingLocations = subscribeToHoldingLocations((data) => {
      if (data && data.length >= 100) {
        const ordered = ensureLeftInPlaceFirst(data);
        setHoldingAreas(ordered);
        localStorage.setItem('nursery_holding_areas', JSON.stringify(ordered));
      } else {
        // Upgrade legacy/empty list to official 195 locations
        const ordered = ensureLeftInPlaceFirst(HOLDING_AREAS);
        setHoldingAreas(ordered);
        localStorage.setItem('nursery_holding_areas', JSON.stringify(ordered));
        batchSaveHoldingLocationsToFirestore(ordered);
      }
      holdingReceived = true;
      setSyncProgress((prev) => Math.max(prev, 96));
      checkReadiness();
    });
    const unsubAudits = subscribeToAuditSessions((data) => {
      if (data && data.length > 0) {
        setAuditSessions(data);
      }
    });

    return () => {
      clearInterval(progressInterval);
      clearTimeout(safetyTimeout);
      unsubPlants();
      unsubCustomers();
      unsubEmployees();
      unsubOrders();
      unsubUploads();
      unsubHoldingLocations();
      unsubAudits();
    };
  }, []);

  const handleUpdateHoldingArea = (updatedArea: HoldingArea) => {
    setHoldingAreas(prev => {
      const next = prev.map(a => a.id === updatedArea.id ? updatedArea : a);
      localStorage.setItem('nursery_holding_areas', JSON.stringify(next));
      return next;
    });
    saveHoldingLocationToFirestore(updatedArea);
  };

  const handleAddHoldingArea = (newArea: HoldingArea) => {
    setHoldingAreas(prev => {
      const next = [...prev, newArea];
      localStorage.setItem('nursery_holding_areas', JSON.stringify(next));
      return next;
    });
    saveHoldingLocationToFirestore(newArea);
  };

  const handleDeleteHoldingArea = (id: string) => {
    setHoldingAreas(prev => {
      const next = prev.filter(a => a.id !== id);
      localStorage.setItem('nursery_holding_areas', JSON.stringify(next));
      return next;
    });
    deleteHoldingLocationFromFirestore(id);
  };

  const handleResetHoldingAreas = () => {
    setHoldingAreas(HOLDING_AREAS);
    localStorage.setItem('nursery_holding_areas', JSON.stringify(HOLDING_AREAS));
    batchSaveHoldingLocationsToFirestore(HOLDING_AREAS);
  };

  const handleSaveAuditSession = (session: InventoryAuditSession) => {
    setAuditSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = session;
        return next;
      }
      return [session, ...prev];
    });
    saveAuditSessionToFirestore(session).catch(err => {
      console.warn('Error saving audit session to Firestore:', err);
    });
  };

  const handleAddEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`
    };
    setEmployees(prev => [...prev, newEmp]);
    saveEmployeeToFirestore(newEmp);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    deleteEmployeeFromFirestore(id);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    saveEmployeeToFirestore(updatedEmp);
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    const updated = inventory.find(i => i.id === id);
    if (updated) {
      const newStatus = newStock === 0 ? 'critical' : newStock < 5 ? 'warning' : 'healthy';
      const newPlantItem = { ...updated, stock: newStock, status: newStatus as any };
      setInventory(prev => prev.map(item => item.id === id ? newPlantItem : item));
      savePlantToFirestore(newPlantItem);
    }
  };

  const handleUpdatePlant = async (updatedPlant: PlantItem) => {
    setInventory(prev => prev.map(item => item.id === updatedPlant.id ? updatedPlant : item));
    await savePlantToFirestore(updatedPlant);
  };

  const navigateTo = (screen: ScreenType) => {
    setScreenHistory(prev => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop(); // remove current
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
    } else {
      setCurrentScreen('home');
    }
  };

  // Create order from ScanScreen
  const handleCompleteScanOrder = (cartItems: OrderCartItem[], customerName: string, overrides?: Partial<Order>) => {
    const newOrderId = overrides?.id || `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.selectedPrice ?? item.plant.price) * item.quantity, 0);
    const now = new Date();
    const formattedCreatedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedSchedTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const todayIsoDate = now.toISOString().split('T')[0];

    const isDirectTaken = overrides?.holdingLocation?.includes('Taken by Customer') || overrides?.status === 'Completed';

    const newOrder: Order = {
      id: newOrderId,
      customerName: customerName.trim() || 'Walk In Customer',
      itemsCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      total: totalAmount,
      type: overrides?.type || 'Take Now',
      scheduledTime: formattedSchedTime,
      scheduledDate: todayIsoDate,
      status: overrides?.status || (isDirectTaken ? 'Completed' : 'Pending'),
      date: formattedCreatedDate,
      createdAt: now.toISOString(),
      items: isDirectTaken ? cartItems.map(i => ({ ...i, pickedUpQuantity: i.quantity })) : (overrides?.items || cartItems),
      holdingLocation: overrides?.holdingLocation || 'Left in Place (Current Row)',
      ...overrides
    };

    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrderId && !o.id.startsWith('ORD-DRAFT-'))]);
    setActiveOrder(newOrder);
    clearActiveDraft();
    saveOrderToFirestore(newOrder);
  };

  // Update holding location from HoldingLocationScreen
  const handleConfirmLocation = (locationName: string) => {
    if (activeOrder) {
      const updatedOrder = {
        ...activeOrder,
        holdingLocation: locationName,
        status: 'Ready for Pickup' as const
      };
      setActiveOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === activeOrder.id ? updatedOrder : o));
      clearActiveDraft(updatedOrder.id);
      saveOrderToFirestore(updatedOrder);
    }
  };

  // Full order update (items, quantities, customer, location, status)
  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (activeOrder && activeOrder.id === updatedOrder.id) {
      setActiveOrder(updatedOrder);
    }
    clearActiveDraft(updatedOrder.id);
    saveOrderToFirestore(updatedOrder);
  };

  // Cancel / delete order from list and Firestore
  const handleDeleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder(null);
    }
    clearActiveDraft(orderId);
    deleteOrderFromFirestore(orderId);
  };

  // Resume uncommitted draft from DraftRecoveryBanner
  const handleResumeDraft = (draft: OrderDraft) => {
    if (draft.isEditingExisting && draft.orderId) {
      const existing = orders.find(o => o.id === draft.orderId);
      if (existing) {
        setActiveOrder({
          ...existing,
          customerName: draft.customerName || existing.customerName,
          items: draft.cartItems || existing.items,
          itemsCount: (draft.cartItems || existing.items).reduce((s, i) => s + i.quantity, 0),
          holdingLocation: draft.holdingLocation || existing.holdingLocation,
          notes: draft.notes || existing.notes,
          status: draft.orderStatus || existing.status,
          type: draft.fulfillmentType || existing.type
        });
      } else {
        setActiveOrder({
          id: draft.orderId,
          customerName: draft.customerName || 'Customer',
          total: (draft.cartItems || []).reduce((s, i) => s + (i.plant.price * i.quantity), 0),
          itemsCount: (draft.cartItems || []).reduce((s, i) => s + i.quantity, 0),
          type: draft.fulfillmentType || 'Take Now',
          scheduledTime: draft.scheduledTime || 'Immediate',
          status: draft.orderStatus || 'Pending',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAt: new Date().toISOString(),
          items: draft.cartItems || []
        });
      }
    } else {
      setActiveOrder(null);
    }
    navigateTo('scan');
  };

  // Direct save of draft from DraftRecoveryBanner: commits order & clears warning
  const handleSaveDraftAsOrder = (draft: OrderDraft) => {
    if (draft.isEditingExisting && draft.orderId && !draft.orderId.startsWith('ORD-DRAFT-')) {
      const existing = orders.find(o => o.id === draft.orderId);
      const totalAmount = (draft.cartItems || []).reduce((sum, item) => sum + (item.selectedPrice ?? item.plant.price) * item.quantity, 0);
      const itemsCount = (draft.cartItems || []).reduce((sum, item) => sum + item.quantity, 0);
      
      const updatedOrder: Order = {
        id: draft.orderId,
        customerName: (draft.customerName && draft.customerName.trim()) || (existing ? existing.customerName : 'Walk In Customer'),
        itemsCount: itemsCount > 0 ? itemsCount : (existing ? existing.itemsCount : 0),
        total: totalAmount > 0 ? totalAmount : (existing ? existing.total : 0),
        type: draft.fulfillmentType || (existing ? existing.type : 'Take Now'),
        scheduledTime: draft.scheduledTime || (existing ? existing.scheduledTime : 'Immediate'),
        scheduledDate: draft.scheduledDate || (existing ? existing.scheduledDate : new Date().toISOString().split('T')[0]),
        status: draft.orderStatus || (existing ? existing.status : 'Pending'),
        date: existing ? existing.date : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        items: draft.cartItems && draft.cartItems.length > 0 ? draft.cartItems : (existing ? existing.items : []),
        holdingLocation: draft.holdingLocation || (existing ? existing.holdingLocation : 'Left in Place (Current Row)'),
        notes: draft.notes !== undefined ? draft.notes : (existing ? existing.notes : ''),
        remainingPickupDate: draft.remainingPickupDate || (existing ? existing.remainingPickupDate : undefined),
        partialPickupNotes: draft.partialPickupNotes || (existing ? existing.partialPickupNotes : undefined),
        hasPartialPickup: draft.orderStatus === 'Partial Pickup' || (existing ? existing.hasPartialPickup : false)
      };

      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      if (activeOrder && activeOrder.id === updatedOrder.id) {
        setActiveOrder(updatedOrder);
      }
      saveOrderToFirestore(updatedOrder);
      clearActiveDraft(draft.orderId);
    } else {
      const newOrderId = draft.orderId && !draft.orderId.startsWith('ORD-DRAFT-')
        ? draft.orderId
        : `ORD-${Math.floor(100 + Math.random() * 900)}`;
      const totalAmount = (draft.cartItems || []).reduce((sum, item) => sum + (item.selectedPrice ?? item.plant.price) * item.quantity, 0);
      const now = new Date();
      const formattedCreatedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedSchedTime = draft.scheduledTime || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const todayIsoDate = draft.scheduledDate || now.toISOString().split('T')[0];

      const newOrder: Order = {
        id: newOrderId,
        customerName: (draft.customerName && draft.customerName.trim()) ? draft.customerName.trim() : 'Walk In Customer',
        itemsCount: (draft.cartItems || []).reduce((sum, item) => sum + item.quantity, 0),
        total: totalAmount,
        type: draft.fulfillmentType || 'Take Now',
        scheduledTime: formattedSchedTime,
        scheduledDate: todayIsoDate,
        status: draft.orderStatus || 'Pending',
        date: formattedCreatedDate,
        createdAt: now.toISOString(),
        items: draft.cartItems || [],
        holdingLocation: draft.holdingLocation || 'Left in Place (Current Row)',
        notes: draft.notes || ''
      };

      setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrderId && !o.id.startsWith('ORD-DRAFT-'))]);
      saveOrderToFirestore(newOrder);
      clearActiveDraft(draft.orderId);
    }
  };

  // Handle uploading dataset in Data Management
  const handleAddUpload = (
    filename: string,
    size?: string,
    recordsCount?: number,
    uploadType?: 'inventory' | 'customer' | 'employee'
  ) => {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const determinedType = uploadType || (
      filename.toLowerCase().includes('cust') || filename.toLowerCase().includes('client')
        ? 'customer'
        : 'inventory'
    );
    const newUpload: RecentUpload = {
      id: `u-${Date.now()}`,
      filename: filename,
      date: todayStr,
      time: nowTime,
      size: size || '1.2 MB',
      recordsCount: recordsCount || Math.floor(100 + Math.random() * 500),
      type: determinedType
    };
    setUploads(prev => [newUpload, ...prev]);
    saveUploadToFirestore(newUpload);

    setLastUploads(prev => {
      const updated: LastUploadDatesInfo = {
        ...prev,
        ...(determinedType === 'customer' ? {
          customerDate: todayStr,
          customerTime: nowTime,
          customerFilename: filename,
          customerCount: recordsCount
        } : {
          inventoryDate: todayStr,
          inventoryTime: nowTime,
          inventoryFilename: filename,
          inventoryCount: recordsCount
        })
      };
      localStorage.setItem('nursery_last_upload_dates', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogin = (newUser: User, keepSignedIn: boolean = true) => {
    setUser(newUser);
    if (keepSignedIn) {
      localStorage.setItem('nursery_user_session', JSON.stringify(newUser));
      sessionStorage.removeItem('nursery_user_session');
    } else {
      sessionStorage.setItem('nursery_user_session', JSON.stringify(newUser));
      localStorage.removeItem('nursery_user_session');
    }
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    const loggedOutUser: User = {
      name: '',
      email: '',
      role: '',
      isLoggedIn: false
    };
    setUser(loggedOutUser);
    localStorage.removeItem('nursery_user_session');
    sessionStorage.removeItem('nursery_user_session');
    signOut(auth).catch(() => {});
    setCurrentScreen('login');
  };

  const handleImportInventoryPlants = (newPlants: PlantItem[]) => {
    // Preserve existing inventory, plant IDs, GPS coordinates, and holding locations across inventory updates
    const mergedMap = new Map<string, PlantItem>();

    // 1. Seed with current inventory so no previously cataloged plants or order items are lost!
    for (const existing of inventory) {
      if (!isDefaultMockItem(existing.id, existing.itemNo, existing.barcode, existing.name)) {
        mergedMap.set(existing.id, { ...existing });
      }
    }

    // 2. Merge or insert imported plants
    for (const newPlant of newPlants) {
      if (isDefaultMockItem(newPlant.id, newPlant.itemNo, newPlant.barcode, newPlant.name)) {
        continue;
      }

      // Find matching existing plant by itemNo, barcode, ID, or name+size
      let existingMatchKey: string | undefined;
      for (const [key, existing] of mergedMap.entries()) {
        const itemNoMatch = newPlant.itemNo && existing.itemNo && newPlant.itemNo.trim().toUpperCase() === existing.itemNo.trim().toUpperCase();
        const barcodeMatch = newPlant.barcode && existing.barcode && newPlant.barcode.trim().toUpperCase() === existing.barcode.trim().toUpperCase();
        const idMatch = newPlant.id && existing.id && newPlant.id === existing.id;
        const nameAndSizeMatch = newPlant.name && existing.name && 
          newPlant.name.toLowerCase().trim() === existing.name.toLowerCase().trim() &&
          (!newPlant.size || !existing.size || newPlant.size.toUpperCase().trim() === existing.size.toUpperCase().trim());

        if (itemNoMatch || barcodeMatch || idMatch || nameAndSizeMatch) {
          existingMatchKey = key;
          break;
        }
      }

      if (existingMatchKey) {
        const existing = mergedMap.get(existingMatchKey)!;
        const updatedPlant: PlantItem = {
          ...existing,
          ...newPlant,
          id: existing.id, // Preserve existing ID so Firestore document ID remains stable
          // Preserve GPS locations
          gpsLocation: newPlant.gpsLocation || existing.gpsLocation || undefined,
          gpsLocations: newPlant.gpsLocations || existing.gpsLocations || undefined,
          // Preserve holding location if uploaded is empty
          holdingLocation: (newPlant.holdingLocation && newPlant.holdingLocation.trim()) ? newPlant.holdingLocation : (existing.holdingLocation || undefined),
          descr: newPlant.descr || existing.descr || undefined,
          botanicalName: newPlant.botanicalName || existing.botanicalName || undefined,
          saleDiscount: newPlant.saleDiscount || existing.saleDiscount || undefined,
          barcode: (newPlant.barcode && newPlant.barcode.trim().length > 1) ? newPlant.barcode : existing.barcode,
          itemNo: (newPlant.itemNo && newPlant.itemNo.trim().length > 0) ? newPlant.itemNo : existing.itemNo,
          prices: { ...(existing.prices || {}), ...(newPlant.prices || {}) },
          stock: newPlant.stock !== undefined ? newPlant.stock : existing.stock
        };
        mergedMap.set(existingMatchKey, updatedPlant);
      } else {
        mergedMap.set(newPlant.id, newPlant);
      }
    }

    const mergedList = Array.from(mergedMap.values());
    setInventory(mergedList);
    syncImportedInventoryToFirestore(mergedList);
  };

  const handleImportCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    batchSaveCustomersToFirestore(newCustomers);
  };

  const handleAddCustomer = (custData: Omit<Customer, 'id'>) => {
    const newCust: Customer = {
      ...custData,
      id: `c-${Date.now()}`
    };
    setCustomers(prev => [...prev, newCust]);
    saveCustomerToFirestore(newCust);
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteCustomerFromFirestore(id);
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c));
    saveCustomerToFirestore(updatedCust);
  };

  if (!user.isLoggedIn || currentScreen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f9faf6] text-[#1a1c1a] flex flex-col font-sans">
      {/* Animated Startup Progress Ring Overlay */}
      {isAppStarting && (
        <AppStartupProgressRing
          progress={syncProgress}
          statusText={syncStatusText}
          subStatusText={syncSubStatusText}
          isReady={isSyncReady}
          canSkip={true}
          onSkip={() => setIsAppStarting(false)}
          itemCounts={{
            plants: inventory.length,
            customers: customers.length,
            holdingAreas: holdingAreas.length
          }}
          lastUploads={lastUploads}
        />
      )}

      {/* Dynamic Top App Bar */}
      <Header
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        onBack={screenHistory.length > 1 ? handleBack : undefined}
        user={user}
        onOpenProfile={() => navigateTo('settings')}
      />

      {/* Main Content Render Area */}
      <main className="flex-grow flex flex-col">
        {currentScreen === 'home' && (
          <HomeScreen
            userName={user.name}
            onNavigate={navigateTo}
            orders={orders}
            inventory={inventory}
            onSelectOrder={(ord) => setActiveOrder(ord)}
            onResumeDraft={handleResumeDraft}
            onSaveDraft={handleSaveDraftAsOrder}
          />
        )}

        {currentScreen === 'scan' && (
          <ScanScreen
            onNavigate={navigateTo}
            inventory={inventory}
            customers={customers}
            onCompleteOrder={handleCompleteScanOrder}
            activeOrder={activeOrder}
            onUpdateActiveOrder={handleUpdateOrder}
            onStartNewOrder={() => setActiveOrder(null)}
            onDeleteOrder={handleDeleteOrder}
            cameraTimeout={cameraTimeout}
            onUpdateCameraTimeout={handleUpdateCameraTimeout}
            onUpdatePlant={handleUpdatePlant}
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            onNavigate={navigateTo}
            inventory={inventory}
            onUpdateStock={handleUpdateStock}
            stockAlertSettings={stockAlertSettings}
            onUpdatePlant={handleUpdatePlant}
          />
        )}

        {currentScreen === 'inventory_audit' && (
          <InventoryAuditScreen
            onNavigate={navigateTo}
            inventory={inventory}
            holdingAreas={holdingAreas}
            currentUser={user}
            auditSessions={auditSessions}
            onSaveAuditSession={handleSaveAuditSession}
          />
        )}

        {currentScreen === 'holding_location' && (
          <HoldingLocationScreen
            onNavigate={navigateTo}
            activeOrder={activeOrder}
            onConfirmLocation={handleConfirmLocation}
            onUpdateActiveOrder={handleUpdateOrder}
            holdingAreas={holdingAreas}
            onUpdateHoldingArea={handleUpdateHoldingArea}
            onAddHoldingArea={handleAddHoldingArea}
            onDeleteHoldingArea={handleDeleteHoldingArea}
            onResetHoldingAreas={handleResetHoldingAreas}
          />
        )}

        {currentScreen === 'finalization' && (
          <OrderFinalizationScreen
            onNavigate={navigateTo}
            order={activeOrder}
            inventory={inventory}
            customers={customers}
            employees={employees}
            holdingAreas={holdingAreas}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            onStartNewOrder={() => {
              setActiveOrder(null);
              navigateTo('scan');
            }}
          />
        )}

        {currentScreen === 'data_management' && (
          <DataManagementScreen
            onNavigate={navigateTo}
            uploads={uploads}
            onAddUpload={handleAddUpload}
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onImportCustomers={handleImportCustomers}
            onImportInventoryPlants={handleImportInventoryPlants}
          />
        )}

        {currentScreen === 'orders' && (
          <OrdersScreen
            onNavigate={navigateTo}
            orders={orders}
            onSelectOrder={(ord) => setActiveOrder(ord)}
            onCreateNewOrderClick={() => {
              setActiveOrder(null);
              navigateTo('scan');
            }}
            onDeleteOrder={handleDeleteOrder}
            onUpdateOrder={handleUpdateOrder}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            user={user}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            stockAlertSettings={stockAlertSettings}
            onUpdateStockAlertSettings={handleUpdateStockAlertSettings}
            cameraTimeout={cameraTimeout}
            onUpdateCameraTimeout={handleUpdateCameraTimeout}
          />
        )}

        {currentScreen === 'instructions' && (
          <InstructionsScreen
            onNavigate={navigateTo}
          />
        )}
      </main>

      {/* Global Bottom Navigation Bar */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        pendingOrdersCount={orders.filter(o => o.status === 'Pending').length}
        criticalAlertsCount={
          stockAlertSettings.alertsEnabled
            ? inventory.filter(i => i.stock <= stockAlertSettings.criticalThreshold).length
            : 0
        }
      />
    </div>
  );
}
