/**
 * Automated checks for the app's pure logic (no device needed).
 * Run with:  npm test
 */
import assert from 'node:assert/strict';
import { recipeCatalog, getRecipeById } from '../src/data/recipes';
import { buildShoppingBasket, categorizeItem, estimatePlanCost } from '../src/utils/basket';
import { setLivePackPrices, getIngredientPrice, getRecipeCostPerServing } from '../src/utils/livePricing';
import { findMatchingRecipes, matchesDietaryNeeds, normaliseDietTag } from '../src/utils/mealMatching';
import { recommendRecipes } from '../src/utils/recommendations';
import { PantryItem, PlannedMeal, UserProfile } from '../src/types';

const results: { id: string; name: string; ok: boolean; detail: string }[] = [];
function test(id: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ id, name, ok: true, detail: '' });
  } catch (err) {
    results.push({ id, name, ok: false, detail: (err as Error).message.split('\n')[0] });
  }
}

const profile: UserProfile = {
  userName: 'Test', householdSize: 3, weeklyBudget: 900, monthlyBudget: 3600,
  dietaryRequirements: [], language: 'English',
};
const meal = (recipeId: string, day: string): PlannedMeal => {
  const r = getRecipeById(recipeId)!;
  return { id: `${day}-${recipeId}`, recipeId, day, title: r.title, duration: `${r.durationMinutes} min`,
    costPerServing: r.costPerServing, dietaryTag: r.dietaryTags[0] ?? '', pantryItemsUsed: 0 };
};

