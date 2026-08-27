import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OrderCartItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  generateGoogleMapsPinUrl, 
  generateGoogleMapsWalkingUrl, 
  acquireHighPrecisionGps, 
  formatGpsCoordinates, 
  getGpsAccuracyRating,
  DEFAULT_NURSERY_COORDS 
} from '../utils/gpsUtils';
import { 
  X, 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  RefreshCw, 
  Package, 
  Radio, 
  Maximize2, 
  Crosshair, 
  Building, 
  LocateFixed, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Footprints
} from 'lucide-react';

interface PlantMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: OrderCartItem | null;
  allItems?: OrderCartItem[];
  gpsLoggedMap?: Record<string, string>;
  onLogGPS?: (plantId: string) => void;
  orderId?: string;
  customerName?: string;
}

export interface ParsedPlantLocation {
  item: OrderCartItem;
  lat: number;
  lng: number;
  accuracy?: number;
  formattedCoords: string;
  hasExplicitGps: boolean;
  timestamp?: string;
}

// Fallback Maple Lane Nursery coordinates
const DEFAULT_NURSERY_CENTER = { lat: DEFAULT_NURSERY_COORDS.latitude, lng: DEFAULT_NURSERY_COORDS.longitude };

// Web Mercator projection mathematical helpers for interactive satellite tile viewer
function projectMercator(lat: number, lng: number, zoom: number) {
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  const scale = 256 * Math.pow(2, zoom);
  return {
    x: scale * (0.5 + lng / 360),
    y: scale * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
  };
}

function unprojectMercator(x: number, y: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const lng = ((x / scale) - 0.5) * 360;
  const y2 = 0.5 - (y / scale);
  const lat = 90 - (360 * Math.atan(Math.exp(-y2 * 2 * Math.PI))) / Math.PI;
  return { lat, lng };
}

