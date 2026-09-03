import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ScreenType, 
  PlantItem, 
  HoldingArea, 
  User, 
  InventoryCountItem, 
  InventoryAuditSession 
} from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  acquireHighPrecisionGps, 
  formatGpsCoordinates, 
  getGpsAccuracyRating 
} from '../utils/gpsUtils';
import { 
  consolidateAuditItems, 
  calculateAuditSummaryStats, 
  downloadAuditCsv, 
  generateAuditEmailReport, 
  createAuditMailtoUrl 
} from '../utils/auditUtils';
import { 
  saveAuditSessionToFirestore, 
  deleteAuditSessionFromFirestore 
} from '../services/firebaseService';
import { PlantMapModal } from './PlantMapModal';
import { BrowserMultiFormatReader } from '@zxing/library';
import { 
  Plus, 
  Minus, 
  Search, 
  MapPin, 
  Barcode, 
  Camera, 
  Check, 
  X, 
  Mail, 
  Download, 
  Copy, 
  Printer, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Package, 
  Trash2, 
  Edit3, 
  Filter, 
  Send, 
  History, 
  Sparkles, 
  PlusCircle, 
  ArrowLeft, 
  Info,
  Calendar,
  Building2,
  ExternalLink
} from 'lucide-react';

import { OFFICIAL_YARD_LOCATIONS } from '../data/yardLocations';

interface InventoryAuditScreenProps {
  onNavigate: (screen: ScreenType) => void;
  inventory: PlantItem[];
  holdingAreas?: HoldingArea[];
  currentUser: User;
  auditSessions: InventoryAuditSession[];
  onSaveAuditSession?: (session: InventoryAuditSession) => void;
}

