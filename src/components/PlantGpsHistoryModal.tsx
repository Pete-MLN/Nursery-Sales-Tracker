import React, { useState } from 'react';
import { PlantItem, GPSLocationEntry } from '../types';
import { 
  getPlantGpsYearStatus, 
  getPlantGpsHistory, 
  formatGpsCoordinates, 
  formatGpsDateString,
  getGpsAccuracyRating,
  acquireHighPrecisionGps,
  generateGoogleMapsPinUrl,
  generateGoogleMapsWalkingUrl
} from '../utils/gpsUtils';
import { savePlantToFirestore } from '../services/firebaseService';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  X, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Calendar, 
  ChevronRight,
  Crosshair,
  Building,
  Edit2
} from 'lucide-react';

interface PlantGpsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: PlantItem | null;
  onUpdatePlant?: (updatedPlant: PlantItem) => void;
  onOpenGpsMap?: (plant: PlantItem, specificLocation?: GPSLocationEntry) => void;
}

export const PlantGpsHistoryModal: React.FC<PlantGpsHistoryModalProps> = ({
  isOpen,
  onClose,
  plant,
  onUpdatePlant,
  onOpenGpsMap
}) => {
  const [isLoggingGps, setIsLoggingGps] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('');
  const [copiedSpotId, setCopiedSpotId] = useState<string | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState<boolean>(false);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [manualLabel, setManualLabel] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');

  if (!isOpen || !plant) return null;

  const currentYear = new Date().getFullYear();
  const yearStatus = getPlantGpsYearStatus(plant, currentYear);
  const allHistory = yearStatus.history;

  // Handle high-precision GPS tag capture
  const handleTagCurrentGps = async () => {
    setIsLoggingGps(true);
    setGpsStatusText('Acquiring high-precision satellite lock...');
    try {
      const fix = await acquireHighPrecisionGps({
        targetAccuracyFeet: 14,
        onProgress: (status) => setGpsStatusText(status.message)
      });

      const newSpotIndex = allHistory.length + 1;
      const newEntry: GPSLocationEntry = {
        id: `gps-spot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp,
        label: newSpotIndex === 1 && plant.holdingLocation ? `Bay ${plant.holdingLocation}` : `Spot #${newSpotIndex}`
      };

      const updatedLocations: GPSLocationEntry[] = [newEntry, ...allHistory];
      const updatedPlant: PlantItem = {
        ...plant,
        gpsLocation: {
          latitude: newEntry.latitude,
          longitude: newEntry.longitude,
          accuracy: newEntry.accuracy,
          timestamp: newEntry.timestamp
        },
        gpsLocations: updatedLocations
      };

      if (onUpdatePlant) {
        onUpdatePlant(updatedPlant);
      }
      await savePlantToFirestore(updatedPlant);
    } catch (err) {
      console.warn('GPS acquisition error:', err);
    } finally {
      setIsLoggingGps(false);
      setGpsStatusText('');
    }
  };

  // Handle re-tagging a specific existing spot with fresh coordinates
  const handleRetagSpot = async (spotId: string) => {
    setIsLoggingGps(true);
    setGpsStatusText('Updating satellite lock for this spot...');
    try {
      const fix = await acquireHighPrecisionGps({
        targetAccuracyFeet: 14,
        onProgress: (status) => setGpsStatusText(status.message)
      });

      const updatedLocations = allHistory.map(loc => {
        if (loc.id === spotId) {
          return {
            ...loc,
            latitude: fix.latitude,
            longitude: fix.longitude,
            accuracy: fix.accuracy,
            timestamp: fix.timestamp
          };
        }
        return loc;
      });

      const primary = updatedLocations[0];
      const updatedPlant: PlantItem = {
        ...plant,
        gpsLocation: primary ? {
          latitude: primary.latitude,
          longitude: primary.longitude,
          accuracy: primary.accuracy,
          timestamp: primary.timestamp
        } : undefined,
        gpsLocations: updatedLocations
      };

      if (onUpdatePlant) {
        onUpdatePlant(updatedPlant);
      }
      await savePlantToFirestore(updatedPlant);
    } catch (err) {
      console.warn('GPS retag error:', err);
    } finally {
      setIsLoggingGps(false);
      setGpsStatusText('');
    }
  };

  // Add manual coordinate spot
  const handleAddManualSpot = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) return;

    const newSpotIndex = allHistory.length + 1;
    const newEntry: GPSLocationEntry = {
      id: `gps-spot-manual-${Date.now()}`,
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      timestamp: new Date().toISOString(),
      label: manualLabel.trim() || `Spot #${newSpotIndex}`,
      notes: manualNotes.trim() || undefined
    };

    const updatedLocations = [newEntry, ...allHistory];
    const updatedPlant: PlantItem = {
      ...plant,
      gpsLocation: {
        latitude: newEntry.latitude,
        longitude: newEntry.longitude,
        accuracy: newEntry.accuracy,
        timestamp: newEntry.timestamp
      },
      gpsLocations: updatedLocations
    };

    if (onUpdatePlant) {
      onUpdatePlant(updatedPlant);
    }
    await savePlantToFirestore(updatedPlant);

    setManualLat('');
    setManualLng('');
    setManualLabel('');
    setManualNotes('');
    setIsManualDrawerOpen(false);
  };

  // Delete a specific spot
  const handleDeleteSpot = async (spotId: string) => {
    const filtered = allHistory.filter(s => s.id !== spotId);
    const primary = filtered[0];

    const updatedPlant: PlantItem = {
      ...plant,
      gpsLocation: primary ? {
        latitude: primary.latitude,
        longitude: primary.longitude,
        accuracy: primary.accuracy,
        timestamp: primary.timestamp
      } : undefined,
      gpsLocations: filtered.length > 0 ? filtered : undefined
    };

    if (onUpdatePlant) {
      onUpdatePlant(updatedPlant);
    }
    await savePlantToFirestore(updatedPlant);
  };

  // Save spot label edit
  const handleSaveLabel = async (spotId: string) => {
    if (!editingLabel.trim()) return;
    const updatedLocations = allHistory.map(loc => {
      if (loc.id === spotId) {
        return { ...loc, label: editingLabel.trim() };
      }
      return loc;
    });

    const updatedPlant: PlantItem = {
      ...plant,
      gpsLocations: updatedLocations
    };

    if (onUpdatePlant) {
      onUpdatePlant(updatedPlant);
    }
    await savePlantToFirestore(updatedPlant);
    setEditingSpotId(null);
  };

  // Copy coordinates to clipboard
  const handleCopyCoords = (spotId: string, lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedSpotId(spotId);
    setTimeout(() => setCopiedSpotId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-[#c1c8c2] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#012d1d] text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={plant.image || DEFAULT_PLANT_IMAGE}
              alt={plant.name}
              className="w-13 h-13 rounded-2xl object-cover shrink-0 border border-[#a0f4c8]/30 shadow-xs"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {plant.itemNo && (
                  <span className="bg-[#a0f4c8] text-[#012d1d] font-mono text-[10px] font-black px-2 py-0.5 rounded-md">
                    #{plant.itemNo}
                  </span>
                )}
                {plant.size && (
                  <span className="bg-white/20 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    {plant.size}
                  </span>
                )}
                {plant.holdingLocation && (
                  <span className="bg-[#0e6c4a] text-[#a0f4c8] text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Loc: {plant.holdingLocation}
                  </span>
                )}
              </div>
              <h2 className="font-extrabold text-base sm:text-lg text-white truncate mt-1">
                {plant.name}
              </h2>
              {plant.botanicalName && plant.botanicalName !== plant.name && (
                <p className="text-xs italic text-[#a0f4c8]/90 truncate">
                  {plant.botanicalName}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close GPS Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4 bg-[#f9faf6]">
          {/* GPS STATUS THIS YEAR BANNER */}
          {yearStatus.isTaggedThisYear ? (
            <div className="bg-[#e8f5e9] border-2 border-emerald-500 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6 text-[#a0f4c8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-700 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    GPS Tagged in {currentYear}
                  </span>
                  <span className="text-xs font-bold text-emerald-900">
                    {yearStatus.thisYearCount} {yearStatus.thisYearCount === 1 ? 'location' : 'locations'} tagged this year
                  </span>
                </div>
                <p className="text-xs text-emerald-900 mt-1 font-medium">
                  Verified in current {currentYear} season. Most recent tag: <span className="font-bold">{yearStatus.latestDateFormatted}</span>.
                </p>
              </div>
            </div>
          ) : yearStatus.hasAnyGps ? (
            <div className="bg-[#fef9c3] border-2 border-amber-500 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Not Tagged in {currentYear}
                  </span>
                  <span className="text-xs font-bold text-amber-900">
                    Last tagged in {yearStatus.latestYear || 'prior season'} ({yearStatus.latestDateFormatted})
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-1 font-medium">
                  This plant has older GPS records on file, but has not yet been tagged in {currentYear}. Tag current GPS while standing near the plant in the yard to confirm its {currentYear} location.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#f3f4f0] border-2 border-[#c1c8c2] rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-xs">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-[#012d1d] text-[#a0f4c8] text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    No GPS Recorded Yet
                  </span>
                  <span className="text-xs font-bold text-[#414844]">
                    Not Tagged in {currentYear}
                  </span>
                </div>
                <p className="text-xs text-[#414844] mt-1 font-medium">
                  No yard coordinates recorded yet. Tap "📍 Tag Yard GPS Now" when standing next to the plants to log high-precision satellite coordinates for this plant.
                </p>
              </div>
            </div>
          )}

          {/* PRIMARY ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Show on Nursery GPS Map CTA Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenGpsMap) {
                  onOpenGpsMap(plant);
                }
              }}
              disabled={allHistory.length === 0}
              className={`p-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer border ${
                allHistory.length > 0
                  ? 'bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white border-[#012d1d] active:scale-[0.99]'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
              }`}
              title={allHistory.length > 0 ? "Show all locations on interactive satellite yard map" : "Tag GPS first to view on map"}
            >
              <Layers className="w-5 h-5 text-[#a0f4c8]" />
              <div className="text-left">
                <div className="leading-tight">🗺️ Show Locations on GPS Map</div>
                <div className="text-[11px] font-normal text-white/80">
                  {allHistory.length > 0 
                    ? `Interactive satellite view (${allHistory.length} spot${allHistory.length === 1 ? '' : 's'})` 
                    : 'No coordinates logged yet'}
                </div>
              </div>
            </button>

            {/* Tag GPS Satellite CTA Button */}
            <button
              type="button"
              onClick={handleTagCurrentGps}
              disabled={isLoggingGps}
              className="p-3.5 bg-[#0e6c4a] hover:bg-[#012d1d] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer border border-[#0e6c4a] active:scale-[0.99]"
              title="Acquires sub-meter high-precision satellite coordinates and saves to plant record"
            >
              {isLoggingGps ? (
                <RefreshCw className="w-5 h-5 animate-spin text-[#a0f4c8]" />
              ) : (
                <Navigation className="w-5 h-5 text-[#a0f4c8]" />
              )}
              <div className="text-left">
                <div className="leading-tight">
                  {isLoggingGps ? (gpsStatusText || 'Locking Satellite...') : '📍 Tag Current GPS Location Now'}
                </div>
                <div className="text-[11px] font-normal text-white/80">
                  {yearStatus.isTaggedThisYear ? '+ Add another yard spot' : `Mark tagged for ${currentYear}`}
                </div>
              </div>
            </button>
          </div>

          {/* Quick Manual Entry Drawer Toggle */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#c1c8c2]/50">
            <span className="text-xs font-black text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0e6c4a]" />
              <span>Recorded GPS Spots & History ({allHistory.length})</span>
            </span>

            <button
              type="button"
              onClick={() => setIsManualDrawerOpen(!isManualDrawerOpen)}
              className="text-xs font-bold text-[#0e6c4a] hover:text-[#012d1d] hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isManualDrawerOpen ? 'Close Drawer' : 'Add Custom Spot'}</span>
            </button>
          </div>

          {/* Manual Entry Drawer */}
          {isManualDrawerOpen && (
            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-sm flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#012d1d] uppercase tracking-wider">
                  Add Custom Yard Spot Coordinates
                </span>
                <span className="text-[11px] text-[#717973]">Enter lat/lng or select zone</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#414844] block mb-0.5">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g. 43.14820"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#012d1d] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#414844] block mb-0.5">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g. -79.46230"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#012d1d] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#414844] block mb-0.5">Spot Name / Yard Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Bed 4B, Greenhouse 2, West Shade Bay"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3 py-1.5 text-xs font-medium text-[#012d1d] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#414844] block mb-0.5">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 15 pots on gravel row 3"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3 py-1.5 text-xs font-medium text-[#012d1d] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {['Greenhouse 1', 'Greenhouse 2', 'Bed 3', 'Bed 4', 'Bed 5', 'Shade Bay', 'Holding Bay'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setManualLabel(preset)}
                    className="text-[11px] font-bold bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#0e6c4a] px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddManualSpot}
                disabled={!manualLat || !manualLng}
                className="w-full bg-[#012d1d] hover:bg-[#0e6c4a] disabled:opacity-50 text-[#a0f4c8] py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Save Spot Coordinates
              </button>
            </div>
          )}

          {/* CHRONOLOGICAL HISTORY LIST */}
          {allHistory.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#c1c8c2] flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f0] flex items-center justify-center">
                <MapPin className="w-6 h-6 text-[#717973]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#012d1d]">No GPS Coordinates Logged Yet</p>
                <p className="text-xs text-[#717973] mt-1 max-w-sm">
                  Tagging plants with GPS creates a satellite map pin so nursery staff can immediately locate plants in the right yard area.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTagCurrentGps}
                disabled={isLoggingGps}
                className="px-4 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>Tag First GPS Location</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allHistory.map((loc, index) => {
                const rating = getGpsAccuracyRating(loc.accuracy);
                const locYear = loc.timestamp ? new Date(loc.timestamp).getFullYear() : undefined;
                const isThisYear = locYear === currentYear;
                const googlePinUrl = generateGoogleMapsPinUrl(loc.latitude, loc.longitude, `${plant.name} - ${loc.label || `Spot #${index + 1}`}`);
                const googleWalkingUrl = generateGoogleMapsWalkingUrl(loc.latitude, loc.longitude);
                const isEditing = editingSpotId === loc.id;

                return (
                  <div
                    key={loc.id || `spot-${index}`}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs flex flex-col gap-3 ${
                      isThisYear
                        ? 'border-emerald-300 hover:border-emerald-500'
                        : 'border-[#c1c8c2] hover:border-[#717973]'
                    }`}
                  >
                    {/* Spot Header */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="bg-[#012d1d] text-[#a0f4c8] font-black text-xs px-2.5 py-0.5 rounded-lg shrink-0">
                          #{index + 1}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="bg-[#f3f4f0] border border-[#012d1d] rounded-lg px-2 py-0.5 text-xs font-extrabold text-[#012d1d] w-40"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveLabel(loc.id)}
                              className="bg-[#012d1d] text-[#a0f4c8] px-2 py-0.5 rounded text-[10px] font-black cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSpotId(null)}
                              className="text-gray-500 hover:text-gray-700 text-[10px] font-bold px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <h4 className="font-black text-sm text-[#012d1d]">
                              {loc.label || `Spot #${index + 1}`}
                            </h4>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSpotId(loc.id);
                                setEditingLabel(loc.label || `Spot #${index + 1}`);
                              }}
                              className="text-[#717973] hover:text-[#012d1d] p-1 rounded hover:bg-[#f3f4f0] cursor-pointer"
                              title="Edit spot name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* YEAR BADGE */}
                        {isThisYear ? (
                          <span className="bg-[#e8f5e9] text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Tagged in {currentYear}</span>
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Tagged in {locYear || 'Prior Season'}</span>
                          </span>
                        )}
                      </div>

                      {/* Tag Date & Time */}
                      <div className="flex items-center gap-1 text-xs font-bold text-[#414844] bg-[#f3f4f0] px-2.5 py-1 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-[#0e6c4a]" />
                        <span>{formatGpsDateString(loc.timestamp)}</span>
                      </div>
                    </div>

                    {/* Coordinates & Accuracy */}
                    <div className="flex items-center justify-between gap-2 flex-wrap bg-[#f9faf6] p-2.5 rounded-xl border border-[#e2e3df]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#0e6c4a] shrink-0" />
                        <span className="font-mono text-xs font-black text-[#012d1d]">
                          {formatGpsCoordinates(loc.latitude, loc.longitude, loc.accuracy)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${rating.badgeClass}`}>
                          {rating.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyCoords(loc.id, loc.latitude, loc.longitude)}
                          className="text-[#717973] hover:text-[#012d1d] p-1 rounded hover:bg-white transition-colors cursor-pointer"
                          title="Copy GPS coordinates"
                        >
                          {copiedSpotId === loc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {loc.notes && (
                      <p className="text-xs text-[#414844] italic px-1">
                        Notes: {loc.notes}
                      </p>
                    )}

                    {/* Actions for this spot */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f3f4f0] flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Show on Nursery GPS Map */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenGpsMap) {
                              onOpenGpsMap(plant, loc);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="View this location on interactive satellite yard map"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#a0f4c8]" />
                          <span>Show on Map</span>
                        </button>

                        {/* Open Google Maps Pin */}
                        <a
                          href={googlePinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-white hover:bg-[#f3f4f0] text-[#012d1d] border border-[#c1c8c2] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Open satellite pin directly in Google Maps app"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#0e6c4a]" />
                          <span>Google Maps</span>
                        </a>

                        {/* Walking Directions */}
                        <a
                          href={googleWalkingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-white hover:bg-[#f3f4f0] text-[#012d1d] border border-[#c1c8c2] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Walking directions from current location"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span>Walking Route</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Retag Spot */}
                        <button
                          type="button"
                          onClick={() => handleRetagSpot(loc.id)}
                          disabled={isLoggingGps}
                          className="text-xs font-bold text-[#0e6c4a] hover:bg-[#e8f5e9] px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Re-tag current GPS coordinates for this specific spot"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retag</span>
                        </button>

                        {/* Delete Spot */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSpot(loc.id)}
                          className="text-[#ba1a1a] hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete this GPS spot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#c1c8c2] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#717973] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0e6c4a]" />
            <span>
              {allHistory.length} total GPS {allHistory.length === 1 ? 'spot' : 'spots'} on file
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#012d1d] hover:bg-[#0e6c4a] text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
