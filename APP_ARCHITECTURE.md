# Maple Lane Nursery App Architecture & Design System

> **CRITICAL DEVELOPER DIRECTIVE**: This document serves as the master source of truth for the Maple Lane Nursery Management Application. Whenever modifying code or introducing new features, you **MUST NOT remove, rename, or alter existing features, GPS logging buttons, price-tier selectors, holding location flows, or cloud persistence rules** documented herein.

---

## 1. Visual Design System & Color Theme Specification

To ensure 100% aesthetic consistency across every view, modal, card, and button, use only the following approved color tokens and component patterns:

### Primary Brand Palette
| Token Role | Hex Code | Tailwind Utility Classes | Usage & Components |
|---|---|---|---|
| **Deep Forest Green (Primary Brand)** | `#012d1d` | `bg-[#012d1d]`, `text-[#012d1d]`, `border-[#012d1d]` | Primary CTAs, app header background, major section titles, dark badges, primary action icons |
| **Mint Flora (Primary Brand Accent)** | `#a0f4c8` | `bg-[#a0f4c8]`, `text-[#a0f4c8]`, `border-[#a0f4c8]` | Primary button text on dark backgrounds, active tab highlights, scan laser animation, active status badges |
| **Forest Mid-Green (Secondary Accent)** | `#0e6c4a` | `bg-[#0e6c4a]`, `text-[#0e6c4a]`, `border-[#0e6c4a]` | Secondary buttons, icons, subsection labels, map pins, active borders |
| **Dark Sage / Pine Accent** | `#004d40` / `#002113` | `bg-[#004d40]`, `text-[#002113]`, `bg-[#002113]` | Dark badge containers, high-contrast text on mint, map headers |
| **Warm Neutral Light Canvas** | `#f3f4f0` / `#f9faf6` | `bg-[#f3f4f0]`, `bg-[#f9faf6]` | App background canvas, secondary container fills, unselected tabs |
| **Crisp White (Container Surface)** | `#ffffff` | `bg-white` | Cards, modals, form inputs, dropdown popovers |
| **Neutral Slate Border** | `#c1c8c2` | `border-[#c1c8c2]` | All standard card borders, dividers, subtle outlines |
| **Charcoal / Deep Body Text** | `#1a1c1a` / `#414844` | `text-[#1a1c1a]`, `text-[#414844]` | Primary body copy, table text, input labels |
| **Muted Slate Subtext** | `#717973` | `text-[#717973]` | Secondary subtext, metadata labels, SKU badges, timestamps |
| **Alert / Destructive Red** | `#ba1a1a` / `#ffdad6` | `bg-[#ba1a1a]`, `text-[#ba1a1a]`, `bg-[#ffdad6]` | Delete buttons, discard confirmations, out-of-stock badges |
| **Warning / Status Amber** | `amber-500` / `amber-100` | `bg-amber-100`, `text-amber-900`, `border-amber-300` | Unsaved draft badges, partial pickup status pills, pending hold notices |

### Geometry & Styling Rules
- **Corner Radii**: Standard cards and modals must use `rounded-2xl` (16px) or `rounded-3xl` (24px for major banners). Inner elements inside containers use `rounded-xl` (12px) or `rounded-lg` (8px) following the mathematical rule: $\text{Inner Radius} = \text{Outer Radius} - \text{Padding}$.
- **Buttons**:
  - *Primary*: `bg-[#012d1d] hover:bg-[#0e6c4a] text-[#a0f4c8] hover:text-white font-extrabold rounded-xl py-2.5 px-4 shadow-sm transition-all active:scale-95`
  - *Accent Mint*: `bg-[#a0f4c8] hover:bg-[#8ee4b8] text-[#012d1d] font-extrabold rounded-xl py-2.5 px-4 shadow-sm transition-all active:scale-95`
  - *Secondary / Light*: `bg-[#f3f4f0] hover:bg-[#e2e3df] text-[#012d1d] border border-[#c1c8c2] font-bold rounded-xl py-2 px-3`
  - *Destructive*: `bg-[#ffdad6] hover:bg-[#ba1a1a] text-[#ba1a1a] hover:text-white font-bold rounded-xl py-2 px-3`
- **Typography**: Display titles use heavy sans tracking (`font-extrabold tracking-tight`). Numerical coordinates and SKUs use monospace (`font-mono`).

---

## 2. Navigation Architecture & Screen Workflows

```
┌────────────────────────────────────────────────────────────────────────┐
│                              APP HEADER                                │
│       [Draft Recovery Banner] [Auto-Save Status] [Screen Tabs]         │
└────────────────────────────────────────────────────────────────────────┘
                                     │
      ┌──────────────┬───────────────┼──────────────┬──────────────┐
      ▼              ▼               ▼              ▼              ▼
  [Home]          [Scan]          [Orders]     [Inventory]     [Bays]
(Dashboard)  (Order Creation)   (Management)    (Catalog)    (Holding)
                     │               │
                     ▼               │
               [Finalization] ◄──────┘
            (Review / GPS / Bay)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    [Print Slip]           [Email / SMS]
```

