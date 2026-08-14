import React, { useState } from 'react';
import { ScreenType, Order } from '../types';
import { Search, MapPin, ChevronRight, Package, Calendar, Truck, ShoppingBag, Plus, AlertCircle, Clock } from 'lucide-react';

interface OrdersScreenProps {
  onNavigate: (screen: ScreenType) => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCreateNewOrderClick: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  onNavigate,
  orders,
  onSelectOrder,
  onCreateNewOrderClick
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Ready' | 'Partial Pickup' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = orders.filter(o => {
    const isPartial = o.status === 'Partial Pickup' || !!o.hasPartialPickup || ((o.remainingItemsCount || 0) > 0 && (o.pickedUpItemsCount || 0) > 0);
    
    const matchesTab = 
      activeTab === 'All' ? true :
      activeTab === 'Pending' ? o.status === 'Pending' :
      activeTab === 'Ready' ? (o.status === 'Ready for Pickup' || (o.status === 'Partial Pickup' && !isPartial)) :
      activeTab === 'Partial Pickup' ? isPartial :
      o.status === 'Completed';

    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());

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

  const partialOrdersCount = orders.filter(o => o.status === 'Partial Pickup' || !!o.hasPartialPickup || ((o.remainingItemsCount || 0) > 0 && (o.pickedUpItemsCount || 0) > 0)).length;

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
          placeholder="Search by order # or customer name..."
          className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#c1c8c2] gap-2 overflow-x-auto text-xs font-bold">
        {(['All', 'Pending', 'Ready', 'Partial Pickup', 'Completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === tab
                ? 'border-[#012d1d] text-[#012d1d]'
                : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
            }`}
          >
            {tab} {tab === 'All' ? `(${orders.length})` : tab === 'Partial Pickup' && partialOrdersCount > 0 ? `(${partialOrdersCount})` : ''}
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
                            : 'bg-[#f3f4f0] text-[#717973]'
                        }`}>
                          {order.status}
                        </span>
                      )}
                    </div>
                    <span className="block text-xs text-[#717973] mt-0.5">
                      Created: {order.date || 'Today'} • Scheduled: {order.scheduledTime || 'Scheduled'}
                    </span>
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

                {/* Card Footer Actions */}
                <div className="flex justify-between items-center text-xs text-[#414844] pt-2 border-t border-[#f3f4f0]">
                  <div className="flex items-center gap-1.5">
                    {getFulfillmentIcon(order.type)}
                    <span className="font-semibold">{order.type}</span>
                  </div>

                  <div className="flex items-center gap-2">
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
    </div>
  );
};
