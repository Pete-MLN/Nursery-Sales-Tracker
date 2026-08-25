import React, { useState, useRef, useEffect } from 'react';
import { ScreenType, PlantItem, OrderCartItem, Customer, Order } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { Search, Trash2, Plus, Minus, MapPin, CheckCircle, Camera, QrCode, Sparkles, User, RefreshCw, ChevronDown, ChevronUp, Check, X, ArrowRightLeft, Volume2, AlertCircle, Barcode, CheckCircle2, BookOpen, Leaf, Filter, Truck, Save, Zap, ZapOff, ZoomIn, Tag, Package, Clock, Timer, Map as MapIcon, Compass, Radio, ExternalLink } from 'lucide-react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { findPlantByBarcode, isValidBarcodeString } from '../utils/barcodeUtils';
import { PricingDropdown } from './PricingDropdown';
import { getItemEffectiveUnitPrice, PriceLevelKey, getPlantPriceTiers } from '../utils/pricingUtils';
import { PlantVerificationModal } from './PlantVerificationModal';
import { PlantMapModal } from './PlantMapModal';
import { AutoSaveBadge } from './AutoSaveBadge';
import { 
  autoSaveDraft, 
  getActiveDraft, 
  clearActiveDraft, 
  initAutoSaveLifecycleListeners, 
  OrderDraft, 
  getDraftForOrderId 
} from '../services/orderAutoSaveService';

