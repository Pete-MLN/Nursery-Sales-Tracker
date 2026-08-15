import React, { useState, useRef, useEffect } from 'react';
import { PlantItem } from '../types';
import { getPlantPriceTiers, PriceLevelKey, PriceTierInfo } from '../utils/pricingUtils';
import { ChevronDown, Check, Tag, DollarSign, Layers } from 'lucide-react';

interface PricingDropdownProps {
  plant: PlantItem;
  currentPrice?: number;
  selectedLevelKey?: PriceLevelKey;
  onSelectPriceLevel?: (level: PriceLevelKey, price: number) => void;
  isInteractive?: boolean;
  size?: 'xs' | 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
}

export const PricingDropdown: React.FC<PricingDropdownProps> = ({
  plant,
  currentPrice,
  selectedLevelKey,
  onSelectPriceLevel,
  isInteractive = true,
  size = 'sm',
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const priceTiers = getPlantPriceTiers(plant);

  // Determine which price level is currently active
  const activeLevel: PriceTierInfo = (() => {
    if (selectedLevelKey) {
      const match = priceTiers.find(t => t.key === selectedLevelKey);
      if (match) return match;
    }
    if (currentPrice !== undefined) {
      const match = priceTiers.find(t => Math.abs(t.price - currentPrice) < 0.01);
      if (match) return match;
    }
    return priceTiers[0]; // Level 1 Retail default
  })();

  const displayPrice = currentPrice !== undefined ? currentPrice : activeLevel.price;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (tier: PriceTierInfo) => {
    if (onSelectPriceLevel) {
      onSelectPriceLevel(tier.key, tier.price);
    }
    setIsOpen(false);
  };

  const getTierBadgeStyle = (key: PriceLevelKey, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-[#012d1d] text-[#a0f4c8] font-bold border-[#012d1d]';
    }
    switch (key) {
      case 'retail':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'wholesale':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'gardenCenter':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'elite':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      default:
        return 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]';
    }
  };

  const getLevelDotColor = (key: PriceLevelKey) => {
    switch (key) {
      case 'retail': return 'bg-emerald-500';
      case 'wholesale': return 'bg-teal-600';
      case 'gardenCenter': return 'bg-amber-600';
      case 'elite': return 'bg-purple-600';
      default: return 'bg-[#717973]';
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (isInteractive) {
            setIsOpen(prev => !prev);
          }
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer select-none active:scale-98 ${
          size === 'xs'
            ? 'px-2 py-0.5 text-xs'
            : size === 'sm'
            ? 'px-2.5 py-1 text-xs sm:text-sm font-semibold'
            : 'px-3 py-1.5 text-sm sm:text-base font-bold'
        } ${
          isOpen
            ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-sm ring-2 ring-[#a0f4c8]/50'
            : 'bg-white hover:bg-[#f9faf6] text-[#012d1d] border-[#c1c8c2] shadow-2xs hover:border-[#0e6c4a]'
        }`}
        title="Click to view and switch between all 4 POS price levels"
      >
        <span className="font-extrabold text-[#012d1d] group-hover:text-[#0e6c4a]">
          ${displayPrice.toFixed(2)}
        </span>

        <span
          className={`text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border ${
            isOpen ? 'bg-[#a0f4c8] text-[#002113] border-transparent' : getTierBadgeStyle(activeLevel.key, false)
          }`}
        >
          {activeLevel.shortLabel}
        </span>

        {isInteractive && (
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-[#a0f4c8]' : 'text-[#717973]'
            }`}
          />
        )}
      </button>

      {/* Floating 4-Tier Pricing Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute mt-1.5 z-50 w-72 bg-white rounded-2xl border border-[#c1c8c2] shadow-xl overflow-hidden animate-fade-in divide-y divide-[#f3f4f0] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="p-3 bg-[#f9faf6] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#0e6c4a]" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#012d1d]">
                4 Price Levels
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#717973]">
              Select to apply
            </span>
          </div>

          {/* 4 Price Level Options */}
          <div className="p-1.5 flex flex-col gap-1">
            {priceTiers.map((tier) => {
              const isSelected = activeLevel.key === tier.key;

              return (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => handleSelect(tier)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e7f8ef] text-[#012d1d] border border-[#a0f4c8] font-bold shadow-2xs'
                      : 'hover:bg-[#f3f4f0] text-[#1a1c1a] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${getLevelDotColor(tier.key)} shrink-0`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-[#1a1c1a]">
                          {tier.fullLabel}
                        </span>
                        <span className="text-[10px] font-mono text-[#717973]">
                          ({tier.posField})
                        </span>
                      </div>
                      <span className="text-[11px] text-[#717973] block truncate">
                        {tier.key === 'retail' && 'Standard Retail Walk-in Rate'}
                        {tier.key === 'wholesale' && 'Landscaper & Commercial Rate'}
                        {tier.key === 'gardenCenter' && 'Garden Center Reseller Rate'}
                        {tier.key === 'elite' && 'Elite High-Volume Preferred Rate'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-extrabold text-[#012d1d]">
                      ${tier.price.toFixed(2)}
                    </span>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-[#c1c8c2] opacity-40" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="px-3 py-2 bg-[#f9faf6] text-[10px] text-[#717973] flex items-center justify-between">
            <span>Item: {plant.name}</span>
            {plant.itemNo && <span className="font-mono">#{plant.itemNo}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
