import React from 'react';
import { ScreenType, Order, PlantItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { PlusCircle, ChevronRight, Smartphone } from 'lucide-react';

interface HomeScreenProps {
  userName: string;
  onNavigate: (screen: ScreenType) => void;
  orders: Order[];
  inventory: PlantItem[];
  onSelectOrder?: (order: Order) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userName,
  onNavigate,
  orders,
  inventory,
  onSelectOrder
}) => {
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Ready for Pickup');

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Welcome & Primary CTA */}
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#012d1d] tracking-tight">
            Good morning, {userName.split(' ')[0]}.
          </h1>
          <p className="text-sm text-[#414844] mt-1">Here is your daily nursery operations overview.</p>
        </div>

        {/* Big Terracotta New Order Button */}
        <button
          onClick={() => onNavigate('scan')}
          className="w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] text-white flex flex-col items-center justify-center p-6 rounded-xl shadow-md transition-all h-32 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-8 h-8 text-white fill-white/20" />
          </div>
          <span className="font-semibold text-xl tracking-tight">New Order</span>
        </button>
      </section>

      {/* Operations Summary */}
      <section className="flex flex-col gap-5">
        {/* Pending Orders Summary */}
        <div className="bg-[#f3f4f0] rounded-xl p-5 border border-[#c1c8c2] shadow-2xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg text-[#012d1d]">Today's Orders</h2>
            <span className="bg-[#1b4332] text-[#86af99] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {pendingOrders.length} PENDING
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOrders.slice(0, 4).map((order) => {
              const thumbImage = order.items?.[0]?.plant.image || DEFAULT_PLANT_IMAGE;

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    if (onSelectOrder) onSelectOrder(order);
                    onNavigate('finalization');
                  }}
                  className="flex gap-3 items-center bg-white p-3 rounded-xl border border-[#c1c8c2]/40 hover:border-[#012d1d] cursor-pointer transition-all shadow-2xs group"
                >
                  <img
                    src={thumbImage}
                    alt={order.id}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                  />
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-base text-[#012d1d] group-hover:underline">
                        {order.id}
                      </span>
                      <span className="text-xs text-[#414844] font-medium">{order.itemsCount} items</span>
                    </div>
                    <span className="text-xs text-[#414844] block mt-0.5">
                      {order.type}: {order.scheduledTime || 'Scheduled'}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#717973] group-hover:text-[#012d1d] transition-colors" />
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onNavigate('orders')}
            className="w-full mt-4 border border-[#012d1d] text-[#012d1d] font-semibold py-2.5 rounded-lg hover:bg-[#e2e3df] transition-colors text-sm cursor-pointer"
          >
            View All Orders
          </button>
        </div>
      </section>
    </div>
  );
};

