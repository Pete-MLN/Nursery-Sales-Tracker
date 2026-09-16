import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OrderCartItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  generateGoogleMapsPinUrl, 
  generateGoogleMapsWalkingUrl, 
  acquireHighPrecisionGps, 
  formatGpsCoordinates, 
  getGpsAccuracyRating,
  calculateDistanceFeet,
  formatDistanceFeet,
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
  Minimize2,
  Crosshair, 
  Building, 
  LocateFixed, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Footprints,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  EyeOff
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
  spotLabel?: string;
  spotNotes?: string;
  spotIndex?: number;
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

// Interactive Canvas/Tile Satellite & Roadmap Map Component with Deep Zoom, Multi-touch & User Tracking
const InteractiveTileMap: React.FC<{
  locations: ParsedPlantLocation[];
  activeLocation: ParsedPlantLocation | null;
  onSelectLocation: (loc: ParsedPlantLocation | null) => void;
  userLocation: { lat: number; lng: number; accuracy?: number; heading?: number } | null;
  mapType: 'hybrid' | 'satellite' | 'roadmap';
  fitBoundsTrigger: number;
  centerOnUserTrigger: number;
  onLogGPS?: (plantId: string) => void;
  onCopyCoords: (coords: string, id: string) => void;
  copiedCoords: string | null;
  onOpenGoogleMapsPin: (lat: number, lng: number, label?: string) => void;
  onOpenGoogleMapsWalking: (lat: number, lng: number) => void;
  onRequestUserLocation?: () => void;
  isLocatingUser?: boolean;
}> = ({
  locations,
  activeLocation,
  onSelectLocation,
  userLocation,
  mapType,
  fitBoundsTrigger,
  centerOnUserTrigger,
  onLogGPS,
  onCopyCoords,
  copiedCoords,
  onOpenGoogleMapsPin,
  onOpenGoogleMapsWalking,
  onRequestUserLocation,
  isLocatingUser
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 600, height: 400 });
  const [center, setCenter] = useState<{ lat: number; lng: number }>(() => {
    return activeLocation ? { lat: activeLocation.lat, lng: activeLocation.lng } : DEFAULT_NURSERY_CENTER;
  });
  // Zoom range extended from 13 to 21 for ultra-close yard precision
  const [zoom, setZoom] = useState<number>(18);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startCenterProj: { x: number; y: number } } | null>(null);

  // Multi-touch tracking for pinch-to-zoom on mobile
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(18);

  // Resize observer to keep map container coordinates accurate
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: Math.max(entry.contentRect.width, 180),
          height: Math.max(entry.contentRect.height, 180)
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

  // Center on user location when triggered
  useEffect(() => {
    if (centerOnUserTrigger > 0 && userLocation) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      setZoom(prev => Math.max(prev, 18));
    }
  }, [centerOnUserTrigger, userLocation]);

  // Fit bounds when triggered
  useEffect(() => {
    if (locations.length === 0) {
      if (userLocation) {
        setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      }
      return;
    }

    const allPoints = [...locations];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    // Include user location in bounds calculation if present
    if (userLocation) {
      minLat = Math.min(minLat, userLocation.lat);
      maxLat = Math.max(maxLat, userLocation.lat);
      minLng = Math.min(minLng, userLocation.lng);
      maxLng = Math.max(maxLng, userLocation.lng);
    }

    allPoints.forEach(l => {
      if (l.lat < minLat) minLat = l.lat;
      if (l.lat > maxLat) maxLat = l.lat;
      if (l.lng < minLng) minLng = l.lng;
      if (l.lng > maxLng) maxLng = l.lng;
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    setCenter({ lat: midLat, lng: midLng });

    const latDiff = Math.max(maxLat - minLat, 0.0004);
    const lngDiff = Math.max(maxLng - minLng, 0.0004);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff < 0.0008) setZoom(19);
    else if (maxDiff < 0.002) setZoom(18);
    else if (maxDiff < 0.005) setZoom(17);
    else if (maxDiff < 0.01) setZoom(16);
    else setZoom(15);
  }, [fitBoundsTrigger, locations, userLocation]);

  // Pan and pinch-to-zoom interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-card, input')) return;
    
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Handle two-finger pinch start
    if (activePointersRef.current.size === 2) {
      const points: Array<{ clientX: number; clientY: number }> = [];
      activePointersRef.current.forEach((pt) => points.push(pt));
      if (points.length === 2) {
        const dist = Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
        pinchStartDistRef.current = dist;
        pinchStartZoomRef.current = zoom;
        setIsDragging(false);
        dragStartRef.current = null;
        return;
      }
    }

    if (activePointersRef.current.size === 1) {
      setIsDragging(true);
      const centerProj = projectMercator(center.lat, center.lng, zoom);
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startCenterProj: centerProj
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Two-finger pinch zooming
    if (activePointersRef.current.size === 2 && pinchStartDistRef.current) {
      const points: Array<{ clientX: number; clientY: number }> = [];
      activePointersRef.current.forEach((pt) => points.push(pt));
      if (points.length === 2) {
        const currentDist = Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
        const ratio = currentDist / pinchStartDistRef.current;
        const zoomDelta = Math.round(Math.log2(ratio));
        if (Math.abs(zoomDelta) >= 1) {
          const nextZoom = Math.min(21, Math.max(13, pinchStartZoomRef.current + zoomDelta));
          if (nextZoom !== zoom) {
            setZoom(nextZoom);
          }
        }
      }
      return;
    }

    // Single-finger dragging
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const newProjX = dragStartRef.current.startCenterProj.x - dx;
    const newProjY = dragStartRef.current.startCenterProj.y - dy;
    const newLatLng = unprojectMercator(newProjX, newProjY, zoom);
    setCenter(newLatLng);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 1, 21));
    } else if (e.deltaY > 0) {
      setZoom(prev => Math.max(prev - 1, 13));
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-card')) return;
    setZoom(prev => Math.min(prev + 1, 21));
  };

  // Compute tile range to render (with seamless overzooming for zoom > 19)
  const centerProj = useMemo(() => projectMercator(center.lat, center.lng, zoom), [center, zoom]);
  
  const tiles = useMemo(() => {
    const effectiveTileZoom = Math.min(zoom, 19);
    const scaleFactor = Math.pow(2, zoom - effectiveTileZoom);
    const tileSize = 256 * scaleFactor;
    const numTilesEffective = Math.pow(2, effectiveTileZoom);

    const centerProjEffective = projectMercator(center.lat, center.lng, effectiveTileZoom);
    const halfW = containerSize.width / 2;
    const halfH = containerSize.height / 2;

    const minTileX = Math.floor((centerProjEffective.x - halfW / scaleFactor) / 256);
    const maxTileX = Math.floor((centerProjEffective.x + halfW / scaleFactor) / 256);
    const minTileY = Math.floor((centerProjEffective.y - halfH / scaleFactor) / 256);
    const maxTileY = Math.floor((centerProjEffective.y + halfH / scaleFactor) / 256);

    const tileList: Array<{ key: string; url: string; left: number; top: number; size: number }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= numTilesEffective) continue;
        const normalizedTx = ((tx % numTilesEffective) + numTilesEffective) % numTilesEffective;
        const tileLeft = halfW + (tx * 256 - centerProjEffective.x) * scaleFactor;
        const tileTop = halfH + (ty * 256 - centerProjEffective.y) * scaleFactor;

        let url = '';
        if (mapType === 'roadmap') {
          url = `https://tile.openstreetmap.org/${effectiveTileZoom}/${normalizedTx}/${ty}.png`;
        } else {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${effectiveTileZoom}/${ty}/${normalizedTx}`;
        }

        tileList.push({
          key: `${effectiveTileZoom}-${tx}-${ty}-${mapType}`,
          url,
          left: tileLeft,
          top: tileTop,
          size: tileSize
        });
      }
    }
    return tileList;
  }, [center, zoom, containerSize, mapType]);

  // Distance from user to active plant
  const distanceToActiveFeet = useMemo(() => {
    if (!userLocation || !activeLocation) return null;
    return calculateDistanceFeet(userLocation.lat, userLocation.lng, activeLocation.lat, activeLocation.lng);
  }, [userLocation, activeLocation]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
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
            className="absolute object-cover transition-opacity duration-150"
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`,
              width: `${tile.size}px`,
              height: `${tile.size}px`,
              imageRendering: zoom > 19 ? 'auto' : 'auto'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.25';
            }}
          />
        ))}

        {/* Nursery Yard Grid Lines for extra visual depth on close zoom */}
        {mapType !== 'roadmap' && (
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, #a0f4c8 1px, transparent 1px)',
              backgroundSize: `${Math.max(16, 32 * Math.pow(2, zoom - 18))}px ${Math.max(16, 32 * Math.pow(2, zoom - 18))}px`
            }}
          />
        )}
      </div>

      {/* USER GPS CURRENT LOCATION MARKER (Prominent Real-Time Beacon) */}
      {userLocation && (() => {
        const userProj = projectMercator(userLocation.lat, userLocation.lng, zoom);
        const x = containerSize.width / 2 + (userProj.x - centerProj.x);
        const y = containerSize.height / 2 + (userProj.y - centerProj.y);

        // Approximate accuracy radius circle in pixels
        const accuracyPixels = userLocation.accuracy && userLocation.accuracy > 0
          ? Math.max(28, (userLocation.accuracy / (156543.03392 * Math.cos((userLocation.lat * Math.PI) / 180))) * Math.pow(2, zoom) * 2)
          : 32;

        return (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-25 transition-all duration-300"
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            {/* Accuracy halo radius */}
            <div 
              className="absolute rounded-full border border-blue-400/50 bg-blue-500/10 pointer-events-none"
              style={{
                width: `${accuracyPixels}px`,
                height: `${accuracyPixels}px`,
                transform: 'translate(-50%, -50%)',
                left: '50%',
                top: '50%'
              }}
            />

            {/* Glowing Core Radar & Badge */}
            <div className="relative flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/30 animate-ping absolute"></div>
                <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center ring-4 ring-blue-400/50">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              </div>

              {/* High-visibility label */}
              <div className="mt-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap border border-white flex items-center gap-1">
                <Compass className="w-2.5 h-2.5 text-blue-100 animate-spin-slow" />
                <span>You Are Here</span>
                {userLocation.accuracy && (
                  <span className="text-blue-200 text-[8px] font-mono">
                    (±{Math.round(userLocation.accuracy * 3.28)}ft)
                  </span>
                )}
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
        if (x < -140 || x > containerSize.width + 140 || y < -140 || y > containerSize.height + 140) {
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
              isSelected ? 'z-40 scale-110' : 'z-20 hover:z-30 hover:scale-105'
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
                <span className="truncate max-w-[120px]">{loc.item.plant.name}</span>
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

        // Clamp within container
        const popupLeft = Math.max(8, Math.min(containerSize.width - 280, x - 135));
        const popupTop = Math.max(8, Math.min(containerSize.height - 250, y - 240));

        return (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border border-[#012d1d]/30 p-2.5 w-[270px] animate-scale-up interactive-card select-text"
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
                onClick={() => onSelectLocation(null)}
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

            {/* Spot Label & Item Notes Badges */}
            {activeLocation.spotLabel && (
              <div className="bg-[#e8f5e9] border border-[#a0f4c8] rounded-md px-2 py-1 text-[11px] font-bold text-[#0e6c4a] flex items-center justify-between my-1">
                <span>📍 {activeLocation.spotLabel}</span>
                {activeLocation.spotNotes && (
                  <span className="text-[#414844] italic font-normal text-[10px]">"{activeLocation.spotNotes}"</span>
                )}
              </div>
            )}
            {activeLocation.item.itemNotes && (
              <div className="bg-[#fffbeb] border border-[#fde68a] rounded-md px-2 py-1 text-[10px] text-[#92400e] my-1 flex items-start gap-1">
                <span className="font-bold shrink-0">📝 Note:</span>
                <span className="italic">{activeLocation.item.itemNotes}</span>
              </div>
            )}

            {/* Live Distance from User */}
            {distanceToActiveFeet !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-900 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>From Your Location:</span>
                </span>
                <span className="font-mono text-blue-800 bg-blue-100/90 px-1.5 py-0.5 rounded text-xs font-black">
                  {formatDistanceFeet(distanceToActiveFeet)}
                </span>
              </div>
            )}

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
                  <span>Drop Pin in Maps</span>
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

      {/* Floating Zoom, Location & Navigation Controls Stack */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5 shadow-xl bg-black/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={() => setZoom(prev => Math.min(prev + 1, 21))}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#0e6c4a] text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow-sm"
          title="Zoom In (Deep Yard View up to 21x)"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Current Zoom Level Badge */}
        <div className="text-[11px] font-mono text-center text-[#a0f4c8] font-black py-0.5 select-none">
          {zoom}x
        </div>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={() => setZoom(prev => Math.max(prev - 1, 13))}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#0e6c4a] text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow-sm"
          title="Zoom Out"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="w-full h-px bg-white/20 my-0.5" />

        {/* Center on My Location Button */}
        <button
          type="button"
          onClick={onRequestUserLocation}
          className={`w-9 h-9 rounded-xl text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm ${
            userLocation 
              ? 'bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400' 
              : isLocatingUser 
                ? 'bg-amber-600 animate-pulse text-white' 
                : 'bg-white/10 hover:bg-[#0e6c4a] text-white/90'
          }`}
          title={userLocation ? 'Center map on your current GPS location' : 'Locate where you are in the nursery'}
        >
          <LocateFixed className="w-5 h-5" />
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
  const [centerOnUserCount, setCenterOnUserCount] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; heading?: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [gpsLogSuccess, setGpsLogSuccess] = useState<string | null>(null);
  
  // Modal size & layout state
  const [isLargerModal, setIsLargerModal] = useState<boolean>(false);
  const [isPlantListCollapsed, setIsPlantListCollapsed] = useState<boolean>(false);

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

  // Parse GPS coordinates for each plant (including multiple spots per plant)
  const parsedLocations = useMemo<ParsedPlantLocation[]>(() => {
    const list: ParsedPlantLocation[] = [];

    effectiveItems.forEach((item, index) => {
      // If item or master plant has multiple GPS locations logged
      const multiLocations = (item.gpsLocations && item.gpsLocations.length > 0)
        ? item.gpsLocations
        : (item.plant.gpsLocations && item.plant.gpsLocations.length > 0 ? item.plant.gpsLocations : null);

      if (multiLocations && multiLocations.length > 0) {
        multiLocations.forEach((loc, spotIdx) => {
          list.push({
            item,
            lat: loc.latitude,
            lng: loc.longitude,
            accuracy: loc.accuracy,
            formattedCoords: formatGpsCoordinates(loc.latitude, loc.longitude, loc.accuracy),
            hasExplicitGps: true,
            timestamp: loc.timestamp,
            spotLabel: loc.label || `Spot #${spotIdx + 1}`,
            spotNotes: loc.notes,
            spotIndex: spotIdx + 1
          });
        });
        return;
      }

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

      list.push({
        item,
        lat,
        lng,
        accuracy,
        formattedCoords,
        hasExplicitGps,
        timestamp
      });
    });

    return list;
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
  }, [currentActiveLocation]);

  // AUTO-ACQUIRE AND WATCH USER LOCATION WHEN MAP OPENS
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLocatingUser(true);

    // Initial multi-sample high-precision acquisition
    acquireHighPrecisionGps({
      maxWaitMs: 5000,
      targetAccuracyMeters: 8
    })
      .then(fix => {
        if (!isMounted) return;
        setUserLocation({
          lat: fix.latitude,
          lng: fix.longitude,
          accuracy: fix.accuracy
        });
      })
      .catch(err => {
        console.warn('Initial GPS acquisition note:', err);
      })
      .finally(() => {
        if (isMounted) setIsLocatingUser(false);
      });

    // Real-time live watch position for walking around the nursery
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMounted) return;
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? undefined
          });
        },
        (err) => {
          console.warn('Geolocation watch note:', err);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }

    return () => {
      isMounted = false;
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen]);

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

  const handleCenterOrAcquireUserLocation = async () => {
    if (userLocation) {
      setCenterOnUserCount(prev => prev + 1);
      return;
    }
    setIsLocatingUser(true);
    try {
      const fix = await acquireHighPrecisionGps({
        targetAccuracyFeet: 14
      });
      setUserLocation({
        lat: fix.latitude,
        lng: fix.longitude,
        accuracy: fix.accuracy
      });
      setCenterOnUserCount(prev => prev + 1);
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
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center overflow-y-auto animate-fade-in ${
        isLargerModal ? 'p-0' : 'p-1 sm:p-2 md:p-3 pt-1 sm:pt-2 md:pt-3'
      }`}
      onClick={onClose}
    >
      <div 
        className={`bg-white shadow-2xl border border-[#c1c8c2] flex flex-col overflow-hidden animate-scale-up transition-all duration-200 mt-0 sm:mt-1 mb-auto ${
          isLargerModal 
            ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
            : 'rounded-2xl max-w-6xl w-full h-[96vh] sm:h-[94vh] max-h-[960px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#012d1d] text-white px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center border-b border-[#0e6c4a] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#a0f4c8]/20 border border-[#a0f4c8]/30 flex items-center justify-center text-[#a0f4c8] shrink-0 shadow-2xs">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce-short" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Yard GPS Map • Sub-Meter Plant Locator
                </h3>
                <span className="bg-[#a0f4c8] text-[#002113] text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-2xs">
                  <Radio className="w-2.5 h-2.5 text-[#0e6c4a] animate-pulse" />
                  {loggedCount} of {parsedLocations.length} Logged
                </span>
                {userLocation && (
                  <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                    <span>Your GPS Active</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/80 truncate hidden xs:block">
                {customerName ? `${customerName} • ` : ''}
                {orderId ? `Order #${orderId} • ` : ''}
                Deep Satellite Zoom (21x) & Live Yard Beacon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Toggle Larger Fullscreen / Standard Pop-up view */}
            <button
              type="button"
              onClick={() => setIsLargerModal(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                isLargerModal
                  ? 'bg-[#a0f4c8] text-[#002113] border-[#a0f4c8]'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title={isLargerModal ? 'Return to standard pop-up view' : 'Enlarge map to full screen'}
            >
              {isLargerModal ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Standard Pop-up</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#a0f4c8]" />
                  <span className="hidden sm:inline">Enlarge Map</span>
                </>
              )}
            </button>

            {/* Drop Pin in Google Maps Satellite View */}
            <button
              type="button"
              onClick={handleOpenActiveInGoogleMaps}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a0f4c8]/20 hover:bg-[#a0f4c8] text-[#a0f4c8] hover:text-[#002113] border border-[#a0f4c8]/40 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Drop exact red pin for selected plant in Google Maps Satellite view"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Close Map Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: MOBILE-FIRST RESPONSIVE SPLIT VIEW 
            - On Mobile: Map is on top with large dominant height; plant list sits below map.
            - On Desktop (md+): Map is on the left, plant list is on the right sidebar.
        */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          
          {/* MAP CANVAS VIEW */}
          <div className={`relative flex flex-col bg-[#1b382b] overflow-hidden transition-all duration-200 ${
            isPlantListCollapsed 
              ? 'flex-1 h-full' 
              : 'flex-[3] sm:flex-[3] min-h-[52vh] sm:min-h-[58vh] md:min-h-0 md:flex-1 h-full'
          }`}>
            
            {/* Top Interactive Controls Toolbar */}
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none gap-2">
              
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
                  <span className="hidden xs:inline">Hybrid</span>
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
                  <span className="hidden xs:inline">Roadmap</span>
                </button>
              </div>

              {/* Action Buttons: Fit Bounds & My Location */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                {/* Fit All Pins button */}
                <button
                  type="button"
                  onClick={() => setFitBoundsCount(prev => prev + 1)}
                  className="px-2.5 py-1.5 bg-black/80 hover:bg-[#0e6c4a] backdrop-blur-md text-[#a0f4c8] hover:text-white rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer"
                  title="Fit all plant markers into view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fit All Pins</span>
                </button>

                {/* Center on User button */}
                <button
                  type="button"
                  onClick={handleCenterOrAcquireUserLocation}
                  className={`px-2.5 py-1.5 bg-black/80 hover:bg-[#0e6c4a] backdrop-blur-md rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer ${
                    userLocation 
                      ? 'text-blue-300 hover:text-white' 
                      : isLocatingUser 
                        ? 'animate-pulse text-amber-300' 
                        : 'text-[#a0f4c8] hover:text-white'
                  }`}
                  title="Center map on your live GPS location"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isLocatingUser ? 'Locking GPS...' : userLocation ? 'My Location' : 'Locate Me'}
                  </span>
                </button>

                {/* Mobile Toggle Plant List (Expands Map to 100%) */}
                <button
                  type="button"
                  onClick={() => setIsPlantListCollapsed(prev => !prev)}
                  className="md:hidden px-2.5 py-1.5 bg-black/80 hover:bg-[#0e6c4a] backdrop-blur-md text-[#a0f4c8] hover:text-white rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer"
                  title={isPlantListCollapsed ? 'Show plants list below map' : 'Maximize map space (Hide list)'}
                >
                  {isPlantListCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{isPlantListCollapsed ? 'Show List' : 'Full Map'}</span>
                </button>
              </div>
            </div>

            {/* MAP CONTAINER */}
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
                centerOnUserTrigger={centerOnUserCount}
                onLogGPS={onLogGPS ? (id) => handleLogPlantGpsOnTheSpot(id) : undefined}
                onCopyCoords={handleCopyCoords}
                copiedCoords={copiedCoords}
                onOpenGoogleMapsPin={handleOpenGoogleMapsPin}
                onOpenGoogleMapsWalking={handleOpenGoogleMapsWalking}
                onRequestUserLocation={handleCenterOrAcquireUserLocation}
                isLocatingUser={isLocatingUser}
              />
            </div>

            {/* Bottom Floating Live Coordinates & Plant Distance Bar */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 text-white text-[10px] sm:text-xs font-mono flex items-center gap-1.5 shadow-lg">
                <Radio className="w-3 h-3 text-[#a0f4c8] animate-pulse" />
                <span className="truncate">
                  {currentActiveLocation ? currentActiveLocation.formattedCoords : `${DEFAULT_NURSERY_CENTER.lat.toFixed(5)}° N, ${Math.abs(DEFAULT_NURSERY_CENTER.lng).toFixed(5)}° W`}
                </span>
              </div>
            </div>

            {/* Floating button on mobile when list is collapsed to quickly show it */}
            {isPlantListCollapsed && (
              <div className="absolute bottom-3 right-16 z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsPlantListCollapsed(false)}
                  className="px-3 py-1.5 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] rounded-xl shadow-2xl border border-[#a0f4c8]/50 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Show Plant List ({parsedLocations.length})</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* PLANTS LIST: PLACED BELOW MAP ON MOBILE, AND IN THE RIGHT SIDEBAR ON DESKTOP */}
          {!isPlantListCollapsed && (
            <div className="w-full md:w-80 lg:w-96 bg-[#f8f9f5] border-t md:border-t-0 md:border-l border-[#c1c8c2] flex flex-col flex-[2] md:flex-initial md:h-full shrink-0 min-h-0 overflow-hidden">
              
              {/* Header & Filter Tabs */}
              <div className="p-2 sm:p-3 bg-white border-b border-[#c1c8c2] flex flex-col gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#0e6c4a]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#012d1d]">
                      Plants in Order ({parsedLocations.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#0e6c4a]">
                      {loggedCount} with GPS
                    </span>
                    {/* Minimize list button on mobile */}
                    <button
                      type="button"
                      onClick={() => setIsPlantListCollapsed(true)}
                      className="md:hidden p-1 rounded hover:bg-[#f3f4f0] text-[#717973] hover:text-[#1a1c1a]"
                      title="Hide list to make map larger"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
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

              {/* Scrollable Plant List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 flex flex-col gap-2 min-h-0">
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
                    
                    // Distance from user to this specific plant
                    const itemDistanceFeet = userLocation 
                      ? calculateDistanceFeet(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
                      : null;

                    return (
                      <div
                        key={loc.item.plant.id}
                        onClick={() => {
                          setActiveItem(loc.item);
                          setInfoWindowItem(loc);
                        }}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-[#012d1d]/5 border-[#012d1d] shadow-sm ring-2 ring-[#012d1d]/20'
                            : 'bg-white hover:bg-[#f3f4f0] border-[#c1c8c2]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <img
                            src={loc.item.plant.image || DEFAULT_PLANT_IMAGE}
                            alt={loc.item.plant.name}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover bg-[#f3f4f0] border border-[#c1c8c2] shrink-0"
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

                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[10px] sm:text-[11px] text-[#717973]">
                              <span className="truncate font-mono">#{loc.item.plant.itemNo || loc.item.plant.barcode}</span>
                              <span>•</span>
                              <span>{loc.item.plant.size || 'Standard'}</span>
                              {itemDistanceFeet !== null && (
                                <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                  <Navigation className="w-2.5 h-2.5" />
                                  {formatDistanceFeet(itemDistanceFeet)} away
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* GPS Badge & Quick Action */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e2e3df] text-[10px] sm:text-[11px]">
                          {isExplicit ? (
                            <div className="flex items-center gap-1 text-[#0e6c4a] font-mono font-bold truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0e6c4a] shrink-0" />
                              <span className="truncate">{loc.formattedCoords}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[#717973] italic">
                              <AlertCircle className="w-3 h-3 text-[#717973] shrink-0" />
                              <span>Estimated yard area</span>
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

              {/* Quick Actions Footer inside plant drawer */}
              <div className="p-2 sm:p-2.5 bg-white border-t border-[#c1c8c2] flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenActiveInGoogleMaps}
                  className="w-full bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white font-extrabold py-2 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 text-xs cursor-pointer border border-[#a0f4c8]/30"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Drop Active Plant in Google Maps</span>
                </button>

                {currentActiveLocation && (
                  <button
                    type="button"
                    onClick={() => handleOpenGoogleMapsWalking(currentActiveLocation.lat, currentActiveLocation.lng)}
                    className="w-full bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-[#c1c8c2]"
                  >
                    <Footprints className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    <span>Walking Directions from My Location</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#f3f4f0] px-3 sm:px-4 py-2 sm:py-2.5 border-t border-[#c1c8c2] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#414844]">
            <Building className="w-4 h-4 text-[#0e6c4a]" />
            <span className="hidden sm:inline">Maple Lane Nursery • High-Precision GPS Plant Locator (Sub-Meter Satellite Accuracy)</span>
            <span className="sm:hidden">Yard GPS Locator</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 sm:px-6 sm:py-2 bg-[#0e6c4a] hover:bg-[#0b5338] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Close Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
