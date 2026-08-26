# Maple Lane Nursery System & Agent Directives

> This file is automatically loaded by Google AI Studio into agent instructions for every turn.

## 1. Regression Prevention & Feature Retention (CRITICAL)
- **Zero Feature Loss Policy**: Whenever adding features, redesigning components, or refactoring code, you **MUST NOT** remove or break any existing features or UI controls.
- **GPS Location Buttons**:
  - The **"📍 Tag Yard GPS" / "Log GPS" / "Update GPS"** buttons MUST always remain accessible on:
    1. The Plant Verification Pop-up (`PlantVerificationModal.tsx`) when adding or scanning a plant.
    2. Each Cart Item Card in `ScanScreen.tsx`.
    3. Each Plant Card in the Order Finalization / Review Screen (`OrderFinalizationScreen.tsx`).
    4. The Order Management Card / GPS Map Modal in `OrdersScreen.tsx` for pulled-up saved orders.
  - GPS coordinates must be saved to both the active order item AND the master plant record in Firestore.
  - When inventory spreadsheets (CSV/Excel) are imported in Data Management (`DataManagementScreen.tsx` / `posCsvParser.ts`), the system must merge by `itemNo`/`barcode`/`id`/`name` and **ALWAYS preserve previously recorded GPS locations and holding bays**.

## 2. Design System & Theme Consistency
- All visual components must strictly adhere to the approved nursery palette defined in `APP_ARCHITECTURE.md`:
  - **Deep Forest Green**: `#012d1d` (Header, Primary Buttons, Major Titles)
  - **Mint Flora Accent**: `#a0f4c8` (Primary CTA text, active highlights, laser scan line)
  - **Mid-Green**: `#0e6c4a` (Secondary actions, badges, icons)
  - **Warm Off-White Canvas**: `#f3f4f0` / `#f9faf6`
  - **Neutral Slate Border**: `#c1c8c2`
  - **Card Radius**: `rounded-2xl` (16px) or `rounded-3xl` (24px)
- Never introduce random unapproved colors, neon blue/purple gradients, or dark-mode clichés.

## 3. Workflow & Dependency Reference
- Refer to `APP_ARCHITECTURE.md` in the project root for full specifications on screen flows, dependencies, data structures, and feature prerequisites.
