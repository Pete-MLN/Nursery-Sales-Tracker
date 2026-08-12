import { Customer } from '../types';

export function sanitizeCustomerName(cust: Partial<Customer>, index: number = 0): string {
  const rawName = (cust.name || '').trim();
  const rawCompany = (cust.company || '').trim();
  const rawAccountNo = (cust.accountNo || '').trim();

  // If rawName is present and is not a default "Customer #123" string, keep it
  if (rawName && !/^Customer\s*#?[0-9\-_]+$/i.test(rawName)) {
    return rawName;
  }

  // If company is available, use company name
  if (rawCompany) {
    return rawCompany;
  }

  // If rawName is present (e.g. "Customer #100000"), return it cleanly
  if (rawName) {
    return rawName;
  }

  if (rawAccountNo) {
    return `Account #${rawAccountNo}`;
  }

  return `Customer ${index + 1}`;
}

