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
 * Finds a plant item in the inventory matching a scanned barcode.
 * Priority order:
 * 1. Direct raw string equality match (item.barcode, item.itemNo, item.id)
 * 2. Normalized string equality match (stripping leading zeros, whitespace, symbols)
 * 3. Prefix/suffix/checksum digit match (for 12/13-digit UPC-A/EAN-13 padding variations)
 * NO fuzzy string matching on numeric barcodes to prevent misidentifying items.
 */
export function findPlantByBarcode(rawCode: string, inventory: PlantItem[]): PlantItem | undefined {
  const cleanRaw = rawCode.trim();
  if (!cleanRaw) return undefined;

  const normRaw = normalizeBarcode(cleanRaw);
  const cleanLower = cleanRaw.toLowerCase();

  // 1. Direct raw string equality match
  let matched = inventory.find(item => 
    (item.barcode && item.barcode.trim().toLowerCase() === cleanLower) ||
    (item.itemNo && item.itemNo.trim().toLowerCase() === cleanLower) ||
    (item.id && item.id.trim().toLowerCase() === cleanLower)
  );
  if (matched) return matched;

  // 2. Normalized equality match (handles '041796' vs '41796' or '0041796')
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

    // 3. Checksum or UPC-A 12-digit / EAN-13 13-digit prefix/suffix match (for codes >= 3 digits)
    if (normRaw.length >= 3) {
      matched = inventory.find(item => {
        const normB = normalizeBarcode(item.barcode);
        const normI = normalizeBarcode(item.itemNo);

        if (normB && normB.length >= 3) {
          if (normRaw.endsWith(normB) || normB.endsWith(normRaw) || normRaw.startsWith(normB) || normB.startsWith(normRaw)) {
            return true;
          }
          // Stripped checksum digit at end (e.g., '417968' vs '41796')
          if (normRaw.slice(0, -1) === normB || normB.slice(0, -1) === normRaw) {
            return true;
          }
        }
        if (normI && normI.length >= 3) {
          if (normRaw.endsWith(normI) || normI.endsWith(normRaw) || normRaw.startsWith(normI) || normI.startsWith(normRaw)) {
            return true;
          }
        }
        return false;
      });
      if (matched) return matched;
    }
  }

  // 4. Fallback ONLY for explicitly non-numeric text search queries (e.g. "Rose", "Spiraea")
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
