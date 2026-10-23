# Implementation Plan: Counterpoint Cultural Plant Matcher

## User Goal & Provided Cultural Dataset
The user has provided the official Counterpoint cultural information dataset:
`/public/assets/aistudio/Nursery_Plants_-_Cultural_information_-_Main_2932d36a.csv` (1,984 lines covering hundreds of nursery grasses, perennials, deciduous shrubs, flowering trees, shade trees, broadleaf evergreens, conifer evergreens, vines, and groundcovers).

This dataset contains rich, production-grade horticultural data for each variety:
- **Plant / Grass Name**: Exact nursery catalog species and cultivar names (*Calamagrostis Karl Foerster*, *Hydrangea a. Annabelle*, *Cornus kousa 'Satomi'*, *Buxus x Green Velvet*, *Thuja o. Smaragd*, *Acer palmatum 'Bloodgood'*, *Picea p. Baby Blue*, *Syringa Bloomerang®*, *Echinacea p. Magnus*, etc.).
- **Sun Requirements**: Full Sun, Part Sun to Sun, Part Shade to Full Shade, etc.
- **Size (Height x Spread)**: Specific mature dimensions (e.g. `4-6' x 2-3'`, `1-2' x 1-2'`, `15-20 ft x 15-20 ft`, `0.5-1' x 6-8'`).
- **Growth Habit**: Upright clumping, mounded, vase-shaped, weeping, columnar, creeping mat, spreading.
- **Foliage / Grass Color**: Deep green, blue-green, golden-yellow, dark purple/black, variegated.
- **Seed Head / Flower Color**: Specific bloom colors (White, Pink, Red, Purple, Yellow, Orange, Lavender, etc.).
- **Spring to Fall Color Change**: Evergreen status, winter needle tints, and brilliant autumn foliage shifts (Red, Orange, Yellow, Purple/Burgundy, Bronze).
- **Soil Conditions**: Dry/well-drained, moist/well-drained, wet/poor drainage, clay tolerant, acidic.
- **Positives**: Drought tolerant, deer resistant, native, salt tolerant, erosion control, fragrant.
- **Negatives**: Deer browse, flops in rich soil, intolerant of wet winter soil, invasive runners.
- **Category / Plant Type**: Shrub, Shade Tree, Ornamental Tree, Conifer, Perennial, Grass, Groundcover, Vine.
- **Fruiting & Dog Safety**: Edible vs. toxic berries/seeds, pet safety notes.

---

## 1. Cultural Data Parser & Knowledge Service

### 1.1 `src/types.ts` Definition
Define the full cultural model:
```typescript
export interface PlantCulturalProfile {
  name: string;
  sunRequirements: string;
  sunCategories: ('Full Sun' | 'Partial Sun' | 'Full Shade')[];
  heightRange: string;
  minHeightFeet: number;
  maxHeightFeet: number;
  heightCategory: 'under_3ft' | '3_to_6ft' | '6_to_12ft' | '12_to_25ft' | 'over_25ft';
  spread: string;
  growthHabit: string;
  foliageColor: string;
  flowerColor: string;
  flowerColorList: string[]; // ['White', 'Pink', 'Red', 'Purple', 'Yellow', 'Blue', 'Orange', 'None']
  fallColorChange: string;
  fallColors: string[]; // ['Red', 'Orange', 'Yellow', 'Purple', 'Bronze', 'None']
  foliageType: 'evergreen' | 'deciduous' | 'semi-evergreen';
  soilConditions: string;
  soilMoistureCategory: 'Dry / Drought Tolerant' | 'Moist, Well-Drained' | 'Wet / Poor Drainage' | 'Adaptable';
  categoryType: 'Shrub' | 'Shade Tree' | 'Ornamental Tree' | 'Conifer' | 'Perennial' | 'Grass' | 'Groundcover' | 'Vine';
  deerResistance: 'High' | 'Moderate' | 'Low';
  positives: string;
  negatives: string;
  fruitingInfo?: string;
  petSafety?: string;
}
```

### 1.2 Counterpoint Cultural CSV Ingestion (`src/services/culturalDataService.ts`)
- Pre-parse and index all 1,900+ lines from `/public/assets/aistudio/Nursery_Plants_-_Cultural_information_-_Main_2932d36a.csv` into a lightning-fast in-memory lookup table.
- Build fuzzy name normalization:
  - Strips trademark symbols (`®`, `™`, `PW`, `FE`, `BE`), single quotes, and punctuation.
  - Normalizes abbreviations: `jap.` &rarr; `japonica`, `a.` / `arb.` &rarr; `arborescens`, `p.` / `pan.` &rarr; `paniculata`, `m.` / `mac.` &rarr; `macrophylla`, `s.` &rarr; `sinensis` / `scoparium` / `spicata`, `o.` &rarr; `occidentalis`, `c.` &rarr; `chinensis`.
  - Matches against both `plant.botanicalName` (Counterpoint `DESCR`) and `plant.name` / `plant.commonName` (Counterpoint `ADDL_DESCR_1`).
- Fallback inference engine: For any newly added plant not in the CSV, intelligently infers attributes based on genus, species, and nursery category.

---

## 2. Match Scoring & Graded Ranking Engine

