import Papa from 'papaparse';
import { PlantItem, PlantCulturalProfile, PlantCulturalFilterCriteria } from '../types';
import { isPlantOnSale } from '../utils/pricingUtils';

export interface ScoredPlantMatch {
  plant: PlantItem;
  profile: PlantCulturalProfile;
  score: number; // 0 - 100%
  totalCriteria: number;
  matchedCriteria: number;
  isBestMatch: boolean;
  matchDetails: {
    height: { matched: boolean; selected?: string; actual: string };
    foliage: { matched: boolean; selected?: string; actual: string };
    flowerColor: { matched: boolean; selected?: string; actual: string };
    fallColor: { matched: boolean; selected?: string; actual: string };
    category: { matched: boolean; selected?: string; actual: string };
    sun: { matched: boolean; selected?: string; actual: string };
    soil: { matched: boolean; selected?: string; actual: string };
    deer: { matched: boolean; selected?: string; actual: string };
  };
}

let cachedProfiles: PlantCulturalProfile[] = [];
let isLoaded = false;
let loadPromise: Promise<PlantCulturalProfile[]> | null = null;

/**
 * Normalizes text for comparison (lower-case, remove punctuation, quotes, trademarks)
 */
export function normalizePlantName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[®™©'"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses height dimensions from text like "3-5' x 2-3'", "15-20 ft x 15-20 ft", "10-12 in x 10-12 in"
 */
function parseHeightDimensions(rawSize: string): { minFeet: number; maxFeet: number; display: string; category: PlantCulturalProfile['heightCategory'] } {
  if (!rawSize) {
    return { minFeet: 4, maxFeet: 6, display: '3-6 ft', category: '3_to_6ft' };
  }

  const clean = rawSize.replace(/[–—]/g, '-').trim();
  const heightPart = clean.split('x')[0].trim();

  const isInch = /in\b|inch|"|”/i.test(heightPart);
  const numbers = heightPart.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || [];

  let min = 0;
  let max = 0;

  if (numbers.length >= 2) {
    min = numbers[0];
    max = numbers[1];
  } else if (numbers.length === 1) {
    min = numbers[0] * 0.8;
    max = numbers[0];
  } else {
    min = 3;
    max = 5;
  }

  if (isInch) {
    min = min / 12;
    max = max / 12;
  }

  // Determine category
  let category: PlantCulturalProfile['heightCategory'] = '3_to_6ft';
  if (max <= 1.25) {
    category = 'groundcover';
  } else if (max < 3) {
    category = 'under_3ft';
  } else if (max <= 6) {
    category = '3_to_6ft';
  } else if (max <= 12) {
    category = '6_to_12ft';
  } else if (max <= 25) {
    category = '12_to_25ft';
  } else {
    category = 'over_25ft';
  }

  const display = heightPart.includes('ft') || heightPart.includes("'") || heightPart.includes('"') || heightPart.includes('in')
    ? heightPart
    : `${min}-${max} ft`;

  return { minFeet: Math.round(min * 10) / 10, maxFeet: Math.round(max * 10) / 10, display, category };
}

/**
 * Parses flower color list from flower string
 */
function extractFlowerColors(str: string): string[] {
  if (!str) return ['None'];
  const s = str.toLowerCase();
  const colors: string[] = [];

  if (s.includes('white') || s.includes('cream') || s.includes('ivory') || s.includes('snow')) colors.push('White');
  if (s.includes('pink') || s.includes('rose') || s.includes('blush') || s.includes('fuchsia') || s.includes('magenta')) colors.push('Pink');
  if (s.includes('red') || s.includes('crimson') || s.includes('scarlet') || s.includes('ruby') || s.includes('cherry')) colors.push('Red');
  if (s.includes('purple') || s.includes('violet') || s.includes('lavender') || s.includes('amethyst') || s.includes('plum') || s.includes('orchid')) colors.push('Purple');
  if (s.includes('yellow') || s.includes('gold') || s.includes('lemon') || s.includes('canary') || s.includes('chartreuse') || s.includes('amber')) colors.push('Yellow');
  if (s.includes('blue') || s.includes('cobalt') || s.includes('sky-blue') || s.includes('periwinkle') || s.includes('azure')) colors.push('Blue');
  if (s.includes('orange') || s.includes('apricot') || s.includes('coral') || s.includes('peach') || s.includes('tangerine') || s.includes('terracotta') || s.includes('copper')) colors.push('Orange');

  if (colors.length === 0 || s.includes('inconspicuous') || s.includes('rarely') || s.includes('non-flowering') || s.includes('n/a') || s.includes('none')) {
    if (colors.length === 0) colors.push('None');
  }

  return colors;
}

/**
 * Parses fall foliage color from description
 */
function extractFallColors(str: string, foliageType: string): string[] {
  if (foliageType === 'evergreen') return ['None'];
  if (!str) return ['Yellow'];
  const s = str.toLowerCase();
  const colors: string[] = [];

  if (s.includes('red') || s.includes('crimson') || s.includes('scarlet') || s.includes('burgundy') || s.includes('wine')) colors.push('Red');
  if (s.includes('orange') || s.includes('apricot') || s.includes('copper') || s.includes('pumpkin')) colors.push('Orange');
  if (s.includes('yellow') || s.includes('gold') || s.includes('amber')) colors.push('Yellow');
  if (s.includes('purple') || s.includes('bronze') || s.includes('mahogany')) colors.push('Purple');

  if (colors.length === 0) {
    if (s.includes('evergreen') || s.includes('minimal') || s.includes('none')) {
      colors.push('None');
    } else {
      colors.push('Yellow');
    }
  }

  return colors;
}

/**
 * Parses sun categories
 */
function extractSunCategories(str: string): ('Full Sun' | 'Partial Sun' | 'Full Shade')[] {
  if (!str) return ['Full Sun', 'Partial Sun'];
  const s = str.toLowerCase();
  const categories: ('Full Sun' | 'Partial Sun' | 'Full Shade')[] = [];

  if (s.includes('full sun') || s.includes('sun to') || (s.includes('sun') && !s.includes('shade only'))) {
    categories.push('Full Sun');
  }
  if (s.includes('part sun') || s.includes('partial sun') || s.includes('part shade') || s.includes('partial shade') || s.includes('part sun to sun')) {
    if (!categories.includes('Partial Sun')) categories.push('Partial Sun');
  }
  if (s.includes('full shade') || s.includes('part shade to full shade') || (s.includes('shade') && !s.includes('sun only'))) {
    if (!categories.includes('Full Shade')) categories.push('Full Shade');
  }

  if (categories.length === 0) categories.push('Full Sun', 'Partial Sun');
  return categories;
}

/**
 * Parses soil moisture category
 */
function extractSoilCategory(str: string): PlantCulturalProfile['soilMoistureCategory'] {
  if (!str) return 'Moist, Well-Drained';
  const s = str.toLowerCase();
  if (s.includes('wet') || s.includes('marsh') || s.includes('bog') || s.includes('flooding') || s.includes('poorly drained') || s.includes('swamp')) {
    return 'Wet / Poor Drainage';
  }
  if (s.includes('dry') || s.includes('drought') || s.includes('sandy') || s.includes('gravel') || s.includes('rocky') || s.includes('lean') || s.includes('poor')) {
    return 'Dry / Drought Tolerant';
  }
  if (s.includes('adaptable')) {
    return 'Adaptable';
  }
  return 'Moist, Well-Drained';
}

/**
 * Parses broad category type
 */
function extractCategoryType(catStr: string, name: string): PlantCulturalProfile['categoryType'] {
  const s = (catStr + ' ' + name).toLowerCase();

  if (s.includes('grass') || s.includes('calamagrostis') || s.includes('carex') || s.includes('miscanthus') || s.includes('panicum') || s.includes('pennisetum') || s.includes('schizachyrium') || s.includes('festuca')) {
    return 'Grass';
  }
  if (s.includes('conifer') || s.includes('needled') || s.includes('spruce') || s.includes('pine') || s.includes('picea') || s.includes('pinus') || s.includes('abies') || s.includes('thuja') || s.includes('juniper') || s.includes('taxus') || s.includes('chamaecyparis') || s.includes('tsuga')) {
    return 'Conifer';
  }
  if (s.includes('shade tree') || s.includes('maple') || s.includes('acer rubrum') || s.includes('acer saccharum') || s.includes('quercus') || s.includes('oak') || s.includes('betula') || s.includes('birch') || s.includes('ulmus') || s.includes('elm') || s.includes('fagus') || s.includes('ginkgo') || s.includes('tilia')) {
    return 'Shade Tree';
  }
  if (s.includes('flowering tree') || s.includes('ornamental tree') || s.includes('fruit tree') || s.includes('crabapple') || s.includes('dogwood') || s.includes('cornus') || s.includes('cercis') || s.includes('redbud') || s.includes('magnolia') || s.includes('malus') || s.includes('prunus') || s.includes('amelanchier') || s.includes('serviceberry')) {
    return 'Ornamental Tree';
  }
  if (s.includes('vine') || s.includes('clematis') || s.includes('wisteria') || s.includes('lonicera') || s.includes('honeysuckle') || s.includes('parthenocissus') || s.includes('campsis')) {
    return 'Vine';
  }
  if (s.includes('groundcover') || s.includes('ajuga') || s.includes('vinca') || s.includes('sedum spur') || s.includes('thymus') || s.includes('pachysandra') || s.includes('galium')) {
    return 'Groundcover';
  }
  if (s.includes('shrub') || s.includes('hydrangea') || s.includes('spiraea') || s.includes('spirea') || s.includes('buxus') || s.includes('boxwood') || s.includes('viburnum') || s.includes('weigela') || s.includes('syringa') || s.includes('lilac') || s.includes('physocarpus') || s.includes('ninebark') || s.includes('ilex') || s.includes('holly') || s.includes('clethra') || s.includes('potentilla') || s.includes('aronia') || s.includes('azalea') || s.includes('rhododendron') || s.includes('rosa') || s.includes('rose')) {
    return 'Shrub';
  }

  return 'Perennial';
}

/**
 * Parses deer resistance from positives and negatives text
 */
function extractDeerResistance(positives: string, negatives: string, name: string): PlantCulturalProfile['deerResistance'] {
  const p = (positives || '').toLowerCase();
  const n = (negatives || '').toLowerCase();
  const nm = (name || '').toLowerCase();

  // Known deer delicacies
  if (nm.includes('hosta') || nm.includes('hemerocallis') || nm.includes('daylily') || nm.includes('thuja o.') || nm.includes('smaragd') || nm.includes('emerald green') || nm.includes('taxus') || nm.includes('yew')) {
    return 'Low';
  }

  if (n.includes('deer browse') || n.includes('deer food') || n.includes('deer target') || n.includes('deer attraction') || n.includes('deer damage') || n.includes('deer will eat')) {
    return 'Low';
  }

  if (p.includes('deer resistant') || p.includes('deer proof') || p.includes('deer & rabbit resistant') || p.includes('rabbit/deer resistant') || p.includes('deer/rabbit resistant') || p.includes('deer and rabbit proof')) {
    return 'High';
  }

  return 'Moderate';
}

/**
 * Parses foliage type from text
 */
function extractFoliageType(colorChange: string, habit: string, category: string, name: string): PlantCulturalProfile['foliageType'] {
  const text = (colorChange + ' ' + habit + ' ' + category + ' ' + name).toLowerCase();

  if (text.includes('semi-evergreen')) {
    return 'semi-evergreen';
  }
  if (text.includes('evergreen') || text.includes('year-round') || text.includes('conifer') || text.includes('needled') || text.includes('pine') || text.includes('spruce') || text.includes('arborvitae') || text.includes('thuja') || text.includes('boxwood') || text.includes('buxus') || text.includes('juniper') || text.includes('yew') || text.includes('rhododendron catawbiense')) {
    return 'evergreen';
  }
  return 'deciduous';
}

/**
 * Parses raw CSV rows into PlantCulturalProfile objects
 */
export function parseCulturalCsv(csvContent: string): PlantCulturalProfile[] {
  const parsed = Papa.parse<string[]>(csvContent, {
    skipEmptyLines: false,
    header: false,
  });

  const profiles: PlantCulturalProfile[] = [];
  const rows = parsed.data;

  let isGrassSection = true;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Detect section transitions or empty spacer rows
    const firstNonEmpty = row.find(cell => cell && cell.trim().length > 0)?.trim();
    if (!firstNonEmpty) continue;

    if (firstNonEmpty === 'Grass Name' || firstNonEmpty.includes('Grass Name')) {
      isGrassSection = true;
      continue;
    }
    if (firstNonEmpty === 'Plant Name' || firstNonEmpty.includes('Plant Name')) {
      isGrassSection = false;
      continue;
    }

    // Row parsing based on section
    let name = '';
    let sunReq = '';
    let size = '';
    let habit = '';
    let foliageColor = '';
    let bloomColor = '';
    let colorChange = '';
    let soil = '';
    let positives = '';
    let negatives = '';
    let category = '';
    let fruiting = '';

    if (isGrassSection) {
      // Index mapping for grass section:
      // [1]: Grass Name, [2]: Sun, [3]: Size, [4]: Habit, [5]: Grass Color, [6]: Seed Head Color, [7]: Color Change, [8]: Soil, [9]: Positives, [10]: Negatives
      name = (row[1] || '').trim();
      sunReq = (row[2] || '').trim();
      size = (row[3] || '').trim();
      habit = (row[4] || '').trim();
      foliageColor = (row[5] || '').trim();
      bloomColor = (row[6] || '').trim();
      colorChange = (row[7] || '').trim();
      soil = (row[8] || '').trim();
      positives = (row[9] || row[11] || '').trim();
      negatives = (row[10] || row[12] || '').trim();
      category = 'Ornamental Grass';
    } else {
      // Index mapping for plant section:
      // [1]: Plant Name, [2]: Sun, [3]: Size, [4]: Habit, [5]: Foliage, [6]: Seed/Flower, [7]: Color Change, [8]: Soil, [9]: Fruiting, [10]: Category, [11]: Positives, [12]: Negatives
      name = (row[1] || '').trim();
      sunReq = (row[2] || '').trim();
      size = (row[3] || '').trim();
      habit = (row[4] || '').trim();
      foliageColor = (row[5] || '').trim();
      bloomColor = (row[6] || '').trim();
      colorChange = (row[7] || '').trim();
      soil = (row[8] || '').trim();
      fruiting = (row[9] || '').trim();
      category = (row[10] || '').trim();
      positives = (row[11] || '').trim();
      negatives = (row[12] || '').trim();
    }

    if (!name || name === 'Grass Name' || name === 'Plant Name') continue;

    const categoryType = extractCategoryType(category, name);
    const heightData = parseHeightDimensions(size);
    if ((categoryType === 'Groundcover' || (habit && (habit.toLowerCase().includes('groundcover') || habit.toLowerCase().includes('creeping') || habit.toLowerCase().includes('mat-forming') || habit.toLowerCase().includes('prostrate') || habit.toLowerCase().includes('trailing')))) && heightData.maxFeet <= 2) {
      heightData.category = 'groundcover';
    }

    const folType = extractFoliageType(colorChange, habit, category, name);
    const flowerColors = extractFlowerColors(bloomColor);
    const fallColors = extractFallColors(colorChange, folType);
    const sunCategories = extractSunCategories(sunReq);
    const soilMoisture = extractSoilCategory(soil);
    const deer = extractDeerResistance(positives, negatives, name);
    const spread = size.includes('x') ? size.split('x')[1].trim() : (size || 'Varies');


    profiles.push({
      name,
      sunRequirements: sunReq || 'Full Sun',
      sunCategories,
      heightRange: heightData.display,
      minHeightFeet: heightData.minFeet,
      maxHeightFeet: heightData.maxFeet,
      heightCategory: heightData.category,
      spread,
      growthHabit: habit || 'Upright',
      foliageColor: foliageColor || 'Green',
      flowerColor: bloomColor || 'Inconspicuous',
      flowerColorList: flowerColors,
      fallColorChange: colorChange || 'Golden in fall',
      fallColors,
      foliageType: folType,
      soilConditions: soil || 'Moist, well-drained',
      soilMoistureCategory: soilMoisture,
      categoryType,
      deerResistance: deer,
      positives,
      negatives,
      fruitingInfo: fruiting,
    });
  }

  return profiles;
}

