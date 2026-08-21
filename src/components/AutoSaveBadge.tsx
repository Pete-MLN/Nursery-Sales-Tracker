import React, { useState, useEffect } from 'react';
import { Cloud, Check, RefreshCw, WifiOff, ShieldCheck } from 'lucide-react';
import { AutoSaveEventDetail, AutoSaveStatusType } from '../services/orderAutoSaveService';

interface AutoSaveBadgeProps {
  className?: string;
  compact?: boolean;
}

export const AutoSaveBadge: React.FC<AutoSaveBadgeProps> = ({ className = '', compact = false }) => {
  const [status, setStatus] = useState<AutoSaveStatusType>('saved_cloud');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Read last saved status on mount
    try {
      const stored = localStorage.getItem('nursery_last_saved_info');
      if (stored) {
        const parsed = JSON.parse(stored) as AutoSaveEventDetail;
        if (parsed && parsed.status) {
          setStatus(parsed.status);
          if (parsed.timestamp) {
            setLastSavedTime(formatTimeAgo(new Date(parsed.timestamp)));
          }
        }
      }
    } catch (e) {}

    const handleAutoSaveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AutoSaveEventDetail>;
      if (customEvent.detail) {
        setStatus(customEvent.detail.status);
        setLastSavedTime('Just now');
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('saved_offline');
    };

    window.addEventListener('nursery_autosave_event', handleAutoSaveEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem('nursery_last_saved_info');
        if (stored) {
          const parsed = JSON.parse(stored) as AutoSaveEventDetail;
          if (parsed && parsed.timestamp) {
            setLastSavedTime(formatTimeAgo(new Date(parsed.timestamp)));
          }
        }
      } catch (e) {}
    }, 15000);

    return () => {
      window.removeEventListener('nursery_autosave_event', handleAutoSaveEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (status === 'cleared') {
    return null;
  }

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
          status === 'saving_local'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : !isOnline || status === 'saved_offline'
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        } ${className}`}
        title="Auto-Save is active: Changes are saved instantly to local memory and synced to cloud."
      >
        {status === 'saving_local' ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
            <span>Saving...</span>
          </>
        ) : !isOnline || status === 'saved_offline' ? (
          <>
            <WifiOff className="w-3 h-3 text-sky-600" />
            <span>Saved Offline</span>
          </>
        ) : (
          <>
            <Cloud className="w-3 h-3 text-emerald-600" />
            <span>Auto-Saved</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
        status === 'saving_local'
          ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
          : !isOnline || status === 'saved_offline'
          ? 'bg-sky-50 text-sky-800 border-sky-200 shadow-2xs'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
      } ${className}`}
      title="Auto-Save Protected: Every scan, quantity, and edit is automatically saved to prevent data loss if the app is closed or disconnected."
    >
      {status === 'saving_local' ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
          <span>Auto-saving draft...</span>
        </>
      ) : !isOnline || status === 'saved_offline' ? (
        <>
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>Saved locally • Offline safe</span>
        </>
      ) : (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Auto-saved • {lastSavedTime}</span>
        </>
      )}
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
