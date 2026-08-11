import React, { useState } from 'react';
import { ScreenType, PlantItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Minus, 
  Barcode, 
  Filter, 
  Package, 
  RefreshCw,
  Sun,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface InventoryScreenProps {
  onNavigate: (screen: ScreenType) => void;
  inventory: PlantItem[];
  onUpdateStock: (id: string, newStock: number) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  onNavigate,
  inventory,
  onUpdateStock
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');

  const criticalCount = inventory.filter(i => i.status === 'critical').length;
  const warningCount = inventory.filter(i => i.status === 'warning').length;
  const healthyCount = inventory.filter(i => i.status === 'healthy').length;

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm) ||
      item.lightRequirement.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && item.status === statusFilter;
  });

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'critical' 
              ? 'bg-[#ffdad6] border-[#ba1a1a] shadow-xs' 
              : 'bg-[#f3f4f0] border-[#c1c8c2] hover:bg-[#e7e9e5]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ba1a1a]">Critical</span>
            <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
          </div>
          <span className="block text-2xl font-bold text-[#ba1a1a]">{criticalCount}</span>
          <span className="text-[10px] text-[#414844] font-medium">Reorder needed</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'warning' 
              ? 'bg-[#fef9c3] border-[#ca8a04] shadow-xs' 
              : 'bg-[#f3f4f0] border-[#c1c8c2] hover:bg-[#e7e9e5]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#854d0e]">Low Stock</span>
            <AlertCircle className="w-4 h-4 text-[#ca8a04]" />
          </div>
          <span className="block text-2xl font-bold text-[#854d0e]">{warningCount}</span>
          <span className="text-[10px] text-[#414844] font-medium">Monitor levels</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'healthy' ? 'all' : 'healthy')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'healthy' 
              ? 'bg-[#a0f4c8] border-[#0e6c4a] shadow-xs' 
              : 'bg-[#f3f4f0] border-[#c1c8c2] hover:bg-[#e7e9e5]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e6c4a]">Healthy</span>
            <CheckCircle2 className="w-4 h-4 text-[#0e6c4a]" />
          </div>
          <span className="block text-2xl font-bold text-[#012d1d]">{healthyCount}</span>
          <span className="text-[10px] text-[#414844] font-medium">In stock</span>
        </button>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalCount > 0 && statusFilter === 'all' && (
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/40 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ba1a1a] text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#410002]">
                {criticalCount} Item{criticalCount > 1 ? 's' : ''} Require Immediate Restock
              </h3>
              <p className="text-xs text-[#521213] mt-0.5">
                Stock is at or near zero. Update quantities below or reorder via Data Management.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('critical')}
            className="bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            View Alerts
          </button>
        </div>
      )}

      {/* Inventory Search and Filter Section */}
      <section className="bg-white rounded-2xl p-5 border border-[#c1c8c2] flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#f3f4f0] pb-3">
          <div>
            <h2 className="font-bold text-lg text-[#012d1d] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0e6c4a]" />
              <span>Plant Stock & Alerts</span>
            </h2>
            <p className="text-xs text-[#414844] mt-0.5">
              Real-time plant stock levels, barcodes, and sunlight requirements.
            </p>
          </div>

          <button
            onClick={() => onNavigate('scan')}
            className="self-start sm:self-auto bg-[#461702] hover:bg-[#622c13] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Barcode className="w-4 h-4" />
            <span>Scan Barcode</span>
          </button>
        </div>

        {/* Search & Status Pills */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plant name, barcode, or light needs..."
              className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-[#012d1d] text-white'
                  : 'bg-[#f3f4f0] text-[#414844] hover:bg-[#e7e9e5]'
              }`}
            >
              All ({inventory.length})
            </button>
            <button
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'critical'
                  ? 'bg-[#ba1a1a] text-white'
                  : 'bg-[#f3f4f0] text-[#ba1a1a] hover:bg-[#ffdad6]'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'warning'
                  ? 'bg-[#ca8a04] text-white'
                  : 'bg-[#f3f4f0] text-[#854d0e] hover:bg-[#fef9c3]'
              }`}
            >
              Low ({warningCount})
            </button>
          </div>
        </div>

        {/* Plant List */}
        <div className="flex flex-col gap-3">
          {filteredInventory.length === 0 ? (
            <div className="p-8 text-center bg-[#f3f4f0] rounded-xl text-[#717973] border border-dashed border-[#c1c8c2]">
              <p className="text-xs font-medium">No plant stock matches your search filter.</p>
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className="mt-2 text-xs font-bold text-[#0e6c4a] hover:underline"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredInventory.map((item) => {
              const statusBadge = 
                item.status === 'critical'
                  ? { label: 'CRITICAL', bg: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/30' }
                  : item.status === 'warning'
                  ? { label: 'LOW STOCK', bg: 'bg-[#fef9c3] text-[#854d0e] border-[#ca8a04]/30' }
                  : { label: 'IN STOCK', bg: 'bg-[#a0f4c8] text-[#0e6c4a] border-[#0e6c4a]/30' };

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.status === 'critical' 
                      ? 'bg-[#fff5f5] border-[#ba1a1a]/40' 
                      : 'bg-[#f9faf6] border-[#c1c8c2]/80 hover:border-[#012d1d]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image || DEFAULT_PLANT_IMAGE}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#c1c8c2]/50 shadow-2xs"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm text-[#1a1c1a] truncate">{item.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#414844]">
                        <span className="flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-[#0e6c4a]" />
                          {item.lightRequirement}
                        </span>
                        <span className="font-mono text-[#717973]">#{item.barcode}</span>
                        <span className="font-bold text-[#012d1d]">${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Level Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-[#e2e3df]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#414844] sm:hidden">Stock Count:</span>
                      <div className="flex items-center bg-white border border-[#c1c8c2] rounded-xl overflow-hidden shadow-2xs">
                        <button
                          onClick={() => onUpdateStock(item.id, Math.max(0, item.stock - 1))}
                          className="p-2 text-[#414844] hover:bg-[#f3f4f0] active:scale-95 transition-all"
                          title="Decrease Stock"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 font-bold text-sm font-mono text-[#012d1d] min-w-[2.5rem] text-center">
                          {String(item.stock).padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => onUpdateStock(item.id, item.stock + 1)}
                          className="p-2 text-[#414844] hover:bg-[#f3f4f0] active:scale-95 transition-all"
                          title="Increase Stock"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
