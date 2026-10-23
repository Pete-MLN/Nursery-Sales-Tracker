import React, { useState, useEffect, useMemo } from 'react';
import { PlantItem, Order, ScreenType, PlantCulturalFilterCriteria, OrderCartItem, PlantCulturalProfile } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { isPlantOnSale, getPlantSaleSavings } from '../utils/pricingUtils';
import { getPlantGpsYearStatus } from '../utils/gpsUtils';
import { 
  loadCounterpointCulturalData, 
  scoreAndFilterPlants, 
  ScoredPlantMatch
} from '../services/culturalDataService';
import { PlantMapModal } from './PlantMapModal';
import { PlantGpsHistoryModal } from './PlantGpsHistoryModal';
import { 
  X, 
  Search, 
  RotateCcw, 
  Sparkles, 
  Check, 
  MapPin, 
  Plus, 
  ShoppingCart, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Sun, 
  ShieldCheck, 
  TreePine, 
  Flower2, 
  Layers, 
  ExternalLink,
  Info,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface PlantAttributeMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: PlantItem[];
  orders?: Order[];
  onSelectOrder?: (order: Order) => void;
  onNavigate: (screen: ScreenType) => void;
  onAddToCart?: (plant: PlantItem) => void;
  stockAlertSettings?: { criticalThreshold?: number; warningThreshold?: number };
}

