import React, { useState } from 'react';
import { ScreenType, Order, PlantItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { formatOrderScheduledTime } from '../utils/dateUtils';
import { PlusCircle, ChevronRight, Smartphone, BookOpen, UserPlus, Mail, Barcode, Package, CheckCircle2, X } from 'lucide-react';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import { OrderDraft } from '../services/orderAutoSaveService';

interface HomeScreenProps {
  userName: string;
  onNavigate: (screen: ScreenType) => void;
  orders: Order[];
  inventory: PlantItem[];
  onSelectOrder?: (order: Order) => void;
  onResumeDraft?: (draft: OrderDraft) => void;
  onSaveDraft?: (draft: OrderDraft) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userName,
  onNavigate,
  orders,
  inventory,
  onSelectOrder,
  onResumeDraft,
  onSaveDraft
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  const pendingOrders = orders.filter(o => o && o.id && !o.id.startsWith('ORD-DRAFT-') && (o.status === 'Pending' || o.status === 'Ready for Pickup'));

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#012d1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#a0f4c8]/30 flex items-center gap-3 animate-fade-in max-w-md w-[92%]">
          <CheckCircle2 className="w-5 h-5 text-[#a0f4c8] shrink-0" />
          <span className="flex-1 text-xs font-bold text-[#f3f4f0]">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Draft Recovery Banner if uncommitted draft exists */}
      <DraftRecoveryBanner 
        orders={orders}
        onResumeDraft={(draft) => {
          if (onResumeDraft) {
            onResumeDraft(draft);
          } else {
            onNavigate('scan');
          }
        }}
        onSaveDraft={(draft) => {
          if (onSaveDraft) {
            onSaveDraft(draft);
          }
          showToast(`Order for ${draft.customerName || 'Walk In Customer'} has been saved and the draft warning removed.`);
        }}
      />

      {/* Welcome & Primary CTA */}
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#012d1d] tracking-tight">
            Good morning, {userName.split(' ')[0]}.
          </h1>
          <p className="text-sm text-[#414844] mt-1">Here is your daily nursery operations overview.</p>
        </div>

        {/* Quick Operations Action (New Order) */}
        <div>
          {/* Big Terracotta New Order Button */}
          <button
            onClick={() => {
              if (onSelectOrder) onSelectOrder(null as any);
              onNavigate('scan');
            }}
            className="w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] text-white flex flex-col items-center justify-center p-5 rounded-xl shadow-md transition-all h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-7 h-7 text-white fill-white/20" />
            </div>
            <span className="font-semibold text-lg tracking-tight">New Order</span>
          </button>
        </div>
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

          {pendingOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-[#c1c8c2]/50 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-11 h-11 rounded-full bg-[#f3f4f0] flex items-center justify-center text-[#012d1d]">
                <Package className="w-5 h-5 text-[#717973]" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#012d1d]">No Active Orders Pending</h3>
              <p className="text-xs text-[#525a55] max-w-sm">
                No orders are currently waiting in staging. Tap <strong>New Order</strong> above to create or scan a new customer order.
              </p>
            </div>
          ) : (
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
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-semibold text-base text-[#012d1d] group-hover:underline truncate">
                          {order.customerName ? `${order.customerName} - ${order.id}` : order.id}
                        </span>
                        <span className="text-xs text-[#414844] font-medium shrink-0">{order.itemsCount} items</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#414844] flex-wrap">
                        <span>{order.type}: <strong>{formatOrderScheduledTime(order)}</strong></span>
                        {order.holdingLocation && (
                          <>
                            <span className="text-[#c1c8c2]">•</span>
                            <span className="text-[#012d1d] font-bold truncate max-w-[140px]">
                              {order.holdingLocation}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#717973] group-hover:text-[#012d1d] transition-colors" />
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => onNavigate('orders')}
            className="w-full mt-4 border border-[#012d1d] text-[#012d1d] font-semibold py-2.5 rounded-lg hover:bg-[#e2e3df] transition-colors text-sm cursor-pointer"
          >
            View All Orders
          </button>
        </div>

        {/* Staff User Guide Card */}
        <div 
          onClick={() => onNavigate('instructions')}
          className="bg-gradient-to-r from-[#012d1d] to-[#0e6c4a] text-white rounded-2xl p-4.5 border border-[#19724f]/40 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#a0f4c8]/20 text-[#a0f4c8] flex items-center justify-center shrink-0 border border-[#a0f4c8]/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#a0f4c8] bg-[#a0f4c8]/20 px-2 py-0.2 rounded-full">
                  Staff Handbook
                </span>
                <span className="text-xs text-white/70">Step-by-Step Instructions</span>
              </div>
              <h3 className="font-extrabold text-base text-white mt-0.5 group-hover:underline">
                User Guide & Operations Manual
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                Entering new customers, editing orders, partial pickups, & emailing staff.
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-[#a0f4c8] shrink-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </section>
    </div>
  );
};

