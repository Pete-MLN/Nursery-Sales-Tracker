/**
 * Nursery Order Date & Scheduling Formatting Utilities
 */

/**
 * Formats the creation / entered date of an order.
 * Returns formatted calendar date such as "Aug 18, 2026" or "Oct 24, 2023".
 */
export function formatOrderCreatedDate(order?: { date?: string; createdAt?: string } | null): string {
  if (!order) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // 1. Check createdAt ISO timestamp first
  if (order.createdAt) {
    const d = new Date(order.createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // 2. Check date string
  if (order.date) {
    const trimmed = order.date.trim();
    // If it's literal 'Today' or 'Just Now', replace with today's real date
    if (trimmed.toLowerCase() === 'today' || trimmed.toLowerCase() === 'just now') {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // If it's an ISO or YYYY-MM-DD string
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    // Return the clean existing date string (e.g. "Oct 24, 2023")
    return trimmed;
  }

  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats the scheduled fulfillment date and time for an order.
 * Handles ISO dates (YYYY-MM-DD), times (2:00 PM), windows (Morning 8am-12pm), and combined strings.
 */
export function formatOrderScheduledTime(order?: { 
  scheduledTime?: string; 
  scheduledDate?: string; 
  type?: string; 
  status?: string;
} | null): string {
  if (!order) return 'Scheduled';

  const type = order.type || 'Pickup';
  const rawSched = (order.scheduledTime || '').trim();
  const schedDate = (order.scheduledDate || '').trim();

  // If order is Take Now and no specific scheduled time was picked
  if (type === 'Take Now' && (!rawSched || rawSched.toLowerCase() === 'today' || rawSched.toLowerCase() === 'immediate')) {
    return 'Take Now (Immediate)';
  }

  // If we have separate date and time
  if (schedDate && rawSched && !rawSched.includes(schedDate)) {
    const formattedD = formatRawDateString(schedDate);
    return `${formattedD} • ${rawSched}`;
  }

  if (!rawSched) {
    if (schedDate) return formatRawDateString(schedDate);
    return type === 'Take Now' ? 'Immediate' : 'Pending Scheduling';
  }

  // If rawSched is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawSched)) {
    return formatRawDateString(rawSched);
  }

  // If rawSched is YYYY-MM-DD with time or window e.g. "2026-08-20 2:00 PM"
  const isoMatch = rawSched.match(/^(\d{4}-\d{2}-\d{2})[\sT]+(.*)$/);
  if (isoMatch) {
    const dStr = formatRawDateString(isoMatch[1]);
    const tStr = isoMatch[2].replace(/[T()]/g, ' ').trim();
    return `${dStr} • ${tStr}`;
  }

  // If rawSched is "Today" or "Tomorrow" with or without time
  if (rawSched.toLowerCase() === 'today') {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Today (${todayStr})`;
  }

  return rawSched;
}

/**
 * Formats a YYYY-MM-DD string to "MMM D, YYYY"
 */
export function formatRawDateString(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return dateStr;
}

/**
 * Returns current date formatted as YYYY-MM-DD for HTML input[type="date"]
 */
export function getTodayDateInputValue(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts or converts any scheduled time string into a valid YYYY-MM-DD for date inputs
 */
export function extractDateForInput(val?: string): string {
  if (!val) return getTodayDateInputValue();
  const trimmed = val.trim();
  
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return getTodayDateInputValue();
}
