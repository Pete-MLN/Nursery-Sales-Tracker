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
  CheckCircle, 
  Building, 
  MessageSquare, 
  Navigation, 
  Compass, 
  Archive, 
  Eye, 
  Globe,
  Warehouse,
  Package,
  Tag,
  Leaf,
  ClipboardCheck,
  ArrowUpRight,
  Sun,
  Store,
  Sprout
} from 'lucide-react';

interface InstructionsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

type GuideTopic = 
  | 'all' 
  | 'new_order' 
  | 'catalog_pricing'
  | 'gps_mapping' 
  | 'holding_bays' 
  | 'editing_order' 
  | 'partial_pickup' 
  | 'inventory_audit' 
  | 'completing_order' 
  | 'data_sync';

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ onNavigate }) => {
  const [activeTopic, setActiveTopic] = useState<GuideTopic>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq_catalog_pricing');
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
    { id: 'all', label: 'All Topics', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'new_order', label: '1. New Order & Fast-Track', icon: <UserPlus className="w-4 h-4" />, badge: 'Take Now' },
    { id: 'catalog_pricing', label: '2. Catalog & 4-Tier Pricing', icon: <Tag className="w-4 h-4" />, badge: 'Updated' },
    { id: 'gps_mapping', label: '3. GPS Yard Mapping & Pins', icon: <Navigation className="w-4 h-4" />, badge: 'Sub-Meter' },
    { id: 'holding_bays', label: '4. Staging Bays & Greenhouses', icon: <Warehouse className="w-4 h-4" /> },
    { id: 'editing_order', label: '5. Edit & Modify Orders', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'partial_pickup', label: '6. Partial Pickup & Staff Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'inventory_audit', label: '7. Stock Audits & Counts', icon: <ClipboardCheck className="w-4 h-4" />, badge: 'Audit Tool' },
    { id: 'completing_order', label: '8. Complete & Archive', icon: <CheckCircle2 className="w-4 h-4" />, badge: 'Fast-Track' },
    { id: 'data_sync', label: '9. Customers & POS Sync', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-5xl mx-auto pb-44 animate-fade-in flex flex-col gap-6 text-[#1a1c1a]">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#012d1d] via-[#08422a] to-[#0e6c4a] text-white p-6 sm:p-7 rounded-3xl shadow-md border border-[#19724f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
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
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Complete reference manual for creating customer orders, expedited "Take Now" walk-in sales with direct email/text receipts, 1-tap "Next Customer" checkout, plant catalog lookup, 4-tier POS pricing, sub-meter GPS yard pinning, and inventory cycle audits.
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
            placeholder="Search guide (e.g. 'catalog search', '4-tier price', 'gps pin', 'partial pickup', 'stock audit')..."
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          onClick={() => onNavigate('scan')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center text-xs font-bold">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">1. New Order</span>
          <span className="text-[10px] text-[#717973]">Scan & add plants</span>
        </button>

        <button
          onClick={() => onNavigate('scan')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#461702] text-amber-100 flex items-center justify-center text-xs font-bold">
            <Tag className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">2. Plant Catalog</span>
          <span className="text-[10px] text-[#717973]">Search & 4-tier POS</span>
        </button>

        <button
          onClick={() => onNavigate('orders')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#004d40] text-[#a0f4c8] flex items-center justify-center text-xs font-bold">
            <Navigation className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">3. Orders & GPS</span>
          <span className="text-[10px] text-[#717973]">Satellite map pins</span>
        </button>

        <button
          onClick={() => onNavigate('holding_location')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#f3f4f0] text-[#012d1d] flex items-center justify-center text-xs font-bold">
            <Warehouse className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">4. Staging Bays</span>
          <span className="text-[10px] text-[#717973]">Greenhouse zones</span>
        </button>

        <button
          onClick={() => onNavigate('inventory_audit')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0e6c4a] text-white flex items-center justify-center text-xs font-bold">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">5. Stock Audits</span>
          <span className="text-[10px] text-[#717973]">Cycle count tools</span>
        </button>

        <button
          onClick={() => onNavigate('data_management')}
          className="bg-white p-3 rounded-2xl border border-[#c1c8c2] hover:border-[#012d1d] text-left flex flex-col gap-1 transition-all group shadow-2xs cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#f3f4f0] text-[#012d1d] flex items-center justify-center text-xs font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xs text-[#012d1d] group-hover:underline">6. POS Sync</span>
          <span className="text-[10px] text-[#717973]">CSV import/export</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ENTERING A NEW ORDER & CUSTOMER NAMES */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'new_order') && matchesSearch('new order customer enter name scan unlisted walk-in') && (
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
                  Entering a New Order & Customer Names
                </h2>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full shrink-0 w-fit">
              Includes Walk-Ins & Unlisted Accounts
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-[#012d1d] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0e6c4a]" />
              <span>Step 1: Selecting or Typing Any Customer Name</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
              When starting an order from the <strong>Scan Screen</strong>, you can pick an existing contractor account or simply type any walk-in customer's name. The app automatically assigns wholesale or retail rates based on their profile.
            </p>

            {/* Visual UI Simulation: Customer Input */}
            <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#0e6c4a]" />
                  <span>Interactive Screenshot Preview: Customer Search & Unlisted Entry</span>
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
                  <strong className="text-[#012d1d] block mb-1 font-extrabold">Option A: Existing Accounts</strong>
                  <p className="text-[#414844]">
                    Tap into the search field and type a few letters (e.g. <em>"Valley View"</em>, <em>"Pete"</em>). Click their card to instantly apply their default wholesale or contractor discount tier.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                  <strong className="text-[#461702] block mb-1 font-extrabold">Option B: Unlisted / Walk-In Customers</strong>
                  <p className="text-[#414844]">
                    Type their name into the search bar (e.g. <em>"John & Mary Smith"</em>). Tap <strong>"Use [Name] as customer"</strong> or just start scanning plants. The order will be saved directly under that name!
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
                Staff have 4 fast methods to append items into the active cart:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Camera className="w-4 h-4 text-[#0e6c4a]" />
                    <span>1. Camera Barcode Scanner</span>
                  </div>
                  <p className="text-[#414844]">
                    Tap <strong>"Start Camera Scan"</strong> to turn on live barcode scanning. Aim at tag barcodes on pots or hangtags. A confirmation beep confirms the read.
                  </p>
                </div>

                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Barcode className="w-4 h-4 text-[#0e6c4a]" />
                    <span>2. Handheld / Bluetooth Scanner</span>
                  </div>
                  <p className="text-[#414844]">
                    Pair any Bluetooth ring or gun scanner. The manual input box captures continuous laser reads and adds plants instantly.
                  </p>
                </div>

                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Search className="w-4 h-4 text-[#0e6c4a]" />
                    <span>3. Plant Catalog Search</span>
                  </div>
                  <p className="text-[#414844]">
                    Tap <strong>"Browse Catalog"</strong> to search by plant name, botanical name, category, or Item # (e.g. <em>1000</em>, <em>Hydrangea</em>).
                  </p>
                </div>

                <div className="p-3.5 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                    <Layers className="w-4 h-4 text-[#0e6c4a]" />
                    <span>4. Bulk Materials Quick-Add</span>
                  </div>
                  <p className="text-[#414844]">
                    Tap the <strong>Bulk Soil / Mulch / Stone</strong> bar to add 0.5 yard, 1 yard, or 2 yard increments with a single tap. Products are consolidated and deduplicated with live yard stock.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Fast-Track "Take Now (Email/Text)" vs "Stage / Finish" */}
            <div className="flex flex-col gap-3 pt-4 border-t border-[#f3f4f0]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-extrabold text-[#012d1d] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#0e6c4a] fill-[#0e6c4a]" />
                  <span>Step 3: Fast-Track "Take Now (Email/Text)" vs. "Stage / Finish"</span>
                </h3>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#012d1d] text-[#a0f4c8] border border-[#a0f4c8]/30">
                  ⚡ Minimum Clicks Speed Checkout
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
                When ringing up a sale on the Scan Screen, staff have two distinct checkout paths designed to eliminate unnecessary steps depending on whether the customer is walking out now or staging for later:
              </p>

              {/* Visual Simulation of Dual Checkout Buttons */}
              <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#0e6c4a]" />
                    <span>Interactive Preview: Fast-Track Checkout Controls</span>
                  </span>
                  <span className="text-[10px] font-bold bg-[#0e6c4a] text-white px-2 py-0.5 rounded">
                    Scan Screen Top Bar & Footer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Fast-Track Take Now */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-[#0e6c4a] shadow-xs flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-[#0e6c4a] flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 fill-[#0e6c4a]" />
                          Walk-In / In-Hand Sale
                        </span>
                        <span className="text-[10px] font-extrabold bg-[#a0f4c8] text-[#012d1d] px-2 py-0.5 rounded-full">
                          1-Tap Bypass
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-[#012d1d]">
                        "Take Now (Email/Text)" Button
                      </h4>
                      <p className="text-xs text-[#414844] leading-relaxed">
                        Use whenever the customer is taking plants with them right now. Tap this button (available in both the top action bar and bottom cart bar) to:
                      </p>
                      <ul className="text-[11px] text-[#414844] list-disc list-inside space-y-1 mt-1">
                        <li><strong>Skip staging holding area</strong> selection completely.</li>
                        <li>Automatically tag items as <em>Taken by Customer</em>.</li>
                        <li>Jump directly to <strong>Order Finalization</strong>.</li>
                        <li>One-tap access to <strong>Email Receipt</strong>, <strong>Email Office</strong>, or <strong>Text Employee (SMS)</strong>.</li>
                        <li>Tap <strong>"Next Customer"</strong> to clear the cart and instantly ring up the next customer in line.</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[#f3f4f0]">
                      <button
                        type="button"
                        className="w-full bg-[#0e6c4a] text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm pointer-events-none"
                      >
                        <Zap className="w-4 h-4 text-[#a0f4c8] fill-[#a0f4c8]" />
                        <span>Take Now (Email/Text)</span>
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Stage / Finish */}
                  <div className="p-4 bg-white rounded-2xl border border-[#c1c8c2] shadow-xs flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-[#461702] flex items-center gap-1">
                          <Warehouse className="w-3.5 h-3.5 text-[#461702]" />
                          Hold For Later / Delivery
                        </span>
                        <span className="text-[10px] font-extrabold bg-[#f3f4f0] text-[#414844] px-2 py-0.5 rounded-full">
                          Staging Flow
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-[#012d1d]">
                        "Stage / Finish" Button
                      </h4>
                      <p className="text-xs text-[#414844] leading-relaxed">
                        Use when an order needs to be pulled from hoop houses or field rows and stored in physical nursery staging bays:
                      </p>
                      <ul className="text-[11px] text-[#414844] list-disc list-inside space-y-1 mt-1">
                        <li>Assign physical <strong>Holding Bays 1 through 20</strong> or greenhouse zones.</li>
                        <li>Schedule customer pickup date and target time.</li>
                        <li>Configure delivery truck address and driver loading instructions.</li>
                        <li>Status automatically sets to <em>Pending (Staging)</em>.</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[#f3f4f0]">
                      <button
                        type="button"
                        className="w-full bg-[#012d1d] text-[#a0f4c8] font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm pointer-events-none"
                      >
                        <CheckCircle className="w-4 h-4 text-[#a0f4c8]" />
                        <span>Stage / Finish</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PLANT CATALOG SEARCH POP-UP & 4-TIER POS PRICING */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'catalog_pricing') && matchesSearch('catalog search price tier pos wholesale retail contractor size item number out of stock') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                  Enhanced Catalog & POS Pricing
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                  Plant Catalog Search & 4-Tier POS Pricing
                </h2>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-[#a0f4c8] text-[#002113] rounded-full shrink-0 w-fit">
              10pt Larger Text & Stacked Controls
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            The <strong>Plant Catalog Search pop-up</strong> allows crew members to look up any plant in the nursery without a barcode. We have optimized this interface for outdoor sunlight readability, prominent plant titles, stacked action buttons, and instantaneous 4-tier price selection.
          </p>

          {/* Simulated UI Screenshot: Updated Plant Catalog Search */}
          <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#0e6c4a]" />
                <span>Interactive Screenshot Preview: Plant Catalog Search Modal</span>
              </span>
              <span className="text-[10px] font-bold bg-[#012d1d] text-[#a0f4c8] px-2 py-0.5 rounded">
                Updated Field Layout
              </span>
            </div>

            {/* Modal Container Mockup */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#c1c8c2] shadow-md flex flex-col gap-3 max-w-2xl mx-auto w-full">
              {/* Modal Top Bar */}
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e3df]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#a0f4c8] text-[#012d1d] rounded-xl">
                    <BookOpen className="w-4 h-4 text-[#0e6c4a]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#012d1d]">Plant Catalog Search</h4>
                    <p className="text-[11px] text-[#717973]">Search plant name, botanical name, or category</p>
                  </div>
                </div>
                <button className="p-1 text-[#717973] hover:text-[#1a1c1a] rounded-lg">
                  <span className="text-xs font-bold font-mono">✕</span>
                </button>
              </div>

              {/* Search Bar & Category Pills */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#717973]" />
                  <input
                    type="text"
                    readOnly
                    value="Hydrangea"
                    className="w-full bg-[#f3f4f0] border border-[#012d1d] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#1a1c1a]"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto text-[11px]">
                  <span className="px-2.5 py-1 rounded-full font-bold bg-[#012d1d] text-[#a0f4c8]">All (14)</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-[#f3f4f0] text-[#414844]">Trees & Shrubs</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-[#f3f4f0] text-[#414844]">Perennials</span>
                </div>
              </div>

              {/* Card 1: In-Stock Plant with 4-Tier Pricing Dropdown & Add Button Stack */}
              <div className="p-3.5 bg-white hover:bg-[#f9faf6] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2.5 shadow-xs">
                {/* Full-Width Plant Name Header */}
                <div className="border-b border-[#f3f4f0] pb-1.5">
                  <h5 className="font-extrabold text-sm sm:text-base text-[#1a1c1a] leading-snug">
                    Hydrangea macrophylla 'Nikko Blue'
                  </h5>
                  <p className="text-xs text-[#525a55] italic mt-0.5">
                    Nikko Blue Bigleaf Hydrangea • Deciduous Shrub
                  </p>
                </div>

                {/* Badges on Left, Stacked Actions on Right */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[21px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <Tag className="w-4 h-4 text-[#a0f4c8]" />
                        #1088
                      </span>
                      <span className="bg-[#461702] text-amber-100 text-[21px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <Package className="w-4 h-4 text-amber-300" />
                        SIZE: 3 Gal
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-[#f3f4f0] text-[#414844]">
                        Stock: <strong className="text-[#012d1d]">42</strong>
                      </span>
                    </div>
                  </div>

                  {/* Stacked Controls: Pricing Dropdown over Add Button */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">
                    <div className="px-2.5 py-1 bg-white border border-[#c1c8c2] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer">
                      <span className="text-[22px] font-black text-[#012d1d] tracking-tight leading-none">$38.50</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    </div>
                    <button className="w-full bg-[#012d1d] text-[#a0f4c8] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Out-of-Stock Plant with 2-Line Staggered Status */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#c1c8c2] flex flex-col gap-2.5 shadow-xs opacity-95">
                <div className="border-b border-[#f3f4f0] pb-1.5">
                  <h5 className="font-extrabold text-sm sm:text-base text-[#1a1c1a] leading-snug">
                    Hydrangea paniculata 'Limelight'
                  </h5>
                  <p className="text-xs text-[#525a55] italic mt-0.5">
                    PeeGee Panicle Hydrangea
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#012d1d] text-[#a0f4c8] font-mono text-[21px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <Tag className="w-4 h-4 text-[#a0f4c8]" />
                        #1094
                      </span>
                      <span className="bg-[#461702] text-amber-100 text-[21px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <Package className="w-4 h-4 text-amber-300" />
                        SIZE: 7 Gal
                      </span>
                    </div>
                    <div>
                      {/* Out of Stock 2-Line Stacked Badge */}
                      <span className="text-xs font-bold px-2 py-1 rounded-md inline-flex flex-col items-start leading-tight bg-red-100 text-red-700 border border-red-200">
                        <span>Stock: <strong className="text-red-700">0</strong></span>
                        <span className="text-[10px] text-red-600 font-extrabold mt-0.5">(Out of stock)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">
                    <div className="px-2.5 py-1 bg-white border border-[#c1c8c2] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer">
                      <span className="text-[22px] font-black text-[#012d1d] tracking-tight leading-none">$68.00</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    </div>
                    <button className="w-full bg-[#012d1d] text-[#a0f4c8] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Field Upgrades Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                <strong className="text-[#012d1d] block mb-1 font-extrabold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>1. 10pt Larger Text</span>
                </strong>
                <p className="text-[#414844]">
                  Item Number and Size are rendered in bold <strong>21px</strong> font, and Price in bold <strong>22px</strong>, making them legible in bright nursery sunlight without squinting.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                <strong className="text-[#012d1d] block mb-1 font-extrabold flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>2. Vertical Action Stack</span>
                </strong>
                <p className="text-[#414844]">
                  The Pricing dropdown and the green <strong>Add</strong> button are stacked vertically on the right, keeping the Size and Stock badges completely unobstructed.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                <strong className="text-[#012d1d] block mb-1 font-extrabold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>3. Two-Line Stock Badge</span>
                </strong>
                <p className="text-[#414844]">
                  Out-of-stock items cleanly place the quantity count on line 1 and the <strong>(Out of stock)</strong> notice on line 2 for immediate identification.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df]">
                <strong className="text-[#012d1d] block mb-1 font-extrabold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>4. 4-Tier POS Pricing</span>
                </strong>
                <p className="text-[#414844]">
                  Click the price button to switch between <em>Retail</em>, <em>Wholesale</em>, <em>Contractor</em>, or <em>Landscaper</em> rates right from the search card.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] sm:col-span-2 md:col-span-2">
                <strong className="text-[#012d1d] block mb-1 font-extrabold flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>5. Confirm Pop-up: "DESCR" Column & In-Card Price Dropdown</span>
                </strong>
                <p className="text-[#414844]">
                  On the <strong>Confirm Plant Selection</strong> pop-up, the plant name on the top line strictly pulls from the uploaded POS spreadsheet column titled <strong>"DESCR"</strong> in <strong>12pt larger (28px–32px) font</strong> for instant outdoor readability. The <strong>4-tier Price Dropdown</strong> is placed directly inside the same card on the line immediately below the <em>Item Number</em>, <em>Size</em>, and <em>Quantity / Stock</em> badges.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] sm:col-span-2 md:col-span-2">
                <strong className="text-[#012d1d] block mb-1 font-extrabold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#012d1d]" />
                  <span>6. Order Item Cards: High-Visibility Layout & 8pt Larger Typography</span>
                </strong>
                <p className="text-[#414844]">
                  On each <strong>Current Order Item card</strong>, typography is enlarged by <strong>8 points</strong> for sunlight visibility: the plant name (24px–27px) sits on line 1, the botanical/common subtitle (18px–20px) is placed directly on line 2 immediately above the <em>Item Number</em> and <em>Container Size</em> badges (20px–22px) on line 3, and the Stepper Quantity counter (22px–25px) provides large touch targets.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: INTERACTIVE GPS YARD MAPPING & HIGH-RESOLUTION SATELLITE PINS */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'gps_mapping') && matchesSearch('gps map satellite coordinates pin location yard navigation sub-meter') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#004d40] text-[#a0f4c8] flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004d40]">
                  Yard Location Intelligence
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                  Interactive GPS Yard Mapping & Satellite Pins
                </h2>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full shrink-0 w-fit">
              Sub-Meter Yard Accuracy
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            The nursery application features built-in <strong>sub-meter GPS location logging</strong> and an <strong>interactive high-resolution Satellite Hybrid Map</strong>. Crew members can log the exact field, block, or greenhouse coordinates of any plant when scanning or reviewing orders, view color-coded pins for all items in a customer's load, and open turn-by-turn walking routes in Google Maps.
          </p>

          {/* GPS Visual Simulation */}
          <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#004d40]" />
                <span>Interactive Screenshot Preview: GPS Coordinate Logging & Satellite Pins</span>
              </span>
              <span className="text-[10px] font-bold bg-[#004d40] text-[#a0f4c8] px-2 py-0.5 rounded">
                Real-Time Cloud Sync
              </span>
            </div>

            {/* Mockup Item with GPS Pin */}
            <div className="bg-white p-4 rounded-2xl border border-[#c1c8c2] shadow-sm flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3f4f0] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#004d40] text-[#a0f4c8] flex items-center justify-center font-bold text-xs">
                    10x
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1a1c1a]">Hydrangea macrophylla 'Endless Summer'</h4>
                    <span className="text-xs text-[#717973]">3 Gal Pot • SKU #1088</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>43.14820° N, 79.46230° W</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-[#004d40] text-[#a0f4c8] rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-2xs">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View on Map</span>
                  </span>
                  <span className="px-3 py-1.5 bg-[#f3f4f0] text-[#012d1d] rounded-xl font-bold text-xs flex items-center gap-1.5 border border-[#c1c8c2]">
                    <RefreshCw className="w-3.5 h-3.5 text-[#004d40]" />
                    <span>Update GPS</span>
                  </span>
                </div>
                <span className="text-[11px] text-[#717973] font-semibold">
                  Saved to order & master plant catalog in Firestore
                </span>
              </div>
            </div>

            {/* 4 Pillars of GPS System */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1.5">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-[#004d40]" />
                  <span>1. On Initial Add / Scan</span>
                </strong>
                <p className="text-[#414844]">
                  When scanning or verifying a plant, tap <strong>"📍 Tag Yard GPS"</strong> directly inside the quantity confirmation pop-up to record coordinates right at the bench.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1.5">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-[#004d40]" />
                  <span>2. In Order Review</span>
                </strong>
                <p className="text-[#414844]">
                  When reviewing an order later, every plant item has a dedicated <strong>"Log GPS"</strong> or <strong>"Update GPS"</strong> button and coordinate pill on its card.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1.5">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#004d40]" />
                  <span>3. Satellite Map Modal</span>
                </strong>
                <p className="text-[#414844]">
                  Tap <strong>"GPS Map"</strong> from any order to see all plants pinned on Google Satellite imagery, with one-tap walking routes in Google Maps.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1.5">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#004d40]" />
                  <span>4. Inventory Safe</span>
                </strong>
                <p className="text-[#414844]">
                  Uploading updated inventory spreadsheets (CSV/Excel) <strong>never erases your GPS data</strong>. The app merges and retains all existing plant coordinates automatically.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: HOLDING BAYS & STAGING ZONES */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'holding_bays') && matchesSearch('holding bay staging zone greenhouse shade structure dock location') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                Order Staging Logistics
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                Holding Bays & Staging Zone Assignments
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            Every order assembled in the nursery can be designated to a specific holding bay (Greenhouses A-D, Shade Areas, Loading Bays, or Custom Rows). Staff know exactly where customer orders are waiting for pickup.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                <Warehouse className="w-4 h-4 text-[#0e6c4a]" />
                <span>1. Greenhouses A-D</span>
              </div>
              <p className="text-[#414844]">
                Ideal for delicate perennials, tender stock, and hanging baskets requiring automated misting or frost protection.
              </p>
            </div>

            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                <Sun className="w-4 h-4 text-amber-600" />
                <span>2. Outdoor Shade Structures</span>
              </div>
              <p className="text-[#414844]">
                Designated for broadleaf evergreens, boxwoods, and shade-loving shrubs awaiting contractor trailer loading.
              </p>
            </div>

            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#012d1d] font-extrabold">
                <Truck className="w-4 h-4 text-[#461702]" />
                <span>3. Loading Bays & Custom Rows</span>
              </div>
              <p className="text-[#414844]">
                Designated for bulk orders, ball-and-burlap shade trees, palletized stone, and immediate same-day pickups.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: HOW TO EDIT & MODIFY EXISTING ORDERS */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'editing_order') && matchesSearch('edit order modify quantity customer name price change') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
              5
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
      {/* SECTION 6: PARTIAL PICKUP & EMAIL STAFF INSTRUCTIONS */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'partial_pickup') && matchesSearch('partial pickup email staff hold ticket remaining plants yard crew') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold">
                6
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
                  Tap <strong>"Email to Staff"</strong> to generate the formatted hold email for <code>pete@maplelanenursery.com</code>.
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
      {/* SECTION 7: PHYSICAL INVENTORY AUDITS & CYCLE COUNTS */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'inventory_audit') && matchesSearch('inventory audit physical count cycle discrepancy variance scan stock bench') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0e6c4a] text-white flex items-center justify-center font-bold">
                7
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                  Stock Control & Audit Engine
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                  Physical Inventory Audits & Cycle Counts
                </h2>
              </div>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full shrink-0 w-fit">
              GPS Bench Tagging & Variance Analysis
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            Staff can perform structured physical cycle counts across greenhouses, shade houses, or outdoor tree fields using the <strong>Inventory Audit Screen</strong>. Scan pot barcodes, tally counts with single taps, tag GPS coordinates of specific nursery blocks, and automatically calculate variances against expected stock.
          </p>

          {/* Visual UI Simulation: Inventory Audit Screen */}
          <div className="bg-[#f9faf6] border-2 border-dashed border-[#c1c8c2] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-[#0e6c4a]" />
                <span>Interactive Screenshot Preview: Physical Inventory Audit Session</span>
              </span>
              <span className="text-[10px] font-bold bg-[#012d1d] text-[#a0f4c8] px-2 py-0.5 rounded">
                Active Audit Mode
              </span>
            </div>

            {/* Audit Screen Mockup */}
            <div className="bg-white p-4 rounded-2xl border border-[#c1c8c2] shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[#f3f4f0] pb-3">
                <div>
                  <span className="text-[10px] font-bold text-[#717973] uppercase">Session #AUD-2026-08</span>
                  <h4 className="text-sm font-extrabold text-[#012d1d]">Greenhouse B - Perennial Bench Count</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-lg">
                    3 Discrepancies
                  </span>
                  <span className="px-2.5 py-1 bg-[#a0f4c8] text-[#002113] font-bold text-xs rounded-lg">
                    48 Counted
                  </span>
                </div>
              </div>

              {/* Mockup Audited Line Item */}
              <div className="p-3 bg-[#f3f4f0] rounded-xl border border-[#e2e3df] flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-extrabold text-[#1a1c1a] block">Echinacea purpurea 'Magnus' (Coneflower)</span>
                  <span className="text-[11px] text-[#717973]">SKU #1004 • Expected: 50 • Counted: 48 (Variance: -2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-800 font-extrabold rounded-lg text-xs">
                    Short (-2)
                  </span>
                  <span className="px-2 py-1 bg-white border border-[#c1c8c2] rounded-lg font-bold text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0e6c4a]" />
                    <span>Bench 4</span>
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-[#012d1d] text-[#a0f4c8] rounded-xl font-bold flex items-center gap-1 shadow-2xs">
                    <Barcode className="w-3.5 h-3.5" />
                    <span>Scan Next Pot</span>
                  </button>
                  <button className="px-3 py-1.5 bg-white border border-[#c1c8c2] text-[#012d1d] rounded-xl font-bold flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    <span>Email Discrepancy Report</span>
                  </button>
                </div>
                <span className="text-[11px] text-[#717973] font-semibold">
                  Exports directly to CSV spreadsheet
                </span>
              </div>
            </div>

            {/* Step instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1">
                  <Warehouse className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>1. Choose Location</span>
                </strong>
                <p className="text-[#414844]">
                  Pick the target greenhouse, outdoor row, or shade house to organize counts by physical zone.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>2. Scan or Search</span>
                </strong>
                <p className="text-[#414844]">
                  Scan pot tags with camera or Bluetooth reader, or use quick search. Increment counts with rapid taps.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3df] flex flex-col gap-1">
                <strong className="text-[#012d1d] font-extrabold flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  <span>3. Reconcile & Export</span>
                </strong>
                <p className="text-[#414844]">
                  Review short/over counts and click <strong>"Email Audit Report"</strong> to dispatch results to Pete for inventory adjustment.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: COMPLETING, ARCHIVING & NATIVE PHONE DISPATCH */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'completing_order') && matchesSearch('complete order fulfill ready for pickup status save archive restore dispatch email sms') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0e6c4a] text-white flex items-center justify-center font-bold">
              8
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                Fulfillment & Archiving Workflow
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                Completing, Archiving & Native Phone Dispatch
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
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold rounded w-fit text-[10px]">
                Completed (Archived)
              </span>
              <strong className="text-sm font-extrabold text-[#012d1d]">Permanent Archive</strong>
              <p className="text-[#414844]">
                Tap <strong>"Completed"</strong> on the order card to archive it into the <strong>Completed (Archived)</strong> tab. Completed orders are kept permanently for accounting and audit records and can be unarchived at any time with the "Restore to Active" button.
              </p>
            </div>
          </div>

          {/* Fast-Track Immediate Hand-off & Next Customer Flow */}
          <div className="bg-[#012d1d] text-white rounded-2xl p-4 sm:p-5 border border-[#a0f4c8]/30 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0e6c4a] text-[#a0f4c8] flex items-center justify-center border border-[#a0f4c8]/30">
                  <Zap className="w-4 h-4 fill-[#a0f4c8]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Fast-Track "Take Now" Banner & Next Customer Flow
                  </h3>
                  <span className="text-[11px] text-[#a0f4c8] font-semibold">
                    Streamlined line-busting checkout for in-person pickups
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-[#a0f4c8] text-[#012d1d] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ⚡ Zero Delay
              </span>
            </div>

            <p className="text-xs text-emerald-100/90 leading-relaxed">
              When an order is created via <strong>"Take Now (Email/Text)"</strong> or marked as <em>Taken by Customer</em>, the Order Finalization screen automatically adapts:
            </p>

            {/* Visual simulation of Immediate Hand-off Banner */}
            <div className="bg-[#08422a] border border-[#a0f4c8]/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0e6c4a] text-[#a0f4c8] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-[#a0f4c8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-[#a0f4c8]">⚡ Immediate Hand-off / Take Now</span>
                    <span className="bg-[#0e6c4a] text-white text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase">
                      No Staging Needed
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    Customer took all items. Email or text their receipt, then start the next sale.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 bg-[#a0f4c8] text-[#012d1d] font-black text-xs rounded-lg flex items-center gap-1.5 shadow-xs">
                  <Plus className="w-3.5 h-3.5 text-[#012d1d]" />
                  <span>Next Customer</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-emerald-100/90 mt-1">
              <div className="p-3 bg-[#002113]/50 rounded-xl border border-[#a0f4c8]/20">
                <strong className="text-[#a0f4c8] block mb-1 font-bold">1. Send Immediate Receipt</strong>
                <p className="text-[11px] leading-relaxed">
                  Use the <strong>"Email Receipt"</strong> button to send an itemized invoice to the customer, or <strong>"Text Employee (SMS)"</strong> to alert yard crews. The customer leaves with their documentation in seconds.
                </p>
              </div>
              <div className="p-3 bg-[#002113]/50 rounded-xl border border-[#a0f4c8]/20">
                <strong className="text-[#a0f4c8] block mb-1 font-bold">2. One-Tap "Next Customer" Reset</strong>
                <p className="text-[11px] leading-relaxed">
                  Tap the <strong>"Next Customer"</strong> button in either the top bar or inside the green hand-off banner. It instantly resets the cart and returns to the Scan Screen ready for the next customer in line.
                </p>
              </div>
            </div>
          </div>

          {/* Native Phone Apps Integration Guide */}
          <div className="bg-[#f3f4f0] rounded-2xl p-4 sm:p-5 border border-[#c1c8c2] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#012d1d]" />
              <h3 className="font-extrabold text-sm text-[#012d1d] uppercase tracking-wider">
                Native Phone Dispatch Integration
              </h3>
            </div>
            <p className="text-xs text-[#414844]">
              When working from an iPhone, Android, or tablet, the 3 dispatch buttons at the bottom of the order screen open directly into your device's built-in communication apps:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-[#c1c8c2] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#012d1d]">
                  <Mail className="w-4 h-4 text-[#0e6c4a]" />
                  <span>1. Email Receipt</span>
                </div>
                <p className="text-[#414844] text-[11px]">
                  Opens your phone's default mail app (Apple Mail, Gmail, Outlook) with the complete customer receipt, itemized pricing, and thank you message.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#c1c8c2] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#461702]">
                  <Building className="w-4 h-4 text-[#461702]" />
                  <span>2. Email Office</span>
                </div>
                <p className="text-[#414844] text-[11px]">
                  Dispatches internal order log and staging bay assignment directly to <code>pete@maplelanenursery.com</code> for accounting records.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#c1c8c2] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#012d1d]">
                  <MessageSquare className="w-4 h-4 text-[#012d1d]" />
                  <span>3. Text Employee (SMS)</span>
                </div>
                <p className="text-[#414844] text-[11px]">
                  Opens your device's Messages / SMS app addressed directly to nursery employees (defaulting to Pete at <code>518-227-1235</code>) with order staging details and plants to load pre-filled.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: CUSTOMERS, POS IMPORT & CLOUD SYNC */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'data_sync') && matchesSearch('customers pos import csv spreadsheet export cloud firestore sync') && (
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c8c2] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[#f3f4f0] pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold">
              9
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e6c4a]">
                Database & Spreadsheet Integration
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#012d1d]">
                Customer Management & POS CSV Sync
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#414844] leading-relaxed">
            The app synchronizes with your master inventory spreadsheets and contractor database. In <strong>Data Management</strong>, you can import new plant pricing or contractor accounts while always preserving your logged GPS coordinates.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <strong className="text-[#012d1d] font-extrabold flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#0e6c4a]" />
                <span>POS Inventory CSV Uploads</span>
              </strong>
              <p className="text-[#414844]">
                Upload CSV or Excel exports from your POS system. The system matches item numbers and automatically retains all previously recorded GPS coordinates and holding bays.
              </p>
            </div>

            <div className="p-4 bg-[#f3f4f0] rounded-2xl border border-[#c1c8c2] flex flex-col gap-2">
              <strong className="text-[#012d1d] font-extrabold flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0e6c4a]" />
                <span>Customer Accounts & Pricing Tiers</span>
              </strong>
              <p className="text-[#414844]">
                Manage retail customers, contractor accounts, and wholesale profiles. Set phone numbers, email addresses, and default discount percentages.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10: FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING */}
      {/* ========================================================================= */}
      {(activeTopic === 'all' || activeTopic === 'catalog_pricing' || activeTopic === 'gps_mapping' || activeTopic === 'data_sync') && (
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
            {/* FAQ: Take Now Fast-Track Flow */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_take_now_fast_track')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#0e6c4a] fill-[#0e6c4a] shrink-0" />
                  <span>Q: How do I ring up a customer taking plants immediately and email/text their receipt fast?</span>
                </div>
                {expandedFaq === 'faq_take_now_fast_track' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_take_now_fast_track' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> On the Scan Screen, add the customer's plants and materials using the scanner or catalog. Then tap the emerald <strong>"Take Now (Email/Text)"</strong> button located in either the top quick bar or at the bottom of your cart.
                  </p>
                  <p>
                    This button is specifically designed for customers taking their order immediately. It automatically:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Skips holding bay / staging selection entirely.</li>
                    <li>Marks all items as <em>Taken by Customer</em>.</li>
                    <li>Brings you straight to the <strong>Order Finalization</strong> screen with an <strong>"⚡ Immediate Hand-off"</strong> banner.</li>
                  </ul>
                  <p>
                    From there, tap <strong>"Email Receipt"</strong> to open their invoice in your device's email client or <strong>"Text Employee (SMS)"</strong> to dispatch an SMS confirmation. Then tap <strong>"Next Customer"</strong> to start the next sale in seconds!
                  </p>
                </div>
              )}
            </div>

            {/* FAQ: Next Customer Button */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_next_customer')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#0e6c4a] shrink-0" />
                  <span>Q: How does the "Next Customer" button help speed up checkout lines?</span>
                </div>
                {expandedFaq === 'faq_next_customer' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_next_customer' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> After emailing or texting a customer's receipt on the Order Finalization screen, tap <strong>"Next Customer"</strong> (located in both the top navigation bar and inside the fast-track banner).
                  </p>
                  <p>
                    With one single tap, the app safely saves the completed order, clears all cart items and customer inputs, and brings you directly back to the Scan Screen ready to scan plants for the next person waiting in line. You don't have to navigate through the home menu or click multiple back buttons.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ: Plant Catalog Search & 4-Tier Pricing */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_catalog_pricing')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: How does the Plant Catalog Search pop-up and 4-tier POS pricing work?</span>
                {expandedFaq === 'faq_catalog_pricing' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_catalog_pricing' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> On the Scan Screen, tap <strong>"Browse Catalog"</strong> to open the full nursery search pop-up. You can filter by plant name, botanical name, or category pills (e.g. <em>Trees & Shrubs</em>, <em>Perennials</em>).
                  </p>
                  <p>
                    Each card displays the plant name in full at the top, along with enlarged <strong>21px Item Number and Size badges</strong> and a <strong>22px Price dropdown</strong>. You can click the price button to select from all 4 POS price levels (Retail, Wholesale, Contractor, or Landscaper) before tapping <strong>Add</strong>. The Size badge is positioned on the left so the price dropdown never obscures it.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ: GPS Mapping */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_gps_mapping')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: How does the GPS plant pinning and Satellite Map work?</span>
                {expandedFaq === 'faq_gps_mapping' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_gps_mapping' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> When you tap <strong>"Log GPS"</strong> next to any plant, the app uses your device's built-in GPS to record precise sub-meter latitude and longitude coordinates.
                  </p>
                  <p>
                    The coordinates are <strong>immediately saved to the cloud (Firestore)</strong> and saved to both the customer order and the master plant inventory record. Tapping <strong>"GPS Map"</strong> opens a high-resolution satellite hybrid view showing all plants pinned with colored markers, with a direct link to navigate using Google Maps. No Google Maps API key or cloud account configuration is required.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ: Completed Orders */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_completed_orders')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: What happens when an order is marked as "Completed"?</span>
                {expandedFaq === 'faq_completed_orders' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_completed_orders' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> Completed orders are automatically archived from your active queue into the <strong>"Completed (Archived)"</strong> tab at the top of the Orders Screen.
                  </p>
                  <p>
                    Completed orders are preserved permanently in Firestore for sales history and tax records. If an order was marked completed by mistake, simply switch to the Completed tab and tap <strong>"Restore to Active"</strong> to bring it back.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ: Auto-Save */}
            <div className="border border-[#c1c8c2] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('faq_autosave')}
                className="w-full p-4 text-left font-extrabold text-sm text-[#012d1d] bg-[#f9faf6] hover:bg-[#f3f4f0] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Q: What happens if my phone dies or browser refreshes while scanning an order?</span>
                {expandedFaq === 'faq_autosave' ? <ChevronUp className="w-4 h-4 text-[#012d1d]" /> : <ChevronDown className="w-4 h-4 text-[#717973]" />}
              </button>
              {expandedFaq === 'faq_autosave' && (
                <div className="p-4 bg-white text-xs text-[#414844] border-t border-[#c1c8c2] flex flex-col gap-2 leading-relaxed">
                  <p>
                    <strong>Answer:</strong> The app features a background <strong>Draft Auto-Save & Crash Protection Engine</strong>. Every scanned plant, customer name, and GPS coordinate is continuously saved in local storage and synced.
                  </p>
                  <p>
                    When you reopen the app, your active cart and order state are automatically restored exactly where you left off.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ: Wet / Damaged barcode */}
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

            {/* FAQ: Multi device sync */}
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
