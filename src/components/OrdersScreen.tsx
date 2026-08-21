import React, { useState } from 'react';
import { ScreenType, Order } from '../types';
import { formatOrderCreatedDate, formatOrderScheduledTime } from '../utils/dateUtils';
import { Search, MapPin, ChevronRight, Package, Calendar, Truck, ShoppingBag, Plus, AlertCircle, Clock, Tag, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface OrdersScreenProps {
  onNavigate: (screen: ScreenType) => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCreateNewOrderClick: () => void;
  onDeleteOrder?: (orderId: string) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  onNavigate,
  orders,
  onSelectOrder,
  onCreateNewOrderClick,
  onDeleteOrder,
  onUpdateOrder
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Ready' | 'Partial Pickup' | 'Completed' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const filteredOrders = orders.filter(o => {
    const isPartial = o.status === 'Partial Pickup' || !!o.hasPartialPickup || ((o.remainingItemsCount || 0) > 0 && (o.pickedUpItemsCount || 0) > 0);
    
    const matchesTab = 
      activeTab === 'All' ? true :
      activeTab === 'Pending' ? o.status === 'Pending' :
      activeTab === 'Ready' ? (o.status === 'Ready for Pickup' || (o.status === 'Partial Pickup' && !isPartial)) :
      activeTab === 'Partial Pickup' ? isPartial :
      activeTab === 'Completed' ? o.status === 'Completed' :
      o.status === 'Cancelled';

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

  const handleConfirmDelete = (orderId: string) => {
    if (onDeleteOrder) {
      onDeleteOrder(orderId);
    }
    setOrderToDelete(null);
  };

  const handleMarkAsCancelled = (order: Order) => {
    if (onUpdateOrder) {
      onUpdateOrder({
        ...order,
        status: 'Cancelled'
      });
    }
    setOrderToDelete(null);
  };

  const partialOrdersCount = orders.filter(o => o.status === 'Partial Pickup' || !!o.hasPartialPickup || ((o.remainingItemsCount || 0) > 0 && (o.pickedUpItemsCount || 0) > 0)).length;
  const cancelledOrdersCount = orders.filter(o => o.status === 'Cancelled').length;

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#012d1d]">Order Management</h2>
          <p className="text-xs text-[#414844] mt-0.5">Track, route, and finalize nursery customer orders.</p>
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

      {/* Tabs */}
      <div className="flex border-b border-[#c1c8c2] gap-2 overflow-x-auto text-xs font-bold">
        {(['All', 'Pending', 'Ready', 'Partial Pickup', 'Completed', 'Cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === tab
                ? 'border-[#012d1d] text-[#012d1d]'
                : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
            }`}
          >
            {tab} {tab === 'All' ? `(${orders.length})` : tab === 'Partial Pickup' && partialOrdersCount > 0 ? `(${partialOrdersCount})` : tab === 'Cancelled' && cancelledOrdersCount > 0 ? `(${cancelledOrdersCount})` : ''}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center bg-[#f3f4f0] rounded-xl text-[#717973]">
            <Package className="w-8 h-8 mx-auto mb-2 text-[#c1c8c2]" />
            <p className="text-sm font-medium">No orders found matching criteria.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPartial = order.status === 'Partial Pickup' || !!order.hasPartialPickup || ((order.remainingItemsCount || 0) > 0 && (order.pickedUpItemsCount || 0) > 0);
            const remainingCount = order.remainingItemsCount ?? (isPartial ? (order.itemsCount - (order.pickedUpItemsCount || 0)) : 0);

            return (
              <div
                key={order.id}
                onClick={() => {
                  onSelectOrder(order);
                  onNavigate('finalization');
                }}
                className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer group ${
                  isPartial 
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
                      {isPartial ? (
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
                            : order.status === 'Completed'
                            ? 'bg-[#e2e3df] text-[#414844]'
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
                  {isPartial && remainingCount > 0 ? (
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      className="p-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                      title="Cancel or Delete this order"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Cancel / Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order);
                        onNavigate('holding_location');
                      }}
                      className="p-1.5 px-2.5 rounded-lg bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
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
                      className="p-1.5 px-3 rounded-lg bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white flex items-center gap-1 text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
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
    </div>
  );
};
