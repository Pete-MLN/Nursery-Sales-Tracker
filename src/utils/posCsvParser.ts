import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PlantItem } from '../types';
import defaultPlantImg from '../assets/images/default_maple_leaf_1786202948974.jpg';

export function parsePosCurrency(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const cleaned = String(val).replace(/[\$,\s]/g, '').trim();
  if (!cleaned) return undefined;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export function parsePosQuantity(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[,\s]/g, '').trim();
  if (!cleaned) return 0;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parsePosRowsToPlants(rows: Record<string, any>[]): PlantItem[] {
  if (!rows || rows.length === 0) return [];

  const plants: PlantItem[] = [];
  const seenIdCounts = new Map<string, number>();

  rows.forEach((row, idx) => {
    // Normalize header keys to UPPERCASE with whitespace trimmed
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      const cleanKey = k.trim().toUpperCase();
      normalizedRow[cleanKey] = row[k];
    });

    const itemNo = normalizedRow['ITEM_NO'] || normalizedRow['ITEM_NUMBER'] || normalizedRow['ITEM NO'] || normalizedRow['ITEM'] || normalizedRow['ITEM_ID'] || normalizedRow['SKU'] || `POS-${idx + 1}`;
    const descr = normalizedRow['DESCR'] || normalizedRow['DESCRIPTION'] || normalizedRow['BOTANICAL_NAME'] || '';
    const addlDescr1 = normalizedRow['ADDL_DESCR_1'] || normalizedRow['ADDITIONAL_DESCRIPTION'] || normalizedRow['COMMON_NAME'] || '';
    const stkUnit = normalizedRow['STK_UNIT'] || normalizedRow['SIZE'] || normalizedRow['UNIT'] || '';

    // Prices
    const retailPrice = parsePosCurrency(normalizedRow['INV_PRC_1'] || normalizedRow['RETAIL_PRICE'] || normalizedRow['PRICE']);
    const wholesalePrice = parsePosCurrency(normalizedRow['INV_PRC_3'] || normalizedRow['WHOLESALE_PRICE']);
    const gardenCenterPrice = parsePosCurrency(normalizedRow['INV_PRC_4'] || normalizedRow['GARDEN_CENTER_PRICE']);
    const elitePrice = parsePosCurrency(normalizedRow['INV_PRC_5'] || normalizedRow['ELITE_PRICE']);

    // Stock & Committed
    const qtyAvail = parsePosQuantity(normalizedRow['QTY_AVAIL'] || normalizedRow['QUANTITY'] || normalizedRow['STOCK'] || 0);
    const qtyCommit = parsePosQuantity(normalizedRow['QTY_COMMIT'] || normalizedRow['COMMITTED'] || 0);

    // Categories & Barcode
    const categSubcat = normalizedRow['CATEG_SUBCAT'] || normalizedRow['CATEGORY'] || '';
    const addlDescr2 = normalizedRow['ADDL_DESCR_2'] || normalizedRow['LOCATION'] || normalizedRow['PLANT_LOCATION'] || '';
    const subcatCod = normalizedRow['SUBCAT_COD'] || normalizedRow['SUB_CATEGORY'] || '';
    const rawBarcode = normalizedRow['BARCOD'] || normalizedRow['BARCODE'] || normalizedRow['BARCOD_NO'] || normalizedRow['BARCODE_NO'] || normalizedRow['UPC'] || normalizedRow['UPC_NO'] || normalizedRow['ALTR_BARCOD'] || normalizedRow['ALT_BARCOD'] || normalizedRow['ALT_BARCODE'] || normalizedRow['TAG_NO'] || normalizedRow['TAG_BARCODE'] || '';
    const stat = normalizedRow['STAT'] || normalizedRow['STATUS'] || 'A';
    const locId = normalizedRow['LOC_ID'] || normalizedRow['STORE_ID'] || '101';

    // Display Name prioritization - Column "DESCR" is the primary botanical/nursery catalog description
    const commonName = addlDescr1 || descr || `Item #${itemNo}`;
    const botanicalName = descr;
    const primaryName = descr ? descr : addlDescr1 ? addlDescr1 : `Item #${itemNo}`;

    const effectivePrice = retailPrice ?? wholesalePrice ?? 0;

    let stockStatus: 'critical' | 'warning' | 'healthy' = 'healthy';
    if (qtyAvail <= 0) {
      stockStatus = 'critical';
    } else if (qtyAvail <= 5) {
      stockStatus = 'warning';
    }

    const pricesObj: { retail?: number; wholesale?: number; gardenCenter?: number; elite?: number } = {};
    if (retailPrice !== undefined) pricesObj.retail = retailPrice;
    if (wholesalePrice !== undefined) pricesObj.wholesale = wholesalePrice;
    if (gardenCenterPrice !== undefined) pricesObj.gardenCenter = gardenCenterPrice;
    if (elitePrice !== undefined) pricesObj.elite = elitePrice;

    // GPS Coordinates if present in spreadsheet
    const rawLat = normalizedRow['LATITUDE'] || normalizedRow['LAT'] || normalizedRow['GPS_LAT'] || normalizedRow['GPS_LATITUDE'];
    const rawLng = normalizedRow['LONGITUDE'] || normalizedRow['LNG'] || normalizedRow['LON'] || normalizedRow['GPS_LNG'] || normalizedRow['GPS_LONGITUDE'];
    const rawGps = normalizedRow['GPS'] || normalizedRow['COORDINATES'] || normalizedRow['GPS_LOCATION'] || normalizedRow['YARD_COORDINATES'];

    let parsedGps: { latitude: number; longitude: number; timestamp: string } | undefined = undefined;
    if (rawLat !== undefined && rawLng !== undefined && String(rawLat).trim() !== '' && String(rawLng).trim() !== '') {
      const latNum = parseFloat(String(rawLat));
      const lngNum = parseFloat(String(rawLng));
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        parsedGps = { latitude: latNum, longitude: lngNum, timestamp: new Date().toISOString() };
      }
    } else if (rawGps && typeof rawGps === 'string' && rawGps.includes(',')) {
      const parts = rawGps.split(',');
      const latNum = parseFloat(parts[0].trim());
      const lngNum = parseFloat(parts[1].trim());
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        parsedGps = { latitude: latNum, longitude: lngNum, timestamp: new Date().toISOString() };
      }
    }

    // Stable deterministic ID based on itemNo and container size
    const itemNoClean = String(itemNo).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const sizeClean = stkUnit ? String(stkUnit).trim().replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const baseId = `p-${itemNoClean}${sizeClean ? '-' + sizeClean : ''}`;

    let plantId = baseId;
    if (seenIdCounts.has(baseId)) {
      const count = seenIdCounts.get(baseId)! + 1;
      seenIdCounts.set(baseId, count);
      plantId = `${baseId}-loc${locId}-${count}`;
    } else {
      seenIdCounts.set(baseId, 1);
    }

    const finalBarcode = rawBarcode ? String(rawBarcode).trim() : String(itemNo).trim();

    const plantItem: PlantItem = {
      id: plantId,
      itemNo: String(itemNo).trim(),
      name: primaryName,
      lightRequirement: 'FULL SUN',
      price: effectivePrice,
      image: defaultPlantImg,
      stock: qtyAvail,
      quantityCommitted: qtyCommit,
      status: stockStatus,
      barcode: finalBarcode,
      statusActive: String(stat).toUpperCase() === 'A',
      storeLocId: String(locId)
    };

    if (parsedGps) plantItem.gpsLocation = parsedGps;
    if (descr) plantItem.descr = descr;
    if (commonName) plantItem.commonName = commonName;
    if (botanicalName) plantItem.botanicalName = botanicalName;
    if (stkUnit) plantItem.size = stkUnit;
    if (Object.keys(pricesObj).length > 0) plantItem.prices = pricesObj;
    if (categSubcat) plantItem.category = categSubcat;
    if (addlDescr2) plantItem.holdingLocation = addlDescr2;
    if (subcatCod) plantItem.subCategoryCode = subcatCod;

    // Sale Price / Discount if optionally present in spreadsheet
    const rawSalePrice = parsePosCurrency(normalizedRow['SALE_PRICE'] || normalizedRow['SALE_PRC'] || normalizedRow['SPECIAL_PRICE'] || normalizedRow['PROMO_PRICE']);
    const rawDiscountPct = parsePosCurrency(normalizedRow['DISCOUNT_PERCENT'] || normalizedRow['DISCOUNT_PCT'] || normalizedRow['DISCOUNT'] || normalizedRow['SALE_PCT']);
    const saleLabel = normalizedRow['SALE_LABEL'] || normalizedRow['SALE_TAG'] || normalizedRow['SALE_NAME'] || '';

    if (rawSalePrice !== undefined && rawSalePrice > 0) {
      plantItem.saleDiscount = {
        type: 'fixed_price',
        value: rawSalePrice,
        salePrice: rawSalePrice,
        saleLabel: saleLabel || 'Special Sale',
        active: true,
        appliedAt: new Date().toISOString()
      };
    } else if (rawDiscountPct !== undefined && rawDiscountPct > 0 && rawDiscountPct <= 100) {
      plantItem.saleDiscount = {
        type: 'percentage',
        value: rawDiscountPct,
        saleLabel: saleLabel || `${rawDiscountPct}% OFF`,
        active: true,
        appliedAt: new Date().toISOString()
      };
    }

    // Preserve every row from the uploaded file
    plants.push(plantItem);
  });

  return plants;
}

export function parsePosCsvToPlants(csvContent: string): PlantItem[] {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toUpperCase()
  });

  if (!parsed.data || parsed.data.length === 0) {
    return [];
  }

  return parsePosRowsToPlants(parsed.data);
}

export async function parsePosFileToPlants(file: File): Promise<PlantItem[]> {
  const nameLower = file.name.toLowerCase();

  if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];
    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    return parsePosRowsToPlants(rows);
  } else {
    // CSV / TXT or general fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            resolve([]);
            return;
          }
          // Try Papa parse first
          let plants = parsePosCsvToPlants(text);
          if (plants.length === 0) {
            // Fallback to XLSX text parser
            const workbook = XLSX.read(text, { type: 'string' });
            const firstSheet = workbook.SheetNames[0];
            if (firstSheet) {
              const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheet], { defval: '' });
              plants = parsePosRowsToPlants(rows);
            }
          }
          resolve(plants);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }
}

