import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Customer } from '../types';

export function parseRowsToCustomers(rows: Record<string, any>[]): Customer[] {
  if (!rows || rows.length === 0) return [];

  const customers: Customer[] = [];

  rows.forEach((row, idx) => {
    // Normalize header keys: strip BOM, quotes, whitespace, replace spaces with underscore
    const norm: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      if (!k) return;
      const cleanKey = k.replace(/^\uFEFF/, '').replace(/['"]+/g, '').trim().toUpperCase().replace(/\s+/g, '_');
      norm[cleanKey] = row[k];
    });

    // 1. Account Number / Code
    const accountNo = String(
      norm['CUST_NO'] || norm['ACCOUNT_NO'] || norm['CUSTOMER_ID'] || norm['ID'] || norm['CODE'] || norm['CUSTOMER_CODE'] || norm['REF'] || norm['ACCT'] || norm['CUST_ID'] || norm['CUSTOMER_NO'] || norm['CUST_NUM'] || `C-${idx + 101}`
    ).trim();

    // 2. Customer Name Candidates (Prioritize "NAM" from CounterPoint / Nursery POS)
    let extractedName = '';

    const nameKeys = [
      'NAM', 'NAME', 'NAM_UPR', 'NAM1', 'NAME1', 'CUST_NAM', 'CUST_NAME',
      'CUSTOMER_NAME', 'CUSTOMER', 'CLIENT_NAME', 'CLIENT', 'FULL_NAME',
      'BILL_NAME', 'BILL_TO_NAME', 'DISPLAY_NAME', 'NAME_AND_ADDRESS', 'CUST_NAM_UPR'
    ];

    for (const key of nameKeys) {
      if (norm[key] !== undefined && norm[key] !== null && String(norm[key]).trim() !== '') {
        extractedName = String(norm[key]).trim();
        break;
      }
    }

    if (!extractedName) {
      for (const k of Object.keys(norm)) {
        if ((k.includes('NAM') || k.includes('NAME') || k.includes('CLIENT')) && norm[k] !== undefined && norm[k] !== null && String(norm[k]).trim() !== '') {
          const val = String(norm[k]).trim();
          if (!/^[0-9\-_]+$/.test(val)) {
            extractedName = val;
            break;
          }
        }
      }
    }

    // First / Last Name combination
    const firstName = String(norm['FIRST_NAME'] || norm['FNAME'] || norm['FIRSTNAME'] || norm['GIVEN_NAME'] || norm['FIRST'] || '').trim();
    const lastName = String(norm['LAST_NAME'] || norm['LNAME'] || norm['LASTNAME'] || norm['SURNAME'] || norm['LAST'] || '').trim();
    const combinedFirstLast = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : '';

    // Contact name
    const contactName = combinedFirstLast || String(
      norm['CONTACT_1'] || norm['CONTACT_2'] || norm['CONTACT'] || norm['CONTACT_NAME'] || norm['CONT'] || norm['CONT_1'] || norm['ATTN'] || norm['PRIMARY_CONTACT'] || ''
    ).trim();

    // Company / Business name
    const companyField = String(
      norm['COMPANY'] || norm['COMPANY_NAME'] || norm['BUSINESS_NAME'] || norm['ORGANIZATION'] || norm['FARM_NAME'] || norm['FARM'] || norm['BUSINESS'] || norm['DBA'] || ''
    ).trim();

    let name = extractedName || contactName || companyField || '';
    let company = (companyField && companyField !== name) ? companyField : '';

    // Fallback if name is empty
    if (!name || /^[0-9\-_]+$/.test(name)) {
      if (company) {
        name = company;
      } else {
        // Look for any string value in row that is non-numeric and not phone/email/address
        for (const k of Object.keys(norm)) {
          const val = String(norm[k] || '').trim();
          if (val.length >= 2 && !/^[0-9\-_@.+]+$/.test(val) && !val.includes('@') && !k.includes('EMAIL') && !k.includes('ADDR') && !k.includes('PHONE') && !k.includes('ZIP')) {
            name = val;
            break;
          }
        }
      }
    }

    if (!name) {
      name = accountNo ? `Customer ${accountNo}` : `Customer ${idx + 1}`;
    }

    const email = String(norm['EMAIL'] || norm['E_MAIL'] || norm['CONTACT_EMAIL'] || norm['EMAIL_ADRS'] || norm['MAIL'] || '').trim();
    const phone = String(norm['PHONE'] || norm['TELEPHONE'] || norm['MOBILE'] || norm['CONTACT_PHONE'] || norm['PHONE_1'] || norm['PHONE_2'] || norm['TEL'] || '').trim();
    const address = String(norm['ADDRESS'] || norm['STREET'] || norm['LOCATION'] || norm['ADDR_1'] || norm['ADDRESS_1'] || norm['STR_ADRS_1'] || '').trim();

    // 3. Category Code (CATEG_COD from CounterPoint / Nursery POS)
    const categoryCode = String(
      norm['CATEG_COD'] || norm['CUST_CATEG_COD'] || norm['CAT_COD'] || norm['CATEGORY_CODE'] || norm['CATEGORY'] || norm['CATEG'] || ''
    ).trim();

    // 4. Price Level (PRC_LVL from CounterPoint)
    const priceLevelNo = String(
      norm['PRC_LVL'] || norm['PRICE_LEVEL'] || norm['PRC_GRP'] || norm['PRICE_LVL'] || norm['PRICE_LEVEL_NO'] || ''
    ).trim();

    const rawTypeCombined = String(
      categoryCode || priceLevelNo || norm['TYPE'] || norm['CUST_TYPE'] || norm['RATE_TYPE'] || ''
    ).toUpperCase();

    let type: 'RETAIL' | 'WHOLESALE' | 'COMMERCIAL' = 'RETAIL';
    let defaultPriceLevel: 'retail' | 'wholesale' | 'gardenCenter' | 'elite' = 'retail';

    if (
      rawTypeCombined.includes('WHOLESALE') || rawTypeCombined === 'WHO' || rawTypeCombined.startsWith('WHO_') ||
      rawTypeCombined.includes('WHS') || rawTypeCombined.includes('TRADE') || rawTypeCombined === '3' || priceLevelNo === '3'
    ) {
      type = 'WHOLESALE';
      defaultPriceLevel = 'wholesale';
    } else if (
      rawTypeCombined.includes('COMMERCIAL') || rawTypeCombined === 'COMM' || rawTypeCombined.startsWith('COMM_') ||
      rawTypeCombined.includes('LANDSCAPE') || rawTypeCombined.includes('LAND') || rawTypeCombined.includes('CONTRACTOR') ||
      rawTypeCombined === 'CTR' || priceLevelNo === '2'
    ) {
      type = 'COMMERCIAL';
      defaultPriceLevel = 'wholesale';
    } else if (
      rawTypeCombined.includes('GARDEN') || rawTypeCombined === 'GARD' || rawTypeCombined === 'GC' || priceLevelNo === '4'
    ) {
      type = 'WHOLESALE';
      defaultPriceLevel = 'gardenCenter';
    } else if (
      rawTypeCombined.includes('ELITE') || rawTypeCombined.includes('VOL') || priceLevelNo === '5'
    ) {
      type = 'WHOLESALE';
      defaultPriceLevel = 'elite';
    } else {
      type = 'RETAIL';
      defaultPriceLevel = 'retail';
    }

    const customerObj: Customer = {
      id: `c-${accountNo}-${idx}`,
      name,
      type,
      accountNo,
      recent: true
    };

    if (categoryCode) customerObj.categoryCode = categoryCode;
    if (priceLevelNo) customerObj.priceLevelNo = priceLevelNo;
    if (defaultPriceLevel) customerObj.defaultPriceLevel = defaultPriceLevel;
    if (company && company !== name) customerObj.company = company;
    if (email) customerObj.email = email;
    if (phone) customerObj.phone = phone;
    if (address) customerObj.address = address;

    customers.push(customerObj);
  });

  return customers;
}