/**
 * Loads and caches Counterpoint cultural data from the local CSV asset
 */
export async function loadCounterpointCulturalData(): Promise<PlantCulturalProfile[]> {
  if (isLoaded && cachedProfiles.length > 0) {
    return cachedProfiles;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/assets/aistudio/Nursery_Plants_-_Cultural_information_-_Main_2932d36a.csv');
      if (!response.ok) {
        throw new Error(`Failed to load cultural CSV: ${response.statusText}`);
      }
      const text = await response.text();
      cachedProfiles = parseCulturalCsv(text);
      isLoaded = true;
      return cachedProfiles;
    } catch (err) {
      console.warn('Cultural CSV load failed; operating with fallback profiles:', err);
      cachedProfiles = FALLBACK_PROFILES;
      isLoaded = true;
      return cachedProfiles;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Matches a nursery plant item to its Counterpoint cultural profile
 */
export function resolvePlantCulturalProfile(plant: PlantItem, profiles: PlantCulturalProfile[] = cachedProfiles): PlantCulturalProfile {
  if (plant.culturalProfile) return plant.culturalProfile;

  const pName = normalizePlantName(plant.name);
  const pBotanical = normalizePlantName(plant.botanicalName || plant.descr || '');
  const pItemNo = (plant.itemNo || '').toLowerCase();

  // 1. Direct or fuzzy match against loaded profiles
  let bestMatch: PlantCulturalProfile | null = null;
  let bestScore = 0;

  for (const prof of profiles) {
    const profName = normalizePlantName(prof.name);

    if (profName === pBotanical || profName === pName) {
      return prof;
    }

    // Token overlap scoring
    const plantTokens = `${pName} ${pBotanical}`.split(' ').filter(t => t.length > 2);
    const profTokens = profName.split(' ').filter(t => t.length > 2);

    let shared = 0;
    for (const t of profTokens) {
      if (plantTokens.includes(t)) shared++;
    }

    const overlap = profTokens.length > 0 ? shared / profTokens.length : 0;
    if (overlap > bestScore && overlap >= 0.5) {
      bestScore = overlap;
      bestMatch = prof;
    }
  }

  if (bestMatch && bestScore >= 0.6) {
    return bestMatch;
  }

  // 2. Fallback smart inference based on plant genus / category
  return generateInferredProfile(plant);
}

/**
 * Smart botanical fallback when plant is not directly in the CSV
 */
function generateInferredProfile(plant: PlantItem): PlantCulturalProfile {
  const full = `${plant.name} ${plant.botanicalName || ''} ${plant.descr || ''} ${plant.category || ''}`.toLowerCase();

  const isEvergreen = full.includes('everg') || full.includes('arborvitae') || full.includes('boxwood') || full.includes('spruce') || full.includes('pine') || full.includes('yew') || full.includes('thuja') || full.includes('buxus') || full.includes('juniper') || full.includes('holly') || full.includes('ilex');
  const isTree = full.includes('tree') || full.includes('maple') || full.includes('oak') || full.includes('birch') || full.includes('dogwood') || full.includes('crabapple');
  const isGrass = full.includes('grass') || full.includes('carex') || full.includes('miscanthus') || full.includes('calamagrostis');

  let heightCategory: PlantCulturalProfile['heightCategory'] = '3_to_6ft';
  let heightDisplay = '3-6 ft';
  let minHeight = 3;
  let maxHeight = 6;

  if (isTree) {
    heightCategory = full.includes('ornamental') || full.includes('dogwood') || full.includes('redbud') ? '12_to_25ft' : 'over_25ft';
    heightDisplay = heightCategory === '12_to_25ft' ? '15-20 ft' : '40-60 ft';
    minHeight = heightCategory === '12_to_25ft' ? 15 : 40;
    maxHeight = heightCategory === '12_to_25ft' ? 20 : 60;
  } else if (full.includes('spiraea') || full.includes('dwarf') || full.includes('compact') || full.includes('groundcover')) {
    heightCategory = 'under_3ft';
    heightDisplay = '2-3 ft';
    minHeight = 2;
    maxHeight = 3;
  }

  const flowerColors = extractFlowerColors(full);
  const fallColors = extractFallColors(full, isEvergreen ? 'evergreen' : 'deciduous');

  let categoryType: PlantCulturalProfile['categoryType'] = 'Shrub';
  if (isGrass) categoryType = 'Grass';
  else if (isEvergreen && isTree) categoryType = 'Conifer';
  else if (isTree) categoryType = 'Shade Tree';

  let deer: PlantCulturalProfile['deerResistance'] = 'Moderate';
  if (full.includes('boxwood') || full.includes('spirea') || full.includes('barberry') || full.includes('grass')) deer = 'High';
  if (full.includes('hosta') || full.includes('arborvitae') || full.includes('yew') || full.includes('daylily')) deer = 'Low';

  return {
    name: plant.botanicalName || plant.name,
    sunRequirements: 'Full Sun to Part Shade',
    sunCategories: ['Full Sun', 'Partial Sun'],
    heightRange: heightDisplay,
    minHeightFeet: minHeight,
    maxHeightFeet: maxHeight,
    heightCategory,
    spread: '3-4 ft',
    growthHabit: 'Mounded',
    foliageColor: 'Green',
    flowerColor: flowerColors.join(', '),
    flowerColorList: flowerColors,
    fallColorChange: isEvergreen ? 'Evergreen' : 'Yellow/Orange in autumn',
    fallColors,
    foliageType: isEvergreen ? 'evergreen' : 'deciduous',
    soilConditions: 'Moist, well-drained',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType,
    deerResistance: deer,
    positives: 'Nursery hardy, adaptable, landscape specimen',
    negatives: 'Needs standard watering during establishment'
  };
}

/**
 * Evaluates inventory plants against customer criteria with graded scoring
 */
export function scoreAndFilterPlants(
  inventory: PlantItem[],
  criteria: PlantCulturalFilterCriteria,
  profiles: PlantCulturalProfile[] = cachedProfiles
): { bestMatches: ScoredPlantMatch[]; closeMatches: ScoredPlantMatch[] } {
  // Count how many criteria are actively requested by the user
  const activeFields: { key: keyof PlantCulturalFilterCriteria; weight: number }[] = [];

  if (criteria.heightCategory) activeFields.push({ key: 'heightCategory', weight: 1 });
  if (criteria.foliageType) activeFields.push({ key: 'foliageType', weight: 1 });
  if (criteria.flowerColor) activeFields.push({ key: 'flowerColor', weight: 1 });
  if (criteria.fallColor) activeFields.push({ key: 'fallColor', weight: 1 });
  if (criteria.categoryType) activeFields.push({ key: 'categoryType', weight: 1 });
  if (criteria.sunExposure) activeFields.push({ key: 'sunExposure', weight: 1 });
  if (criteria.soilMoisture) activeFields.push({ key: 'soilMoisture', weight: 1 });
  if (criteria.deerResistance) activeFields.push({ key: 'deerResistance', weight: 1 });

  const totalCriteria = activeFields.length;

  const scoredList: ScoredPlantMatch[] = [];

  for (const plant of inventory) {
    // If inStockOnly is active, exclude out of stock items
    if (criteria.inStockOnly && (plant.stock === undefined || plant.stock <= 0)) {
      continue;
    }

    // If onSaleOnly is active, exclude plants not currently on sale
    if (criteria.onSaleOnly && !isPlantOnSale(plant)) {
      continue;
    }

    const profile = resolvePlantCulturalProfile(plant, profiles);

    // If no criteria are selected, all plants match 100%
    if (totalCriteria === 0) {
      scoredList.push({
        plant,
        profile,
        score: 100,
        totalCriteria: 0,
        matchedCriteria: 0,
        isBestMatch: true,
        matchDetails: {
          height: { matched: true, actual: profile.heightRange },
          foliage: { matched: true, actual: profile.foliageType },
          flowerColor: { matched: true, actual: profile.flowerColorList.join(', ') },
          fallColor: { matched: true, actual: profile.fallColors.join(', ') },
          category: { matched: true, actual: profile.categoryType },
          sun: { matched: true, actual: profile.sunRequirements },
          soil: { matched: true, actual: profile.soilMoistureCategory },
          deer: { matched: true, actual: profile.deerResistance },
        }
      });
      continue;
    }

    let matchedCount = 0;

    // 1. Height match
    const matchesHeight = criteria.heightCategory ? (
      criteria.heightCategory === 'groundcover'
        ? (profile.heightCategory === 'groundcover' || profile.categoryType === 'Groundcover' || (profile.growthHabit && (profile.growthHabit.toLowerCase().includes('groundcover') || profile.growthHabit.toLowerCase().includes('creeping') || profile.growthHabit.toLowerCase().includes('mat-forming'))) || profile.maxHeightFeet <= 1.5)
        : criteria.heightCategory === 'under_3ft'
        ? (profile.heightCategory === 'under_3ft' || profile.heightCategory === 'groundcover')
        : profile.heightCategory === criteria.heightCategory
    ) : true;
    if (criteria.heightCategory && matchesHeight) matchedCount++;

    // 2. Foliage match
    const matchesFoliage = criteria.foliageType ? (profile.foliageType === criteria.foliageType || (profile.foliageType === 'semi-evergreen' && criteria.foliageType === 'evergreen')) : true;
    if (criteria.foliageType && matchesFoliage) matchedCount++;

    // 3. Flower color match
    const matchesFlower = criteria.flowerColor ? profile.flowerColorList.includes(criteria.flowerColor) : true;
    if (criteria.flowerColor && matchesFlower) matchedCount++;

    // 4. Fall color match
    const matchesFall = criteria.fallColor ? profile.fallColors.includes(criteria.fallColor) : true;
    if (criteria.fallColor && matchesFall) matchedCount++;

    // 5. Category match
    const matchesCat = criteria.categoryType ? profile.categoryType === criteria.categoryType : true;
    if (criteria.categoryType && matchesCat) matchedCount++;

    // 6. Sun match
    const matchesSun = criteria.sunExposure ? profile.sunCategories.includes(criteria.sunExposure) : true;
    if (criteria.sunExposure && matchesSun) matchedCount++;

    // 7. Soil moisture match
    const matchesSoil = criteria.soilMoisture ? (profile.soilMoistureCategory === criteria.soilMoisture || profile.soilMoistureCategory === 'Adaptable') : true;
    if (criteria.soilMoisture && matchesSoil) matchedCount++;

    // 8. Deer resistance match
    const matchesDeer = criteria.deerResistance ? (
      criteria.deerResistance === 'High' ? profile.deerResistance === 'High' :
      criteria.deerResistance === 'Moderate' ? (profile.deerResistance === 'High' || profile.deerResistance === 'Moderate') :
      true
    ) : true;
    if (criteria.deerResistance && matchesDeer) matchedCount++;

    const score = Math.round((matchedCount / totalCriteria) * 100);

    scoredList.push({
      plant,
      profile,
      score,
      totalCriteria,
      matchedCriteria: matchedCount,
      isBestMatch: score === 100,
      matchDetails: {
        height: { matched: matchesHeight, selected: criteria.heightCategory, actual: profile.heightRange },
        foliage: { matched: matchesFoliage, selected: criteria.foliageType, actual: profile.foliageType },
        flowerColor: { matched: matchesFlower, selected: criteria.flowerColor, actual: profile.flowerColorList.join(', ') },
        fallColor: { matched: matchesFall, selected: criteria.fallColor, actual: profile.fallColors.join(', ') },
        category: { matched: matchesCat, selected: criteria.categoryType, actual: profile.categoryType },
        sun: { matched: matchesSun, selected: criteria.sunExposure, actual: profile.sunRequirements },
        soil: { matched: matchesSoil, selected: criteria.soilMoisture, actual: profile.soilMoistureCategory },
        deer: { matched: matchesDeer, selected: criteria.deerResistance, actual: profile.deerResistance },
      }
    });
  }

  // Sort best matches (100%) and close matches (>= 50% and < 100%)
  const bestMatches = scoredList
    .filter(m => m.score === 100)
    .sort((a, b) => compareMatches(a, b, criteria));

  const closeMatches = scoredList
    .filter(m => m.score >= 50 && m.score < 100)
    .sort((a, b) => compareMatches(a, b, criteria));

  return { bestMatches, closeMatches };
}

/**
 * Computes attribute closeness / affinity tier for sorting matches.
 * Lowest number = best / most ideal fit for the customer's requested attribute.
 */
function getMatchAttributeTier(
  match: ScoredPlantMatch, 
  criteria: PlantCulturalFilterCriteria
): number {
  const { profile } = match;
  let penalty = 0;

  // 1. Height Category Sorting / Groundcover Priority
  // When looking for Groundcover, true lowest-growing plants MUST be shown first:
  // Tier 1: Ultra-low / Mat groundcovers (< 6 in / <= 0.55 ft)
  // Tier 2: Classic low groundcovers (6-12 in / 0.55-1.05 ft)
  // Tier 3: Spreading / Knee-high (12-18 in / 1.05-1.55 ft)
  // Tier 4: Tall groundcovers / sprawling (> 18 in / > 1.55 ft)
  if (criteria.heightCategory === 'groundcover' || criteria.categoryType === 'Groundcover') {
    if (profile.maxHeightFeet <= 0.55) {
      penalty += 100;
    } else if (profile.maxHeightFeet <= 1.05) {
      penalty += 200;
    } else if (profile.maxHeightFeet <= 1.55) {
      penalty += 300;
    } else {
      penalty += 400;
    }
  } else if (criteria.heightCategory === 'under_3ft') {
    if (profile.maxHeightFeet <= 1.55) {
      penalty += 100;
    } else if (profile.maxHeightFeet <= 3.05) {
      penalty += 200;
    } else {
      penalty += 300;
    }
  } else if (criteria.heightCategory === 'over_25ft') {
    if (profile.maxHeightFeet >= 40) {
      penalty += 100;
    } else if (profile.maxHeightFeet >= 25) {
      penalty += 200;
    } else {
      penalty += 300;
    }
  } else if (criteria.heightCategory === '3_to_6ft') {
    const dist = Math.abs(profile.maxHeightFeet - 4.5);
    penalty += Math.round(dist * 20);
  } else if (criteria.heightCategory === '6_to_12ft') {
    const dist = Math.abs(profile.maxHeightFeet - 9);
    penalty += Math.round(dist * 20);
  } else if (criteria.heightCategory === '12_to_25ft') {
    const dist = Math.abs(profile.maxHeightFeet - 18.5);
    penalty += Math.round(dist * 20);
  }

  // 2. Category Type specificity
  if (criteria.categoryType && criteria.categoryType !== 'Groundcover') {
    if (profile.categoryType === criteria.categoryType) {
      penalty += 0;
    } else {
      penalty += 50;
    }
  }

  // 3. Foliage Type specificity
  if (criteria.foliageType === 'evergreen') {
    if (profile.foliageType === 'evergreen') {
      penalty += 0;
    } else {
      penalty += 25; // semi-evergreen
    }
  }

  // 4. Deer Resistance specificity
  if (criteria.deerResistance === 'High') {
    if (profile.deerResistance === 'High') {
      penalty += 0;
    } else {
      penalty += 30; // moderate
    }
  }

  return penalty;
}

/**
 * Compares two plant matches:
 * 1. Score descending (100% matches first, then close matches)
 * 2. Attribute affinity / best fit tier ascending (best match first)
 * 3. Alphabetical by plant common name
 */
function compareMatches(
  a: ScoredPlantMatch, 
  b: ScoredPlantMatch, 
  criteria: PlantCulturalFilterCriteria
): number {
  // 1. Overall match score
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  // 2. Attribute fit tier
  const tierA = getMatchAttributeTier(a, criteria);
  const tierB = getMatchAttributeTier(b, criteria);
  if (tierA !== tierB) {
    return tierA - tierB;
  }

  // 3. Alphabetical by plant name
  return a.plant.name.localeCompare(b.plant.name);
}

// Fallback baseline profiles for instant zero-latency loading
const FALLBACK_PROFILES: PlantCulturalProfile[] = [
  {
    name: 'Calamagrostis Karl Foerster',
    sunRequirements: 'Full Sun to Part Shade',
    sunCategories: ['Full Sun', 'Partial Sun'],
    heightRange: "3-5' x 2-3'",
    minHeightFeet: 3,
    maxHeightFeet: 5,
    heightCategory: '3_to_6ft',
    spread: '2-3 ft',
    growthHabit: 'Strictly upright, clumping',
    foliageColor: 'Rich green',
    flowerColor: 'Purplish turning tan/wheat',
    flowerColorList: ['Purple', 'Yellow'],
    fallColorChange: 'Green fades to tan, seed heads turn golden wheat',
    fallColors: ['Yellow'],
    foliageType: 'deciduous',
    soilConditions: 'Tolerates heavy clay and wet soils',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType: 'Grass',
    deerResistance: 'High',
    positives: 'Early bloomer, strict upright habit, clay tolerant, deer resistant',
    negatives: 'Needs more moisture in intense heat'
  },
  {
    name: 'Hydrangea a. Annabelle',
    sunRequirements: 'Part Sun to Sun',
    sunCategories: ['Full Sun', 'Partial Sun'],
    heightRange: "3-5' x 4-6'",
    minHeightFeet: 3,
    maxHeightFeet: 5,
    heightCategory: '3_to_6ft',
    spread: '4-6 ft',
    growthHabit: 'Mounded',
    foliageColor: 'Green',
    flowerColor: 'White',
    flowerColorList: ['White'],
    fallColorChange: 'Insignificant',
    fallColors: ['Yellow'],
    foliageType: 'deciduous',
    soilConditions: 'Moist, well-drained, prefers consistent moisture',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType: 'Shrub',
    deerResistance: 'Moderate',
    positives: 'Blooms on new wood, very cold hardy, native to US',
    negatives: 'Can flop under heavy rain, requires pruning'
  },
  {
    name: 'Thuja o. Smaragd',
    sunRequirements: 'Full Sun to Part Shade',
    sunCategories: ['Full Sun', 'Partial Sun'],
    heightRange: "12-14 ft x 3-4 ft",
    minHeightFeet: 12,
    maxHeightFeet: 14,
    heightCategory: '12_to_25ft',
    spread: '3-4 ft',
    growthHabit: 'Narrow Pyramidal',
    foliageColor: 'Emerald Green',
    flowerColor: 'Non-flowering (Small Cones)',
    flowerColorList: ['None'],
    fallColorChange: 'Bright emerald green foliage holds color year-round',
    fallColors: ['None'],
    foliageType: 'evergreen',
    soilConditions: 'Moist, well-drained soil',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType: 'Conifer',
    deerResistance: 'Low',
    positives: 'Classic privacy screen, exceptional bright green color, windbreak',
    negatives: 'Subject to severe deer damage in winter'
  },
  {
    name: 'Buxus x Green Velvet',
    sunRequirements: 'Full Sun to Part Shade',
    sunCategories: ['Full Sun', 'Partial Sun'],
    heightRange: "3-4 ft x 3-4 ft",
    minHeightFeet: 3,
    maxHeightFeet: 4,
    heightCategory: '3_to_6ft',
    spread: '3-4 ft',
    growthHabit: 'Full, rounded, mounded',
    foliageColor: 'Deep green',
    flowerColor: 'Inconspicuous small flowers',
    flowerColorList: ['None'],
    fallColorChange: 'Evergreen; excellent winter green retention',
    fallColors: ['None'],
    foliageType: 'evergreen',
    soilConditions: 'Moist, well-drained soil',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType: 'Shrub',
    deerResistance: 'High',
    positives: 'Deer resistant, rabbit resistant, retains green color in winter, very hardy',
    negatives: 'Toxic to pets, slow-growing'
  },
  {
    name: 'Spiraea jap. Little Princess',
    sunRequirements: 'Full Sun',
    sunCategories: ['Full Sun'],
    heightRange: "2-3 ft x 3-4 ft",
    minHeightFeet: 2,
    maxHeightFeet: 3,
    heightCategory: 'under_3ft',
    spread: '3-4 ft',
    growthHabit: 'Dense, Mounded',
    foliageColor: 'Mint Green',
    flowerColor: 'Rose Pink',
    flowerColorList: ['Pink'],
    fallColorChange: 'Mint green leaves turn attractive bronze-red in fall',
    fallColors: ['Red', 'Bronze'],
    foliageType: 'deciduous',
    soilConditions: 'Adaptable, well-drained soil',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType: 'Shrub',
    deerResistance: 'High',
    positives: 'Classic dwarf variety, very hardy, deer resistant, heavy bloomer',
    negatives: 'Subject to aphids or powdery mildew'
  },
  {
    name: 'Acer rubrum October Glory',
    sunRequirements: 'Full Sun',
    sunCategories: ['Full Sun'],
    heightRange: "40-50 ft x 30-35 ft",
    minHeightFeet: 40,
    maxHeightFeet: 50,
    heightCategory: 'over_25ft',
    spread: '30-35 ft',
    growthHabit: 'Symmetrical oval crown',
    foliageColor: 'Glossy dark green leaves',
    flowerColor: 'Red spring flowers',
    flowerColorList: ['Red'],
    fallColorChange: 'Green summer, deep reddish-purple late fall color',
    fallColors: ['Red', 'Orange'],
    foliageType: 'deciduous',
    soilConditions: 'Moist, acidic, well-drained soil',
    soilMoistureCategory: 'Moist, Well-Drained',
    categoryType: 'Shade Tree',
    deerResistance: 'Moderate',
    positives: 'Fall color turns late and lasts long, beautiful native habit',
    negatives: 'May not fully color before early freezing weather in cold zones'
  }
];
