import React, { useState } from 'react';
import { ScreenType, Order, HoldingArea } from '../types';
import { HOLDING_AREAS } from '../data/mockData';
import { 
  Warehouse, 
  Sun, 
  Truck, 
  MapPin, 
  Search, 
  CheckCircle, 
  Package, 
  Pencil, 
  Plus, 
  Trash2, 
  RotateCcw, 
  X, 
  Store, 
  Layers, 
  Sprout, 
  Check,
  Building2
} from 'lucide-react';

interface HoldingLocationScreenProps {
  onNavigate: (screen: ScreenType) => void;
  activeOrder?: Order | null;
  onConfirmLocation: (locationName: string) => void;
  holdingAreas?: HoldingArea[];
  onUpdateHoldingArea?: (area: HoldingArea) => void;
  onAddHoldingArea?: (area: HoldingArea) => void;
  onDeleteHoldingArea?: (id: string) => void;
  onResetHoldingAreas?: () => void;
}

const AVAILABLE_ICONS = [
  { id: 'warehouse', label: 'Greenhouse / Barn', icon: Warehouse },
  { id: 'deck', label: 'Outdoor / Shade', icon: Sun },
  { id: 'local_shipping', label: 'Truck / Freight', icon: Truck },
  { id: 'pin_drop', label: 'Specific Pin', icon: MapPin },
  { id: 'package', label: 'Storage / Staging', icon: Package },
  { id: 'store', label: 'Retail Yard', icon: Store },
  { id: 'building', label: 'Main Facility', icon: Building2 },
  { id: 'sprout', label: 'Nursery Bed', icon: Sprout },
];

