import React, { useState, useEffect, useRef } from 'react';
import { PlantItem, OrderCartItem } from '../types';
import { PriceLevelKey, getPlantPriceTiers } from '../utils/pricingUtils';
import { PricingDropdown } from './PricingDropdown';
import { 
  acquireHighPrecisionGps, 
  formatGpsCoordinates, 
  getGpsAccuracyRating 
} from '../utils/gpsUtils';
import { 
  Check, 
  X, 
  Plus, 
  Minus, 
  Package, 
  Tag, 
  Leaf, 
  ShoppingBag, 
  Truck, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  MapPin,
  RefreshCw,
  Radio
} from 'lucide-react';

interface PlantVerificationModalProps {
  isOpen: boolean;
  plant: PlantItem | null;
  initialQuantity?: number;
  existingCartItem?: OrderCartItem | null;
  customerType?: 'RETAIL' | 'WHOLESALE';
  onConfirm: (
    plant: PlantItem, 
    quantity: number, 
    priceLevel: PriceLevelKey, 
    unitPrice: number, 
    fulfillment: 'Take Now' | 'Pick-up/Delivery',
    gpsLocation?: { latitude: number; longitude: number; accuracy?: number; timestamp: string }
  ) => void;
  onClose: () => void;
}

export const PlantVerificationModal: React.FC<PlantVerificationModalProps> = ({
  isOpen,
  plant,
  initialQuantity = 1,
  existingCartItem,
  customerType = 'RETAIL',
  onConfirm,
  onClose
}) => {
  const isBulk = Boolean(plant && ['MULCH', 'STONE', 'TOP SOIL'].some(cat => 
    (plant.category || '').toUpperCase().includes(cat) || plant.name.toUpperCase().includes(cat)
  ));
  const isStone = Boolean(plant && ((plant.category || '').toUpperCase().includes('STONE') || plant.name.toUpperCase().includes('STONE')));
  const unitLabel = plant?.size && plant.size.length < 10 
    ? plant.size 
    : (isStone ? 'Ton' : (isBulk ? 'Yard' : 'Plant'));

  // Determine initial pricing tier and price
  const defaultTier: PriceLevelKey = existingCartItem?.selectedPriceLevel 
    || (customerType === 'WHOLESALE' ? 'wholesale' : 'retail');
  
  const tiers = plant ? getPlantPriceTiers(plant) : [];
  const matchedTier = tiers.find(t => t.key === defaultTier) || tiers[0] || { price: 0 };

  const [quantity, setQuantity] = useState<number>(() => {
    if (existingCartItem) return existingCartItem.quantity;
    if (initialQuantity > 0) return initialQuantity;
    return isBulk ? 1.0 : 1;
  });

  const [quantityInput, setQuantityInput] = useState<string>(() => {
    if (existingCartItem) return existingCartItem.quantity.toString();
    if (initialQuantity > 0) return initialQuantity.toString();
    return isBulk ? '1' : '1';
  });

  const [selectedPriceLevel, setSelectedPriceLevel] = useState<PriceLevelKey>(defaultTier);
  const [selectedUnitPrice, setSelectedUnitPrice] = useState<number>(() => {
    if (existingCartItem && existingCartItem.selectedPrice !== undefined) {
      return existingCartItem.selectedPrice;
    }
    return matchedTier.price;
  });

  const [fulfillment, setFulfillment] = useState<'Take Now' | 'Pick-up/Delivery'>('Take Now');
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy?: number; timestamp: string } | undefined>(() => {
    return existingCartItem?.gpsLocation || plant?.gpsLocation || undefined;
  });
  const [isLoggingGps, setIsLoggingGps] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const modalCardRef = useRef<HTMLDivElement | null>(null);

  // Sync state whenever opened with a new plant or existing item
  useEffect(() => {
    if (isOpen && plant) {
      const startingQty = existingCartItem ? existingCartItem.quantity : (initialQuantity > 0 ? initialQuantity : (isBulk ? 1.0 : 1));
      setQuantity(startingQty);
      setQuantityInput(startingQty.toString());
      
      const tierKey = existingCartItem?.selectedPriceLevel || (customerType === 'WHOLESALE' ? 'wholesale' : 'retail');
      setSelectedPriceLevel(tierKey);

      const plantTiers = getPlantPriceTiers(plant);
      const match = plantTiers.find(t => t.key === tierKey) || plantTiers[0];
      setSelectedUnitPrice(existingCartItem?.selectedPrice ?? match.price);

      setGpsLocation(existingCartItem?.gpsLocation || plant.gpsLocation || undefined);

      // Ensure window and modal start cleanly at the very top
      window.scrollTo(0, 0);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      if (modalCardRef.current) {
        modalCardRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, plant, existingCartItem, initialQuantity, customerType]);

  if (!isOpen || !plant) {
    return null;
  }

  const handlePriceChange = (levelKey: PriceLevelKey, newPrice: number) => {
    setSelectedPriceLevel(levelKey);
    setSelectedUnitPrice(newPrice);
  };

  const handleCaptureGps = async () => {
    setIsLoggingGps(true);
    setGpsStatusText('Acquiring satellite lock...');
    try {
      const fix = await acquireHighPrecisionGps({
        maxWaitMs: 4500,
        targetAccuracyMeters: 4.5,
        onProgress: (status) => setGpsStatusText(status.message)
      });
      setGpsLocation({
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp
      });
    } catch (err) {
      console.warn('GPS acquisition failed:', err);
    } finally {
      setIsLoggingGps(false);
      setGpsStatusText('');
    }
  };

  const handleQuantityStep = (delta: number) => {
    const step = isBulk ? (delta > 0 ? 0.5 : -0.5) : (delta > 0 ? 1 : -1);
    const newQty = Math.max(isBulk ? 0.5 : 1, parseFloat((quantity + step).toFixed(2)));
    setQuantity(newQty);
    setQuantityInput(newQty.toString());
  };

  const handleQuickAddPreset = (amount: number) => {
    const newQty = parseFloat((quantity + amount).toFixed(2));
    setQuantity(newQty);
    setQuantityInput(newQty.toString());
  };

  const handleSetExactPreset = (exactAmount: number) => {
    setQuantity(exactAmount);
    setQuantityInput(exactAmount.toString());
  };

  const handleQuantityInputChange = (val: string) => {
    setQuantityInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(parsed);
    }
  };

  const handleQuantityInputBlur = () => {
    const parsed = parseFloat(quantityInput);
    if (isNaN(parsed) || parsed <= 0) {
      const fallback = isBulk ? 0.5 : 1;
      setQuantity(fallback);
      setQuantityInput(fallback.toString());
    } else {
      const rounded = parseFloat(parsed.toFixed(2));
      setQuantity(rounded);
      setQuantityInput(rounded.toString());
    }
  };

  const subtotal = selectedUnitPrice * quantity;

  const handleConfirm = () => {
    const finalQty = Math.max(isBulk ? 0.1 : 1, quantity);
    onConfirm(plant, finalQty, selectedPriceLevel, selectedUnitPrice, fulfillment, gpsLocation);
    onClose();
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target?.tagName !== 'BUTTON') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      }
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-plant-heading"
      onKeyDown={handleModalKeyDown}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-2 sm:pt-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        ref={modalCardRef}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-3.5 sm:gap-4 my-2 mb-36 sm:mb-44 animate-scale-up outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between gap-3 border-b border-[#f3f4f0] pb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-xs">
              <Leaf className="w-5 h-5 text-[#a0f4c8]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a] bg-[#a0f4c8]/50 px-2 py-0.5 rounded-md">
                  Verify Plant & Quantity
                </span>
                {existingCartItem && (
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    In Order: {existingCartItem.quantity}
                  </span>
                )}
              </div>
              <h2 id="confirm-plant-heading" className="text-lg sm:text-xl font-extrabold text-[#012d1d] truncate mt-0.5">
                Confirm Plant Selection
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-xl cursor-pointer transition-colors"
            title="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plant Verification Card */}
        <div className="bg-[#fcfdfa] border border-[#012d1d]/15 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-base sm:text-lg text-[#012d1d] leading-snug">
                {plant.name}
              </h3>

              {(plant.botanicalName || plant.commonName) && (
                <p className="text-xs text-[#414844] italic font-medium mt-0.5">
                  {plant.botanicalName || plant.commonName}
                </p>
              )}
            </div>

            {plant.category && (
              <span className="bg-[#012d1d] text-[#a0f4c8] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                {plant.category}
              </span>
            )}
          </div>

          {/* Badges: Item Number, Container Size, Stock Availability */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <Tag className="w-3 h-3 text-[#a0f4c8]" />
              #{plant.itemNo || plant.barcode || 'N/A'}
            </span>

            <span className="bg-[#461702] text-amber-100 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <Package className="w-3 h-3 text-amber-300" />
              {plant.size ? `SIZE: ${plant.size}` : (isBulk ? `UNIT: ${unitLabel}` : 'Std Size')}
            </span>

            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs ${
              plant.stock < 0
                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                : plant.stock === 0 
                ? 'bg-red-100 text-red-800 border border-red-200' 
                : plant.stock < 5 
                ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}>
              {plant.stock < 0 ? (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-700" />
                  <span>{plant.stock} In Stock (Negative / Oversold)</span>
                </>
              ) : plant.stock === 0 ? (
                <>
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <span>0 In Stock (Out of Stock)</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-700" />
                  <span>{plant.stock} In Stock</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Pricing Tier & Unit Price Selector */}
        <div className="bg-[#f3f4f0]/70 p-3.5 rounded-2xl border border-[#c1c8c2]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#012d1d]" />
            <span className="text-xs text-[#414844]">
              Customer Rate: <strong className="text-[#012d1d] font-extrabold">{selectedPriceLevel.toUpperCase()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PricingDropdown
              plant={plant}
              currentPrice={selectedUnitPrice}
              selectedLevelKey={selectedPriceLevel}
              onSelectPriceLevel={handlePriceChange}
              size="sm"
            />
            <span className="text-lg font-extrabold text-[#012d1d] min-w-[70px] text-right">
              ${selectedUnitPrice.toFixed(2)}
              <span className="text-xs text-[#717973] font-medium block">/{unitLabel}</span>
            </span>
          </div>
        </div>

        {/* Quantity Selection Area */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <label className="text-xs sm:text-sm font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#0e6c4a]" />
              <span>Quantity Purchasing</span>
            </label>
            <span className="text-xs font-bold text-[#717973]">
              Unit: {unitLabel}
            </span>
          </div>

          {/* Stepper + Direct Numeric Input */}
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => handleQuantityStep(-1)}
              className="w-13 h-13 rounded-2xl bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] flex items-center justify-center text-xl font-bold border border-[#c1c8c2] transition-transform active:scale-90 cursor-pointer shadow-xs"
              title={`Decrease quantity (${isBulk ? '0.5' : '1'})`}
            >
              <Minus className="w-6 h-6 text-[#012d1d]" />
            </button>

            <div className="relative flex-1 max-w-[170px]">
              <input
                ref={inputRef}
                type="number"
                step={isBulk ? "0.5" : "1"}
                min={isBulk ? "0.1" : "1"}
                value={quantityInput}
                onChange={(e) => handleQuantityInputChange(e.target.value)}
                onBlur={handleQuantityInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConfirm();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    handleQuantityStep(1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleQuantityStep(-1);
                  }
                }}
                className="w-full text-center text-2xl sm:text-3xl font-extrabold text-[#012d1d] bg-white border-2 border-[#012d1d] rounded-2xl py-2 px-2 focus:outline-none focus:ring-4 focus:ring-[#a0f4c8]/50 shadow-inner"
              />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#717973] uppercase tracking-wider whitespace-nowrap">
                {unitLabel}(s)
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuantityStep(1)}
              className="w-13 h-13 rounded-2xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] flex items-center justify-center text-xl font-bold border border-[#012d1d] transition-transform active:scale-90 cursor-pointer shadow-xs"
              title={`Increase quantity (${isBulk ? '0.5' : '1'})`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Presets Buttons */}
          <div className="pt-3 flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#717973] mr-1">Quick Set:</span>
            {isBulk ? (
              [0.5, 1, 2, 3, 5, 10].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSetExactPreset(amt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                    quantity === amt 
                      ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs' 
                      : 'bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] border border-[#c1c8c2]/60'
                  }`}
                >
                  {amt} {unitLabel}
                </button>
              ))
            ) : (
              [1, 2, 3, 5, 10, 15, 25].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSetExactPreset(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                    quantity === amt 
                      ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs' 
                      : 'bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] border border-[#c1c8c2]/60'
                  }`}
                >
                  {amt}
                </button>
              ))
            )}
          </div>
        </div>

        {/* GPS Yard Location Tagging Section */}
        <div className="bg-[#f0f9f4] p-3 rounded-2xl border border-[#a0f4c8]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-2xs">
              <MapPin className="w-4 h-4 text-[#a0f4c8]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#0e6c4a] uppercase tracking-wider block">
                  High-Precision Nursery GPS
                </span>
                {gpsLocation?.accuracy !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getGpsAccuracyRating(gpsLocation.accuracy).colorClass}`}>
                    {getGpsAccuracyRating(gpsLocation.accuracy).label} (±{gpsLocation.accuracy.toFixed(1)}m)
                  </span>
                )}
              </div>
              {gpsLocation ? (
                <span className="font-mono text-xs font-bold text-[#012d1d] block truncate">
                  {formatGpsCoordinates(gpsLocation.latitude, gpsLocation.longitude, gpsLocation.accuracy)}
                </span>
              ) : (
                <span className="text-xs text-[#414844] block">
                  {gpsStatusText || 'No GPS coordinates tagged yet'}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={isLoggingGps}
            className="px-3 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-[#a0f4c8]/30 shrink-0"
            title="Lock onto current high-precision satellite GPS coordinates for this plant"
          >
            {isLoggingGps ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span>{isLoggingGps ? (gpsStatusText || 'Locking GPS...') : (gpsLocation ? 'Update GPS' : '📍 Tag Yard GPS')}</span>
          </button>
        </div>

        {/* Fulfillment Choice: Take Now vs Stage for Pickup */}
        <div className="bg-[#f9faf6] p-3 rounded-2xl border border-[#c1c8c2]/60 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#414844] flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-[#012d1d]" />
            <span>Fulfillment:</span>
          </span>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#c1c8c2]">
            <button
              type="button"
              onClick={() => setFulfillment('Take Now')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                fulfillment === 'Take Now'
                  ? 'bg-[#012d1d] text-[#a0f4c8] shadow-2xs'
                  : 'text-[#717973] hover:text-[#1a1c1a]'
              }`}
            >
              Take Now
            </button>
            <button
              type="button"
              onClick={() => setFulfillment('Pick-up/Delivery')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                fulfillment === 'Pick-up/Delivery'
                  ? 'bg-[#461702] text-amber-200 shadow-2xs'
                  : 'text-[#717973] hover:text-[#1a1c1a]'
              }`}
            >
              Stage for Pickup
            </button>
          </div>
        </div>

        {/* Live Calculation Summary */}
        <div className="bg-[#012d1d] text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-[#a0f4c8] font-bold block uppercase tracking-wider">
              Item Subtotal
            </span>
            <span className="text-xs text-white/80">
              {quantity} {unitLabel}(s) × ${selectedUnitPrice.toFixed(2)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#a0f4c8]">
              ${subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Confirmation & Cancel Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/3 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer border border-[#c1c8c2] flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-2/3 bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.99] text-[#a0f4c8] hover:text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm sm:text-base transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 border border-[#a0f4c8]/30"
          >
            <CheckCircle2 className="w-5 h-5 text-[#a0f4c8]" />
            <span>
              {existingCartItem ? 'Update Order' : 'Add to Order'} ({quantity} {unitLabel}{quantity > 1 ? 's' : ''})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
