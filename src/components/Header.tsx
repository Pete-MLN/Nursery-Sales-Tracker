import React, { useState } from 'react';
import { ScreenType, User } from '../types';
import { ArrowLeft, User as UserIcon, MoreVertical, Sprout, Wifi, QrCode, X, Copy, Check, Smartphone, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onBack?: () => void;
  user: User;
  titleOverride?: string;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  user,
  titleOverride,
  onOpenProfile
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (currentScreen === 'login') return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';
  const devUrl = 'https://ais-dev-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';
  const preUrl = 'https://ais-pre-zvevl3ioe7v7ohcm2amabq-809006327917.us-east1.run.app';

  const [selectedUrlType, setSelectedUrlType] = useState<'dev' | 'pre'>('dev');
  const appUrl = selectedUrlType === 'dev' ? (currentUrl || devUrl) : preUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showBackButton = currentScreen === 'holding_location' || currentScreen === 'data_management' || currentScreen === 'finalization' || !!onBack;

  const getTitle = () => {
    if (titleOverride) return titleOverride;
    switch (currentScreen) {
      case 'data_management':
        return 'Data Management';
      case 'inventory':
        return 'Inventory Alerts';
      case 'finalization':
        return 'Order Finalization';
      case 'holding_location':
        return 'Nursery Manager';
      case 'orders':
        return 'All Orders';
      case 'settings':
        return 'System Settings';
      default:
        return 'Nursery Manager';
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      if (currentScreen === 'holding_location' || currentScreen === 'finalization') {
        onNavigate('orders');
      } else {
        onNavigate('home');
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#f3f4f0] text-[#0e6c4a] border-b border-[#e2e3df] px-4 py-2.5 flex justify-between items-center transition-colors shadow-2xs">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button 
              onClick={handleBackClick}
              className="p-1.5 rounded-full text-[#414844] hover:bg-[#e2e3df] transition-colors"
              title="Go back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {currentScreen !== 'data_management' && currentScreen !== 'finalization' && (
            <div className="text-[#012d1d] flex items-center justify-center">
              <Sprout className="w-6 h-6 text-[#012d1d]" />
            </div>
          )}

          <h1 className="font-semibold text-lg md:text-xl text-[#012d1d] tracking-tight">
            {getTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* QR Code Quick Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 bg-[#19724f] text-white hover:bg-[#005236] text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95"
            title="Scan QR Code to open on phones"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Phone Link QR</span>
          </button>

          {/* Live Cloud Sync Indicator */}
          <button 
            onClick={() => setShowQrModal(true)}
            className="hidden md:flex items-center gap-1.5 bg-[#a0f4c8]/60 text-[#002113] text-[10px] font-bold px-2 py-1 rounded-full border border-[#19724f]/20 hover:bg-[#a0f4c8] transition-colors"
            title="Connected to Firebase Cloud Database for multi-phone real-time synchronization. Click for QR Code."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b] animate-pulse"></span>
            <span>Live Sync Active</span>
          </button>

          {currentScreen === 'finalization' ? (
            <button 
              onClick={() => onNavigate('settings')}
              className="p-1.5 rounded-full text-[#414844] hover:bg-[#e2e3df] transition-colors"
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => onOpenProfile ? onOpenProfile() : onNavigate('settings')}
              className="p-1 rounded-full text-[#414844] hover:bg-[#e2e3df] transition-colors flex items-center gap-1.5"
              title={`Account: ${user.name}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#a0f4c8] text-[#002113] flex items-center justify-center font-bold text-xs border border-[#19724f]/20">
                {user.name.split(' ').map(n => n[0]).join('') || 'A'}
              </div>
            </button>
          )}
        </div>
      </header>

      {/* QR Code Modal for Phone Access */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e2e3df] text-[#1a1c1a] relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#727972] hover:bg-[#f3f4f0] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e8f5e9] text-[#19724f] flex items-center justify-center mx-auto mb-3 border border-[#19724f]/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#002113]">Scan on Phone</h2>
              <p className="text-xs text-[#414844] mt-1">
                Open your phone's camera app and point it at this QR code to join the live multi-device session for Maple Lane Nursery.
              </p>

              {/* Mode Switcher */}
              <div className="flex bg-[#f3f4f0] p-1 rounded-xl border border-[#e2e3df] mt-3">
                <button
                  type="button"
                  onClick={() => setSelectedUrlType('dev')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedUrlType === 'dev'
                      ? 'bg-[#19724f] text-white shadow-2xs'
                      : 'text-[#414844] hover:text-[#002113]'
                  }`}
                >
                  Active App (Requires Google Sign-in)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUrlType('pre')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedUrlType === 'pre'
                      ? 'bg-[#19724f] text-white shadow-2xs'
                      : 'text-[#414844] hover:text-[#002113]'
                  }`}
                >
                  Shared Link (Public Access)
                </button>
              </div>

              {/* 404 / 403 Troubleshooting Tip */}
              <div className="mt-3 bg-[#fff8e1] border border-[#ffe082] rounded-xl p-3 text-left text-[11px] text-[#5d4037]">
                <p className="font-semibold flex items-center gap-1 text-[#e65100]">
                  <span>💡 Why "Page Not Found" or 403 on phone?</span>
                </p>
                <p className="mt-1 text-[10.5px] text-[#6d4c41] leading-relaxed">
                  Development URLs are protected inside AI Studio. To open on any phone without errors:
                </p>
                <ol className="list-decimal list-inside mt-1.5 space-y-1 text-[10.5px] text-[#5d4037] font-medium">
                  <li>Click the <strong>"Share"</strong> or <strong>"Deploy"</strong> button at the top right of the Google AI Studio page.</li>
                  <li>Enable public sharing or deploy the app to generate a live public URL.</li>
                  <li>Scan or copy the published link on your phone.</li>
                </ol>
              </div>
            </div>

            {/* QR Code Box */}
            <div className="bg-[#f8f9f5] p-5 rounded-2xl border border-[#e2e3df] flex flex-col items-center justify-center shadow-inner my-4">
              <div className="bg-white p-3 rounded-xl shadow-md border border-[#e2e3df]">
                <QRCodeSVG
                  value={appUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#002113"
                />
              </div>
              <span className="text-[11px] font-medium text-[#19724f] mt-3 flex items-center gap-1 bg-[#a0f4c8]/40 px-2.5 py-1 rounded-full border border-[#19724f]/20">
                <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-ping"></span>
                4 Phones Multi-User Sync Ready
              </span>
            </div>

            {/* Copy & Direct Link */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 bg-[#f3f4f0] p-2 rounded-lg border border-[#e2e3df]">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="bg-transparent text-xs text-[#414844] flex-1 outline-none font-mono truncate px-1"
                />
                <button
                  onClick={handleCopy}
                  className="bg-[#19724f] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#005236] transition-colors flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-[#002113] hover:bg-[#003822] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Open Link in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


