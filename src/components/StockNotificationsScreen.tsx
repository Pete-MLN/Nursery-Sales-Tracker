import React, { useState } from 'react';
import { ScreenType, PlantItem, StockAlertSettings } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Sliders, 
  ClipboardList, 
  ArrowLeft, 
  Mail, 
  Copy, 
  Check, 
  MapPin, 
  Sparkles,
  RefreshCw,
  Barcode
} from 'lucide-react';

interface StockNotificationsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  inventory: PlantItem[];
  onUpdateStock: (id: string, newStock: number) => void;
  stockAlertSettings: StockAlertSettings;
  onUpdateStockAlertSettings: (newSettings: StockAlertSettings) => void;
  onUpdatePlant?: (updatedPlant: PlantItem) => void;
}

export const StockNotificationsScreen: React.FC<StockNotificationsScreenProps> = ({
  onNavigate,
  inventory,
  onUpdateStock,
  stockAlertSettings,
  onUpdateStockAlertSettings
}) => {
  const [filter, setFilter] = useState<'all_alerts' | 'critical' | 'warning' | 'healthy' | 'all'>('all_alerts');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const critThreshold = stockAlertSettings?.criticalThreshold ?? 0;
  const warnThreshold = stockAlertSettings?.warningThreshold ?? 5;

  const getItemStatus = (item: PlantItem): 'critical' | 'warning' | 'healthy' => {
    if (item.stock <= critThreshold) return 'critical';
    if (item.stock <= warnThreshold) return 'warning';
    return 'healthy';
  };

  const criticalItems = inventory.filter(i => getItemStatus(i) === 'critical');
  const warningItems = inventory.filter(i => getItemStatus(i) === 'warning');
  const healthyItems = inventory.filter(i => getItemStatus(i) === 'healthy');
  const allAlertItems = inventory.filter(i => getItemStatus(i) === 'critical' || getItemStatus(i) === 'warning');

  const filteredItems = inventory.filter(item => {
    const status = getItemStatus(item);

    if (filter === 'all_alerts' && status === 'healthy') return false;
    if (filter === 'critical' && status !== 'critical') return false;
    if (filter === 'warning' && status !== 'warning') return false;
    if (filter === 'healthy' && status !== 'healthy') return false;

    if (!searchTerm.trim()) return true;

    const terms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const searchable = `${item.name} ${item.botanicalName || ''} ${item.commonName || ''} ${item.itemNo || ''} ${item.size || ''} ${item.category || ''} ${item.holdingLocation || ''}`.toLowerCase();
    return terms.every(t => searchable.includes(t));
  });

  const triggerSavedFeedback = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleUpdateCritical = (val: number) => {
    const safeVal = Math.max(0, val);
    const updated: StockAlertSettings = {
      ...stockAlertSettings,
      criticalThreshold: safeVal,
      warningThreshold: Math.max(safeVal + 1, stockAlertSettings.warningThreshold)
    };
    onUpdateStockAlertSettings(updated);
    triggerSavedFeedback();
  };

  const handleUpdateWarning = (val: number) => {
    const safeVal = Math.max(critThreshold + 1, val);
    const updated: StockAlertSettings = {
      ...stockAlertSettings,
      warningThreshold: safeVal
    };
    onUpdateStockAlertSettings(updated);
    triggerSavedFeedback();
  };

  // Generate itemized text of restock items for copying
  const handleCopyReorderList = () => {
    const itemsToExport = allAlertItems;
    if (itemsToExport.length === 0) return;

    let text = `Maple Lane Nursery - Stock Restock & Reorder List (${new Date().toLocaleDateString()})\n\n`;
    text += `CRITICAL RESTOCK (≤ ${critThreshold} units) [${criticalItems.length} items]:\n`;
    criticalItems.forEach(i => {
      text += `• [Item #${i.itemNo || 'N/A'}] ${i.name} (${i.size || 'Standard'}) - Current Stock: ${i.stock} | Loc: ${i.holdingLocation || 'Unassigned'}\n`;
    });

    text += `\nLOW STOCK WARNINGS (≤ ${warnThreshold} units) [${warningItems.length} items]:\n`;
    warningItems.forEach(i => {
      text += `• [Item #${i.itemNo || 'N/A'}] ${i.name} (${i.size || 'Standard'}) - Current Stock: ${i.stock} | Loc: ${i.holdingLocation || 'Unassigned'}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Compose email link for reorder list
  const getEmailReorderMailto = () => {
    const subject = encodeURIComponent(`Maple Lane Nursery - Plant Restock Alert List (${allAlertItems.length} items)`);
    let body = `Maple Lane Nursery Staff Restock Report - ${new Date().toLocaleDateString()}\n\n`;
    body += `Total Alert Items: ${allAlertItems.length}\n`;
    body += `Critical Items: ${criticalItems.length}\n`;
    body += `Low Stock Items: ${warningItems.length}\n\n`;

    body += `--- CRITICAL (Immediate Reorder) ---\n`;
    criticalItems.forEach(i => {
      body += `• #${i.itemNo || 'N/A'} - ${i.name} (${i.size || 'Std'}) - Qty Avail: ${i.stock} (Bay: ${i.holdingLocation || 'Yard'})\n`;
    });

    body += `\n--- LOW STOCK WARNINGS ---\n`;
    warningItems.forEach(i => {
      body += `• #${i.itemNo || 'N/A'} - ${i.name} (${i.size || 'Std'}) - Qty Avail: ${i.stock} (Bay: ${i.holdingLocation || 'Yard'})\n`;
    });

    return `mailto:pete@maplelanenursery.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-4xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-br from-[#012d1d] to-[#0a4d33] text-white p-5 rounded-2xl shadow-md border border-[#19724f]/40 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#a0f4c8] uppercase tracking-wider bg-[#a0f4c8]/20 px-2.5 py-0.5 rounded-full border border-[#a0f4c8]/30">
              Live Alerts Engine
            </span>
            <span className="text-xs text-[#c1c8c2]">Maple Lane Nursery</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-[#ff8077]" />
            <span>Stock Notifications & Alerts</span>
          </h1>
          <p className="text-xs text-[#a3c9b7] mt-1 max-w-xl">
            Dedicated monitoring center for critical restock warnings, depleted nursery inventory, and customizable reorder thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showSettings 
                ? 'bg-[#a0f4c8] text-[#002113] border-[#a0f4c8] shadow-xs' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{showSettings ? 'Hide Thresholds' : 'Alert Thresholds'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#a0f4c8] hover:bg-[#83ebb4] text-[#002113] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Package className="w-4 h-4 text-[#012d1d]" />
            <span>Full Inventory</span>
          </button>
        </div>
      </div>

      {/* Thresholds Settings Drawer / Accordion */}
      {showSettings && (
        <div className="bg-white p-5 rounded-2xl border border-[#c1c8c2] shadow-sm flex flex-col gap-5 animate-fade-in">
          <div className="flex items-start justify-between gap-3 border-b border-[#f3f4f0] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#012d1d]">Stock Notification Thresholds</h3>
                <p className="text-xs text-[#414844]">Configure quantity levels that trigger automatic nursery restock warnings</p>
              </div>
            </div>
            {savedFeedback ? (
              <span className="bg-[#a0f4c8] text-[#002113] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#0e6c4a]" />
                Saved
              </span>
            ) : (
              <span className="bg-[#e7e9e5] text-[#414844] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                Active Limits
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Critical Level */}
            <div className="bg-[#fff8f7] p-4 rounded-xl border border-[#ffdad6] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#ba1a1a] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                    Critical Restock Limit
                  </label>
                  <p className="text-xs text-[#717973] mt-0.5">
                    Stock ≤ this flags Critical (Red Alert)
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#c1c8c2]">
                  <button
                    type="button"
                    onClick={() => handleUpdateCritical(critThreshold - 1)}
                    className="w-7 h-7 rounded-lg bg-[#f3f4f0] hover:bg-[#e7e9e5] text-[#1a1c1a] font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm text-[#ba1a1a]">{critThreshold}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateCritical(critThreshold + 1)}
                    className="w-7 h-7 rounded-lg bg-[#f3f4f0] hover:bg-[#e7e9e5] text-[#1a1c1a] font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#717973]">Presets:</span>
                {[0, 2, 3, 5, 10].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleUpdateCritical(val)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      critThreshold === val
                        ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                        : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-[#e7e9e5]'
                    }`}
                  >
                    {val === 0 ? '0 (Out)' : `${val} units`}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning Level */}
            <div className="bg-[#fefce8] p-4 rounded-xl border border-[#fef08a] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#854d0e] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ca8a04]" />
                    Low Stock Warning Limit
                  </label>
                  <p className="text-xs text-[#717973] mt-0.5">
                    Stock ≤ this flags Warning (Yellow)
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#c1c8c2]">
                  <button
                    type="button"
                    onClick={() => handleUpdateWarning(warnThreshold - 1)}
                    className="w-7 h-7 rounded-lg bg-[#f3f4f0] hover:bg-[#e7e9e5] text-[#1a1c1a] font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm text-[#854d0e]">{warnThreshold}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateWarning(warnThreshold + 1)}
                    className="w-7 h-7 rounded-lg bg-[#f3f4f0] hover:bg-[#e7e9e5] text-[#1a1c1a] font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#717973]">Presets:</span>
                {[5, 10, 15, 20, 25].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleUpdateWarning(val)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      warnThreshold === val
                        ? 'bg-[#ca8a04] text-white border-[#ca8a04]'
                        : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-[#e7e9e5]'
                    }`}
                  >
                    {val} units
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* All Alerts */}
        <button
          type="button"
          onClick={() => setFilter('all_alerts')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'all_alerts'
              ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-md ring-2 ring-[#a0f4c8]'
              : 'bg-white text-[#1a1c1a] border-[#c1c8c2] hover:border-[#012d1d]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filter === 'all_alerts' ? 'text-[#a0f4c8]' : 'text-[#012d1d]'}`}>
              Total Alerts
            </span>
            <AlertTriangle className={`w-4 h-4 ${filter === 'all_alerts' ? 'text-[#a0f4c8]' : 'text-[#012d1d]'}`} />
          </div>
          <span className={`block text-2xl font-extrabold ${filter === 'all_alerts' ? 'text-white' : 'text-[#012d1d]'}`}>
            {allAlertItems.length}
          </span>
          <span className={`text-[11px] ${filter === 'all_alerts' ? 'text-[#a3c9b7]' : 'text-[#717973]'}`}>
            Items below threshold
          </span>
        </button>

        {/* Critical Card */}
        <button
          type="button"
          onClick={() => setFilter('critical')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'critical'
              ? 'bg-[#ba1a1a] text-white border-[#ba1a1a] shadow-md ring-2 ring-[#ffdad6]'
              : 'bg-[#fff5f5] text-[#ba1a1a] border-[#ffdad6] hover:bg-[#ffdad6]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filter === 'critical' ? 'text-white' : 'text-[#ba1a1a]'}`}>
              Critical
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="block text-2xl font-extrabold">{criticalItems.length}</span>
          <span className={`text-[11px] ${filter === 'critical' ? 'text-white/80' : 'text-[#410002]'}`}>
            Stock ≤ {critThreshold} (Urgent)
          </span>
        </button>

        {/* Low Stock Warning Card */}
        <button
          type="button"
          onClick={() => setFilter('warning')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'warning'
              ? 'bg-[#ca8a04] text-white border-[#ca8a04] shadow-md ring-2 ring-[#fef08a]'
              : 'bg-[#fefce8] text-[#854d0e] border-[#fef08a] hover:bg-[#fef9c3]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filter === 'warning' ? 'text-white' : 'text-[#854d0e]'}`}>
              Low Stock
            </span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="block text-2xl font-extrabold">{warningItems.length}</span>
          <span className={`text-[11px] ${filter === 'warning' ? 'text-white/80' : 'text-[#713f12]'}`}>
            Stock ≤ {warnThreshold} (Watch)
          </span>
        </button>

        {/* Healthy Card */}
        <button
          type="button"
          onClick={() => setFilter('healthy')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'healthy'
              ? 'bg-[#0e6c4a] text-white border-[#0e6c4a] shadow-md ring-2 ring-[#a0f4c8]'
              : 'bg-[#f0fdf4] text-[#0e6c4a] border-[#bbf7d0] hover:bg-[#dcfce7]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filter === 'healthy' ? 'text-white' : 'text-[#0e6c4a]'}`}>
              Healthy
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="block text-2xl font-extrabold">{healthyItems.length}</span>
          <span className={`text-[11px] ${filter === 'healthy' ? 'text-white/80' : 'text-[#14532d]'}`}>
            Stock &gt; {warnThreshold} (Ample)
          </span>
        </button>
      </div>

      {/* Action Bar: Reorder List Tools */}
      <div className="bg-white p-4 rounded-2xl border border-[#c1c8c2] shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#0e6c4a]" />
          <div>
            <h4 className="text-sm font-bold text-[#012d1d]">Reorder Dispatch & Export</h4>
            <p className="text-xs text-[#717973]">Quickly copy or email nursery restocking lists</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyReorderList}
            disabled={allAlertItems.length === 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              copied 
                ? 'bg-[#0e6c4a] text-white' 
                : 'bg-[#f3f4f0] hover:bg-[#e7e9e5] text-[#012d1d] border border-[#c1c8c2]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? <Check className="w-4 h-4 text-[#a0f4c8]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'List Copied!' : 'Copy Reorder List'}</span>
          </button>

          <a
            href={allAlertItems.length > 0 ? getEmailReorderMailto() : undefined}
            className={`px-3 py-2 rounded-xl text-xs font-bold bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
              allAlertItems.length === 0 ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email List to Office</span>
          </a>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#c1c8c2] shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search alert items by Botanical Name, Common Name, Item #, Size..."
              className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter('all_alerts')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === 'all_alerts'
                  ? 'bg-[#012d1d] text-[#a0f4c8]'
                  : 'bg-[#f3f4f0] text-[#414844] hover:bg-[#e7e9e5]'
              }`}
            >
              Alerts ({allAlertItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('critical')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === 'critical'
                  ? 'bg-[#ba1a1a] text-white'
                  : 'bg-[#f3f4f0] text-[#ba1a1a] hover:bg-[#ffdad6]'
              }`}
            >
              Critical ({criticalItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('warning')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === 'warning'
                  ? 'bg-[#ca8a04] text-white'
                  : 'bg-[#f3f4f0] text-[#854d0e] hover:bg-[#fef9c3]'
              }`}
            >
              Low Stock ({warningItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-[#0e6c4a] text-white'
                  : 'bg-[#f3f4f0] text-[#414844] hover:bg-[#e7e9e5]'
              }`}
            >
              All Plants ({inventory.length})
            </button>
          </div>
        </div>

        {/* Item Count Notice */}
        <div className="flex items-center justify-between text-xs text-[#717973] border-t border-[#f3f4f0] pt-3">
          <span>
            Showing <strong className="text-[#012d1d]">{filteredItems.length}</strong> {filter === 'all_alerts' ? 'alert' : filter} items
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" /> Critical ≤ {critThreshold}
            <span className="w-2 h-2 rounded-full bg-[#ca8a04] ml-2" /> Low Stock ≤ {warnThreshold}
          </span>
        </div>

        {/* Plant List */}
        <div className="flex flex-col gap-2.5 mt-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-[#f9faf6] rounded-xl border border-dashed border-[#c1c8c2] flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-[#0e6c4a]" />
              <h4 className="font-bold text-sm text-[#012d1d]">No Stock Alerts Found</h4>
              <p className="text-xs text-[#717973] max-w-sm">
                {searchTerm 
                  ? `No plants matching "${searchTerm}" found in this filter view.` 
                  : filter === 'all_alerts' || filter === 'critical'
                    ? 'All nursery plant varieties are currently above the configured restock thresholds.'
                    : 'No plants matching this status.'}
              </p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-xs font-bold text-[#0e6c4a] hover:underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredItems.map(item => {
              const status = getItemStatus(item);
              const isCrit = status === 'critical';
              const isWarn = status === 'warning';

              return (
                <div 
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCrit 
                      ? 'bg-[#fff8f7] border-[#ffdad6] hover:border-[#ba1a1a]/60' 
                      : isWarn
                        ? 'bg-[#fefce8] border-[#fef08a] hover:border-[#ca8a04]/60'
                        : 'bg-white border-[#c1c8c2] hover:border-[#012d1d]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <img 
                      src={item.image || DEFAULT_PLANT_IMAGE} 
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#c1c8c2] mt-0.5"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.itemNo && (
                          <span className="text-[10px] font-bold text-[#012d1d] bg-[#f3f4f0] px-1.5 py-0.5 rounded border border-[#c1c8c2]">
                            #{item.itemNo}
                          </span>
                        )}
                        {item.size && (
                          <span className="text-[10px] font-bold text-[#414844] bg-[#e7e9e5] px-1.5 py-0.5 rounded">
                            {item.size}
                          </span>
                        )}
                        {isCrit && (
                          <span className="text-[10px] font-extrabold text-white bg-[#ba1a1a] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            CRITICAL RESTOCK
                          </span>
                        )}
                        {isWarn && (
                          <span className="text-[10px] font-extrabold text-[#713f12] bg-[#fef08a] px-2 py-0.5 rounded-full border border-[#ca8a04]/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-[#ca8a04]" />
                            LOW STOCK
                          </span>
                        )}
                        {!isCrit && !isWarn && (
                          <span className="text-[10px] font-extrabold text-[#14532d] bg-[#bbf7d0] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#0e6c4a]" />
                            HEALTHY
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm text-[#012d1d] truncate mt-1">
                        {item.name}
                      </h3>
                      {item.botanicalName && item.botanicalName !== item.name && (
                        <p className="text-xs italic text-[#717973] truncate">
                          {item.botanicalName}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-xs text-[#414844] flex-wrap">
                        {item.holdingLocation && (
                          <span className="flex items-center gap-1 font-semibold text-[#0e6c4a]">
                            <MapPin className="w-3.5 h-3.5" />
                            {item.holdingLocation}
                          </span>
                        )}
                        <span>Retail: ${item.price?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Quantity Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
                    <div className="text-left sm:text-right">
                      <span className="block text-[10px] font-bold text-[#717973] uppercase tracking-wider">
                        Available Qty
                      </span>
                      <span className={`text-base font-extrabold ${
                        isCrit ? 'text-[#ba1a1a]' : isWarn ? 'text-[#ca8a04]' : 'text-[#012d1d]'
                      }`}>
                        {item.stock} in stock
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-[#f3f4f0] p-1 rounded-xl border border-[#c1c8c2]">
                      <button
                        type="button"
                        onClick={() => onUpdateStock(item.id, Math.max(0, item.stock - 1))}
                        disabled={item.stock <= 0}
                        title="Decrease stock"
                        className="w-8 h-8 rounded-lg bg-white border border-[#c1c8c2] hover:bg-[#e7e9e5] text-[#1a1c1a] font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-extrabold text-sm text-[#012d1d]">
                        {item.stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateStock(item.id, item.stock + 1)}
                        title="Increase stock"
                        className="w-8 h-8 rounded-lg bg-white border border-[#c1c8c2] hover:bg-[#e7e9e5] text-[#1a1c1a] font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
