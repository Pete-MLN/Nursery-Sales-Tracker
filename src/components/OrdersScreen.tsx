import React, { useState } from 'react';
import { ScreenType, Order } from '../types';
import { formatOrderCreatedDate, formatOrderScheduledTime } from '../utils/dateUtils';
import { PlantMapModal } from './PlantMapModal';
import { saveOrderToFirestore, savePlantToFirestore } from '../services/firebaseService';
import { Search, MapPin, ChevronRight, Package, Calendar, Truck, ShoppingBag, Plus, AlertCircle, Clock, Trash2, X, AlertTriangle, CheckCircle, RotateCcw, Archive, Undo2 } from 'lucide-react';

interface OrdersScreenProps {
  onNavigate: (screen: ScreenType) => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCreateNewOrderClick: () => void;
  onDeleteOrder?: (orderId: string) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
}

type TabType = 'Active' | 'Ready' | 'Pending' | 'Partial Pickup' | 'Completed' | 'Cancelled' | 'All';

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  onNavigate,
  orders,
  onSelectOrder,
  onCreateNewOrderClick,
  onDeleteOrder,
  onUpdateOrder
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('Active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [mapModalOrder, setMapModalOrder] = useState<Order | null>(null);
  const [toastNotification, setToastNotification] = useState<{ text: string; orderToUndo?: Order } | null>(null);

  const showToast = (text: string, orderToUndo?: Order) => {
    setToastNotification({ text, orderToUndo });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const validOrders = orders.filter(o => o && o.id && !o.id.startsWith('ORD-DRAFT-'));

  const activeOrdersCount = validOrders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled' && !o.archived).length;
  const readyOrdersCount = validOrders.filter(o => o.status === 'Ready for Pickup' && !o.archived).length;
  const pendingOrdersCount = validOrders.filter(o => o.status === 'Pending' && !o.archived).length;
  const partialOrdersCount = validOrders.filter(o => (o.status === 'Partial Pickup' || !!o.hasPartialPickup || ((o.remainingItemsCount || 0) > 0 && (o.pickedUpItemsCount || 0) > 0)) && o.status !== 'Completed' && !o.archived).length;
  const completedOrdersCount = validOrders.filter(o => o.status === 'Completed' || !!o.archived).length;
  const cancelledOrdersCount = validOrders.filter(o => o.status === 'Cancelled').length;

  const filteredOrders = validOrders.filter(o => {
    const isPartial = o.status === 'Partial Pickup' || !!o.hasPartialPickup || ((o.remainingItemsCount || 0) > 0 && (o.pickedUpItemsCount || 0) > 0);
    const isCompleted = o.status === 'Completed' || !!o.archived;
    const isCancelled = o.status === 'Cancelled';
    const isActive = !isCompleted && !isCancelled;

    const matchesTab = 
      activeTab === 'Active' ? isActive :
      activeTab === 'Ready' ? (o.status === 'Ready for Pickup' && !isCompleted) :
      activeTab === 'Pending' ? (o.status === 'Pending' && !isCompleted) :
      activeTab === 'Partial Pickup' ? (isPartial && !isCompleted) :
      activeTab === 'Completed' ? isCompleted :
      activeTab === 'Cancelled' ? isCancelled :
      true; // 'All'

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.items && o.items.some(item => 
        (item.plant.name && item.plant.name.toLowerCase().includes(q)) ||
        (item.plant.botanicalName && item.plant.botanicalName.toLowerCase().includes(q)) ||
        (item.plant.commonName && item.plant.commonName.toLowerCase().includes(q)) ||
        (item.plant.itemNo && item.plant.itemNo.toLowerCase().includes(q)) ||
        (item.plant.barcode && item.plant.barcode.toLowerCase().includes(q))
      ));

    return matchesTab && matchesSearch;
  });

  const getFulfillmentIcon = (type: string) => {
    switch (type) {
      case 'Delivery': return <Truck className="w-4 h-4 text-[#0e6c4a]" />;
      case 'Pickup':
      case 'Pickup Later': return <Calendar className="w-4 h-4 text-[#0e6c4a]" />;
      case 'Take Now': default: return <ShoppingBag className="w-4 h-4 text-[#0e6c4a]" />;
    }
  };

  const handleConfirmComplete = (order: Order) => {
    if (onUpdateOrder) {
      const now = new Date();
      const updatedOrder: Order = {
        ...order,
        status: 'Completed',
        archived: true,
        completedAt: now.toISOString(),
        hasPartialPickup: false,
        remainingItemsCount: 0,
        pickedUpItemsCount: order.itemsCount,
        items: (order.items || []).map(item => ({
          ...item,
          pickedUpQuantity: item.quantity
        }))
      };
      onUpdateOrder(updatedOrder);
      showToast(`Order #${order.id} marked as Completed & Archived!`, order);
    }
    setOrderToComplete(null);
  };

  const handleReopenOrder = (order: Order) => {
    if (onUpdateOrder) {
      const updatedOrder: Order = {
        ...order,
        status: 'Ready for Pickup',
        archived: false,
        completedAt: undefined
      };
      onUpdateOrder(updatedOrder);
      showToast(`Order #${order.id} restored to Active orders queue.`);
    }
  };

  const handleConfirmDelete = (orderId: string) => {
    if (onDeleteOrder) {
      onDeleteOrder(orderId);
      showToast(`Order #${orderId} permanently deleted.`);
    }
    setOrderToDelete(null);
  };

  const handleMarkAsCancelled = (order: Order) => {
    if (onUpdateOrder) {
      onUpdateOrder({
        ...order,
        status: 'Cancelled'
      });
      showToast(`Order #${order.id} marked as Cancelled.`);
    }
    setOrderToDelete(null);
  };

  const handleLogOrderGPS = (plantId: string) => {
    if (!mapModalOrder || !mapModalOrder.items) return;

    const applyGps = (lat: number, lng: number) => {
      const timestamp = new Date().toISOString();
      const updatedItems = (mapModalOrder.items || []).map(item => {
        if (item.plant.id === plantId) {
          return {
            ...item,
            gpsLocation: { latitude: lat, longitude: lng, timestamp }
          };
        }
        return item;
      });

      const updatedOrder: Order = {
        ...mapModalOrder,
        items: updatedItems
      };

      const targetItem = (mapModalOrder.items || []).find(item => item.plant.id === plantId);
      if (targetItem) {
        savePlantToFirestore({
          ...targetItem.plant,
          gpsLocation: { latitude: lat, longitude: lng, timestamp }
        });
      }

      setMapModalOrder(updatedOrder);
      if (onUpdateOrder) {
        onUpdateOrder(updatedOrder);
      }
      saveOrderToFirestore(updatedOrder);
      showToast(`📍 Plant GPS coordinates saved to Order #${updatedOrder.id}`);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyGps(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn('GPS error in OrdersScreen:', err);
          applyGps(43.1482, -79.4623);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      applyGps(43.1482, -79.4623);
    }
  };

  const formatCompletionDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-5">
      {/* Toast Notification Banner with optional Undo */}
      {toastNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#012d1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#a0f4c8]/30 flex items-center gap-3 animate-fade-in max-w-md w-[92%]">
          <CheckCircle className="w-5 h-5 text-[#a0f4c8] shrink-0" />
          <div className="flex-1 text-xs font-bold text-[#f3f4f0]">
            {toastNotification.text}
          </div>
          {toastNotification.orderToUndo && (
            <button
              type="button"
              onClick={() => {
                if (toastNotification.orderToUndo) {
                  handleReopenOrder(toastNotification.orderToUndo);
                  setToastNotification(null);
                }
              }}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-white/60 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#012d1d]">Order Management</h2>
          <p className="text-xs text-[#414844] mt-0.5">Track active staging orders, customer pickups, and archived records.</p>
        </div>
        <button
          onClick={onCreateNewOrderClick}
          className="bg-[#461702] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#622c13] transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Order</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order #, customer, or plant name / SKU..."
          className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#c1c8c2] gap-1.5 overflow-x-auto text-xs font-bold pb-0.5 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('Active')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'Active'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
        >
          <span>Active Orders</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'Active' ? 'bg-[#012d1d] text-[#a0f4c8]' : 'bg-[#e2e3df] text-[#414844]'}`}>
            {activeOrdersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Ready')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'Ready'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
        >
          <span>Ready</span>
          {readyOrdersCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'Ready' ? 'bg-[#19724f] text-white' : 'bg-[#a0f4c8] text-[#19724f]'}`}>
              {readyOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Pending')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'Pending'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
        >
          <span>Pending</span>
          {pendingOrdersCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'Pending' ? 'bg-[#461702] text-white' : 'bg-[#facc15]/30 text-[#461702]'}`}>
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Partial Pickup')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'Partial Pickup'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
        >
          <span>Partial Pickup</span>
          {partialOrdersCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'Partial Pickup' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
              {partialOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Completed')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'Completed'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
          title="Orders where customer picked up plants - safely archived and stored for records"
        >
          <Archive className="w-3.5 h-3.5 text-[#0e6c4a]" />
          <span>Completed (Archived)</span>
          {completedOrdersCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'Completed' ? 'bg-[#0e6c4a] text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {completedOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Cancelled')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'Cancelled'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
        >
          <span>Cancelled</span>
          {cancelledOrdersCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'Cancelled' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'}`}>
              {cancelledOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('All')}
          className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'All'
              ? 'border-[#012d1d] text-[#012d1d]'
              : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
          }`}
        >
          <span>All Orders</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'All' ? 'bg-[#012d1d] text-[#a0f4c8]' : 'bg-[#e2e3df] text-[#414844]'}`}>
            {validOrders.length}
          </span>
        </button>
      </div>

      {/* Helper Banner for Completed / Archived View */}
      {activeTab === 'Completed' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-950">
          <Archive className="w-5 h-5 text-emerald-700 shrink-0" />
          <div className="flex-1">
            <span className="font-extrabold block text-emerald-900">Archived Order History</span>
            <span className="text-[11px] text-emerald-800">
              Orders marked as Completed (Customer Picked Up) are kept safely here for sales records and history. You can reopen any order back to the active queue at any time.
            </span>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center bg-[#f3f4f0] rounded-xl text-[#717973] flex flex-col items-center justify-center gap-2">
            <Package className="w-8 h-8 text-[#c1c8c2]" />
            <p className="text-sm font-bold text-[#1a1c1a]">
              {activeTab === 'Completed' 
                ? 'No completed orders in the archive yet.' 
                : activeTab === 'Active' 
                ? 'No active orders currently awaiting fulfillment or pickup.' 
                : 'No orders found matching criteria.'}
            </p>
            {activeTab === 'Active' && (
              <p className="text-xs text-[#717973] max-w-sm">
                Tap <strong>New Order</strong> above to create an order, or check the <strong>Completed (Archived)</strong> tab for previous customer pickups.
              </p>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPartial = order.status === 'Partial Pickup' || !!order.hasPartialPickup || ((order.remainingItemsCount || 0) > 0 && (order.pickedUpItemsCount || 0) > 0);
            const remainingCount = order.remainingItemsCount ?? (isPartial ? (order.itemsCount - (order.pickedUpItemsCount || 0)) : 0);
            const isCompleted = order.status === 'Completed' || !!order.archived;

            return (
              <div
                key={order.id}
                onClick={() => {
                  onSelectOrder(order);
                  onNavigate('finalization');
                }}
                className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer group ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-500'
                    : isPartial 
                    ? 'border-amber-300 hover:border-amber-500 bg-amber-50/20' 
                    : order.status === 'Cancelled'
                    ? 'border-red-200 bg-red-50/20 opacity-80'
                    : 'border-[#c1c8c2] hover:border-[#012d1d]'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-base sm:text-lg text-[#012d1d] group-hover:underline">
                        {order.customerName ? `${order.customerName} - ${order.id}` : order.id}
                      </span>
                      {isCompleted ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-700" />
                          <span>Completed / Customer Picked Up</span>
                        </span>
                      ) : isPartial ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          <span>Partial Pickup ({remainingCount > 0 ? `${remainingCount} remaining` : 'Split Load'})</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          order.status === 'Ready for Pickup' 
                            ? 'bg-[#a0f4c8] text-[#19724f]'
                            : order.status === 'Pending'
                            ? 'bg-[#facc15]/30 text-[#461702]'
                            : order.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-[#f3f4f0] text-[#717973]'
                        }`}>
                          {order.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#525a55] mt-1 flex-wrap font-medium">
                      <span className="inline-flex items-center gap-1 bg-[#f3f4f0] px-2 py-0.5 rounded-md text-[#313733]">
                        <Calendar className="w-3 h-3 text-[#0e6c4a]" />
                        <span>Created: <strong>{formatOrderCreatedDate(order)}</strong></span>
                      </span>
                      <span className="text-[#c1c8c2]">•</span>
                      <span className="inline-flex items-center gap-1 bg-[#f3f4f0] px-2 py-0.5 rounded-md text-[#313733]">
                        <Clock className="w-3 h-3 text-[#461702]" />
                        <span>Scheduled: <strong>{formatOrderScheduledTime(order)}</strong></span>
                      </span>
                      {order.completedAt && (
                        <>
                          <span className="text-[#c1c8c2]">•</span>
                          <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md text-emerald-900 font-bold">
                            <CheckCircle className="w-3 h-3 text-emerald-700" />
                            <span>Picked Up: {formatCompletionDate(order.completedAt)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-lg sm:text-xl text-[#012d1d] block">
                      ${order.total.toFixed(2)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#717973]">
                      {order.itemsCount} items
                    </span>
                  </div>
                </div>

                {/* Holding Location & Pickup Status Notice */}
                <div className="bg-[#f3f4f0] px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 text-[#012d1d]">
                    <MapPin className="w-3.5 h-3.5 text-[#012d1d] shrink-0" />
                    <span className="font-bold truncate">
                      {order.holdingLocation || 'Holding Location Not Assigned'}
                    </span>
                  </div>
                  {isCompleted ? (
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <CheckCircle className="w-3 h-3 text-emerald-700" />
                      <span>Archived in History</span>
                    </span>
                  ) : isPartial && remainingCount > 0 ? (
                    <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>{remainingCount} plants held for pickup</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-[#717973] uppercase tracking-wider shrink-0">
                      Zone
                    </span>
                  )}
                </div>

                {/* Items Preview with Product Number & Size for Yard Loaders */}
                {order.items && order.items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {order.items.slice(0, 4).map((item, idx) => (
                      <span 
                        key={`${item.plant.id}-${idx}`}
                        className="inline-flex items-center gap-1.5 text-[11px] bg-[#f9faf6] border border-[#c1c8c2] px-2 py-1 rounded-lg text-[#1a1c1a]"
                      >
                        <span className="font-bold text-[#012d1d]">{item.quantity}x</span>
                        <span className="truncate max-w-[130px] font-semibold">{item.plant.name}</span>
                        <span className="font-mono font-bold text-[#a0f4c8] bg-[#012d1d] px-1.5 py-0.2 rounded text-[10px]">
                          #{item.plant.itemNo || item.plant.barcode || 'N/A'}
                        </span>
                        <span className="font-bold text-amber-100 bg-[#461702] px-1.5 py-0.2 rounded text-[10px]">
                          {item.plant.size || 'Std'}
                        </span>
                      </span>
                    ))}
                    {order.items.length > 4 && (
                      <span className="text-[11px] text-[#717973] font-bold self-center px-1">
                        +{order.items.length - 4} more items
                      </span>
                    )}
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex flex-wrap justify-between items-center text-xs text-[#414844] pt-2 border-t border-[#f3f4f0] gap-2">
                  <div className="flex items-center gap-1.5">
                    {getFulfillmentIcon(order.type)}
                    <span className="font-semibold">{order.type}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary Completed / Reopen Button */}
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToComplete(order);
                        }}
                        className="p-1.5 px-3 rounded-xl bg-[#0e6c4a] hover:bg-[#012d1d] text-white flex items-center gap-1.5 text-xs font-extrabold transition-all shadow-2xs border border-[#a0f4c8]/30 cursor-pointer active:scale-98"
                        title="Customer picked up order: mark as completed and archive from active list"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-[#a0f4c8]" />
                        <span>Completed</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReopenOrder(order);
                        }}
                        className="p-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="Restore order to Active orders list"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Reopen to Active</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      className="p-1.5 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                      title="Cancel or Delete this order"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Cancel / Delete</span>
                    </button>

                    {order.items && order.items.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapModalOrder(order);
                        }}
                        className="p-1.5 px-2.5 rounded-xl bg-[#a0f4c8]/30 hover:bg-[#012d1d] text-[#012d1d] hover:text-[#a0f4c8] border border-[#0e6c4a]/30 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="View Google Map with pins for all plant GPS locations in this order"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#0e6c4a]" />
                        <span>GPS Map</span>
                        {(() => {
                          const gpsCount = (order.items || []).filter(it => !!it.gpsLocation).length;
                          return gpsCount > 0 ? (
                            <span className="bg-[#012d1d] text-[#a0f4c8] text-[9px] font-black px-1.5 py-0.2 rounded-full">
                              {gpsCount}
                            </span>
                          ) : null;
                        })()}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order);
                        onNavigate('holding_location');
                      }}
                      className="p-1.5 px-2.5 rounded-xl bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                      title="Change holding area"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Change Zone</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order);
                        onNavigate('finalization');
                      }}
                      className="p-1.5 px-3 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white flex items-center gap-1 text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
                    >
                      <span>View & Edit</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Complete & Archive Order Confirmation Modal */}
      {orderToComplete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOrderToComplete(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-base text-[#1a1c1a]">Customer Picked Up Order?</h3>
                <p className="text-xs text-[#717973] mt-0.5">
                  Order <span className="font-bold text-[#012d1d]">#{orderToComplete.id}</span> • {orderToComplete.customerName} (${orderToComplete.total.toFixed(2)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderToComplete(null)}
                className="p-1 text-[#717973] hover:text-[#1a1c1a] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f3f4f0] p-3.5 rounded-xl border border-[#e2e3df] text-xs text-[#414844] flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold text-[#012d1d] border-b border-[#e2e3df] pb-2">
                <span>Items: {orderToComplete.itemsCount} plants</span>
                <span>Zone: {orderToComplete.holdingLocation || 'Staging Bay'}</span>
              </div>
              <p className="text-[11px] text-[#525a55] leading-relaxed">
                Confirming completion marks this order as <strong>Customer Picked Up</strong> and archives it from the active order queue.
              </p>
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg p-2 text-[11px] font-medium flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>The order is safely saved in the <strong>Completed (Archived)</strong> tab for sales records and history (not deleted).</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#e2e3df]">
              <button
                type="button"
                onClick={() => handleConfirmComplete(orderToComplete)}
                className="flex-1 bg-[#0e6c4a] hover:bg-[#012d1d] text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <CheckCircle className="w-4 h-4 text-[#a0f4c8]" />
                <span>Complete & Archive</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderToComplete(null)}
                className="bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Cancel Order Confirmation Modal */}
      {orderToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOrderToDelete(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-base text-[#1a1c1a]">Cancel or Delete Order?</h3>
                <p className="text-xs text-[#717973] mt-0.5">
                  Order <span className="font-bold text-[#012d1d]">#{orderToDelete.id}</span> • {orderToDelete.customerName} (${orderToDelete.total.toFixed(2)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="p-1 text-[#717973] hover:text-[#1a1c1a] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f3f4f0] p-3 rounded-xl border border-[#e2e3df] text-xs text-[#414844] space-y-1">
              <p className="font-bold text-[#1a1c1a]">Choose an action:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#717973]">
                <li><strong className="text-red-700">Delete Permanently:</strong> Completely removes this order from the system and database.</li>
                <li><strong className="text-amber-800">Mark as Cancelled:</strong> Keeps the record in system history with a "Cancelled" status for bookkeeping.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#e2e3df]">
              <button
                type="button"
                onClick={() => handleConfirmDelete(orderToDelete.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAsCancelled(orderToDelete)}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4" />
                <span>Mark as Cancelled</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOrderToDelete(null)}
              className="w-full bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Keep Order (Go Back)
            </button>
          </div>
        </div>
      )}

      {/* Plant GPS Google Map Modal for Order */}
      {mapModalOrder && mapModalOrder.items && (
        <PlantMapModal
          isOpen={mapModalOrder !== null}
          onClose={() => setMapModalOrder(null)}
          selectedItem={mapModalOrder.items[0] || null}
          allItems={mapModalOrder.items}
          gpsLoggedMap={mapModalOrder.items.reduce((acc, it) => {
            if (it.gpsLocation) {
              acc[it.plant.id] = `${it.gpsLocation.latitude.toFixed(4)}° N, ${Math.abs(it.gpsLocation.longitude).toFixed(4)}° W`;
            }
            return acc;
          }, {} as Record<string, string>)}
          onLogGPS={handleLogOrderGPS}
          orderId={mapModalOrder.id}
          customerName={mapModalOrder.customerName}
        />
      )}
    </div>
  );
};

