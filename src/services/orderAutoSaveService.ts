import { Order, OrderCartItem, PlantItem } from '../types';
import { saveOrderToFirestore } from './firebaseService';

export interface OrderDraft {
  orderId?: string; // If editing an existing order
  isEditingExisting?: boolean;
  customerName: string;
  customerType?: 'RETAIL' | 'WHOLESALE';
  cartItems: OrderCartItem[];
  itemFulfillmentMap?: Record<string, 'Take Now' | 'Pick-up/Delivery'>;
  gpsLoggedMap?: Record<string, string>;
  fulfillmentType?: 'Pickup' | 'Delivery' | 'Take Now' | 'Pick-up/Delivery';
  scheduledDate?: string;
  scheduledTime?: string;
  holdingLocation?: string;
  notes?: string;
  orderStatus?: Order['status'];
  remainingPickupDate?: string;
  partialPickupNotes?: string;
  lastSavedAt: string; // ISO date string
  isCloudSynced?: boolean;
}

const ACTIVE_DRAFT_KEY = 'nursery_order_active_draft';
const OFFLINE_SYNC_QUEUE_KEY = 'nursery_offline_order_sync_queue';
const LAST_SAVED_INFO_KEY = 'nursery_last_saved_info';

let cloudSaveTimeout: NodeJS.Timeout | null = null;
let lastSavedDraftStateString = '';

/**
 * Checks if the browser currently has network connectivity
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Save draft instantly to localStorage and schedule cloud sync
 */
export function autoSaveDraft(draft: OrderDraft, immediateCloudSync: boolean = false) {
  try {
    const draftString = JSON.stringify(draft);
    if (draftString === lastSavedDraftStateString && !immediateCloudSync) {
      return; // No changes since last save
    }

    // 1. INSTANT SYNCHRONOUS LOCAL PERSISTENCE (0ms latency, crash-proof)
    const nowIso = new Date().toISOString();
    const enrichedDraft: OrderDraft = {
      ...draft,
      lastSavedAt: nowIso,
      isCloudSynced: false
    };

    localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(enrichedDraft));
    if (draft.orderId) {
      localStorage.setItem(`nursery_order_edit_${draft.orderId}`, JSON.stringify(enrichedDraft));
    }

    lastSavedDraftStateString = draftString;

    // Dispatch custom event for UI indicators
    notifyAutoSaveStatus({
      status: 'saving_local',
      timestamp: nowIso,
      orderId: draft.orderId,
      itemCount: draft.cartItems.length,
      customerName: draft.customerName
    });

    // 2. SCHEDULE OR RUN CLOUD SYNC ONLY IF EDITING AN EXISTING COMMITTED ORDER
    // (Never write in-progress new order drafts to the main Firestore orders collection)
    if (cloudSaveTimeout) {
      clearTimeout(cloudSaveTimeout);
      cloudSaveTimeout = null;
    }

    if (draft.isEditingExisting && draft.orderId && !draft.orderId.startsWith('ORD-DRAFT-')) {
      const performCloudSync = async () => {
        if (!isOnline()) {
          notifyAutoSaveStatus({
            status: 'saved_offline',
            timestamp: nowIso,
            orderId: draft.orderId,
            itemCount: draft.cartItems.length,
            customerName: draft.customerName
          });
          return;
        }

        try {
          const totalAmount = draft.cartItems.reduce((sum, item) => sum + (item.selectedPrice || item.plant.price) * item.quantity, 0);
          const totalItemsCount = draft.cartItems.reduce((sum, item) => sum + item.quantity, 0);

          const orderToPersist: Order = {
            id: draft.orderId!,
            customerName: draft.customerName.trim() || 'Walk In Customer',
            itemsCount: totalItemsCount,
            total: totalAmount,
            type: draft.fulfillmentType || 'Take Now',
            scheduledTime: draft.scheduledTime || 'Immediate',
            scheduledDate: draft.scheduledDate || new Date().toISOString().split('T')[0],
            status: draft.orderStatus || 'Pending',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            createdAt: nowIso,
            items: draft.cartItems,
            holdingLocation: draft.holdingLocation || 'Greenhouse B, Aisle 4, Bay 12',
            notes: draft.notes || '',
            remainingPickupDate: draft.remainingPickupDate,
            partialPickupNotes: draft.partialPickupNotes
          };

          await saveOrderToFirestore(orderToPersist);
          
          const syncedDraft: OrderDraft = {
            ...enrichedDraft,
            isCloudSynced: true
          };
          localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(syncedDraft));

          notifyAutoSaveStatus({
            status: 'saved_cloud',
            timestamp: new Date().toISOString(),
            orderId: draft.orderId,
            itemCount: draft.cartItems.length,
            customerName: draft.customerName
          });
        } catch (err) {
          console.warn('AutoSave Firestore sync error (cached locally):', err);
          notifyAutoSaveStatus({
            status: 'saved_offline',
            timestamp: nowIso,
            orderId: draft.orderId,
            itemCount: draft.cartItems.length,
            customerName: draft.customerName
          });
        }
      };

      if (immediateCloudSync) {
        performCloudSync();
      } else {
        cloudSaveTimeout = setTimeout(performCloudSync, 1000);
      }
    } else {
      // For new in-progress drafts, local persistence in localStorage is already completed synchronously
      notifyAutoSaveStatus({
        status: 'saved_cloud',
        timestamp: nowIso,
        orderId: undefined,
        itemCount: draft.cartItems.length,
        customerName: draft.customerName
      });
    }
  } catch (e) {
    console.error('Failed to auto-save order draft:', e);
  }
}

