import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Customer } from '../types';

export function parseRowsToCustomers(rows: Record<string, any>[]): Customer[] {
  if (!rows || rows.length === 0) return [];

  const customers: Customer[] = [];

  rows.forEach((row, idx) => {
    // Normalize header keys to UPPERCASE with whitespace trimmed
    const norm: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      const cleanKey = k.trim().toUpperCase();
      norm[cleanKey] = row[k];
    });

    const accountNo = String(norm['CUST_NO'] || norm['ACCOUNT_NO'] || norm['CUSTOMER_ID'] || norm['ID'] || norm['CODE'] || `CUST-${idx + 101}`).trim();
    const rawName = String(norm['NAME'] || norm['CUST_NAME'] || norm['CUSTOMER_NAME'] || norm['COMPANY'] || norm['CLIENT'] || norm['FULL_NAME'] || '').trim();
    const company = String(norm['COMPANY'] || norm['BUSINESS_NAME'] || norm['ORGANIZATION'] || '').trim();
    const email = String(norm['EMAIL'] || norm['E_MAIL'] || norm['CONTACT_EMAIL'] || '').trim();
    const phone = String(norm['PHONE'] || norm['TELEPHONE'] || norm['MOBILE'] || norm['CONTACT_PHONE'] || '').trim();
    const address = String(norm['ADDRESS'] || norm['STREET'] || norm['LOCATION'] || '').trim();

    const name = rawName || company || `Customer #${accountNo}`;

    // Classify Type
    const rawType = String(norm['TYPE'] || norm['CUST_TYPE'] || norm['PRICE_LEVEL'] || norm['RATE_TYPE'] || norm['PRC_LVL'] || '').toUpperCase();
    let type: 'RETAIL' | 'WHOLESALE' | 'COMMERCIAL' = 'RETAIL';
    if (rawType.includes('WHOLESALE') || rawType.includes('GARDEN') || rawType.includes('3') || rawType.includes('4') || rawType.includes('5') || rawType.includes('TRADE')) {
      type = 'WHOLESALE';
    } else if (rawType.includes('COMMERCIAL') || rawType.includes('LANDSCAPE') || rawType.includes('CONTRACTOR')) {
      type = 'COMMERCIAL';
    }

    const customerObj: Customer = {
      id: `c-${accountNo}-${idx}`,
      name,
      type,
      accountNo,
      recent: true
    };

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
          const parsed = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toUpperCase()
          });

          if (parsed.data && parsed.data.length > 0) {
            resolve(parseRowsToCustomers(parsed.data));
            return;
          }

          // Fallback to XLSX text parser
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
