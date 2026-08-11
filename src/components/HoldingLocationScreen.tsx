import React, { useState } from 'react';
import { ScreenType, Order } from '../types';
import { HOLDING_AREAS } from '../data/mockData';
import { Warehouse, Sun, Truck, MapPin, Search, CheckCircle, Package } from 'lucide-react';

interface HoldingLocationScreenProps {
  onNavigate: (screen: ScreenType) => void;
  activeOrder?: Order | null;
  onConfirmLocation: (locationName: string) => void;
}

export const HoldingLocationScreen: React.FC<HoldingLocationScreenProps> = ({
  onNavigate,
  activeOrder,
  onConfirmLocation
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('area_b');
  const [customRowInput, setCustomRowInput] = useState<string>('Row 12, Sec B');

  const getAreaIcon = (icon: string) => {
    switch (icon) {
      case 'warehouse':
        return <Warehouse className="w-6 h-6" />;
      case 'deck':
        return <Sun className="w-6 h-6" />;
      case 'local_shipping':
        return <Truck className="w-6 h-6" />;
      case 'pin_drop':
      default:
        return <MapPin className="w-6 h-6" />;
    }
  };

  const handleConfirm = () => {
    let locationText = '';
    const selected = HOLDING_AREAS.find(a => a.id === selectedAreaId);
    if (selectedAreaId === 'left_in_place') {
      locationText = customRowInput ? `Left in Place (${customRowInput})` : 'Left in Place (Current Row)';
    } else {
      locationText = `${selected?.title || 'Holding Area'} - ${selected?.subtitle || ''}`;
    }

    onConfirmLocation(locationText);
    onNavigate('finalization');
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Context Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 mb-2 bg-[#a0f4c8] text-[#19724f] px-3 py-1 rounded-full font-bold text-xs uppercase tracking-widest">
          <Package className="w-3.5 h-3.5" />
          <span>Placement Routing</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1a] tracking-tight">
          Assign Holding Location
        </h2>
        <p className="text-sm text-[#414844] mt-2">
          Select a designated zone or specify an exact row if leaving the inventory in place.
        </p>

        {activeOrder && (
          <div className="mt-3 p-3 bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl flex justify-between items-center text-xs">
            <span className="font-semibold text-[#012d1d]">
              Assigning for Order: <span className="underline">{activeOrder.id}</span>
            </span>
            <span className="text-[#414844]">{activeOrder.customerName}</span>
          </div>
        )}
      </div>

      {/* Selection Cards */}
      <div className="flex flex-col gap-3" id="location-selector">
        {HOLDING_AREAS.map((area) => {
          const isSelected = selectedAreaId === area.id;

          return (
            <label
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`group relative flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-[#1b4332] border-[#012d1d] text-white shadow-sm'
                  : 'bg-white border-[#717973]/30 hover:border-[#012d1d] text-[#1a1c1a]'
              }`}
            >
              <input
                type="radio"
                name="location_type"
                value={area.id}
                checked={isSelected}
                onChange={() => setSelectedAreaId(area.id)}
                className="sr-only"
              />

              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-[#012d1d] text-white'
                    : 'bg-[#f3f4f0] text-[#012d1d]'
                }`}
              >
                {getAreaIcon(area.icon)}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`block font-semibold text-base ${
                    isSelected ? 'text-[#86af99]' : 'text-[#1a1c1a]'
                  }`}
                >
                  {area.title}
                </span>
                <span
                  className={`block text-sm ${
                    isSelected ? 'text-white/80' : 'text-[#414844]'
                  }`}
                >
                  {area.subtitle}
                </span>
              </div>

              <CheckCircle
                className={`w-6 h-6 transition-all duration-200 ${
                  isSelected
                    ? 'opacity-100 text-[#a0f4c8] scale-100'
                    : 'opacity-0 scale-50'
                }`}
              />
            </label>
          );
        })}
      </div>

      {/* Conditional Input Area (Expands when 'Left in Place' is selected) */}
      {selectedAreaId === 'left_in_place' && (
        <div className="bg-[#f3f4f0] p-4 rounded-xl border border-[#c1c8c2] animate-fade-in">
          <label
            htmlFor="custom_location_input"
            className="block font-bold text-xs text-[#414844] mb-2 uppercase tracking-wide"
          >
            Specify Row / Location Code
          </label>
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-3 text-[#717973]" />
            <input
              id="custom_location_input"
              type="text"
              value={customRowInput}
              onChange={(e) => setCustomRowInput(e.target.value)}
              placeholder="e.g. Row 12, Sec B"
              className="w-full bg-white border border-[#717973] rounded-lg pl-10 pr-4 py-3 font-bold text-base text-[#1a1c1a] placeholder:text-[#c1c8c2] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]"
            />
          </div>
          <p className="text-xs text-[#414844] mt-2">
            Enter alphanumeric location code for precise physical tracking.
          </p>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f9faf6]/90 backdrop-blur-md border-t border-[#e2e3df] z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-[#461702] hover:bg-[#622c13] active:scale-[0.98] text-white py-4 rounded-full font-bold text-xs uppercase tracking-widest shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