When assisting a customer on the Home page popup:
1. Staff select one or more requested customer traits:
   - **Mature Height**:
     - Under 3 ft (Border / Low Groundcover)
     - 3 to 6 ft (Foundation / Low Hedge)
     - 6 to 12 ft (Medium Shrub / Privacy Screen)
     - 12 to 25 ft (Small Ornamental / Flowering Tree)
     - Over 25 ft (Full Shade Tree / Large Conifer)
   - **Foliage Type**: Evergreen vs. Deciduous
   - **Flower Color**: White, Pink, Red, Purple, Yellow, Blue, Orange, None
   - **Fall Color**: Red, Orange, Yellow, Purple/Bronze, None (Evergreen)
   - **Plant Type**: Shrub, Shade Tree, Ornamental Tree, Conifer/Evergreen, Perennial, Grass, Groundcover, Vine
   - **Sun Exposure**: Full Sun, Partial Sun/Shade, Full Shade
   - **Soil Moisture**: Drought Tolerant / Dry, Moist Well-Drained, Wet Soils
   - **Deer Resistance**: High (Deer Resistant), Moderate, Low
2. **Match Score Calculation ($0\%$ to $100\%$)**:
   - Compares plant cultural attributes against selected criteria.
   - Calculates score = `(Matching Criteria / Total Selected Criteria) * 100`.
3. **Graded Results Presentation**:
   - **Best Matches (100% Score)**: Highlighted first with emerald banner.
   - **Close Matches (50% - 99% Score)**: Displayed below, highlighting which criteria matched in green and which differed in muted text, enabling staff to explain close alternatives to customers.
4. **Availability Filter Toggle**:
   - **"In Stock Only (Qty $\ge$ 1)"** (default ON so staff recommend yard inventory, toggleable to view full catalog for special orders).

---

## 3. UI Component Architecture & Design System

### 3.1 Home Screen Launcher (`src/components/HomeScreen.tsx`)
Add a prominent, high-visibility consultation card in `HomeScreen`:
- Styled in Maple Lane Forest Green (`#012d1d`), Mint Flora (`#a0f4c8`), and Mid-Green (`#0e6c4a`).
- Title: **Customer Plant Matcher**
- Subtitle: *"Filter plants by height, evergreen/deciduous, flower & fall color, sun, soil & deer resistance."*
- Touch target $\ge 48\text{px}$, optimized for one-thumb activation in the yard.

### 3.2 Modal Experience (`src/components/PlantAttributeMatcherModal.tsx`)
Full-screen / large responsive modal (`rounded-3xl` with backdrop blur, max-w-4xl):
- **Filter Selector Bar**:
  - Segmented pill-free buttons for Height, Foliage, Flower Color, Fall Color, Plant Type, Sun, Soil, and Deer Resistance.
  - Active counts on each button showing how many plants match.
  - One-tap "Reset All" button.
- **Live Counter**: *"Found 8 Best Matches · 15 Close Matches"*.
- **Plant Information Cards** (Identical to `InventoryScreen.tsx`):
  - High-resolution photo with fallback.
  - Item # / SKU badge, Botanical Name, Common Name, Container Size badge.
  - Stock badge (`IN STOCK`, `LOW STOCK`, `CRITICAL`).
  - Retail Price & Active Sale discount badge (if on sale).
  - Holding Location badge (e.g. `Loc: F4B`).
  - **Counterpoint Cultural Tags Strip**: Visual tags showing mature height (e.g. `3-5' x 2-3'`), foliage type, flower color, fall color, sun exposure, and deer resistance.
  - **Positives & Negatives Summary**: Collapsible quick notes (e.g., *"Native, great fall color, erosion control"* / *"Can flop in rich soil"*).
  - **Yard GPS Button**: Opens satellite aerial map modal (`PlantMapModal.tsx`) showing exact yard location and history.
  - **"Add to Order" Button**: Directly adds item to active order cart or creates a new order draft, with toast confirmation.
  - **"Tag Yard GPS" Button**: Retains full GPS logging functionality per `RULE[AGENTS_md]`.

---

## 4. User Rules & Regression Prevention Compliance
- **RULE[AGENTS_md]**: Zero feature loss across orders, inventory, scanning, audits, and holding locations.
- **GPS Buttons**: Yard GPS buttons remain accessible on all cards.
- **Theme Palette**: Deep Forest Green (`#012d1d`), Mint Flora (`#a0f4c8`), Mid-Green (`#0e6c4a`), Warm Off-White (`#f3f4f0`).

---

## 5. Verification Plan
1. **Compilation**: Run `compile_applet` and `lint_applet` to confirm zero TypeScript or build errors.
2. **CSV Parsing Test**: Verify all 1,984 lines from `/public/assets/aistudio/Nursery_Plants_-_Cultural_information_-_Main_2932d36a.csv` load correctly into the cultural service.
3. **Search & Scoring**: Test filter combinations (e.g. Height < 4 ft + Evergreen + Deer Resistant, or Full Sun + Yellow Fall Color + Shrub), verify Best Matches vs Close Matches rank properly.
4. **Order Integration**: Verify "Add to Order" updates the active draft cart and opens smoothly in the Scan screen.
5. **GPS Verification**: Verify the GPS satellite map modal opens from the matched plant cards.
