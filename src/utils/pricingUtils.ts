import { PlantItem, OrderCartItem, PlantSaleDiscount, DiscountType } from '../types';

export type PriceLevelKey = 'retail' | 'wholesale' | 'gardenCenter' | 'elite';

export interface PriceTierInfo {
  key: PriceLevelKey;
  levelNumber: string; // "1", "3", "4", "5"
  shortLabel: string; // "L1 Retail", "L3 Wholesale", "L4 Garden Ctr", "L5 Elite"
  name: string; // "Retail", "Wholesale", "Garden Center", "Elite"
  fullLabel: string; // "Level 1 - Retail (INV_PRC_1)"
  posField: string; // "INV_PRC_1", "INV_PRC_3", "INV_PRC_4", "INV_PRC_5"
  price: number;
  hasCustomConfiguredPrice: boolean;
}

/**
 * Checks whether a plant item has an active sale discount
 */
export function isPlantOnSale(plant?: PlantItem | null): boolean {
  if (!plant || !plant.saleDiscount) return false;
  return plant.saleDiscount.active !== false && plant.saleDiscount.value > 0;
}

/**
 * Computes exact sale price, savings dollar amount, and savings percentage
 */
export function calculateSalePrice(
  basePrice: number, 
  discount: { type: DiscountType; value: number }
): {
  salePrice: number;
  savingsAmount: number;
  savingsPercent: number;
} {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  let salePrice = safeBase;

  if (discount.type === 'fixed_price') {
    salePrice = Math.max(0, Number(discount.value) || 0);
  } else if (discount.type === 'percentage') {
    const pct = Math.max(0, Math.min(100, Number(discount.value) || 0));
    const savings = Number((safeBase * (pct / 100)).toFixed(2));
    salePrice = Math.max(0, Number((safeBase - savings).toFixed(2)));
  }

  const savingsAmount = Math.max(0, Number((safeBase - salePrice).toFixed(2)));
  const savingsPercent = safeBase > 0 ? Math.round((savingsAmount / safeBase) * 100) : 0;

  return {
    salePrice,
    savingsAmount,
    savingsPercent
  };
}

/**
 * Returns the active sale price for a plant, or null if not on sale
 */
export function getPlantSalePrice(plant?: PlantItem | null): number | null {
  if (!isPlantOnSale(plant)) return null;
  const baseRetail = plant!.prices?.retail !== undefined ? plant!.prices.retail : (plant!.price || 0);
  const { salePrice } = calculateSalePrice(baseRetail, plant!.saleDiscount!);
  return salePrice;
}

/**
 * Returns savings details for a plant on sale
 */
export function getPlantSaleSavings(plant?: PlantItem | null): {
  salePrice: number;
  regularPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  label?: string;
} | null {
  if (!isPlantOnSale(plant)) return null;
  const baseRetail = plant!.prices?.retail !== undefined ? plant!.prices.retail : (plant!.price || 0);
  const { salePrice, savingsAmount, savingsPercent } = calculateSalePrice(baseRetail, plant!.saleDiscount!);
  return {
    salePrice,
    regularPrice: baseRetail,
    savingsAmount,
    savingsPercent,
    label: plant!.saleDiscount!.saleLabel || `${savingsPercent}% OFF`
  };
}

/**
 * Returns all 4 standard POS price levels for a given plant
 */
export function getPlantPriceTiers(plant: PlantItem): PriceTierInfo[] {
  const baseRetail = plant.prices?.retail !== undefined ? plant.prices.retail : (plant.price || 0);
  
  const hasCustomWholesale = plant.prices?.wholesale !== undefined;
  const wholesale = hasCustomWholesale 
    ? plant.prices!.wholesale! 
    : (baseRetail > 0 ? Number((baseRetail * 0.75).toFixed(2)) : 0);

  const hasCustomGardenCenter = plant.prices?.gardenCenter !== undefined;
  const gardenCenter = hasCustomGardenCenter 
    ? plant.prices!.gardenCenter! 
    : (wholesale > 0 ? Number((wholesale * 0.90).toFixed(2)) : (baseRetail > 0 ? Number((baseRetail * 0.65).toFixed(2)) : 0));

  const hasCustomElite = plant.prices?.elite !== undefined;
  const elite = hasCustomElite 
    ? plant.prices!.elite! 
    : (gardenCenter > 0 ? Number((gardenCenter * 0.90).toFixed(2)) : (baseRetail > 0 ? Number((baseRetail * 0.55).toFixed(2)) : 0));

  return [
    {
      key: 'retail',
      levelNumber: '1',
      shortLabel: 'L1 Retail',
      name: 'Retail',
      fullLabel: 'Level 1 - Retail',
      posField: 'INV_PRC_1',
      price: baseRetail,
      hasCustomConfiguredPrice: plant.prices?.retail !== undefined || plant.price !== undefined
    },
    {
      key: 'wholesale',
      levelNumber: '3',
      shortLabel: 'L3 Wholesale',
      name: 'Wholesale',
      fullLabel: 'Level 3 - Wholesale',
      posField: 'INV_PRC_3',
      price: wholesale,
      hasCustomConfiguredPrice: hasCustomWholesale
    },
    {
      key: 'gardenCenter',
      levelNumber: '4',
      shortLabel: 'L4 Garden Ctr',
      name: 'Garden Center',
      fullLabel: 'Level 4 - Garden Center',
      posField: 'INV_PRC_4',
      price: gardenCenter,
      hasCustomConfiguredPrice: hasCustomGardenCenter
    },
    {
      key: 'elite',
      levelNumber: '5',
      shortLabel: 'L5 Elite',
      name: 'Elite',
      fullLabel: 'Level 5 - Elite / Volume',
      posField: 'INV_PRC_5',
      price: elite,
      hasCustomConfiguredPrice: hasCustomElite
    }
  ];
}

/**
 * Calculates the exact effective unit price for a cart item based on selected level and sale status
 */
export function getItemEffectiveUnitPrice(item: OrderCartItem): number {
  if (item.selectedPrice !== undefined && item.selectedPrice > 0) {
    return item.selectedPrice;
  }

  // If item or plant has an active sale discount and no custom non-retail level was selected
  const activeSale = item.saleDiscount || item.plant.saleDiscount;
  if (activeSale && activeSale.active !== false && (!item.selectedPriceLevel || item.selectedPriceLevel === 'retail')) {
    const baseRetail = item.originalPrice ?? (item.plant.prices?.retail !== undefined ? item.plant.prices.retail : item.plant.price);
    const { salePrice } = calculateSalePrice(baseRetail, activeSale);
    return salePrice;
  }

  if (item.selectedPriceLevel) {
    const tiers = getPlantPriceTiers(item.plant);
    const matched = tiers.find(t => t.key === item.selectedPriceLevel);
    if (matched && matched.price > 0) {
      return matched.price;
    }
  }

  return item.plant.price || 0;
}

/**
 * Determines which price level is active for a cart item
 */
export function getItemActivePriceLevelKey(item: OrderCartItem): PriceLevelKey {
  if (item.selectedPriceLevel && ['retail', 'wholesale', 'gardenCenter', 'elite'].includes(item.selectedPriceLevel)) {
    return item.selectedPriceLevel as PriceLevelKey;
  }

  if (item.selectedPrice !== undefined) {
    const tiers = getPlantPriceTiers(item.plant);
    const exactMatch = tiers.find(t => Math.abs(t.price - item.selectedPrice!) < 0.01);
    if (exactMatch) return exactMatch.key;
  }

  return 'retail';
}