export async function parseCustomerFileToCustomers(file: File): Promise<Customer[]> {
  const nameLower = file.name.toLowerCase();

  if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];
    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    return parseRowsToCustomers(rows);
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            resolve([]);
            return;
          }

          // Auto-detect delimiter or fallback
          const parsed = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: false
          });

          if (parsed.data && parsed.data.length > 0) {
            // Check if parsing resulted in single column with tabs/pipes
            const firstRow = parsed.data[0];
            const keys = Object.keys(firstRow);
            if (keys.length === 1 && (keys[0].includes('\t') || keys[0].includes('|'))) {
              const delim = keys[0].includes('\t') ? '\t' : '|';
              const reParsed = Papa.parse<Record<string, string>>(text, {
                header: true,
                delimiter: delim,
                skipEmptyLines: 'greedy'
              });
              if (reParsed.data && reParsed.data.length > 0) {
                resolve(parseRowsToCustomers(reParsed.data));
                return;
              }
            }
            resolve(parseRowsToCustomers(parsed.data));
            return;
          }

          // Fallback to XLSX string parser
          const workbook = XLSX.read(text, { type: 'string' });
          const firstSheet = workbook.SheetNames[0];
          if (firstSheet) {
            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheet], { defval: '' });
            resolve(parseRowsToCustomers(rows));
          } else {
            resolve([]);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }
}
