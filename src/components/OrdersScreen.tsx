import React, { useState } from 'react';
import { ScreenType, Order } from '../types';
import { Search, MapPin, ChevronRight, Package, Calendar, Truck, ShoppingBag, Plus } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Ready' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = orders.filter(o => {
    const matchesTab = 
      activeTab === 'All' ? true :
      activeTab === 'Pending' ? o.status === 'Pending' :
      activeTab === 'Ready' ? o.status === 'Ready for Pickup' :
      o.status === 'Completed';

    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getFulfillmentIcon = (type: string) => {
    switch (type) {
      case 'Delivery': return <Truck className="w-4 h-4 text-[#0e6c4a]" />;
      case 'Pickup': return <Calendar className="w-4 h-4 text-[#0e6c4a]" />;
      case 'Take Now': default: return <ShoppingBag className="w-4 h-4 text-[#0e6c4a]" />;
    }
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#012d1d]">Order Management</h2>
          <p className="text-xs text-[#414844] mt-0.5">Track, route, and finalize nursery customer orders.</p>
        </div>
        <button
          onClick={onCreateNewOrderClick}
          className="bg-[#461702] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#622c13] transition-colors shadow-xs"
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
        {(['All', 'Pending', 'Ready', 'Completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 ${
              activeTab === tab
                ? 'border-[#012d1d] text-[#012d1d]'
                : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
            }`}
          >
            {tab} {tab === 'All' ? `(${orders.length})` : ''}
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
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl p-4 border border-[#c1c8c2] hover:border-[#012d1d] shadow-2xs transition-all flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-[#012d1d]">
                      {order.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.status === 'Ready for Pickup' 
                        ? 'bg-[#a0f4c8] text-[#19724f]'
                        : order.status === 'Pending'
                        ? 'bg-[#facc15]/30 text-[#461702]'
                        : 'bg-[#e2e3df] text-[#414844]'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <span className="block text-sm font-semibold text-[#1a1c1a] mt-0.5">
                    {order.customerName}
                  </span>
                </div>

                <span className="font-extrabold text-lg text-[#012d1d]">
                  ${order.total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-[#414844] pt-2 border-t border-[#f3f4f0]">
                <div className="flex items-center gap-1.5">
                  {getFulfillmentIcon(order.type)}
                  <span>{order.type} • {order.itemsCount} items</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectOrder(order);
                      onNavigate('holding_location');
                    }}
                    className="p-1.5 rounded-lg bg-[#f3f4f0] text-[#012d1d] hover:bg-[#a0f4c8] flex items-center gap-1 text-[11px] font-bold"
                    title="Assign Placement"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Routing
                  </button>

                  <button
                    onClick={() => {
                      onSelectOrder(order);
                      onNavigate('finalization');
                    }}
                    className="p-1.5 rounded-lg bg-[#461702] text-white hover:bg-[#622c13] flex items-center gap-1 text-[11px] font-bold"
                  >
                    <span>Finalize</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
