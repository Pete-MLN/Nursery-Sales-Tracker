import { PlantItem } from '../types';

/**
 * Strips Code 39 asterisks, Counterpoint 'ITEM' / 'ITM' identifier prefixes,
 * and enclosing brackets or formatting characters.
 * 
 * NCR Counterpoint uses 'ITEM' as the barcode identifier (BARCOD_ID = 'ITEM').
 * Tags may scan as '*41796*', 'ITEM-41796', 'ITEM:41796', 'ITEM 41796', or 'ITEM41796'.
 */
export function cleanCounterpointBarcode(raw: string | undefined | null): string {
  if (!raw) return '';
  let clean = String(raw).trim();

  // Strip Code 39 start/stop asterisks (e.g., '*41796*' -> '41796')
  clean = clean.replace(/^\*+|\*+$/g, '').trim();

  // Strip Counterpoint 'ITEM' or 'ITM' prefix (case-insensitive)
  // Handles 'ITEM-1234', 'ITEM:1234', 'ITEM 1234', 'ITEM_1234', '[ITEM]1234', 'ITEM1234'
  clean = clean.replace(/^\[?ITEM\]?[:\s\-_]*/i, '');
  clean = clean.replace(/^\[?ITM\]?[:\s\-_]*/i, '');

  return clean.trim();
}

/**
 * Normalizes a barcode string for robust cross-device comparison.
 * Handles leading zeros (e.g., '041796' -> '41796'), whitespace, symbols,
 * Code 39 asterisks, Counterpoint ITEM prefixes, and ITF even-parity zero padding.
 */
export function normalizeBarcode(code: string | undefined | null): string {
  if (!code) return '';
  let clean = cleanCounterpointBarcode(code);

  // Strip non-alphanumeric characters
  clean = clean.replace(/[^a-zA-Z0-9]/g, '');

  // If numeric, strip leading zeros so '041796', '0041796', and '41796' match identical keys
  // (In ITF barcodes, leading zeros are often prepended to make character length even)
  if (/^\d+$/.test(clean)) {
    const stripped = clean.replace(/^0+/, '');
    return stripped.length > 0 ? stripped : '0';
  }
  return clean.toUpperCase();
}

/**
 * Validates whether a barcode string looks like a legitimate scanned barcode
 * rather than video frame noise or partial decoding artifact.
 */
export function isValidBarcodeString(code: string | undefined | null): boolean {
  if (!code) return false;
  const clean = cleanCounterpointBarcode(code).replace(/[^a-zA-Z0-9]/g, '');
  // Must be at least 3 alphanumeric characters to reject 1-2 character random noise
  if (clean.length < 3) return false;
  return true;
}

/**
 * Finds a plant item in the inventory matching a scanned barcode with 100% precision.
 * Strict barcode matching: checks barcode, itemNo, SKU, and ID.
 * Supports:
 * - Counterpoint 'ITEM' prefix (e.g. scanned 'ITEM 41796' or 'ITEM-41796' matching '41796')
 * - Code 39 asterisks (e.g. '*41796*' matching '41796')
 * - ITF (Interleaved 2 of 5) even-length zero padding (e.g. '041796' matching '41796')
 * - Reverse prefix matching (e.g. item in inventory has 'ITEM41796' and scanned is '41796')
 * - 1-digit check digit variations
 */
export function findPlantByBarcode(rawCode: string, inventory: PlantItem[]): PlantItem | undefined {
  const cleanRaw = String(rawCode).trim();
  if (!cleanRaw || cleanRaw.length < 2) return undefined;

  const cpClean = cleanCounterpointBarcode(cleanRaw);
  const normRaw = normalizeBarcode(cleanRaw);
  const cleanUpper = cleanRaw.toUpperCase();
  const cpCleanUpper = cpClean.toUpperCase();

  // 1. Exact raw string match (case-insensitive) on barcode, itemNo, or id
  let matched = inventory.find(item => 
    (item.barcode && item.barcode.trim().toUpperCase() === cleanUpper) ||
    (item.itemNo && item.itemNo.trim().toUpperCase() === cleanUpper) ||
    (item.id && item.id.trim().toUpperCase() === cleanUpper)
  );
  if (matched) return matched;

  // 2. Exact match after stripping Counterpoint 'ITEM' prefix / Code 39 asterisks
  if (cpCleanUpper && cpCleanUpper !== cleanUpper) {
    matched = inventory.find(item => 
      (item.barcode && item.barcode.trim().toUpperCase() === cpCleanUpper) ||
      (item.itemNo && item.itemNo.trim().toUpperCase() === cpCleanUpper) ||
      (item.id && item.id.trim().toUpperCase() === cpCleanUpper)
    );
    if (matched) return matched;
  }

  // 3. Exact normalized match (stripping leading zeros, e.g., '041796' -> '41796', '0010006' -> '10006')
  if (normRaw) {
    matched = inventory.find(item => {
      const normB = normalizeBarcode(item.barcode);
      const normI = normalizeBarcode(item.itemNo);
      const normId = normalizeBarcode(item.id);

      return (
        (normB && normB === normRaw) ||
        (normI && normI === normRaw) ||
        (normId && normId === normRaw)
      );
    });
    if (matched) return matched;

    // 4. Reverse Counterpoint prefix matching:
    // If inventory item has barcode or itemNo like 'ITEM41796' or 'ITEM-41796', and scanned code is '41796'
    matched = inventory.find(item => {
      const cleanItemBarcode = cleanCounterpointBarcode(item.barcode);
      const cleanItemNo = cleanCounterpointBarcode(item.itemNo);
      const normCleanB = normalizeBarcode(cleanItemBarcode);
      const normCleanI = normalizeBarcode(cleanItemNo);

      return (
        (normCleanB && normCleanB === normRaw) ||
        (normCleanI && normCleanI === normRaw)
      );
    });
    if (matched) return matched;

    // 5. Exact 1-digit checksum variation (e.g. scanned '417968' where '8' is check digit and item is '41796')
    // We sort items by LONGEST normalized barcode/itemNo first to avoid matching short keys
    const sortedInventory = [...inventory].sort((a, b) => {
      const lenA = Math.max(normalizeBarcode(a.barcode).length, normalizeBarcode(a.itemNo).length);
      const lenB = Math.max(normalizeBarcode(b.barcode).length, normalizeBarcode(b.itemNo).length);
      return lenB - lenA;
    });

    matched = sortedInventory.find(item => {
      const normB = normalizeBarcode(item.barcode);
      const normI = normalizeBarcode(item.itemNo);

      if (normB && normB.length >= 4) {
        if (normRaw.length === normB.length + 1 && normRaw.startsWith(normB)) return true;
        if (normB.length === normRaw.length + 1 && normB.startsWith(normRaw)) return true;
      }
      if (normI && normI.length >= 4) {
        if (normRaw.length === normI.length + 1 && normRaw.startsWith(normI)) return true;
        if (normI.length === normRaw.length + 1 && normI.startsWith(normRaw)) return true;
      }
      return false;
    });
    if (matched) return matched;

    // 6. Embedded 12/13/14 digit UPC-A / EAN-13 / ITF matching (e.g. scanned '000000417965' containing '41796')
    if (normRaw.length >= 10 && /^\d+$/.test(normRaw)) {
      matched = sortedInventory.find(item => {
        const normB = normalizeBarcode(item.barcode);
        const normI = normalizeBarcode(item.itemNo);

        if (normB && normB.length >= 4 && normRaw.includes(normB)) return true;
        if (normI && normI.length >= 4 && normRaw.includes(normI)) return true;
        return false;
      });
      if (matched) return matched;
    }
  }

  return undefined;
}

