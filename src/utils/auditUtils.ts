import { InventoryAuditSession, InventoryCountItem, PlantItem } from '../types';

export interface ConsolidatedAuditItem {
  key: string; // SKU or name
  itemNo: string;
  name: string;
  botanicalName?: string;
  size: string;
  category?: string;
  barcode?: string;
  price: number;
  masterStock: number;
  totalCountedQuantity: number;
  variance: number; // totalCountedQuantity - masterStock
  varianceValue: number; // variance * price
  status: 'exact' | 'over' | 'under';
  entriesCount: number;
  locations: {
    location: string;
    quantity: number;
    countMode: 'total' | 'cycle_additive';
    gpsLocation?: { latitude: number; longitude: number; accuracy?: number; timestamp: string };
    timestamp: string;
    countedBy: string;
    notes?: string;
  }[];
}

export interface AuditSummaryStats {
  totalUniquePlants: number;
  totalPhysicalUnits: number;
  totalBaselineUnits: number;
  netUnitVariance: number;
  netDollarVariance: number;
  exactMatchCount: number;
  overCount: number;
  underCount: number;
  locationsCount: number;
}

/**
 * Consolidates multiple count entries into per-plant summaries, handling both Total and Cycle Additive modes
 */
export function consolidateAuditItems(items: InventoryCountItem[]): ConsolidatedAuditItem[] {
  const map = new Map<string, ConsolidatedAuditItem>();

  for (const item of items) {
    const key = (item.itemNo || item.barcode || item.name).trim().toUpperCase();

    if (!map.has(key)) {
      const unitPrice = item.price || 0;
      map.set(key, {
        key,
        itemNo: item.itemNo || 'N/A',
        name: item.name,
        botanicalName: item.botanicalName,
        size: item.size || 'Standard',
        category: item.category,
        barcode: item.barcode,
        price: unitPrice,
        masterStock: item.masterStock,
        totalCountedQuantity: 0,
        variance: 0,
        varianceValue: 0,
        status: 'exact',
        entriesCount: 0,
        locations: []
      });
    }

    const cons = map.get(key)!;
    cons.entriesCount += 1;
    cons.locations.push({
      location: item.yardLocation,
      quantity: item.countedQuantity,
      countMode: item.countMode,
      gpsLocation: item.gpsLocation,
      timestamp: item.timestamp,
      countedBy: item.countedBy,
      notes: item.notes
    });

    // If an entry is marked 'total', it sets or updates the total count directly.
    // If marked 'cycle_additive', it accumulates onto previous counts for that plant.
    if (item.countMode === 'total') {
      cons.totalCountedQuantity = item.countedQuantity;
    } else {
      cons.totalCountedQuantity += item.countedQuantity;
    }

    cons.variance = cons.totalCountedQuantity - cons.masterStock;
    cons.varianceValue = cons.variance * cons.price;

    if (cons.variance === 0) {
      cons.status = 'exact';
    } else if (cons.variance > 0) {
      cons.status = 'over';
    } else {
      cons.status = 'under';
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calculates statistical summary for an audit session
 */
export function calculateAuditSummaryStats(items: InventoryCountItem[]): AuditSummaryStats {
  const consolidated = consolidateAuditItems(items);
  const locationSet = new Set<string>();

  let totalPhysicalUnits = 0;
  let totalBaselineUnits = 0;
  let netDollarVariance = 0;
  let exactMatchCount = 0;
  let overCount = 0;
  let underCount = 0;

  for (const item of consolidated) {
    totalPhysicalUnits += item.totalCountedQuantity;
    totalBaselineUnits += item.masterStock;
    netDollarVariance += item.varianceValue;

    if (item.status === 'exact') exactMatchCount++;
    else if (item.status === 'over') overCount++;
    else if (item.status === 'under') underCount++;

    item.locations.forEach(loc => locationSet.add(loc.location));
  }

  return {
    totalUniquePlants: consolidated.length,
    totalPhysicalUnits,
    totalBaselineUnits,
    netUnitVariance: totalPhysicalUnits - totalBaselineUnits,
    netDollarVariance,
    exactMatchCount,
    overCount,
    underCount,
    locationsCount: locationSet.size
  };
}

/**
 * Generates formatted CSV string for export
 */
export function generateAuditCsv(session: InventoryAuditSession): string {
  const headers = [
    'Session ID',
    'Audit Title',
    'Timestamp',
    'Counted By',
    'Item No / SKU',
    'Plant Name',
    'Botanical Name',
    'Size',
    'Category',
    'Barcode',
    'Yard Location / Bay',
    'GPS Latitude',
    'GPS Longitude',
    'GPS Accuracy (m)',
    'Count Mode',
    'Baseline Uploaded Stock',
    'Physically Counted Qty',
    'Variance (Diff)',
    'Unit Retail Price',
    'Notes'
  ];

  const rows = session.items.map(item => {
    const variance = item.countedQuantity - item.masterStock;
    const lat = item.gpsLocation?.latitude ? item.gpsLocation.latitude.toFixed(6) : '';
    const lng = item.gpsLocation?.longitude ? item.gpsLocation.longitude.toFixed(6) : '';
    const acc = item.gpsLocation?.accuracy ? item.gpsLocation.accuracy.toFixed(1) : '';

    return [
      `"${session.id}"`,
      `"${(session.title || 'Physical Count').replace(/"/g, '""')}"`,
      `"${new Date(item.timestamp).toLocaleString()}"`,
      `"${(item.countedBy || '').replace(/"/g, '""')}"`,
      `"${(item.itemNo || '').replace(/"/g, '""')}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.botanicalName || '').replace(/"/g, '""')}"`,
      `"${(item.size || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.barcode || '').replace(/"/g, '""')}"`,
      `"${(item.yardLocation || '').replace(/"/g, '""')}"`,
      lat,
      lng,
      acc,
      item.countMode === 'total' ? 'Total Inventory Count' : 'Cycle Count (Additive)',
      item.masterStock,
      item.countedQuantity,
      variance >= 0 ? `+${variance}` : `${variance}`,
      item.price ? `$${item.price.toFixed(2)}` : '$0.00',
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a client-side CSV download
 */
export function downloadAuditCsv(session: InventoryAuditSession) {
  const csvContent = generateAuditCsv(session);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (session.title || 'inventory_audit').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `MapleLane_InventoryAudit_${safeTitle}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an email report text summary
 */
export function generateAuditEmailReport(session: InventoryAuditSession): { subject: string; body: string } {
  const stats = calculateAuditSummaryStats(session.items);
  const consolidated = consolidateAuditItems(session.items);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const subject = `Maple Lane Nursery - Physical Inventory Audit: ${session.title || 'Yard Count'} (${dateStr})`;

  const lines: string[] = [];
  lines.push(`MAPLE LANE NURSERY - PHYSICAL INVENTORY AUDIT REPORT`);
  lines.push(`====================================================`);
  lines.push(`Audit Session: ${session.title || 'Physical Count'}`);
  lines.push(`Session ID: ${session.id}`);
  lines.push(`Date Completed: ${dateStr}`);
  lines.push(`Conducted By: ${session.countedBy || 'Staff'}`);
  lines.push(`Total Entries Logged: ${session.items.length}`);
  lines.push(``);

  lines.push(`--- SUMMARY METRICS ---`);
  lines.push(`Total Unique Plants Counted: ${stats.totalUniquePlants}`);
  lines.push(`Total Physical Units Counted: ${stats.totalPhysicalUnits}`);
  lines.push(`Baseline Uploaded Stock: ${stats.totalBaselineUnits}`);
  lines.push(`Net Unit Variance: ${stats.netUnitVariance >= 0 ? `+${stats.netUnitVariance}` : stats.netUnitVariance} units`);
  lines.push(`Net Estimated Value Variance: $${stats.netDollarVariance.toFixed(2)}`);
  lines.push(`Exact Match SKUs: ${stats.exactMatchCount}`);
  lines.push(`Over-Stock Discrepancies (+): ${stats.overCount}`);
  lines.push(`Under-Stock Discrepancies (-): ${stats.underCount}`);
  lines.push(`Yard Locations Counted: ${stats.locationsCount}`);
  lines.push(``);

  // Group by location
  const locationBreakdown = new Map<string, number>();
  session.items.forEach(i => {
    const loc = i.yardLocation || 'Unassigned';
    locationBreakdown.set(loc, (locationBreakdown.get(loc) || 0) + i.countedQuantity);
  });

  lines.push(`--- YARD LOCATION BREAKDOWN ---`);
  locationBreakdown.forEach((qty, loc) => {
    lines.push(`• ${loc}: ${qty} units counted`);
  });
  lines.push(``);

  // Discrepancy details
  const discrepancies = consolidated.filter(i => i.status !== 'exact');
  if (discrepancies.length > 0) {
    lines.push(`--- DISCREPANCY & VARIANCE HIGHLIGHTS (${discrepancies.length} items) ---`);
    discrepancies.forEach(d => {
      const sign = d.variance > 0 ? `+${d.variance}` : `${d.variance}`;
      const locStr = d.locations.map(l => `${l.location} (${l.quantity})`).join(', ');
      lines.push(`• [${d.itemNo}] ${d.name} (${d.size}): Counted=${d.totalCountedQuantity} | Baseline=${d.masterStock} | Var=${sign} | Locs: ${locStr}`);
      if (d.locations.some(l => l.notes)) {
        const notes = d.locations.map(l => l.notes).filter(Boolean).join('; ');
        lines.push(`  Notes: ${notes}`);
      }
    });
    lines.push(``);
  }

  lines.push(`--- FULL AUDITED INVENTORY LIST ---`);
  consolidated.forEach(item => {
    const sign = item.variance > 0 ? `+${item.variance}` : item.variance === 0 ? 'MATCH' : `${item.variance}`;
    lines.push(`[${item.itemNo}] ${item.name} | Size: ${item.size} | Baseline: ${item.masterStock} | Counted: ${item.totalCountedQuantity} | Var: ${sign}`);
    item.locations.forEach(loc => {
      const gpsStr = loc.gpsLocation ? ` | GPS: ${loc.gpsLocation.latitude.toFixed(4)}, ${loc.gpsLocation.longitude.toFixed(4)}` : '';
      const modeStr = loc.countMode === 'total' ? 'Total Count' : 'Cycle Additive';
      lines.push(`  └ Loc: ${loc.location} (${loc.quantity} qty, ${modeStr})${gpsStr}`);
    });
  });

  lines.push(``);
  lines.push(`Report generated via Maple Lane Nursery POS Manager.`);

  return {
    subject,
    body: lines.join('\n')
  };
}

/**
 * Creates mailto URL with subject and body
 */
export function createAuditMailtoUrl(recipientEmail: string, session: InventoryAuditSession): string {
  const { subject, body } = generateAuditEmailReport(session);
  const email = recipientEmail.trim() || 'pete@maplelanenursery.com';
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
