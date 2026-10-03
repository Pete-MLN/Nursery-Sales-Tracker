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
 * Formats the modified date/time of an order if present.
 */
export function formatOrderModifiedDate(order?: { updatedAt?: string; modifiedAt?: string } | null): string {
  if (!order) return '';
  const dateStr = order.updatedAt || order.modifiedAt;
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return dateStr;
}

/**
 * Returns a numerical timestamp (epoch ms) representing the latest date
 * the order was created or modified. Used for sorting newest to oldest.
 */
export function getOrderSortTimestamp(order?: {
  id?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  modifiedAt?: string;
  completedAt?: string;
  scheduledDate?: string;
  items?: Array<{
    gpsLocation?: { timestamp?: string };
    gpsLocations?: Array<{ timestamp?: string }>;
  }>;
} | null): number {
  if (!order) return 0;

  const candidateTimestamps: number[] = [];

  // 1. Explicit modification timestamps
  if (order.updatedAt) {
    const t = new Date(order.updatedAt).getTime();
    if (!isNaN(t)) candidateTimestamps.push(t);
  }
  if (order.modifiedAt) {
    const t = new Date(order.modifiedAt).getTime();
    if (!isNaN(t)) candidateTimestamps.push(t);
  }
  if (order.completedAt) {
    const t = new Date(order.completedAt).getTime();
    if (!isNaN(t)) candidateTimestamps.push(t);
  }

  // 2. Item-level modifications (e.g. GPS tagging)
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      if (item.gpsLocation?.timestamp) {
        const t = new Date(item.gpsLocation.timestamp).getTime();
        if (!isNaN(t)) candidateTimestamps.push(t);
      }
      if (item.gpsLocations && item.gpsLocations.length > 0) {
        for (const loc of item.gpsLocations) {
          if (loc.timestamp) {
            const t = new Date(loc.timestamp).getTime();
            if (!isNaN(t)) candidateTimestamps.push(t);
          }
        }
      }
    }
  }

  // 3. Creation ISO timestamp
  if (order.createdAt) {
    const t = new Date(order.createdAt).getTime();
    if (!isNaN(t)) candidateTimestamps.push(t);
  }

  // 4. Calendar date string (e.g. "Aug 18, 2026", "2026-08-18", "Today")
  if (order.date) {
    const trimmed = order.date.trim();
    if (trimmed.toLowerCase() === 'today' || trimmed.toLowerCase() === 'just now') {
      if (candidateTimestamps.length === 0) {
        candidateTimestamps.push(Date.now());
      }
    } else {
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) {
        candidateTimestamps.push(parsed);
      }
    }
  }

  // 5. Scheduled date if available
  if (order.scheduledDate) {
    const parsed = Date.parse(order.scheduledDate);
    if (!isNaN(parsed)) {
      candidateTimestamps.push(parsed);
    }
  }

  // If any valid timestamp was found, the newest one is the latest created/modified moment
  if (candidateTimestamps.length > 0) {
    return Math.max(...candidateTimestamps);
  }

  // 6. Fallback: Check numeric ID for epoch millis or numeric string
  if (order.id) {
    const digitsMatch = order.id.match(/\d{6,}/);
    if (digitsMatch) {
      const val = Number(digitsMatch[0]);
      if (val > 1000000000000) return val;
      if (val > 1000000000) return val * 1000;
    }
  }

  return 0;
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
