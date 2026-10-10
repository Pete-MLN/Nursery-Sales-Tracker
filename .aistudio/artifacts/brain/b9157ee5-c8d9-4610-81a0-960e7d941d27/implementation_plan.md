# Rename Search Action Button to 'Add product #'

This update renames the manual input submit button beside the plant search bar from **"Add / Scan"** to **"Add product #"** to eliminate confusion with the live camera viewfinder directly below it, and clearly signal that this action is specifically for manual product number / SKU entry when barcodes cannot be scanned by the camera.

## User Review & Critical Decisions

> [!IMPORTANT]
> The workflow and terminology have been confirmed:
> - **Confirmed Decision 1**: The button in the 'Plant & Barcode Search' card will be renamed to **"Add product #"**.
> - **Confirmed Decision 2**: Nursery staff rely strictly on the **Camera Viewfinder** for live optical scanning, and use the search text box exclusively for **Manual Product Number entry** when tags are missing, wet, faded, or unable to be scanned.
> - **Zero Feature Loss Guarantee**: The existing submission mechanics (pressing `Enter` on the keyboard or tapping the button) will remain 100% intact, maintaining full compatibility with direct product number entry and rapid cart additions.

---

## 1. Overview & Core Concept

- **What It Does**: Renames the primary action button next to the plant search input in `ScanScreen.tsx` from "Add / Scan" to "Add product #".
- **Target Audience / Persona**: Nursery floor staff and cashiers working in outdoor yard conditions who need unambiguous, immediate clarity on how to add items when barcodes are unreadable.
- **Key Value**: Resolves visual ambiguity where users expected "Add / Scan" to toggle or trigger the camera, rather than submitting the typed product number.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Camera Scanning (Primary)**:
   - Worker points device at plant barcode.
   - Camera automatically decodes code, beeps/vibrates, logs GPS, and opens verification pop-up or adds to cart.
2. **Manual Product Number Entry (Fallback for Damaged Tags)**:
   - Worker encounters a plant with a torn, smudged, or missing barcode.
   - Worker types the plant SKU / Item number (e.g. `1042`, `JUNIPER`) into the search input.
   - Worker taps **"Add product #"** (or presses `Enter` on keyboard).
   - System looks up item number and adds the plant with high-precision GPS logging.

### Visual Styling & Button Layout
- **Container**: `ScanScreen.tsx` — `Plant & Barcode Search` section.
- **Button Styling**:
  - Background: Deep Forest Green (`bg-[#012d1d] hover:bg-[#0e6c4a]`)
  - Accent / Text: Mint Flora (`text-[#a0f4c8]`, font-extrabold)
  - Geometry: `rounded-xl`, `px-4 py-3`, with `Plus` icon preserved for clear additive affordance
  - Text: `<span>Add product #</span>` (`whitespace-nowrap` to prevent awkward mid-word breaks on compact screens)

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Button Labeling ("Add product #" vs "Add / Scan")**:
  - *Chosen Approach*: Rename to `"Add product #"`.
  - *Why*: Perfectly mirrors the real nursery operation where staff only use manual entry when barcodes fail to scan optically.
  - *Alternatives Considered*: Removing the button entirely was rejected because mobile touch keyboards often dismiss without triggering form submit, making a dedicated physical touch target essential for gloved yard workers.
- **Decision 2: Retention of Full Autocomplete & Catalog Search**:
  - *Chosen Approach*: Retain the autocomplete suggestion dropdown and the "Browse Catalog" button alongside the new button.
  - *Why*: Ensures staff can still search by botanical/common name or open the catalog modal when the product number itself is also unknown.

---

## 4. Technical Architecture & Data Strategy

### Component Interaction Flow

```
┌───────────────────────────────────────────────────────────────┐
│                    Plant & Barcode Search                     │
│                                                               │
│  ┌────────────────────────────────────┐ ┌───────────────────┐ │
│  │ [🌿] Type plant name, SKU, or #    │ │ [+] Add product # │ │
│  └────────────────────────────────────┘ └───────────────────┘ │
│                     │                             │           │
│                     ▼                             ▼           │
│           Live Autocomplete               onSubmit Handler    │
│           (Suggestions Dropdown)                  │           │
│                                                   ▼           │
│                                       handleScannedBarcode()  │
│                                                   │           │
│                                                   ▼           │
│                                         Cart / Verification   │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│            Continuous Optical Camera Scanner                  │
│       (Auto-detects physical barcodes in real time)           │
└───────────────────────────────────────────────────────────────┘
```

- **File**: `src/components/ScanScreen.tsx`
- **Component**: `ScanScreen` search form submit button (`lines ~2056–2063`)
- **State & Handlers**: No state or logic breaking changes; pure UI clarity improvement with full backward compatibility.
