import { PlantItem, OrderCartItem } from '../types';

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
 * Calculates the exact effective unit price for a cart item based on selected level
 */
export function getItemEffectiveUnitPrice(item: OrderCartItem): number {
  if (item.selectedPrice !== undefined && item.selectedPrice > 0) {
    return item.selectedPrice;
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