### Detailed Screen Specifications

#### 1. Home Screen (`home`) - `HomeScreen.tsx`
- **Purpose**: High-level overview of daily nursery activities, fast navigation, quick metrics.
- **Key Elements**:
  - Metric counters: Active Orders, Ready for Pickup, Staged in Bays, Total Plants in Catalog.
  - "Start New Order" action card (navigates to `scan`).
  - "Recent Active Orders" list with one-tap access to view or edit.
  - Quick shortcuts to Data Management, Holding Locations, and Instructions.

#### 2. Scan & Order Creation (`scan`) - `ScanScreen.tsx`
- **Purpose**: Primary point-of-sale and yard order building interface.
- **Workflow & Features**:
  - **Customer Selection**: Search existing customer accounts or tap `+ Add Customer` to register new wholesale/retail clients on the fly.
  - **Barcode Scanning**: Live camera scanner with 2x zoom toggle, camera flashlight/torch, flip camera, and audio/vibration feedback.
  - **Manual Plant Search**: Auto-complete search bar by plant botanical name, common name, SKU/Item No, or category.
  - **Bulk Preset Chips**: Instant addition of bulk materials (Mulch, Top Soil, Stone) in 0.5 and 1.0 increments.
  - **4-Tier Price Level Engine**: Real-time selection among Retail (Tier 1), Landscape Contractor (Tier 2), Wholesale Nursery (Tier 3), and Elite Garden Center (Tier 4).
  - **Fulfillment Tagging**: Per-item toggle between "Take Now" and "Pick-up/Delivery".
  - **GPS Yard Location Logging (MANDATORY FEATURE)**:
    - Dedicated **"Log GPS" / "Update GPS"** button on every cart item card.
    - Sub-meter device geolocation capture with fallback to nursery coordinates.
    - **"View on Map" / "Plant GPS Map"** button opening `PlantMapModal`.
  - **Order Verification Modal (`PlantVerificationModal.tsx`)**:
    - Triggered on barcode scan or plant add.
    - Includes quantity stepper, 4-tier price selector, fulfillment mode, and **"📍 Tag Yard GPS"** action button.
  - **Auto-Save & Local Draft Engine**: Real-time persistence to `localStorage` and draft recovery banner to prevent data loss on browser refresh.
  - **Proceed to Review**: Validates items and navigates to `finalization`.

#### 3. Order Finalization Screen (`finalization`) - `OrderFinalizationScreen.tsx`
- **Purpose**: Review complete order details, set fulfillment schedule, assign staging bays, and save/print.
- **Workflow & Features**:
  - **Customer Profile**: Editable customer name, phone, and email.
  - **Holding Bay Assignment**: Dropdown selector for Holding Bays 1 through 20, or "Take Now".
  - **Fulfillment Scheduling**: Date and time selector for customer pickup or delivery.
  - **Delivery Details**: Toggle delivery mode, destination address, and driver instructions.
  - **Plant Item Cards with GPS**:
    - Each item card displays quantity, unit price, line total, and **GPS Coordinate Badge** (`43.14820° N, 79.46230° W`).
    - **Persistent "Log GPS" / "Update GPS" Button** on every plant card with active loading spinner.
    - Changes immediately save to local order state and sync to master plant inventory in Firestore.
  - **Financial Summary**: Subtotal, configurable sales tax, discount input, and balance due.
  - **Order Actions**:
    - "Save & Finalize Order" (writes to Firestore `orders` collection).
    - "Print Loading Sheet / Customer Receipt".
    - "Email Order Details" and "SMS Crew Dispatch".

#### 4. Order Management Screen (`orders`) - `OrdersScreen.tsx`
- **Purpose**: Manage active, ready, pending, and completed customer orders.
- **Workflow & Features**:
  - **Filter Tabs**: Active, Ready, Pending, Partial Pickup, Completed, Cancelled, All.
  - **Search Bar**: Query by customer name, order ID, or plant name.
  - **Order Actions**:
    - **"GPS Map" Button**: Opens `PlantMapModal` displaying pins for all plants in that order. Allows re-logging GPS coordinates on saved orders.
    - **"Edit Order"**: Opens order back in `finalization` or `scan` mode for modifications.
    - **"Partial Pickup"**: Opens modal to log partial quantities taken today, generate hold tickets, and email/text updates.
    - **"Mark as Ready / Completed"**: Moves order through lifecycle stages.
    - **"Delete Order"**: Safe deletion with 5-second undo toast notification.

#### 5. Master Inventory Catalog (`inventory`) - `InventoryScreen.tsx`
- **Purpose**: Comprehensive view and management of all plant varieties, sizes, stock levels, and prices.
- **Workflow & Features**:
  - Live filtering by category (Trees, Shrubs, Perennials, Bulk, Grasses, Evergreens).
  - Search by SKU, botanical name, or common name.
  - 4-Tier Wholesale/Retail Pricing display and editing.
  - Stock level indicators (In Stock, Low Stock, Oversold Negative Stock).
  - Barcode label generator and printable tags.

