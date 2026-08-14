import React, { useState } from 'react';
import { ScreenType } from '../types';
import { 
  BookOpen, 
  Search, 
  UserPlus, 
  User, 
  Barcode, 
  Edit3, 
  CheckCircle2, 
  Mail, 
  Printer, 
  MapPin, 
  Truck, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Smartphone, 
  AlertCircle, 
  Plus, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  FileSpreadsheet,
  Zap,
  ShoppingBag,
  HelpCircle,
  Camera,
  RefreshCw,
  Sliders,
  CheckCircle
} from 'lucide-react';

interface InstructionsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

type GuideTopic = 'all' | 'new_order' | 'editing_order' | 'completing_order' | 'partial_pickup' | 'scanning' | 'data_sync';

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ onNavigate }) => {
  const [activeTopic, setActiveTopic] = useState<GuideTopic>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq_new_customer');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setExpandedFaq(prev => prev === id ? null : id);
  };

  const copyCheatSheet = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const topics: { id: GuideTopic; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'all', label: 'All Instructions', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'new_order', label: '1. New Order & Customers', icon: <UserPlus className="w-4 h-4" />, badge: 'Essential' },
    { id: 'editing_order', label: '2. Edit & Modify Orders', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'completing_order', label: '3. Complete & Fulfill', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'partial_pickup', label: '4. Partial Pickup & Staff Email', icon: <Mail className="w-4 h-4" />, badge: 'Updated' },
    { id: 'scanning', label: '5. Barcode & Scanning', icon: <Barcode className="w-4 h-4" /> },
    { id: 'data_sync', label: '6. Customers & Inventory Sync', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-4xl mx-auto pb-44 animate-fade-in flex flex-col gap-6 text-[#1a1c1a]">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#012d1d] via-[#08422a] to-[#0e6c4a] text-white p-6 rounded-3xl shadow-md border border-[#19724f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#a0f4c8]/20 text-[#a0f4c8] flex items-center justify-center shrink-0 border border-[#a0f4c8]/30 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#a0f4c8] bg-[#a0f4c8]/20 px-2.5 py-0.5 rounded-full">
                Operations Handbook
              </span>
              <span className="text-xs text-white/70">Maple Lane Nursery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
              Nursery Staff User Guide
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
              Complete step-by-step instructions for entering new customer orders, creating unlisted accounts, scanning plants, modifying loads, managing partial pickups, and emailing hold tickets.
            </p>
          </div>
        </div>

        {/* Quick New Order Button */}
        <button
          onClick={() => onNavigate('scan')}
          className="bg-[#a0f4c8] hover:bg-[#bbf9da] text-[#012d1d] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Start a New Order</span>
        </button>
      </div>

      {/* Search & Topic Filters */}
      <div className="flex flex-col gap-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#717973] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instructions (e.g., 'new customer', 'partial pickup', 'email staff', 'holding area')..."
            className="w-full bg-white border border-[#c1c8c2] rounded-2xl pl-10 pr-10 py-3 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] shadow-2xs placeholder:text-xs placeholder:font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#717973] hover:text-[#1a1c1a] p-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Topic Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar text-xs">
          {topics.map((t) => {
            const isActive = activeTopic === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.id)}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d] shadow-2xs'
                    : 'bg-white text-[#414844] border-[#c1c8c2] hover:border-[#012d1d] hover:bg-[#f9faf6]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                    isActive ? 'bg-[#a0f4c8] text-[#012d1d]' : 'bg-[#e2e3df] text-[#414844]'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Jump Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => onNavigate('scan')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center text-xs font-bold">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">1. New Order</span>
          <span className="text-[11px] text-[#717973]">Scan & add plants</span>
        </button>

        <button
          onClick={() => onNavigate('orders')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#a0f4c8] text-[#002113] flex items-center justify-center text-xs font-bold">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">2. View Orders</span>
          <span className="text-[11px] text-[#717973]">Manage & edit loads</span>
        </button>

        <button
          onClick={() => onNavigate('holding_location')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#f3f4f0] text-[#012d1d] flex items-center justify-center text-xs font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">3. Staging Bays</span>
          <span className="text-[11px] text-[#717973]">Greenhouses & shade</span>
        </button>

        <button
          onClick={() => onNavigate('data_management')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#f3f4f0] text-[#012d1d] flex items-center justify-center text-xs font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">4. Customer List</span>
          <span className="text-[11px] text-[#717973]">Manage accounts</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ENTERING A NEW ORDER & CUSTOMER NAMES (INCLUDING UNLISTED) */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'new_order') && matchesSearch('new order customer enter name scan unlisted') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#461702] text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#461702]">
                  Order Creation Workflow
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                  Entering a New Order & Customer Name
                </h2>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full shrink-0 w-fit">
              Includes Unlisted / Custom Customers
            </span>
          </div>

          {/* Step 1: Customer Name Entry - Deep Dive */}
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-[#012d1d] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0e6c4a]" />
              <span>Step 1: Selecting or Entering Any Customer Name</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
              When starting an order from the <strong>Scan Screen</strong> or home dashboard, you can choose from your existing customer database or effortlessly type any new customer name on the fly.
            </p>

            {/* Visual UI Simulation: Customer Input */}
            <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#0e6c4a]" />
                  <span>Interactive Screenshot Preview: Customer Search & Entry</span>
                </span>
                <span className="text-[10px] font-bold bg-[#012d1d] text-[#a0f4c8] px-2 py-0.5 rounded">
                  Scan Screen Top Bar
                </span>
              </div>

              {/* Simulated Customer Input Mockup */}
              <div className="bg-white p-4 rounded-xl border border-[#c1c8c2] shadow-sm flex flex-col gap-2">
                <label className="text-[11px] font-extrabold text-[#717973] uppercase">
                  Customer Search Bar (Type Any Name)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#717973] absolute left-3 top-3" />
                  <input
                    type="text"
                    readOnly
                    value="Samantha Greenfield (New Customer)"
                    className="w-full bg-[#f3f4f0] border border-[#012d1d] rounded-xl pl-9 pr-20 py-2 text-xs font-bold text-[#1a1c1a]"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-extrabold bg-[#012d1d] text-[#a0f4c8] px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>

                {/* Simulated Dropdown Prompt for Unlisted Customer */}
                <div className="mt-1 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-900">
                    <UserPlus className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <span className="font-extrabold block">Name not in database?</span>
                      <span className="text-[11px] text-amber-800">
                        The app automatically accepts whatever text you typed!
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-[#a0f4c8] text-[#002113] font-extrabold rounded-lg text-xs shrink-0 shadow-2xs">
                    Use "Samantha Greenfield"
                  </div>
                </div>
              </div>

              {/* Step instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 text-xs">
                <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                  <strong className="text-[#012d1d] block mb-1 font-extrabold">Option A: Existing Customers</strong>
                  <p className="text-[#414844]">
                    Tap the search field and type a few letters of the company or contact name (e.g. <em>"Valley View"</em>, <em>"Pete"</em>). Click their card from the dropdown to automatically apply their wholesale or retail pricing tier.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                  <strong className="text-[#461702] block mb-1 font-extrabold">Option B: Unlisted / New Customers</strong>
                  <p className="text-[#414844]">
                    Simply type their full name into the search bar (e.g. <em>"John & Mary Smith"</em>). You can either tap <strong>"Use [Name] as customer"</strong> or just continue scanning plants. The order will be saved under their custom name!
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Adding Plants to Order */}
            <div className="flex flex-col gap-3 pt-2">
              <h3 className="text-base font-extrabold text-[#012d1d] flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#0e6c4a]" />
                <span>Step 2: Adding Plants & Materials</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#414844]">
                You have 4 fast ways to add items into the active cart:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Camera className="w-4 h-4 text-[#0e6c4a]" />
                    <span>1. Camera Barcode Scanner</span>
                  </div>
                  <p className="text-[#414844]">
                    Tap <strong>"Start Camera Scan"</strong> to turn on live barcode scanning. Point your device camera at pot tags or hangtags. It beeps and vibrates upon detection.
                  </p>
                </div>

                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Barcode className="w-4 h-4 text-[#0e6c4a]" />
                    <span>2. Handheld / Bluetooth Scanner</span>
                  </div>
                  <p className="text-[#414844]">
                    Use the <strong>Manual Barcode Input</strong> box or pair a Bluetooth ring/gun scanner. As barcodes are fired, items instantly append to the cart.
                  </p>
                </div>

                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Search className="w-4 h-4 text-[#0e6c4a]" />
                    <span>3. Plant Catalog Search</span>
                  </div>
                  <p className="text-[#414844]">
                    Tap <strong>"Browse Catalog"</strong> to search by botanical name (e.g. <em>Buxus</em>), common name (<em>Boxwood</em>), or SKU number (e.g. <em>1000</em>).
                  </p>
                </div>

                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Layers className="w-4 h-4 text-[#0e6c4a]" />
                    <span>4. Bulk Materials Quick-Add</span>
                  </div>
                  <p className="text-[#414844]">
                    Tap the <strong>Bulk Soil / Mulch / Stone</strong> bar to quickly tap 0.5 yard, 1 yard, or 2 yard increments without needing a barcode tag.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Staging Zone Selection */}
            <div className="p-4 bg-[#e7f8ef] border border-[#a0f4c8] rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-[#012d1d]">
                <MapPin className="w-5 h-5 text-[#0e6c4a] shrink-0" />
                <div>
                  <span className="font-extrabold block text-sm">Step 3: Staging Bay Selection</span>
                  <span className="text-[#414844]">
                    Click <strong>"Continue to Placement"</strong> to assign the order to a Greenhouse, Shade Bay, Loading Dock, or custom row.
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('holding_location')}
                className="px-3 py-1.5 bg-[#012d1d] text-[#a0f4c8] rounded-xl font-bold shrink-0 cursor-pointer"
              >
                View Zones
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: HOW TO EDIT & MODIFY EXISTING ORDERS */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'editing_order') && matchesSearch('edit order modify quantity customer name price change') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                Order Management
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                How to Edit & Modify an Order
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            Nursery orders can be modified at any time before or during fulfillment. You can adjust plant counts, add substitutes, change prices, rename the customer, or reassign holding bays.
          </p>

          {/* Visual UI Simulation: Order Finalization Screen */}
          <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-[#0e6c4a]" />
                <span>Interactive Screenshot Preview: Order Finalization Screen</span>
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                Edit Mode
              </span>
            </div>

            {/* Order Header Mockup with Edit Customer Name */}
            <div className="bg-white p-4 rounded-2xl border border-[#c1c8c2] shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-[#f3f4f0] pb-3">
                <div>
                  <span className="text-[10px] font-bold text-[#717973] uppercase">Order #ORD-90210-A</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-base font-extrabold text-[#1a1c1a]">Pete's Landscaping Co.</h3>
                    <span className="p-1 rounded bg-[#f3f4f0] text-[#012d1d] text-xs font-bold flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span className="text-[10px]">Click Pencil to Rename</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[#012d1d] block">$540.00</span>
                  <span className="text-[10px] text-[#717973]">3 line items</span>
                </div>
              </div>

              {/* Item Row Mockup */}
              <div className="p-3 bg-[#f3f4f0] rounded-xl border border-[#e2e3df] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold text-xs">
                    5x
                  </div>
                  <div>
                    <span className="font-bold text-[#1a1c1a] block">Emerald Green Arborvitae</span>
                    <span className="text-[11px] text-[#717973]">3 Gal • SKU #1042 • $48.00 ea</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-1 bg-white border border-[#c1c8c2] rounded-lg font-bold text-xs">
                    Qty: 5
                  </span>
                  <span className="px-2 py-1 bg-white border border-[#c1c8c2] rounded-lg font-bold text-xs">
                    $240.00
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#012d1d] text-[#a0f4c8] rounded-lg font-bold text-[11px]">
                    + Add Plant
                  </span>
                  <span className="px-2.5 py-1 bg-[#f3f4f0] text-[#012d1d] rounded-lg font-bold text-[11px]">
                    Scan & Add
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0e6c4a]">
                  Auto-Calculates Live Totals
                </span>
              </div>
            </div>

            {/* Step-by-step editing guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>1. Rename Customer</span>
                </strong>
                <p className="text-[#414844]">
                  Click the pencil icon next to the customer name to edit spelling or switch customer identity.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>2. Add New Items</span>
                </strong>
                <p className="text-[#414844]">
                  Tap <strong>"+ Add Plant"</strong> to select from nursery stock, or <strong>"Scan & Add"</strong> to barcode scan additional pots.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>3. Change Quantities</span>
                </strong>
                <p className="text-[#414844]">
                  Use the <strong>+</strong> and <strong>-</strong> buttons on each item, or click the price to apply custom contractor discounts.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PARTIAL PICKUP & EMAIL STAFF INSTRUCTIONS (NEW FEATURE) */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'partial_pickup') && matchesSearch('partial pickup email staff hold ticket remaining plants yard crew') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                  Split Orders & Staging Holds
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                  Managing Partial Pickups & Emailing Yard Staff
                </h2>
              </div>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 bg-[#a0f4c8] text-[#002113] rounded-full shrink-0 w-fit">
              Staff Email Format Updated
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            When a customer arrives with a trailer or truck that cannot fit their whole order, use <strong>Partial Pickup Mode</strong> to check off what they took, calculate remaining plants left on nursery benches, and automatically dispatch a formatted hold ticket to the yard crew.
          </p>

          {/* Step-by-step Partial Pickup Workflow */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-[#fcfdfa] border border-[#c1c8c2] rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                  <span className="w-6 h-6 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center text-xs">1</span>
                  <span>Turn On Partial Pickup Mode</span>
                </div>
                <p className="text-[#414844]">
                  In the Order Finalization view, toggle the switch <strong>"Partial Pickup (Customer taking split load)"</strong> or set Order Status to <em>"Partial Pickup"</em>.
                </p>
              </div>

              <div className="p-4 bg-[#fcfdfa] border border-[#c1c8c2] rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                  <span className="w-6 h-6 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center text-xs">2</span>
                  <span>Check Off Items Taken</span>
                </div>
                <p className="text-[#414844]">
                  Check the green checkmark next to plants loaded into their vehicle, or adjust individual loaded numbers (e.g. 5 loaded, 5 remaining).
                </p>
              </div>

              <div className="p-4 bg-[#fcfdfa] border border-[#c1c8c2] rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                  <span className="w-6 h-6 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center text-xs">3</span>
                  <span>Review Remaining Manifest</span>
                </div>
                <p className="text-[#414844]">
                  The amber <strong>"Plants Still to Pick Up"</strong> manifest displays the exact counts and SKUs that remain staged in the holding bay.
                </p>
              </div>

              <div className="p-4 bg-[#fcfdfa] border border-[#c1c8c2] rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                  <span className="w-6 h-6 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center text-xs">4</span>
                  <span>Click "Email to Staff"</span>
                </div>
                <p className="text-[#414844]">
                  Tap <strong>"Email to Staff"</strong> to generate the formatted hold email for <code>yard@maplelanenursery.com</code>.
                </p>
              </div>
            </div>

            {/* Formatted Email Format Display */}
            <div className="bg-[#f3f4f0] rounded-2xl p-4 sm:p-5 border border-[#c1c8c2] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#012d1d]" />
                  <span className="font-extrabold text-xs text-[#012d1d] uppercase tracking-wider">
                    Exact Email Layout Generated for Yard Crew
                  </span>
                </div>
                <button
                  onClick={() => copyCheatSheet(
`MAPLE LANE NURSERY - REMAINING PICKUP HOLD TICKET
==================================================
Order Number: ORD-90210-A
Customer Name: Pete's Landscaping Co.
Assigned Holding Bay: Holding Area B - North Hoop House
Expected Pickup Date: Tomorrow
Total Remaining Plants: 5

PLANTS AWAITING PICKUP:
--------------------------------------------------
( 5x )  -  SKU #1042  -  Emerald Green Arborvitae

STAFF INSTRUCTIONS / NOTES:
--------------------------------------------------
Customer took first 5 on flatbed, coming back with trailer tomorrow morning. Daily watering required.`,
                    'email_sample'
                  )}
                  className="px-2.5 py-1 bg-white hover:bg-[#e2e3df] text-[#012d1d] rounded-lg text-xs font-bold flex items-center gap-1 border border-[#c1c8c2] cursor-pointer"
                >
                  {copiedSection === 'email_sample' ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'email_sample' ? 'Copied' : 'Copy Sample'}</span>
                </button>
              </div>

              {/* Monospace Code Block */}
              <pre className="bg-[#1a1c1a] text-[#a0f4c8] p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-white/10 shadow-inner">
{`MAPLE LANE NURSERY - REMAINING PICKUP HOLD TICKET
==================================================
Order Number: ORD-90210-A
Customer Name: Pete's Landscaping Co.
Assigned Holding Bay: Holding Area B - North Hoop House
Expected Pickup Date: 2026-08-15
Total Remaining Plants: 5

PLANTS AWAITING PICKUP:
--------------------------------------------------
( 5x )  -  SKU #1042  -  Emerald Green Arborvitae

STAFF INSTRUCTIONS / NOTES:
--------------------------------------------------
Customer took first 5 on flatbed. Coming back with trailer tomorrow. Daily watering required.`}
              </pre>

              <p className="text-[11px] text-[#717973] italic">
                Note: Each line item in the email is strictly formatted as <code>( Qty ) - SKU # - Plant Name</code> to ensure rapid scanning by yard crew on clipboards or mobile devices.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: COMPLETING & FULFILLING ORDERS */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'completing_order') && matchesSearch('complete order fulfill ready for pickup status save') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0e6c4a] text-white flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                Fulfillment Workflow
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                Completing & Finalizing Orders
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-900 font-extrabold rounded w-fit text-[10px]">
                Pending
              </span>
              <strong className="text-sm font-extrabold text-[#012d1d]">Staging In Progress</strong>
              <p className="text-[#414844]">
                Staff is currently pulling plants from field blocks or hoop houses to assemble in the staging bay.
              </p>
            </div>

            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <span className="px-2 py-0.5 bg-[#a0f4c8] text-[#002113] font-extrabold rounded w-fit text-[10px]">
                Ready for Pickup
              </span>
              <strong className="text-sm font-extrabold text-[#012d1d]">Assembled & Tagged</strong>
              <p className="text-[#414844]">
                Order is fully gathered in the designated holding bay, watered, and ready for customer loading.
              </p>
            </div>

            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <span className="px-2 py-0.5 bg-[#e2e3df] text-[#414844] font-extrabold rounded w-fit text-[10px]">
                Completed
              </span>
              <strong className="text-sm font-extrabold text-[#012d1d]">Fully Picked Up / Delivered</strong>
              <p className="text-[#414844]">
                Customer has driven off with all plants or delivery truck driver has signed off the bill of lading.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#e7f8ef] border border-[#a0f4c8] rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#012d1d]">
              <CheckCircle className="w-5 h-5 text-[#0e6c4a] shrink-0" />
              <div>
                <span className="font-extrabold block text-sm">Save Changes Button</span>
                <span className="text-[#414844]">
                  Always tap the big green <strong>"Save Changes"</strong> button at the bottom of the Order Finalization screen to sync updates across all devices.
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="px-3 py-1.5 bg-[#012d1d] text-[#a0f4c8] rounded-xl font-bold shrink-0 cursor-pointer"
            >
              Go to Orders
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'data_sync' || activeTopic === 'scanning') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-5">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#717973]">
                Troubleshooting & Best Practices
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                Staff FAQs & Quick Tips
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* FAQ 1 */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_new_customer')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: How do I enter a walk-in customer whose name is not in the system?</span>
                {expandedFaq === 'faq_new_customer' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_new_customer' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> On the Scan Screen, tap into the customer search box and type the customer's full name (e.g. <em>"Sarah Jenkins"</em>).
                  </p>
                  <p>
                    A button will appear below the field saying <strong>Use "Sarah Jenkins" as customer</strong>. You can click that button or simply scan your plants and proceed. The system will save the order under that name without requiring a formal account creation step!
                  </p>
                  <p>
                    If you want to save them as a permanent account with Wholesale pricing, go to <strong>Settings &gt; Data Management &gt; Customers &gt; Add Customer</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 2 */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_barcode_trouble')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: What if a plant tag is wet, torn, or unreadable?</span>
                {expandedFaq === 'faq_barcode_trouble' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_barcode_trouble' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> Use the <strong>"Browse Catalog"</strong> button to search by typing the plant's name (e.g. <em>"Spirea"</em>, <em>"Little Princess"</em>) or 4-digit Item Number (e.g. <em>1000</em>).
                  </p>
                  <p>
                    You can tap the plant card directly from the search modal to add it straight into the active cart without scanning.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 3 */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_multi_device')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: How do other nursery staff open this app on their iPhones or Androids?</span>
                {expandedFaq === 'faq_multi_device' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_multi_device' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> Tap the <strong>QR Code icon</strong> in the top header or go to <strong>Settings &gt; Multi-Device Sync</strong>. Have staff open their phone camera and point it at the QR code on your screen to load the app immediately.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer Return Home Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-3 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-2xl font-extrabold text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Return to Nursery Operations Dashboard</span>
        </button>
      </div>
    </div>
  );
};
