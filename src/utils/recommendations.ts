// Picks the "Recommended for you" recipes on the Meals tab.
import { getAllDynamicRecipes, recipeCatalog } from '../data/recipes';
import { PantryItem, PlannedMeal, Recipe, UserProfile } from '../types';
import { countPantryMatches } from './basket';
import { getRecipeCostPerServing } from './livePricing';
import { matchesDietaryNeeds, normaliseDietTag } from './mealMatching';

export type RecommendFilter = 'quick' | 'budget' | 'protein' | 'pantry';

type Input = {
  profile: UserProfile;
  pantryItems: PantryItem[];
  plannedMeals: PlannedMeal[];
  filters: RecommendFilter[];
  limit?: number;
  now?: Date;
};

function mealTypeForHour(hour: number): Recipe['mealType'] {
  if (hour < 10) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  return 'Dinner';
}

// Repeatable 0..1 value per recipe per day, so equal picks rotate daily.
function dailyJitter(recipeId: string, now: Date): number {
  const key = `${recipeId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 1000;
  }
  return hash / 1000;
}

function hasProteinTag(recipe: Recipe): boolean {
  return recipe.dietaryTags.some((tag) => normaliseDietTag(tag).includes('protein'));
}

/**
 * Builds the "Recommended for you" list from catalog and AI recipes, scored on
 * diet, budget per serving, cooking preference, pantry, current plan and time of day.
 */
export function recommendRecipes({
  profile,
  pantryItems,
  plannedMeals,
  filters,
  limit = 5,
  now = new Date(),
}: Input): Recipe[] {
  // Keep one recipe per title, since AI runs can repeat dishes.
  const byTitle = new Map<string, Recipe>();
  for (const recipe of [...recipeCatalog, ...getAllDynamicRecipes()]) {
    byTitle.set(recipe.title.trim().toLowerCase(), recipe);
  }

  const budgetPerServing = Math.round(
    profile.weeklyBudget / Math.max(profile.householdSize * 7, 1),
  );
  const wantedType = mealTypeForHour(now.getHours());
  const plannedIds = new Set(plannedMeals.map((meal) => meal.recipeId));
  const wantsVegetarian = profile.dietaryRequirements.some(
    (requirement) => normaliseDietTag(requirement) === 'vegetarian',
  );
  const wantsProtein = profile.dietaryRequirements.some((requirement) =>
    normaliseDietTag(requirement).includes('protein'),
  );

  const scored: { recipe: Recipe; score: number }[] = [];

  for (const recipe of byTitle.values()) {
    const cost = getRecipeCostPerServing(recipe);
    const pantryMatches = countPantryMatches(recipe.id, pantryItems);

    // Apply the selected filter chips, and never show meat to vegetarians.
    if (wantsVegetarian && !matchesDietaryNeeds(recipe, ['Vegetarian'])) continue;
    if (filters.includes('quick') && recipe.durationMinutes > 30) continue;
    if (filters.includes('budget') && cost > 20) continue;
    if (filters.includes('protein') && !hasProteinTag(recipe)) continue;
    if (filters.includes('pantry') && pantryMatches === 0) continue;

    let score = 0;
    if (recipe.mealType === wantedType) score += 2;
    if (cost <= budgetPerServing) score += 2;
    else score -= 2;
    if (wantsProtein && hasProteinTag(recipe)) score += 2;
    if (profile.cookingPreference === 'Quick meals' && recipe.durationMinutes <= 30) score += 2;
    if (profile.cookingPreference === 'Minimal ingredients' && recipe.ingredients.length <= 4) {
      score += 2;
    }
    score += Math.min(pantryMatches, 3) * 1.5;
    if (plannedIds.has(recipe.id)) score -= 3;
    score += dailyJitter(recipe.id, now);

    scored.push({ recipe, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.recipe);
}
