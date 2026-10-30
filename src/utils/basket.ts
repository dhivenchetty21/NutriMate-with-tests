// Builds the shopping basket and budget categories from the planned meals.
import { getRecipeById } from '../data/recipes';
import { BasketItem, PantryItem, PlannedMeal } from '../types';
import { getIngredientPrice, getMealCostPerServing } from './livePricing';

export const budgetCategoryOrder = ['Produce', 'Protein', 'Dairy', 'Pantry staples'];

export const budgetCategoryColors: Record<string, string> = {
  Protein: '#BE5A2C',
  Produce: '#2E5C43',
  'Pantry staples': '#DFA23A',
  Dairy: '#7C9CB0',
};

export function categorizeItem(name: string): string {
  // Checked first so "green beans" isn't mistaken for a bean protein.
  if (/green bean|baby marrow|courgette|bell pepper/i.test(name)) return 'Produce';
  if (
    /chicken|beef|mince|wors|egg|bean|lentil|chickpea|tuna|pilchard|fish|hake|liver|ostrich|tofu|soya|peanut butter/i.test(
      name,
    )
  ) {
    return 'Protein';
  }
  if (/milk|cheese|yogurt|yoghurt|butter|cream/i.test(name)) return 'Dairy';
  if (
    /spinach|tomato|onion|vegetable|peas|carrot|cabbage|pepper|butternut|potato|lemon|cucumber|salad|lettuce|banana|garlic|sweetcorn|relish/i.test(
      name,
    )
  ) {
    return 'Produce';
  }
  return 'Pantry staples';
}

export function buildBudgetCategories(
  basket: BasketItem[],
): { name: string; amount: number; color: string }[] {
  const totals = new Map<string, number>();
  for (const item of basket) {
    if (item.alreadyInPantry) continue;
    const category = categorizeItem(item.name);
    totals.set(category, (totals.get(category) ?? 0) + item.estimatedPrice);
  }
  return budgetCategoryOrder
    .map((name) => ({
      name,
      amount: Math.round(totals.get(name) ?? 0),
      color: budgetCategoryColors[name],
    }))
    .filter((category) => category.amount > 0);
}

function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

function isInPantry(ingredientName: string, pantryItems: PantryItem[]): boolean {
  const target = normaliseName(ingredientName);
  return pantryItems.some((item) => {
    const pantryName = normaliseName(item.name);
    return pantryName.includes(target) || target.includes(pantryName);
  });
}

export function buildShoppingBasket(
  plannedMeals: PlannedMeal[],
  pantryItems: PantryItem[],
): BasketItem[] {
  const basketMap = new Map<string, BasketItem>();

  for (const meal of plannedMeals) {
    const recipe = getRecipeById(meal.recipeId);
    if (!recipe) {
      continue;
    }

    for (const ingredient of recipe.ingredients) {
      const key = normaliseName(ingredient.name);
      const alreadyInPantry = isInPantry(ingredient.name, pantryItems);

      if (basketMap.has(key)) {
        continue;
      }

      basketMap.set(key, {
        id: key,
        name: ingredient.name,
        quantity: ingredient.quantity,
        alreadyInPantry,
        estimatedPrice: alreadyInPantry ? 0 : getIngredientPrice(ingredient),
      });
    }
  }

  return Array.from(basketMap.values());
}

export function countPantryMatches(
  recipeId: string,
  pantryItems: PantryItem[],
): number {
  const recipe = getRecipeById(recipeId);
  if (!recipe) {
    return 0;
  }

  return recipe.ingredients.filter((ingredient) =>
    isInPantry(ingredient.name, pantryItems),
  ).length;
}

export function estimatePlanCost(
  plannedMeals: PlannedMeal[],
  householdSize: number,
): number {
  return plannedMeals.reduce(
    (total, meal) => total + getMealCostPerServing(meal) * householdSize,
    0,
  );
}
