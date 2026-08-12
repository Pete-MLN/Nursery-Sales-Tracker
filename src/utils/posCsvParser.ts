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

  rows.forEach((row, idx) => {
    // Normalize header keys to UPPERCASE with whitespace trimmed
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      const cleanKey = k.trim().toUpperCase();
      normalizedRow[cleanKey] = row[k];
    });

    const itemNo = normalizedRow['ITEM_NO'] || normalizedRow['ITEM_NUMBER'] || normalizedRow['ITEM NO'] || normalizedRow['SKU'] || `POS-${idx + 1}`;
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
    const barcode = normalizedRow['BARCOD'] || normalizedRow['BARCODE'] || normalizedRow['UPC'] || itemNo;
    const stat = normalizedRow['STAT'] || normalizedRow['STATUS'] || 'A';
    const locId = normalizedRow['LOC_ID'] || normalizedRow['STORE_ID'] || '101';

    // Display Name prioritization
    const commonName = addlDescr1 || descr || `Item #${itemNo}`;
    const botanicalName = descr;
    const primaryName = addlDescr1 ? addlDescr1 : descr ? descr : `Item #${itemNo}`;

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

    const plantItem: PlantItem = {
      id: `p-${itemNo}-${idx}`,
      itemNo: String(itemNo),
      name: primaryName,
      lightRequirement: 'FULL SUN',
      price: effectivePrice,
      image: defaultPlantImg,
      stock: qtyAvail,
      quantityCommitted: qtyCommit,
      status: stockStatus,
      barcode: String(barcode),
      statusActive: String(stat).toUpperCase() === 'A',
      storeLocId: String(locId)
    };

    if (commonName) plantItem.commonName = commonName;
    if (botanicalName) plantItem.botanicalName = botanicalName;
    if (stkUnit) plantItem.size = stkUnit;
    if (Object.keys(pricesObj).length > 0) plantItem.prices = pricesObj;
    if (categSubcat) plantItem.category = categSubcat;
    if (addlDescr2) plantItem.holdingLocation = addlDescr2;
    if (subcatCod) plantItem.subCategoryCode = subcatCod;

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

