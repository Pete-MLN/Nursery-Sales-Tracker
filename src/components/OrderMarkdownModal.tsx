import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlantItem, OrderItemMarkdown, MarkdownMethodType } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  Tag, 
  X, 
  Check, 
  Percent, 
  DollarSign, 
  ShieldCheck, 
  Package, 
  AlertCircle, 
  Trash2, 
  Sparkles,
  ArrowRight,
  TrendingDown,
  Layers
} from 'lucide-react';

interface OrderMarkdownModalProps {
  isOpen: boolean;
  plant: PlantItem | null;
  quantity?: number;
  currentMarkdown?: OrderItemMarkdown | null;
  basePrice?: number;
  onApplyMarkdown: (markdown: OrderItemMarkdown) => void;
  onRemoveMarkdown?: () => void;
  onClose: () => void;
}

const COMMON_REASONS = [
  { id: 'imperfection', label: '🌿 Plant Imperfection / Blemish', hint: 'Minor damage, faded foliage, cracked container' },
  { id: 'volume', label: '📦 Quantity / Volume Deal', hint: 'Bulk purchase discount for this specific order' },
  { id: 'courtesy', label: '🤝 Customer Courtesy', hint: 'Loyalty discount or customer goodwill accommodation' },
  { id: 'manager', label: "👨‍💼 Manager Special / Override", hint: 'One-time price override granted for this sale' },
  { id: 'clearance', label: '🍂 End of Lot / Clearance', hint: 'Moving remaining lot units for this ticket' },
  { id: 'custom', label: '✏️ Custom Reason', hint: 'Specify custom notes' }
];

const PERCENT_PRESETS = [5, 10, 15, 20, 23.08, 25, 30, 50];
const DOLLAR_OFF_PRESETS = [1, 2, 3, 5, 10, 15, 20];

