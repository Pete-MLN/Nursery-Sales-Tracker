import React, { useState, useEffect } from 'react';
import { ScreenType, Order, PlantItem, Customer, HoldingArea, OrderCartItem } from '../types';
import { DEFAULT_PLANT_IMAGE } from '../data/mockData';
import { 
  CheckCircle, 
  ShoppingBag, 
  Calendar, 
  Truck, 
  MapPin, 
  Mail, 
  Building, 
  MessageSquare, 
  ArrowLeft, 
  ArrowRightLeft, 
  Info, 
  Plus, 
  Minus, 
  Trash2, 
  Edit3, 
  Save, 
  Search, 
  X, 
  Package, 
  AlertTriangle, 
  Printer, 
  Clock,
  UserCheck,
  PlusCircle,
  FileText,
  Barcode,
  CheckSquare,
  Square,
  Copy,
  Sparkles,
  ClipboardCheck,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface OrderFinalizationScreenProps {
  onNavigate: (screen: ScreenType) => void;
  order?: Order | null;
  inventory?: PlantItem[];
  customers?: Customer[];
  holdingAreas?: HoldingArea[];
  onUpdateOrder?: (updatedOrder: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  onSendNotification?: (type: string) => void;
}

export const OrderFinalizationScreen: React.FC<OrderFinalizationScreenProps> = ({
  onNavigate,
  order,
  inventory = [],
  customers = [],
  holdingAreas = [],
  onUpdateOrder,
  onDeleteOrder,
  onSendNotification
}) => {
  // Primary Order State (Editable in-memory until saved)
  const [currentOrder, setCurrentOrder] = useState<Order>(() => {
    if (order) return { ...order, items: order.items ? [...order.items] : [] };
    return {
      id: '#90210-A',
      customerName: 'Sarah Jenkins',
      total: 1450.00,
      itemsCount: 14,
      type: 'Take Now',
      scheduledTime: '10/27/2023',
      status: 'Ready for Pickup',
      date: 'Oct 24, 2023',
      holdingLocation: 'Greenhouse B, Aisle 4, Bay 12',
      items: []
    };
  });

  // Sync state if prop changes
  useEffect(() => {
    if (order) {
      setCurrentOrder({
        ...order,
        items: order.items ? order.items.map(item => ({ ...item })) : []
      });
    }
  }, [order]);

  // Form Fields
  const [customerName, setCustomerName] = useState<string>(currentOrder.customerName);
  const [isEditingCustomer, setIsEditingCustomer] = useState<boolean>(false);
  const [fulfillment, setFulfillment] = useState<'Take Now' | 'Pickup Later' | 'Delivery' | 'Pick-up/Delivery'>(currentOrder.type || 'Take Now');
  const [scheduledDate, setScheduledDate] = useState<string>(currentOrder.scheduledTime || new Date().toISOString().split('T')[0]);
  const [orderStatus, setOrderStatus] = useState<'Pending' | 'Ready for Pickup' | 'Completed' | 'In Transit' | 'Cancelled' | 'Partial Pickup'>(currentOrder.status || 'Pending');
  const [holdingLocation, setHoldingLocation] = useState<string>(currentOrder.holdingLocation || 'Holding Area B - North Greenhouse');
  const [orderNotes, setOrderNotes] = useState<string>(currentOrder.notes || '');
  const [items, setItems] = useState<OrderCartItem[]>(currentOrder.items || []);

  // Partial Pickup State
  const [hasPartialPickupToggle, setHasPartialPickupToggle] = useState<boolean>(() => {
    if (currentOrder.hasPartialPickup !== undefined) return currentOrder.hasPartialPickup;
    if (currentOrder.status === 'Partial Pickup') return true;
    return false;
  });
  const [remainingPickupDate, setRemainingPickupDate] = useState<string>(currentOrder.remainingPickupDate || '');
  const [partialPickupNotes, setPartialPickupNotes] = useState<string>(currentOrder.partialPickupNotes || '');

  // Modals & UI States
  const [isAddingPlantModalOpen, setIsAddingPlantModalOpen] = useState<boolean>(false);
  const [isChangingLocationModalOpen, setIsChangingLocationModalOpen] = useState<boolean>(false);
  const [isHoldSlipModalOpen, setIsHoldSlipModalOpen] = useState<boolean>(false);
  const [isEmailStaffModalOpen, setIsEmailStaffModalOpen] = useState<boolean>(false);
  const [staffEmailAddress, setStaffEmailAddress] = useState<string>('yard@maplelanenursery.com');
  const [plantSearchQuery, setPlantSearchQuery] = useState<string>('');
  const [selectedPlantCategory, setSelectedPlantCategory] = useState<string>('All');
  const [customLocationText, setCustomLocationText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Synchronize internal form when currentOrder changes
  useEffect(() => {
    setCustomerName(currentOrder.customerName || '');
    setFulfillment(currentOrder.type || 'Take Now');
    setScheduledDate(currentOrder.scheduledTime || '');
    setOrderStatus(currentOrder.status || 'Pending');
    setHoldingLocation(currentOrder.holdingLocation || '');
    setOrderNotes(currentOrder.notes || '');
    setItems(currentOrder.items || []);
    setHasPartialPickupToggle(
      !!currentOrder.hasPartialPickup ||
      currentOrder.status === 'Partial Pickup' ||
      ((currentOrder.remainingItemsCount || 0) > 0 && (currentOrder.pickedUpItemsCount || 0) > 0)
    );
    setRemainingPickupDate(currentOrder.remainingPickupDate || '');
    setPartialPickupNotes(currentOrder.partialPickupNotes || '');
    setHasUnsavedChanges(false);
  }, [currentOrder.id]);

  // Computed Totals
  const calculatedTotal = items.reduce((sum, item) => sum + (item.plant.price * item.quantity), 0);
  const calculatedItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Item pickup calculation helpers
  const getItemPickedUpQty = (item: OrderCartItem): number => {
    if (typeof item.pickedUpQuantity === 'number') {
      return Math.min(item.quantity, Math.max(0, item.pickedUpQuantity));
    }
    if (orderStatus === 'Completed') return item.quantity;
    if (fulfillment === 'Take Now' && !hasPartialPickupToggle && orderStatus !== 'Partial Pickup') return item.quantity;
    return 0;
  };

  const getItemRemainingQty = (item: OrderCartItem): number => {
    return Math.max(0, item.quantity - getItemPickedUpQty(item));
  };

  const totalPickedUpQty = items.reduce((sum, item) => sum + getItemPickedUpQty(item), 0);
  const totalRemainingQty = items.reduce((sum, item) => sum + getItemRemainingQty(item), 0);
  const isPartialPickupActive = hasPartialPickupToggle || (totalPickedUpQty > 0 && totalRemainingQty > 0) || orderStatus === 'Partial Pickup';
  const remainingItemsList = items.filter(item => getItemRemainingQty(item) > 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (onSendNotification) onSendNotification(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Item Quantity Adjustments
  const handleUpdateQuantity = (plantId: string, delta: number) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.plant.id === plantId) {
          const newQty = Math.max(1, item.quantity + delta);
          const currentPicked = getItemPickedUpQty(item);
          const newPicked = Math.min(currentPicked, newQty);
          return { ...item, quantity: newQty, pickedUpQuantity: newPicked };
        }
        return item;
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleSetQuantity = (plantId: string, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    setItems(prev => {
      return prev.map(item => {
        if (item.plant.id === plantId) {
          const currentPicked = getItemPickedUpQty(item);
          const newPicked = Math.min(currentPicked, newQty);
          return { ...item, quantity: newQty, pickedUpQuantity: newPicked };
        }
        return item;
      });
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (plantId: string, plantName: string) => {
    if (window.confirm(`Remove "${plantName}" from this order?`)) {
      setItems(prev => prev.filter(item => item.plant.id !== plantId));
      setHasUnsavedChanges(true);
      showToast(`Removed "${plantName}" from order.`);
    }
  };

  // Item Pickup Toggles & Fine Steppers
  const handleToggleItemPickup = (plantId: string) => {
    setItems(prev => {
      return prev.map(item => {
        if (item.plant.id === plantId) {
          const currentPicked = getItemPickedUpQty(item);
          // If already fully picked up, toggle to 0. Otherwise set to full quantity.
          const nextPicked = currentPicked === item.quantity ? 0 : item.quantity;
          return { ...item, pickedUpQuantity: nextPicked };
        }
        return item;
      });
    });
    setHasUnsavedChanges(true);
  };

  const handleSetItemPickedUpQty = (plantId: string, pickedQty: number) => {
    setItems(prev => {
      return prev.map(item => {
        if (item.plant.id === plantId) {
          const clamped = Math.max(0, Math.min(item.quantity, pickedQty));
          return { ...item, pickedUpQuantity: clamped };
        }
        return item;
      });
    });
    setHasUnsavedChanges(true);
  };

  // Bulk Pickup Action Helpers
  const handleMarkAllTaken = () => {
    setItems(prev => prev.map(item => ({ ...item, pickedUpQuantity: item.quantity })));
    setHasPartialPickupToggle(false);
    setOrderStatus('Completed');
    setHasUnsavedChanges(true);
    showToast('All items marked as taken/picked up by customer.');
  };

  const handleEnablePartialPickup = () => {
    setHasPartialPickupToggle(true);
    if (orderStatus !== 'Partial Pickup') {
      setOrderStatus('Partial Pickup');
    }
    setHasUnsavedChanges(true);
    showToast('Partial pickup enabled. Check off which plants the customer took today.');
  };

  const handleMarkNoneTaken = () => {
    setItems(prev => prev.map(item => ({ ...item, pickedUpQuantity: 0 })));
    setOrderStatus('Ready for Pickup');
    setHasUnsavedChanges(true);
    showToast('All items marked as waiting at holding area.');
  };

  const handleMarkRemainingAsPickedUp = () => {
    setItems(prev => prev.map(item => ({ ...item, pickedUpQuantity: item.quantity })));
    setHasPartialPickupToggle(false);
    setOrderStatus('Completed');
    setHasUnsavedChanges(true);
    showToast('Remaining items marked as picked up! Order completed.');
  };

  // Add plant to active order from Inventory search modal
  const handleAddPlantToOrder = (plant: PlantItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.plant.id === plant.id);
      if (existing) {
        return prev.map(i => i.plant.id === plant.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, { plant, quantity: 1, pickedUpQuantity: 0 }];
      }
    });
    setHasUnsavedChanges(true);
    showToast(`Added ${plant.name} to order.`);
  };

  // Save changes to database and parent state
  const handleSaveChanges = () => {
    const calculatedRemaining = items.reduce((sum, item) => sum + getItemRemainingQty(item), 0);
    const calculatedPickedUp = items.reduce((sum, item) => sum + getItemPickedUpQty(item), 0);
    const hasRemaining = calculatedRemaining > 0 && (calculatedPickedUp > 0 || hasPartialPickupToggle);

    const itemsWithPickup = items.map(item => ({
      ...item,
      pickedUpQuantity: getItemPickedUpQty(item)
    }));

    const finalStatus: Order['status'] = 
      orderStatus === 'Cancelled' ? 'Cancelled' :
      (calculatedRemaining === 0 && calculatedItemsCount > 0) ? 'Completed' :
      hasRemaining ? 'Partial Pickup' :
      orderStatus;

    const updated: Order = {
      ...currentOrder,
      customerName: customerName.trim() || 'Retail Walk-in',
      type: fulfillment,
      scheduledTime: scheduledDate,
      status: finalStatus,
      holdingLocation: holdingLocation,
      notes: orderNotes.trim(),
      items: itemsWithPickup,
      itemsCount: calculatedItemsCount,
      total: calculatedTotal,
      hasPartialPickup: hasRemaining,
      remainingItemsCount: calculatedRemaining,
      pickedUpItemsCount: calculatedPickedUp,
      remainingPickupDate: remainingPickupDate,
      partialPickupNotes: partialPickupNotes.trim()
    };

    setCurrentOrder(updated);
    if (onUpdateOrder) {
      onUpdateOrder(updated);
    }
    setHasUnsavedChanges(false);
    showToast(`Order ${updated.id} saved & synced to cloud!`);
  };

  // Delete / Cancel entire order
  const handleDeleteOrder = () => {
    if (window.confirm(`Are you sure you want to cancel and delete Order ${currentOrder.id}? This action cannot be undone.`)) {
      if (onDeleteOrder) {
        onDeleteOrder(currentOrder.id);
      }
      showToast(`Order ${currentOrder.id} has been cancelled.`);
      onNavigate('orders');
    }
  };

  // Copy holding slip to clipboard
  const handleCopyHoldingSlip = () => {
    const lines = [
      `MAPLE LANE NURSERY - REMAINING PICKUP HOLD SLIP`,
      `Order: ${currentOrder.id}`,
      `Customer: ${customerName}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Holding Bay: ${holdingLocation}`,
      `Scheduled Remaining Pickup: ${remainingPickupDate || 'Pending'}`,
      `Notes: ${partialPickupNotes || orderNotes || 'None'}`,
      `----------------------------------------`,
      `PLANTS STILL TO PICK UP (${totalRemainingQty} plants):`,
      ...remainingItemsList.map(item => {
        const rem = getItemRemainingQty(item);
        return `[ ] ${rem}x ${item.plant.name} (${item.plant.size || 'Std'}) - SKU #${item.plant.itemNo || item.plant.barcode}`;
      }),
      `----------------------------------------`,
      `Staged by: Pete / Maple Lane Crew`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Hold slip copied to clipboard!');
  };

  // Get formatted email text for nursery yard/fulfillment staff
  const getStaffEmailContent = () => {
    const subject = `[HOLD TICKET] Remaining Plants for Order #${currentOrder.id} - ${customerName}`;
    const body = 
`MAPLE LANE NURSERY - REMAINING PICKUP HOLD TICKET
==================================================
Order Number: ${currentOrder.id}
Customer Name: ${customerName}
Assigned Holding Bay: ${holdingLocation || 'Holding Area B'}
Expected Pickup Date: ${remainingPickupDate || 'To be determined'}
Total Remaining Plants: ${totalRemainingQty}

PLANTS AWAITING PICKUP:
--------------------------------------------------
${remainingItemsList.map(item => `( ${getItemRemainingQty(item)}x )  -  SKU #${item.plant.itemNo || item.plant.barcode || 'N/A'}  -  ${item.plant.name}`).join('\n')}

STAFF INSTRUCTIONS / NOTES:
--------------------------------------------------
${partialPickupNotes || orderNotes || 'Keep staged in assigned holding area and maintain daily watering.'}

Logged by: Pete / Maple Lane Nursery Team
Timestamp: ${new Date().toLocaleString()}`;

    return { subject, body };
  };

  // Trigger email to nursery yard crew
  const handleEmailStaff = () => {
    const { subject, body } = getStaffEmailContent();
    const mailtoUrl = `mailto:${encodeURIComponent(staffEmailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open default mail client
    window.location.href = mailtoUrl;
    showToast(`Email opened for staff (${staffEmailAddress})`);
    setIsEmailStaffModalOpen(true);
  };

  // Filter plants for add item dialog
  const filteredInventory = inventory.filter(plant => {
    const matchesSearch = 
      plant.name.toLowerCase().includes(plantSearchQuery.toLowerCase()) ||
      (plant.botanicalName && plant.botanicalName.toLowerCase().includes(plantSearchQuery.toLowerCase())) ||
      (plant.itemNo && plant.itemNo.toLowerCase().includes(plantSearchQuery.toLowerCase())) ||
      (plant.barcode && plant.barcode.includes(plantSearchQuery));
    
    const matchesCategory = 
      selectedPlantCategory === 'All' || 
      (plant.category && plant.category.toLowerCase().includes(selectedPlantCategory.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Evergreen', 'Perennial', 'Greenhouse', 'Deciduous', 'Bulk'];

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-48 animate-fade-in flex flex-col gap-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#012d1d] text-[#a0f4c8] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold animate-fade-in border border-[#a0f4c8]/30">
          <CheckCircle className="w-4 h-4 text-[#a0f4c8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3 border-b border-[#e2e3df] pb-3">
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#414844] hover:text-[#012d1d] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </button>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
              Unsaved Edits
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveChanges}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Order</span>
          </button>
        </div>
      </div>

      {/* Order Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#c1c8c2] shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3f4f0] pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#717973]">
                Order {currentOrder.id}
              </span>
              <span className="text-xs text-[#717973]">• {currentOrder.date || 'Today'}</span>
              {isPartialPickupActive && (
                <span className="text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-700" />
                  <span>Partial Pickup ({totalRemainingQty} remaining)</span>
                </span>
              )}
            </div>
            
            {/* Editable Customer Name */}
            {isEditingCustomer ? (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="bg-[#f3f4f0] border border-[#012d1d] rounded-lg px-3 py-1.5 text-base font-bold text-[#1a1c1a] focus:outline-none focus:bg-white"
                  placeholder="Enter Customer Name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsEditingCustomer(false)}
                  className="px-2.5 py-1.5 bg-[#012d1d] text-[#a0f4c8] rounded-lg text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1a1c1a]">
                  {customerName || 'Retail Walk-in'}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingCustomer(true)}
                  className="p-1 rounded-lg text-[#717973] hover:text-[#012d1d] hover:bg-[#f3f4f0] transition-colors cursor-pointer"
                  title="Edit Customer Name"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-[#717973] uppercase tracking-wider block">
              Order Total ({calculatedItemsCount} items)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#012d1d]">
              ${calculatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Status & Quick Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Order Status Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#012d1d] uppercase tracking-wider mb-1">
              Order Status
            </label>
            <select
              value={orderStatus}
              onChange={(e) => {
                const newSt = e.target.value as any;
                setOrderStatus(newSt);
                if (newSt === 'Partial Pickup') {
                  setHasPartialPickupToggle(true);
                }
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3 py-2 text-xs font-bold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
            >
              <option value="Pending">Pending (Staging in Progress)</option>
              <option value="Ready for Pickup">Ready for Pickup</option>
              <option value="Partial Pickup">⚠️ Partial Pickup (Customer took partial load)</option>
              <option value="In Transit">In Transit / Out for Delivery</option>
              <option value="Completed">Completed / Fully Fulfilled</option>
              <option value="Cancelled">Cancelled / Void</option>
            </select>
          </div>

          {/* Fulfillment Type Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#012d1d] uppercase tracking-wider mb-1">
              Fulfillment Type & Date
            </label>
            <div className="flex gap-2">
              <select
                value={fulfillment}
                onChange={(e) => {
                  setFulfillment(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="w-1/2 bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-2.5 py-2 text-xs font-bold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
              >
                <option value="Take Now">Take Now</option>
                <option value="Pickup Later">Pickup Later</option>
                <option value="Delivery">Delivery</option>
                <option value="Pick-up/Delivery">Pick-up/Delivery</option>
              </select>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-1/2 bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-2.5 py-2 text-xs font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Holding Location & Staging Assignment Section */}
      <div className="bg-[#f3f4f0] p-4 sm:p-5 rounded-2xl border border-[#c1c8c2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#717973] block">
              Assigned Holding Location
            </span>
            <span className="text-base font-extrabold text-[#012d1d] block mt-0.5">
              {holdingLocation || 'No zone assigned yet'}
            </span>
            <span className="text-xs text-[#414844] block mt-0.5">
              Plants staged here for customer loading or truck routing.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsChangingLocationModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#e2e3df] text-[#012d1d] border border-[#c1c8c2] text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Change Zone</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('holding_location')}
            className="px-3 py-2 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Open interactive holding map"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* PARTIAL PICKUP & FULFILLMENT CONTROLLER */}
      <div className="bg-[#fcfdfa] p-5 rounded-2xl border-2 border-[#012d1d]/20 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e3df] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#012d1d]" />
              <h3 className="text-base font-extrabold text-[#012d1d]">
                Pickup & Load Tracking
              </h3>
            </div>
            <p className="text-xs text-[#414844] mt-0.5">
              Track whether the customer took their entire order at once or left plants for later pickup.
            </p>
          </div>

          {/* Master Checkbox: Partial Pickup */}
          <label className="flex items-center gap-2.5 bg-white border border-[#c1c8c2] hover:border-[#012d1d] p-2.5 px-3.5 rounded-xl cursor-pointer shadow-2xs transition-all select-none">
            <input
              type="checkbox"
              checked={hasPartialPickupToggle}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasPartialPickupToggle(checked);
                if (checked) {
                  setOrderStatus('Partial Pickup');
                  showToast('Partial pickup mode turned ON. Check off items taken below.');
                } else {
                  if (totalRemainingQty === 0) setOrderStatus('Completed');
                  else setOrderStatus('Ready for Pickup');
                }
                setHasUnsavedChanges(true);
              }}
              className="w-4 h-4 text-[#012d1d] rounded focus:ring-[#012d1d] accent-[#012d1d] cursor-pointer"
            />
            <span className="text-xs font-extrabold text-[#012d1d]">
              Customer didn't take entire order
            </span>
          </label>
        </div>

        {/* Live Pickup Status Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-[#c1c8c2] flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#717973] uppercase tracking-wider block">Total Ordered</span>
              <span className="text-lg font-extrabold text-[#012d1d]">{calculatedItemsCount} plants</span>
            </div>
            <Package className="w-6 h-6 text-[#717973]/50" />
          </div>

          <div className="bg-[#e7f8ef] p-3 rounded-xl border border-[#a0f4c8] flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#0e6c4a] uppercase tracking-wider block">Taken / Loaded</span>
              <span className="text-lg font-extrabold text-[#012d1d]">{totalPickedUpQty} plants</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#0e6c4a]" />
          </div>

          <div className={`p-3 rounded-xl border flex items-center justify-between shadow-2xs transition-all ${
            totalRemainingQty > 0 
              ? 'bg-amber-50 border-amber-300' 
              : 'bg-white border-[#c1c8c2]'
          }`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${totalRemainingQty > 0 ? 'text-amber-800' : 'text-[#717973]'}`}>
                Still to Pick Up
              </span>
              <span className={`text-lg font-extrabold ${totalRemainingQty > 0 ? 'text-amber-900' : 'text-[#717973]'}`}>
                {totalRemainingQty} plants
              </span>
            </div>
            <Clock className={`w-6 h-6 ${totalRemainingQty > 0 ? 'text-amber-600' : 'text-[#717973]/50'}`} />
          </div>
        </div>

        {/* Quick Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleMarkAllTaken}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#e7f8ef] text-[#012d1d] border border-[#c1c8c2] hover:border-[#a0f4c8] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <CheckCircle className="w-3.5 h-3.5 text-[#0e6c4a]" />
            <span>Mark All Plants as Taken</span>
          </button>

          <button
            type="button"
            onClick={handleEnablePartialPickup}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-[#012d1d] border border-[#c1c8c2] hover:border-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Customer Took Partial Load</span>
          </button>

          <button
            type="button"
            onClick={handleMarkNoneTaken}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#f3f4f0] text-[#717973] hover:text-[#1a1c1a] border border-[#c1c8c2] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>None Taken Yet (All Waiting)</span>
          </button>
        </div>
      </div>

      {/* DEDICATED "PLANTS STILL TO PICK UP" HOLDING SECTION */}
      {totalRemainingQty > 0 && (
        <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-amber-950">
                    Plants Still to Pick Up ({totalRemainingQty} plants remaining)
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    Awaiting Customer Return
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Reserved in <strong>{holdingLocation}</strong>. Yard crew must keep these plants staged and watered.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyHoldingSlip}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Copy remaining plants list to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Hold Slip</span>
              </button>

              <button
                type="button"
                onClick={handleEmailStaff}
                className="px-3.5 py-1.5 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Email hold slip & remaining plants manifest to yard staff"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email to Staff</span>
              </button>
            </div>
          </div>

          {/* Remaining Plants Itemized Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {remainingItemsList.map((item, idx) => {
              const remQty = getItemRemainingQty(item);
              const takenQty = getItemPickedUpQty(item);

              return (
                <div 
                  key={`rem-${item.plant.id}-${idx}`}
                  className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.plant.image || DEFAULT_PLANT_IMAGE}
                      alt={item.plant.name}
                      className="w-12 h-12 rounded-lg object-cover border border-amber-200 shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-[#012d1d] truncate">
                          {item.plant.name}
                        </span>
                        {item.plant.size && (
                          <span className="text-[10px] font-bold bg-[#e2e3df] text-[#414844] px-1.5 py-0.5 rounded">
                            {item.plant.size}
                          </span>
                        )}
                        {item.plant.itemNo && (
                          <span className="text-[10px] font-semibold text-[#717973]">
                            #{item.plant.itemNo}
                          </span>
                        )}
                      </div>
                      {item.plant.botanicalName && (
                        <span className="text-xs italic text-[#414844] block truncate">
                          {item.plant.botanicalName}
                        </span>
                      )}
                      <span className="text-[11px] text-[#717973] block mt-0.5">
                        Total Ordered: <strong>{item.quantity}</strong> • Taken: <strong>{takenQty}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>{remQty} to Pick Up</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetItemPickedUpQty(item.plant.id, item.quantity)}
                      className="text-[11px] font-bold text-[#0e6c4a] hover:underline cursor-pointer"
                    >
                      Mark this item taken
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remaining Pickup Scheduling & Return Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200">
            <div>
              <label className="block text-[11px] font-extrabold text-amber-950 uppercase tracking-wider mb-1">
                Scheduled Return / Remainder Pickup Date
              </label>
              <input
                type="date"
                value={remainingPickupDate}
                onChange={(e) => {
                  setRemainingPickupDate(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-950 focus:outline-none focus:border-[#012d1d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-amber-950 uppercase tracking-wider mb-1">
                Pickup Remainder Notes (Trailer, Vehicle, Instructions)
              </label>
              <input
                type="text"
                value={partialPickupNotes}
                onChange={(e) => {
                  setPartialPickupNotes(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Returning Saturday with 16ft trailer for remaining trees"
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-amber-950 focus:outline-none focus:border-[#012d1d]"
              />
            </div>
          </div>

          {/* Quick Complete Remainder Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleMarkRemainingAsPickedUp}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#a0f4c8]" />
              <span>Customer Returned - Mark All Remaining as Picked Up</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Order Items Breakdown with Live Editing & Pickup Checkboxes */}
      <div className="bg-white p-5 rounded-2xl border border-[#c1c8c2] shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#f3f4f0] pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#012d1d]" />
            <h2 className="text-lg font-extrabold text-[#1a1c1a]">All Items in Order ({items.length} unique)</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onUpdateOrder && currentOrder) {
                onUpdateOrder({
                  ...currentOrder,
                  customerName: customerName.trim() || currentOrder.customerName,
                  status: orderStatus,
                  type: fulfillment,
                  scheduledTime: scheduledDate,
                  holdingLocation: holdingLocation,
                  items: items,
                  itemsCount: calculatedItemsCount,
                  total: calculatedTotal,
                  hasPartialPickup: totalRemainingQty > 0 && totalPickedUpQty > 0,
                  remainingItemsCount: totalRemainingQty,
                  pickedUpItemsCount: totalPickedUpQty,
                  remainingPickupDate: remainingPickupDate,
                  partialPickupNotes: partialPickupNotes
                });
              }
              onNavigate('scan');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Open scan screen to scan barcodes and add plants to this order"
          >
            <Barcode className="w-4 h-4" />
            <span>Scan & Add Plants</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center bg-[#f9faf6] rounded-xl border border-dashed border-[#c1c8c2] text-[#717973] flex flex-col items-center gap-2">
            <Package className="w-8 h-8 text-[#c1c8c2]" />
            <span className="font-bold text-sm text-[#1a1c1a]">No items in this order yet</span>
            <span className="text-xs">Use the barcode scanner or catalog to add plants.</span>
            <button
              type="button"
              onClick={() => {
                if (onUpdateOrder && currentOrder) {
                  onUpdateOrder({
                    ...currentOrder,
                    customerName: customerName.trim() || currentOrder.customerName,
                    status: orderStatus,
                    type: fulfillment,
                    scheduledTime: scheduledDate,
                    holdingLocation: holdingLocation,
                    items: items,
                    itemsCount: calculatedItemsCount,
                    total: calculatedTotal
                  });
                }
                onNavigate('scan');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Barcode className="w-4 h-4" />
              <span>Open Scan Page</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#f3f4f0] flex flex-col">
            {items.map((item, index) => {
              const lineTotal = item.plant.price * item.quantity;
              const pickedUpQty = getItemPickedUpQty(item);
              const remainingQty = getItemRemainingQty(item);
              const isItemFullyTaken = pickedUpQty === item.quantity;
              const isItemPartiallyTaken = pickedUpQty > 0 && pickedUpQty < item.quantity;

              return (
                <div 
                  key={`${item.plant.id}-${index}`}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Item Info with Pickup Checkbox */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Interactive Checkbox for Plant Taken Status */}
                      <button
                        type="button"
                        onClick={() => handleToggleItemPickup(item.plant.id)}
                        className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isItemFullyTaken 
                            ? 'bg-[#012d1d] border-[#012d1d] text-[#a0f4c8]'
                            : isItemPartiallyTaken
                            ? 'bg-amber-500 border-amber-600 text-white'
                            : 'bg-white border-[#c1c8c2] hover:border-[#012d1d] text-transparent'
                        }`}
                        title={isItemFullyTaken ? 'Plant fully taken by customer (click to uncheck)' : 'Check to mark plant as taken by customer'}
                      >
                        {isItemFullyTaken ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isItemPartiallyTaken ? (
                          <Minus className="w-3.5 h-3.5" />
                        ) : (
                          <Square className="w-4 h-4 text-[#c1c8c2]" />
                        )}
                      </button>

                      <img
                        src={item.plant.image || DEFAULT_PLANT_IMAGE}
                        alt={item.plant.name}
                        className="w-14 h-14 rounded-xl object-cover border border-[#c1c8c2]/50 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-[#012d1d] truncate">
                            {item.plant.name}
                          </span>
                          {item.plant.size && (
                            <span className="text-[10px] font-bold bg-[#e2e3df] text-[#414844] px-1.5 py-0.5 rounded">
                              {item.plant.size}
                            </span>
                          )}
                          {item.plant.itemNo && (
                            <span className="text-[10px] font-semibold text-[#717973]">
                              #{item.plant.itemNo}
                            </span>
                          )}
                        </div>
                        {item.plant.botanicalName && (
                          <span className="text-xs italic text-[#414844] block truncate">
                            {item.plant.botanicalName}
                          </span>
                        )}
                        
                        {/* Pickup State Badge */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {isItemFullyTaken ? (
                            <span className="text-[10px] font-extrabold bg-[#e7f8ef] text-[#0e6c4a] px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Taken Today ({pickedUpQty}/{item.quantity})</span>
                            </span>
                          ) : isItemPartiallyTaken ? (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              <span>{pickedUpQty} Taken • {remainingQty} to Pick Up</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>0 Taken • All {item.quantity} to Pick Up</span>
                            </span>
                          )}
                          <span className="text-xs font-semibold text-[#717973]">
                            ${item.plant.price.toFixed(2)} each
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity and Price Adjuster */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-9 sm:pl-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-[#717973] uppercase tracking-wider">Order Qty</span>
                        <div className="flex items-center border border-[#c1c8c2] rounded-xl bg-[#f9faf6] p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.plant.id, -1)}
                            className="w-7 h-7 flex items-center justify-center text-[#414844] hover:text-[#012d1d] hover:bg-[#e2e3df] rounded-lg transition-colors cursor-pointer"
                            title="Decrease Quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleSetQuantity(item.plant.id, parseInt(e.target.value) || 1)}
                            className="w-10 text-center font-extrabold text-xs sm:text-sm text-[#012d1d] bg-transparent focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.plant.id, 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#414844] hover:text-[#012d1d] hover:bg-[#e2e3df] rounded-lg transition-colors cursor-pointer"
                            title="Increase Quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="w-16 text-right">
                        <span className="text-[10px] font-bold text-[#717973] uppercase tracking-wider block">Line Total</span>
                        <span className="font-extrabold text-sm sm:text-base text-[#012d1d] block">
                          ${lineTotal.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.plant.id, item.plant.name)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fine-grained partial quantity selector if item qty > 1 */}
                  {item.quantity > 1 && (
                    <div className="bg-[#f9faf6] p-2.5 px-3 rounded-xl border border-[#e2e3df] ml-9 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#414844]">Customer Took:</span>
                        <div className="flex items-center gap-1 bg-white border border-[#c1c8c2] rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleSetItemPickedUpQty(item.plant.id, pickedUpQty - 1)}
                            disabled={pickedUpQty <= 0}
                            className="w-6 h-6 flex items-center justify-center text-[#414844] hover:bg-[#f3f4f0] rounded disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-extrabold text-xs px-2 text-[#012d1d]">
                            {pickedUpQty} of {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetItemPickedUpQty(item.plant.id, pickedUpQty + 1)}
                            disabled={pickedUpQty >= item.quantity}
                            className="w-6 h-6 flex items-center justify-center text-[#414844] hover:bg-[#f3f4f0] rounded disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetItemPickedUpQty(item.plant.id, item.quantity)}
                          className="px-2 py-1 bg-white hover:bg-[#e7f8ef] text-[#0e6c4a] border border-[#c1c8c2] rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          All Taken
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetItemPickedUpQty(item.plant.id, 0)}
                          className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-[#c1c8c2] rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          None Taken
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Order Summary Calculations */}
        <div className="pt-4 border-t border-[#f3f4f0] flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between text-[#414844]">
            <span>Items Subtotal ({calculatedItemsCount} total qty):</span>
            <span className="font-bold text-[#1a1c1a]">${calculatedTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#414844]">
            <span>Estimated Sales Tax:</span>
            <span className="font-bold text-[#1a1c1a]">$0.00 (Exempt/Wholesale/Calculated at Register)</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-[#012d1d] pt-2 border-t border-[#e2e3df]">
            <span>Final Order Total:</span>
            <span>${calculatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Order Notes / Instructions Box */}
      <div className="bg-white p-5 rounded-2xl border border-[#c1c8c2] shadow-xs flex flex-col gap-2">
        <label className="block text-xs font-extrabold text-[#012d1d] uppercase tracking-wider">
          Special Instructions / Customer Notes
        </label>
        <textarea
          rows={2}
          value={orderNotes}
          onChange={(e) => {
            setOrderNotes(e.target.value);
            setHasUnsavedChanges(true);
          }}
          placeholder="e.g. Customer will pick up on Friday afternoon with a 16ft trailer. Load with forklift."
          className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl p-3 text-xs font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white transition-all shadow-2xs"
        />
      </div>

      {/* Notification and Communication Actions */}
      <div className="bg-white p-5 rounded-2xl border border-[#c1c8c2] shadow-xs flex flex-col gap-3">
        <h3 className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider">
          Dispatch & Customer Communication
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => showToast(`Receipt emailed to ${customerName}`)}
            className="w-full bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white font-bold py-3 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Email Receipt</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('Order details dispatched to main office desk')}
            className="w-full bg-[#461702] hover:bg-[#622c13] text-white font-bold py-3 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Building className="w-4 h-4" />
            <span>Email Office</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('SMS dispatch message sent to staging crew')}
            className="w-full bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] border border-[#c1c8c2] font-bold py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Text Crew</span>
          </button>
        </div>
      </div>

      {/* Danger Zone / Cancel Order */}
      <div className="pt-2 flex justify-between items-center text-xs">
        <button
          type="button"
          onClick={handleDeleteOrder}
          className="text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Cancel / Delete Order</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="text-[#414844] hover:text-[#012d1d] font-bold hover:underline cursor-pointer"
        >
          Return to Orders List
        </button>
      </div>

      {/* Floating Bottom Bar with Save & Actions */}
      <div className="fixed bottom-14 md:bottom-16 left-0 right-0 p-3 bg-[#f9faf6]/95 backdrop-blur-md border-t border-[#e2e3df] z-40 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-[#414844] truncate">
            <span className="font-extrabold text-[#012d1d]">{customerName || 'Order'}</span> • ${calculatedTotal.toFixed(2)} ({calculatedItemsCount} items)
            {totalRemainingQty > 0 && (
              <span className="ml-2 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                {totalRemainingQty} to pickup
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveChanges}
              className="bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white py-2.5 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer border border-[#a0f4c8]/30"
            >
              <Save className="w-4 h-4 text-[#a0f4c8]" />
              <span>Save & Update Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Plant Search Modal */}
      {isAddingPlantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#e2e3df] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#012d1d] text-[#a0f4c8] rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1a1c1a]">Add Plant to Order</h3>
                  <p className="text-xs text-[#717973]">Search nursery inventory to add items or substitutes.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingPlantModalOpen(false)}
                className="p-1.5 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#717973]" />
              <input
                type="text"
                value={plantSearchQuery}
                onChange={(e) => setPlantSearchQuery(e.target.value)}
                placeholder="Search by common name, botanical name, or SKU..."
                className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white"
                autoFocus
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedPlantCategory(cat)}
                  className={`px-3 py-1 rounded-full font-bold transition-colors shrink-0 cursor-pointer ${
                    selectedPlantCategory === cat
                      ? 'bg-[#012d1d] text-[#a0f4c8]'
                      : 'bg-[#f3f4f0] text-[#414844] hover:bg-[#e2e3df]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Plant Results List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f3f4f0] pr-1 max-h-[360px]">
              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center text-[#717973]">
                  <p className="text-sm font-semibold">No nursery plants match your search.</p>
                </div>
              ) : (
                filteredInventory.map(plant => (
                  <div 
                    key={plant.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#f9faf6] px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={plant.image || DEFAULT_PLANT_IMAGE}
                        alt={plant.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#c1c8c2]/50 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PLANT_IMAGE; }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-[#1a1c1a] block truncate">
                          {plant.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-[#717973] flex-wrap">
                          {plant.size && <span className="font-semibold">{plant.size}</span>}
                          <span>•</span>
                          <span>Avail: <strong className="text-[#012d1d]">{plant.stock}</strong></span>
                          <span>•</span>
                          <span className="font-bold text-[#012d1d]">${plant.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddPlantToOrder(plant)}
                      className="px-3.5 py-1.5 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#e2e3df] pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddingPlantModalOpen(false)}
                className="px-4 py-2 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Holding Location Modal */}
      {isChangingLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#e2e3df] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#012d1d] text-[#a0f4c8] rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1a1c1a]">Change Staging Location</h3>
                  <p className="text-xs text-[#717973]">Reassign order to a different holding area or bench.</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangingLocationModalOpen(false)}
                className="p-1.5 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preset Holding Areas */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider">
                Select Nursery Zone
              </label>
              {holdingAreas.map(area => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    const fullLoc = `${area.title} - ${area.subtitle}`;
                    setHoldingLocation(fullLoc);
                    setHasUnsavedChanges(true);
                    setIsChangingLocationModalOpen(false);
                    showToast(`Assigned to ${area.title}`);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    holdingLocation.includes(area.title)
                      ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-sm'
                      : 'bg-[#f9faf6] border-[#c1c8c2] hover:bg-white hover:border-[#012d1d] text-[#1a1c1a]'
                  }`}
                >
                  <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${holdingLocation.includes(area.title) ? 'text-[#a0f4c8]' : 'text-[#012d1d]'}`} />
                  <div>
                    <span className="font-bold text-sm block">{area.title}</span>
                    <span className={`text-xs block ${holdingLocation.includes(area.title) ? 'text-[#a0f4c8]' : 'text-[#717973]'}`}>
                      {area.subtitle}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Location Field */}
            <div className="pt-2 border-t border-[#e2e3df]">
              <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider block mb-1.5">
                Or Type Custom Bench / Row Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLocationText}
                  onChange={(e) => setCustomLocationText(e.target.value)}
                  placeholder="e.g. Row 14, Bench 3B"
                  className="flex-1 bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3 py-2 text-xs font-bold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customLocationText.trim()) {
                      setHoldingLocation(customLocationText.trim());
                      setHasUnsavedChanges(true);
                      setIsChangingLocationModalOpen(false);
                      showToast(`Assigned to ${customLocationText.trim()}`);
                    }
                  }}
                  className="px-3 py-2 bg-[#012d1d] text-[#a0f4c8] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsChangingLocationModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#414844] hover:bg-[#f3f4f0] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Staff Modal */}
      {isEmailStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#e2e3df] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#012d1d] text-[#a0f4c8] rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1a1c1a]">Email Hold Ticket to Staff</h3>
                  <p className="text-xs text-[#717973]">Notify yard and staging crew about remaining plants.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailStaffModalOpen(false)}
                className="p-1.5 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Input & Preset Staff Chips */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#012d1d] uppercase tracking-wider">
                Staff Recipient Email
              </label>
              <input
                type="email"
                value={staffEmailAddress}
                onChange={(e) => setStaffEmailAddress(e.target.value)}
                placeholder="yard@maplelanenursery.com"
                className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:bg-white"
              />
              
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] font-semibold text-[#717973]">Quick Select:</span>
                {[
                  'yard@maplelanenursery.com',
                  'crew@maplelanenursery.com',
                  'fulfillment@maplelanenursery.com'
                ].map((email) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => setStaffEmailAddress(email)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      staffEmailAddress === email
                        ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d]'
                        : 'bg-[#f3f4f0] text-[#414844] border-[#c1c8c2] hover:bg-white'
                    }`}
                  >
                    {email.split('@')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Preview Card */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#012d1d] uppercase tracking-wider">
                Hold Ticket Preview
              </span>
              <div className="p-3.5 bg-[#fcfdfa] border border-[#c1c8c2] rounded-xl font-mono text-xs text-[#1a1c1a] whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {getStaffEmailContent().body}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-[#e2e3df]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getStaffEmailContent().body);
                  showToast('Email content copied to clipboard!');
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Body</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const { subject, body } = getStaffEmailContent();
                    const mailtoUrl = `mailto:${encodeURIComponent(staffEmailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoUrl;
                    showToast(`Sending hold ticket to ${staffEmailAddress}...`);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Mail App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEmailStaffModalOpen(false)}
                  className="px-4 py-2 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Remaining Hold Slip Modal */}
      {isHoldSlipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#c1c8c2] flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#e2e3df] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1a1c1a]">Nursery Hold Slip</h3>
                  <p className="text-xs text-[#717973]">Remaining plants ticket for staging and yard crews.</p>
                </div>
              </div>
              <button
                onClick={() => setIsHoldSlipModalOpen(false)}
                className="p-1.5 text-[#717973] hover:text-[#1a1c1a] hover:bg-[#f3f4f0] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hold Slip Printable Content */}
            <div className="p-4 bg-[#fcfdfa] border-2 border-dashed border-[#c1c8c2] rounded-xl flex flex-col gap-3 font-mono text-xs text-[#1a1c1a]">
              <div className="text-center border-b border-[#c1c8c2] pb-2">
                <h4 className="font-bold text-sm tracking-wider text-[#012d1d]">MAPLE LANE NURSERY</h4>
                <p className="text-[11px] text-[#717973]">REMAINING PICKUP HOLD TICKET</p>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div><strong>Order:</strong> {currentOrder.id}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Customer:</strong> {customerName}</div>
                <div><strong>Holding Bay:</strong> {holdingLocation}</div>
                <div className="col-span-2">
                  <strong>Expected Pickup:</strong> {remainingPickupDate || 'To Be Determined'}
                </div>
                {partialPickupNotes && (
                  <div className="col-span-2 text-amber-900">
                    <strong>Instructions:</strong> {partialPickupNotes}
                  </div>
                )}
              </div>

              <div className="border-t border-b border-[#c1c8c2] py-2 flex flex-col gap-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-[#012d1d]">
                  Plants Awaiting Pickup ({totalRemainingQty} plants):
                </span>
                {remainingItemsList.map((item, i) => (
                  <div key={`slip-${i}`} className="flex justify-between items-center">
                    <span>[ ] {getItemRemainingQty(item)}x {item.plant.name} {item.plant.size ? `(${item.plant.size})` : ''}</span>
                    <span className="text-[#717973]">#{item.plant.itemNo || item.plant.barcode}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-[#717973] pt-1">
                * Staged plants remain allocated to customer. Keep watered and shaded.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyHoldingSlip}
                className="px-3.5 py-2 rounded-xl bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHoldSlipModalOpen(false)}
                  className="px-4 py-2 bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#414844] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