#### 6. Holding Locations (`holding_location`) - `HoldingLocationScreen.tsx`
- **Purpose**: Visual management of 20 physical nursery staging bays.
- **Workflow & Features**:
  - 20-bay grid displaying current order occupancy, customer name, and item counts.
  - One-tap reassignment of orders to different bays.
  - Mark bay as "Cleared / Available" upon customer pickup.

#### 7. Data Management & Sync (`data_management`) - `DataManagementScreen.tsx`
- **Purpose**: Import and export POS inventory and customer records.
- **GPS Safe Merge Engine (CRITICAL)**:
  - Supports CSV and Excel (`.xlsx`, `.xls`) file parsing via `posCsvParser.ts`.
  - **Non-Destructive Merge Strategy**: When uploading a new inventory file, existing plant GPS coordinates (`gpsLocation`) and holding locations are automatically matched by `itemNo`, `barcode`, `id`, or `name` and preserved. Re-uploading POS inventory will NEVER wipe out mapped nursery GPS locations.

#### 8. Interactive Satellite Map Modal - `PlantMapModal.tsx`
- **Purpose**: High-resolution Google Satellite map view of all plant locations in an order.
- **Workflow & Features**:
  - Zero-config satellite hybrid rendering centered on nursery yard coordinates (`43.1482, -79.4623`).
  - Color-coded pins for each item with plant name, SKU, and quantity.
  - One-tap "Open in Google Maps" for external turn-by-turn walking or driving navigation.
  - Direct "Log / Re-log GPS" button inside modal to update coordinates in real time.

---

## 3. Master Feature & Prerequisites Registry

| Feature Name | Primary Component(s) | Required Data / State | Persistence Target | Regression Protection Rules |
|---|---|---|---|---|
| **GPS Coordinate Tagging** | `PlantVerificationModal`, `ScanScreen`, `OrderFinalizationScreen`, `OrdersScreen`, `PlantMapModal` | `navigator.geolocation` or fallback | Local state + Firestore `plants` + Firestore `orders` | **NEVER remove the GPS button** from plant verification modal, cart cards, order finalization cards, or order management cards. |
| **GPS Merge on Inventory Import** | `posCsvParser.ts`, `App.tsx` (`handleImportInventoryPlants`) | Existing `inventory` state | Firestore `plants` + `localStorage` | Merge by `itemNo` -> `barcode` -> `id` -> `name`. Never overwrite existing GPS with null/undefined. |
| **4-Tier Pricing Engine** | `PricingDropdown.tsx`, `ScanScreen.tsx`, `PlantVerificationModal.tsx` | `price`, `priceTier2`, `priceTier3`, `priceTier4` | Order item record | Always calculate line totals based on `selectedPrice` and `quantity`. |
| **Fulfillment Mode Selection** | `PlantVerificationModal.tsx`, `ScanScreen.tsx` | `'Take Now' \| 'Pick-up/Delivery'` | `itemFulfillmentMap` + Order payload | Retain choice per item during cart edits. |
| **Draft Order Auto-Save** | `ScanScreen.tsx`, `DraftRecoveryBanner.tsx`, `AutoSaveBadge.tsx` | `cartItems`, `selectedCustomer` | `localStorage` (`nursery_active_order_draft`) | Display banner if recovered draft exists on screen load. |
| **Holding Bay Assignment** | `OrderFinalizationScreen.tsx`, `HoldingLocationScreen.tsx` | Bay number (1–20) or 'Take Now' | Firestore `orders` | Ensure bay occupancy syncs in real time across views. |
| **Partial Pickup Workflow** | `OrdersScreen.tsx` | Selected quantities picked up | Firestore `orders` + email/SMS trigger | Keep original order reference; track partial pickup date & remaining items. |
| **Google Satellite Yard Map** | `PlantMapModal.tsx` | `gpsLocation` on order items | UI Overlay + Google Maps URL | Must open cleanly without requiring a paid Google Maps API key. |

---

## 4. Developer Rules for Future Changes

1. **Rule of Non-Regression**: Before editing any screen, inspect `APP_ARCHITECTURE.md`. Ensure that all existing buttons, modal triggers, and data bindings remain intact.
2. **Color Palette Adherence**: Use `#012d1d` (primary), `#a0f4c8` (accent), `#0e6c4a` (mid-green), and `#f3f4f0` (canvas). Do not introduce arbitrary blues, purples, or unapproved gradients.
3. **Data Integrity**: Never wipe `gpsLocation` or `holdingLocation` during spreadsheet imports or order updates.
4. **Cloud + Offline Sync**: Always write critical order and plant updates to Firestore via `saveOrderToFirestore` and `savePlantToFirestore`, with fallback to local state for offline reliability.