interface ScanScreenProps {
  onNavigate: (screen: ScreenType) => void;
  inventory: PlantItem[];
  customers: Customer[];
  onCompleteOrder: (cartItems: OrderCartItem[], customerName: string, overrides?: Partial<Order>) => void;
  activeOrder?: Order | null;
  onUpdateActiveOrder?: (updatedOrder: Order) => void;
  onStartNewOrder?: () => void;
  onDeleteOrder?: (orderId: string) => void;
  cameraTimeout?: number;
  onUpdateCameraTimeout?: (seconds: number) => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  onNavigate,
  inventory,
  customers,
  onCompleteOrder,
  activeOrder,
  onUpdateActiveOrder,
  onStartNewOrder,
  onDeleteOrder,
  cameraTimeout = 15,
  onUpdateCameraTimeout
}) => {
  // Check if an uncommitted draft exists in localStorage
  const initialDraft = (!activeOrder ? getActiveDraft() : getDraftForOrderId(activeOrder.id));

  const [cartItems, setCartItems] = useState<OrderCartItem[]>(() => {
    if (activeOrder && activeOrder.items && activeOrder.items.length > 0) {
      return activeOrder.items;
    }
    if (initialDraft && initialDraft.cartItems && initialDraft.cartItems.length > 0) {
      return initialDraft.cartItems;
    }
    return [];
  });
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    activeOrder?.customerName || initialDraft?.customerName || ''
  );
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>(
    activeOrder?.customerName || initialDraft?.customerName || ''
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [customerType, setCustomerType] = useState<'RETAIL' | 'WHOLESALE'>(
    initialDraft?.customerType || 'RETAIL'
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [gpsLoggedMap, setGpsLoggedMap] = useState<Record<string, string>>(
    initialDraft?.gpsLoggedMap || {}
  );
  const [itemFulfillmentMap, setItemFulfillmentMap] = useState<Record<string, 'Take Now' | 'Pick-up/Delivery'>>(
    initialDraft?.itemFulfillmentMap || {}
  );
  const [mapModalItem, setMapModalItem] = useState<OrderCartItem | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(Boolean(initialDraft && initialDraft.cartItems && initialDraft.cartItems.length > 0));

  // Sync state when activeOrder changes
  useEffect(() => {
    if (activeOrder) {
      const editDraft = getDraftForOrderId(activeOrder.id);
      if (editDraft && editDraft.cartItems && editDraft.cartItems.length > 0) {
        setCartItems(editDraft.cartItems.map(item => ({ ...item })));
        if (editDraft.customerName) {
          setSelectedCustomer(editDraft.customerName);
          setCustomerSearch(editDraft.customerName);
        }
        setHasUnsavedChanges(true);
      } else if (activeOrder.items && activeOrder.items.length > 0) {
        setCartItems(activeOrder.items.map(item => ({ ...item })));
        setHasUnsavedChanges(false);
      } else {
        setCartItems([]);
        setHasUnsavedChanges(false);
      }
      if (activeOrder.customerName && (!editDraft || !editDraft.customerName)) {
        setSelectedCustomer(activeOrder.customerName);
        setCustomerSearch(activeOrder.customerName);
      }
    } else {
      const activeDraft = getActiveDraft();
      if (activeDraft && activeDraft.cartItems && activeDraft.cartItems.length > 0 && !activeDraft.isEditingExisting) {
        setCartItems(activeDraft.cartItems.map(item => ({ ...item })));
        setSelectedCustomer(activeDraft.customerName || '');
        setCustomerSearch(activeDraft.customerName || '');
        setItemFulfillmentMap(activeDraft.itemFulfillmentMap || {});
        setGpsLoggedMap(activeDraft.gpsLoggedMap || {});
        setCustomerType(activeDraft.customerType || 'RETAIL');
        setHasUnsavedChanges(true);
      } else {
        // Clean blank order
        setCartItems([]);
        setSelectedCustomer('');
        setCustomerSearch('');
        setItemFulfillmentMap({});
        setGpsLoggedMap({});
        setCustomerType('RETAIL');
        setHasUnsavedChanges(false);
      }
    }
  }, [activeOrder]);

  // CONTINUOUS AUTO-SAVE: Every single plant added/removed, quantity adjusted, price tier changed, or customer name typed is instantly saved to local disk & queued to cloud ONLY when dirty
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const hasData = cartItems.length > 0 || (selectedCustomer && selectedCustomer.trim().length > 0) || (customerSearch && customerSearch.trim().length > 0);
    if (hasData || activeOrder) {
      const draft: OrderDraft = {
        orderId: activeOrder?.id,
        isEditingExisting: Boolean(activeOrder),
        customerName: (selectedCustomer || customerSearch || '').trim(),
        customerType: customerType,
        cartItems: cartItems,
        itemFulfillmentMap: itemFulfillmentMap,
        gpsLoggedMap: gpsLoggedMap,
        fulfillmentType: activeOrder?.type || 'Take Now',
        scheduledDate: activeOrder?.scheduledDate,
        scheduledTime: activeOrder?.scheduledTime,
        holdingLocation: activeOrder?.holdingLocation,
        notes: activeOrder?.notes,
        orderStatus: activeOrder?.status,
        lastSavedAt: new Date().toISOString()
      };
      autoSaveDraft(draft);
    }
  }, [hasUnsavedChanges, cartItems, selectedCustomer, customerSearch, customerType, itemFulfillmentMap, gpsLoggedMap, activeOrder]);

  // LIFECYCLE HOOKS: guarantee flush to local storage before browser close, backgrounding, or crash ONLY when there are unsaved changes
  useEffect(() => {
    const cleanup = initAutoSaveLifecycleListeners(() => {
      if (!hasUnsavedChanges) return null;
      const hasData = cartItems.length > 0 || (selectedCustomer && selectedCustomer.trim().length > 0) || (customerSearch && customerSearch.trim().length > 0);
      if (!hasData && !activeOrder) return null;
      return {
        orderId: activeOrder?.id,
        isEditingExisting: Boolean(activeOrder),
        customerName: (selectedCustomer || customerSearch || '').trim(),
        customerType: customerType,
        cartItems: cartItems,
        itemFulfillmentMap: itemFulfillmentMap,
        gpsLoggedMap: gpsLoggedMap,
        fulfillmentType: activeOrder?.type || 'Take Now',
        scheduledDate: activeOrder?.scheduledDate,
        scheduledTime: activeOrder?.scheduledTime,
        holdingLocation: activeOrder?.holdingLocation,
        notes: activeOrder?.notes,
        orderStatus: activeOrder?.status,
        lastSavedAt: new Date().toISOString()
      };
    });
    return cleanup;
  }, [hasUnsavedChanges, cartItems, selectedCustomer, customerSearch, customerType, itemFulfillmentMap, gpsLoggedMap, activeOrder]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);

  // Helper to show scan feedback banner with 3x extended duration (10.5s default)
  const triggerScannedFeedback = (message: string, type: 'success' | 'warning' = 'success', durationMs: number = 10500) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setScannedFeedback({ message, type });
    feedbackTimerRef.current = setTimeout(() => {
      setScannedFeedback(null);
      feedbackTimerRef.current = null;
    }, durationMs);
  };

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Camera Timeout Countdown & Quick Settings State
  const [cameraTimeLeft, setCameraTimeLeft] = useState<number>(cameraTimeout || 15);
  const [isTimeoutMenuOpen, setIsTimeoutMenuOpen] = useState<boolean>(false);
  const timeoutMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync cameraTimeLeft when cameraTimeout prop changes
  useEffect(() => {
    setCameraTimeLeft(cameraTimeout);
  }, [cameraTimeout]);

  // Reset camera inactivity timer
  const resetCameraTimer = () => {
    if (cameraActive && cameraTimeout > 0) {
      setCameraTimeLeft(cameraTimeout);
    }
  };

  // Close quick timeout popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (timeoutMenuRef.current && !timeoutMenuRef.current.contains(e.target as Node)) {
        setIsTimeoutMenuOpen(false);
      }
    };
    if (isTimeoutMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isTimeoutMenuOpen]);

  // Countdown timer effect for camera auto-shutoff
  useEffect(() => {
    if (!cameraActive) {
      setCameraTimeLeft(cameraTimeout || 15);
      return;
    }

    if (cameraTimeout === 0) {
      // 0 means Disabled / Never shut off automatically
      return;
    }

    setCameraTimeLeft(cameraTimeout);

    const timerInterval = setInterval(() => {
      setCameraTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          // Turn off camera stream
          if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
          }
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          setIsTorchOn(false);
          setCameraActive(false);
          triggerScannedFeedback(
            `Camera auto-paused after ${cameraTimeout}s to preserve battery. Tap "Start Camera" to scan again.`,
            'warning',
            7000
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [cameraActive, cameraTimeout, cameraStream]);

  // Bulk Quick Selector State
  const [bulkTab, setBulkTab] = useState<'ALL' | 'MULCH' | 'STONE' | 'TOP SOIL'>('ALL');
  const [isBulkSectionOpen, setIsBulkSectionOpen] = useState<boolean>(false);

  // Plant Name Search Modal & Autocomplete State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [showPlantSuggestions, setShowPlantSuggestions] = useState<boolean>(false);

  // Plant Verification & Quantity Confirmation Modal State
  const [verifyingPlant, setVerifyingPlant] = useState<{
    plant: PlantItem;
    initialQty?: number;
    existingCartItem?: OrderCartItem | null;
  } | null>(null);
  const verifyingPlantRef = useRef(verifyingPlant);
  useEffect(() => {
    verifyingPlantRef.current = verifyingPlant;
  }, [verifyingPlant]);

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

  // Open the plant verification and quantity pop-up
  const openPlantVerification = (plant: PlantItem, defaultQty?: number) => {
    const existing = cartItems.find(i => i.plant.id === plant.id) || null;
    const isBulkItem = ['MULCH', 'STONE', 'TOP SOIL'].some(cat => 
      (plant.category || '').toUpperCase().includes(cat) || plant.name.toUpperCase().includes(cat)
    );
    setVerifyingPlant({
      plant,
      initialQty: defaultQty !== undefined ? defaultQty : (existing ? existing.quantity : (isBulkItem ? 1.0 : 1)),
      existingCartItem: existing
    });
  };

  // Confirm addition or update from the verification modal
  const handleConfirmPlantVerification = (
    plant: PlantItem,
    quantity: number,
    priceLevel: PriceLevelKey,
    unitPrice: number,
    fulfillmentChoice: 'Take Now' | 'Pick-up/Delivery'
  ) => {
    setHasUnsavedChanges(true);
    setCartItems(prev => {
      const existingIndex = prev.findIndex(i => i.plant.id === plant.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: quantity,
          selectedPriceLevel: priceLevel,
          selectedPrice: unitPrice
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            plant,
            quantity,
            selectedPriceLevel: priceLevel,
            selectedPrice: unitPrice
          }
        ];
      }
    });

    setItemFulfillmentMap(prev => ({
      ...prev,
      [plant.id]: fulfillmentChoice
    }));

    playBeepSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(100); } catch (e) {}
    }

    const isBulk = ['MULCH', 'STONE', 'TOP SOIL'].some(cat => 
      (plant.category || '').toUpperCase().includes(cat) || plant.name.toUpperCase().includes(cat)
    );
    const isStone = (plant.category || '').toUpperCase().includes('STONE') || plant.name.toUpperCase().includes('STONE');
    const unitLabel = plant.size && plant.size.length < 10 ? plant.size : (isStone ? 'Ton' : (isBulk ? 'Yard' : 'Plant'));
    const itemNumDisplay = plant.itemNo || plant.barcode || 'N/A';
    const sizeDisplay = plant.size || (isBulk ? unitLabel : 'Standard');

    triggerScannedFeedback(
      `Verified & Added ${quantity} ${isBulk ? unitLabel + '(s) of ' : ''}${plant.name} • Item #${itemNumDisplay} • Size: ${sizeDisplay} ($${(unitPrice * quantity).toFixed(2)}) to order!`,
      'success',
      10500
    );
  };

  // Helper to add a plant directly to the cart with customizable increment and price tier
  const addPlantToCart = (plant: PlantItem, amount: number = 1, priceLevel?: PriceLevelKey) => {
    openPlantVerification(plant, amount);
  };

  // Helper to switch or set price tier for a specific item in the order
  const updateItemPriceLevel = (plantId: string, levelKey: PriceLevelKey, newPrice: number) => {
    setHasUnsavedChanges(true);
    setCartItems(prev => prev.map(item => {
      if (item.plant.id === plantId) {
        return {
          ...item,
          selectedPriceLevel: levelKey,
          selectedPrice: newPrice
        };
      }
      return item;
    }));
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

  // Process detected barcode string with strict validation to eliminate false matches on iOS
  const handleScannedBarcode = (rawCode: string, isManualInput: boolean = false) => {
    resetCameraTimer();
    const cleanCode = rawCode.trim();
    if (!cleanCode || cleanCode.length < 2) return;

    // Filter out short noise from camera stream
    if (!isManualInput && !isValidBarcodeString(cleanCode)) {
      return;
    }

    const now = Date.now();
    // Throttle rapid re-scans of the exact same code within 2 seconds
    if (lastScannedCode === cleanCode && now - lastScanTimeRef.current < 2000) {
      return;
    }

    const matchedPlant = findPlantByBarcode(cleanCode, inventory);

    // 1. If an exact barcode / itemNo / SKU match is found in inventory
    if (matchedPlant) {
      unrecognizedCandidateRef.current = { code: '', count: 0 };
      lastScanTimeRef.current = now;
      setLastScannedCode(cleanCode);
      addPlantToCart(matchedPlant);
      return;
    }

    // 2. If barcode is NOT in catalog:
    // When scanning from LIVE CAMERA STREAM:
    if (!isManualInput) {
      // Require 2 consecutive frame detections of the uncataloged code to prevent single-frame video noise on iOS
      if (unrecognizedCandidateRef.current.code === cleanCode) {
        unrecognizedCandidateRef.current.count += 1;
      } else {
        unrecognizedCandidateRef.current = { code: cleanCode, count: 1 };
        return; // Wait for second frame verification
      }

      if (unrecognizedCandidateRef.current.count < 2) {
        return; // Wait for second frame verification
      }

      // Reset candidate ref once accepted
      unrecognizedCandidateRef.current = { code: '', count: 0 };
      lastScanTimeRef.current = now;
      setLastScannedCode(cleanCode);

      // NEVER match a random plant via fuzzy substring during a live camera scan!
      setUnrecognizedCode(cleanCode);
      triggerScannedFeedback(
        `Scanned code "${cleanCode}" - Barcode not found in catalog. Tap to assign to a plant.`,
        'warning',
        10500
      );
      return;
    }

    // 3. When searching from MANUAL INPUT (user explicitly typed into search box):
    lastScanTimeRef.current = now;
    setLastScannedCode(cleanCode);

    // Check for multi-term match across name, size, SKU, botanical name, category, and barcode
    const searchTerms = cleanCode.toLowerCase().split(/\s+/).filter(Boolean);
    const nameMatches = inventory.filter(p => {
      const searchable = `${p.name} ${p.botanicalName || ''} ${p.commonName || ''} ${p.category || ''} ${p.size || ''} ${p.itemNo || ''} ${p.barcode || ''}`.toLowerCase();
      return searchTerms.every(term => searchable.includes(term));
    });

    if (nameMatches.length === 1) {
      addPlantToCart(nameMatches[0]);
    } else if (nameMatches.length > 1) {
      setCatalogSearchQuery(cleanCode);
      setIsCatalogModalOpen(true);
      triggerScannedFeedback(
        `Found ${nameMatches.length} plants matching "${cleanCode}". Select your exact plant & size below:`,
        'success',
        10500
      );
    } else {
      setUnrecognizedCode(cleanCode);
      triggerScannedFeedback(
        `Search "${cleanCode}" - No matching plant found. Select from catalog to assign.`,
        'warning',
        10500
      );
    }
  };

  // Continuous Camera Frame Barcode Scanner Loop with iOS Safari Multi-Pass Pre-processing
  useEffect(() => {
    if (!cameraActive || !cameraStream) return;

    let isCancelled = false;
    let intervalId: NodeJS.Timeout;

    if (!zxingReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints);
    }

    const reader = zxingReaderRef.current;
    let nativeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
        });
      } catch (e) {
        nativeDetector = null;
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let isProcessing = false;

    const processFrame = async () => {
      if (isCancelled || isProcessing || verifyingPlantRef.current !== null) return;
      const video = videoRef.current;

      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        isProcessing = true;
        let detectedRawCode: string | null = null;

        // 1. Native BarcodeDetector (High accuracy on Android Chrome and iOS 17+)
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              for (const b of barcodes) {
                if (b.rawValue && isValidBarcodeString(b.rawValue)) {
                  detectedRawCode = b.rawValue;
                  break;
                }
              }
            }
          } catch (e) {
            // ignore frame error
          }
        }

        // 2. High-Precision ZXing Multi-pass Decoder for iOS Safari
        if (!detectedRawCode && ctx) {
          try {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // Crop to central 75% width, 60% height around viewfinder reticle
            const cropW = Math.floor(vw * 0.75);
            const cropH = Math.floor(vh * 0.60);
            const cropX = Math.floor((vw - cropW) / 2);
            const cropY = Math.floor((vh - cropH) / 2);

            canvas.width = Math.min(cropW, 960);
            canvas.height = Math.min(cropH, 720);

            // Pass 1: Standard high-res cropped frame
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

            try {
              const result = reader.decodeFromCanvas(canvas);
              if (result && result.getText() && isValidBarcodeString(result.getText())) {
                detectedRawCode = result.getText();
              }
            } catch (err1) {
              // Pass 2: High-contrast binarization for outdoor / glossy nursery tags on iOS
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imgData.data;
              const len = data.length;
              for (let i = 0; i < len; i += 4) {
                // Perceived luminance
                const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
                // High contrast curve
                const enhanced = lum < 110 ? 0 : (lum > 160 ? 255 : (lum < 135 ? 30 : 230));
                data[i] = enhanced;
                data[i + 1] = enhanced;
                data[i + 2] = enhanced;
              }
              ctx.putImageData(imgData, 0, 0);

              try {
                const result2 = reader.decodeFromCanvas(canvas);
                if (result2 && result2.getText() && isValidBarcodeString(result2.getText())) {
                  detectedRawCode = result2.getText();
                }
              } catch (err2) {
                // Pass 3: Full uncropped frame at scaled resolution
                try {
                  const fullCanvas = document.createElement('canvas');
                  fullCanvas.width = Math.min(vw, 800);
                  fullCanvas.height = Math.min(vh, 600);
                  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
                  if (fullCtx) {
                    fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
                    const result3 = reader.decodeFromCanvas(fullCanvas);
                    if (result3 && result3.getText() && isValidBarcodeString(result3.getText())) {
                      detectedRawCode = result3.getText();
                    }
                  }
                } catch (err3) {
                  // No barcode in this frame
                }
              }
            }
          } catch (err) {
            // Expected when frame has no barcode in ROI
          }
        }

        isProcessing = false;

        if (detectedRawCode && !isCancelled) {
          handleScannedBarcode(detectedRawCode, false);
        }
      } else {
        isProcessing = false;
      }
    };

    intervalId = setInterval(processFrame, 180);

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

  // Handle GPS location logging with precise coordinates and feedback
  const handleLogGPS = (plantId: string) => {
    setHasUnsavedChanges(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const coordStr = `${lat.toFixed(5)}° N, ${Math.abs(lng).toFixed(5)}° W`;
          
          setGpsLoggedMap(prev => ({
            ...prev,
            [plantId]: coordStr
          }));

          setCartItems(prev => prev.map(item => {
            if (item.plant.id === plantId) {
              return {
                ...item,
                gpsLocation: {
                  latitude: lat,
                  longitude: lng,
                  timestamp: new Date().toISOString()
                }
              };
            }
            return item;
          }));

          triggerScannedFeedback(`📍 GPS location logged: ${coordStr}`, 'success', 3500);
        },
        () => {
          // Fallback mock GPS for nursery yard bay
          const fallbackLat = 43.1482;
          const fallbackLng = -79.4623;
          const coordStr = `${fallbackLat.toFixed(4)}° N, ${Math.abs(fallbackLng).toFixed(4)}° W (Greenhouse Bay 12)`;
          
          setGpsLoggedMap(prev => ({
            ...prev,
            [plantId]: coordStr
          }));

          setCartItems(prev => prev.map(item => {
            if (item.plant.id === plantId) {
              return {
                ...item,
                gpsLocation: {
                  latitude: fallbackLat,
                  longitude: fallbackLng,
                  timestamp: new Date().toISOString()
                }
              };
            }
            return item;
          }));

          triggerScannedFeedback(`📍 GPS location logged: ${coordStr}`, 'success', 3500);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = 43.1482;
      const fallbackLng = -79.4623;
      const coordStr = `${fallbackLat.toFixed(4)}° N, ${Math.abs(fallbackLng).toFixed(4)}° W (Greenhouse Bay 12)`;
      
      setGpsLoggedMap(prev => ({
        ...prev,
        [plantId]: coordStr
      }));

      setCartItems(prev => prev.map(item => {
        if (item.plant.id === plantId) {
          return {
            ...item,
            gpsLocation: {
              latitude: fallbackLat,
              longitude: fallbackLng,
              timestamp: new Date().toISOString()
            }
          };
        }
        return item;
      }));

      triggerScannedFeedback(`📍 GPS location recorded for item`, 'success', 3500);
    }
  };

  // Start camera stream with specific device or mode with iPhone high-res & autofocus optimizations
  const startCameraStream = async (deviceId?: string, mode: 'environment' | 'user' = facingMode) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsTorchOn(false);
    }

    try {
      let constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: { ideal: mode }
        }
      };

      if (deviceId) {
        constraints = {
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: mode } }
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      // Check track capabilities (Torch, Zoom, Continuous Focus)
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          if ('getCapabilities' in track) {
            const caps = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
            if (caps && caps.torch) {
              setIsTorchSupported(true);
            } else {
              setIsTorchSupported(false);
            }
            if (caps && caps.zoom) {
              setMinZoom(caps.zoom.min || 1);
              setMaxZoom(caps.zoom.max || 1);
              setZoomLevel(caps.zoom.min || 1);
            }
          }
          // Request continuous focus and auto-exposure if supported
          if ('applyConstraints' in track) {
            await track.applyConstraints({
              advanced: [
                { focusMode: 'continuous' } as any,
                { exposureMode: 'continuous' } as any,
                { whiteBalanceMode: 'continuous' } as any
              ]
            }).catch(() => {});
          }
        } catch (e) {
          // Ignore capability check errors
        }
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

  // Toggle Torch / Flashlight for outdoor/shadow scanning
  const toggleTorch = async () => {
    resetCameraTimer();
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }] as any
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle not supported on this track:', e);
      }
    }
  };

  // Set hardware camera zoom (e.g. 1x, 2x for small tags)
  const setZoom = async (newZoom: number) => {
    resetCameraTimer();
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await track.applyConstraints({
          advanced: [{ zoom: newZoom }] as any
        });
        setZoomLevel(newZoom);
      } catch (e) {
        console.warn('Zoom constraint not supported:', e);
      }
    }
  };

  // Switch to next available camera device or flip camera
  const switchCameraDevice = async () => {
    resetCameraTimer();
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
      setIsTorchOn(false);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    setCartItems(prev => prev.filter(item => item.plant.id !== plantId));
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => acc + (getItemEffectiveUnitPrice(item) * item.quantity), 0);
  };

  const [isSavedInPlace, setIsSavedInPlace] = useState<boolean>(false);

  // Save current order in place without leaving the scan screen or changing views
  const handleSaveInPlace = () => {
    if (cartItems.length === 0) {
      triggerScannedFeedback('Add at least one item to save the order.', 'warning');
      return;
    }
    const finalCustomer = (selectedCustomer || customerSearch || '').trim() || (activeOrder?.customerName || 'Retail Walk-in');
    const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmt = calculateTotal();

    if (activeOrder && onUpdateActiveOrder) {
      const updated: Order = {
        ...activeOrder,
        customerName: finalCustomer,
        items: cartItems,
        itemsCount: totalCount,
        total: totalAmt
      };
      onUpdateActiveOrder(updated);
      clearActiveDraft(activeOrder.id);
      setHasUnsavedChanges(false);
      triggerScannedFeedback(`Saved changes to Order #${activeOrder.id}`, 'success');
    } else {
      onCompleteOrder(cartItems, finalCustomer);
      clearActiveDraft();
      setHasUnsavedChanges(false);
      triggerScannedFeedback('Order saved successfully!', 'success');
    }

    setIsSavedInPlace(true);
    setTimeout(() => {
      setIsSavedInPlace(false);
    }, 2500);
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
      clearActiveDraft(activeOrder.id);
      setHasUnsavedChanges(false);
      onNavigate('finalization');
    } else {
      onCompleteOrder(cartItems, finalCustomer);
      clearActiveDraft();
      setHasUnsavedChanges(false);
      onNavigate('holding_location');
    }
  };

  // Direct hand-off when customer takes entire order with them (skipping staging / holding area page)
  const handleCustomerTookOrder = () => {
    if (cartItems.length === 0) return;
    const finalCustomer = (selectedCustomer || customerSearch || '').trim() || (activeOrder?.customerName || 'Retail Walk-in');
    const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmt = calculateTotal();

    const itemsTaken = cartItems.map(item => ({
      ...item,
      pickedUpQuantity: item.quantity
    }));

    if (activeOrder && onUpdateActiveOrder) {
      const updated: Order = {
        ...activeOrder,
        customerName: finalCustomer,
        items: itemsTaken,
        itemsCount: totalCount,
        total: totalAmt,
        type: 'Take Now',
        holdingLocation: 'Taken by Customer / No Staging',
        status: 'Completed'
      };
      onUpdateActiveOrder(updated);
      clearActiveDraft(activeOrder.id);
      setHasUnsavedChanges(false);
    } else {
      onCompleteOrder(itemsTaken, finalCustomer, {
        type: 'Take Now',
        holdingLocation: 'Taken by Customer / No Staging',
        status: 'Completed',
        items: itemsTaken
      });
      clearActiveDraft();
      setHasUnsavedChanges(false);
    }
    // Directly navigate to finalization, skipping the holding area page
    onNavigate('finalization');
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
      clearActiveDraft(activeOrder.id);
      setHasUnsavedChanges(false);
    } else {
      onCompleteOrder(cartItems, finalCustomer);
      clearActiveDraft();
      setHasUnsavedChanges(false);
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
            <AutoSaveBadge compact />
            <button
              type="button"
              id="btn-save-in-place-header"
              onClick={handleSaveInPlace}
              disabled={cartItems.length === 0}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                isSavedInPlace
                  ? 'bg-[#0e6c4a] text-white border-[#0e6c4a]'
                  : 'bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white border-[#012d1d]'
              } disabled:opacity-50`}
              title="Save current order changes without leaving this scan screen"
            >
              {isSavedInPlace ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
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
                  clearActiveDraft(activeOrder?.id);
                  onStartNewOrder();
                  setCartItems([]);
                  setSelectedCustomer('');
                  setCustomerSearch('');
                  setHasUnsavedChanges(false);
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
              <Search className="w-5 h-5 text-[#717973] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer(e.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder="Customer Name (e.g. Retail Walk-in, John Smith)..."
                className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-11 pr-16 py-3 text-lg font-bold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white transition-all shadow-2xs placeholder:text-base placeholder:font-normal"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
                    <X className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className="p-1.5 text-[#717973] hover:text-[#012d1d] rounded cursor-pointer"
                  title="Toggle customer list"
                >
                  {isDropdownOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Searchable Dropdown Popup Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[#c1c8c2] rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-fade-in">
                <div className="p-2 flex flex-col gap-1.5">
                  <div className="px-3.5 py-2 text-xs sm:text-sm font-extrabold text-[#717973] uppercase tracking-wider bg-[#f9faf6] rounded-lg flex justify-between items-center">
                    <span>Customer Accounts ({matchingCustomers.length})</span>
                    <span className="text-xs font-semibold text-[#717973]">Type to filter</span>
                  </div>

                  {matchingCustomers.length === 0 ? (
                    <div className="p-4 text-center text-base text-[#717973]">
                      <span>No matching customers found.</span>
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customerSearch);
                            setIsDropdownOpen(false);
                          }}
                          className="mt-2.5 w-full bg-[#a0f4c8]/30 hover:bg-[#a0f4c8] text-[#002113] font-black py-3 px-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                        >
                          <User className="w-5 h-5 text-[#0e6c4a]" />
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
                          className={`w-full text-left px-4 py-3 rounded-xl text-base sm:text-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#012d1d] text-white font-bold'
                              : 'hover:bg-[#f3f4f0] text-[#1a1c1a]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <User className={`w-5 h-5 shrink-0 ${isSelected ? 'text-[#a0f4c8]' : 'text-[#0e6c4a]'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className={`font-extrabold text-base sm:text-lg truncate ${isSelected ? 'text-white' : 'text-[#1a1c1a]'}`}>
                                {cust.name}
                              </span>
                              {cust.company && cust.company !== cust.name && (
                                <span className={`text-xs sm:text-sm font-semibold truncate mt-0.5 ${isSelected ? 'text-[#a0f4c8]/80' : 'text-[#717973]'}`}>
                                  {cust.company}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 ml-2">
                            <span
                              className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-md ${
                                isSelected
                                  ? 'bg-[#a0f4c8] text-[#002113]'
                                  : 'bg-[#e2e3df] text-[#414844]'
                              }`}
                            >
                              {cust.type}
                            </span>
                            {isSelected && <Check className="w-5 h-5 text-[#a0f4c8]" />}
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
            className="border border-[#012d1d] px-4 py-3 rounded-xl text-base font-extrabold text-[#012d1d] hover:bg-[#e7e9e5] transition-colors shrink-0 cursor-pointer shadow-2xs"
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
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#c1c8c2] rounded-2xl shadow-2xl z-40 max-h-80 overflow-y-auto divide-y divide-[#f3f4f0] animate-fade-in">
                {(() => {
                  const q = manualBarcodeInput.trim().toLowerCase();
                  const searchTerms = q.split(/\s+/).filter(Boolean);
                  const matches = inventory.filter(p => {
                    const searchable = `${p.name} ${p.botanicalName || ''} ${p.commonName || ''} ${p.category || ''} ${p.size || ''} ${p.itemNo || ''} ${p.barcode || ''}`.toLowerCase();
                    return searchTerms.every(term => searchable.includes(term));
                  }).slice(0, 8);

                  if (matches.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-[#717973]">
                        No exact plant matches for "{manualBarcodeInput}". Press Enter or Browse Catalog to search all inventory.
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
                          className="w-12 h-12 rounded-xl object-cover bg-[#f3f4f0] shrink-0 border border-[#c1c8c2]"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-extrabold text-[#012d1d] truncate group-hover:text-[#0e6c4a]">
                            {plant.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-[#a0f4c8]" />
                              #{plant.itemNo || plant.barcode || 'N/A'}
                            </span>
                            <span className="bg-[#461702] text-amber-100 text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Package className="w-2.5 h-2.5 text-amber-300" />
                              SIZE: {plant.size || 'Standard'}
                            </span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              plant.stock < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : plant.stock === 0
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : plant.stock < 5
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#f3f4f0] text-[#414844]'
                            }`}>
                              Avail: <strong className={plant.stock < 0 ? 'text-rose-900' : plant.stock === 0 ? 'text-red-700' : 'text-[#012d1d]'}>{plant.stock}</strong>
                              {plant.stock < 0 ? <span className="text-[10px] text-rose-700 font-extrabold">(Backorder)</span> : plant.stock === 0 ? <span className="text-[10px] text-red-600 font-extrabold">(Out of stock)</span> : ''}
                            </span>
                          </div>
                          {(plant.botanicalName || plant.commonName) && (
                            <p className="text-xs text-[#414844] truncate italic mt-0.5">
                              {plant.botanicalName || plant.commonName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-base font-extrabold text-[#012d1d]">
                          ${plant.price.toFixed(2)}
                        </span>
                        <span className="bg-[#012d1d] text-[#a0f4c8] text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 group-hover:bg-[#0e6c4a] shadow-2xs">
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
              onClick={() => {
                if (feedbackTimerRef.current) {
                  clearTimeout(feedbackTimerRef.current);
                  feedbackTimerRef.current = null;
                }
                setScannedFeedback(null);
              }}
              className="p-1 hover:bg-black/10 rounded-full cursor-pointer"
              title="Dismiss notification"
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
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <span className="flex items-center gap-1 font-mono bg-black/60 backdrop-blur-xs px-2 py-1 rounded-md border border-white/10">
                <QrCode className="w-3.5 h-3.5 text-[#a0f4c8]" />
                {cameraActive ? 'CAMERA LIVE' : 'DEMO SCANNER'}
              </span>

              {cameraActive && (
                <button
                  type="button"
                  onClick={() => {
                    if (cameraTimeout > 0) {
                      resetCameraTimer();
                      triggerScannedFeedback(`Camera timer reset to ${cameraTimeout}s`, 'success', 2500);
                    }
                  }}
                  className={`backdrop-blur-xs border px-2 py-1 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    cameraTimeout === 0
                      ? 'bg-black/60 text-white/90 border-white/20'
                      : cameraTimeLeft <= 4
                      ? 'bg-amber-500/90 text-black border-amber-300 font-extrabold shadow-[0_0_8px_#f59e0b] animate-pulse'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title={cameraTimeout === 0 ? "Continuous camera stream (No timeout)" : "Click to reset auto-off timer"}
                >
                  <Clock className={`w-3.5 h-3.5 ${cameraTimeout > 0 && cameraTimeLeft <= 4 ? 'text-black' : 'text-[#a0f4c8]'}`} />
                  <span>{cameraTimeout === 0 ? 'Continuous' : `${cameraTimeLeft}s auto-off`}</span>
                  {cameraTimeout > 0 && <RefreshCw className="w-2.5 h-2.5 opacity-70 ml-0.5" />}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Quick Timeout Selector Menu */}
              <div className="relative pointer-events-auto" ref={timeoutMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsTimeoutMenuOpen(!isTimeoutMenuOpen)}
                  className={`backdrop-blur-xs border px-2 py-1 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    isTimeoutMenuOpen
                      ? 'bg-[#a0f4c8] text-[#002113] border-[#0e6c4a] font-bold'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title="Configure Camera Timeout (10s, 15s, 30s, 60s, Never)"
                >
                  <Timer className="w-3.5 h-3.5 text-[#a0f4c8]" />
                  <span>{cameraTimeout === 0 ? 'No Timeout' : `${cameraTimeout}s`}</span>
                  <ChevronDown className="w-3 h-3 opacity-75" />
                </button>

                {isTimeoutMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#1a1c1a] border border-[#c1c8c2]/40 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-white animate-fade-in">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10 px-1">
                      <span className="text-[11px] font-bold text-[#a0f4c8] uppercase tracking-wider flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Camera Timeout
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTimeoutMenuOpen(false)}
                        className="text-white/60 hover:text-white p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {[
                      { label: '10s (Fast Battery Saver)', val: 10 },
                      { label: '15s (Standard Recommended)', val: 15 },
                      { label: '30s (Extended Scanning)', val: 30 },
                      { label: '60s (Continuous Batch)', val: 60 },
                      { label: 'Never (Continuous Stream)', val: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          if (onUpdateCameraTimeout) {
                            onUpdateCameraTimeout(opt.val);
                          }
                          if (opt.val > 0) {
                            setCameraTimeLeft(opt.val);
                          }
                          setIsTimeoutMenuOpen(false);
                          triggerScannedFeedback(
                            `Camera auto-off set to ${opt.val === 0 ? 'Never (Continuous)' : `${opt.val}s`}`,
                            'success',
                            3000
                          );
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          cameraTimeout === opt.val
                            ? 'bg-[#0e6c4a] text-white font-bold'
                            : 'hover:bg-white/10 text-white/90'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {cameraTimeout === opt.val && <Check className="w-3.5 h-3.5 text-[#a0f4c8]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {cameraActive && isTorchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`backdrop-blur-xs border px-2 py-1 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    isTorchOn
                      ? 'bg-[#a0f4c8] text-[#002113] border-[#0e6c4a] font-bold shadow-[0_0_8px_#a0f4c8]'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title="Toggle flashlight / torch for dark nursery areas"
                >
                  {isTorchOn ? <Zap className="w-3.5 h-3.5 text-[#002113]" /> : <ZapOff className="w-3.5 h-3.5 text-white/80" />}
                  <span>{isTorchOn ? 'Flash ON' : 'Flash'}</span>
                </button>
              )}
              {cameraActive && maxZoom > 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(zoomLevel === 1 ? Math.min(2, maxZoom) : 1)}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-xs border border-white/20 px-2 py-1 rounded-md text-white text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  title="Toggle 2x camera zoom for smaller barcode tags"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-[#a0f4c8]" />
                  <span>{zoomLevel > 1 ? `${zoomLevel.toFixed(1)}x` : '2x Zoom'}</span>
                </button>
              )}
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
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-[#012d1d]">Current Order Items</h2>
            {cartItems.length > 0 && (() => {
              const gpsCount = cartItems.filter(i => !!gpsLoggedMap[i.plant.id] || !!i.gpsLocation).length;
              return (
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  gpsCount > 0 
                    ? 'bg-[#a0f4c8]/50 text-[#002113] border-[#0e6c4a]/30' 
                    : 'bg-[#e7e9e5] text-[#717973] border-[#c1c8c2]'
                }`}>
                  <MapPin className="w-3 h-3 text-[#0e6c4a]" />
                  <span>{gpsCount}/{cartItems.length} GPS Logged</span>
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (cartItems.length > 0) {
                    setMapModalItem(cartItems[0]);
                  }
                }}
                className="text-xs font-bold text-[#012d1d] hover:text-white bg-[#a0f4c8]/40 hover:bg-[#0e6c4a] px-2.5 py-1 rounded-lg border border-[#0e6c4a]/30 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="View full nursery yard map with all scanned plants"
              >
                <MapIcon className="w-3.5 h-3.5 text-[#0e6c4a]" />
                <span>Nursery Yard Map</span>
              </button>
            )}

            <span className="bg-[#e7e9e5] text-[#414844] text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
            </span>
          </div>
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
              const gpsLocation = gpsLoggedMap[item.plant.id] || (item.gpsLocation ? `${item.gpsLocation.latitude.toFixed(4)}° N, ${Math.abs(item.gpsLocation.longitude).toFixed(4)}° W` : null);
              const unitPrice = getItemEffectiveUnitPrice(item);
              const lineTotal = unitPrice * item.quantity;

              return (
                <div
                  key={item.plant.id}
                  className="bg-white rounded-xl p-3.5 border border-[#c1c8c2] shadow-2xs flex flex-col gap-2.5 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div 
                      onClick={() => openPlantVerification(item.plant)}
                      className="flex gap-3 items-start min-w-0 flex-1 cursor-pointer group"
                      title="Tap to verify plant details & adjust quantity"
                    >
                      <img
                        src={item.plant.image || DEFAULT_PLANT_IMAGE}
                        alt={item.plant.name}
                        className="w-12 h-12 rounded-lg object-cover bg-[#f3f4f0] shrink-0 border border-[#c1c8c2]/60 mt-0.5 group-hover:border-[#0e6c4a] transition-colors"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-base text-[#1a1c1a] group-hover:text-[#0e6c4a] transition-colors truncate">
                            {item.plant.name}
                          </h3>
                        </div>

                        {/* High-Visibility Loading Identifiers: Product #, Size & GPS Status Indicator */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#012d1d] shadow-2xs">
                            <Tag className="w-3 h-3 text-[#a0f4c8]" />
                            #{item.plant.itemNo || item.plant.barcode || 'N/A'}
                          </span>
                          <span className="bg-[#461702] text-amber-100 text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#461702] shadow-2xs">
                            <Package className="w-3 h-3 text-amber-300" />
                            SIZE: {item.plant.size || 'Standard'}
                          </span>

                          {/* GPS Logged Status Indicator Badge */}
                          {gpsLocation ? (
                            <span className="bg-[#0e6c4a] text-[#a0f4c8] text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#0e6c4a] shadow-2xs">
                              <MapPin className="w-3 h-3 text-[#a0f4c8]" />
                              <span>GPS Logged</span>
                            </span>
                          ) : (
                            <span className="bg-[#f3f4f0] text-[#717973] text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#c1c8c2]">
                              <MapPin className="w-2.5 h-2.5 text-[#717973]" />
                              <span>No GPS</span>
                            </span>
                          )}
                        </div>
                        
                        {(item.plant.botanicalName || item.plant.commonName) && (
                          <p className="text-xs text-[#414844] italic truncate mt-1">
                            {item.plant.botanicalName || item.plant.commonName}
                          </p>
                        )}

                        {/* Interactive 4-Tier Pricing Dropdown */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <PricingDropdown
                            plant={item.plant}
                            currentPrice={unitPrice}
                            selectedLevelKey={item.selectedPriceLevel}
                            onSelectPriceLevel={(levelKey, newPrice) => updateItemPriceLevel(item.plant.id, levelKey, newPrice)}
                            size="sm"
                          />
                          
                          {item.quantity > 1 && (
                            <span className="text-xs font-bold text-[#012d1d]">
                              Total: ${lineTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openPlantVerification(item.plant)}
                        className="text-xs font-bold text-[#0e6c4a] bg-[#a0f4c8]/40 hover:bg-[#a0f4c8] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Verify plant & edit quantity"
                      >
                        Verify / Qty
                      </button>
                      <button
                        onClick={() => removeItem(item.plant.id)}
                        className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity, Pick-up/Delivery, GPS & View on Map Action Controls */}
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

                    {/* GPS Action Controls */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Log / Update GPS Button */}
                      <button
                        type="button"
                        onClick={() => handleLogGPS(item.plant.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer active:scale-95 ${
                          gpsLocation
                            ? 'bg-[#a0f4c8] border-[#0e6c4a] text-[#002113]'
                            : 'bg-[#f3f4f0] border-[#c1c8c2] text-[#414844] hover:bg-[#e2e3df]'
                        }`}
                        title={gpsLocation ? "Re-log / update current GPS coordinates" : "Log GPS coordinates for this plant in nursery"}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#0e6c4a]" />
                        <span>{gpsLocation ? 'Update GPS' : 'Log GPS'}</span>
                      </button>

                      {/* View on Map Button */}
                      <button
                        type="button"
                        onClick={() => setMapModalItem(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white border border-[#012d1d] transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="View plant location on Yard Map"
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>
                    </div>
                  </div>

                  {itemFulfillmentMap[item.plant.id] === 'Pick-up/Delivery' && (
                    <div className="text-[11px] text-[#0e6c4a] font-semibold bg-[#a0f4c8]/30 px-2.5 py-1 rounded-md border border-[#0e6c4a]/30 flex items-center justify-between">
                      <span>📦 Tagged for later Pick-up / Delivery</span>
                      <span className="text-[10px] text-[#19724f] font-mono uppercase">(Customer leaving item)</span>
                    </div>
                  )}

                  {/* GPS Details Card with View on Map Button */}
                  {gpsLocation && (
                    <div className="flex items-center justify-between gap-2 bg-[#e8f5e9] text-[#012d1d] px-3 py-2 rounded-xl border border-[#a0f4c8] shadow-2xs flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#0e6c4a] text-[#a0f4c8] flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#012d1d] flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#0e6c4a] font-black">GPS Logged:</span>
                            <span className="font-mono text-xs text-[#002113] bg-white/80 px-1.5 py-0.5 rounded border border-[#a0f4c8]/60">
                              {gpsLocation}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMapModalItem(item)}
                        className="px-2.5 py-1 bg-[#0e6c4a] hover:bg-[#0b5338] text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs transition-all active:scale-95"
                        title="Open interactive yard map"
                      >
                        <MapIcon className="w-3.5 h-3.5 text-[#a0f4c8]" />
                        <span>View on Map</span>
                      </button>
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-[#012d1d] block">Total</span>
              <AutoSaveBadge />
            </div>
            <span className="text-xs text-[#717973] font-semibold">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)} items in order
            </span>
          </div>
          <span className="font-bold text-2xl text-[#012d1d]">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>

        {activeOrder ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                id="btn-save-in-place-active"
                onClick={handleSaveInPlace}
                disabled={cartItems.length === 0}
                className={`bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.99] disabled:opacity-50 text-[#a0f4c8] hover:text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm sm:text-base border border-[#a0f4c8]/30 ${
                  isSavedInPlace ? '!bg-[#0e6c4a] !text-white' : ''
                }`}
                title="Save order changes right here without leaving this scan screen"
              >
                {isSavedInPlace ? (
                  <>
                    <Check className="w-5 h-5 text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleComplete();
                }}
                disabled={cartItems.length === 0}
                className="flex-1 bg-[#19724f] hover:bg-[#0e6c4a] active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm sm:text-base"
                title="Save changes and open order details page"
              >
                <CheckCircle className="w-5 h-5 text-[#a0f4c8]" />
                <span>Save & Go to Order</span>
              </button>

              <button
                type="button"
                id="btn-customer-took-order-active"
                onClick={handleCustomerTookOrder}
                disabled={cartItems.length === 0}
                className="bg-[#0e6c4a] hover:bg-[#0b5338] active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3.5 px-3 rounded-xl shadow-md transition-all flex justify-center items-center gap-1.5 cursor-pointer text-sm shrink-0 border border-[#a0f4c8]/30"
                title="Customer took all items now - skip staging holding area"
              >
                <CheckCircle2 className="w-4 h-4 text-[#a0f4c8]" />
                <span>Customer Took All</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCompleteAndGoToHolding();
                }}
                disabled={cartItems.length === 0}
                className="bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 px-3 rounded-xl shadow-md transition-all flex justify-center items-center gap-1.5 cursor-pointer text-sm shrink-0"
                title="Save changes and proceed to staging map"
              >
                <MapPin className="w-4 h-4" />
                <span>Holding Map</span>
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-2 cursor-pointer text-xs"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Cancel or Delete Order {activeOrder.id}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                id="btn-save-in-place-new"
                onClick={handleSaveInPlace}
                disabled={cartItems.length === 0}
                className={`bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.99] disabled:opacity-50 text-[#a0f4c8] hover:text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm sm:text-base border border-[#a0f4c8]/30 ${
                  isSavedInPlace ? '!bg-[#0e6c4a] !text-white' : ''
                }`}
                title="Save order without navigating away from the scan screen"
              >
                {isSavedInPlace ? (
                  <>
                    <Check className="w-5 h-5 text-white" />
                    <span>Order Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Order (Stay on Screen)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-customer-took-order"
                onClick={handleCustomerTookOrder}
                disabled={cartItems.length === 0}
                className="flex-1 bg-[#0e6c4a] hover:bg-[#0b5338] active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm sm:text-base border border-[#a0f4c8]/30"
                title="Customer took the entire order with them now - skips holding area staging"
              >
                <CheckCircle2 className="w-5 h-5 text-[#a0f4c8]" />
                <span>Customer Took All</span>
              </button>

              <button
                type="button"
                id="btn-stage-holding-area"
                onClick={() => {
                  handleComplete();
                }}
                disabled={cartItems.length === 0}
                className="bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer text-sm shrink-0"
                title="Assign holding area for staging / later pickup"
              >
                <MapPin className="w-4 h-4" />
                <span>Stage in Holding Area</span>
              </button>
            </div>
            
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full bg-[#f3f4f0] hover:bg-red-50 hover:text-red-700 text-[#717973] font-bold py-2 rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel / Clear Order</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Cancel Order Confirmation Modal */}
      {isCancelModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsCancelModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-base text-[#1a1c1a]">
                  {activeOrder ? `Cancel or Delete Order #${activeOrder.id}?` : 'Cancel and Discard Order?'}
                </h3>
                <p className="text-xs text-[#717973] mt-0.5">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)} plants in cart (${calculateTotal().toFixed(2)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 text-[#717973] hover:text-[#1a1c1a] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f3f4f0] p-3 rounded-xl text-xs text-[#414844] space-y-1">
              <p className="font-bold text-[#1a1c1a]">
                {activeOrder ? 'Choose how you want to handle this order:' : 'Are you sure you want to discard all scanned items in this order?'}
              </p>
              {activeOrder && (
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#717973]">
                  <li><strong className="text-red-700">Delete Order:</strong> Erases this order completely from system database.</li>
                  <li><strong className="text-amber-800">Discard Changes:</strong> Reverts unsaved changes and goes back to orders list.</li>
                </ul>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#e2e3df]">
              {activeOrder ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      clearActiveDraft(activeOrder.id);
                      if (onDeleteOrder && activeOrder) {
                        onDeleteOrder(activeOrder.id);
                      }
                      setIsCancelModalOpen(false);
                      onNavigate('orders');
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearActiveDraft(activeOrder.id);
                      setHasUnsavedChanges(false);
                      setIsCancelModalOpen(false);
                      onNavigate('orders');
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Discard Edits & Exit</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    clearActiveDraft();
                    setCartItems([]);
                    setSelectedCustomer('');
                    setCustomerSearch('');
                    setHasUnsavedChanges(false);
                    setIsCancelModalOpen(false);
                    if (onStartNewOrder) onStartNewOrder();
                    onNavigate('orders');
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Discard Order & Return to Orders</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="w-full bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Keep Editing Order
            </button>
          </div>
        </div>
      )}

      {/* Unrecognized Barcode Assignment Modal */}
      {unrecognizedCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 my-2 mb-16">
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
              {inventory.slice(0, 15).map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => {
                    plant.barcode = unrecognizedCode;
                    setHasUnsavedChanges(true);
                    setCartItems(prev => {
                      const existing = prev.find(i => i.plant.id === plant.id);
                      if (existing) {
                        return prev.map(i => i.plant.id === plant.id ? { ...i, quantity: i.quantity + 1 } : i);
                      } else {
                        return [...prev, { plant, quantity: 1 }];
                      }
                    });
                    triggerScannedFeedback(
                      `Assigned code "${unrecognizedCode}" to ${plant.name} (${plant.size || 'Std'}) and added to cart!`,
                      'success',
                      10500
                    );
                    setUnrecognizedCode(null);
                  }}
                  className="p-2.5 bg-white hover:bg-[#a0f4c8]/30 rounded-xl border border-[#c1c8c2] text-left flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[#012d1d] group-hover:text-[#0e6c4a] truncate">{plant.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[10px] font-bold px-1.5 py-0.2 rounded">
                        #{plant.itemNo || plant.barcode || 'N/A'}
                      </span>
                      <span className="bg-[#461702] text-amber-100 text-[10px] font-bold px-1.5 py-0.2 rounded">
                        SIZE: {plant.size || 'Standard'}
                      </span>
                      <span className="text-[11px] font-bold text-[#012d1d] ml-1">
                        ${plant.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0e6c4a] bg-[#a0f4c8] px-2.5 py-1 rounded-lg shrink-0">Select & Add</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 my-2 mb-16 overflow-hidden">
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
                  const searchTerms = catalogSearchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
                  const searchable = `${p.name} ${p.botanicalName || ''} ${p.commonName || ''} ${p.category || ''} ${p.size || ''} ${p.itemNo || ''} ${p.barcode || ''}`.toLowerCase();
                  return searchTerms.every(term => searchable.includes(term));
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
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-[#a0f4c8]" />
                              #{plant.itemNo || plant.barcode || 'N/A'}
                            </span>
                            <span className="bg-[#461702] text-amber-100 text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Package className="w-2.5 h-2.5 text-amber-300" />
                              SIZE: {plant.size || 'Standard'}
                            </span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              plant.stock < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : plant.stock === 0
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : plant.stock < 5
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#f3f4f0] text-[#414844]'
                            }`}>
                              Stock: <strong className={plant.stock < 0 ? 'text-rose-900' : plant.stock === 0 ? 'text-red-700' : 'text-[#012d1d]'}>{plant.stock}</strong>
                              {plant.stock < 0 ? <span className="text-[10px] text-rose-700 font-extrabold">(Backorder)</span> : plant.stock === 0 ? <span className="text-[10px] text-red-600 font-extrabold">(Out of stock)</span> : ''}
                            </span>
                          </div>
                          {(plant.botanicalName || plant.commonName) && (
                            <p className="text-xs text-[#414844] truncate italic mt-0.5">
                              {plant.botanicalName || plant.commonName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                        <PricingDropdown
                          plant={plant}
                          currentPrice={plant.prices?.[customerType === 'WHOLESALE' ? 'wholesale' : 'retail'] ?? plant.price}
                          selectedLevelKey={customerType === 'WHOLESALE' ? 'wholesale' : 'retail'}
                          onSelectPriceLevel={(levelKey, newPrice) => {
                            addPlantToCart(plant, 1, levelKey);
                          }}
                          size="xs"
                        />

                        <button
                          type="button"
                          onClick={() => addPlantToCart(plant)}
                          className="bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs sm:text-sm font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{inCartCount > 0 ? `Add (${inCartCount})` : 'Add'}</span>
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
      {/* Plant Verification & Quantity Confirmation Pop-up Modal */}
      <PlantVerificationModal
        isOpen={verifyingPlant !== null}
        plant={verifyingPlant?.plant || null}
        initialQuantity={verifyingPlant?.initialQty}
        existingCartItem={verifyingPlant?.existingCartItem}
        customerType={customerType}
        onConfirm={handleConfirmPlantVerification}
        onClose={() => setVerifyingPlant(null)}
      />

      {/* Plant Yard & GPS Map Modal */}
      <PlantMapModal
        isOpen={mapModalItem !== null}
        onClose={() => setMapModalItem(null)}
        selectedItem={mapModalItem}
        allItems={cartItems}
        gpsLoggedMap={gpsLoggedMap}
        onLogGPS={handleLogGPS}
      />
    </div>
  );
};
