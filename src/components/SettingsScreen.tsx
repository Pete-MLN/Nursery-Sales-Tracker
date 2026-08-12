import React, { useState } from 'react';
import { ScreenType, User } from '../types';
import { User as UserIcon, LogOut, FileSpreadsheet, MapPin, Database, Bell, Shield, Moon, Sun, Check, Smartphone, QrCode, Copy, ExternalLink, Wifi } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface SettingsScreenProps {
  user: User;
  onLogout: () => void;
  onNavigate: (screen: ScreenType) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onLogout,
  onNavigate
}) => {
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const vercelUrl = 'https://nursery-sales-tracker.vercel.app';
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';
  const devUrl = 'https://ais-dev-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';
  const preUrl = 'https://ais-pre-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';

  const [selectedUrlType, setSelectedUrlType] = useState<'vercel' | 'dev' | 'pre'>('vercel');
  const appUrl = selectedUrlType === 'vercel' ? vercelUrl : selectedUrlType === 'dev' ? (currentUrl || devUrl) : preUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-2xl mx-auto pb-44 animate-fade-in flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-[#012d1d]">Settings & Preferences</h2>
        <p className="text-xs text-[#414844] mt-0.5">Configure device behavior, system access, and sync tools.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#f3f4f0] p-4 rounded-xl border border-[#c1c8c2] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#a0f4c8] text-[#002113] flex items-center justify-center font-bold text-lg border border-[#19724f]/20">
            {user.name.split(' ').map(n => n[0]).join('') || 'A'}
          </div>
          <div>
            <h3 className="font-bold text-base text-[#012d1d]">{user.name}</h3>
            <p className="text-xs text-[#414844]">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold text-[#19724f] bg-[#a0f4c8] px-2 py-0.5 rounded">
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Dedicated Mobile Phone Link & Multi-Device Sync Section */}
      <div className="bg-gradient-to-br from-[#002113] to-[#0d3b27] text-white rounded-2xl p-5 shadow-lg border border-[#19724f]/30 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#a0f4c8]/20 text-[#a0f4c8] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">4-Phone Mobile Link QR</h3>
              <p className="text-xs text-[#a3c9b7]">Connect staff mobile devices in real time</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-[#a0f4c8]/20 text-[#a0f4c8] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#a0f4c8]/30">
            <Wifi className="w-3 h-3 animate-pulse" />
            <span>Live Firestore Active</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="bg-white p-3 rounded-xl shadow-md border border-white/20 shrink-0">
            <QRCodeSVG
              value={appUrl}
              size={140}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#002113"
            />
          </div>

          <div className="flex-1 text-center sm:text-left flex flex-col gap-2">
            <span className="text-xs text-[#a3c9b7]">
              Scan with your phone's camera app to join the live session for Maple Lane Nursery.
            </span>

            {/* URL Selector Tabs */}
            <div className="flex flex-wrap bg-white/10 p-1 rounded-xl border border-white/20 self-center sm:self-start my-1 gap-1">
              <button
                type="button"
                onClick={() => setSelectedUrlType('vercel')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedUrlType === 'vercel'
                    ? 'bg-[#a0f4c8] text-[#002113] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Vercel App (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setSelectedUrlType('dev')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedUrlType === 'dev'
                    ? 'bg-[#a0f4c8] text-[#002113] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Active Preview
              </button>
              <button
                type="button"
                onClick={() => setSelectedUrlType('pre')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedUrlType === 'pre'
                    ? 'bg-[#a0f4c8] text-[#002113] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Shared AI Studio Link
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <button
                onClick={handleCopy}
                className="bg-[#19724f] hover:bg-[#005236] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#a0f4c8]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Link Copied!' : 'Copy Mobile Link'}
              </button>
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-white/20"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Troubleshooting box */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-[#a3c9b7]">
          <p className="font-semibold text-white mb-1 flex items-center gap-1">
            <span>💡 Getting "Page Not Found" or 403 on phone?</span>
          </p>
          <p className="text-[11px] leading-relaxed">
            In Google AI Studio, preview URLs are private by default. To allow all 4 staff phones to open the app seamlessly, click the <strong>Share</strong> or <strong>Deploy</strong> button in the top right of the AI Studio window to enable public access!
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-[#414844] uppercase tracking-wider px-1">
          Nursery System Tools
        </span>

        <button
          onClick={() => onNavigate('data_management')}
          className="w-full bg-white p-3.5 rounded-xl border border-[#c1c8c2] hover:border-[#012d1d] flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[#0e6c4a]" />
            <div>
              <span className="block font-bold text-sm text-[#012d1d]">Data Management</span>
              <span className="block text-xs text-[#414844]">Upload & sync CSV/XLSX inventory files</span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#0e6c4a] bg-[#a0f4c8] px-2.5 py-1 rounded-full">
            Manage Data
          </span>
        </button>

        <button
          onClick={() => onNavigate('holding_location')}
          className="w-full bg-white p-3.5 rounded-xl border border-[#c1c8c2] hover:border-[#012d1d] flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#0e6c4a]" />
            <div>
              <span className="block font-bold text-sm text-[#012d1d]">Placement Routing</span>
              <span className="block text-xs text-[#414844]">Assign greenhouses, shade areas & bays</span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#0e6c4a] bg-[#a0f4c8] px-2.5 py-1 rounded-full">
            Routing
          </span>
        </button>
      </div>

      {/* Preferences Toggles */}
      <div className="bg-white p-4 rounded-xl border border-[#c1c8c2] flex flex-col gap-4">
        <span className="text-xs font-bold text-[#414844] uppercase tracking-wider">
          Device & Operations Preferences
        </span>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-[#414844]" />
            <div>
              <span className="block text-sm font-semibold text-[#1a1c1a]">Auto GPS Plant Logging</span>
              <span className="block text-xs text-[#717973]">Log coordinates on barcode scan</span>
            </div>
          </div>
          <button
            onClick={() => setGpsEnabled(!gpsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              gpsEnabled ? 'bg-[#0e6c4a]' : 'bg-[#c1c8c2]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                gpsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f0]">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#414844]" />
            <div>
              <span className="block text-sm font-semibold text-[#1a1c1a]">Order Status Notifications</span>
              <span className="block text-xs text-[#717973]">Receive text & email notifications</span>
            </div>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              notificationsEnabled ? 'bg-[#0e6c4a]' : 'bg-[#c1c8c2]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f0]">
          <div className="flex items-center gap-2.5">
            {darkMode ? <Moon className="w-4 h-4 text-[#414844]" /> : <Sun className="w-4 h-4 text-[#414844]" />}
            <div>
              <span className="block text-sm font-semibold text-[#1a1c1a]">High Visibility Outdoor Mode</span>
              <span className="block text-xs text-[#717973]">Optimized contrast for direct sunlight</span>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              darkMode ? 'bg-[#0e6c4a]' : 'bg-[#c1c8c2]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-[#717973] mt-2">
        Nursery Manager v2.4.1 • Plant Logistics Engine
      </div>
    </div>
  );
};
