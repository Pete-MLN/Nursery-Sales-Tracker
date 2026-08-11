import React, { useState } from 'react';
import { ScreenType, Order, PlantItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { PlusCircle, AlertTriangle, ChevronRight, Smartphone, QrCode, Copy, Check, ExternalLink, Wifi } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  const [copied, setCopied] = useState(false);
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Ready for Pickup');
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';
  const devUrl = 'https://ais-dev-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';
  const preUrl = 'https://ais-pre-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';

  const [selectedUrlType, setSelectedUrlType] = useState<'dev' | 'pre'>('dev');
  const appUrl = selectedUrlType === 'dev' ? (currentUrl || devUrl) : preUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      {/* 4-Phone Live Cloud Sync QR Banner */}
      <section className="bg-gradient-to-br from-[#002113] to-[#0d3b27] text-white rounded-2xl p-5 shadow-lg border border-[#19724f]/30">
        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="bg-white p-3 rounded-xl shadow-md border border-white/20 shrink-0">
            <QRCodeSVG
              value={appUrl}
              size={130}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#002113"
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-[#a0f4c8]/20 text-[#a0f4c8] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#a0f4c8]/30 mb-2">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Live Firestore Database Connected</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Scan with 4 Mobile Phones</h3>
            <div className="flex inline-flex bg-white/10 p-1 rounded-xl border border-white/20 my-2">
              <button
                type="button"
                onClick={() => setSelectedUrlType('dev')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedUrlType === 'dev'
                    ? 'bg-[#a0f4c8] text-[#002113] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Active App
              </button>
              <button
                type="button"
                onClick={() => setSelectedUrlType('pre')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedUrlType === 'pre'
                    ? 'bg-[#a0f4c8] text-[#002113] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Shared URL
              </button>
            </div>

            <p className="text-[11px] text-[#a3c9b7] mt-1.5 leading-relaxed">
              💡 <strong>Getting "Page Not Found"?</strong> In AI Studio, dev URLs are private by default. Click the <strong>Share</strong> or <strong>Deploy</strong> button in the top right of AI Studio to make the link public for all 4 phones!
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3 justify-center md:justify-start">
              <button
                onClick={handleCopy}
                className="bg-[#19724f] hover:bg-[#005236] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#a0f4c8]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Link Copied!' : 'Copy Mobile Link'}
              </button>
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-white/20"
              >
                <span>Open in Mobile Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
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

