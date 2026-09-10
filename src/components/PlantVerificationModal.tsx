import React, { useState, useEffect, useRef } from 'react';
import { PlantItem, OrderCartItem, GPSLocationEntry } from '../types';
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
  Radio,
  Trash2,
  FileText,
  Layers
} from 'lucide-react';

interface PlantVerificationModalProps {
  isOpen: boolean;
  plant: PlantItem | null;
  initialQuantity?: number;
  initialPriceLevel?: PriceLevelKey;
  existingCartItem?: OrderCartItem | null;
  customerType?: 'RETAIL' | 'WHOLESALE';
  onConfirm: (
    plant: PlantItem, 
    quantity: number, 
    priceLevel: PriceLevelKey, 
    unitPrice: number, 
    fulfillment: 'Take Now' | 'Pick-up/Delivery',
    gpsLocation?: { latitude: number; longitude: number; accuracy?: number; timestamp: string },
    gpsLocations?: GPSLocationEntry[],
    itemNotes?: string
  ) => void;
  onClose: () => void;
}

export const PlantVerificationModal: React.FC<PlantVerificationModalProps> = ({
  isOpen,
  plant,
  initialQuantity = 1,
  initialPriceLevel,
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
    || initialPriceLevel
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

  // Multiple GPS Locations State: stores array of nursery spots for this plant
  const [gpsLocations, setGpsLocations] = useState<GPSLocationEntry[]>(() => {
    if (existingCartItem?.gpsLocations && existingCartItem.gpsLocations.length > 0) {
      return existingCartItem.gpsLocations;
    }
    if (existingCartItem?.gpsLocation) {
      return [{
        id: `loc-init-${Date.now()}-1`,
        latitude: existingCartItem.gpsLocation.latitude,
        longitude: existingCartItem.gpsLocation.longitude,
        accuracy: existingCartItem.gpsLocation.accuracy,
        timestamp: existingCartItem.gpsLocation.timestamp,
        label: 'Spot 1'
      }];
    }
    if (plant?.gpsLocations && plant.gpsLocations.length > 0) {
      return plant.gpsLocations;
    }
    if (plant?.gpsLocation) {
      return [{
        id: `loc-plant-${Date.now()}-1`,
        latitude: plant.gpsLocation.latitude,
        longitude: plant.gpsLocation.longitude,
        accuracy: plant.gpsLocation.accuracy,
        timestamp: plant.gpsLocation.timestamp,
        label: plant.holdingLocation ? `Bay ${plant.holdingLocation}` : 'Spot 1'
      }];
    }
    return [];
  });

  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy?: number; timestamp: string } | undefined>(() => {
    return existingCartItem?.gpsLocation || plant?.gpsLocation || undefined;
  });
  const [isLoggingGps, setIsLoggingGps] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('');
  const [retaggingSpotId, setRetaggingSpotId] = useState<string | null>(null);

  // Manual GPS entry drawer state
  const [isManualGpsOpen, setIsManualGpsOpen] = useState<boolean>(false);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [manualLabel, setManualLabel] = useState<string>('');

  // Plant-specific item notes
  const [itemNotes, setItemNotes] = useState<string>(existingCartItem?.itemNotes || '');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const modalCardRef = useRef<HTMLDivElement | null>(null);

  // Sync state whenever opened with a new plant or existing item
  useEffect(() => {
    if (isOpen && plant) {
      const startingQty = existingCartItem ? existingCartItem.quantity : (initialQuantity > 0 ? initialQuantity : (isBulk ? 1.0 : 1));
      setQuantity(startingQty);
      setQuantityInput(startingQty.toString());
      
      const tierKey = existingCartItem?.selectedPriceLevel 
        || initialPriceLevel 
        || (customerType === 'WHOLESALE' ? 'wholesale' : 'retail');
      setSelectedPriceLevel(tierKey);

      const plantTiers = getPlantPriceTiers(plant);
      const match = plantTiers.find(t => t.key === tierKey) || plantTiers[0];
      setSelectedUnitPrice(existingCartItem?.selectedPrice ?? match.price);

      // Initialize multiple GPS locations
      let initialLocs: GPSLocationEntry[] = [];
      if (existingCartItem?.gpsLocations && existingCartItem.gpsLocations.length > 0) {
        initialLocs = existingCartItem.gpsLocations;
      } else if (existingCartItem?.gpsLocation) {
        initialLocs = [{
          id: `loc-init-${Date.now()}-1`,
          latitude: existingCartItem.gpsLocation.latitude,
          longitude: existingCartItem.gpsLocation.longitude,
          accuracy: existingCartItem.gpsLocation.accuracy,
          timestamp: existingCartItem.gpsLocation.timestamp,
          label: 'Spot 1'
        }];
      } else if (plant.gpsLocations && plant.gpsLocations.length > 0) {
        initialLocs = plant.gpsLocations;
      } else if (plant.gpsLocation) {
        initialLocs = [{
          id: `loc-plant-${Date.now()}-1`,
          latitude: plant.gpsLocation.latitude,
          longitude: plant.gpsLocation.longitude,
          accuracy: plant.gpsLocation.accuracy,
          timestamp: plant.gpsLocation.timestamp,
          label: plant.holdingLocation ? `Bay ${plant.holdingLocation}` : 'Spot 1'
        }];
      }
      setGpsLocations(initialLocs);

      const primary = initialLocs.length > 0
        ? {
            latitude: initialLocs[0].latitude,
            longitude: initialLocs[0].longitude,
            accuracy: initialLocs[0].accuracy,
            timestamp: initialLocs[0].timestamp
          }
        : (existingCartItem?.gpsLocation || plant.gpsLocation || undefined);
      setGpsLocation(primary);

      setItemNotes(existingCartItem?.itemNotes || '');

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

  // Capture satellite lock GPS: either re-tags an existing spot or adds a new spot
  const handleCaptureGps = async (spotIdToRetag?: string) => {
    setIsLoggingGps(true);
    setRetaggingSpotId(spotIdToRetag || null);
    setGpsStatusText('Acquiring satellite lock...');
    try {
      const fix = await acquireHighPrecisionGps({
        maxWaitMs: 4500,
        targetAccuracyMeters: 4.5,
        onProgress: (status) => setGpsStatusText(status.message)
      });

      const updatedCoord = {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp
      };

      if (spotIdToRetag) {
        setGpsLocations(prev => prev.map(loc => {
          if (loc.id === spotIdToRetag) {
            return {
              ...loc,
              ...updatedCoord
            };
          }
          return loc;
        }));
      } else {
        const newSpotIndex = gpsLocations.length + 1;
        const newEntry: GPSLocationEntry = {
          id: `gps-spot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...updatedCoord,
          label: newSpotIndex === 1 && plant.holdingLocation ? `Bay ${plant.holdingLocation}` : `Spot ${newSpotIndex}`
        };
        setGpsLocations(prev => [...prev, newEntry]);
      }

      setGpsLocation(updatedCoord);
    } catch (err) {
      console.warn('GPS acquisition failed:', err);
    } finally {
      setIsLoggingGps(false);
      setRetaggingSpotId(null);
      setGpsStatusText('');
    }
  };

  const handleRemoveGpsSpot = (spotId: string) => {
    setGpsLocations(prev => {
      const filtered = prev.filter(s => s.id !== spotId);
      if (filtered.length > 0) {
        setGpsLocation({
          latitude: filtered[0].latitude,
          longitude: filtered[0].longitude,
          accuracy: filtered[0].accuracy,
          timestamp: filtered[0].timestamp
        });
      } else {
        setGpsLocation(undefined);
      }
      return filtered;
    });
  };

  const handleUpdateSpotLabel = (spotId: string, label: string) => {
    setGpsLocations(prev => prev.map(s => s.id === spotId ? { ...s, label } : s));
  };

  const handleAddManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      return;
    }
    const newEntry: GPSLocationEntry = {
      id: `gps-manual-${Date.now()}`,
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      timestamp: new Date().toISOString(),
      label: manualLabel.trim() || `Spot ${gpsLocations.length + 1}`
    };
    setGpsLocations(prev => [...prev, newEntry]);
    setGpsLocation({
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      timestamp: newEntry.timestamp
    });
    setManualLat('');
    setManualLng('');
    setManualLabel('');
    setIsManualGpsOpen(false);
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
    const primaryGps = gpsLocations.length > 0 
      ? {
          latitude: gpsLocations[0].latitude,
          longitude: gpsLocations[0].longitude,
          accuracy: gpsLocations[0].accuracy,
          timestamp: gpsLocations[0].timestamp
        }
      : gpsLocation;

    onConfirm(
      plant, 
      finalQty, 
      selectedPriceLevel, 
      selectedUnitPrice, 
      fulfillment, 
      primaryGps,
      gpsLocations,
      itemNotes.trim() || undefined
    );
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
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-start justify-center p-2 sm:p-3 pt-1 sm:pt-2 md:pt-3 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        ref={modalCardRef}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-3.5 sm:gap-4 mt-0 sm:mt-1 mb-auto animate-scale-up outline-none"
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

          {/* Badges: High-Visibility Item Number, Container Size, Stock Availability */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span 
              id="confirm-plant-itemno"
              className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[22px] sm:text-[25px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xs border border-[#a0f4c8]/30"
              title="Item Number"
            >
              <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-[#a0f4c8] shrink-0" />
              <span>#{plant.itemNo || plant.barcode || 'N/A'}</span>
            </span>

            <span 
              id="confirm-plant-size"
              className="bg-[#461702] text-amber-100 text-[22px] sm:text-[25px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xs border border-amber-400/30"
              title="Item Size"
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 shrink-0" />
              <span>{plant.size ? `SIZE: ${plant.size}` : (isBulk ? `UNIT: ${unitLabel}` : 'Std Size')}</span>
            </span>

            <span className={`text-xs font-extrabold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs self-center ${
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
                  <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                  <span>{plant.stock} In Stock (Negative / Oversold)</span>
                </>
              ) : plant.stock === 0 ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>0 In Stock (Out of Stock)</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{plant.stock} In Stock</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Confirmation & Cancel Action Buttons - Moved to directly below the Plant Information Card */}
        <div id="confirm-plant-actions" className="flex flex-col sm:flex-row gap-3 pt-0.5">
          <button
            type="button"
            id="cancel-plant-selection-btn"
            onClick={onClose}
            className="w-full sm:w-1/3 bg-[#f3f4f0] hover:bg-[#e2e3df] active:scale-[0.98] text-[#414844] font-extrabold py-4 px-5 rounded-2xl text-[22px] sm:text-[24px] transition-all cursor-pointer border border-[#c1c8c2] flex items-center justify-center gap-2 shadow-xs"
          >
            <X className="w-6 h-6 shrink-0" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            id="add-to-order-btn"
            onClick={handleConfirm}
            className="w-full sm:w-2/3 bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.98] text-[#a0f4c8] hover:text-white font-black py-4 px-5 rounded-2xl text-[22px] sm:text-[25px] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2.5 border border-[#a0f4c8]/30"
          >
            <CheckCircle2 className="w-7 h-7 text-[#a0f4c8] shrink-0" />
            <span>
              {existingCartItem ? 'Update Order' : 'Add to Order'} ({quantity} {unitLabel}{quantity > 1 ? 's' : ''})
            </span>
          </button>
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

        {/* GPS Yard Location Tagging Section: MULTIPLE NURSERY LOCATIONS */}
        <div className="bg-[#f0f9f4] p-3.5 rounded-2xl border border-[#a0f4c8] flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-2xs">
                <MapPin className="w-4 h-4 text-[#a0f4c8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider">
                    Nursery GPS Locations
                  </span>
                  {gpsLocations.length > 0 && (
                    <span className="bg-[#012d1d] text-[#a0f4c8] text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {gpsLocations.length} {gpsLocations.length === 1 ? 'Spot' : 'Spots'} Tagged
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#717973]">
                  Tag multiple nursery spots if this plant is stored in different places.
                </p>
              </div>
            </div>

            {/* Main GPS Actions */}
            <div className="flex items-center gap-1.5">
              {/* PRIMARY GPS BUTTON - ALWAYS PRESERVED AS PER RULE 1 */}
              <button
                type="button"
                onClick={() => handleCaptureGps()}
                disabled={isLoggingGps}
                className="px-3 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs border border-[#a0f4c8]/30 shrink-0"
                title="Lock onto current high-precision satellite GPS coordinates for this plant"
              >
                {isLoggingGps && !retaggingSpotId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                <span>
                  {isLoggingGps && !retaggingSpotId 
                    ? (gpsStatusText || 'Locking GPS...') 
                    : (gpsLocations.length > 0 ? '+ Tag Another GPS Spot' : '📍 Tag Yard GPS')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualGpsOpen(!isManualGpsOpen)}
                className="px-2.5 py-2 bg-white hover:bg-[#e2e3df] text-[#012d1d] rounded-xl text-xs font-bold border border-[#c1c8c2] cursor-pointer"
                title="Enter custom coordinates or nursery spot name manually"
              >
                {isManualGpsOpen ? 'Close' : '+ Coords'}
              </button>
            </div>
          </div>

          {/* Manual Coordinates Drawer */}
          {isManualGpsOpen && (
            <div className="bg-white p-3 rounded-xl border border-[#c1c8c2] flex flex-col gap-2 animate-in fade-in">
              <span className="text-[11px] font-bold text-[#012d1d] uppercase">
                Add Custom GPS Coordinates or Yard Spot
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-[#717973] block">Latitude</label>
                  <input 
                    type="number" 
                    step="0.00001" 
                    placeholder="e.g. 43.14820"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-lg px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#717973] block">Longitude</label>
                  <input 
                    type="number" 
                    step="0.00001" 
                    placeholder="e.g. -79.46230"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-lg px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#717973] block">Spot Name / Location Label</label>
                <input 
                  type="text" 
                  placeholder="e.g. Greenhouse 2, Bed 4A, Shade Bay 3"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-lg px-2 py-1 text-xs font-medium"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['Greenhouse 1', 'Greenhouse 2', 'Bed 3', 'Bed 4', 'Shade Bay', 'Holding Bay', 'East Lot'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setManualLabel(chip)}
                    className="text-[10px] font-semibold bg-[#e7e9e5] hover:bg-[#d0d3cd] text-[#012d1d] px-2 py-0.5 rounded cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddManualCoordinates}
                disabled={!manualLat || !manualLng}
                className="mt-1 w-full bg-[#012d1d] hover:bg-[#0e6c4a] disabled:opacity-50 text-[#a0f4c8] py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Add Spot Location
              </button>
            </div>
          )}

          {/* List of Tagged GPS Locations */}
          {gpsLocations.length === 0 ? (
            <div className="text-center py-2 px-3 bg-white/70 rounded-xl border border-dashed border-[#a0f4c8] text-xs text-[#717973]">
              No GPS coordinates tagged for this plant yet. Tap "📍 Tag Yard GPS" when standing beside the plants.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {gpsLocations.map((loc, idx) => {
                const rating = getGpsAccuracyRating(loc.accuracy);
                const isRetaggingThis = isLoggingGps && retaggingSpotId === loc.id;
                return (
                  <div 
                    key={loc.id} 
                    className="bg-white p-2.5 rounded-xl border border-[#a0f4c8] shadow-2xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="bg-[#012d1d] text-[#a0f4c8] font-black text-[10px] px-1.5 py-0.2 rounded shrink-0">
                          Spot #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={loc.label || ''}
                          onChange={(e) => handleUpdateSpotLabel(loc.id, e.target.value)}
                          placeholder={`Spot ${idx + 1} Label (e.g. Bed 4)`}
                          className="text-xs font-extrabold text-[#012d1d] bg-[#f9faf6] hover:bg-white focus:bg-white border border-transparent hover:border-[#c1c8c2] focus:border-[#012d1d] rounded px-1.5 py-0.5 w-36 sm:w-44 truncate focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Retag Satellite GPS for this spot */}
                        <button
                          type="button"
                          onClick={() => handleCaptureGps(loc.id)}
                          disabled={isLoggingGps}
                          className="text-[10px] font-bold text-[#0e6c4a] hover:bg-[#e8f5e9] px-2 py-1 rounded flex items-center gap-1 border border-[#a0f4c8] cursor-pointer"
                          title="Re-tag current GPS coordinates for this specific spot"
                        >
                          {isRetaggingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-[#0e6c4a]" />
                          ) : (
                            <RefreshCw className="w-3 h-3 text-[#0e6c4a]" />
                          )}
                          <span>{isRetaggingThis ? 'Locking...' : 'Retag'}</span>
                        </button>

                        {/* Remove this spot */}
                        <button
                          type="button"
                          onClick={() => handleRemoveGpsSpot(loc.id)}
                          className="text-[#ba1a1a] hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                          title="Remove this GPS spot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-[#002113]">
                        {formatGpsCoordinates(loc.latitude, loc.longitude, loc.accuracy)}
                      </span>

                      {loc.accuracy !== undefined && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${rating.colorClass} ${rating.badgeClass}`}>
                          {rating.label} (±{loc.accuracy.toFixed(1)}m)
                        </span>
                      )}
                    </div>

                    {/* Quick Preset Zone Chips */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[10px] text-[#717973] font-medium">Zone:</span>
                      {['Greenhouse', 'Bed', 'Shade Bay', 'Holding'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleUpdateSpotLabel(loc.id, `${tag} ${idx + 1}`)}
                          className="text-[9px] font-medium bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] px-1.5 py-0.2 rounded cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing Tier & Unit Price Selector */}
        <div id="confirm-plant-pricing" className="bg-[#f3f4f0]/70 p-3.5 rounded-2xl border border-[#c1c8c2]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        {/* Plant / Item Notes Section */}
        <div className="bg-[#f9faf6] p-3 rounded-2xl border border-[#c1c8c2]/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#012d1d] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0e6c4a]" />
              <span>Plant Item Notes (Optional)</span>
            </span>
            <span className="text-[11px] text-[#717973]">
              Staging & order instructions
            </span>
          </div>
          <input
            type="text"
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            placeholder="e.g. 10 in Bed 4 & 5 in Greenhouse 2; select best root balls"
            className="w-full bg-white border border-[#c1c8c2] rounded-xl px-3 py-2 text-xs text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
          />
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
      </div>
    </div>
  );
};
