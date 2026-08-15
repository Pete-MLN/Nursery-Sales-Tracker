import React, { useState, useEffect } from 'react';
import { ScreenType, User, Order, OrderCartItem, PlantItem, RecentUpload, Customer, Employee, StockAlertSettings, HoldingArea } from './types';
import { INITIAL_PLANTS, INITIAL_ORDERS, INITIAL_UPLOADS, INITIAL_CUSTOMERS, INITIAL_EMPLOYEES, HOLDING_AREAS } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { ScanScreen } from './components/ScanScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { HoldingLocationScreen } from './components/HoldingLocationScreen';
import { OrderFinalizationScreen } from './components/OrderFinalizationScreen';
import { DataManagementScreen } from './components/DataManagementScreen';
import { OrdersScreen } from './components/OrdersScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { InstructionsScreen } from './components/InstructionsScreen';
import { LoginScreen } from './components/LoginScreen';
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
  savePlantToFirestore,
  batchSavePlantsToFirestore,
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
  deleteHoldingLocationFromFirestore
} from './services/firebaseService';
import { sanitizeCustomerName } from './utils/customerNameCleaner';

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

  const [inventory, setInventory] = useState<PlantItem[]>(INITIAL_PLANTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [uploads, setUploads] = useState<RecentUpload[]>(INITIAL_UPLOADS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [holdingAreas, setHoldingAreas] = useState<HoldingArea[]>(() => {
    const saved = localStorage.getItem('nursery_holding_areas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback to default
      }
    }
    return HOLDING_AREAS;
  });
  const [activeOrder, setActiveOrder] = useState<Order | null>(INITIAL_ORDERS[2]); // ORD-90210-A
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['home']);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

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
    seedInitialFirestoreData();

    const unsubPlants = subscribeToPlants((data) => {
      if (data && data.length > 0) setInventory(data);
    });
    const unsubCustomers = subscribeToCustomers((data) => {
      if (data && data.length > 0) {
        setCustomers(data);
      }
    });
    const unsubEmployees = subscribeToEmployees((data) => {
      if (data && data.length > 0) setEmployees(data);
    });
    const unsubOrders = subscribeToOrders((data) => {
      if (data && data.length > 0) {
        setOrders(data);
        // keep activeOrder updated if changed on another phone
        if (activeOrder) {
          const fresh = data.find(o => o.id === activeOrder.id);
          if (fresh) setActiveOrder(fresh);
        }
      }
    });
    const unsubUploads = subscribeToUploads((data) => {
      if (data && data.length > 0) setUploads(data);
    });
    const unsubHoldingLocations = subscribeToHoldingLocations((data) => {
      if (data && data.length > 0) {
        setHoldingAreas(data);
        localStorage.setItem('nursery_holding_areas', JSON.stringify(data));
      }
    });

    return () => {
      unsubPlants();
      unsubCustomers();
      unsubEmployees();
      unsubOrders();
      unsubUploads();
      unsubHoldingLocations();
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
  const handleCompleteScanOrder = (cartItems: OrderCartItem[], customerName: string) => {
    const newOrderId = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const totalAmount = cartItems.reduce((sum, item) => sum + item.plant.price * item.quantity, 0);

    const newOrder: Order = {
      id: newOrderId,
      customerName: customerName || 'Sarah Jenkins',
      itemsCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      total: totalAmount,
      type: 'Take Now',
      scheduledTime: 'Today',
      status: 'Pending',
      date: 'Just Now',
      items: cartItems,
      holdingLocation: 'Greenhouse B, Aisle 4, Bay 12'
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveOrder(newOrder);
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
      saveOrderToFirestore(updatedOrder);
    }
  };

  // Full order update (items, quantities, customer, location, status)
  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (activeOrder && activeOrder.id === updatedOrder.id) {
      setActiveOrder(updatedOrder);
    }
    saveOrderToFirestore(updatedOrder);
  };

  // Cancel / delete order from list and Firestore
  const handleDeleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder(null);
    }
    deleteOrderFromFirestore(orderId);
  };

  // Handle uploading dataset in Data Management
  const handleAddUpload = (filename: string, size?: string, recordsCount?: number) => {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newUpload: RecentUpload = {
      id: `u-${Date.now()}`,
      filename: filename,
      date: todayStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      size: size || '1.2 MB',
      recordsCount: recordsCount || Math.floor(100 + Math.random() * 500)
    };
    setUploads(prev => [newUpload, ...prev]);
    saveUploadToFirestore(newUpload);
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
    setInventory(newPlants);
    batchSavePlantsToFirestore(newPlants);
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
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            onNavigate={navigateTo}
            inventory={inventory}
            onUpdateStock={handleUpdateStock}
            stockAlertSettings={stockAlertSettings}
          />
        )}

        {currentScreen === 'holding_location' && (
          <HoldingLocationScreen
            onNavigate={navigateTo}
            activeOrder={activeOrder}
            onConfirmLocation={handleConfirmLocation}
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
            onCreateNewOrderClick={() => navigateTo('scan')}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            user={user}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            stockAlertSettings={stockAlertSettings}
            onUpdateStockAlertSettings={handleUpdateStockAlertSettings}
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
