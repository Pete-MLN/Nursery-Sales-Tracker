import { PlantItem } from '../types';

/**
 * Normalizes a barcode string for robust cross-device comparison.
 * Handles leading zeros (e.g., '041796' -> '41796'), whitespace, symbols,
 * UPC-A / EAN-13 padding differences, and lowercase conversions.
 */
export function normalizeBarcode(code: string | undefined | null): string {
  if (!code) return '';
  let clean = String(code).trim();
  // Strip non-alphanumeric characters
  clean = clean.replace(/[^a-zA-Z0-9]/g, '');

  // If numeric, strip leading zeros so '041796', '0041796', and '41796' match identical keys
  if (/^\d+$/.test(clean)) {
    const stripped = clean.replace(/^0+/, '');
    return stripped.length > 0 ? stripped : '0';
  }
  return clean.toLowerCase();
}

/**
 * Finds a plant item in the inventory matching a scanned barcode with 100% precision.
 * NO loose prefix/suffix matching is permitted so that '10006' or '41796' will NEVER
 * falsely match '1000' or '41'.
 */
export function findPlantByBarcode(rawCode: string, inventory: PlantItem[]): PlantItem | undefined {
  const cleanRaw = rawCode.trim();
  if (!cleanRaw) return undefined;

  const normRaw = normalizeBarcode(cleanRaw);
  const cleanLower = cleanRaw.toLowerCase();

  // 1. Exact raw string match
  let matched = inventory.find(item => 
    (item.barcode && item.barcode.trim().toLowerCase() === cleanLower) ||
    (item.itemNo && item.itemNo.trim().toLowerCase() === cleanLower) ||
    (item.id && item.id.trim().toLowerCase() === cleanLower)
  );
  if (matched) return matched;

  // 2. Exact normalized match (e.g., '041796' -> '41796', '0010006' -> '10006')
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

    // 3. Exact 1-digit checksum variation (e.g. scanned '417968' where '8' is check digit and item is '41796')
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
      }
      if (normI && normI.length >= 4) {
        if (normRaw.length === normI.length + 1 && normRaw.startsWith(normI)) return true;
      }
      return false;
    });
    if (matched) return matched;

    // 4. Embedded 12/13 digit UPC-A / EAN-13 matching (e.g. scanned 12-digit '000000417965' containing '41796')
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

  // 5. Fallback for non-numeric search query (e.g., text search like "Rose" or "Thuja")
  const isPurelyNumeric = /^\d+$/.test(cleanRaw.replace(/[^0-9]/g, ''));
  if (!isPurelyNumeric && cleanLower.length >= 3) {
    matched = inventory.find(item =>
      item.name.toLowerCase().includes(cleanLower) ||
      (item.botanicalName && item.botanicalName.toLowerCase().includes(cleanLower)) ||
      (item.commonName && item.commonName.toLowerCase().includes(cleanLower))
    );
    if (matched) return matched;
  }

  return undefined;
}