/**
 * Compares an OrderDraft with an existing saved Order to determine if there are real unsaved changes.
 * Returns false if the draft has identical data to what is already committed in the database.
 */
export function doesDraftDifferFromSavedOrder(draft: OrderDraft, savedOrder: Order): boolean {
  if (!draft || !savedOrder) return false;

  // Check customer name
  const draftCustomer = (draft.customerName || '').trim();
  const orderCustomer = (savedOrder.customerName || '').trim();
  if (draftCustomer && orderCustomer && draftCustomer !== orderCustomer) return true;

  // Check items count and content
  const draftItems = draft.cartItems || [];
  const orderItems = savedOrder.items || [];
  if (draftItems.length !== orderItems.length) return true;

  for (const dItem of draftItems) {
    const matched = orderItems.find(oItem => oItem.plant.id === dItem.plant.id);
    if (!matched) return true;
    if (matched.quantity !== dItem.quantity) return true;
    const dPrice = dItem.selectedPrice ?? dItem.plant.price;
    const oPrice = matched.selectedPrice ?? matched.plant.price;
    if (Math.abs(dPrice - oPrice) > 0.001) return true;
    if (dItem.selectedPriceLevel && matched.selectedPriceLevel && dItem.selectedPriceLevel !== matched.selectedPriceLevel) return true;
  }

  // Check notes
  if ((draft.notes || '').trim() !== (savedOrder.notes || '').trim()) return true;

  // Check fulfillment & status
  if (draft.fulfillmentType && savedOrder.type && draft.fulfillmentType !== savedOrder.type) return true;
  if (draft.orderStatus && savedOrder.status && draft.orderStatus !== savedOrder.status) return true;
  if (draft.holdingLocation && savedOrder.holdingLocation && draft.holdingLocation !== savedOrder.holdingLocation) return true;

  return false;
}

/**
 * Retrieve active in-progress order draft from localStorage.
 * If existingOrders is provided, automatically ignores and cleans up drafts that are already committed to the database.
 */
export function getActiveDraft(existingOrders?: Order[]): OrderDraft | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const draft = parsed as OrderDraft;

    // Check if the draft actually has meaningful data
    const hasItems = Array.isArray(draft.cartItems) && draft.cartItems.length > 0;
    const hasCustomer = typeof draft.customerName === 'string' && draft.customerName.trim().length > 0;
    const hasNotes = typeof draft.notes === 'string' && draft.notes.trim().length > 0;

    if (!hasItems && !hasCustomer && !hasNotes && !draft.orderId) {
      clearActiveDraft();
      return null;
    }

    // If existingOrders is supplied, check if this draft is already fully saved in the database
    if (existingOrders && existingOrders.length > 0) {
      if (draft.orderId && !draft.orderId.startsWith('ORD-DRAFT-')) {
        const savedOrder = existingOrders.find(o => o.id === draft.orderId);
        if (savedOrder && !doesDraftDifferFromSavedOrder(draft, savedOrder)) {
          // The order in the database already has the exact same content -> this draft is already saved!
          clearActiveDraft(draft.orderId);
          return null;
        }
      } else if (!draft.orderId && hasItems) {
        // Check if there is an existing order created in the last 2 minutes that has the exact same items & customer
        const matchingCommittedOrder = existingOrders.find(o => {
          if (!o || !o.items) return false;
          return !doesDraftDifferFromSavedOrder(draft, o);
        });
        if (matchingCommittedOrder) {
          clearActiveDraft();
          return null;
        }
      }
    }

    return draft;
  } catch (e) {
    console.error('Failed to retrieve active draft:', e);
    return null;
  }
}

