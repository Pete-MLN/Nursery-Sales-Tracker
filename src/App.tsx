import React, { useState, useEffect } from 'react';
import { ScreenType, User, Order, OrderCartItem, PlantItem, RecentUpload, Customer, Employee } from './types';
import { INITIAL_PLANTS, INITIAL_ORDERS, INITIAL_UPLOADS, INITIAL_CUSTOMERS, INITIAL_EMPLOYEES } from './data/mockData';
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
import { LoginScreen } from './components/LoginScreen';
import {
  seedInitialFirestoreData,
  subscribeToPlants,
  subscribeToCustomers,
  subscribeToEmployees,
  subscribeToOrders,
  subscribeToUploads,
  savePlantToFirestore,
  batchSavePlantsToFirestore,
  saveCustomerToFirestore,
  batchSaveCustomersToFirestore,
  deleteCustomerFromFirestore,
  saveEmployeeToFirestore,
  deleteEmployeeFromFirestore,
  saveOrderToFirestore,
  saveUploadToFirestore
} from './services/firebaseService';
import { sanitizeCustomerName } from './utils/customerNameCleaner';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [user, setUser] = useState<User>({
    name: 'Alex',
    email: 'alex@maplelanenursery.com',
    role: 'Operations Specialist',
    isLoggedIn: true
  });

  const [inventory, setInventory] = useState<PlantItem[]>(INITIAL_PLANTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [uploads, setUploads] = useState<RecentUpload[]>(INITIAL_UPLOADS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [activeOrder, setActiveOrder] = useState<Order | null>(INITIAL_ORDERS[2]); // ORD-90210-A
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['home']);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

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

    return () => {
      unsubPlants();
      unsubCustomers();
      unsubEmployees();
      unsubOrders();
      unsubUploads();
    };
  }, []);

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

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
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
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            onNavigate={navigateTo}
            inventory={inventory}
            onUpdateStock={handleUpdateStock}
          />
        )}

        {currentScreen === 'holding_location' && (
          <HoldingLocationScreen
            onNavigate={navigateTo}
            activeOrder={activeOrder}
            onConfirmLocation={handleConfirmLocation}
          />
        )}

        {currentScreen === 'finalization' && (
          <OrderFinalizationScreen
            onNavigate={navigateTo}
            order={activeOrder}
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
          />
        )}
      </main>

      {/* Global Bottom Navigation Bar */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        pendingOrdersCount={orders.filter(o => o.status === 'Pending').length}
        criticalAlertsCount={inventory.filter(i => i.status === 'critical').length}
      />
    </div>
  );
}
