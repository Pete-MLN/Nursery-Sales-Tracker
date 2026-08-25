import React, { useState } from 'react';
import { OrderCartItem, PlantItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  X, 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  Compass, 
  RefreshCw, 
  Tag, 
  Package, 
  Radio, 
  Maximize2, 
  Sparkles,
  Map as MapIcon,
  Crosshair,
  Building,
  Warehouse,
  Sun,
  Truck
} from 'lucide-react';

interface PlantMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: OrderCartItem | null;
  allItems?: OrderCartItem[];
  gpsLoggedMap?: Record<string, string>;
  onLogGPS?: (plantId: string) => void;
}

export const PlantMapModal: React.FC<PlantMapModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  allItems = [],
  gpsLoggedMap = {},
  onLogGPS
}) => {
  const [viewMode, setViewMode] = useState<'yard' | 'satellite' | 'all'>('yard');
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [activePinId, setActivePinId] = useState<string | null>(selectedItem?.plant.id || null);

  if (!isOpen || !selectedItem) return null;

  // Extract coordinates or compute fallback
  const rawGpsString = gpsLoggedMap[selectedItem.plant.id];
  let latitude = selectedItem.gpsLocation?.latitude || 43.1482;
  let longitude = selectedItem.gpsLocation?.longitude || -79.4623;

  if (rawGpsString) {
    const latMatch = rawGpsString.match(/([\d.-]+)°\s*N/i);
    const lngMatch = rawGpsString.match(/([\d.-]+)°\s*W/i);
    if (latMatch && latMatch[1]) latitude = parseFloat(latMatch[1]);
    if (lngMatch && lngMatch[1]) longitude = -parseFloat(lngMatch[1]);
  }

  const formattedCoords = `${latitude.toFixed(5)}° N, ${Math.abs(longitude).toFixed(5)}° W`;

  // Determine estimated nursery yard zone based on plant or coordinates
  const getPlantZone = (plant: PlantItem) => {
    const cat = (plant.category || '').toUpperCase();
    const name = (plant.name || '').toUpperCase();
    if (cat.includes('G_HOUSE') || name.includes('TROPICAL') || name.includes('FERN')) {
      return { zone: 'Greenhouse A (Tropicals)', bay: 'Bay 4 - Benches North', icon: Warehouse, color: 'bg-emerald-600', x: 28, y: 32 };
    }
    if (cat.includes('PERENNIAL') || name.includes('HOSTA') || name.includes('CONEFLOWER') || name.includes('LAVENDER')) {
      return { zone: 'Greenhouse B (Perennials)', bay: 'Bay 12 - Center Aisle', icon: Warehouse, color: 'bg-teal-600', x: 48, y: 36 };
    }
    if (cat.includes('MULCH') || name.includes('MULCH')) {
      return { zone: 'Bulk Materials Yard', bay: 'Bulk Bin #2 (Cedar / Dark Bark)', icon: Truck, color: 'bg-amber-800', x: 78, y: 72 };
    }
    if (cat.includes('STONE') || name.includes('STONE')) {
      return { zone: 'Bulk Materials Yard', bay: 'Bulk Bin #5 (River Rock & Gravel)', icon: Truck, color: 'bg-stone-600', x: 86, y: 72 };
    }
    if (cat.includes('TOP SOIL') || name.includes('SOIL')) {
      return { zone: 'Bulk Materials Yard', bay: 'Bulk Bin #1 (Screened Loam)', icon: Truck, color: 'bg-amber-950', x: 70, y: 72 };
    }
    if (cat.includes('TREE') || cat.includes('SHRUB') || name.includes('MAPLE') || name.includes('HYDRANGEA') || name.includes('BOXWOOD')) {
      return { zone: 'Outdoor Shade House 1', bay: 'Row 8 - B&B Tree Yard', icon: Sun, color: 'bg-green-700', x: 35, y: 65 };
    }
    return { zone: 'Holding Area B', bay: 'Staging Row 3', icon: Building, color: 'bg-[#0e6c4a]', x: 55, y: 50 };
  };

  const currentZone = getPlantZone(selectedItem.plant);

  const handleCopyCoordinates = () => {
    navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filter all items that have GPS logged
  const itemsWithGps = allItems.filter(item => !!gpsLoggedMap[item.plant.id] || !!item.gpsLocation);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#c1c8c2] flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#012d1d] text-white p-4 sm:p-5 flex justify-between items-center border-b border-[#0e6c4a]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#a0f4c8]/20 border border-[#a0f4c8]/30 flex items-center justify-center text-[#a0f4c8] shrink-0">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white truncate">
                  Plant Yard & GPS Map
                </h3>
                <span className="bg-[#a0f4c8] text-[#002113] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#0e6c4a] animate-pulse" />
                  GPS ACTIVE
                </span>
              </div>
              <p className="text-xs text-white/80 truncate">
                Maple Lane Nursery Yard Layout & Pinpoint Tracking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Close Map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          
          {/* Active Plant Info Card */}
          <div className="bg-[#f8f9f5] p-3.5 rounded-xl border border-[#c1c8c2] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={selectedItem.plant.image || DEFAULT_PLANT_IMAGE}
                alt={selectedItem.plant.name}
                className="w-12 h-12 rounded-lg object-cover bg-white border border-[#c1c8c2]/70 shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
              />
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm sm:text-base text-[#1a1c1a] truncate">
                  {selectedItem.plant.name}
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    #{selectedItem.plant.itemNo || selectedItem.plant.barcode || 'N/A'}
                  </span>
                  <span className="bg-[#e7e9e5] text-[#414844] text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Package className="w-2.5 h-2.5" />
                    {selectedItem.plant.size || 'Standard'}
                  </span>
                  <span className="text-xs text-[#717973] font-semibold">
                    Qty: {selectedItem.quantity}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Coordinate Pill */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyCoordinates}
                className="px-2.5 py-1.5 bg-white hover:bg-[#e7e9e5] border border-[#c1c8c2] rounded-lg text-xs font-bold text-[#012d1d] flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy GPS coordinates"
              >
                {copiedCoords ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#717973]" />
                    <span className="font-mono">{formattedCoords}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Map Canvas Container */}
          <div className="relative bg-[#1a2f23] rounded-2xl border-2 border-[#0e6c4a] overflow-hidden shadow-inner flex flex-col">
            {/* View Mode Bar */}
            <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
              <div className="flex items-center gap-1 bg-black/75 backdrop-blur-xs p-1 rounded-xl border border-white/10 pointer-events-auto shadow-md">
                <button
                  type="button"
                  onClick={() => setViewMode('yard')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'yard'
                      ? 'bg-[#0e6c4a] text-white shadow-2xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>Yard Schematic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('satellite')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'satellite'
                      ? 'bg-[#0e6c4a] text-white shadow-2xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Satellite View</span>
                </button>
                {allItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'all'
                        ? 'bg-[#0e6c4a] text-white shadow-2xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>All Plants ({allItems.length})</span>
                  </button>
                )}
              </div>

              <div className="bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[11px] font-mono text-[#a0f4c8] border border-white/10 flex items-center gap-1 shadow-md">
                <Crosshair className="w-3.5 h-3.5" />
                <span>±2.5m GPS Acc</span>
              </div>
            </div>

            {/* Visual SVG Map */}
            <div className="w-full h-72 sm:h-80 relative overflow-hidden flex items-center justify-center select-none">
              {viewMode === 'satellite' ? (
                /* Satellite Simulation Grid */
                <div className="absolute inset-0 bg-[#0d1a12] opacity-90 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(#1e3b2b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                  {/* Terrain texture / contours */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-emerald-950/40 border-b border-emerald-800/40"></div>
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-green-950/50"></div>
                </div>
              ) : null}

              {/* Vector Nursery Yard Ground Plan */}
              <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
                {/* Background Lawn & Yard */}
                <rect width="1000" height="600" fill={viewMode === 'satellite' ? '#12261b' : '#1b382b'} />
                
                {/* Yard Roadways / Drive Aisle */}
                <path d="M 50 300 L 950 300" stroke="#37474f" strokeWidth="48" strokeLinecap="round" opacity="0.6" />
                <path d="M 50 300 L 950 300" stroke="#ffeb3b" strokeWidth="2" strokeDasharray="16 16" opacity="0.4" />
                <path d="M 500 50 L 500 550" stroke="#37474f" strokeWidth="40" strokeLinecap="round" opacity="0.6" />

                {/* Greenhouse A */}
                <g className="cursor-pointer group">
                  <rect x="80" y="60" width="380" height="200" rx="12" fill="#2e7d32" fillOpacity="0.4" stroke="#4caf50" strokeWidth="3" />
                  <line x1="80" y1="110" x2="460" y2="110" stroke="#4caf50" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <line x1="80" y1="160" x2="460" y2="160" stroke="#4caf50" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <line x1="80" y1="210" x2="460" y2="210" stroke="#4caf50" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <text x="100" y="95" fill="#a0f4c8" fontSize="22" fontWeight="bold" fontFamily="sans-serif">Greenhouse A (Tropicals & Houseplants)</text>
                  <text x="100" y="140" fill="#ffffff" fontSize="16" opacity="0.75" fontFamily="sans-serif">Bays 1 - 8 • Mist Zone North</text>
                </g>

                {/* Greenhouse B */}
                <g className="cursor-pointer group">
                  <rect x="540" y="60" width="380" height="200" rx="12" fill="#00695c" fillOpacity="0.4" stroke="#26a69a" strokeWidth="3" />
                  <line x1="540" y1="110" x2="920" y2="110" stroke="#26a69a" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <line x1="540" y1="160" x2="920" y2="160" stroke="#26a69a" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <line x1="540" y1="210" x2="920" y2="210" stroke="#26a69a" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <text x="560" y="95" fill="#80cbc4" fontSize="22" fontWeight="bold" fontFamily="sans-serif">Greenhouse B (Perennials & Annuals)</text>
                  <text x="560" y="140" fill="#ffffff" fontSize="16" opacity="0.75" fontFamily="sans-serif">Bays 9 - 16 • Center Main Aisle</text>
                </g>

                {/* Outdoor Shade House 1 & 2 */}
                <g className="cursor-pointer group">
                  <rect x="80" y="350" width="400" height="200" rx="12" fill="#33691e" fillOpacity="0.4" stroke="#7cb342" strokeWidth="3" />
                  <text x="100" y="385" fill="#c5e1a5" fontSize="22" fontWeight="bold" fontFamily="sans-serif">Outdoor Shade Yard 1 & 2</text>
                  <text x="100" y="420" fill="#ffffff" fontSize="16" opacity="0.75" fontFamily="sans-serif">Trees, Shrubs, Boxwoods & B&B Stock</text>
                  {/* Tree rows */}
                  {[0, 1, 2, 3].map(row => (
                    <circle key={row} cx={140 + row * 80} cy={480} r="18" fill="#558b2f" opacity="0.6" />
                  ))}
                </g>

                {/* Bulk Materials Storage Yard */}
                <g className="cursor-pointer group">
                  <rect x="540" y="350" width="380" height="200" rx="12" fill="#4e342e" fillOpacity="0.5" stroke="#8d6e63" strokeWidth="3" />
                  <text x="560" y="385" fill="#d7ccc8" fontSize="22" fontWeight="bold" fontFamily="sans-serif">Bulk Materials Yard (Mulch & Soil)</text>
                  {/* Bins */}
                  <rect x="560" y="410" width="90" height="120" rx="6" fill="#3e2723" stroke="#a1887f" strokeWidth="2" />
                  <text x="575" y="475" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Mulch</text>

                  <rect x="670" y="410" width="90" height="120" rx="6" fill="#271c19" stroke="#a1887f" strokeWidth="2" />
                  <text x="685" y="475" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Soil</text>

                  <rect x="780" y="410" width="90" height="120" rx="6" fill="#455a64" stroke="#90a4ae" strokeWidth="2" />
                  <text x="795" y="475" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Stone</text>
                </g>

                {/* Loading Dock / Staging Area Marker */}
                <rect x="440" y="270" width="120" height="60" rx="8" fill="#d32f2f" fillOpacity="0.3" stroke="#ef5350" strokeWidth="2" />
                <text x="450" y="305" fill="#ffcdd2" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Staging Bay</text>
              </svg>

              {/* Pinpoint Radar & Markers */}
              {viewMode === 'all' ? (
                /* Show all items with pins */
                allItems.map((item, idx) => {
                  const z = getPlantZone(item.plant);
                  const isCurrent = (activePinId || selectedItem.plant.id) === item.plant.id;
                  // add slight offset so multiple pins in same zone don't fully overlap
                  const offsetX = (idx % 3) * 4 - 4;
                  const offsetY = Math.floor(idx / 3) * 5 - 3;
                  const posX = Math.max(10, Math.min(90, z.x + offsetX));
                  const posY = Math.max(15, Math.min(85, z.y + offsetY));

                  return (
                    <div
                      key={item.plant.id}
                      style={{ left: `${posX}%`, top: `${posY}%` }}
                      onClick={() => setActivePinId(item.plant.id)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                    >
                      {isCurrent && (
                        <div className="absolute -inset-3 bg-[#a0f4c8] rounded-full animate-ping opacity-75"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xl border-2 transition-transform duration-200 group-hover:scale-125 ${
                        isCurrent 
                          ? 'bg-[#0e6c4a] border-white scale-110 ring-4 ring-[#a0f4c8]/50' 
                          : 'bg-emerald-800 border-white/80'
                      }`}>
                        <MapPin className="w-4 h-4 text-[#a0f4c8]" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/90 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                        {item.plant.name.slice(0, 16)}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Single Active Plant Pin */
                <div
                  style={{ left: `${currentZone.x}%`, top: `${currentZone.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
                >
                  {/* Radar Pulse Animation */}
                  <div className="absolute w-24 h-24 -top-6 -left-6 bg-[#a0f4c8]/30 rounded-full animate-ping pointer-events-none"></div>
                  <div className="absolute w-14 h-14 -top-1 -left-1 bg-emerald-400/40 rounded-full animate-pulse pointer-events-none"></div>

                  {/* Pulsing Pin Tag */}
                  <div className="relative z-10 flex flex-col items-center group cursor-pointer">
                    <div className="bg-[#012d1d] text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-2xl border border-[#a0f4c8] flex items-center gap-1.5 whitespace-nowrap mb-1">
                      <MapPin className="w-3.5 h-3.5 text-[#a0f4c8]" />
                      <span>{selectedItem.plant.name}</span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-[#0e6c4a] border-2 border-white shadow-2xl flex items-center justify-center text-white ring-4 ring-[#a0f4c8]/60">
                      <Crosshair className="w-5 h-5 text-[#a0f4c8] animate-spin-slow" />
                    </div>
                  </div>
                </div>
              )}

              {/* Map Legend Overlay */}
              <div className="absolute bottom-2 left-2 z-20 bg-black/75 backdrop-blur-xs p-2 rounded-xl border border-white/10 text-white text-[11px] flex flex-col gap-1 pointer-events-none shadow-md">
                <div className="font-bold text-[#a0f4c8] flex items-center gap-1">
                  <Warehouse className="w-3 h-3" />
                  <span>Mapped Zone:</span>
                </div>
                <div className="text-white/90 font-semibold">{currentZone.zone}</div>
                <div className="text-white/70 text-[10px]">{currentZone.bay}</div>
              </div>

              {/* Live Coordinates Footer Badge */}
              <div className="absolute bottom-2 right-2 z-20 bg-black/75 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/10 text-white text-xs font-mono flex items-center gap-1.5 pointer-events-none shadow-md">
                <Radio className="w-3.5 h-3.5 text-[#a0f4c8] animate-pulse" />
                <span>{formattedCoords}</span>
              </div>
            </div>
          </div>

          {/* Location & Navigation Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="w-full bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer border border-[#a0f4c8]/30 active:scale-[0.99]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Google Maps / Satellite</span>
            </button>

            {onLogGPS && (
              <button
                type="button"
                onClick={() => {
                  onLogGPS(selectedItem.plant.id);
                }}
                className="w-full bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#012d1d] font-extrabold py-3 px-4 rounded-xl border border-[#0e6c4a]/30 shadow-2xs transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
              >
                <RefreshCw className="w-4 h-4 text-[#0e6c4a]" />
                <span>Re-log Live GPS Position</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f3f4f0] p-3.5 sm:p-4 border-t border-[#c1c8c2] flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-[#414844]">
            <Building className="w-4 h-4 text-[#0e6c4a]" />
            <span>Maple Lane Nursery • 2026 Fleet Yard Navigation</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0e6c4a] hover:bg-[#0b5338] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
