import { getRecipeById } from '../data/recipes';
import { PlannedMeal, Recipe } from '../types';

/**
 * Links ingredient prices to the live prices the Worker tracks.
 * Staples that are tracked live (eggs, milk, bread, beef, chicken pieces) are
 * priced from the live pack price; all other ingredients use their estimate.
 * Without live prices, every ingredient uses its estimate.
 */

type Ingredient = Recipe['ingredients'][number];

type Quantity = {
  amount: number;
  unit: 'count' | 'g' | 'kg' | 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp' | 'slice';
};

function parseQuantity(raw: string): Quantity | null {
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cups?|tbsp|tsp|slices?)?\b/i);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  const unitRaw = (match[2] ?? '').toLowerCase();
  if (!unitRaw) return { amount, unit: 'count' };
  if (unitRaw.startsWith('cup')) return { amount, unit: 'cup' };
  if (unitRaw.startsWith('slice')) return { amount, unit: 'slice' };
  return { amount, unit: unitRaw as Quantity['unit'] };
}

function toMillilitres(qty: Quantity): number | null {
  switch (qty.unit) {
    case 'ml':
      return qty.amount;
    case 'l':
      return qty.amount * 1000;
    case 'cup':
      return qty.amount * 250;
    case 'tbsp':
      return qty.amount * 15;
    case 'tsp':
      return qty.amount * 5;
    default:
      return null;
  }
}

function toGrams(qty: Quantity): number | null {
  if (qty.unit === 'g') return qty.amount;
  if (qty.unit === 'kg') return qty.amount * 1000;
  return null;
}

type Anchor = {
  /** id of the tracked product in the Worker's TRACKED_PRODUCTS. */
  productId: string;
  matches: (ingredientName: string) => boolean;
  /** Price of `qty` of this ingredient, given the live pack price. */
  priceFor: (packPrice: number, qty: Quantity) => number | null;
};

// Pack sizes below mirror the products named in TRACKED_PRODUCTS.
const ANCHORS: Anchor[] = [
  {
    productId: 'eggs-nulaid-xl-18pack',
    matches: (name) => /\begg/i.test(name),
    priceFor: (pack, qty) => (qty.unit === 'count' ? (pack / 18) * qty.amount : null),
  },
  {
    productId: 'milk-clover-full-cream-2l',
    matches: (name) => /^milk\b/i.test(name.trim()),
    priceFor: (pack, qty) => {
      const ml = toMillilitres(qty);
      return ml === null ? null : (pack / 2000) * ml;
    },
  },
  {
    productId: 'bread-albany-superior-700g',
    matches: (name) => /\bbread\b/i.test(name),
    // A 700 g loaf is roughly 22 slices.
    priceFor: (pack, qty) =>
      qty.unit === 'slice' || qty.unit === 'count' ? (pack / 22) * qty.amount : null,
  },
  {
    productId: 'beef-stewing-per-kg',
    matches: (name) => /\bbeef\b/i.test(name),
    priceFor: (pack, qty) => {
      const grams = toGrams(qty);
      return grams === null ? null : (pack / 1000) * grams;
    },
  },
  {
    productId: 'chicken-farmers-choice-drum-thigh-16pc',
    matches: (name) => /\bchicken (thighs?|drumsticks?|pieces|portions)\b/i.test(name),
    // 16 pieces per pack; ~120 g per drumstick/thigh piece when sold by weight.
    priceFor: (pack, qty) => {
      if (qty.unit === 'count') return (pack / 16) * qty.amount;
      const grams = toGrams(qty);
      return grams === null ? null : (pack / 16) * (grams / 120);
    },
  },
];

let livePackPrices: Record<string, number> = {};

/** Called once the Worker's live prices have loaded (see AppContext). */
export function setLivePackPrices(items: { id: string; price: number | null }[]): void {
  const next: Record<string, number> = {};
  for (const item of items) {
    if (typeof item.price === 'number' && item.price > 0) {
      next[item.id] = item.price;
    }
  }
  livePackPrices = next;
}

export function hasLivePrices(): boolean {
  return Object.keys(livePackPrices).length > 0;
}

/**
 * Price of one ingredient: from the live price when it is a tracked staple,
 * otherwise the estimate. A live price far from the estimate is ignored.
 */
export function getIngredientPrice(ingredient: Ingredient): number {
  const fallback = ingredient.estimatedPrice;
  if (!hasLivePrices()) return fallback;

  const anchor = ANCHORS.find(
    (candidate) => livePackPrices[candidate.productId] && candidate.matches(ingredient.name),
  );
  if (!anchor) return fallback;

  const qty = parseQuantity(ingredient.quantity);
  if (!qty) return fallback;

  const derived = anchor.priceFor(livePackPrices[anchor.productId], qty);
  if (derived === null || !Number.isFinite(derived)) return fallback;

  if (fallback > 0 && (derived > fallback * 3 || derived < fallback / 3)) return fallback;
  return Math.max(1, Math.round(derived));
}

/** Cost of one serving: the (live-adjusted) ingredient prices ÷ servings. */
export function getRecipeCostPerServing(recipe: Recipe): number {
  const total = recipe.ingredients.reduce((sum, item) => sum + getIngredientPrice(item), 0);
  return Math.round(total / Math.max(recipe.servings, 1));
}

/** Cost per serving of a planned meal (uses the saved cost if the recipe is gone). */
export function getMealCostPerServing(meal: PlannedMeal): number {
  const recipe = getRecipeById(meal.recipeId);
  return recipe ? getRecipeCostPerServing(recipe) : meal.costPerServing;
}
