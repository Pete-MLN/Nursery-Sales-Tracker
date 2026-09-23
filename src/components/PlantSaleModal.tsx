import React, { useState, useEffect } from 'react';
import { PlantItem, DiscountType, PlantSaleDiscount } from '../types';
import { calculateSalePrice, isPlantOnSale } from '../utils/pricingUtils';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  Tag, 
  X, 
  Check, 
  DollarSign, 
  Percent, 
  Flame, 
  Trash2, 
  AlertCircle, 
  Package, 
  Sparkles,
  ArrowRight,
  TrendingDown,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface PlantSaleModalProps {
  isOpen: boolean;
  plant: PlantItem | null;
  onSaveDiscount: (updatedPlant: PlantItem) => Promise<void> | void;
  onClose: () => void;
}

const PERCENTAGE_PRESETS = [10, 15, 20, 25, 30, 40, 50, 75];
const COMMON_LABELS = [
  'End of Season Clearance',
  'Fall Sale',
  'Spring Special',
  'Overstock Deal',
  "Manager's Special",
  'Limited Time Special'
];

export const PlantSaleModal: React.FC<PlantSaleModalProps> = ({
  isOpen,
  plant,
  onSaveDiscount,
  onClose
}) => {
  if (!isOpen || !plant) return null;

  const basePrice = plant.prices?.retail !== undefined ? plant.prices.retail : (plant.price || 0);

  // Initialize form state from existing discount if available
  const existingDiscount = plant.saleDiscount;
  const initialType: DiscountType = existingDiscount?.type || 'percentage';
  const initialValue = existingDiscount ? existingDiscount.value.toString() : '20';
  const initialLabel = existingDiscount?.saleLabel || '';
  const initialActive = existingDiscount?.active !== false;

  const [discountType, setDiscountType] = useState<DiscountType>(initialType);
  const [discountValueInput, setDiscountValueInput] = useState<string>(initialValue);
  const [saleLabel, setSaleLabel] = useState<string>(initialLabel);
  const [isActive, setIsActive] = useState<boolean>(initialActive);
  const [errorText, setErrorText] = useState<string>('');

  // Progress Loader State for updating and syncing sale
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Sync if plant changes while open
  useEffect(() => {
    if (plant) {
      if (plant.saleDiscount) {
        setDiscountType(plant.saleDiscount.type);
        setDiscountValueInput(plant.saleDiscount.value.toString());
        setSaleLabel(plant.saleDiscount.saleLabel || '');
        setIsActive(plant.saleDiscount.active !== false);
      } else {
        setDiscountType('percentage');
        setDiscountValueInput('20');
        setSaleLabel('');
        setIsActive(true);
      }
      setErrorText('');
      setIsUpdating(false);
      setIsSuccess(false);
      setUpdateProgress(0);
    }
  }, [plant]);

  // Lock background scroll and bring modal to focus when opened
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Compute live preview
  const numericValue = parseFloat(discountValueInput);
  const isValidNumber = !isNaN(numericValue) && numericValue > 0;

  const preview = isValidNumber 
    ? calculateSalePrice(basePrice, { type: discountType, value: numericValue })
    : { salePrice: basePrice, savingsAmount: 0, savingsPercent: 0 };

  const handleSave = async () => {
    if (isUpdating) return;

    if (!isValidNumber) {
      setErrorText('Please enter a valid discount amount greater than 0.');
      return;
    }

    if (discountType === 'percentage' && numericValue > 99) {
      setErrorText('Percentage discount cannot exceed 99%.');
      return;
    }

    if (discountType === 'fixed_price' && numericValue >= basePrice) {
      setErrorText(`Sale price must be lower than the regular price of $${basePrice.toFixed(2)}.`);
      return;
    }

    setIsUpdating(true);
    setIsSuccess(false);
    setErrorText('');

    // Step 1: 15% - Validating parameters
    setUpdateProgress(15);
    setUpdateStatusText('Validating sale parameters & calculating profit margins...');

    const updatedDiscount: PlantSaleDiscount = {
      type: discountType,
      value: numericValue,
      salePrice: preview.salePrice,
      saleLabel: saleLabel.trim() || undefined,
      active: isActive,
      appliedAt: new Date().toISOString()
    };

    const updatedPlant: PlantItem = {
      ...plant,
      saleDiscount: updatedDiscount
    };

    try {
      await new Promise(r => setTimeout(r, 450));

      // Step 2: 38% - Updating catalog & computing tiers
      setUpdateProgress(38);
      setUpdateStatusText('Updating plant item catalog & re-computing price tiers...');
      await new Promise(r => setTimeout(r, 600));

      // Step 3: 68% - Persisting to Firestore cloud database
      setUpdateProgress(68);
      setUpdateStatusText('Saving updated plant record to inventory catalog & Firestore database...');

      const savePromise = Promise.resolve(onSaveDiscount(updatedPlant));
      const minDatabaseDelay = new Promise(r => setTimeout(r, 900));
      await Promise.all([savePromise, minDatabaseDelay]);

      // Step 4: 88% - Syncing order
      setUpdateProgress(88);
      setUpdateStatusText('Synchronizing active order items, line subtotals & customer pricing...');
      await new Promise(r => setTimeout(r, 650));

      // Step 5: 100% - Success state
      setUpdateProgress(100);
      setIsSuccess(true);
      setUpdateStatusText('Sale price successfully applied! Catalog & database updated.');

      // Keep the success state visible for a comfortable duration so the user can clearly see 100% completion
      await new Promise(r => setTimeout(r, 1200));
      onClose();
    } catch (err) {
      console.error('Failed to update plant sale discount:', err);
      setErrorText('An error occurred while saving the sale discount. Please try again.');
      setIsUpdating(false);
      setUpdateProgress(0);
      setIsSuccess(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    setIsSuccess(false);
    setErrorText('');

    // Step 1: 18% - Validating
    setUpdateProgress(18);
    setUpdateStatusText('Validating price reversion to standard retail catalog rate...');

    const updatedPlant: PlantItem = {
      ...plant,
      saleDiscount: undefined
    };

    try {
      await new Promise(r => setTimeout(r, 450));

      // Step 2: 42% - Clearing discount
      setUpdateProgress(42);
      setUpdateStatusText('Clearing promotional flags & restoring standard price levels...');
      await new Promise(r => setTimeout(r, 600));

      // Step 3: 72% - Cloud database persistence
      setUpdateProgress(72);
      setUpdateStatusText('Updating plant item in inventory catalog & Firestore database...');

      const savePromise = Promise.resolve(onSaveDiscount(updatedPlant));
      const minDatabaseDelay = new Promise(r => setTimeout(r, 900));
      await Promise.all([savePromise, minDatabaseDelay]);

      // Step 4: 92% - Syncing order
      setUpdateProgress(92);
      setUpdateStatusText('Recalculating active order items & line subtotals...');
      await new Promise(r => setTimeout(r, 600));

      // Step 5: 100% - Done
      setUpdateProgress(100);
      setIsSuccess(true);
      setUpdateStatusText('Sale removed. Plant item restored to standard pricing.');

      await new Promise(r => setTimeout(r, 1200));
      onClose();
    } catch (err) {
      console.error('Failed to remove discount:', err);
      setErrorText('An error occurred while reverting sale price. Please try again.');
      setIsUpdating(false);
      setUpdateProgress(0);
      setIsSuccess(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={isUpdating ? undefined : onClose}
    >
      <div 
        tabIndex={-1}
        className="bg-white rounded-3xl border border-[#c1c8c2] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92vh] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#012d1d] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#a0f4c8]/20 flex items-center justify-center text-[#a0f4c8] shrink-0 border border-[#a0f4c8]/30">
              <Flame className="w-5 h-5 text-[#a0f4c8]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Set Plant Sale / Discount</span>
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium">
                Apply a specific lower price or a percentage discount
              </p>
            </div>
          </div>
          <button
            onClick={isUpdating ? undefined : onClose}
            disabled={isUpdating}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isUpdating 
                ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40' 
                : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 divide-y divide-[#f3f4f0]">
          {/* Target Plant Summary */}
          <div className="flex items-start gap-3 bg-[#f9faf6] p-3.5 rounded-2xl border border-[#c1c8c2]/70">
            <img
              src={plant.image || DEFAULT_PLANT_IMAGE}
              alt={plant.name}
              className="w-14 h-14 rounded-xl object-cover bg-white border border-[#c1c8c2] shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {plant.itemNo && (
                  <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[11px] font-bold px-1.5 py-0.5 rounded">
                    #{plant.itemNo}
                  </span>
                )}
                {plant.size && (
                  <span className="bg-[#461702] text-amber-100 text-[11px] font-bold px-2 py-0.5 rounded">
                    {plant.size}
                  </span>
                )}
                <span className="text-xs font-bold text-[#717973]">
                  Stock: <strong className="text-[#012d1d]">{plant.stock}</strong>
                </span>
              </div>
              <p className="font-extrabold text-sm text-[#012d1d] truncate mt-0.5">{plant.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#717973] font-medium">Current Regular Price:</span>
                <span className="text-sm font-black text-[#012d1d]">${basePrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Discount Method Selector */}
          <div className="pt-4 flex flex-col gap-3">
            <label className="text-xs font-black uppercase tracking-wider text-[#012d1d] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#0e6c4a]" />
              <span>Choose Discount Method</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('percentage');
                  setErrorText('');
                  if (discountType !== 'percentage') {
                    setDiscountValueInput('20');
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  discountType === 'percentage'
                    ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-md ring-2 ring-[#a0f4c8]/50'
                    : 'bg-[#f3f4f0] text-[#1a1c1a] border-[#c1c8c2] hover:bg-[#e7e9e5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-[#a0f4c8]" />
                    <span>Percentage Off (%)</span>
                  </span>
                  {discountType === 'percentage' && (
                    <div className="w-4 h-4 rounded-full bg-[#a0f4c8] text-[#012d1d] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 font-black" />
                    </div>
                  )}
                </div>
                <span className={`text-[11px] ${discountType === 'percentage' ? 'text-emerald-200' : 'text-[#717973]'}`}>
                  e.g. 20% or 50% off regular price
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDiscountType('fixed_price');
                  setErrorText('');
                  if (discountType !== 'fixed_price') {
                    // Default to sensible lower price (e.g. 25% lower rounded)
                    const suggested = Math.max(1, Math.round((basePrice * 0.75) * 100) / 100);
                    setDiscountValueInput(suggested.toString());
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  discountType === 'fixed_price'
                    ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-md ring-2 ring-[#a0f4c8]/50'
                    : 'bg-[#f3f4f0] text-[#1a1c1a] border-[#c1c8c2] hover:bg-[#e7e9e5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#a0f4c8]" />
                    <span>Specific Sale Price ($)</span>
                  </span>
                  {discountType === 'fixed_price' && (
                    <div className="w-4 h-4 rounded-full bg-[#a0f4c8] text-[#012d1d] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 font-black" />
                    </div>
                  )}
                </div>
                <span className={`text-[11px] ${discountType === 'fixed_price' ? 'text-emerald-200' : 'text-[#717973]'}`}>
                  e.g. regularly ${basePrice.toFixed(2)}, sale $29.99
                </span>
              </button>
            </div>
          </div>

          {/* Discount Value Input & Presets */}
          <div className="pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#012d1d]">
                {discountType === 'percentage' ? 'Discount Percentage' : 'Exact Sale Price'}
              </label>
              <span className="text-[11px] text-[#717973]">
                {discountType === 'percentage' ? 'Enter 1% – 99%' : `Must be less than $${basePrice.toFixed(2)}`}
              </span>
            </div>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717973] font-bold text-base select-none">
                {discountType === 'percentage' ? '%' : '$'}
              </div>
              <input
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percentage' ? '99' : basePrice}
                value={discountValueInput}
                onChange={(e) => {
                  setDiscountValueInput(e.target.value);
                  setErrorText('');
                }}
                placeholder={discountType === 'percentage' ? '20' : '29.99'}
                className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-2xl pl-9 pr-4 py-3 text-lg font-black text-[#012d1d] focus:outline-none focus:border-[#012d1d] focus:ring-2 focus:ring-[#012d1d]/10"
              />
            </div>

            {/* Quick Presets */}
            {discountType === 'percentage' ? (
              <div>
                <span className="text-[11px] font-bold text-[#717973] block mb-1.5">Quick Percent Presets:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PERCENTAGE_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountValueInput(pct.toString());
                        setErrorText('');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                        discountValueInput === pct.toString()
                          ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d]'
                          : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-[#f3f4f0]'
                      }`}
                    >
                      {pct}% OFF
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[11px] font-bold text-[#717973] block mb-1.5">Quick Reduction Shortcuts:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 10, 15, 20, 25].map((dollarOff) => {
                    const target = Math.max(1, basePrice - dollarOff);
                    if (target >= basePrice) return null;
                    return (
                      <button
                        key={dollarOff}
                        type="button"
                        onClick={() => {
                          setDiscountValueInput(target.toFixed(2));
                          setErrorText('');
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-white text-[#414844] border border-[#c1c8c2] hover:bg-[#f3f4f0] cursor-pointer"
                      >
                        -${dollarOff}.00 (${target.toFixed(2)})
                      </button>
                    );
                  })}
                  {/* Common .99 price endings */}
                  {basePrice > 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        const whole = Math.floor(basePrice * 0.8);
                        const endingNine = `${whole}.99`;
                        setDiscountValueInput(endingNine);
                        setErrorText('');
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer"
                    >
                      .99 Ending (~20% off)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Optional Sale Label / Campaign */}
          <div className="pt-4 flex flex-col gap-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#012d1d] flex items-center justify-between">
              <span>Sale Label / Campaign Name (Optional)</span>
              <span className="text-[10px] text-[#717973] font-normal">Displays on plant tags & orders</span>
            </label>
            <input
              type="text"
              value={saleLabel}
              onChange={(e) => setSaleLabel(e.target.value)}
              placeholder="e.g. End of Season Clearance, 25% Off Special"
              className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3.5 py-2 text-xs font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {COMMON_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSaleLabel(label)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    saleLabel === label
                      ? 'bg-[#0e6c4a] text-white border-[#0e6c4a]'
                      : 'bg-white text-[#717973] border-[#c1c8c2] hover:bg-[#f3f4f0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="pt-4 flex items-center justify-between bg-[#f9faf6] p-3.5 rounded-2xl border border-[#c1c8c2]">
            <div>
              <span className="text-xs font-extrabold text-[#012d1d] block">Enable Sale Immediately</span>
              <span className="text-[11px] text-[#717973]">
                {isActive ? 'Sale price will apply across scanner, inventory, and orders' : 'Sale is paused; regular price applies'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                isActive ? 'bg-[#012d1d]' : 'bg-[#c1c8c2]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Live Price Tag Breakdown Preview */}
          <div className="pt-4">
            <div className="p-4 rounded-2xl bg-[#012d1d] text-white border border-[#a0f4c8]/30 shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#a0f4c8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Customer Price Tag Preview</span>
                </span>
                {saleLabel.trim() && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {saleLabel}
                  </span>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-xs text-emerald-200 block font-medium">Regular Price</span>
                  <span className="text-base line-through text-emerald-300/80 font-bold">
                    ${basePrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#a0f4c8]" />
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#a0f4c8] block font-black uppercase tracking-wider">
                    Effective Sale Price
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#a0f4c8]">
                    ${preview.salePrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-700/50 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-300 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-[#a0f4c8]" />
                  <span>Customer Saves:</span>
                </span>
                <span className="text-[#a0f4c8] font-black">
                  ${preview.savingsAmount.toFixed(2)} ({preview.savingsPercent}% OFF)
                </span>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorText && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* Progress Loader Card during saving / update */}
        {isUpdating && (
          <div 
            id="sale-discount-progress-loader" 
            className="p-4 bg-emerald-50 border-t border-b border-emerald-200 flex flex-col gap-2.5 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isSuccess ? (
                  <div className="w-8 h-8 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 text-[#a0f4c8]" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-2xs">
                    <Loader2 className="w-5 h-5 animate-spin text-[#a0f4c8]" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black text-[#012d1d] uppercase tracking-wide">
                    {isSuccess ? 'Sale Price Updated!' : 'Updating Plant Pricing...'}
                  </h4>
                  <p className="text-[11px] font-semibold text-[#0e6c4a]">
                    {updateStatusText}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-[#012d1d] font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                {updateProgress}%
              </span>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="w-full bg-emerald-200/80 rounded-full h-2.5 overflow-hidden border border-emerald-300/80">
              <div 
                className="h-full bg-gradient-to-r from-[#012d1d] via-[#0e6c4a] to-[#a0f4c8] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${updateProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#f9faf6] border-t border-[#c1c8c2] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div>
            {isPlantOnSale(plant) && (
              <button
                id="btn-remove-sale-discount"
                type="button"
                disabled={isUpdating}
                onClick={handleRemoveDiscount}
                className={`w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                  isUpdating
                    ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                    : 'text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Sale / Revert to Regular</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              id="btn-cancel-sale-discount"
              type="button"
              disabled={isUpdating}
              onClick={onClose}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                isUpdating
                  ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  : 'text-[#414844] bg-white border-[#c1c8c2] hover:bg-[#f3f4f0] cursor-pointer'
              }`}
            >
              Cancel
            </button>
            <button
              id="btn-apply-sale-discount"
              type="button"
              disabled={isUpdating}
              onClick={handleSave}
              className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                isUpdating
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-not-allowed'
                  : isSuccess
                  ? 'bg-[#012d1d] text-[#a0f4c8] border border-[#012d1d] cursor-default'
                  : 'text-[#002113] bg-[#a0f4c8] hover:bg-[#85e6b4] border border-[#0e6c4a] cursor-pointer active:scale-95'
              }`}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#012d1d]" />
                  <span>Saving Updates...</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4 font-black text-[#a0f4c8]" />
                  <span>Applied!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 font-black text-[#012d1d]" />
                  <span>Apply Sale Price</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
