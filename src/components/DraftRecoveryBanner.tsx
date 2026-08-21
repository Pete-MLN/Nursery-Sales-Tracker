import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Trash2, X, Clock, ShoppingCart } from 'lucide-react';
import { getActiveDraft, clearActiveDraft, OrderDraft } from '../services/orderAutoSaveService';

interface DraftRecoveryBannerProps {
  onResumeDraft: (draft: OrderDraft) => void;
  onDiscardDraft?: () => void;
  className?: string;
}

export const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({
  onResumeDraft,
  onDiscardDraft,
  className = ''
}) => {
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkDraft = () => {
      const active = getActiveDraft();
      if (active && (active.cartItems.length > 0 || (active.customerName && active.customerName.trim().length > 0))) {
        setDraft(active);
      } else {
        setDraft(null);
      }
    };

    checkDraft();
    window.addEventListener('nursery_autosave_event', checkDraft);
    return () => window.removeEventListener('nursery_autosave_event', checkDraft);
  }, []);

  if (!draft || isDismissed) return null;

  const totalItems = draft.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = draft.cartItems.reduce((sum, item) => sum + (item.selectedPrice || item.plant.price) * item.quantity, 0);
  const savedDate = draft.lastSavedAt ? new Date(draft.lastSavedAt) : new Date();
  const timeFormatted = savedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const handleDiscard = () => {
    clearActiveDraft(draft.orderId);
    setDraft(null);
    if (onDiscardDraft) onDiscardDraft();
  };

  const handleResume = () => {
    onResumeDraft(draft);
  };

  return (
    <div 
      className={`bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-3.5 sm:p-4 text-[#1a1c1a] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-200 text-amber-950 font-bold text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Auto-Saved Draft Recovered
            </span>
            <span className="text-xs text-amber-800 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Saved at {timeFormatted}
            </span>
          </div>
          <p className="font-extrabold text-sm sm:text-base text-[#1a1c1a] mt-0.5 truncate">
            {draft.customerName ? draft.customerName : 'Retail Walk-in'} • {totalItems} item{totalItems === 1 ? '' : 's'} (${totalAmount.toFixed(2)})
          </p>
          <p className="text-xs text-amber-900/90 mt-0.5">
            {draft.isEditingExisting 
              ? `Unsaved changes on order ${draft.orderId || ''} were protected.`
              : 'Your in-progress order was safely preserved from your last session.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-200">
        <button
          type="button"
          onClick={handleDiscard}
          className="px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200/60 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          title="Discard this recovered draft"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Discard</span>
        </button>

        <button
          type="button"
          onClick={handleResume}
          className="flex-1 sm:flex-initial px-4 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span>Resume Order</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-amber-800 hover:bg-amber-200/60 rounded-lg transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