export const PlantAttributeMatcherModal: React.FC<PlantAttributeMatcherModalProps> = ({
  isOpen,
  onClose,
  inventory,
  orders = [],
  onSelectOrder,
  onNavigate,
  onAddToCart,
  stockAlertSettings
}) => {
  const [culturalProfiles, setCulturalProfiles] = useState<PlantCulturalProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Criteria filters
  const [heightFilter, setHeightFilter] = useState<PlantCulturalFilterCriteria['heightCategory'] | undefined>(undefined);
  const [foliageFilter, setFoliageFilter] = useState<'evergreen' | 'deciduous' | undefined>(undefined);
  const [flowerColorFilter, setFlowerColorFilter] = useState<string | undefined>(undefined);
  const [fallColorFilter, setFallColorFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<PlantCulturalFilterCriteria['categoryType'] | undefined>(undefined);
  const [sunFilter, setSunFilter] = useState<'Full Sun' | 'Partial Sun' | 'Full Shade' | undefined>(undefined);
  const [soilFilter, setSoilFilter] = useState<PlantCulturalFilterCriteria['soilMoisture'] | undefined>(undefined);
  const [deerFilter, setDeerFilter] = useState<'High' | 'Moderate' | 'Low' | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState<boolean>(true);
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(false);
  const [keywordSearch, setKeywordSearch] = useState<string>('');

  const [hasExecutedSearch, setHasExecutedSearch] = useState<boolean>(false);
  const [activeSearchedCriteria, setActiveSearchedCriteria] = useState<PlantCulturalFilterCriteria | null>(null);

  // Expandable sections inside modal
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState<boolean>(true);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);

  // GPS Modals
  const [mapModalPlant, setMapModalPlant] = useState<PlantItem | null>(null);
  const [gpsModalPlant, setGpsModalPlant] = useState<PlantItem | null>(null);

  const currentYear = new Date().getFullYear();
  const critThreshold = stockAlertSettings?.criticalThreshold ?? 0;
  const warnThreshold = stockAlertSettings?.warningThreshold ?? 5;

  const totalOnSaleCount = useMemo(() => {
    return inventory.filter(p => isPlantOnSale(p)).length;
  }, [inventory]);

  // Load cultural profiles on mount or open
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingProfiles(true);
    loadCounterpointCulturalData()
      .then(profs => {
        setCulturalProfiles(profs);
      })
      .catch(err => {
        console.warn('Could not load Counterpoint cultural profiles:', err);
      })
      .finally(() => {
        setIsLoadingProfiles(false);
      });
  }, [isOpen]);

  const activeCriteriaCount = useMemo(() => {
    let count = 0;
    if (heightFilter) count++;
    if (foliageFilter) count++;
    if (flowerColorFilter) count++;
    if (fallColorFilter) count++;
    if (categoryFilter) count++;
    if (sunFilter) count++;
    if (soilFilter) count++;
    if (deerFilter) count++;
    if (onSaleOnly) count++;
    return count;
  }, [
    heightFilter,
    foliageFilter,
    flowerColorFilter,
    fallColorFilter,
    categoryFilter,
    sunFilter,
    soilFilter,
    deerFilter,
    onSaleOnly
  ]);

  const currentCriteria: PlantCulturalFilterCriteria = useMemo(() => ({
    heightCategory: heightFilter,
    foliageType: foliageFilter,
    flowerColor: flowerColorFilter,
    fallColor: fallColorFilter,
    categoryType: categoryFilter,
    sunExposure: sunFilter,
    soilMoisture: soilFilter,
    deerResistance: deerFilter,
    inStockOnly,
    onSaleOnly
  }), [
    heightFilter,
    foliageFilter,
    flowerColorFilter,
    fallColorFilter,
    categoryFilter,
    sunFilter,
    soilFilter,
    deerFilter,
    inStockOnly,
    onSaleOnly
  ]);

  const handleStartSearch = () => {
    setActiveSearchedCriteria({ ...currentCriteria });
    setHasExecutedSearch(true);
  };

  const handleToggleOnSale = (targetValue?: boolean) => {
    const next = targetValue !== undefined ? targetValue : !onSaleOnly;
    setOnSaleOnly(next);
    if (hasExecutedSearch) {
      setActiveSearchedCriteria(prev => prev ? { ...prev, onSaleOnly: next } : null);
    }
  };

  const handleToggleInStock = () => {
    const next = !inStockOnly;
    setInStockOnly(next);
    if (hasExecutedSearch) {
      setActiveSearchedCriteria(prev => prev ? { ...prev, inStockOnly: next } : null);
    }
  };

  const handleResetFilters = () => {
    setHeightFilter(undefined);
    setFoliageFilter(undefined);
    setFlowerColorFilter(undefined);
    setFallColorFilter(undefined);
    setCategoryFilter(undefined);
    setSunFilter(undefined);
    setSoilFilter(undefined);
    setDeerFilter(undefined);
    setKeywordSearch('');
    setInStockOnly(true);
    setOnSaleOnly(false);
    setHasExecutedSearch(false);
    setActiveSearchedCriteria(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3500);
  };

  // Scored matching - computed only when search button is clicked
  const { bestMatches, closeMatches } = useMemo(() => {
    if (!hasExecutedSearch || !activeSearchedCriteria) {
      return { bestMatches: [], closeMatches: [] };
    }

    const scored = scoreAndFilterPlants(inventory, activeSearchedCriteria, culturalProfiles);

    if (!keywordSearch.trim()) {
      return scored;
    }

    const q = keywordSearch.trim().toLowerCase();
    const filterByKeyword = (list: ScoredPlantMatch[]) => {
      return list.filter(m => {
        const str = `${m.plant.name} ${m.plant.botanicalName || ''} ${m.plant.itemNo || ''} ${m.plant.category || ''} ${m.profile.positives} ${m.profile.flowerColor}`.toLowerCase();
        return str.includes(q);
      });
    };

    return {
      bestMatches: filterByKeyword(scored.bestMatches),
      closeMatches: filterByKeyword(scored.closeMatches)
    };
  }, [hasExecutedSearch, activeSearchedCriteria, inventory, culturalProfiles, keywordSearch]);

  const getItemStatus = (item: PlantItem): 'critical' | 'warning' | 'healthy' => {
    if (item.stock <= critThreshold) return 'critical';
    if (item.stock <= warnThreshold) return 'warning';
    return 'healthy';
  };


  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-3 sm:pt-6 pb-28 sm:pb-40 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto overscroll-y-contain"
      onClick={onClose}
    >
      <div 
        className="bg-[#f9faf6] w-full max-w-5xl max-h-[85vh] sm:max-h-[90vh] my-auto rounded-3xl shadow-2xl border border-[#c1c8c2] flex flex-col overflow-hidden text-[#1a1c1a] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#012d1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#a0f4c8]/40 flex items-center gap-3 animate-fade-in max-w-md w-[90%]">
            <CheckCircle2 className="w-5 h-5 text-[#a0f4c8] shrink-0" />
            <span className="flex-1 text-xs font-bold text-[#f3f4f0]">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-white/60 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <header className="bg-[#012d1d] text-white px-5 py-4 border-b border-[#0e6c4a]/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a0f4c8]/20 flex items-center justify-center text-[#a0f4c8] border border-[#a0f4c8]/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Customer Plant Matcher
                </h2>
                <span className="bg-[#a0f4c8]/20 text-[#a0f4c8] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-[#a0f4c8]/30">
                  Counterpoint Cultural Engine
                </span>
              </div>
              <p className="text-xs text-white/70">
                Match plant height, foliage, bloom color, fall color, sun, soil & deer resistance in the yard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCriteriaCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="bg-white/10 hover:bg-white/20 text-[#a0f4c8] text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-[#a0f4c8]/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset All</span>
                <span className="bg-[#a0f4c8] text-[#012d1d] px-1.5 py-0.2 rounded-full text-[10px]">
                  {activeCriteriaCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close matcher"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Search & In-Stock Quick Bar */}
        <div className="bg-[#f3f4f0] px-4 py-2.5 border-b border-[#c1c8c2]/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973] pointer-events-none" />
            <input
              type="text"
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              placeholder="Refine search by plant name, botanical, or cultivar..."
              className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-8 py-1.5 text-xs font-medium text-[#1a1c1a] placeholder:text-[#717973] focus:outline-none focus:border-[#012d1d]"
            />
            {keywordSearch && (
              <button
                type="button"
                onClick={() => setKeywordSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* In-Stock Toggle */}
            <button
              type="button"
              onClick={handleToggleInStock}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                inStockOnly
                  ? 'bg-[#0e6c4a] text-white border-[#0e6c4a] shadow-2xs'
                  : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-[#e7e9e5]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-[#a0f4c8]' : 'bg-[#717973]'}`} />
              <span>In-Stock Only (Qty ≥ 1)</span>
            </button>

            {/* On-Sale Toggle */}
            <button
              type="button"
              onClick={() => handleToggleOnSale()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                onSaleOnly
                  ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                  : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-rose-50 hover:border-rose-300'
              }`}
              title="Show only plants currently on sale / discounted"
            >
              <Flame className={`w-3.5 h-3.5 ${onSaleOnly ? 'text-amber-300 fill-amber-300' : 'text-rose-600'}`} />
              <span>On Sale</span>
              {totalOnSaleCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  onSaleOnly ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                }`}>
                  {totalOnSaleCount}
                </span>
              )}
            </button>

            {/* Toggle Filter Panel visibility */}
            <button
              type="button"
              onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
              className="text-xs font-bold text-[#012d1d] hover:bg-[#e2e3df] px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{isFilterPanelExpanded ? 'Hide Filters' : 'Show Filters'}</span>
              {isFilterPanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Attribute Filter Selector Section */}
        {isFilterPanelExpanded && (
          <div className="bg-white px-4 py-3 border-b border-[#c1c8c2]/50 overflow-y-auto max-h-[38vh] flex flex-col gap-3 shrink-0 shadow-2xs">
            {/* 1. Mature Height */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d] flex items-center gap-1">
                <span>1. Mature Height</span>
                {heightFilter && <span className="text-[#0e6c4a] font-bold">· Selected</span>}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Any Height', val: undefined },
                  { label: '🌿 Groundcover (< 1 ft / Spreading)', val: 'groundcover' as const },
                  { label: 'Under 3 ft (Border / Low)', val: 'under_3ft' as const },
                  { label: '3–6 ft (Foundation / Low Hedge)', val: '3_to_6ft' as const },
                  { label: '6–12 ft (Medium / Privacy Screen)', val: '6_to_12ft' as const },
                  { label: '12–25 ft (Small / Flowering Tree)', val: '12_to_25ft' as const },
                  { label: 'Over 25 ft (Shade Tree / Conifer)', val: 'over_25ft' as const }
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setHeightFilter(opt.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      heightFilter === opt.val
                        ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                        : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Foliage Type & Plant Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[#e2e3df]">
              {/* Foliage Type */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  2. Foliage Type
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Foliage', val: undefined },
                    { label: '🌲 Evergreen', val: 'evergreen' as const },
                    { label: '🍂 Deciduous', val: 'deciduous' as const }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setFoliageFilter(opt.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        foliageFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plant Type */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  3. Plant Category
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Category', val: undefined },
                    { label: 'Shrub', val: 'Shrub' as const },
                    { label: 'Shade Tree', val: 'Shade Tree' as const },
                    { label: 'Flowering Tree', val: 'Ornamental Tree' as const },
                    { label: 'Conifer', val: 'Conifer' as const },
                    { label: 'Perennial', val: 'Perennial' as const },
                    { label: 'Grass', val: 'Grass' as const },
                    { label: 'Groundcover', val: 'Groundcover' as const },
                    { label: 'Vine', val: 'Vine' as const }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setCategoryFilter(opt.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        categoryFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Flower Color & Fall Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[#e2e3df]">
              {/* Flower Color */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  4. Flower / Bloom Color
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Flower', val: undefined },
                    { label: '⚪ White', val: 'White' },
                    { label: '🌸 Pink', val: 'Pink' },
                    { label: '🔴 Red', val: 'Red' },
                    { label: '🟣 Purple / Lavender', val: 'Purple' },
                    { label: '🟡 Yellow / Gold', val: 'Yellow' },
                    { label: '🔵 Blue', val: 'Blue' },
                    { label: '🟠 Orange / Peach', val: 'Orange' },
                    { label: 'None / Inconspicuous', val: 'None' }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setFlowerColorFilter(opt.val)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        flowerColorFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fall Color */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  5. Fall Foliage Color
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Fall Color', val: undefined },
                    { label: '🍁 Red / Scarlet', val: 'Red' },
                    { label: '🎃 Orange / Apricot', val: 'Orange' },
                    { label: '🍂 Yellow / Gold', val: 'Yellow' },
                    { label: '🍇 Purple / Bronze', val: 'Purple' },
                    { label: '🌲 Evergreen (Stays Green)', val: 'None' }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setFallColorFilter(opt.val)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        fallColorFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Sun, Soil Moisture, Deer Resistance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-[#e2e3df]">
              {/* Sun Exposure */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  6. Sun Exposure
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Light', val: undefined },
                    { label: '☀️ Full Sun', val: 'Full Sun' as const },
                    { label: '⛅ Partial Sun', val: 'Partial Sun' as const },
                    { label: '☁️ Full Shade', val: 'Full Shade' as const }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSunFilter(opt.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        sunFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soil Moisture */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  7. Soil Moisture
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Soil', val: undefined },
                    { label: 'Dry / Drought', val: 'Dry / Drought Tolerant' as const },
                    { label: 'Moist Well-Drained', val: 'Moist, Well-Drained' as const },
                    { label: 'Wet / Boggy', val: 'Wet / Poor Drainage' as const }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSoilFilter(opt.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        soilFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deer Resistance */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d]">
                  8. Deer Resistance
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Rating', val: undefined },
                    { label: '🛡️ High (Deer Resistant)', val: 'High' as const },
                    { label: 'Moderate', val: 'Moderate' as const },
                    { label: 'Low (Prone to Browse)', val: 'Low' as const }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDeerFilter(opt.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        deerFilter === opt.val
                          ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                          : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 9. Special Pricing / Promotions */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#e2e3df]">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#012d1d] flex items-center gap-1.5">
                <span>9. Pricing / Promotions</span>
                {onSaleOnly && <span className="text-rose-700 font-bold">· On Sale Active</span>}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleOnSale(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    !onSaleOnly
                      ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                      : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2]/70 hover:bg-[#e7e9e5]'
                  }`}
                >
                  All Inventory Prices
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOnSale(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    onSaleOnly
                      ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                      : 'bg-[#f3f4f0] text-rose-800 border-[#c1c8c2]/70 hover:bg-rose-50'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${onSaleOnly ? 'text-amber-300 fill-amber-300' : 'text-rose-600'}`} />
                  <span>🔥 On Sale Plants Only</span>
                  {totalOnSaleCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      onSaleOnly ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {totalOnSaleCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Action Bar */}
        <div className="bg-[#eef2ec] px-4 sm:px-6 py-2.5 border-b border-[#c1c8c2] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleStartSearch}
              className="bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>
                {hasExecutedSearch ? 'Update Search Results' : 'Find Matching Plants'}
                {activeCriteriaCount > 0 ? ` (${activeCriteriaCount} option${activeCriteriaCount > 1 ? 's' : ''} selected)` : ''}
              </span>
            </button>

            {activeCriteriaCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-[#525a55] hover:text-[#012d1d] hover:bg-[#d9ded8] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Clear Selections
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#525a55]">
            {hasExecutedSearch ? (
              <span className="font-bold text-[#012d1d]">
                Showing matches for {activeCriteriaCount > 0 ? `${activeCriteriaCount} active attribute(s)` : 'inventory'}
                {activeSearchedCriteria?.onSaleOnly ? ' · On Sale Only' : ''}
              </span>
            ) : (
              <span className="italic">
                {activeCriteriaCount === 0
                  ? 'Select customer preferences above, then tap "Find Matching Plants"'
                  : 'Ready! Tap "Find Matching Plants" to load matches'}
              </span>
            )}
          </div>
        </div>

        {/* Results Counter Bar (Visible after search is run) */}
        {hasExecutedSearch && (
          <div className="bg-[#f3f4f0] px-5 py-2.5 border-b border-[#c1c8c2]/60 flex items-center justify-between text-xs font-bold text-[#012d1d] shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span><strong>{bestMatches.length}</strong> Best Match{bestMatches.length === 1 ? '' : 'es'} (100%)</span>
              </span>
              {closeMatches.length > 0 && (
                <span className="flex items-center gap-1.5 text-[#414844]">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span><strong>{closeMatches.length}</strong> Close Match{closeMatches.length === 1 ? '' : 'es'}</span>
                </span>
              )}
              {activeSearchedCriteria?.onSaleOnly && (
                <span className="bg-rose-100 text-rose-800 text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-300">
                  <Flame className="w-3 h-3 fill-rose-600 text-rose-600" />
                  <span>On Sale Only</span>
                </span>
              )}
            </div>

            <span className="text-[11px] text-[#717973] font-normal">
              {culturalProfiles.length > 0 ? `${culturalProfiles.length} Counterpoint profiles indexed` : 'Loading profiles...'}
            </span>
          </div>
        )}

        {/* Scrollable Results Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-28 sm:pb-36 flex flex-col gap-6 bg-[#f9faf6]">
          {isLoadingProfiles && (
            <div className="flex flex-col items-center justify-center p-12 text-[#717973] gap-3">
              <Sparkles className="w-8 h-8 text-[#0e6c4a] animate-spin" />
              <p className="text-sm font-semibold">Indexing Counterpoint plant cultural database...</p>
            </div>
          )}

          {/* Initial State: Waiting for user to select options & click search */}
          {!isLoadingProfiles && !hasExecutedSearch && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#c1c8c2]/60 text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto my-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shadow-md">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#012d1d]">Find Plants by Customer Preferences</h3>
                <p className="text-xs sm:text-sm text-[#525a55] mt-1.5 leading-relaxed">
                  Select what the customer is asking for above: <strong>Groundcover (&lt; 1 ft)</strong>, shrubs or trees, evergreen or deciduous foliage, bloom or fall color, sun exposure, or <strong>On Sale</strong> promotions. Matches best fitting the requested attributes will be shown first, followed by alphabetical order.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartSearch}
                className="mt-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Find Matching Plants {activeCriteriaCount > 0 ? `(${activeCriteriaCount} Selected)` : ''}</span>
              </button>
            </div>
          )}

          {!isLoadingProfiles && hasExecutedSearch && bestMatches.length === 0 && closeMatches.length === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-[#c1c8c2]/50 text-center flex flex-col items-center justify-center gap-3 max-w-md mx-auto my-6">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f0] flex items-center justify-center text-[#717973]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#012d1d]">No Matching Plants Found</h3>
              <p className="text-xs text-[#525a55]">
                No inventory plants match all selected criteria and in-stock conditions. Try broadening your criteria or toggling off "In-Stock Only".
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 bg-[#012d1d] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0e6c4a] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* SECTION 1: BEST MATCHES (100% Score) */}
          {bestMatches.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#0e6c4a]/30">
                <div className="flex items-center gap-2">
                  <span className="bg-[#0e6c4a] text-white text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#a0f4c8]" />
                    <span>Best Matches ({bestMatches.length})</span>
                  </span>
                  <span className="text-xs text-[#525a55]">
                    Satisfies 100% of customer criteria
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {bestMatches.map((match, idx) => (
                  <PlantResultCard
                    key={`best-${match.plant.id}-${idx}`}
                    match={match}
                    currentYear={currentYear}
                    getItemStatus={getItemStatus}
                    expandedNotesId={expandedNotesId}
                    setExpandedNotesId={setExpandedNotesId}
                    onOpenGpsModal={() => setGpsModalPlant(match.plant)}
                    onOpenMapModal={() => setMapModalPlant(match.plant)}
                    onAddToCart={() => {
                      if (onAddToCart) {
                        onAddToCart(match.plant);
                        showToast(`Added ${match.plant.name} to order cart`);
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 2: CLOSE MATCHES (50% - 99% Score) */}
          {closeMatches.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-amber-300">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    <span>Close Matches ({closeMatches.length})</span>
                  </span>
                  <span className="text-xs text-[#525a55]">
                    Ranked by similarity (green indicates matching traits)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {closeMatches.map((match, idx) => (
                  <PlantResultCard
                    key={`close-${match.plant.id}-${idx}`}
                    match={match}
                    currentYear={currentYear}
                    getItemStatus={getItemStatus}
                    expandedNotesId={expandedNotesId}
                    setExpandedNotesId={setExpandedNotesId}
                    onOpenGpsModal={() => setGpsModalPlant(match.plant)}
                    onOpenMapModal={() => setMapModalPlant(match.plant)}
                    onAddToCart={() => {
                      if (onAddToCart) {
                        onAddToCart(match.plant);
                        showToast(`Added ${match.plant.name} to order cart`);
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="bg-white px-5 py-3 border-t border-[#c1c8c2] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#525a55]">
            Found <strong>{bestMatches.length + closeMatches.length}</strong> varieties matching your nursery criteria
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#012d1d] hover:bg-[#0e6c4a] text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </footer>
      </div>

      {/* Satellite Aerial Yard GPS Map Modal */}
      {mapModalPlant && (
        <PlantMapModal
          isOpen={!!mapModalPlant}
          onClose={() => setMapModalPlant(null)}
          selectedItem={{ plant: mapModalPlant, quantity: 1 }}
          latitude={mapModalPlant.gpsLocation?.latitude}
          longitude={mapModalPlant.gpsLocation?.longitude}
          plantName={mapModalPlant.name}
          locationNotes={mapModalPlant.holdingLocation}
        />
      )}

      {/* Yard GPS History Modal */}
      {gpsModalPlant && (
        <PlantGpsHistoryModal
          plant={gpsModalPlant}
          isOpen={!!gpsModalPlant}
          onClose={() => setGpsModalPlant(null)}
          onOpenMap={(plant) => {
            setGpsModalPlant(null);
            setMapModalPlant(plant);
          }}
        />
      )}
    </div>
  );
};

interface PlantResultCardProps {
  match: ScoredPlantMatch;
  currentYear: number;
  getItemStatus: (item: PlantItem) => 'critical' | 'warning' | 'healthy';
  expandedNotesId: string | null;
  setExpandedNotesId: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenGpsModal: () => void;
  onOpenMapModal: () => void;
  onAddToCart: () => void;
}

const PlantResultCard: React.FC<PlantResultCardProps> = ({
  match,
  currentYear,
  getItemStatus,
  expandedNotesId,
  setExpandedNotesId,
  onOpenGpsModal,
  onOpenMapModal,
  onAddToCart
}) => {
  const { plant, profile, score, isBestMatch, matchDetails } = match;

  const currentStatus = getItemStatus(plant);
  const statusBadge = 
    currentStatus === 'critical'
      ? { label: 'CRITICAL', bg: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/30' }
      : currentStatus === 'warning'
      ? { label: 'LOW STOCK', bg: 'bg-[#fef9c3] text-[#854d0e] border-[#ca8a04]/30' }
      : { label: 'IN STOCK', bg: 'bg-[#a0f4c8] text-[#0e6c4a] border-[#0e6c4a]/30' };

  const saleSavings = getPlantSaleSavings(plant);
  const gpsYearStatus = getPlantGpsYearStatus(plant, currentYear);
  const isNotesExpanded = expandedNotesId === plant.id;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col gap-3 shadow-2xs ${
        isBestMatch
          ? 'bg-white border-[#0e6c4a]/60 hover:border-[#012d1d]'
          : 'bg-[#fcfdfa] border-[#c1c8c2]/80 hover:border-[#012d1d]'
      }`}
    >
      {/* Top Header Row with Match Score & Stock Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={plant.image || DEFAULT_PLANT_IMAGE}
              alt={plant.name}
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#c1c8c2]/50 shadow-2xs mt-0.5"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
            />
            {saleSavings && (
              <div className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-xs animate-bounce-subtle">
                <Flame className="w-3 h-3 text-amber-300" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Match Score Badge */}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs ${
                isBestMatch 
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {isBestMatch ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Sparkles className="w-3 h-3 text-amber-600" />}
                <span>{score}% Match</span>
              </span>

              {plant.itemNo && (
                <span className="bg-[#012d1d] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                  #{plant.itemNo}
                </span>
              )}

              <h3 className="font-bold text-sm sm:text-base text-[#1a1c1a] truncate">{plant.name}</h3>

              {plant.size && (
                <span className="bg-[#461702] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {plant.size}
                </span>
              )}

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
                {statusBadge.label} ({plant.stock} on hand)
              </span>

              {saleSavings && (
                <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                  <Flame className="w-3 h-3 text-amber-300" />
                  <span>SALE {saleSavings.savingsPercent}% OFF</span>
                </span>
              )}
            </div>

            {plant.botanicalName && plant.botanicalName !== plant.name && (
              <p className="text-xs italic text-[#414844] mt-0.5">
                {plant.botanicalName}
              </p>
            )}

            {/* Price & Location Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#414844]">
              {plant.holdingLocation && (
                <span className="flex items-center gap-1 font-semibold text-[#0e6c4a] bg-[#a0f4c8]/30 px-1.5 py-0.5 rounded">
                  <MapPin className="w-3 h-3 text-[#0e6c4a]" />
                  Loc: {plant.holdingLocation}
                </span>
              )}

              {/* Price display */}
              {saleSavings ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  <span className="line-through text-[#717973] text-xs font-semibold">
                    ${saleSavings.regularPrice.toFixed(2)}
                  </span>
                  <span className="font-black text-rose-700 text-sm">
                    ${saleSavings.salePrice.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-[#012d1d] text-sm">
                  ${plant.price.toFixed(2)} <span className="text-[10px] font-normal text-[#717973]">(Retail)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Add to Order & GPS */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-[#e2e3df] flex-wrap">
          {/* Yard GPS Map Button */}
          <button
            type="button"
            onClick={onOpenGpsModal}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
              gpsYearStatus.isTaggedThisYear
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                : gpsYearStatus.hasAnyGps
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-[#012d1d] border-[#c1c8c2] hover:bg-[#f3f4f0]'
            }`}
            title="View GPS history and satellite map"
          >
            <MapPin className={`w-3.5 h-3.5 ${gpsYearStatus.isTaggedThisYear ? 'text-emerald-700' : 'text-[#0e6c4a]'}`} />
            <span>GPS</span>
            {gpsYearStatus.isTaggedThisYear ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <span className="text-[10px] text-[#717973]">({gpsYearStatus.totalCount})</span>
            )}
          </button>

          {/* Add to Order Button */}
          <button
            type="button"
            onClick={onAddToCart}
            className="bg-[#461702] hover:bg-[#622c13] active:scale-[0.98] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Order</span>
          </button>
        </div>
      </div>

      {/* Cultural Attributes Badges Strip */}
      <div className="bg-[#f3f4f0] p-2.5 rounded-xl border border-[#c1c8c2]/50 flex flex-wrap items-center gap-1.5 text-[11px]">
        {/* Height */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.height.selected 
            ? (matchDetails.height.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <span>📏 Height: {profile.heightRange}</span>
        </span>

        {/* Foliage */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.foliage.selected 
            ? (matchDetails.foliage.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <span>{profile.foliageType === 'evergreen' ? '🌲 Evergreen' : profile.foliageType === 'semi-evergreen' ? '🌿 Semi-Evergreen' : '🍂 Deciduous'}</span>
        </span>

        {/* Flower / Bloom Color */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.flowerColor.selected 
            ? (matchDetails.flowerColor.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <Flower2 className="w-3 h-3 text-[#0e6c4a]" />
          <span>Bloom: {profile.flowerColor || 'Inconspicuous'}</span>
        </span>

        {/* Fall Color */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.fallColor.selected 
            ? (matchDetails.fallColor.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <span>🍁 Fall: {profile.fallColors.join('/')}</span>
        </span>

        {/* Sun */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.sun.selected 
            ? (matchDetails.sun.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <Sun className="w-3 h-3 text-amber-500" />
          <span>{profile.sunRequirements}</span>
        </span>

        {/* Deer Resistance */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.deer.selected 
            ? (matchDetails.deer.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : profile.deerResistance === 'High' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <ShieldCheck className="w-3 h-3 text-[#0e6c4a]" />
          <span>Deer: {profile.deerResistance}</span>
        </span>

        {/* Soil Moisture */}
        <span className={`px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
          matchDetails.soil.selected 
            ? (matchDetails.soil.matched ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-red-50 text-red-800 border-red-200 line-through')
            : 'bg-white text-[#414844] border-[#c1c8c2]/60'
        }`}>
          <span>💧 Soil: {profile.soilMoistureCategory}</span>
        </span>

        {/* Category */}
        <span className="px-2 py-0.5 rounded-md font-medium bg-[#e2e3df] text-[#525a55]">
          {profile.categoryType}
        </span>
      </div>

      {/* Cultural Notes & Positives Accordion */}
      {(profile.positives || profile.negatives) && (
        <div className="text-xs">
          <button
            type="button"
            onClick={() => setExpandedNotesId(isNotesExpanded ? null : plant.id)}
            className="text-[11px] font-bold text-[#0e6c4a] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isNotesExpanded ? 'Hide Cultural Advice' : 'View Cultural Advice & Highlights'}</span>
            {isNotesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isNotesExpanded && (
            <div className="mt-2 p-2.5 bg-white rounded-xl border border-[#c1c8c2]/60 flex flex-col gap-1.5 text-[11px] animate-fade-in">
              {profile.positives && (
                <div className="flex items-start gap-1.5 text-emerald-900">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Positives:</strong> {profile.positives}</span>
                </div>
              )}
              {profile.negatives && (
                <div className="flex items-start gap-1.5 text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Considerations:</strong> {profile.negatives}</span>
                </div>
              )}
              {profile.fruitingInfo && (
                <div className="flex items-start gap-1.5 text-[#414844]">
                  <Info className="w-3.5 h-3.5 text-[#717973] shrink-0 mt-0.5" />
                  <span><strong>Fruiting & Wildlife:</strong> {profile.fruitingInfo}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