export const OrderMarkdownModal: React.FC<OrderMarkdownModalProps> = ({
  isOpen,
  plant,
  quantity = 1,
  currentMarkdown,
  basePrice: passedBasePrice,
  onApplyMarkdown,
  onRemoveMarkdown,
  onClose
}) => {
  if (!isOpen || !plant) return null;

  const resolvedBasePrice = passedBasePrice !== undefined && passedBasePrice > 0
    ? passedBasePrice
    : (plant.prices?.retail !== undefined ? plant.prices.retail : (plant.price || 0));

  const [method, setMethod] = useState<MarkdownMethodType>(currentMarkdown?.type || 'percentage');
  const [inputValue, setInputValue] = useState<string>(
    currentMarkdown ? currentMarkdown.value.toString() : '20'
  );
  const [selectedReason, setSelectedReason] = useState<string>(() => {
    if (!currentMarkdown?.reason) return COMMON_REASONS[0].label;
    const match = COMMON_REASONS.find(r => r.label === currentMarkdown.reason);
    return match ? match.label : '✏️ Custom Reason';
  });
  const [customReasonText, setCustomReasonText] = useState<string>(() => {
    if (!currentMarkdown?.reason) return '';
    const match = COMMON_REASONS.find(r => r.label === currentMarkdown.reason);
    return match ? (currentMarkdown.customReason || '') : currentMarkdown.reason;
  });
  const [errorText, setErrorText] = useState<string>('');

  // Synchronize state when opening with fresh markdown or plant
  useEffect(() => {
    if (plant) {
      if (currentMarkdown) {
        setMethod(currentMarkdown.type);
        setInputValue(currentMarkdown.value.toString());
        const match = COMMON_REASONS.find(r => r.label === currentMarkdown.reason);
        if (match) {
          setSelectedReason(match.label);
          setCustomReasonText(currentMarkdown.customReason || '');
        } else {
          setSelectedReason('✏️ Custom Reason');
          setCustomReasonText(currentMarkdown.reason || '');
        }
      } else {
        setMethod('percentage');
        setInputValue('20');
        setSelectedReason(COMMON_REASONS[0].label);
        setCustomReasonText('');
      }
      setErrorText('');
    }
  }, [plant, currentMarkdown]);

  // Bring window to top on open
  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0);
    }
  }, [isOpen]);

  // Calculations
  const numericVal = parseFloat(inputValue);
  const isValidNumber = !isNaN(numericVal) && numericVal > 0;

  let calculatedMarkdownPrice = resolvedBasePrice;
  let unitSavings = 0;
  let savingsPercent = 0;

  if (isValidNumber) {
    if (method === 'percentage') {
      const pct = Math.max(0, Math.min(100, numericVal));
      unitSavings = parseFloat(((resolvedBasePrice * pct) / 100).toFixed(2));
      calculatedMarkdownPrice = Math.max(0, parseFloat((resolvedBasePrice - unitSavings).toFixed(2)));
      savingsPercent = pct;
    } else if (method === 'dollar_off') {
      unitSavings = Math.min(resolvedBasePrice, numericVal);
      calculatedMarkdownPrice = Math.max(0, parseFloat((resolvedBasePrice - unitSavings).toFixed(2)));
      savingsPercent = resolvedBasePrice > 0 ? Math.round((unitSavings / resolvedBasePrice) * 100) : 0;
    } else if (method === 'fixed_price') {
      calculatedMarkdownPrice = Math.max(0, numericVal);
      unitSavings = Math.max(0, parseFloat((resolvedBasePrice - calculatedMarkdownPrice).toFixed(2)));
      savingsPercent = resolvedBasePrice > 0 ? Math.round((unitSavings / resolvedBasePrice) * 100) : 0;
    }
  }

  const finalReason = selectedReason === '✏️ Custom Reason'
    ? (customReasonText.trim() || 'Custom Order Markdown')
    : selectedReason;

  const totalLineSavings = unitSavings * quantity;
  const newLineTotal = calculatedMarkdownPrice * quantity;
  const originalLineTotal = resolvedBasePrice * quantity;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) {
      setErrorText('Please enter a valid markdown value greater than zero.');
      return;
    }

    if (method === 'percentage' && (numericVal <= 0 || numericVal > 99)) {
      setErrorText('Percentage discount must be between 1% and 99%.');
      return;
    }

    if (method === 'dollar_off' && numericVal >= resolvedBasePrice) {
      setErrorText(`Dollar discount must be less than regular price ($${resolvedBasePrice.toFixed(2)}).`);
      return;
    }

    if (method === 'fixed_price' && numericVal <= 0) {
      setErrorText('Markdown unit price must be greater than $0.00.');
      return;
    }

    const markdownPayload: OrderItemMarkdown = {
      type: method,
      value: numericVal,
      reason: finalReason,
      customReason: selectedReason === '✏️ Custom Reason' ? customReasonText.trim() : undefined,
      originalPrice: resolvedBasePrice,
      markdownPrice: calculatedMarkdownPrice,
      savingsPerUnit: unitSavings,
      appliedAt: new Date().toISOString()
    };

    onApplyMarkdown(markdownPayload);
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#f9faf6] w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-[#c1c8c2] overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#012d1d] text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-[#0e6c4a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0e6c4a] flex items-center justify-center text-[#a0f4c8] shadow-2xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Markdown Plant</span>
                <span className="bg-[#a0f4c8] text-[#002113] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Order Only
                </span>
              </h2>
              <p className="text-xs text-[#a0f4c8]/90 font-medium">
                One-time discount for this active ticket. Master inventory unchanged.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-4">
          
          {/* Safeguard Notice Banner */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-[#0e6c4a] shrink-0 mt-0.5" />
            <div className="text-xs text-[#012d1d]">
              <span className="font-extrabold">Safe One-Time Adjustment: </span>
              This price markdown applies <span className="font-bold underline">only to this customer's order</span>.
              The master plant record in the POS inventory catalog will remain at its standard price (${resolvedBasePrice.toFixed(2)}).
            </div>
          </div>

          {/* Plant Reference Card */}
          <div className="bg-white border border-[#c1c8c2] rounded-2xl p-3 flex items-center gap-3.5 shadow-2xs">
            <img 
              src={plant.image || DEFAULT_PLANT_IMAGE} 
              alt={plant.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-[#f3f4f0] border border-[#c1c8c2] shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-[#012d1d] text-sm sm:text-base leading-tight truncate">
                {plant.name}
              </h3>
              {(plant.botanicalName || plant.descr) && (
                <p className="text-xs text-[#414844] italic truncate mt-0.5">
                  {plant.botanicalName || plant.descr}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#012d1d] bg-[#f3f4f0] px-2 py-0.5 rounded-md border border-[#c1c8c2]">
                  #{plant.itemNo || plant.barcode || 'N/A'}
                </span>
                <span className="text-xs font-bold text-[#461702] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {plant.size || 'Standard'}
                </span>
                <span className="text-xs font-extrabold text-[#0e6c4a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Reg: ${resolvedBasePrice.toFixed(2)} ea
                </span>
                {quantity > 1 && (
                  <span className="text-xs font-bold text-[#414844] bg-[#f3f4f0] px-2 py-0.5 rounded-md">
                    Qty: {quantity}x
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-extrabold text-[#012d1d] uppercase tracking-wider mb-2">
              Reason for Markdown
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_REASONS.map((r) => {
                const isSelected = selectedReason === r.label;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.label)}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-xs'
                        : 'bg-white hover:bg-[#f3f4f0] text-[#1a1c1a] border-[#c1c8c2]'
                    }`}
                  >
                    <div className="text-xs font-extrabold leading-tight">
                      {r.label}
                    </div>
                    <div className={`text-[11px] mt-0.5 leading-snug ${isSelected ? 'text-[#a0f4c8]/80' : 'text-[#717973]'}`}>
                      {r.hint}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedReason === '✏️ Custom Reason' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="e.g. Scratched pot, wholesale courtesy, lot closeout..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#c1c8c2] bg-white text-[#1a1c1a] focus:outline-none focus:ring-2 focus:ring-[#0e6c4a]"
                />
              </div>
            )}
          </div>

          {/* Markdown Method Tabs */}
          <div>
            <label className="block text-xs font-extrabold text-[#012d1d] uppercase tracking-wider mb-2">
              Markdown Type
            </label>
            <div className="grid grid-cols-3 gap-2 bg-[#e2e3df] p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setMethod('percentage');
                  if (method !== 'percentage') setInputValue('20');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'percentage'
                    ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs'
                    : 'text-[#414844] hover:text-[#012d1d]'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Percent (%) Off</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('dollar_off');
                  if (method !== 'dollar_off') setInputValue('5');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'dollar_off'
                    ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs'
                    : 'text-[#414844] hover:text-[#012d1d]'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>$ Dollar Off</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('fixed_price');
                  if (method !== 'fixed_price') {
                    const discounted = Math.max(0, resolvedBasePrice * 0.8);
                    setInputValue(discounted.toFixed(2));
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'fixed_price'
                    ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs'
                    : 'text-[#414844] hover:text-[#012d1d]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Exact Price ($)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets & Input Value */}
          <div className="bg-white border border-[#c1c8c2] rounded-2xl p-3.5 space-y-3">
            {method === 'percentage' && (
              <div>
                <span className="text-[11px] font-bold text-[#717973] uppercase tracking-wider block mb-1.5">
                  Quick Percent Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PERCENT_PRESETS.map((pct) => {
                    const isSelected = inputValue === pct.toString() || parseFloat(inputValue) === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setInputValue(pct.toString());
                          setErrorText('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-2xs ring-2 ring-[#a0f4c8]/50'
                            : 'bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] border-[#c1c8c2]'
                        }`}
                      >
                        {pct}% OFF
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {method === 'dollar_off' && (
              <div>
                <span className="text-[11px] font-bold text-[#717973] uppercase tracking-wider block mb-1.5">
                  Quick Dollar Off Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DOLLAR_OFF_PRESETS.map((dol) => {
                    const isSelected = inputValue === dol.toString() || parseFloat(inputValue) === dol;
                    return (
                      <button
                        key={dol}
                        type="button"
                        onClick={() => {
                          setInputValue(dol.toString());
                          setErrorText('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-2xs ring-2 ring-[#a0f4c8]/50'
                            : 'bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] border-[#c1c8c2]'
                        }`}
                      >
                        -${dol}.00 OFF
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct Input */}
            <div>
              <label className="block text-xs font-bold text-[#012d1d] mb-1">
                {method === 'percentage' && 'Discount Percentage (%):'}
                {method === 'dollar_off' && 'Discount Dollar Amount ($ off per unit):'}
                {method === 'fixed_price' && 'New Unit Price for this order ($):'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#717973]">
                  {method === 'percentage' ? '%' : '$'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setErrorText('');
                  }}
                  className="w-full pl-8 pr-4 py-2.5 bg-[#f9faf6] border border-[#c1c8c2] rounded-xl text-base font-black text-[#012d1d] focus:outline-none focus:ring-2 focus:ring-[#0e6c4a]"
                  placeholder={method === 'percentage' ? '20' : '15.00'}
                />
              </div>
            </div>
          </div>

          {errorText && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2 text-xs font-bold text-[#ba1a1a]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Pricing Impact Live Preview Card */}
          <div className="bg-[#012d1d] text-white rounded-2xl p-4 border border-[#0e6c4a] shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#0e6c4a]/60 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs text-[#a0f4c8] font-bold">
                <Sparkles className="w-4 h-4 text-[#a0f4c8]" />
                <span>Impact on Current Ticket</span>
              </div>
              <span className="text-[11px] font-mono text-[#a0f4c8]/90 font-extrabold uppercase">
                {finalReason}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white/10 rounded-xl p-2">
                <span className="text-[10px] uppercase tracking-wider text-white/70 block">Original Price</span>
                <span className="text-sm font-extrabold text-white line-through">${resolvedBasePrice.toFixed(2)}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2">
                <span className="text-[10px] uppercase tracking-wider text-white/70 block">Savings / Unit</span>
                <span className="text-sm font-extrabold text-[#a0f4c8]">
                  -${unitSavings.toFixed(2)} ({savingsPercent}%)
                </span>
              </div>
              <div className="bg-emerald-500/20 border border-[#a0f4c8]/40 rounded-xl p-2">
                <span className="text-[10px] uppercase tracking-wider text-[#a0f4c8] block font-black">Markdown Price</span>
                <span className="text-base font-black text-[#a0f4c8]">${calculatedMarkdownPrice.toFixed(2)}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2">
                <span className="text-[10px] uppercase tracking-wider text-white/70 block">Line Total ({quantity}x)</span>
                <span className="text-sm font-black text-white">${newLineTotal.toFixed(2)}</span>
              </div>
            </div>

            {quantity > 1 && totalLineSavings > 0 && (
              <div className="bg-[#0e6c4a]/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-bold text-[#a0f4c8]">
                <span>Total Customer Savings on this Item:</span>
                <span className="font-black text-sm">Save ${totalLineSavings.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white px-5 py-3.5 border-t border-[#c1c8c2] flex items-center justify-between gap-2 shrink-0">
          <div>
            {currentMarkdown && onRemoveMarkdown && (
              <button
                type="button"
                onClick={() => {
                  onRemoveMarkdown();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#ba1a1a] hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                title="Remove markdown and restore regular price"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Markdown</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#c1c8c2] text-xs font-bold text-[#414844] hover:bg-[#f3f4f0] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-apply-order-markdown"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 text-[#a0f4c8]" />
              <span>Apply to This Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