export const HoldingLocationScreen: React.FC<HoldingLocationScreenProps> = ({
  onNavigate,
  activeOrder,
  onConfirmLocation,
  holdingAreas: propHoldingAreas,
  onUpdateHoldingArea,
  onAddHoldingArea,
  onDeleteHoldingArea,
  onResetHoldingAreas
}) => {
  // Local fallback if props not passed directly
  const [localAreas, setLocalAreas] = useState<HoldingArea[]>(() => {
    if (propHoldingAreas && propHoldingAreas.length > 0) return propHoldingAreas;
    const saved = localStorage.getItem('nursery_holding_areas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return HOLDING_AREAS;
  });

  const areas = propHoldingAreas && propHoldingAreas.length > 0 ? propHoldingAreas : localAreas;

  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (areas.length > 0) return areas[0].id;
    return 'area_b';
  });
  const [customRowInput, setCustomRowInput] = useState<string>('Row 12, Sec B');

  // Edit / Add Modal state
  const [editingArea, setEditingArea] = useState<HoldingArea | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSubtitle, setFormSubtitle] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('warehouse');
  const [formError, setFormError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const getAreaIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'warehouse':
        return <Warehouse className={className} />;
      case 'deck':
        return <Sun className={className} />;
      case 'local_shipping':
        return <Truck className={className} />;
      case 'package':
        return <Package className={className} />;
      case 'store':
        return <Store className={className} />;
      case 'building':
        return <Building2 className={className} />;
      case 'sprout':
        return <Sprout className={className} />;
      case 'pin_drop':
      default:
        return <MapPin className={className} />;
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, area: HoldingArea) => {
    e.stopPropagation();
    setEditingArea(area);
    setIsCreatingNew(false);
    setFormTitle(area.title);
    setFormSubtitle(area.subtitle);
    setFormIcon(area.icon || 'warehouse');
    setFormError('');
  };

  const handleOpenCreate = () => {
    setEditingArea(null);
    setIsCreatingNew(true);
    setFormTitle('');
    setFormSubtitle('');
    setFormIcon('warehouse');
    setFormError('');
  };

  const handleCloseModal = () => {
    setEditingArea(null);
    setIsCreatingNew(false);
    setFormError('');
  };

  const handleSaveArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter a location name.');
      return;
    }

    if (isCreatingNew) {
      const newArea: HoldingArea = {
        id: `area_custom_${Date.now()}`,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || 'Custom holding area',
        icon: formIcon,
        isCustom: true
      };

      if (onAddHoldingArea) {
        onAddHoldingArea(newArea);
      } else {
        setLocalAreas(prev => {
          const next = [...prev, newArea];
          localStorage.setItem('nursery_holding_areas', JSON.stringify(next));
          return next;
        });
      }
      setSelectedAreaId(newArea.id);
      showToast(`Created "${newArea.title}" successfully!`);
    } else if (editingArea) {
      const updatedArea: HoldingArea = {
        ...editingArea,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        icon: formIcon
      };

      if (onUpdateHoldingArea) {
        onUpdateHoldingArea(updatedArea);
      } else {
        setLocalAreas(prev => {
          const next = prev.map(a => a.id === updatedArea.id ? updatedArea : a);
          localStorage.setItem('nursery_holding_areas', JSON.stringify(next));
          return next;
        });
      }
      showToast(`Updated "${updatedArea.title}" name & description!`);
    }

    handleCloseModal();
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      if (onDeleteHoldingArea) {
        onDeleteHoldingArea(id);
      } else {
        setLocalAreas(prev => {
          const next = prev.filter(a => a.id !== id);
          localStorage.setItem('nursery_holding_areas', JSON.stringify(next));
          return next;
        });
      }
      if (selectedAreaId === id) {
        const remaining = areas.filter(a => a.id !== id);
        if (remaining.length > 0) setSelectedAreaId(remaining[0].id);
      }
      showToast(`Deleted location "${name}"`);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all holding location names and descriptions back to factory default?')) {
      if (onResetHoldingAreas) {
        onResetHoldingAreas();
      } else {
        setLocalAreas(HOLDING_AREAS);
        localStorage.setItem('nursery_holding_areas', JSON.stringify(HOLDING_AREAS));
      }
      setSelectedAreaId('area_b');
      showToast('Reset locations to default settings');
    }
  };

  const handleConfirm = () => {
    let locationText = '';
    const selected = areas.find(a => a.id === selectedAreaId);
    if (selectedAreaId === 'left_in_place') {
      locationText = customRowInput ? `Left in Place (${customRowInput})` : 'Left in Place (Current Row)';
    } else {
      locationText = `${selected?.title || 'Holding Area'} - ${selected?.subtitle || ''}`;
    }

    onConfirmLocation(locationText);
    onNavigate('finalization');
  };

  const activeSelectedArea = areas.find(a => a.id === selectedAreaId);

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-48 animate-fade-in flex flex-col gap-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#012d1d] text-[#a0f4c8] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold animate-fade-in border border-[#a0f4c8]/30">
          <CheckCircle className="w-4 h-4 text-[#a0f4c8]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Context Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 bg-[#a0f4c8] text-[#002113] px-3 py-1 rounded-full font-extrabold text-xs uppercase tracking-widest">
            <Package className="w-3.5 h-3.5 text-[#0e6c4a]" />
            <span>Placement Routing</span>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#012d1d] text-[#a0f4c8] hover:bg-[#0e6c4a] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Add a new custom holding location"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Zone</span>
            </button>
            <button
              onClick={handleReset}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#e7e9e5] text-[#414844] hover:text-[#012d1d] hover:bg-[#dbe0dc] text-xs font-semibold transition-colors cursor-pointer"
              title="Reset location names and descriptions to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1c1a] tracking-tight">
          Assign Holding Location
        </h2>
        <p className="text-sm text-[#414844] mt-1.5">
          Select a designated zone or click <span className="font-bold text-[#012d1d]">"Edit" (pencil)</span> on any location to customize its name and description.
        </p>

        {activeOrder && (
          <div className="mt-3 p-3 bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl flex justify-between items-center text-xs sm:text-sm">
            <span className="font-bold text-[#012d1d]">
              Order: <span className="underline">{activeOrder.id}</span>
            </span>
            <span className="font-semibold text-[#414844]">{activeOrder.customerName}</span>
          </div>
        )}
      </div>

      {/* Holding Locations Selection List */}
      <div className="flex flex-col gap-3" id="location-selector">
        {areas.map((area) => {
          const isSelected = selectedAreaId === area.id;

          return (
            <div
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`group relative flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 shadow-2xs ${
                isSelected
                  ? 'bg-[#1b4332] border-[#012d1d] text-white shadow-md ring-2 ring-[#a0f4c8]/30'
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

              {/* Icon Container */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mr-3.5 shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-[#012d1d] text-[#a0f4c8]'
                    : 'bg-[#f3f4f0] text-[#012d1d]'
                }`}
              >
                {getAreaIcon(area.icon)}
              </div>

              {/* Name (Title) & Description (Subtitle) */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`block font-bold text-base sm:text-lg leading-tight truncate ${
                      isSelected ? 'text-white' : 'text-[#1a1c1a]'
                    }`}
                  >
                    {area.title}
                  </span>
                  {area.isCustom && (
                    <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-[#a0f4c8] text-[#002113]' : 'bg-[#e2e3df] text-[#414844]'
                    }`}>
                      Custom
                    </span>
                  )}
                </div>
                <span
                  className={`block text-xs sm:text-sm mt-0.5 ${
                    isSelected ? 'text-[#a0f4c8]' : 'text-[#414844]'
                  }`}
                >
                  {area.subtitle}
                </span>
              </div>

              {/* Actions on Card */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* Edit Name and Description Button */}
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(e, area)}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/15 hover:bg-white/30 text-white border border-white/20'
                      : 'bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] border border-[#c1c8c2]'
                  }`}
                  title="Edit name and description for this location"
                  aria-label={`Edit ${area.title}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>

                {/* Delete button (for custom or additional areas) */}
                {area.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, area.id, area.title)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-red-300 hover:text-red-100 hover:bg-red-900/40'
                        : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                    }`}
                    title="Delete custom location"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Selected Checkmark */}
                <div className="ml-1">
                  <CheckCircle
                    className={`w-6 h-6 transition-all duration-200 ${
                      isSelected
                        ? 'opacity-100 text-[#a0f4c8] scale-100'
                        : 'opacity-0 scale-50'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conditional Input Area (Expands when 'Left in Place' is selected) */}
      {selectedAreaId === 'left_in_place' && (
        <div className="bg-[#f3f4f0] p-4 rounded-xl border border-[#c1c8c2] animate-fade-in">
          <label
            htmlFor="custom_location_input"
            className="block font-bold text-xs text-[#012d1d] mb-2 uppercase tracking-wide"
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
            Enter physical aisle, greenhouse bench, or bay code for quick item retrieval.
          </p>
        </div>
      )}

      {/* Direct In-Flow Action & Confirmation Card */}
      <div className="bg-[#f3f4f0] p-4 sm:p-5 rounded-2xl border border-[#c1c8c2] flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 shadow-xs">
        <div className="w-full sm:w-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717973] block">
            Selected Destination
          </span>
          <div className="text-base font-extrabold text-[#012d1d] flex items-center gap-2 mt-0.5">
            <span>{activeSelectedArea?.title || 'None Selected'}</span>
            {activeSelectedArea?.subtitle && (
              <span className="text-xs font-medium text-[#414844] hidden sm:inline">
                ({activeSelectedArea.subtitle})
              </span>
            )}
          </div>
        </div>

        <button
          id="confirm-location-btn-main"
          type="button"
          onClick={handleConfirm}
          className="w-full sm:w-auto min-w-[260px] bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.98] text-[#a0f4c8] hover:text-white py-4 px-7 rounded-xl font-extrabold text-sm uppercase tracking-wider shadow-lg transition-all flex justify-center items-center gap-2.5 cursor-pointer border border-[#a0f4c8]/30"
        >
          <CheckCircle className="w-5 h-5 text-[#a0f4c8]" />
          <span>Confirm & Continue to Finalize</span>
        </button>
      </div>

      {/* Edit / Create Holding Location Modal */}
      {(editingArea || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#c1c8c2] flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#e2e3df] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#012d1d] text-[#a0f4c8] rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1a1c1a]">
                    {isCreatingNew ? 'Create New Holding Location' : 'Edit Holding Location'}
                  </h3>
                  <p className="text-xs text-[#717973]">
                    Change the name and description displayed to your staff.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSaveArea} className="flex flex-col gap-4">
              {/* Location Name Field */}
              <div>
                <label className="block text-xs font-extrabold text-[#012d1d] uppercase tracking-wider mb-1.5">
                  Location Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. Holding Area A, Main Greenhouse Bay 1"
                  required
                  className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3.5 py-2.5 text-base font-bold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white transition-all shadow-2xs"
                />
                <span className="text-[11px] text-[#717973] mt-1 block">
                  Primary name printed on pick-lists and order tickets.
                </span>
              </div>

              {/* Description / Subtitle Field */}
              <div>
                <label className="block text-xs font-extrabold text-[#012d1d] uppercase tracking-wider mb-1.5">
                  Description / Routing Details
                </label>
                <textarea
                  rows={2}
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. North Greenhouse, Aisles 1-5, Rack Staging"
                  className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white transition-all shadow-2xs"
                />
                <span className="text-[11px] text-[#717973] mt-1 block">
                  Helpful instructions for nursery yard workers.
                </span>
              </div>

              {/* Icon Chooser */}
              <div>
                <label className="block text-xs font-extrabold text-[#012d1d] uppercase tracking-wider mb-2">
                  Select Location Icon
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormIcon(item.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-sm ring-2 ring-[#a0f4c8]/40'
                            : 'bg-[#f9faf6] text-[#414844] border-[#c1c8c2] hover:bg-white hover:border-[#012d1d]'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[10px] text-center leading-tight truncate w-full">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e3df] mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#414844] hover:bg-[#f3f4f0] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCreatingNew ? 'Create Location' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Floating Bottom Action Bar */}
      <div className="fixed bottom-14 md:bottom-16 left-0 right-0 p-3 bg-[#f9faf6]/95 backdrop-blur-md border-t border-[#e2e3df] z-40 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-[#414844] truncate">
            Selected: <span className="font-bold text-[#012d1d]">{activeSelectedArea?.title || 'Holding Zone'}</span>
          </div>

          <button
            id="confirm-location-btn-sticky"
            type="button"
            onClick={handleConfirm}
            className="bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.98] text-[#a0f4c8] hover:text-white py-2.5 px-5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0 border border-[#a0f4c8]/30"
          >
            <CheckCircle className="w-4 h-4 text-[#a0f4c8]" />
            <span>Confirm & Continue →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
