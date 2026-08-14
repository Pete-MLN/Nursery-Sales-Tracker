import React, { useState, useRef, useEffect } from 'react';
import { ScreenType, PlantItem, OrderCartItem, Customer, Order } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { Search, Trash2, Plus, Minus, MapPin, CheckCircle, Camera, QrCode, Sparkles, User, RefreshCw, ChevronDown, ChevronUp, Check, X, ArrowRightLeft, Volume2, AlertCircle, Barcode, CheckCircle2, BookOpen, Leaf, Filter, Truck, Save } from 'lucide-react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { findPlantByBarcode } from '../utils/barcodeUtils';

interface ScanScreenProps {
  onNavigate: (screen: ScreenType) => void;
  inventory: PlantItem[];
  customers: Customer[];
  onCompleteOrder: (cartItems: OrderCartItem[], customerName: string) => void;
  activeOrder?: Order | null;
  onUpdateActiveOrder?: (updatedOrder: Order) => void;
  onStartNewOrder?: () => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  onNavigate,
  inventory,
  customers,
  onCompleteOrder,
  activeOrder,
  onUpdateActiveOrder,
  onStartNewOrder
}) => {
  const [cartItems, setCartItems] = useState<OrderCartItem[]>(() => {
    if (activeOrder && activeOrder.items && activeOrder.items.length > 0) {
      return activeOrder.items;
    }
    return [];
  });
  const [selectedCustomer, setSelectedCustomer] = useState<string>(activeOrder?.customerName || '');
  const [customerSearch, setCustomerSearch] = useState<string>(activeOrder?.customerName || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [customerType, setCustomerType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [gpsLoggedMap, setGpsLoggedMap] = useState<Record<string, string>>({});
  const [itemFulfillmentMap, setItemFulfillmentMap] = useState<Record<string, 'Take Now' | 'Pick-up/Delivery'>>({});

  // Sync state when activeOrder changes
  useEffect(() => {
    if (activeOrder) {
      if (activeOrder.items) {
        setCartItems(activeOrder.items);
      }
      if (activeOrder.customerName) {
        setSelectedCustomer(activeOrder.customerName);
        setCustomerSearch(activeOrder.customerName);
      }
    }
  }, [activeOrder?.id]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);

  // Bulk Quick Selector State
  const [bulkTab, setBulkTab] = useState<'ALL' | 'MULCH' | 'STONE' | 'TOP SOIL'>('ALL');
  const [isBulkSectionOpen, setIsBulkSectionOpen] = useState<boolean>(false);

  // Plant Name Search Modal & Autocomplete State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [showPlantSuggestions, setShowPlantSuggestions] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const toggleItemFulfillment = (plantId: string) => {
    setItemFulfillmentMap(prev => ({
      ...prev,
      [plantId]: prev[plantId] === 'Pick-up/Delivery' ? 'Take Now' : 'Pick-up/Delivery'
    }));
  };

  // Helper to add a plant directly to the cart with customizable increment (e.g. 0.5 or 1 yard/ton)
  const addPlantToCart = (plant: PlantItem, amount: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.plant.id === plant.id);
      if (existing) {
        return prev.map(i => i.plant.id === plant.id ? { ...i, quantity: parseFloat((i.quantity + amount).toFixed(2)) } : i);
      } else {
        return [...prev, { plant, quantity: amount }];
      }
    });

    playBeepSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(100); } catch (e) {}
    }

    const isBulk = ['MULCH', 'STONE', 'TOP SOIL'].some(cat => 
      (plant.category || '').toUpperCase().includes(cat)
    );
    const unitLabel = plant.size && plant.size.length < 10 ? plant.size : ((plant.category || '').toUpperCase().includes('STONE') ? 'Ton' : 'Yard');

    setScannedFeedback({
      message: `Added +${amount} ${isBulk ? unitLabel + '(s) of ' : ''}${plant.name} ($${(plant.price * amount).toFixed(2)}) to order!`,
      type: 'success'
    });

    setTimeout(() => {
      setScannedFeedback(null);
    }, 3500);
  };

  // Web Audio BEEP feedback synthesizer
  const playBeepSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch (e) {
      // AudioCtx disabled or restricted
    }
  };

  const unrecognizedCandidateRef = useRef<{ code: string; count: number }>({ code: '', count: 0 });

  // Process detected barcode string
  const handleScannedBarcode = (rawCode: string, isManualInput: boolean = false) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (lastScannedCode === cleanCode && now - lastScanTimeRef.current < 2000) {
      return;
    }

    const matchedPlant = findPlantByBarcode(cleanCode, inventory);

    // For unrecognized codes from live video stream, require 2 consecutive frame detections to prevent single-frame glitches on iOS
    if (!matchedPlant && !isManualInput) {
      if (unrecognizedCandidateRef.current.code === cleanCode) {
        unrecognizedCandidateRef.current.count += 1;
      } else {
        unrecognizedCandidateRef.current = { code: cleanCode, count: 1 };
        return; // Wait for second frame verification
      }

      if (unrecognizedCandidateRef.current.count < 2) {
        return; // Wait for second frame verification
      }
    }

    // Reset candidate ref once accepted
    unrecognizedCandidateRef.current = { code: '', count: 0 };

    lastScanTimeRef.current = now;
    setLastScannedCode(cleanCode);

    playBeepSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(100); } catch (e) {}
    }

    if (matchedPlant) {
      addPlantToCart(matchedPlant);
    } else {
      // Check for fuzzy name / category matches when user enters text manually or barcode is unreadable
      const nameMatches = inventory.filter(p =>
        p.name.toLowerCase().includes(cleanCode.toLowerCase()) ||
        (p.botanicalName && p.botanicalName.toLowerCase().includes(cleanCode.toLowerCase())) ||
        (p.commonName && p.commonName.toLowerCase().includes(cleanCode.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(cleanCode.toLowerCase()))
      );

      if (nameMatches.length === 1) {
        addPlantToCart(nameMatches[0]);
      } else if (nameMatches.length > 1) {
        setCatalogSearchQuery(cleanCode);
        setIsCatalogModalOpen(true);
        setScannedFeedback({
          message: `Found ${nameMatches.length} plants matching "${cleanCode}". Select your plant below:`,
          type: 'success'
        });
      } else {
        setUnrecognizedCode(cleanCode);
        setScannedFeedback({
          message: `Scanned code "${cleanCode}" - Item not found in catalog. Select plant to assign.`,
          type: 'warning'
        });
      }
    }

    setTimeout(() => {
      setScannedFeedback(null);
    }, 4500);
  };

  // Continuous Camera Frame Barcode Scanner Loop
  useEffect(() => {
    if (!cameraActive || !cameraStream) return;

    let isCancelled = false;
    let intervalId: NodeJS.Timeout;

    if (!zxingReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints);
    }

    const reader = zxingReaderRef.current;
    let nativeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix', 'itf']
        });
      } catch (e) {
        nativeDetector = null;
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const processFrame = async () => {
      if (isCancelled) return;
      const video = videoRef.current;

      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        let detectedRawCode: string | null = null;

        // 1. Native BarcodeDetector (if available on device)
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedRawCode = barcodes[0].rawValue;
            }
          } catch (e) {
            // ignore frame error
          }
        }

        // 2. Fallback ZXing decode focused on central Region of Interest (ROI)
        if (!detectedRawCode && ctx) {
          try {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // Crop to central 75% width, 60% height around viewfinder reticle
            const cropW = Math.floor(vw * 0.75);
            const cropH = Math.floor(vh * 0.60);
            const cropX = Math.floor((vw - cropW) / 2);
            const cropY = Math.floor((vh - cropH) / 2);

            canvas.width = Math.min(cropW, 800);
            canvas.height = Math.min(cropH, 600);

            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

            const result = reader.decodeFromCanvas(canvas);
            if (result && result.getText()) {
              detectedRawCode = result.getText();
            }
          } catch (err) {
            // Expected when frame has no barcode in ROI
          }
        }

        if (detectedRawCode && !isCancelled) {
          handleScannedBarcode(detectedRawCode, false);
        }
      }
    };

    intervalId = setInterval(processFrame, 220);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch (e) {}
      }
    };
  }, [cameraActive, cameraStream]);

  // Attach camera stream to video element whenever stream or active state changes
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      const v = videoRef.current;
      if (v.srcObject !== cameraStream) {
        v.srcObject = cameraStream;
      }
      v.play().catch(err => {
        console.warn('Video play error:', err);
      });
    }
  }, [cameraActive, cameraStream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowPlantSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle GPS location logging
  const handleLogGPS = (plantId: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setGpsLoggedMap(prev => ({
            ...prev,
            [plantId]: `${lat}° N, ${lng}° W`
          }));
        },
        () => {
          // Fallback mock GPS for nursery bay
          setGpsLoggedMap(prev => ({
            ...prev,
            [plantId]: `34.0522° N, 118.2437° W (Bay 12)`
          }));
        }
      );
    } else {
      setGpsLoggedMap(prev => ({
        ...prev,
        [plantId]: `34.0522° N, 118.2437° W (Bay 12)`
      }));
    }
  };

  // Start camera stream with specific device or mode
  const startCameraStream = async (deviceId?: string, mode: 'environment' | 'user' = facingMode) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    try {
      let constraints: MediaStreamConstraints = { video: true };
      if (deviceId) {
        constraints = { video: { deviceId: { exact: deviceId } } };
      } else {
        constraints = {
          video: {
            facingMode: { ideal: mode }
          }
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        // Fallback to basic video request if constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraStream(stream);
      setCameraActive(true);
      setCameraError(null);

      // Enumerate available video inputs
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          setVideoDevices(videoInputs);
          if (deviceId) {
            const idx = videoInputs.findIndex(d => d.deviceId === deviceId);
            if (idx >= 0) setActiveDeviceIndex(idx);
          }
        } catch (e) {
          // ignore enumeration errors
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      setCameraError('Camera access denied or unavailable. Click to simulate barcode scan.');
    }
  };

  // Switch to next available camera device or toggle facing mode
  const switchCameraDevice = async () => {
    if (videoDevices.length > 1) {
      const nextIndex = (activeDeviceIndex + 1) % videoDevices.length;
      setActiveDeviceIndex(nextIndex);
      const nextDevice = videoDevices[nextIndex];
      if (nextDevice && nextDevice.deviceId) {
        await startCameraStream(nextDevice.deviceId);
      } else {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        await startCameraStream(undefined, nextMode);
      }
    } else {
      const nextMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextMode);
      await startCameraStream(undefined, nextMode);
    }
  };

  // Toggle Camera Feed On/Off
  const toggleCameraFeed = async () => {
    if (cameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      await startCameraStream(undefined, facingMode);
    }
  };

  // Simulate Barcode Scanning
  const simulateScanItem = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Pick next plant or random plant and pass its barcode
      const unadded = inventory.filter(p => !cartItems.some(c => c.plant.id === p.id));
      const nextPlant = unadded.length > 0 ? unadded[0] : inventory[Math.floor(Math.random() * inventory.length)];
      if (nextPlant) {
        handleScannedBarcode(nextPlant.barcode || nextPlant.itemNo || nextPlant.id, true);
      }
      setIsScanning(false);
    }, 500);
  };

  const updateQuantity = (plantId: string, delta: number) => {
    setCartItems(prev => 
      prev.map(item => {
        if (item.plant.id === plantId) {
          const isBulk = ['MULCH', 'STONE', 'TOP SOIL'].some(cat => 
            (item.plant.category || '').toUpperCase().includes(cat)
          );
          const step = isBulk ? (delta > 0 ? 0.5 : -0.5) : (delta > 0 ? 1 : -1);
          const newQty = parseFloat((item.quantity + step).toFixed(2));
          if (newQty <= 0) return null as any;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeItem = (plantId: string) => {
    setCartItems(prev => prev.filter(item => item.plant.id !== plantId));
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.plant.price * item.quantity), 0);
  };

  const handleComplete = () => {
    if (cartItems.length === 0) return;
    const finalCustomer = (selectedCustomer || customerSearch || '').trim() || (activeOrder?.customerName || 'Retail Walk-in');
    
    if (activeOrder && onUpdateActiveOrder) {
      const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalAmt = calculateTotal();
      const updated: Order = {
        ...activeOrder,
        customerName: finalCustomer,
        items: cartItems,
        itemsCount: totalCount,
        total: totalAmt
      };
      onUpdateActiveOrder(updated);
      onNavigate('finalization');
    } else {
      onCompleteOrder(cartItems, finalCustomer);
      onNavigate('holding_location');
    }
  };

  const handleCompleteAndGoToHolding = () => {
    if (cartItems.length === 0) return;
    const finalCustomer = (selectedCustomer || customerSearch || '').trim() || (activeOrder?.customerName || 'Retail Walk-in');
    
    if (activeOrder && onUpdateActiveOrder) {
      const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalAmt = calculateTotal();
      const updated: Order = {
        ...activeOrder,
        customerName: finalCustomer,
        items: cartItems,
        itemsCount: totalCount,
        total: totalAmt
      };
      onUpdateActiveOrder(updated);
    } else {
      onCompleteOrder(cartItems, finalCustomer);
    }
    onNavigate('holding_location');
  };

  const matchingCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      c.type.toLowerCase().includes(q)
    );
  });

  const bulkItems = inventory.filter(p => {
    const cat = (p.category || '').toUpperCase();
    const name = (p.name || '').toUpperCase();
    const isMulch = cat.includes('MULCH') || name.includes('MULCH');
    const isStone = cat.includes('STONE') || cat.includes('GRAVEL') || name.includes('STONE') || name.includes('GRAVEL');
    const isSoil = cat.includes('SOIL') || cat.includes('DIRT') || name.includes('SOIL') || name.includes('TOP SOIL') || name.includes('COMPOST');
    
    if (bulkTab === 'MULCH') return isMulch;
    if (bulkTab === 'STONE') return isStone;
    if (bulkTab === 'TOP SOIL') return isSoil;
    return isMulch || isStone || isSoil;
  });

  return (
    <div className="flex-1 px-4 py-4 w-full max-w-2xl mx-auto pb-44 animate-fade-in flex flex-col gap-4">
      {/* Active Order Editing Banner */}
      {activeOrder && (
        <div className="bg-[#e7f8ef] border border-[#a0f4c8] p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 shadow-2xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a] bg-[#a0f4c8]/60 px-2 py-0.5 rounded">
                  Order {activeOrder.id}
                </span>
                <span className="text-xs text-[#012d1d] font-bold">
                  Live Scan & Edit Mode
                </span>
              </div>
              <p className="text-sm font-extrabold text-[#012d1d] truncate mt-0.5">
                {activeOrder.customerName || 'Customer'} • {cartItems.reduce((acc, item) => acc + item.quantity, 0)} items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('finalization')}
              className="text-xs font-extrabold text-[#012d1d] hover:bg-white px-2.5 py-1.5 rounded-xl border border-[#a0f4c8] bg-white/70 transition-all cursor-pointer shadow-2xs"
            >
              Order Details
            </button>
            {onStartNewOrder && (
              <button
                type="button"
                onClick={() => {
                  onStartNewOrder();
                  setCartItems([]);
                  setSelectedCustomer('');
                  setCustomerSearch('');
                }}
                className="text-xs font-bold text-[#717973] hover:text-[#ba1a1a] hover:bg-white px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Start a blank order"
              >
                New Order
              </button>
            )}
          </div>
        </div>
      )}

      {/* Customer Search Bar */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Searchable Dropdown Container */}
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              <Search className="w-4 h-4 text-[#717973] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer(e.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder="Customer Name (e.g., Retail Walk-in, John Smith)..."
                className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-16 py-2.5 text-base font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white transition-all shadow-2xs placeholder:text-sm placeholder:font-normal"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch('');
                      setSelectedCustomer('');
                      setIsDropdownOpen(true);
                    }}
                    className="p-1.5 text-[#717973] hover:text-[#1a1c1a] rounded cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className="p-1.5 text-[#717973] hover:text-[#012d1d] rounded cursor-pointer"
                  title="Toggle customer list"
                >
                  {isDropdownOpen ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Searchable Dropdown Popup Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[#c1c8c2] rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto animate-fade-in">
                <div className="p-2 flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-xs font-bold text-[#717973] uppercase tracking-wider bg-[#f9faf6] rounded-md flex justify-between items-center">
                    <span>Customer Accounts ({matchingCustomers.length})</span>
                    <span className="text-[11px] font-normal text-[#717973]">Type to filter</span>
                  </div>

                  {matchingCustomers.length === 0 ? (
                    <div className="p-3 text-center text-sm text-[#717973]">
                      <span>No matching customers found.</span>
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customerSearch);
                            setIsDropdownOpen(false);
                          }}
                          className="mt-2 w-full bg-[#a0f4c8]/30 hover:bg-[#a0f4c8] text-[#002113] font-bold py-2.5 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <User className="w-4 h-4 text-[#0e6c4a]" />
                          <span>Use "{customerSearch}" as customer</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    matchingCustomers.map((cust) => {
                      const isSelected = selectedCustomer === cust.name;
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust.name);
                            setCustomerSearch(cust.name);
                            if (cust.type === 'WHOLESALE' || cust.type === 'RETAIL') {
                              setCustomerType(cust.type);
                            }
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm sm:text-base font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#012d1d] text-white font-bold'
                              : 'hover:bg-[#f3f4f0] text-[#1a1c1a]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <User className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#a0f4c8]' : 'text-[#0e6c4a]'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className={`font-bold text-sm sm:text-base truncate ${isSelected ? 'text-white' : 'text-[#1a1c1a]'}`}>
                                {cust.name}
                              </span>
                              {cust.company && cust.company !== cust.name && (
                                <span className={`text-xs truncate ${isSelected ? 'text-[#a0f4c8]/80' : 'text-[#717973]'}`}>
                                  {cust.company}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-[#a0f4c8] text-[#002113]'
                                  : 'bg-[#e2e3df] text-[#414844]'
                              }`}
                            >
                              {cust.type}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-[#a0f4c8]" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCustomerType(prev => prev === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')}
            className="border border-[#012d1d] px-3.5 py-2.5 rounded-xl text-sm font-extrabold text-[#012d1d] hover:bg-[#e7e9e5] transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Toggle customer rate classification"
          >
            {customerType}
          </button>
        </div>

        {/* Bulk Products Quick Selector Section */}
        <div className="bg-[#f3f4f0] p-3 rounded-2xl border border-[#c1c8c2] flex flex-col gap-2.5">
          {/* Header & Collapse Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsBulkSectionOpen(!isBulkSectionOpen)}
              className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-[#012d1d] cursor-pointer hover:text-[#0e6c4a] transition-colors group"
            >
              <div className="p-2 bg-[#012d1d] text-[#a0f4c8] rounded-xl group-hover:bg-[#0e6c4a]">
                <Truck className="w-5 h-5" />
              </div>
              <span>Bulk Quick Select (MULCH • STONE • TOP SOIL)</span>
              {isBulkSectionOpen ? (
                <ChevronUp className="w-5 h-5 text-[#717973] group-hover:text-[#012d1d]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#717973] group-hover:text-[#012d1d]" />
              )}
            </button>

            {/* Category Filter Pills (Visible when open) */}
            {isBulkSectionOpen && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm">
                {(['ALL', 'MULCH', 'STONE', 'TOP SOIL'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setBulkTab(tab)}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                      bulkTab === tab
                        ? 'bg-[#012d1d] text-[#a0f4c8] shadow-2xs'
                        : 'bg-white/80 text-[#414844] hover:bg-white border border-[#c1c8c2]'
                    }`}
                  >
                    {tab === 'ALL' ? 'All Bulk' : tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Grid Content */}
          {isBulkSectionOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-0.5 animate-fade-in pt-1">
              {bulkItems.length === 0 ? (
                <p className="text-xs text-[#717973] py-3 col-span-2 text-center bg-white rounded-xl border border-dashed border-[#c1c8c2]">
                  No items found under category {bulkTab}.
                </p>
              ) : (
                bulkItems.map((plant) => {
                  const inCart = cartItems.find(i => i.plant.id === plant.id);
                  const isStone = (plant.category || '').toUpperCase().includes('STONE') || plant.name.toUpperCase().includes('STONE');
                  const unitLabel = plant.size && plant.size.length < 8 ? plant.size : (isStone ? 'Ton' : 'Yard');

                  return (
                    <div
                      key={plant.id}
                      className="bg-white p-3 rounded-xl border border-[#c1c8c2] flex flex-col justify-between gap-2.5 shadow-2xs hover:border-[#0e6c4a] transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-[#012d1d] text-[#a0f4c8]">
                              {plant.category || 'BULK'}
                            </span>
                            {inCart && (
                              <span className="text-xs font-bold text-[#0e6c4a] bg-[#a0f4c8] px-2 py-0.5 rounded">
                                {inCart.quantity} {unitLabel}(s) in order
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-base text-[#1a1c1a] truncate mt-1" title={plant.name}>
                            {plant.name}
                          </h4>
                        </div>
                        <span className="text-base font-extrabold text-[#012d1d] shrink-0">
                          ${plant.price.toFixed(2)} / {unitLabel}
                        </span>
                      </div>

                      {/* 0.5 and 1.0 Increment Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#f3f4f0]">
                        <button
                          type="button"
                          onClick={() => addPlantToCart(plant, 0.5)}
                          className="flex-1 bg-[#a0f4c8]/30 hover:bg-[#a0f4c8] text-[#002113] border border-[#0e6c4a]/30 text-xs sm:text-sm font-extrabold py-2 px-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          title={`Add 0.5 ${unitLabel} of ${plant.name}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-[#0e6c4a]" />
                          <span>+0.5 {unitLabel}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => addPlantToCart(plant, 1.0)}
                          className="flex-1 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs sm:text-sm font-extrabold py-2 px-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                          title={`Add 1.0 ${unitLabel} of ${plant.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+1.0 {unitLabel}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* Manual Barcode Search & Preset Chips */}
      <section className="bg-white p-3.5 rounded-2xl border border-[#c1c8c2] shadow-2xs flex flex-col gap-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualBarcodeInput.trim()) {
              handleScannedBarcode(manualBarcodeInput, true);
              setManualBarcodeInput('');
              setShowPlantSuggestions(false);
            }
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="relative flex-1" ref={searchContainerRef}>
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
            <input
              type="text"
              value={manualBarcodeInput}
              onChange={(e) => {
                setManualBarcodeInput(e.target.value);
                setShowPlantSuggestions(true);
              }}
              onFocus={() => setShowPlantSuggestions(true)}
              placeholder="Search plant name, SKU, or barcode..."
              className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-10 pr-3 py-3 text-base text-[#1a1c1a] outline-none focus:border-[#012d1d] font-sans font-medium"
            />

            {/* Live Autocomplete Suggestions Popover */}
            {showPlantSuggestions && manualBarcodeInput.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#c1c8c2] rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto divide-y divide-[#f3f4f0] animate-fade-in">
                {(() => {
                  const q = manualBarcodeInput.trim().toLowerCase();
                  const matches = inventory.filter(p =>
                    p.name.toLowerCase().includes(q) ||
                    (p.botanicalName && p.botanicalName.toLowerCase().includes(q)) ||
                    (p.commonName && p.commonName.toLowerCase().includes(q)) ||
                    (p.category && p.category.toLowerCase().includes(q)) ||
                    (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                    (p.itemNo && p.itemNo.toLowerCase().includes(q))
                  ).slice(0, 6);

                  if (matches.length === 0) {
                    return (
                      <div className="p-3.5 text-center text-xs text-[#717973]">
                        No exact plant name match for "{manualBarcodeInput}". Press Enter to run catalog search.
                      </div>
                    );
                  }

                  return matches.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      onClick={() => {
                        addPlantToCart(plant);
                        setManualBarcodeInput('');
                        setShowPlantSuggestions(false);
                      }}
                      className="w-full p-3 hover:bg-[#a0f4c8]/20 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={plant.image || DEFAULT_PLANT_IMAGE}
                          alt={plant.name}
                          className="w-11 h-11 rounded-lg object-cover bg-[#f3f4f0] shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                        />
                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-[#012d1d] truncate group-hover:text-[#0e6c4a]">
                            {plant.name}
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-[#414844] truncate italic mt-0.5">
                            {plant.botanicalName || plant.commonName || plant.size || 'Container'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-base font-extrabold text-[#012d1d]">
                          ${plant.price.toFixed(2)}
                        </span>
                        <span className="bg-[#012d1d] text-[#a0f4c8] text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 group-hover:bg-[#0e6c4a]">
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </span>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 sm:flex-none bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-sm font-bold px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
            >
              <Search className="w-4 h-4" />
              <span>Add / Scan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCatalogSearchQuery(manualBarcodeInput);
                setIsCatalogModalOpen(true);
              }}
              className="bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] border border-[#c1c8c2] text-sm font-bold px-3.5 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              title="Search plant catalog by name when barcode is missing"
            >
              <BookOpen className="w-4 h-4 text-[#0e6c4a]" />
              <span className="hidden xs:inline">Browse Catalog</span>
            </button>
          </div>
        </form>

        {/* Quick Test Barcode Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-[#717973] font-bold uppercase tracking-wider shrink-0 text-[10px]">
            Test Barcodes:
          </span>
          {[
            { code: '41796', label: 'Arborvitae' },
            { code: '041796', label: 'iPhone Lead Zero' },
            { code: '41198', label: 'Blue Prince' },
            { code: '41688', label: 'Kickin Aster' },
            { code: '10008', label: 'Black-Eyed Susan' }
          ].map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => handleScannedBarcode(preset.code, true)}
              className="bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] font-mono font-semibold px-2.5 py-1 rounded-lg border border-[#c1c8c2] shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              <QrCode className="w-3 h-3 text-[#0e6c4a]" />
              <span>{preset.code}</span>
              <span className="text-[#717973] font-sans font-normal">({preset.label})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Live Scanned Feedback Banner */}
      {scannedFeedback && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-fade-in border ${
            scannedFeedback.type === 'success'
              ? 'bg-[#a0f4c8] text-[#002113] border-[#0e6c4a]'
              : 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]'
          }`}
        >
          <div className="flex items-center gap-2">
            {scannedFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#0e6c4a] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0" />
            )}
            <span>{scannedFeedback.message}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Volume2 className="w-3.5 h-3.5 opacity-70" />
            <button
              type="button"
              onClick={() => setScannedFeedback(null)}
              className="p-1 hover:bg-black/10 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Viewfinder Area */}
      <section className="relative rounded-2xl overflow-hidden shadow-sm border border-[#c1c8c2] bg-[#1a1c1a] aspect-16/10 flex items-center justify-center">
        {cameraActive ? (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && cameraStream && el.srcObject !== cameraStream) {
                el.srcObject = cameraStream;
                el.play().catch(err => console.warn('Video play error:', err));
              }
            }}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            onCanPlay={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-65"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80')`
            }}
          />
        )}

        {/* Scanner Framing Overlay */}
        <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-between p-3.5 pointer-events-none z-10">
          {/* Top Bar */}
          <div className="w-full flex justify-between items-center text-white/90 text-xs">
            <span className="flex items-center gap-1 font-mono bg-black/60 backdrop-blur-xs px-2 py-1 rounded-md border border-white/10">
              <QrCode className="w-3.5 h-3.5 text-[#a0f4c8]" />
              {cameraActive ? 'CAMERA LIVE' : 'DEMO SCANNER'}
            </span>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {cameraActive && (
                <button
                  type="button"
                  onClick={switchCameraDevice}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-xs border border-white/20 px-2.5 py-1 rounded-md text-white text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  title="Switch camera device / flip camera"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#a0f4c8]" />
                  <span>Switch Cam</span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleCameraFeed}
                className="bg-black/60 hover:bg-black/80 backdrop-blur-xs border border-white/20 px-2.5 py-1 rounded-md text-white text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-[#a0f4c8]" />
                <span>{cameraActive ? 'Stop' : 'Start Camera'}</span>
              </button>
            </div>
          </div>

          {/* Viewfinder Target Reticle */}
          <div className="relative w-48 h-36 border-2 border-transparent">
            {/* Corner Bracket SVGs */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#a0f4c8]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#a0f4c8]" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#a0f4c8]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#a0f4c8]" />

            {/* Laser Line Animation */}
            {isScanning && (
              <div className="absolute left-0 right-0 h-0.5 bg-[#a0f4c8] shadow-[0_0_12px_#a0f4c8] animate-pulse top-1/2" />
            )}
          </div>

          {/* Bottom Actions & Diagnostics */}
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto w-full">
            {cameraError && (
              <div className="bg-[#ba1a1a]/90 text-white text-[11px] font-medium px-3 py-1 rounded-md backdrop-blur-xs text-center max-w-xs animate-fade-in">
                {cameraError}
              </div>
            )}
            <button
              type="button"
              onClick={simulateScanItem}
              disabled={isScanning}
              className="bg-white/95 hover:bg-white text-[#1a1c1a] font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-xs transition-transform active:scale-95 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0e6c4a]" />
                  <span>Scanning Plant Barcode...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>Tap to Scan Barcode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Current Order Items Section */}
      <section className="flex flex-col gap-3 mt-1">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-[#012d1d]">Current Order Items</h2>
          <span className="bg-[#e7e9e5] text-[#414844] text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
            {cartItems.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
          </span>
        </div>

        {/* Items List */}
        <div className="flex flex-col gap-3">
          {cartItems.length === 0 ? (
            <div className="p-8 text-center bg-[#f3f4f0] rounded-xl border border-dashed border-[#c1c8c2] text-[#717973]">
              <p className="text-sm">No items added to order yet.</p>
              <button
                onClick={simulateScanItem}
                className="mt-2 text-xs text-[#0e6c4a] font-bold hover:underline"
              >
                + Scan Item or Add Test Plant
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const gpsLocation = gpsLoggedMap[item.plant.id];

              return (
                <div
                  key={item.plant.id}
                  className="bg-white rounded-xl p-3.5 border border-[#c1c8c2] shadow-2xs flex flex-col gap-2 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-3 items-center">
                      <img
                        src={item.plant.image || DEFAULT_PLANT_IMAGE}
                        alt={item.plant.name}
                        className="w-12 h-12 rounded-lg object-cover bg-[#f3f4f0]"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                      />
                      <div>
                        <h3 className="font-semibold text-base text-[#1a1c1a]">
                          {item.plant.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="bg-[#e7e9e5] text-[#414844] text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                            {item.plant.lightRequirement}
                          </span>
                          <span className="text-sm font-semibold text-[#012d1d]">
                            ${item.plant.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.plant.id)}
                      className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1.5 rounded-lg transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity, Pick-up/Delivery & GPS Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1 pt-2 border-t border-[#f3f4f0]">
                    {/* Stepper Quantity */}
                    <div className="flex items-center bg-[#f3f4f0] rounded-lg border border-[#c1c8c2]">
                      <button
                        onClick={() => updateQuantity(item.plant.id, -1)}
                        className="p-1.5 hover:bg-[#e2e3df] text-[#1a1c1a] rounded-l-lg transition-colors cursor-pointer"
                        title="Decrease Quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-[#012d1d]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.plant.id, 1)}
                        className="p-1.5 hover:bg-[#e2e3df] text-[#1a1c1a] rounded-r-lg transition-colors cursor-pointer"
                        title="Increase Quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle Button: Pick-up/Delivery */}
                    <button
                      onClick={() => toggleItemFulfillment(item.plant.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        itemFulfillmentMap[item.plant.id] === 'Pick-up/Delivery'
                          ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#19724f] shadow-2xs'
                          : 'bg-[#f3f4f0] border-[#c1c8c2] text-[#414844] hover:bg-[#e2e3df] hover:text-[#012d1d]'
                      }`}
                      title="Mark if customer takes plant now or leaves for later pick-up/delivery"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Pick-up/Delivery</span>
                    </button>

                    {/* Log GPS Button */}
                    <button
                      onClick={() => handleLogGPS(item.plant.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        gpsLocation
                          ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#19724f]'
                          : 'bg-[#f3f4f0] border-[#c1c8c2] text-[#414844] hover:bg-[#e2e3df]'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {gpsLocation ? 'GPS Logged' : 'Log GPS'}
                    </button>
                  </div>

                  {itemFulfillmentMap[item.plant.id] === 'Pick-up/Delivery' && (
                    <div className="text-[11px] text-[#0e6c4a] font-semibold bg-[#a0f4c8]/30 px-2.5 py-1 rounded-md border border-[#0e6c4a]/30 flex items-center justify-between">
                      <span>📦 Tagged for later Pick-up / Delivery</span>
                      <span className="text-[10px] text-[#19724f] font-mono uppercase">(Customer leaving item)</span>
                    </div>
                  )}

                  {gpsLocation && (
                    <div className="text-[11px] text-[#0e6c4a] font-mono bg-[#a0f4c8]/30 px-2 py-1 rounded border border-[#a0f4c8]">
                      📍 {gpsLocation}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Order Total & Action Footer */}
      <section className="mt-4 pt-4 border-t border-[#c1c8c2] pb-6 mb-12 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-bold text-xl text-[#012d1d] block">Total</span>
            <span className="text-xs text-[#717973] font-semibold">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)} items in order
            </span>
          </div>
          <span className="font-bold text-2xl text-[#012d1d]">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>

        {activeOrder ? (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleComplete}
              disabled={cartItems.length === 0}
              className="flex-1 bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.99] disabled:opacity-50 text-[#a0f4c8] hover:text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Save & Return to Order {activeOrder.id}</span>
            </button>
            <button
              type="button"
              onClick={handleCompleteAndGoToHolding}
              disabled={cartItems.length === 0}
              className="bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm shrink-0"
              title="Save changes and proceed to staging map"
            >
              <MapPin className="w-4 h-4" />
              <span>Holding Map</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={cartItems.length === 0}
            className="w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Complete Order</span>
          </button>
        )}
      </section>

      {/* Unrecognized Barcode Assignment Modal */}
      {unrecognizedCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#ffdad6] text-[#ba1a1a] rounded-xl">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1a1c1a]">Unrecognized Barcode</h3>
                  <p className="text-xs font-mono text-[#0e6c4a] font-bold">Scanned Code: {unrecognizedCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnrecognizedCode(null)}
                className="p-1 text-[#717973] hover:text-[#1a1c1a] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#414844]">
              This barcode isn't assigned to a plant in your catalog yet. Select a plant below to pair this barcode and add it to the order:
            </p>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 border border-[#c1c8c2] rounded-xl p-2 bg-[#f3f4f0]">
              {inventory.slice(0, 10).map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => {
                    plant.barcode = unrecognizedCode;
                    setCartItems(prev => {
                      const existing = prev.find(i => i.plant.id === plant.id);
                      if (existing) {
                        return prev.map(i => i.plant.id === plant.id ? { ...i, quantity: i.quantity + 1 } : i);
                      } else {
                        return [...prev, { plant, quantity: 1 }];
                      }
                    });
                    setScannedFeedback({
                      message: `Assigned code "${unrecognizedCode}" to ${plant.name} and added to cart!`,
                      type: 'success'
                    });
                    setUnrecognizedCode(null);
                  }}
                  className="p-2.5 bg-white hover:bg-[#a0f4c8]/30 rounded-lg border border-[#c1c8c2] text-left flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-[#012d1d] group-hover:text-[#0e6c4a]">{plant.name}</p>
                    <p className="text-[10px] text-[#717973]">{plant.size || '3 GAL'} • ${plant.price.toFixed(2)}</p>
                  </div>
                  <span className="text-xs font-bold text-[#0e6c4a] bg-[#a0f4c8] px-2 py-0.5 rounded">Select & Add</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-[#c1c8c2]">
              <button
                type="button"
                onClick={() => setUnrecognizedCode(null)}
                className="px-4 py-2 bg-[#e2e3df] hover:bg-[#c1c8c2] text-[#1a1c1a] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Full Plant Catalog Search & Selection Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-[#e2e3df]">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-[#a0f4c8] text-[#012d1d] rounded-xl">
                  <BookOpen className="w-5 h-5 text-[#0e6c4a]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#012d1d]">Plant Catalog Search</h3>
                  <p className="text-xs text-[#414844]">Search plant name, botanical name, or category when barcode is missing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-1 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Input & Category Filters */}
            <div className="flex flex-col gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717973]" />
                <input
                  type="text"
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  placeholder="Filter by name, botanical name, size, category..."
                  className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[#1a1c1a] outline-none focus:border-[#012d1d]"
                  autoFocus
                />
                {catalogSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {['All', 'Trees & Shrubs', 'Perennials', 'Annuals', 'Houseplants'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`px-3 py-1 rounded-full font-semibold shrink-0 cursor-pointer transition-colors ${
                      catalogCategory === cat
                        ? 'bg-[#012d1d] text-[#a0f4c8]'
                        : 'bg-[#f3f4f0] text-[#414844] hover:bg-[#e2e3df]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid / List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-48 max-h-[50vh]">
              {(() => {
                const matches = inventory.filter(p => {
                  const matchesCategory = catalogCategory === 'All' ? true :
                    catalogCategory === 'Trees & Shrubs' ? (p.category?.includes('TREE') || p.category?.includes('SHRUB') || p.name.includes('Arborvitae') || p.name.includes('Fig') || p.name.includes('Prince')) :
                    catalogCategory === 'Perennials' ? (p.category?.includes('PERENNIAL') || p.name.includes('Susan') || p.name.includes('Aster')) :
                    catalogCategory === 'Annuals' ? (p.category?.includes('ANNUAL')) :
                    catalogCategory === 'Houseplants' ? (p.name.includes('Pothos') || p.name.includes('Succulent') || p.name.includes('Fig')) :
                    true;

                  if (!matchesCategory) return false;

                  if (!catalogSearchQuery.trim()) return true;
                  const q = catalogSearchQuery.trim().toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.botanicalName && p.botanicalName.toLowerCase().includes(q)) ||
                    (p.commonName && p.commonName.toLowerCase().includes(q)) ||
                    (p.category && p.category.toLowerCase().includes(q)) ||
                    (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                    (p.itemNo && p.itemNo.toLowerCase().includes(q))
                  );
                });

                if (matches.length === 0) {
                  return (
                    <div className="py-12 text-center text-[#717973] flex flex-col items-center gap-2">
                      <Leaf className="w-8 h-8 text-[#c1c8c2]" />
                      <p className="text-sm font-medium">No plants match "{catalogSearchQuery}"</p>
                      <button
                        type="button"
                        onClick={() => { setCatalogSearchQuery(''); setCatalogCategory('All'); }}
                        className="text-xs text-[#0e6c4a] font-bold hover:underline"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  );
                }

                return matches.map((plant) => {
                  const inCartCount = cartItems.find(i => i.plant.id === plant.id)?.quantity || 0;

                  return (
                    <div
                      key={plant.id}
                      className="p-3 bg-white hover:bg-[#f3f4f0]/60 rounded-xl border border-[#c1c8c2] flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={plant.image || DEFAULT_PLANT_IMAGE}
                          alt={plant.name}
                          className="w-12 h-12 rounded-lg object-cover bg-[#f3f4f0] shrink-0 border border-[#c1c8c2]"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-base text-[#1a1c1a] truncate">{plant.name}</h4>
                          <p className="text-xs sm:text-sm text-[#414844] truncate italic mt-0.5">
                            {plant.botanicalName || plant.commonName || 'Standard Container'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold bg-[#e7e9e5] text-[#414844] px-2 py-0.5 rounded">
                              {plant.size || '3 GAL'}
                            </span>
                            <span className="text-xs text-[#717973]">
                              Stock: <strong className="text-[#012d1d]">{plant.stock}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-extrabold text-base text-[#012d1d]">
                          ${plant.price.toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => addPlantToCart(plant)}
                          className="bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-sm font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{inCartCount > 0 ? `Add (${inCartCount})` : 'Add to Order'}</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#e2e3df]">
              <span className="text-xs text-[#717973]">
                {cartItems.reduce((sum, i) => sum + i.quantity, 0)} items in order
              </span>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done Adding Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
