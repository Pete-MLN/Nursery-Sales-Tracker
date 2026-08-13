import React, { useState, useRef, useEffect } from 'react';
import { ScreenType, PlantItem, OrderCartItem, Customer } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { Search, Trash2, Plus, Minus, MapPin, CheckCircle, Camera, QrCode, Sparkles, User, RefreshCw, ChevronDown, ChevronUp, Check, X, ArrowRightLeft } from 'lucide-react';

interface ScanScreenProps {
  onNavigate: (screen: ScreenType) => void;
  inventory: PlantItem[];
  customers: Customer[];
  onCompleteOrder: (cartItems: OrderCartItem[], customerName: string) => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  onNavigate,
  inventory,
  customers,
  onCompleteOrder
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('Sarah J.');
  const [customerSearch, setCustomerSearch] = useState<string>('Sarah J.');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [customerType, setCustomerType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [gpsLoggedMap, setGpsLoggedMap] = useState<Record<string, string>>({});
  const [itemFulfillmentMap, setItemFulfillmentMap] = useState<Record<string, 'Take Now' | 'Pick-up/Delivery'>>({});

  const toggleItemFulfillment = (plantId: string) => {
    setItemFulfillmentMap(prev => ({
      ...prev,
      [plantId]: prev[plantId] === 'Pick-up/Delivery' ? 'Take Now' : 'Pick-up/Delivery'
    }));
  };
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial order items matching screenshot 3:
  // Golden Pothos ($22.50), Fiddle Leaf Fig ($65.00), Succulent Arrangement ($45.00)
  const [cartItems, setCartItems] = useState<OrderCartItem[]>([
    {
      plant: inventory.find(p => p.id === 'p1') || inventory[0],
      quantity: 1,
    },
    {
      plant: inventory.find(p => p.id === 'p2') || inventory[1],
      quantity: 1,
    }
  ]);

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
      // Pick a random plant or next plant from inventory
      const unadded = inventory.filter(p => !cartItems.some(c => c.plant.id === p.id));
      const nextPlant = unadded.length > 0 ? unadded[0] : inventory[Math.floor(Math.random() * inventory.length)];
      
      setCartItems(prev => {
        const existing = prev.find(item => item.plant.id === nextPlant.id);
        if (existing) {
          return prev.map(item => 
            item.plant.id === nextPlant.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          return [...prev, { plant: nextPlant, quantity: 1 }];
        }
      });
      setIsScanning(false);
    }, 800);
  };

  const updateQuantity = (plantId: string, delta: number) => {
    setCartItems(prev => 
      prev.map(item => {
        if (item.plant.id === plantId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
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
    onCompleteOrder(cartItems, selectedCustomer);
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

  return (
    <div className="flex-1 px-4 py-4 w-full max-w-2xl mx-auto pb-44 animate-fade-in flex flex-col gap-4">
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
                placeholder="Search customer name or company..."
                className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-16 py-2 text-sm font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white transition-all shadow-2xs"
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
                    className="p-1 text-[#717973] hover:text-[#1a1c1a] rounded cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className="p-1 text-[#717973] hover:text-[#012d1d] rounded cursor-pointer"
                  title="Toggle customer list"
                >
                  {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Searchable Dropdown Popup Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[#c1c8c2] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
                <div className="p-1.5 flex flex-col gap-0.5">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#717973] uppercase tracking-wider bg-[#f9faf6] rounded-md flex justify-between items-center">
                    <span>Customer Accounts ({matchingCustomers.length})</span>
                    <span className="text-[9px] font-normal text-[#717973]">Type name or company to filter</span>
                  </div>

                  {matchingCustomers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#717973]">
                      <span>No matching customers found.</span>
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customerSearch);
                            setIsDropdownOpen(false);
                          }}
                          className="mt-2 w-full bg-[#a0f4c8]/30 hover:bg-[#a0f4c8] text-[#002113] font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-[#0e6c4a]" />
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
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#012d1d] text-white font-bold'
                              : 'hover:bg-[#f3f4f0] text-[#1a1c1a]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#a0f4c8]' : 'text-[#0e6c4a]'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-[#1a1c1a]'}`}>
                                {cust.name}
                              </span>
                              {cust.company && cust.company !== cust.name && (
                                <span className={`text-[10px] truncate ${isSelected ? 'text-[#a0f4c8]/80' : 'text-[#717973]'}`}>
                                  {cust.company}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-[#a0f4c8] text-[#002113]'
                                  : 'bg-[#e2e3df] text-[#414844]'
                              }`}
                            >
                              {cust.type}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#a0f4c8]" />}
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
            className="border border-[#012d1d] px-3 py-2 rounded-xl text-xs font-bold text-[#012d1d] hover:bg-[#e7e9e5] transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Toggle customer rate classification"
          >
            {customerType}
          </button>
        </div>

        {/* Quick Customer Chips */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <span className="text-[#414844] font-semibold tracking-wider text-[11px] uppercase shrink-0">
            Quick Select:
          </span>
          {customers.map((cust) => {
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
                className={`px-3 py-1 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#012d1d] text-[#a0f4c8] font-bold shadow-2xs'
                    : 'bg-[#e2e3df] text-[#1a1c1a] hover:bg-[#d9dad7]'
                }`}
              >
                {cust.name}
              </button>
            );
          })}
        </div>
      </section>

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
      <section className="mt-4 pt-4 border-t border-[#c1c8c2] pb-6 mb-12">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-xl text-[#012d1d]">Total</span>
          <span className="font-bold text-2xl text-[#012d1d]">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>

        <button
          onClick={handleComplete}
          disabled={cartItems.length === 0}
          className="w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Complete Order</span>
        </button>
      </section>
    </div>
  );
};