/**
 * Retrieve saved partial edit for a specific order ID
 */
export function getDraftForOrderId(orderId: string): OrderDraft | null {
  try {
    const raw = localStorage.getItem(`nursery_order_edit_${orderId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as OrderDraft;
  } catch (e) {
    return null;
  }
}

/**
 * Clear the active draft upon explicit completion or user cancellation
 */
export function clearActiveDraft(orderId?: string) {
  try {
    if (cloudSaveTimeout) {
      clearTimeout(cloudSaveTimeout);
      cloudSaveTimeout = null;
    }
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    if (orderId) {
      localStorage.removeItem(`nursery_order_edit_${orderId}`);
    }
    lastSavedDraftStateString = '';

    notifyAutoSaveStatus({
      status: 'cleared',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error clearing active draft:', e);
  }
}

/**
 * Queue order for offline synchronization
 */
function queueOrderForOfflineSync(draft: OrderDraft) {
  try {
    const raw = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
    let queue: OrderDraft[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(queue)) queue = [];

    // Replace existing queued version of same order or draft
    const index = queue.findIndex(d => (d.orderId && d.orderId === draft.orderId) || (!d.orderId && !draft.orderId));
    if (index >= 0) {
      queue[index] = draft;
    } else {
      queue.push(draft);
    }

    localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to queue order for offline sync:', e);
  }
}

/**
 * Process any pending offline sync queue when connection is restored
 */
export async function flushOfflineSyncQueue() {
  if (!isOnline()) return;

  try {
    const raw = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
    if (!raw) return;
    const queue: OrderDraft[] = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    for (const draft of queue) {
      if (draft.isEditingExisting && draft.orderId && !draft.orderId.startsWith('ORD-DRAFT-') && draft.cartItems && draft.cartItems.length > 0) {
        const totalAmount = draft.cartItems.reduce((sum, item) => sum + (item.selectedPrice || item.plant.price) * item.quantity, 0);
        const totalItemsCount = draft.cartItems.reduce((sum, item) => sum + item.quantity, 0);

        const order: Order = {
          id: draft.orderId,
          customerName: draft.customerName || 'Walk In Customer',
          itemsCount: totalItemsCount,
          total: totalAmount,
          type: draft.fulfillmentType || 'Take Now',
          scheduledTime: draft.scheduledTime || 'Immediate',
          scheduledDate: draft.scheduledDate || new Date().toISOString().split('T')[0],
          status: draft.orderStatus || 'Pending',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAt: draft.lastSavedAt || new Date().toISOString(),
          items: draft.cartItems,
          holdingLocation: draft.holdingLocation || 'Greenhouse B, Aisle 4, Bay 12',
          notes: draft.notes || ''
        };

        await saveOrderToFirestore(order);
      }
    }

    localStorage.removeItem(OFFLINE_SYNC_QUEUE_KEY);
    notifyAutoSaveStatus({
      status: 'saved_cloud',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error flushing offline sync queue:', e);
  }
}

export type AutoSaveStatusType = 'idle' | 'saving_local' | 'saved_cloud' | 'saved_offline' | 'cleared';

export interface AutoSaveEventDetail {
  status: AutoSaveStatusType;
  timestamp: string;
  orderId?: string;
  itemCount?: number;
  customerName?: string;
}

function notifyAutoSaveStatus(detail: AutoSaveEventDetail) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_SAVED_INFO_KEY, JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('nursery_autosave_event', { detail }));
  }
}

/**
 * Initialize lifecycle hooks to guarantee that tab close, crash, navigation, or app backgrounding
 * immediately flushes any draft state to storage.
 */
export function initAutoSaveLifecycleListeners(getCurrentDraftFn: () => OrderDraft | null) {
  if (typeof window === 'undefined') return () => {};

  const emergencySave = () => {
    try {
      const current = getCurrentDraftFn();
      if (current && (current.cartItems.length > 0 || current.customerName.trim().length > 0 || current.orderId)) {
        autoSaveDraft(current, true);
      }
    } catch (e) {
      console.error('Emergency autosave failed on lifecycle hook:', e);
    }
  };

  const handleOnline = () => {
    flushOfflineSyncQueue();
  };

  window.addEventListener('beforeunload', emergencySave);
  window.addEventListener('pagehide', emergencySave);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      emergencySave();
    }
  });
  window.addEventListener('online', handleOnline);

  // Check and flush offline queue on init
  flushOfflineSyncQueue();

  return () => {
    window.removeEventListener('beforeunload', emergencySave);
    window.removeEventListener('pagehide', emergencySave);
    window.removeEventListener('online', handleOnline);
  };
}