export const InventoryAuditScreen: React.FC<InventoryAuditScreenProps> = ({
  onNavigate,
  inventory,
  holdingAreas = [],
  currentUser,
  auditSessions,
  onSaveAuditSession
}) => {
  const [activeTab, setActiveTab] = useState<'count' | 'history'>('count');
  
  // Local active session state
  const [activeSession, setActiveSession] = useState<InventoryAuditSession>(() => {
    // Check if there is an in-progress session in props or localStorage
    const saved = localStorage.getItem('maple_active_inventory_audit');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached audit session', e);
      }
    }
    const inProgress = auditSessions.find(s => s.status === 'in_progress');
    if (inProgress) return inProgress;

    const newId = `AUDIT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    return {
      id: newId,
      title: `Physical Inventory Count - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      countedBy: currentUser.name || 'Pete',
      items: []
    };
  });

  // Current Plant input & form state
  const [selectedPlant, setSelectedPlant] = useState<PlantItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  
  // Snapshot form fields
  const [manualItemNo, setManualItemNo] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualBotanical, setManualBotanical] = useState('');
  const [manualSize, setManualSize] = useState('3 GAL');
  const [manualCategory, setManualCategory] = useState('SHRUBS');
  const [manualPrice, setManualPrice] = useState<number>(29.99);
  const [manualMasterStock, setManualMasterStock] = useState<number>(0);

  // Counting parameters
  const [countedQty, setCountedQty] = useState<number>(1);
  const [qtyInputStr, setQtyInputStr] = useState<string>('1');
  const [countMode, setCountMode] = useState<'total' | 'cycle_additive'>('total');
  
  // Location selection & Area Category filtering (Persisted across entries)
  const [selectedAreaCategory, setSelectedAreaCategory] = useState<string>(() => {
    return localStorage.getItem('maple_last_audit_area_category') || 'All Areas';
  });

  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    const saved = localStorage.getItem('maple_last_audit_location');
    if (saved) return saved;
    const firstLoc = OFFICIAL_YARD_LOCATIONS.length > 0 ? `${OFFICIAL_YARD_LOCATIONS[0].title} - ${OFFICIAL_YARD_LOCATIONS[0].subtitle}`.trim() : 'H1-a - Front Retail';
    return firstLoc;
  });
  const [customLocationText, setCustomLocationText] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy?: number; timestamp: string } | undefined>(undefined);
  const [isLoggingGps, setIsLoggingGps] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState('');
  
  // Notes
  const [entryNotes, setEntryNotes] = useState('');

  // Modals & UI helpers
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryCountItem | null>(null);
  const [mapModalGps, setMapModalGps] = useState<{ latitude: number; longitude: number; title: string; subtitle?: string } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(currentUser.email || 'pete@maplelanenursery.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyPreview, setEmailBodyPreview] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  
  // Camera Barcode Scanner
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Table filter
  const [tableFilter, setTableFilter] = useState<'all' | 'discrepancies' | 'exact'>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Sync active session with localStorage and parent/Firestore
  const updateActiveSession = (updated: InventoryAuditSession) => {
    setActiveSession(updated);
    localStorage.setItem('maple_active_inventory_audit', JSON.stringify(updated));
    saveAuditSessionToFirestore(updated).catch(err => {
      console.warn('Could not sync audit session to Firestore (offline mode active):', err);
    });
    if (onSaveAuditSession) {
      onSaveAuditSession(updated);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  // Compile all available locations structured from official yard locations and holding areas
  const effectiveAreas: HoldingArea[] = holdingAreas.length > 0 ? holdingAreas : OFFICIAL_YARD_LOCATIONS;
  
  const categoryGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      'Retail': [],
      'B&B': [],
      'Barn Area': [],
      'Greenhouses': [],
      'Loading/Staging': [],
      'Other': []
    };

    effectiveAreas.forEach(a => {
      const label = `${a.title} - ${a.subtitle}`.trim();
      const cat = a.category && groups[a.category] ? a.category : 'Other';
      if (!groups[cat].includes(label)) {
        groups[cat].push(label);
      }
    });

    inventory.forEach(p => {
      if (p.holdingLocation) {
        const found = Object.values(groups).some(list => list.includes(p.holdingLocation!));
        if (!found) {
          groups['Other'].push(p.holdingLocation);
        }
      }
    });

    return groups;
  }, [effectiveAreas, inventory]);

  const combinedLocations = useMemo(() => {
    return Array.from(new Set(Object.values(categoryGroups).flat())).filter(Boolean);
  }, [categoryGroups]);

  // Available categories list
  const availableCategories = useMemo(() => {
    const mainCategories = ['All Areas', 'Retail', 'B&B', 'Barn Area', 'Greenhouses', 'Loading/Staging'];
    const otherCategories = Object.keys(categoryGroups).filter(
      c => !mainCategories.includes(c) && (categoryGroups[c]?.length || 0) > 0
    );
    return [...mainCategories, ...otherCategories];
  }, [categoryGroups]);

  // Filtered locations based on selected area category
  const displayedLocations = useMemo(() => {
    if (selectedAreaCategory === 'All Areas') {
      return combinedLocations;
    }
    return categoryGroups[selectedAreaCategory] || [];
  }, [selectedAreaCategory, categoryGroups, combinedLocations]);

  // Handle category change and auto-adjust location if needed
  const handleCategoryChange = (newCat: string) => {
    setSelectedAreaCategory(newCat);
    localStorage.setItem('maple_last_audit_area_category', newCat);

    const validLocs = newCat === 'All Areas'
      ? combinedLocations
      : (categoryGroups[newCat] || []);

    if (validLocs.length > 0 && !validLocs.includes(selectedLocation)) {
      const nextLoc = validLocs[0];
      setSelectedLocation(nextLoc);
      localStorage.setItem('maple_last_audit_location', nextLoc);
    }
  };

  const handleLocationChange = (newLoc: string) => {
    setSelectedLocation(newLoc);
    localStorage.setItem('maple_last_audit_location', newLoc);
  };

  // Filtered plant search results
  const filteredPlants = searchQuery.trim() === '' ? [] : inventory.filter(p => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const botMatch = (p.botanicalName || '').toLowerCase().includes(q);
    const itemNoMatch = (p.itemNo || '').toLowerCase().includes(q);
    const barcodeMatch = (p.barcode || '').toLowerCase().includes(q);
    const sizeMatch = (p.size || '').toLowerCase().includes(q);
    return nameMatch || botMatch || itemNoMatch || barcodeMatch || sizeMatch;
  }).slice(0, 10);

  // Select plant handler
  const handleSelectPlant = (plant: PlantItem) => {
    setSelectedPlant(plant);
    setIsSearchOpen(false);
    setSearchQuery('');
    setIsManualEntry(false);
    
    // Autofill initial GPS if plant already has one
    if (plant.gpsLocation) {
      setGpsLocation(plant.gpsLocation);
    }
    // Autofill location if plant has one
    if (plant.holdingLocation && combinedLocations.includes(plant.holdingLocation)) {
      setSelectedLocation(plant.holdingLocation);
    }
  };

  // GPS Acquisition
  const handleCaptureGps = async () => {
    setIsLoggingGps(true);
    setGpsStatusText('Acquiring high-precision satellite lock...');
    try {
      const fix = await acquireHighPrecisionGps({
        maxWaitMs: 4500,
        targetAccuracyMeters: 4.5,
        onProgress: (status) => setGpsStatusText(status.message)
      });
      setGpsLocation({
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp
      });
      setGpsStatusText(`Locked (±${Math.round(fix.accuracy * 3.28084)} ft accuracy)`);
      showToast(`📍 GPS Coordinates Locked (±${Math.round(fix.accuracy * 3.28084)} ft)`);
    } catch (err: any) {
      console.warn('GPS acquisition error:', err);
      setGpsStatusText('Could not get precise lock');
      showToast('GPS lock failed. Ensure location permissions are granted.');
    } finally {
      setIsLoggingGps(false);
    }
  };

  // Barcode Camera Scanner setup
  const startCameraScanner = async () => {
    setIsCameraOpen(true);
    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;
      setTimeout(async () => {
        if (videoRef.current) {
          try {
            await codeReader.decodeFromVideoDevice(
              undefined,
              videoRef.current,
              (result, err) => {
                if (result) {
                  const scannedText = result.getText();
                  stopCameraScanner();
                  
                  // Match with inventory
                  const matched = inventory.find(p => 
                    (p.barcode && p.barcode.trim() === scannedText.trim()) ||
                    (p.itemNo && p.itemNo.trim() === scannedText.trim())
                  );

                  if (matched) {
                    handleSelectPlant(matched);
                    showToast(`Scanned: ${matched.name}`);
                  } else {
                    setSearchQuery(scannedText);
                    setIsSearchOpen(true);
                    showToast(`Barcode ${scannedText} scanned. Select or create plant.`);
                  }
                }
              }
            );
          } catch (camErr) {
            console.error('Camera decoding error:', camErr);
          }
        }
      }, 300);
    } catch (err) {
      console.error('Camera access error:', err);
      showToast('Camera access not available. Please type barcode/item #.');
    }
  };

  const stopCameraScanner = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Add or Update Count Record
  const handleRecordCount = (e: React.FormEvent) => {
    e.preventDefault();

    const targetLocation = isCustomLocation ? (customLocationText.trim() || 'Custom Yard Location') : selectedLocation;
    
    // Remember last used location and area category
    localStorage.setItem('maple_last_audit_location', targetLocation);
    localStorage.setItem('maple_last_audit_area_category', selectedAreaCategory);

    let itemNo = '';
    let name = '';
    let botanicalName = '';
    let size = '';
    let category = '';
    let barcode = '';
    let price = 0;
    let masterStock = 0;
    let plantId: string | undefined = undefined;

    if (isManualEntry || !selectedPlant) {
      if (!manualName.trim()) {
        showToast('Please enter a plant name to record count.');
        return;
      }
      itemNo = manualItemNo.trim() || `SKU-${Date.now().toString().slice(-5)}`;
      name = manualName.trim();
      botanicalName = manualBotanical.trim();
      size = manualSize.trim() || 'Standard';
      category = manualCategory.trim() || 'General Inventory';
      price = Number(manualPrice) || 0;
      masterStock = Number(manualMasterStock) || 0;
    } else {
      itemNo = selectedPlant.itemNo || selectedPlant.id;
      name = selectedPlant.name;
      botanicalName = selectedPlant.botanicalName || '';
      size = selectedPlant.size || 'Standard';
      category = selectedPlant.category || 'General Inventory';
      barcode = selectedPlant.barcode || '';
      price = selectedPlant.price || 0;
      masterStock = selectedPlant.stock || 0;
      plantId = selectedPlant.id;
    }

    const finalQty = Math.max(0, Number(countedQty) || 0);

    const newCountItem: InventoryCountItem = {
      id: editingItem ? editingItem.id : `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      plantId,
      itemNo,
      name,
      botanicalName,
      size,
      category,
      barcode,
      price,
      masterStock,
      countedQuantity: finalQty,
      countMode,
      yardLocation: targetLocation,
      gpsLocation,
      countedBy: currentUser.name || 'Pete',
      timestamp: new Date().toISOString(),
      notes: entryNotes.trim() || undefined
    };

    let updatedItems: InventoryCountItem[];
    if (editingItem) {
      updatedItems = activeSession.items.map(item => item.id === editingItem.id ? newCountItem : item);
      setEditingItem(null);
      showToast(`Updated count for ${name} (${finalQty} units)`);
    } else {
      updatedItems = [newCountItem, ...activeSession.items];
      showToast(`Recorded: ${finalQty} ${size} ${name} at ${targetLocation}`);
    }

    const updatedSession: InventoryAuditSession = {
      ...activeSession,
      items: updatedItems
    };

    updateActiveSession(updatedSession);

    // Reset plant input for next item while preserving location
    setSelectedPlant(null);
    setSearchQuery('');
    setIsManualEntry(false);
    setManualName('');
    setManualBotanical('');
    setManualItemNo('');
    setCountedQty(1);
    setQtyInputStr('1');
    setEntryNotes('');
    setGpsLocation(undefined);
    setGpsStatusText('');
  };

  // Start edit for an existing entry
  const handleEditEntry = (item: InventoryCountItem) => {
    setEditingItem(item);
    if (item.plantId) {
      const match = inventory.find(p => p.id === item.plantId);
      if (match) {
        setSelectedPlant(match);
        setIsManualEntry(false);
      } else {
        setIsManualEntry(true);
        setManualItemNo(item.itemNo);
        setManualName(item.name);
        setManualBotanical(item.botanicalName || '');
        setManualSize(item.size);
        setManualCategory(item.category || '');
        setManualPrice(item.price || 0);
        setManualMasterStock(item.masterStock);
      }
    } else {
      setIsManualEntry(true);
      setManualItemNo(item.itemNo);
      setManualName(item.name);
      setManualBotanical(item.botanicalName || '');
      setManualSize(item.size);
      setManualCategory(item.category || '');
      setManualPrice(item.price || 0);
      setManualMasterStock(item.masterStock);
    }

    setCountedQty(item.countedQuantity);
    setQtyInputStr(item.countedQuantity.toString());
    setCountMode(item.countMode);
    
    if (combinedLocations.includes(item.yardLocation)) {
      setSelectedLocation(item.yardLocation);
      localStorage.setItem('maple_last_audit_location', item.yardLocation);
      setIsCustomLocation(false);
      
      // If current category does not contain this location, switch to its category
      if (selectedAreaCategory !== 'All Areas') {
        const currentLocs = categoryGroups[selectedAreaCategory] || [];
        if (!currentLocs.includes(item.yardLocation)) {
          for (const [cat, locs] of (Object.entries(categoryGroups) as [string, string[]][])) {
            if (locs.includes(item.yardLocation)) {
              setSelectedAreaCategory(cat);
              localStorage.setItem('maple_last_audit_area_category', cat);
              break;
            }
          }
        }
      }
    } else {
      setIsCustomLocation(true);
      setCustomLocationText(item.yardLocation);
    }

    setGpsLocation(item.gpsLocation);
    setEntryNotes(item.notes || '');

    // Scroll to form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete an entry
  const handleDeleteEntry = (id: string) => {
    const itemToDelete = activeSession.items.find(i => i.id === id);
    const updatedItems = activeSession.items.filter(i => i.id !== id);
    updateActiveSession({
      ...activeSession,
      items: updatedItems
    });
    showToast(`Deleted count entry for ${itemToDelete?.name || 'plant'}`);
  };

  // Start a new count session
  const handleStartNewSession = () => {
    if (activeSession.items.length > 0) {
      const confirmReset = window.confirm('Start a new inventory audit session? Current session counts will be archived in history.');
      if (!confirmReset) return;
    }

    const newId = `AUDIT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const newSession: InventoryAuditSession = {
      id: newId,
      title: `Physical Count - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      countedBy: currentUser.name || 'Pete',
      items: []
    };
    updateActiveSession(newSession);
    showToast('Started fresh physical inventory audit session');
  };

  // Open email report modal
  const handleOpenEmailModal = () => {
    if (activeSession.items.length === 0) {
      showToast('No plants counted yet in this session.');
      return;
    }
    const { subject, body } = generateAuditEmailReport(activeSession);
    setEmailSubject(subject);
    setEmailBodyPreview(body);
    setShowEmailModal(true);
  };

  // Copy report to clipboard
  const handleCopyReport = () => {
    navigator.clipboard.writeText(emailBodyPreview);
    setCopiedReport(true);
    showToast('📋 Report summary copied to clipboard!');
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Print report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked. Please allow popups to print report.');
      return;
    }

    const stats = calculateAuditSummaryStats(activeSession.items);
    const consolidated = consolidateAuditItems(activeSession.items);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeSession.title} - Maple Lane Nursery</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #012d1d; }
          h1 { color: #012d1d; margin-bottom: 4px; font-size: 24px; }
          .header { border-bottom: 2px solid #012d1d; padding-bottom: 12px; margin-bottom: 20px; }
          .meta { font-size: 13px; color: #525a55; margin-bottom: 20px; display: flex; gap: 24px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-card { background: #f3f4f0; border: 1px solid #c1c8c2; padding: 12px; border-radius: 8px; }
          .stat-val { font-size: 20px; font-weight: bold; color: #012d1d; }
          .stat-lbl { font-size: 11px; color: #525a55; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #012d1d; color: white; text-align: left; padding: 8px 10px; }
          td { border-bottom: 1px solid #e2e3df; padding: 8px 10px; }
          tr:nth-child(even) { background: #f9faf6; }
          .var-plus { color: #0e6c4a; font-weight: bold; }
          .var-minus { color: #ba1a1a; font-weight: bold; }
          .var-match { color: #525a55; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Maple Lane Nursery - Physical Inventory Audit Report</h1>
          <div class="meta">
            <span><strong>Session:</strong> ${activeSession.title}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
            <span><strong>Auditor:</strong> ${activeSession.countedBy}</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card"><div class="stat-val">${stats.totalUniquePlants}</div><div class="stat-lbl">Unique SKUs</div></div>
          <div class="stat-card"><div class="stat-val">${stats.totalPhysicalUnits}</div><div class="stat-lbl">Physical Units Counted</div></div>
          <div class="stat-card"><div class="stat-val">${stats.totalBaselineUnits}</div><div class="stat-lbl">Baseline System Stock</div></div>
          <div class="stat-card"><div class="stat-val">${stats.netUnitVariance >= 0 ? `+${stats.netUnitVariance}` : stats.netUnitVariance}</div><div class="stat-lbl">Net Variance Units</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item #</th>
              <th>Plant Name</th>
              <th>Size</th>
              <th>Locations & GPS</th>
              <th>Master Baseline</th>
              <th>Physical Count</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            ${consolidated.map(i => `
              <tr>
                <td><strong>${i.itemNo}</strong></td>
                <td>${i.name}</td>
                <td>${i.size}</td>
                <td>${i.locations.map(l => `${l.location} (${l.quantity})`).join(', ')}</td>
                <td>${i.masterStock}</td>
                <td><strong>${i.totalCountedQuantity}</strong></td>
                <td class="${i.variance > 0 ? 'var-plus' : i.variance < 0 ? 'var-minus' : 'var-match'}">
                  ${i.variance > 0 ? `+${i.variance}` : i.variance}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Finalize and mark completed
  const handleFinalizeSession = () => {
    const completedSession: InventoryAuditSession = {
      ...activeSession,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    updateActiveSession(completedSession);
    setShowEmailModal(false);
    showToast('🎉 Physical Inventory Audit finalized and archived to history.');
  };

  // Consolidated items & stats
  const consolidatedList = consolidateAuditItems(activeSession.items);
  const stats = calculateAuditSummaryStats(activeSession.items);

  // Table filtering
  const displayItems = consolidatedList.filter(item => {
    if (tableFilter === 'discrepancies' && item.status === 'exact') return false;
    if (tableFilter === 'exact' && item.status !== 'exact') return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchItemNo = item.itemNo.toLowerCase().includes(q);
      const matchSize = item.size.toLowerCase().includes(q);
      const matchLoc = item.locations.some(l => l.location.toLowerCase().includes(q));
      return matchName || matchItemNo || matchSize || matchLoc;
    }
    return true;
  });

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-40 animate-fade-in flex flex-col gap-5">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#012d1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#a0f4c8]/30 flex items-center gap-3 animate-fade-in max-w-md w-[92%]">
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

      {/* Top Header Banner */}
      <div className="bg-[#012d1d] text-white rounded-2xl p-4 sm:p-5 border border-[#19724f]/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#a0f4c8]/20 text-[#a0f4c8] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-[#a0f4c8]/30">
              Independent Stock Audit
            </span>
            <span className="text-xs text-white/70">Master POS File Preserved</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#f3f4f0] mt-1 tracking-tight">
            Physical Inventory Counter
          </h1>
          <p className="text-xs text-[#a0f4c8]/90 mt-0.5 max-w-xl">
            Count yard stock independently without modifying your baseline uploaded inventory file. Log GPS yard pins, select bay locations, and email variance reports.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all border border-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>POS Stock View</span>
          </button>

          <button
            type="button"
            onClick={handleStartNewSession}
            className="flex items-center gap-1.5 bg-[#a0f4c8] hover:bg-[#86e8b4] text-[#012d1d] text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Count Session</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Live Count vs History) */}
      <div className="flex bg-[#e2e3df] p-1 rounded-xl border border-[#c1c8c2] self-start w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab('count')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'count'
              ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs'
              : 'text-[#414844] hover:text-[#012d1d]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Count ({activeSession.items.length} logged)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#012d1d] text-[#a0f4c8] shadow-xs'
              : 'text-[#414844] hover:text-[#012d1d]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit History & Archives</span>
        </button>
      </div>

      {activeTab === 'count' ? (
        <>
          {/* Active Session Info Bar */}
          <div className="bg-[#f3f4f0] rounded-xl p-3.5 border border-[#c1c8c2] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#012d1d]">Session:</span>
              <input
                type="text"
                value={activeSession.title}
                onChange={(e) => updateActiveSession({ ...activeSession, title: e.target.value })}
                className="font-semibold text-[#012d1d] bg-white border border-[#c1c8c2] rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-[#012d1d] outline-hidden min-w-[200px]"
                title="Edit Session Title"
              />
            </div>

            <div className="flex items-center gap-3 text-[#525a55]">
              <span>Auditor: <strong className="text-[#012d1d]">{activeSession.countedBy}</strong></span>
              <span>•</span>
              <span>Started: <strong className="text-[#012d1d]">{new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEmailModal}
                disabled={activeSession.items.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeSession.items.length > 0
                    ? 'bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] shadow-xs active:scale-95'
                    : 'bg-[#c1c8c2] text-white opacity-60 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Finalize & Email Report</span>
              </button>
            </div>
          </div>

          {/* Counting Entry Form Card */}
          <section className="bg-white rounded-2xl p-4 sm:p-6 border border-[#c1c8c2] shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#e2e3df] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold text-xs">
                  {editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#012d1d]">
                    {editingItem ? 'Edit Recorded Inventory Count' : 'Record Plant Count Entry'}
                  </h2>
                  <p className="text-[11px] text-[#525a55]">
                    Independent snapshot: captured with size, location, GPS, and count mode.
                  </p>
                </div>
              </div>

              {editingItem && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setSelectedPlant(null);
                    setCountedQty(1);
                    setQtyInputStr('1');
                  }}
                  className="text-xs font-bold text-[#ba1a1a] hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleRecordCount} className="flex flex-col gap-5">
              {/* Plant Search & Selection Section */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider flex items-center justify-between">
                  <span>1. Plant SKU / Botanical / Common Name</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualEntry(!isManualEntry);
                        setSelectedPlant(null);
                      }}
                      className="text-[11px] font-bold text-[#0e6c4a] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isManualEntry ? 'Search Catalog Plants' : '+ Unlisted Yard Plant'}
                    </button>
                  </div>
                </label>

                {!isManualEntry ? (
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#717973] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                          }}
                          onFocus={() => setIsSearchOpen(true)}
                          placeholder="Search plant name, SKU #1000, barcode, or container size..."
                          className="w-full bg-[#f9faf6] border-2 border-[#012d1d] text-[#012d1d] rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:bg-white outline-hidden shadow-2xs"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Barcode Camera Scanner Trigger */}
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="flex items-center gap-1.5 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-2xs cursor-pointer shrink-0"
                        title="Scan plant barcode with camera"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">Scan Barcode</span>
                      </button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isSearchOpen && filteredPlants.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-30 bg-white border border-[#c1c8c2] rounded-xl shadow-xl mt-1 max-h-64 overflow-y-auto divide-y divide-[#e2e3df]">
                        {filteredPlants.map((plant) => (
                          <div
                            key={plant.id}
                            onClick={() => handleSelectPlant(plant)}
                            className="p-3 hover:bg-[#f3f4f0] cursor-pointer flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={plant.image || DEFAULT_PLANT_IMAGE}
                                alt={plant.name}
                                className="w-10 h-10 rounded-lg object-cover border border-[#c1c8c2]/50 shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-[#012d1d] truncate">
                                  {plant.name}
                                </div>
                                <div className="text-xs text-[#525a55] truncate">
                                  SKU: <strong>{plant.itemNo || plant.id}</strong> • Size: {plant.size || '3 GAL'} • {plant.botanicalName}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-[#0e6c4a]">
                                Baseline: {plant.stock}
                              </div>
                              <div className="text-[11px] text-[#525a55]">
                                ${plant.price?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual Unlisted Plant Input Grid */
                  <div className="bg-[#f9faf6] p-3.5 rounded-xl border border-[#c1c8c2] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#012d1d]">Plant Common Name *</label>
                      <input
                        type="text"
                        required
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="e.g. Emerald Green Arborvitae"
                        className="w-full bg-white border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs font-bold text-[#012d1d] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#012d1d]">Item # / SKU</label>
                      <input
                        type="text"
                        value={manualItemNo}
                        onChange={(e) => setManualItemNo(e.target.value)}
                        placeholder="e.g. 1045"
                        className="w-full bg-white border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs font-bold text-[#012d1d] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#012d1d]">Container / Pot Size</label>
                      <input
                        type="text"
                        value={manualSize}
                        onChange={(e) => setManualSize(e.target.value)}
                        placeholder="e.g. 5 GAL"
                        className="w-full bg-white border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs text-[#012d1d] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#012d1d]">Botanical Name</label>
                      <input
                        type="text"
                        value={manualBotanical}
                        onChange={(e) => setManualBotanical(e.target.value)}
                        placeholder="e.g. Thuja occidentalis"
                        className="w-full bg-white border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs text-[#012d1d] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#012d1d]">Retail Unit Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs font-bold text-[#012d1d] mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Selected Plant Card Preview */}
                {selectedPlant && !isManualEntry && (
                  <div className="bg-[#f0fdf4] border-2 border-[#a0f4c8] rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={selectedPlant.image || DEFAULT_PLANT_IMAGE}
                        alt={selectedPlant.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#a0f4c8] shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#012d1d] bg-white px-2 py-0.5 rounded-md border border-[#c1c8c2]">
                            SKU #{selectedPlant.itemNo || selectedPlant.id}
                          </span>
                          <span className="text-xs font-bold text-[#0e6c4a]">
                            Size: {selectedPlant.size || '3 GAL'}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-[#012d1d] truncate mt-0.5">
                          {selectedPlant.name}
                        </h3>
                        <p className="text-[11px] text-[#525a55] italic truncate">
                          {selectedPlant.botanicalName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="text-[10px] uppercase font-bold text-[#525a55]">
                        Uploaded Baseline
                      </div>
                      <div className="text-base font-black text-[#012d1d]">
                        {selectedPlant.stock} units
                      </div>
                      <div className="text-[11px] font-bold text-[#0e6c4a]">
                        ${selectedPlant.price?.toFixed(2)} ea
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location & GPS Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Selector Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#0e6c4a]" />
                      <span>2. Nursery Bay / Yard Location</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomLocation(!isCustomLocation)}
                      className="text-[11px] font-bold text-[#0e6c4a] hover:underline cursor-pointer"
                    >
                      {isCustomLocation ? 'Select from standard list' : '+ Custom Location'}
                    </button>
                  </div>

                  {!isCustomLocation ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Area / Category Filter Dropdown */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-extrabold uppercase text-[#525a55] tracking-wider flex items-center gap-1">
                          <Filter className="w-3 h-3 text-[#0e6c4a]" />
                          <span>Area / Category</span>
                        </label>
                        <select
                          value={selectedAreaCategory}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full bg-[#f9faf6] border border-[#c1c8c2] text-[#012d1d] font-bold rounded-xl px-2.5 py-2.5 text-xs focus:ring-2 focus:ring-[#012d1d] outline-hidden cursor-pointer shadow-2xs"
                        >
                          {availableCategories.map((cat) => {
                            const count = cat === 'All Areas'
                              ? combinedLocations.length
                              : (categoryGroups[cat]?.length || 0);
                            return (
                              <option key={cat} value={cat}>
                                {cat} ({count})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Filtered Yard Location Dropdown */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-extrabold uppercase text-[#525a55] tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#0e6c4a]" />
                          <span>Yard Location ({displayedLocations.length})</span>
                        </label>
                        <select
                          value={selectedLocation}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          className="w-full bg-[#f9faf6] border border-[#c1c8c2] text-[#012d1d] font-bold rounded-xl px-2.5 py-2.5 text-xs focus:ring-2 focus:ring-[#012d1d] outline-hidden cursor-pointer shadow-2xs"
                        >
                          {selectedAreaCategory === 'All Areas' ? (
                            (Object.entries(categoryGroups) as [string, string[]][]).map(([groupName, locs]) => {
                              if (locs.length === 0) return null;
                              return (
                                <optgroup key={groupName} label={`📍 ${groupName} (${locs.length})`}>
                                  {locs.map((loc, idx) => (
                                    <option key={idx} value={loc}>
                                      {loc}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })
                          ) : (
                            displayedLocations.map((loc, idx) => (
                              <option key={idx} value={loc}>
                                {loc}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customLocationText}
                      onChange={(e) => setCustomLocationText(e.target.value)}
                      placeholder="e.g. North Field Row 4B near water tower"
                      className="w-full bg-[#f9faf6] border border-[#c1c8c2] text-[#012d1d] font-bold rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-[#012d1d] outline-hidden shadow-2xs"
                    />
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-[#525a55] mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0e6c4a]"></span>
                    <span>Selected Area & Location remain locked for subsequent plant entries.</span>
                  </div>
                </div>

                {/* GPS High-Precision Logger */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    <span>3. High-Precision Yard GPS</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCaptureGps}
                      disabled={isLoggingGps}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                        gpsLocation
                          ? 'bg-[#e8f5e9] text-[#012d1d] border-[#a0f4c8] hover:bg-[#d0f0db]'
                          : 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] hover:bg-[#0e6c4a]'
                      }`}
                    >
                      {isLoggingGps ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{gpsStatusText || 'Acquiring GPS...'}</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>{gpsLocation ? '📍 Update GPS Tag' : '📍 Tag Yard GPS'}</span>
                        </>
                      )}
                    </button>

                    {gpsLocation && (
                      <button
                        type="button"
                        onClick={() => {
                          setMapModalGps({
                            latitude: gpsLocation.latitude,
                            longitude: gpsLocation.longitude,
                            title: selectedPlant?.name || manualName || 'Audited Plant',
                            subtitle: `${selectedLocation} (±${Math.round((gpsLocation.accuracy || 5) * 3.28084)} ft)`
                          });
                        }}
                        className="p-2.5 bg-white border border-[#c1c8c2] text-[#012d1d] hover:bg-[#f3f4f0] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="View GPS on Nursery Satellite Map"
                      >
                        <ExternalLink className="w-4 h-4 text-[#0e6c4a]" />
                      </button>
                    )}
                  </div>

                  {gpsLocation && (
                    <div className="flex items-center justify-between text-[11px] text-[#0e6c4a] bg-[#f0fdf4] px-2.5 py-1 rounded-lg border border-[#a0f4c8]/50">
                      <span>{formatGpsCoordinates(gpsLocation.latitude, gpsLocation.longitude, gpsLocation.accuracy)}</span>
                      <button
                        type="button"
                        onClick={() => setGpsLocation(undefined)}
                        className="text-gray-400 hover:text-red-600"
                        title="Remove GPS"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Count Mode Toggle (Side-by-Side Compact) */}
              <div className="flex flex-col gap-1.5 bg-[#f3f4f0] p-2.5 rounded-xl border border-[#c1c8c2]">
                <label className="text-[11px] font-bold text-[#012d1d] uppercase tracking-wider">
                  4. Count Mode
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCountMode('total')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                      countMode === 'total'
                        ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-2xs'
                        : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-[#e2e3df] hover:text-[#012d1d]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      countMode === 'total' ? 'border-[#a0f4c8] bg-[#a0f4c8]' : 'border-gray-400'
                    }`}>
                      {countMode === 'total' && <div className="w-1 h-1 rounded-full bg-[#012d1d]" />}
                    </div>
                    <span>Total Count</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCountMode('cycle_additive')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                      countMode === 'cycle_additive'
                        ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-2xs'
                        : 'bg-white text-[#414844] border-[#c1c8c2] hover:bg-[#e2e3df] hover:text-[#012d1d]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      countMode === 'cycle_additive' ? 'border-[#a0f4c8] bg-[#a0f4c8]' : 'border-gray-400'
                    }`}>
                      {countMode === 'cycle_additive' && <div className="w-1 h-1 rounded-full bg-[#012d1d]" />}
                    </div>
                    <span>Cycle Count</span>
                  </button>
                </div>
              </div>

              {/* Quantity Keypad & Steppers */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider flex items-center justify-between">
                  <span>5. Physical Counted Quantity</span>
                  <span className="text-xs font-bold text-[#0e6c4a]">
                    Unit: {selectedPlant?.size || manualSize || 'Units'}
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, countedQty - 1);
                        setCountedQty(next);
                        setQtyInputStr(next.toString());
                      }}
                      className="w-10 h-10 rounded-lg bg-white text-[#012d1d] hover:bg-[#e2e3df] flex items-center justify-center font-bold text-lg shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={qtyInputStr}
                      onChange={(e) => {
                        setQtyInputStr(e.target.value);
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setCountedQty(val);
                      }}
                      className="w-20 text-center font-black text-xl text-[#012d1d] bg-transparent outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = countedQty + 1;
                        setCountedQty(next);
                        setQtyInputStr(next.toString());
                      }}
                      className="w-10 h-10 rounded-lg bg-white text-[#012d1d] hover:bg-[#e2e3df] flex items-center justify-center font-bold text-lg shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick Quantity Addition Steppers */}
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {[5, 10, 25, 50, 100].map(addVal => (
                      <button
                        key={addVal}
                        type="button"
                        onClick={() => {
                          const next = countedQty + addVal;
                          setCountedQty(next);
                          setQtyInputStr(next.toString());
                        }}
                        className="px-2.5 py-2 bg-[#f3f4f0] hover:bg-[#012d1d] hover:text-[#a0f4c8] text-[#012d1d] font-bold text-xs rounded-lg border border-[#c1c8c2] transition-colors cursor-pointer"
                      >
                        +{addVal}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setCountedQty(0);
                        setQtyInputStr('0');
                      }}
                      className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg border border-red-200 transition-colors cursor-pointer ml-auto"
                    >
                      Zero (0)
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider">
                  6. Inspection Notes / Plant Health (Optional)
                </label>
                <input
                  type="text"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="e.g. Needs pruning, 3 pots damaged, excellent vigor..."
                  className="w-full bg-[#f9faf6] border border-[#c1c8c2] text-[#012d1d] rounded-xl px-3 py-2 text-xs font-medium focus:bg-white outline-hidden mt-1"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.99] text-[#a0f4c8] font-extrabold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-[#a0f4c8]" />
                <span>
                  {editingItem ? 'Save Updated Count Entry' : `Record Count: ${countedQty} Units`}
                </span>
              </button>
            </form>
          </section>

          {/* Real-Time Statistical Summary Bar */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#f3f4f0] rounded-xl p-3.5 border border-[#c1c8c2]">
              <div className="text-[11px] font-bold text-[#525a55] uppercase tracking-wider">Unique SKUs Counted</div>
              <div className="text-2xl font-black text-[#012d1d] mt-0.5">{stats.totalUniquePlants}</div>
              <div className="text-[10px] text-[#525a55] mt-0.5">{activeSession.items.length} total bay entries</div>
            </div>

            <div className="bg-[#f3f4f0] rounded-xl p-3.5 border border-[#c1c8c2]">
              <div className="text-[11px] font-bold text-[#525a55] uppercase tracking-wider">Total Units Counted</div>
              <div className="text-2xl font-black text-[#0e6c4a] mt-0.5">{stats.totalPhysicalUnits}</div>
              <div className="text-[10px] text-[#525a55] mt-0.5">Baseline: {stats.totalBaselineUnits}</div>
            </div>

            <div className="bg-[#f3f4f0] rounded-xl p-3.5 border border-[#c1c8c2]">
              <div className="text-[11px] font-bold text-[#525a55] uppercase tracking-wider">Net Unit Variance</div>
              <div className={`text-2xl font-black mt-0.5 ${
                stats.netUnitVariance > 0 ? 'text-emerald-700' : stats.netUnitVariance < 0 ? 'text-rose-700' : 'text-[#012d1d]'
              }`}>
                {stats.netUnitVariance >= 0 ? `+${stats.netUnitVariance}` : stats.netUnitVariance}
              </div>
              <div className="text-[10px] text-[#525a55] mt-0.5">
                {stats.exactMatchCount} exact matches
              </div>
            </div>

            <div className="bg-[#f3f4f0] rounded-xl p-3.5 border border-[#c1c8c2]">
              <div className="text-[11px] font-bold text-[#525a55] uppercase tracking-wider">Est. Value Variance</div>
              <div className={`text-2xl font-black mt-0.5 ${
                stats.netDollarVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {stats.netDollarVariance >= 0 ? `+$${stats.netDollarVariance.toFixed(2)}` : `-$${Math.abs(stats.netDollarVariance).toFixed(2)}`}
              </div>
              <div className="text-[10px] text-[#525a55] mt-0.5">
                {stats.overCount} over / {stats.underCount} short
              </div>
            </div>
          </section>

          {/* Audited Items Feed & Consolidated List */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-[#c1c8c2] shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e3df] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#012d1d]">
                  Recorded Items ({consolidatedList.length} Plants Audited)
                </h3>
                <p className="text-xs text-[#525a55]">
                  Consolidated multi-bay totals vs original uploaded POS inventory baseline.
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-[#f3f4f0] p-1 rounded-xl border border-[#c1c8c2] text-xs">
                  <button
                    type="button"
                    onClick={() => setTableFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      tableFilter === 'all' ? 'bg-[#012d1d] text-[#a0f4c8]' : 'text-[#525a55]'
                    }`}
                  >
                    All ({consolidatedList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('discrepancies')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      tableFilter === 'discrepancies' ? 'bg-[#012d1d] text-[#a0f4c8]' : 'text-[#525a55]'
                    }`}
                  >
                    Discrepancies Only ({stats.overCount + stats.underCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('exact')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      tableFilter === 'exact' ? 'bg-[#012d1d] text-[#a0f4c8]' : 'text-[#525a55]'
                    }`}
                  >
                    Matches ({stats.exactMatchCount})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search recorded..."
                    className="bg-[#f9faf6] border border-[#c1c8c2] rounded-lg pl-7 pr-2.5 py-1 text-xs text-[#012d1d] w-36 sm:w-44 focus:bg-white outline-hidden"
                  />
                </div>
              </div>
            </div>

            {displayItems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                <Package className="w-8 h-8 text-gray-400" />
                <h4 className="text-sm font-bold text-[#012d1d]">No plants match the filter</h4>
                <p className="text-xs text-[#525a55] max-w-sm">
                  {activeSession.items.length === 0 
                    ? 'Start counting above by searching a plant, selecting a yard location, and recording quantity.' 
                    : 'Try selecting "All" or clearing the search filter.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e2e3df] flex flex-col">
                {displayItems.map((item) => (
                  <div key={item.key} className="py-3.5 flex flex-col gap-2 hover:bg-[#f9faf6] transition-colors rounded-xl px-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-black text-[#012d1d] bg-[#f3f4f0] px-2 py-1 rounded-md border border-[#c1c8c2] shrink-0">
                          #{item.itemNo}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-[#012d1d] truncate">
                              {item.name}
                            </h4>
                            <span className="text-xs font-semibold text-[#525a55]">
                              ({item.size})
                            </span>
                          </div>
                          {item.botanicalName && (
                            <p className="text-xs text-[#525a55] italic truncate">
                              {item.botanicalName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quantities & Variance Badges */}
                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-[#525a55]">Baseline</div>
                          <div className="text-xs font-bold text-[#525a55]">{item.masterStock} units</div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-[#012d1d]">Counted</div>
                          <div className="text-sm font-black text-[#012d1d]">{item.totalCountedQuantity} units</div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                          item.status === 'exact'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : item.status === 'over'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          {item.variance > 0 ? `+${item.variance} Over` : item.variance === 0 ? 'Match' : `${item.variance} Short`}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown by Bay / Location */}
                    <div className="bg-[#f3f4f0] rounded-lg p-2 flex flex-col gap-1 text-xs">
                      {item.locations.map((loc, idx) => {
                        const matchingItem = activeSession.items.find(i => 
                          (i.itemNo === item.itemNo || i.name === item.name) && 
                          i.yardLocation === loc.location && 
                          i.timestamp === loc.timestamp
                        );

                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 text-[#414844] flex-wrap">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#012d1d] shrink-0" />
                              <span className="font-bold text-[#012d1d] truncate">{loc.location}:</span>
                              <span className="font-extrabold text-[#0e6c4a]">{loc.quantity} qty</span>
                              <span className="text-[10px] bg-white text-[#525a55] px-1.5 py-0.5 rounded-md border border-[#c1c8c2]">
                                {loc.countMode === 'total' ? 'Total' : 'Additive'}
                              </span>
                              {loc.notes && <span className="text-[11px] italic text-[#525a55]">"{loc.notes}"</span>}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {loc.gpsLocation && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMapModalGps({
                                      latitude: loc.gpsLocation!.latitude,
                                      longitude: loc.gpsLocation!.longitude,
                                      title: item.name,
                                      subtitle: `${loc.location} (±${Math.round((loc.gpsLocation!.accuracy || 5) * 3.28084)} ft)`
                                    });
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-bold text-[#0e6c4a] bg-white px-2 py-0.5 rounded-md border border-[#a0f4c8] hover:bg-[#d0f0db] cursor-pointer"
                                >
                                  <MapPin className="w-3 h-3 text-[#0e6c4a]" />
                                  <span>GPS</span>
                                </button>
                              )}

                              {matchingItem && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditEntry(matchingItem)}
                                    className="p-1 text-gray-500 hover:text-[#012d1d] cursor-pointer"
                                    title="Edit Entry"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(matchingItem.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                                    title="Delete Entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        /* History & Completed Audits Tab */
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-[#c1c8c2] shadow-sm flex flex-col gap-4">
          <div className="border-b border-[#e2e3df] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#012d1d]">
                Audit History & Completed Sessions
              </h2>
              <p className="text-xs text-[#525a55]">
                Review, export CSV, or email past physical inventory count records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('count')}
              className="text-xs font-extrabold text-[#0e6c4a] hover:underline cursor-pointer"
            >
              ← Back to Active Count
            </button>
          </div>

          {auditSessions.length === 0 && !activeSession.items.length ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
              <History className="w-8 h-8 text-gray-400" />
              <h4 className="text-sm font-bold text-[#012d1d]">No past audits recorded</h4>
              <p className="text-xs text-[#525a55]">
                Complete your first physical count to archive audit records.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e2e3df] flex flex-col">
              {[activeSession, ...auditSessions.filter(s => s.id !== activeSession.id)].map((session) => {
                const sessionStats = calculateAuditSummaryStats(session.items);
                const isCurrentActive = session.id === activeSession.id;

                return (
                  <div key={session.id} className="py-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-[#012d1d]">
                            {session.title || 'Physical Inventory Count'}
                          </h3>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            session.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {session.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] font-extrabold text-[#012d1d] bg-[#a0f4c8] px-2 py-0.5 rounded-full">
                              Active Workspace
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#525a55] mt-0.5">
                          ID: <strong>{session.id}</strong> • Date: {new Date(session.startedAt).toLocaleDateString()} • Auditor: {session.countedBy}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrentActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSession(session);
                              setActiveTab('count');
                              showToast(`Resumed session: ${session.title}`);
                            }}
                            className="bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Open Session
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadAuditCsv(session)}
                          className="flex items-center gap-1 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c1c8c2] transition-colors cursor-pointer"
                          title="Download CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSession(session);
                            handleOpenEmailModal();
                          }}
                          className="flex items-center gap-1 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Email Report"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email Report</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#f3f4f0] p-2.5 rounded-xl border border-[#c1c8c2]/60">
                      <div>
                        <span className="text-[#525a55]">SKUs Audited:</span> <strong>{sessionStats.totalUniquePlants}</strong>
                      </div>
                      <div>
                        <span className="text-[#525a55]">Physical Units:</span> <strong>{sessionStats.totalPhysicalUnits}</strong>
                      </div>
                      <div>
                        <span className="text-[#525a55]">Net Variance:</span> <strong className={sessionStats.netUnitVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {sessionStats.netUnitVariance >= 0 ? `+${sessionStats.netUnitVariance}` : sessionStats.netUnitVariance}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#525a55]">Discrepancies:</span> <strong>{sessionStats.overCount + sessionStats.underCount}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Email & Finalize Report Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-[#c1c8c2] text-[#012d1d] relative my-6">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#717973] hover:bg-[#f3f4f0] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#012d1d]">
                  Email Physical Inventory Report
                </h2>
                <p className="text-xs text-[#525a55]">
                  Send complete audit summary, variances, and bay locations to nursery managers.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#012d1d]">Recipient Email Address</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="pete@maplelanenursery.com"
                  className="w-full bg-[#f9faf6] border border-[#c1c8c2] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#012d1d] mt-1 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#012d1d]">Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#f9faf6] border border-[#c1c8c2] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#012d1d] mt-1 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#012d1d]">Report Content Preview</label>
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="text-xs font-bold text-[#0e6c4a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedReport ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={emailBodyPreview}
                  className="w-full bg-[#f9faf6] border border-[#c1c8c2] rounded-xl p-3 text-[11px] font-mono text-[#012d1d] outline-hidden resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e2e3df]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadAuditCsv(activeSession)}
                    className="flex items-center gap-1.5 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] text-xs font-bold px-3 py-2 rounded-xl border border-[#c1c8c2] transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="flex items-center gap-1.5 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] text-xs font-bold px-3 py-2 rounded-xl border border-[#c1c8c2] transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Sheet</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={createAuditMailtoUrl(recipientEmail, activeSession)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open in Email Client</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleFinalizeSession}
                    className="flex items-center gap-1.5 bg-[#0e6c4a] hover:bg-[#012d1d] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#a0f4c8]" />
                    <span>Mark Audit Completed</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-white/20 text-center relative">
            <button
              onClick={stopCameraScanner}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-[#012d1d]">Scan Plant Barcode</h3>
            <p className="text-xs text-[#525a55] mt-1 mb-4">
              Point your camera at a plant pot barcode or inventory tag.
            </p>

            <div className="relative rounded-xl overflow-hidden border-2 border-[#012d1d] bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-[#a0f4c8] shadow-[0_0_8px_#a0f4c8] animate-pulse" />
            </div>

            <button
              type="button"
              onClick={stopCameraScanner}
              className="w-full mt-4 bg-[#f3f4f0] text-[#012d1d] font-bold py-2.5 rounded-xl hover:bg-[#e2e3df] text-xs cursor-pointer"
            >
              Cancel Scanning
            </button>
          </div>
        </div>
      )}

      {/* Satellite Map Modal */}
      {mapModalGps && (
        <PlantMapModal
          isOpen={true}
          onClose={() => setMapModalGps(null)}
          latitude={mapModalGps.latitude}
          longitude={mapModalGps.longitude}
          plantName={mapModalGps.title}
          locationNotes={mapModalGps.subtitle}
        />
      )}
    </div>
  );
};
