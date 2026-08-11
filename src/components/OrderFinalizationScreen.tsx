import React, { useState } from 'react';
import { ScreenType, Order } from '../types';
import { CheckCircle, ShoppingBag, Calendar, Truck, MapPin, Mail, Building, MessageSquare, ArrowLeft, ArrowRightLeft, Info } from 'lucide-react';

interface OrderFinalizationScreenProps {
  onNavigate: (screen: ScreenType) => void;
  order?: Order | null;
  onSendNotification?: (type: string) => void;
}

export const OrderFinalizationScreen: React.FC<OrderFinalizationScreenProps> = ({
  onNavigate,
  order,
  onSendNotification
}) => {
  const [fulfillment, setFulfillment] = useState<'Take Now' | 'Pickup Later' | 'Delivery' | 'Pick-up/Delivery'>('Take Now');
  const [scheduledDate, setScheduledDate] = useState<string>('2023-10-27');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeOrder = order || {
    id: '#90210-A',
    customerName: 'Sarah Jenkins',
    total: 1450.00,
    itemsCount: 14,
    type: 'Take Now',
    scheduledTime: '10/27/2023',
    status: 'Ready for Pickup',
    date: 'Oct 24, 2023',
    holdingLocation: 'Greenhouse B, Aisle 4, Bay 12'
  };

  const handleAction = (msg: string) => {
    setToastMessage(msg);
    if (onSendNotification) onSendNotification(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-xl mx-auto pb-44 animate-fade-in flex flex-col gap-5">
      {/* Success Banner */}
      <div className="bg-[#a0f4c8] text-[#002113] p-3.5 rounded-xl flex items-center justify-center gap-2 shadow-xs">
        <CheckCircle className="w-5 h-5 text-[#005236] fill-[#a0f4c8]" />
        <span className="font-semibold text-sm">Order Saved Successfully</span>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-[#1b4332] text-[#a0f4c8] p-3 rounded-xl text-center font-medium text-xs shadow-md animate-fade-in">
          ✓ {toastMessage}
        </div>
      )}

      {/* Main Order Header Summary */}
      <div className="text-center py-2">
        <span className="text-xs font-bold text-[#414844] tracking-wider uppercase">
          Order {activeOrder.id}
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#012d1d] my-1">
          ${activeOrder.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </h2>
        <p className="text-base font-semibold text-[#1a1c1a]">
          {activeOrder.customerName}
        </p>
      </div>

      {/* Fulfillment Method Box */}
      <div className="bg-[#f3f4f0] p-4 rounded-xl border border-[#c1c8c2] flex flex-col gap-3">
        <label className="text-xs font-bold text-[#414844] uppercase tracking-wider">
          Fulfillment Method
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setFulfillment('Take Now')}
            className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
              fulfillment === 'Take Now'
                ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#19724f]'
                : 'bg-[#e2e3df] border-transparent text-[#414844] hover:bg-[#d9dad7]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Take Now</span>
          </button>

          <button
            onClick={() => setFulfillment('Pickup Later')}
            className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
              fulfillment === 'Pickup Later'
                ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#19724f]'
                : 'bg-[#e2e3df] border-transparent text-[#414844] hover:bg-[#d9dad7]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pickup Later</span>
          </button>

          <button
            onClick={() => setFulfillment('Delivery')}
            className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
              fulfillment === 'Delivery'
                ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#19724f]'
                : 'bg-[#e2e3df] border-transparent text-[#414844] hover:bg-[#d9dad7]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Delivery</span>
          </button>

          <button
            onClick={() => setFulfillment('Pick-up/Delivery')}
            className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
              fulfillment === 'Pick-up/Delivery'
                ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#19724f]'
                : 'bg-[#e2e3df] border-transparent text-[#414844] hover:bg-[#d9dad7]'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="leading-tight">Pick-up/Delivery</span>
          </button>
        </div>

        {fulfillment === 'Pick-up/Delivery' && (
          <div className="bg-[#a0f4c8]/30 border border-[#0e6c4a]/40 p-3 rounded-xl text-xs text-[#012d1d] flex items-start gap-2.5 animate-fade-in">
            <Info className="w-4 h-4 text-[#0e6c4a] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Split Order / Partial Fulfillment</span>
              <span className="text-[#414844]">Customer is taking a portion of items now and scheduling the remaining items for later pickup or delivery.</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#414844] uppercase mb-1">
            Scheduled Date
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full bg-white border border-[#c1c8c2] rounded-lg px-3 py-2 text-sm font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
          />
        </div>
      </div>

      {/* Holding Location Summary Box */}
      <div className="bg-[#f3f4f0] p-4 rounded-xl border border-[#c1c8c2] flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#a0f4c8] text-[#19724f] flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="block text-xs font-bold text-[#414844] uppercase tracking-wider">
            Holding Location
          </span>
          <span className="block text-base font-semibold text-[#012d1d] mt-0.5">
            {activeOrder.holdingLocation || 'Greenhouse B, Aisle 4, Bay 12'}
          </span>
          <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-[#a0f4c8] text-[#19724f] text-[11px] font-bold">
            • Ready for Pickup
          </span>
        </div>
      </div>

      {/* Notification Action Buttons */}
      <div className="flex flex-col gap-2.5 mt-2">
        <button
          onClick={() => handleAction(`Receipt emailed to ${activeOrder.customerName}`)}
          className="w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl shadow-xs transition-all flex justify-center items-center gap-2 cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span>Email Customer Receipt</span>
        </button>

        <button
          onClick={() => handleAction('Order details sent to Main Office')}
          className="w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl shadow-xs transition-all flex justify-center items-center gap-2 cursor-pointer"
        >
          <Building className="w-4 h-4" />
          <span>Email Office</span>
        </button>

        <button
          onClick={() => handleAction('SMS notification dispatched to assigned staff')}
          className="w-full bg-white hover:bg-[#f3f4f0] active:scale-[0.99] text-[#012d1d] font-semibold py-3.5 px-4 rounded-xl border border-[#012d1d] transition-all flex justify-center items-center gap-2 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Text Employee Notification</span>
        </button>
      </div>

      {/* Return to Orders */}
      <div className="text-center mt-3">
        <button
          onClick={() => onNavigate('orders')}
          className="text-xs font-bold text-[#414844] hover:text-[#012d1d] hover:underline"
        >
          Return to Orders
        </button>
      </div>
    </div>
  );
};