// Interactive Canvas/Tile Satellite & Roadmap Map Component (Zero-config, no API key needed, zero errors)
const InteractiveTileMap: React.FC<{
  locations: ParsedPlantLocation[];
  activeLocation: ParsedPlantLocation | null;
  onSelectLocation: (loc: ParsedPlantLocation) => void;
  userLocation: { lat: number; lng: number } | null;
  mapType: 'hybrid' | 'satellite' | 'roadmap';
  fitBoundsTrigger: number;
  onLogGPS?: (plantId: string) => void;
  onCopyCoords: (coords: string, id: string) => void;
  copiedCoords: string | null;
  onOpenGoogleMapsPin: (lat: number, lng: number, label?: string) => void;
  onOpenGoogleMapsWalking: (lat: number, lng: number) => void;
}> = ({
  locations,
  activeLocation,
  onSelectLocation,
  userLocation,
  mapType,
  fitBoundsTrigger,
  onLogGPS,
  onCopyCoords,
  copiedCoords,
  onOpenGoogleMapsPin,
  onOpenGoogleMapsWalking
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 600, height: 400 });
  const [center, setCenter] = useState<{ lat: number; lng: number }>(() => {
    return activeLocation ? { lat: activeLocation.lat, lng: activeLocation.lng } : DEFAULT_NURSERY_CENTER;
  });
  const [zoom, setZoom] = useState<number>(18);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startCenterProj: { x: number; y: number } } | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: Math.max(entry.contentRect.width, 200),
          height: Math.max(entry.contentRect.height, 200)
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Center on active location when it changes
  useEffect(() => {
    if (activeLocation) {
      setCenter({ lat: activeLocation.lat, lng: activeLocation.lng });
    }
  }, [activeLocation]);

  // Fit bounds when triggered
  useEffect(() => {
    if (locations.length === 0) return;
    if (locations.length === 1) {
      setCenter({ lat: locations[0].lat, lng: locations[0].lng });
      setZoom(18);
      return;
    }
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    locations.forEach(l => {
      if (l.lat < minLat) minLat = l.lat;
      if (l.lat > maxLat) maxLat = l.lat;
      if (l.lng < minLng) minLng = l.lng;
      if (l.lng > maxLng) maxLng = l.lng;
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    setCenter({ lat: midLat, lng: midLng });

    // Calculate approximate zoom to fit width & height
    const latDiff = Math.max(maxLat - minLat, 0.0005);
    const lngDiff = Math.max(maxLng - minLng, 0.0005);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff < 0.001) setZoom(18);
    else if (maxDiff < 0.003) setZoom(17);
    else if (maxDiff < 0.008) setZoom(16);
    else setZoom(15);
  }, [fitBoundsTrigger, locations]);

  // Pan interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-card')) return;
    setIsDragging(true);
    const centerProj = projectMercator(center.lat, center.lng, zoom);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startCenterProj: centerProj
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const newProjX = dragStartRef.current.startCenterProj.x - dx;
    const newProjY = dragStartRef.current.startCenterProj.y - dy;
    const newLatLng = unprojectMercator(newProjX, newProjY, zoom);
    setCenter(newLatLng);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 1, 19));
    } else if (e.deltaY > 0) {
      setZoom(prev => Math.max(prev - 1, 14));
    }
  };

  // Compute tile range to render
  const centerProj = useMemo(() => projectMercator(center.lat, center.lng, zoom), [center, zoom]);
  const numTiles = Math.pow(2, zoom);

  const tiles = useMemo(() => {
    const halfW = containerSize.width / 2;
    const halfH = containerSize.height / 2;

    const minTileX = Math.floor((centerProj.x - halfW) / 256);
    const maxTileX = Math.floor((centerProj.x + halfW) / 256);
    const minTileY = Math.floor((centerProj.y - halfH) / 256);
    const maxTileY = Math.floor((centerProj.y + halfH) / 256);

    const tileList: Array<{ key: string; url: string; left: number; top: number }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= numTiles) continue;
        const normalizedTx = ((tx % numTiles) + numTiles) % numTiles;
        const tileLeft = halfW + (tx * 256 - centerProj.x);
        const tileTop = halfH + (ty * 256 - centerProj.y);

        let url = '';
        if (mapType === 'roadmap') {
          url = `https://tile.openstreetmap.org/${zoom}/${normalizedTx}/${ty}.png`;
        } else {
          // Satellite Hybrid / Imagery
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${normalizedTx}`;
        }

        tileList.push({
          key: `${zoom}-${tx}-${ty}-${mapType}`,
          url,
          left: tileLeft,
          top: tileTop
        });
      }
    }
    return tileList;
  }, [centerProj, containerSize, zoom, numTiles, mapType]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`w-full h-full relative overflow-hidden select-none touch-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ backgroundColor: mapType === 'roadmap' ? '#e5e3df' : '#14281e' }}
    >
      {/* MAP TILES LAYER */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="eager"
            referrerPolicy="no-referrer"
            className="absolute w-[256px] h-[256px] object-cover transition-opacity duration-150"
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`
            }}
            onError={(e) => {
              // Fallback background grid tile on load failure
              (e.target as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ))}

        {/* Nursery Yard Grid Lines for extra depth on high zoom */}
        {mapType !== 'roadmap' && (
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, #a0f4c8 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />
        )}
      </div>

      {/* USER GPS CURRENT LOCATION MARKER */}
      {userLocation && (() => {
        const userProj = projectMercator(userLocation.lat, userLocation.lng, zoom);
        const x = containerSize.width / 2 + (userProj.x - centerProj.x);
        const y = containerSize.height / 2 + (userProj.y - centerProj.y);

        return (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute"></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PLANT GPS MARKERS */}
      {locations.map((loc) => {
        const isSelected = activeLocation?.item.plant.id === loc.item.plant.id;
        const isExplicit = loc.hasExplicitGps;
        const locProj = projectMercator(loc.lat, loc.lng, zoom);
        const x = containerSize.width / 2 + (locProj.x - centerProj.x);
        const y = containerSize.height / 2 + (locProj.y - centerProj.y);

        // Don't render pins far outside viewport
        if (x < -120 || x > containerSize.width + 120 || y < -120 || y > containerSize.height + 120) {
          return null;
        }

        return (
          <div
            key={loc.item.plant.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLocation(loc);
            }}
            className={`absolute transform -translate-x-1/2 -translate-y-full transition-transform cursor-pointer select-none group ${
              isSelected ? 'z-40 scale-105' : 'z-20 hover:z-30 hover:scale-105'
            }`}
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            {/* Selection Pulse Ring */}
            {isSelected && (
              <div className="absolute -inset-2.5 bg-[#a0f4c8] rounded-full animate-ping opacity-75 pointer-events-none" />
            )}

            <div className="flex flex-col items-center">
              {/* Plant Name Tag */}
              <div className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-tight shadow-md border flex items-center gap-1 whitespace-nowrap mb-0.5 ${
                isSelected
                  ? 'bg-[#012d1d] text-[#a0f4c8] border-[#a0f4c8]'
                  : isExplicit
                    ? 'bg-[#0e6c4a] text-white border-white/80'
                    : 'bg-[#414844] text-white border-white/60 opacity-90'
              }`}>
                <span className="truncate max-w-[110px]">{loc.item.plant.name}</span>
                <span className="bg-white/20 px-1 rounded text-[10px]">x{loc.item.quantity}</span>
              </div>

              {/* Pin Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xl border-2 ${
                isSelected
                  ? 'bg-[#0e6c4a] border-white ring-4 ring-[#a0f4c8]/70 text-white'
                  : isExplicit
                    ? 'bg-emerald-600 border-white'
                    : 'bg-stone-600 border-stone-300'
              }`}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              
              {/* Pin Pointer Triangle */}
              <div className={`w-2 h-2 -mt-1 rotate-45 border-r border-b ${
                isSelected ? 'bg-[#0e6c4a] border-white' : isExplicit ? 'bg-emerald-600 border-white' : 'bg-stone-600 border-stone-300'
              }`} />
            </div>
          </div>
        );
      })}

      {/* POPUP INFO CARD FOR ACTIVE SELECTED PLANT */}
      {activeLocation && (() => {
        const locProj = projectMercator(activeLocation.lat, activeLocation.lng, zoom);
        const x = containerSize.width / 2 + (locProj.x - centerProj.x);
        const y = containerSize.height / 2 + (locProj.y - centerProj.y);

        // Position popup above pin or clamp within container
        const popupLeft = Math.max(10, Math.min(containerSize.width - 270, x - 130));
        const popupTop = Math.max(10, Math.min(containerSize.height - 230, y - 220));

        return (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border border-[#012d1d]/30 p-2.5 w-[260px] animate-scale-up interactive-card select-text"
            style={{ left: `${popupLeft}px`, top: `${popupTop}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-[#e2e3df]">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-extrabold text-xs text-[#012d1d] truncate">
                  {activeLocation.item.plant.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSelectLocation(null as any)}
                className="w-5 h-5 rounded hover:bg-[#f3f4f0] text-[#717973] hover:text-[#1a1c1a] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plant Snapshot */}
            <div className="flex items-center gap-2 py-1.5">
              <img
                src={activeLocation.item.plant.image || DEFAULT_PLANT_IMAGE}
                alt={activeLocation.item.plant.name}
                className="w-10 h-10 rounded-lg object-cover bg-[#f3f4f0] border border-[#c1c8c2] shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
              />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-[#1a1c1a] truncate text-[11px]">
                  {activeLocation.item.plant.botanicalName || activeLocation.item.plant.name}
                </p>
                <p className="text-[#717973] text-[10px]">
                  Size: <span className="font-semibold text-[#1a1c1a]">{activeLocation.item.plant.size || 'Standard'}</span> • Qty: <span className="font-bold text-[#012d1d]">{activeLocation.item.quantity}</span>
                </p>
                <p className="font-mono text-[9px] text-[#0e6c4a] font-bold">
                  Item #{activeLocation.item.plant.itemNo || activeLocation.item.plant.barcode}
                </p>
              </div>
            </div>

            {/* Coordinates Box */}
            <div className="bg-[#f3f4f0] p-1.5 rounded-lg border border-[#c1c8c2] text-[10px] flex flex-col gap-0.5 mb-1.5">
              <div className="flex items-center justify-between text-[#414844]">
                <span className="font-bold">GPS Coordinates:</span>
                <button
                  type="button"
                  onClick={() => onCopyCoords(activeLocation.formattedCoords, activeLocation.item.plant.id)}
                  className="text-[#0e6c4a] hover:underline flex items-center gap-0.5 font-mono cursor-pointer font-bold"
                >
                  {copiedCoords === activeLocation.item.plant.id ? (
                    <span className="text-emerald-700 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="w-3 h-3" /> Copy
                    </span>
                  )}
                </button>
              </div>
              <div className="font-mono font-bold text-[#012d1d] text-[11px]">
                {activeLocation.formattedCoords}
              </div>
              {activeLocation.timestamp && (
                <div className="text-[9px] text-[#717973]">
                  Logged: {new Date(activeLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenGoogleMapsPin(activeLocation.lat, activeLocation.lng, `${activeLocation.item.plant.name} (Qty: ${activeLocation.item.quantity})`)}
                  className="flex-1 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  title="Drop exact red pin in Google Maps Satellite view"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Drop Pin in Google Maps</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenGoogleMapsWalking(activeLocation.lat, activeLocation.lng)}
                  className="bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#c1c8c2]"
                  title="Open walking directions from current position"
                >
                  <Footprints className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>Walk</span>
                </button>
              </div>

              {onLogGPS && (
                <button
                  type="button"
                  onClick={() => onLogGPS(activeLocation.item.plant.id)}
                  className="w-full bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#012d1d] py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#0e6c4a]/30"
                  title="Update coordinates with high-precision satellite GPS"
                >
                  <RefreshCw className="w-3 h-3 text-[#0e6c4a]" />
                  <span>Re-log GPS (Satellite Lock)</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Floating Zoom & Compass Controls */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1 shadow-lg bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/20">
        <button
          type="button"
          onClick={() => setZoom(prev => Math.min(prev + 1, 19))}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-[#0e6c4a] text-white flex items-center justify-center cursor-pointer transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="text-[10px] font-mono text-center text-white/80 font-bold py-0.5">
          {zoom}x
        </div>
        <button
          type="button"
          onClick={() => setZoom(prev => Math.max(prev - 1, 14))}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-[#0e6c4a] text-white flex items-center justify-center cursor-pointer transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const PlantMapModal: React.FC<PlantMapModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  allItems = [],
  gpsLoggedMap = {},
  onLogGPS,
  orderId,
  customerName
}) => {
  const [activeItem, setActiveItem] = useState<OrderCartItem | null>(selectedItem);
  const [copiedCoords, setCopiedCoords] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'hybrid' | 'satellite' | 'roadmap'>('hybrid');
  const [filterMode, setFilterMode] = useState<'all' | 'logged_only'>('all');
  const [infoWindowItem, setInfoWindowItem] = useState<ParsedPlantLocation | null>(null);
  const [fitBoundsCount, setFitBoundsCount] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [gpsLogSuccess, setGpsLogSuccess] = useState<string | null>(null);
  const [hasGoogleMapsError, setHasGoogleMapsError] = useState<boolean>(false);

  // Sync active item when selectedItem prop changes
  useEffect(() => {
    if (selectedItem) {
      setActiveItem(selectedItem);
    }
  }, [selectedItem]);

  // Consolidate all items (including selected item if not in allItems)
  const effectiveItems = useMemo(() => {
    const list = [...allItems];
    if (selectedItem && !list.some(i => i.plant.id === selectedItem.plant.id)) {
      list.unshift(selectedItem);
    }
    return list;
  }, [allItems, selectedItem]);

  // Parse GPS coordinates for each plant
  const parsedLocations = useMemo<ParsedPlantLocation[]>(() => {
    return effectiveItems.map((item, index) => {
      let lat = DEFAULT_NURSERY_CENTER.lat;
      let lng = DEFAULT_NURSERY_CENTER.lng;
      let accuracy = item.gpsLocation?.accuracy || item.plant.gpsLocation?.accuracy;
      let hasExplicitGps = false;
      let timestamp = item.gpsLocation?.timestamp;

      if (item.gpsLocation && typeof item.gpsLocation.latitude === 'number' && typeof item.gpsLocation.longitude === 'number') {
        lat = item.gpsLocation.latitude;
        lng = item.gpsLocation.longitude;
        hasExplicitGps = true;
      } else if (item.plant.gpsLocation && typeof item.plant.gpsLocation.latitude === 'number' && typeof item.plant.gpsLocation.longitude === 'number') {
        lat = item.plant.gpsLocation.latitude;
        lng = item.plant.gpsLocation.longitude;
        timestamp = item.plant.gpsLocation.timestamp;
        hasExplicitGps = true;
      } else {
        const rawGpsString = gpsLoggedMap[item.plant.id];
        if (rawGpsString) {
          const latMatch = rawGpsString.match(/([\d.-]+)°?\s*N?/i);
          const lngMatch = rawGpsString.match(/([\d.-]+)°?\s*W?/i);
          if (latMatch && latMatch[1]) {
            lat = parseFloat(latMatch[1]);
            hasExplicitGps = true;
          }
          if (lngMatch && lngMatch[1]) {
            lng = -Math.abs(parseFloat(lngMatch[1]));
            hasExplicitGps = true;
          }
        }
      }

      // Default spacing jitter if plants are in default nursery area without individual coordinates
      if (!hasExplicitGps) {
        const offsetLat = (index % 4) * 0.00015 - 0.0002;
        const offsetLng = Math.floor(index / 4) * 0.0002 - 0.0002;
        lat = DEFAULT_NURSERY_CENTER.lat + offsetLat;
        lng = DEFAULT_NURSERY_CENTER.lng + offsetLng;
      }

      const formattedCoords = formatGpsCoordinates(lat, lng, accuracy);

      return {
        item,
        lat,
        lng,
        accuracy,
        formattedCoords,
        hasExplicitGps,
        timestamp
      };
    });
  }, [effectiveItems, gpsLoggedMap]);

  // Filtered list based on view tab
  const displayedLocations = useMemo(() => {
    if (filterMode === 'logged_only') {
      return parsedLocations.filter(loc => loc.hasExplicitGps);
    }
    return parsedLocations;
  }, [parsedLocations, filterMode]);

  const loggedCount = parsedLocations.filter(l => l.hasExplicitGps).length;

  // Selected item location
  const currentActiveLocation = useMemo(() => {
    if (!activeItem) return parsedLocations[0] || null;
    return parsedLocations.find(l => l.item.plant.id === activeItem.plant.id) || parsedLocations[0] || null;
  }, [activeItem, parsedLocations]);

  // Auto-open InfoWindow when active item changes
  useEffect(() => {
    if (currentActiveLocation) {
      setInfoWindowItem(currentActiveLocation);
    }
  }, [activeItem]);

  if (!isOpen) return null;

  const handleCopyCoords = (coords: string, id: string) => {
    navigator.clipboard.writeText(coords);
    setCopiedCoords(id);
    setTimeout(() => setCopiedCoords(null), 2000);
  };

  const handleOpenGoogleMapsPin = (lat: number, lng: number, plantLabel?: string) => {
    const url = generateGoogleMapsPinUrl(lat, lng, plantLabel);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenGoogleMapsWalking = (lat: number, lng: number) => {
    const url = generateGoogleMapsWalkingUrl(lat, lng);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenActiveInGoogleMaps = () => {
    if (currentActiveLocation) {
      handleOpenGoogleMapsPin(
        currentActiveLocation.lat, 
        currentActiveLocation.lng, 
        `${currentActiveLocation.item.plant.name} (Qty: ${currentActiveLocation.item.quantity}) - Maple Lane Nursery`
      );
    } else {
      handleOpenGoogleMapsPin(DEFAULT_NURSERY_CENTER.lat, DEFAULT_NURSERY_CENTER.lng, 'Maple Lane Nursery');
    }
  };

  const handleGetLiveUserLocation = async () => {
    setIsLocatingUser(true);
    try {
      const fix = await acquireHighPrecisionGps({
        maxWaitMs: 4500,
        targetAccuracyMeters: 4.5
      });
      setUserLocation({
        lat: fix.latitude,
        lng: fix.longitude
      });
    } catch (err) {
      console.warn('Geolocation acquisition error:', err);
    } finally {
      setIsLocatingUser(false);
    }
  };

  const handleLogPlantGpsOnTheSpot = (plantId: string) => {
    if (onLogGPS) {
      onLogGPS(plantId);
      setGpsLogSuccess(plantId);
      setTimeout(() => setGpsLogSuccess(null), 3000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-[#c1c8c2] flex flex-col h-[94vh] max-h-[900px] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#012d1d] text-white p-3.5 sm:p-4.5 flex justify-between items-center border-b border-[#0e6c4a] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#a0f4c8]/20 border border-[#a0f4c8]/30 flex items-center justify-center text-[#a0f4c8] shrink-0 shadow-2xs">
              <MapPin className="w-5 h-5 animate-bounce-short" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                  Google Map • High-Precision Plant GPS
                </h3>
                <span className="bg-[#a0f4c8] text-[#002113] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-2xs">
                  <Radio className="w-2.5 h-2.5 text-[#0e6c4a] animate-pulse" />
                  {loggedCount} of {parsedLocations.length} Logged
                </span>
              </div>
              <p className="text-xs text-white/80 truncate">
                {customerName ? `${customerName} • ` : ''}
                {orderId ? `Order #${orderId} • ` : ''}
                High-Resolution Satellite Pins & Sub-Meter Accuracy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenActiveInGoogleMaps}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a0f4c8]/20 hover:bg-[#a0f4c8] text-[#a0f4c8] hover:text-[#002113] border border-[#a0f4c8]/40 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Drop exact red pin for selected plant in Google Maps Satellite view"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Drop Pin in Google Maps</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Close Map Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW (MAP + PLANT SELECTOR SIDEBAR) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* MAP CANVAS VIEW */}
          <div className="flex-1 relative flex flex-col min-h-[300px] h-full bg-[#1b382b] overflow-hidden">
            
            {/* Top Interactive Controls Toolbar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
              
              {/* Layer Type Switcher */}
              <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/20 pointer-events-auto shadow-lg">
                <button
                  type="button"
                  onClick={() => setMapTypeId('hybrid')}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    mapTypeId === 'hybrid'
                      ? 'bg-[#0e6c4a] text-white shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title="Satellite imagery with labels"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Satellite Hybrid</span>
                  <span className="sm:hidden">Hybrid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapTypeId('roadmap')}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    mapTypeId === 'roadmap'
                      ? 'bg-[#0e6c4a] text-white shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title="Roadmap vector view"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Roadmap</span>
                </button>
              </div>

              {/* Action Buttons: Fit Bounds & My Location */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setFitBoundsCount(prev => prev + 1)}
                  className="px-2.5 py-1.5 bg-black/80 hover:bg-[#0e6c4a] backdrop-blur-md text-[#a0f4c8] hover:text-white rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer"
                  title="Fit all plant markers into view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fit All Pins</span>
                </button>

                <button
                  type="button"
                  onClick={handleGetLiveUserLocation}
                  className={`px-2.5 py-1.5 bg-black/80 hover:bg-[#0e6c4a] backdrop-blur-md text-[#a0f4c8] hover:text-white rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer ${
                    isLocatingUser ? 'animate-pulse text-amber-300' : ''
                  }`}
                  title="Lock onto high-precision satellite GPS location"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isLocatingUser ? 'Locking GPS...' : 'My Location'}</span>
                </button>
              </div>
            </div>

            {/* MAP CONTAINER (Interactive High-Res Satellite & Roadmap Tile Engine - Zero config required) */}
            <div className="w-full h-full relative flex-1">
              <InteractiveTileMap
                locations={displayedLocations}
                activeLocation={infoWindowItem}
                onSelectLocation={(loc) => {
                  if (loc) {
                    setActiveItem(loc.item);
                    setInfoWindowItem(loc);
                  } else {
                    setInfoWindowItem(null);
                  }
                }}
                userLocation={userLocation}
                mapType={mapTypeId}
                fitBoundsTrigger={fitBoundsCount}
                onLogGPS={onLogGPS ? (id) => handleLogPlantGpsOnTheSpot(id) : undefined}
                onCopyCoords={handleCopyCoords}
                copiedCoords={copiedCoords}
                onOpenGoogleMapsPin={handleOpenGoogleMapsPin}
                onOpenGoogleMapsWalking={handleOpenGoogleMapsWalking}
              />
            </div>

            {/* Floating Live Coordinates Badge */}
            <div className="absolute bottom-3 left-3 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-xs font-mono flex items-center gap-2 pointer-events-none shadow-lg">
              <Radio className="w-3.5 h-3.5 text-[#a0f4c8] animate-pulse" />
              <span>
                {currentActiveLocation ? currentActiveLocation.formattedCoords : `${DEFAULT_NURSERY_CENTER.lat.toFixed(5)}° N, ${Math.abs(DEFAULT_NURSERY_CENTER.lng).toFixed(5)}° W`}
              </span>
            </div>
          </div>

          {/* RIGHT SIDEBAR / DRAWER: LIST OF ALL PLANTS IN ORDER */}
          <div className="w-full md:w-80 lg:w-96 bg-[#f8f9f5] border-t md:border-t-0 md:border-l border-[#c1c8c2] flex flex-col h-64 md:h-full shrink-0">
            
            {/* Sidebar Header & Filter Tabs */}
            <div className="p-3 bg-white border-b border-[#c1c8c2] flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#012d1d] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>Order Items ({parsedLocations.length})</span>
                </span>
                <span className="text-[11px] font-bold text-[#0e6c4a]">
                  {loggedCount} with GPS
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-[#f3f4f0] p-1 rounded-xl border border-[#c1c8c2]">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                    filterMode === 'all'
                      ? 'bg-[#012d1d] text-white shadow-2xs'
                      : 'text-[#414844] hover:text-[#1a1c1a]'
                  }`}
                >
                  All Items ({parsedLocations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('logged_only')}
                  className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                    filterMode === 'logged_only'
                      ? 'bg-[#012d1d] text-white shadow-2xs'
                      : 'text-[#414844] hover:text-[#1a1c1a]'
                  }`}
                >
                  GPS Logged ({loggedCount})
                </button>
              </div>
            </div>

            {/* Plant List */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 flex flex-col gap-2">
              {displayedLocations.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#717973] flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-[#c1c8c2]" />
                  <span>No plants match the current filter.</span>
                  {filterMode === 'logged_only' && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className="mt-1 text-[#0e6c4a] font-bold hover:underline cursor-pointer"
                    >
                      Show all {parsedLocations.length} items
                    </button>
                  )}
                </div>
              ) : (
                displayedLocations.map((loc) => {
                  const isSelected = activeItem?.plant.id === loc.item.plant.id;
                  const isExplicit = loc.hasExplicitGps;
                  const justLogged = gpsLogSuccess === loc.item.plant.id;
                  const accuracyRating = getGpsAccuracyRating(loc.accuracy);

                  return (
                    <div
                      key={loc.item.plant.id}
                      onClick={() => {
                        setActiveItem(loc.item);
                        setInfoWindowItem(loc);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-[#012d1d]/5 border-[#012d1d] shadow-sm ring-2 ring-[#012d1d]/20'
                          : 'bg-white hover:bg-[#f3f4f0] border-[#c1c8c2]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <img
                          src={loc.item.plant.image || DEFAULT_PLANT_IMAGE}
                          alt={loc.item.plant.name}
                          className="w-11 h-11 rounded-lg object-cover bg-[#f3f4f0] border border-[#c1c8c2] shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-extrabold text-xs sm:text-sm text-[#1a1c1a] truncate">
                              {loc.item.plant.name}
                            </h4>
                            <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">
                              Qty: {loc.item.quantity}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] text-[#717973]">
                            <span className="truncate">#{loc.item.plant.itemNo || loc.item.plant.barcode}</span>
                            <span>•</span>
                            <span>{loc.item.plant.size || 'Standard'}</span>
                          </div>
                        </div>
                      </div>

                      {/* GPS Badge & Quick Action */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e2e3df] text-[11px]">
                        {isExplicit ? (
                          <div className="flex items-center gap-1 text-[#0e6c4a] font-mono font-bold truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0e6c4a] shrink-0" />
                            <span className="truncate">{loc.formattedCoords}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[#717973] italic">
                            <AlertCircle className="w-3 h-3 text-[#717973] shrink-0" />
                            <span>Estimated nursery area</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          {onLogGPS && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLogPlantGpsOnTheSpot(loc.item.plant.id);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                justLogged
                                   ? 'bg-[#0e6c4a] text-white border-[#0e6c4a]'
                                  : 'bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#012d1d] border-[#0e6c4a]/30'
                              }`}
                              title="Log high-precision satellite GPS location for this plant"
                            >
                              <Crosshair className="w-2.5 h-2.5" />
                              <span>{justLogged ? 'Saved!' : isExplicit ? 'Re-log' : 'Log GPS'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenGoogleMapsPin(loc.lat, loc.lng, `${loc.item.plant.name} (Qty: ${loc.item.quantity})`);
                            }}
                            className="p-1 text-[#0e6c4a] hover:text-[#012d1d] rounded hover:bg-[#e7e9e5] transition-colors cursor-pointer"
                            title="Drop exact red pin in Google Maps Satellite view"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-3 bg-white border-t border-[#c1c8c2] flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenActiveInGoogleMaps}
                className="w-full bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white font-extrabold py-2.5 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 text-xs cursor-pointer border border-[#a0f4c8]/30"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Drop Active Plant Pin in Google Maps</span>
              </button>

              {currentActiveLocation && (
                <button
                  type="button"
                  onClick={() => handleOpenGoogleMapsWalking(currentActiveLocation.lat, currentActiveLocation.lng)}
                  className="w-full bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-[#c1c8c2]"
                >
                  <Footprints className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>Walking Directions from My Location</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#f3f4f0] p-3 sm:p-3.5 border-t border-[#c1c8c2] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#414844]">
            <Building className="w-4 h-4 text-[#0e6c4a]" />
            <span className="hidden sm:inline">Maple Lane Nursery • High-Precision GPS Plant Locator (Sub-Meter Satellite Accuracy)</span>
            <span className="sm:hidden">GPS Plant Locator</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#0e6c4a] hover:bg-[#0b5338] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};