test('U01', 'Diet tag "Higher protein" normalises to "high protein"', () => {
  assert.equal(normaliseDietTag('Higher protein'), 'high protein');
});
test('U02', 'No dietary requirements matches every recipe', () => {
  assert.ok(recipeCatalog.every((r) => matchesDietaryNeeds(r, [])));
});
test('U03', '"Balanced" is treated as no restriction', () => {
  assert.ok(recipeCatalog.every((r) => matchesDietaryNeeds(r, ['Balanced'])));
});
test('U04', 'Vegetarian filter excludes non-vegetarian recipes', () => {
  const veg = recipeCatalog.filter((r) => matchesDietaryNeeds(r, ['Vegetarian']));
  assert.ok(veg.length > 0 && veg.length < recipeCatalog.length);
  assert.ok(veg.every((r) => r.dietaryTags.some((t) => normaliseDietTag(t) === 'vegetarian')));
});
test('U05', 'Recipe catalogue has 25+ recipes with unique ids', () => {
  assert.ok(recipeCatalog.length >= 25);
  assert.equal(new Set(recipeCatalog.map((r) => r.id)).size, recipeCatalog.length);
});
test('U06', 'Every ingredient has a positive price and every recipe a cost', () => {
  for (const r of recipeCatalog) {
    assert.ok(r.costPerServing > 0, r.id);
    assert.ok(r.ingredients.every((i) => i.estimatedPrice > 0), r.id);
  }
});
test('U07', 'Recipe finder respects meal type, time and budget limits', () => {
  const found = findMatchingRecipes(
    { mealType: 'Dinner', householdSize: 3, maxDurationMinutes: 30, budgetPerServing: 30,
      dietaryRequirements: [], usePantryOnly: false }, []);
  assert.ok(found.length > 0);
  assert.ok(found.every((r) => r.mealType === 'Dinner' && r.durationMinutes <= 30 && r.costPerServing <= 30));
});
test('U08', 'Impossible filters return an empty list (no crash)', () => {
  const found = findMatchingRecipes(
    { mealType: 'Dinner', householdSize: 3, maxDurationMinutes: 1, budgetPerServing: 1,
      dietaryRequirements: [], usePantryOnly: false }, []);
  assert.equal(found.length, 0);
});
test('U09', 'Shopping basket has no duplicate ingredients', () => {
  const id = recipeCatalog[0].id;
  const basket = buildShoppingBasket([meal(id, 'Monday'), meal(id, 'Tuesday')], []);
  assert.equal(new Set(basket.map((b) => b.id)).size, basket.length);
});
test('U10', 'Pantry items are marked and cost R0 in the basket', () => {
  const recipe = recipeCatalog[0];
  const pantry: PantryItem[] = [{ id: 'p1', name: recipe.ingredients[0].name, quantity: '1', category: 'Other' }];
  const basket = buildShoppingBasket([meal(recipe.id, 'Monday')], pantry);
  const first = basket.find((b) => b.name === recipe.ingredients[0].name)!;
  assert.equal(first.alreadyInPantry, true);
  assert.equal(first.estimatedPrice, 0);
});
test('U11', 'Plan cost scales with household size', () => {
  const plan = [meal(recipeCatalog[0].id, 'Monday')];
  assert.ok(Math.abs(estimatePlanCost(plan, 4) - 2 * estimatePlanCost(plan, 2)) < 0.001);
});
test('U12', 'Empty plan costs R0', () => {
  assert.equal(estimatePlanCost([], 3), 0);
});
test('U13', 'Ingredients are categorised (chicken=Protein, milk=Dairy, onion=Produce)', () => {
  assert.equal(categorizeItem('chicken thighs'), 'Protein');
  assert.equal(categorizeItem('full cream milk'), 'Dairy');
  assert.equal(categorizeItem('onion'), 'Produce');
  assert.equal(categorizeItem('rice'), 'Pantry staples');
});
test('U14', 'Without live prices the estimate is used', () => {
  setLivePackPrices([]);
  assert.equal(getIngredientPrice({ name: 'eggs', quantity: '2', estimatedPrice: 5 }), 5);
});
test('U15', 'A live egg price replaces the estimate', () => {
  setLivePackPrices([{ id: 'eggs-nulaid-xl-18pack', price: 72 }]);
  assert.equal(getIngredientPrice({ name: 'eggs', quantity: '2', estimatedPrice: 8 }), 8); // 72/18*2 = 8
  setLivePackPrices([{ id: 'eggs-nulaid-xl-18pack', price: 90 }]);
  assert.equal(getIngredientPrice({ name: 'eggs', quantity: '2', estimatedPrice: 8 }), 10);
});
test('U16', 'An absurd live price (scrape error) is ignored', () => {
  setLivePackPrices([{ id: 'eggs-nulaid-xl-18pack', price: 5000 }]);
  assert.equal(getIngredientPrice({ name: 'eggs', quantity: '2', estimatedPrice: 8 }), 8);
  setLivePackPrices([]);
});
test('U17', 'Null or zero live prices are ignored', () => {
  setLivePackPrices([{ id: 'eggs-nulaid-xl-18pack', price: null }, { id: 'milk-clover-full-cream-2l', price: 0 }]);
  assert.equal(getIngredientPrice({ name: 'eggs', quantity: '2', estimatedPrice: 8 }), 8);
});
test('U18', 'Recipe cost per serving is positive for the whole catalogue', () => {
  assert.ok(recipeCatalog.every((r) => getRecipeCostPerServing(r) > 0));
});
test('U19', 'Recommendations honour the limit', () => {
  const out = recommendRecipes({ profile, pantryItems: [], plannedMeals: [], filters: [], limit: 4 });
  assert.equal(out.length, 4);
});
test('U20', 'Vegetarian profile only receives vegetarian recommendations', () => {
  const out = recommendRecipes({ profile: { ...profile, dietaryRequirements: ['Vegetarian'] },
    pantryItems: [], plannedMeals: [], filters: [], limit: 10 });
  assert.ok(out.length > 0 && out.every((r) => matchesDietaryNeeds(r, ['Vegetarian'])));
});
test('U21', 'The "quick" chip returns only recipes of 30 minutes or less', () => {
  const out = recommendRecipes({ profile, pantryItems: [], plannedMeals: [], filters: ['quick'], limit: 10 });
  assert.ok(out.every((r) => r.durationMinutes <= 30));
});
test('U22', 'The "budget" chip returns only recipes costing R20 or less per serving', () => {
  const out = recommendRecipes({ profile, pantryItems: [], plannedMeals: [], filters: ['budget'], limit: 10 });
  assert.ok(out.every((r) => getRecipeCostPerServing(r) <= 20));
});
test('U23', 'Recommendations rotate through the day (different hours, different order)', () => {
  const a = recommendRecipes({ profile, pantryItems: [], plannedMeals: [], filters: [], limit: 5, now: new Date(2026, 9, 1, 8) });
  const b = recommendRecipes({ profile, pantryItems: [], plannedMeals: [], filters: [], limit: 5, now: new Date(2026, 9, 1, 18) });
  assert.notDeepEqual(a.map((r) => r.id), b.map((r) => r.id));
});

const passed = results.filter((r) => r.ok).length;
console.log('ID   Result  Test');
for (const r of results) console.log(`${r.id}  ${r.ok ? 'PASS  ' : 'FAIL  '}  ${r.name}${r.ok ? '' : '  -> ' + r.detail}`);
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
