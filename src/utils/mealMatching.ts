// Filters the recipe catalog by meal type, time, budget, diet and pantry.
import { recipeCatalog } from '../data/recipes';
import { countPantryMatches } from './basket';
import { MealGeneratorFilters, PantryItem, Recipe } from '../types';

// Treat "High protein" and "Higher protein" as the same tag when matching.
export function normaliseDietTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\bhigher\b/g, 'high')
    .replace(/\blower\b/g, 'low')
    .trim();
}

export function matchesDietaryNeeds(recipe: Recipe, requirements: string[]): boolean {
  if (requirements.length === 0) {
    return true;
  }

  return requirements.every((requirement) => {
    const normalisedRequirement = normaliseDietTag(requirement);

    // "Balanced" means no restriction.
    if (normalisedRequirement === 'balanced' || normalisedRequirement === 'balanced eating') {
      return true;
    }

    return recipe.dietaryTags.some(
      (tag) => normaliseDietTag(tag) === normalisedRequirement,
    );
  });
}

export function findMatchingRecipes(
  filters: MealGeneratorFilters,
  pantryItems: PantryItem[],
): Recipe[] {
  return recipeCatalog
    .filter((recipe) => recipe.mealType === filters.mealType)
    .filter((recipe) => recipe.durationMinutes <= filters.maxDurationMinutes)
    .filter((recipe) => recipe.costPerServing <= filters.budgetPerServing)
    .filter((recipe) => matchesDietaryNeeds(recipe, filters.dietaryRequirements))
    .filter((recipe) => {
      if (!filters.usePantryOnly) {
        return true;
      }

      return countPantryMatches(recipe.id, pantryItems) > 0;
    })
    .sort((left, right) => {
      const pantryScore =
        countPantryMatches(right.id, pantryItems) -
        countPantryMatches(left.id, pantryItems);

      if (pantryScore !== 0) {
        return pantryScore;
      }

      return left.costPerServing - right.costPerServing;
    });
}
