import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Leaf, CheckCircle2, ArrowRight, Cloud, Database, Users, Calendar, MapPin } from 'lucide-react';

export interface LastUploadDatesInfo {
  inventoryDate?: string;
  inventoryTime?: string;
  inventoryFilename?: string;
  inventoryCount?: number;
  customerDate?: string;
  customerTime?: string;
  customerFilename?: string;
  customerCount?: number;
}

interface AppStartupProgressRingProps {
  progress: number;
  statusText: string;
  subStatusText?: string;
  isReady: boolean;
  onSkip?: () => void;
  canSkip?: boolean;
  itemCounts?: {
    plants?: number;
    customers?: number;
    holdingAreas?: number;
  };
  lastUploads?: LastUploadDatesInfo;
}

export const AppStartupProgressRing: React.FC<AppStartupProgressRingProps> = ({
  progress,
  statusText,
  subStatusText,
  isReady,
  onSkip,
  canSkip = true,
  itemCounts,
  lastUploads
}) => {
  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2; // 76
  const circumference = 2 * Math.PI * radius; // ~477.52
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  // Calculate coordinates for the glowing tip marker
  const angleDeg = (clampedProgress / 100) * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const tipX = size / 2 + radius * Math.cos(angleRad);
  const tipY = size / 2 + radius * Math.sin(angleRad);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f9faf6] px-4 py-8 select-none"
      >
        {/* Subtle background ambient plant leaf silhouette decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] flex items-center justify-center">
          <Leaf className="w-[600px] h-[600px] text-[#012d1d] -rotate-12" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-sm flex flex-col items-center text-center bg-white rounded-3xl border border-[#c1c8c2]/50 shadow-xl p-6 sm:p-8"
        >
          {/* Header Brand */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#012d1d]/5 border border-[#012d1d]/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0e6c4a] animate-ping" />
            <span className="text-xs font-black tracking-wider uppercase text-[#012d1d]">
              Maple Lane Nursery
            </span>
          </div>

          {/* Animated Progress Ring */}
          <div className="relative w-[160px] h-[160px] my-2 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              {/* Background Track Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#f3f4f0"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Background Guide Ring Accent */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#c1c8c2"
                strokeWidth={1}
                strokeDasharray="3 3"
                fill="none"
                opacity={0.5}
              />

              {/* Animated Progress Stroke */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#012d1d"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-300 ease-out"
              />

              {/* Mint Flora Accent Tip */}
              {clampedProgress > 1 && clampedProgress < 100 && (
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={5}
                  fill="#a0f4c8"
                  stroke="#012d1d"
                  strokeWidth={2}
                  className="transition-all duration-300 ease-out shadow-sm"
                />
              )}
            </svg>

            {/* Inner Content of Ring */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isReady || clampedProgress >= 100 ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0e6c4a] text-[#a0f4c8] flex items-center justify-center shadow-md mb-1">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <span className="text-xs font-black tracking-wide text-[#012d1d] uppercase">
                    Ready
                  </span>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center">
                  <Leaf className="w-5 h-5 text-[#0e6c4a] mb-0.5 animate-pulse" />
                  <span className="text-3xl font-black tracking-tight text-[#012d1d] font-mono leading-none">
                    {Math.round(clampedProgress)}%
                  </span>
                  <span className="text-[10px] font-bold text-[#717973] uppercase tracking-wider mt-1">
                    Syncing
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Text & Message */}
          <div className="mt-4 flex flex-col items-center gap-1 min-h-[58px]">
            <h3 className="text-base sm:text-lg font-black text-[#012d1d] leading-snug">
              {isReady || clampedProgress >= 100 ? 'System Ready to Start Orders' : statusText}
            </h3>
            <p className="text-xs text-[#414844] font-medium max-w-[260px] leading-relaxed">
              {isReady || clampedProgress >= 100
                ? 'Plant catalog, live pricing & staging locations synced.'
                : subStatusText || 'Synchronizing inventory database across nursery devices...'}
            </p>
          </div>

          {/* Last Upload Dates for Inventory & Customer Data */}
          <div 
            id="startup-last-upload-card"
            className="mt-3.5 w-full bg-[#f9faf6] border border-[#c1c8c2]/80 rounded-2xl p-3 shadow-xs text-left"
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#717973] mb-2 pb-1.5 border-b border-[#c1c8c2]/40">
              <span className="flex items-center gap-1.5 text-[#012d1d]">
                <Calendar className="w-3 h-3 text-[#0e6c4a]" />
                Last Upload Dates
              </span>
              <span className="text-[#0e6c4a] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                POS Sync
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Inventory Upload Date */}
              <div 
                id="startup-inventory-upload-pill"
                className="bg-white rounded-xl p-2.5 border border-[#c1c8c2]/60 flex flex-col justify-between shadow-2xs"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#012d1d]">
                  <Database className="w-3.5 h-3.5 text-[#0e6c4a] shrink-0" />
                  <span className="truncate">Inventory</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-xs font-black text-[#012d1d] font-mono tracking-tight block">
                    {lastUploads?.inventoryDate || 'Sep 14, 2026'}
                  </span>
                  <span className="text-[10px] font-medium text-[#717973] block mt-0.5 truncate">
                    {lastUploads?.inventoryTime ? `${lastUploads.inventoryTime}` : ''}
                    {itemCounts?.plants ? ` · ${itemCounts.plants.toLocaleString()} items` : ''}
                  </span>
                </div>
              </div>

              {/* Customer Upload Date */}
              <div 
                id="startup-customer-upload-pill"
                className="bg-white rounded-xl p-2.5 border border-[#c1c8c2]/60 flex flex-col justify-between shadow-2xs"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#012d1d]">
                  <Users className="w-3.5 h-3.5 text-[#0e6c4a] shrink-0" />
                  <span className="truncate">Customers</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-xs font-black text-[#012d1d] font-mono tracking-tight block">
                    {lastUploads?.customerDate || 'Sep 10, 2026'}
                  </span>
                  <span className="text-[10px] font-medium text-[#717973] block mt-0.5 truncate">
                    {lastUploads?.customerTime ? `${lastUploads.customerTime}` : ''}
                    {itemCounts?.customers ? ` · ${itemCounts.customers.toLocaleString()} records` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Progress Visual Checklist */}
          <div className="mt-5 w-full pt-4 border-t border-[#f3f4f0] flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[#414844] font-medium">
                <Cloud className="w-3.5 h-3.5 text-[#0e6c4a]" />
                Cloud Database
              </span>
              {clampedProgress >= 25 ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#0e6c4a]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#717973] animate-pulse">Connecting...</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[#414844] font-medium">
                <Leaf className="w-3.5 h-3.5 text-[#0e6c4a]" />
                Inventory & Pricing
              </span>
              {clampedProgress >= 70 ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#0e6c4a]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#717973] animate-pulse">
                  {clampedProgress >= 25 ? 'Downloading...' : 'Pending'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[#414844] font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#0e6c4a]" />
                Orders & Staging Bays
              </span>
              {clampedProgress >= 95 ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#0e6c4a]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#717973]">
                  {clampedProgress >= 70 ? 'Loading...' : 'Waiting'}
                </span>
              )}
            </div>
          </div>

          {/* Skip / Direct Order Button */}
          {canSkip && onSkip && !isReady && (
            <button
              type="button"
              onClick={onSkip}
              className="mt-5 w-full py-2.5 px-4 bg-[#f3f4f0] hover:bg-[#c1c8c2]/40 text-[#012d1d] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Start Order Now (Local Cache)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>

        {/* Brand Tagline */}
        <p className="mt-6 text-[11px] font-semibold text-[#717973] tracking-wide">
          Point of Sale & Yard Logistics System
        </p>
      </motion.div>
    </AnimatePresence>
  );
};
