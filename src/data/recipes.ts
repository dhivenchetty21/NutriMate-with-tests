// Recipe catalog (built-in recipes) and the store for AI-generated recipes.
import { Recipe } from '../types';

export const recipeCatalog: Recipe[] = [
  {
    id: 'chicken-spinach-pap',
    title: 'Chicken, spinach & pap',
    summary: 'A filling South African dinner using pantry staples and fresh spinach.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 35,
    costPerServing: 28,
    dietaryTags: ['Lower salt', 'Higher protein'],
    explanation:
      'Uses maize meal from your pantry and keeps salt moderate for household needs.',
    ingredients: [
      { name: 'Chicken pieces', quantity: '600 g', estimatedPrice: 84 },
      { name: 'Maize meal', quantity: '2 cups', estimatedPrice: 9 },
      { name: 'Spinach', quantity: '1 bunch', estimatedPrice: 15 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
      { name: 'Cooking oil', quantity: '2 tbsp', estimatedPrice: 4 },
    ],
    substitutions: [
      {
        original: 'Chicken pieces',
        alternative: 'Sugar beans',
        note: 'Swap protein to cut cost by about R12 per serving.',
      },
    ],
  },
  {
    id: 'bean-stew-rice',
    title: 'Bean stew with rice',
    summary: 'Budget-friendly stew built around sugar beans and pantry rice.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 30,
    costPerServing: 18,
    dietaryTags: ['Higher fibre', 'Vegetarian'],
    explanation:
      'High-fibre vegetarian option that uses sugar beans already in your pantry.',
    ingredients: [
      { name: 'Sugar beans', quantity: '500 g', estimatedPrice: 22 },
      { name: 'Rice', quantity: '2 cups', estimatedPrice: 16 },
      { name: 'Tomatoes', quantity: '2', estimatedPrice: 10 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
      { name: 'Curry powder', quantity: '1 tsp', estimatedPrice: 2 },
    ],
    substitutions: [
      {
        original: 'Rice',
        alternative: 'Pap',
        note: 'Use maize meal if rice is not available.',
      },
    ],
  },
  {
    id: 'vegetable-pasta',
    title: 'Vegetable pasta',
    summary: 'Quick meat-free pasta with seasonal vegetables.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 25,
    costPerServing: 22,
    dietaryTags: ['Vegetarian', 'Quick meal'],
    explanation: 'Fast weekday option under 30 minutes and within a moderate budget.',
    ingredients: [
      { name: 'Pasta', quantity: '400 g', estimatedPrice: 18 },
      { name: 'Mixed vegetables', quantity: '3 cups', estimatedPrice: 24 },
      { name: 'Garlic', quantity: '2 cloves', estimatedPrice: 3 },
      { name: 'Cooking oil', quantity: '1 tbsp', estimatedPrice: 2 },
    ],
    substitutions: [
      {
        original: 'Mixed vegetables',
        alternative: 'Spinach and carrots',
        note: 'Use spinach from your pantry to reduce waste.',
      },
    ],
  },
  {
    id: 'egg-fried-rice',
    title: 'Egg fried rice',
    summary: 'Simple lunch using eggs and leftover rice.',
    mealType: 'Lunch',
    servings: 4,
    durationMinutes: 20,
    costPerServing: 14,
    dietaryTags: ['Quick meal', 'Higher protein'],
    explanation: 'Uses eggs from your pantry for an affordable midday meal.',
    ingredients: [
      { name: 'Eggs', quantity: '6', estimatedPrice: 24 },
      { name: 'Rice', quantity: '3 cups cooked', estimatedPrice: 12 },
      { name: 'Soy sauce', quantity: '2 tbsp', estimatedPrice: 4 },
      { name: 'Frozen peas', quantity: '1 cup', estimatedPrice: 12 },
    ],
    substitutions: [
      {
        original: 'Frozen peas',
        alternative: 'Spinach',
        note: 'Add chopped spinach instead of peas.',
      },
    ],
  },
  {
    id: 'pap-wors',
    title: 'Pap and wors',
    summary: 'Classic South African comfort meal for the whole household.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 40,
    costPerServing: 24,
    dietaryTags: ['Family favourite'],
    explanation: 'Maize meal from your pantry keeps the cost per serving low.',
    ingredients: [
      { name: 'Maize meal', quantity: '2 cups', estimatedPrice: 9 },
      { name: 'Boerewors', quantity: '500 g', estimatedPrice: 55 },
      { name: 'Tomato relish', quantity: '1 cup', estimatedPrice: 12 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
    ],
    substitutions: [
      {
        original: 'Boerewors',
        alternative: 'Baked beans',
        note: 'Lower-cost protein swap saves about R8 per serving.',
      },
    ],
  },
  {
    id: 'lentil-curry',
    title: 'Lentil curry',
    summary: 'Spiced lentil curry served with rice or pap.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 35,
    costPerServing: 16,
    dietaryTags: ['Vegetarian', 'Higher fibre', 'Lower salt'],
    explanation: 'Plant-based curry with moderate salt and high fibre.',
    ingredients: [
      { name: 'Red lentils', quantity: '2 cups', estimatedPrice: 20 },
      { name: 'Coconut milk', quantity: '400 ml', estimatedPrice: 18 },
      { name: 'Curry powder', quantity: '2 tsp', estimatedPrice: 4 },
      { name: 'Rice', quantity: '2 cups', estimatedPrice: 16 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
    ],
    substitutions: [
      {
        original: 'Coconut milk',
        alternative: 'Tomato and water base',
        note: 'Removes coconut milk to save about R4 per serving.',
      },
    ],
  },
  // --- Extra recipes ---------------------------------------------------------
  // Cover every diet and cooking-time filter combination, so the offline
  // planner always has several options to choose from.
  {
    id: 'beef-mince-stirfry',
    title: 'Beef mince & veg stir-fry',
    summary: 'Fast, protein-heavy stir-fry using lean mince and whatever vegetables are on hand.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 20,
    costPerServing: 32,
    dietaryTags: ['Higher protein', 'Quick meal'],
    explanation: 'High-protein weeknight option that cooks in one pan in under 25 minutes.',
    ingredients: [
      { name: 'Lean beef mince', quantity: '500 g', estimatedPrice: 65 },
      { name: 'Mixed vegetables', quantity: '3 cups', estimatedPrice: 24 },
      { name: 'Soy sauce', quantity: '2 tbsp', estimatedPrice: 4 },
      { name: 'Garlic', quantity: '2 cloves', estimatedPrice: 3 },
      { name: 'Cooking oil', quantity: '1 tbsp', estimatedPrice: 2 },
    ],
    substitutions: [
      {
        original: 'Beef mince',
        alternative: 'Soy mince',
        note: 'Cuts cost by about R14 per serving and keeps it vegetarian.',
      },
    ],
  },
  {
    id: 'peri-peri-chicken',
    title: 'Peri-peri chicken thighs',
    summary: 'Oven-roasted chicken thighs with a spicy peri-peri marinade — a household favourite.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 40,
    costPerServing: 30,
    dietaryTags: ['Higher protein', 'Family favourite'],
    explanation: 'Crowd-pleasing roast that uses the oven hands-off for most of the cook time.',
    ingredients: [
      { name: 'Chicken thighs', quantity: '8', estimatedPrice: 80 },
      { name: 'Peri-peri sauce', quantity: '4 tbsp', estimatedPrice: 20 },
      { name: 'Potatoes', quantity: '6', estimatedPrice: 18 },
      { name: 'Cooking oil', quantity: '1 tbsp', estimatedPrice: 2 },
    ],
    substitutions: [
      {
        original: 'Chicken thighs',
        alternative: 'Chicken drumsticks',
        note: 'Usually a few rand cheaper per kilogram with the same cook time.',
      },
    ],
  },
  {
    id: 'tuna-pasta-bake',
    title: 'Tuna pasta bake',
    summary: 'Creamy tuna and pasta bake that reheats well for leftovers.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 30,
    costPerServing: 26,
    dietaryTags: ['Higher protein', 'Quick meal'],
    explanation: 'Pantry-friendly bake that stretches two tins of tuna across the whole household.',
    ingredients: [
      { name: 'Pasta', quantity: '400 g', estimatedPrice: 18 },
      { name: 'Tinned tuna', quantity: '2 tins', estimatedPrice: 44 },
      { name: 'Cream cheese', quantity: '250 g', estimatedPrice: 28 },
      { name: 'Frozen peas', quantity: '1 cup', estimatedPrice: 12 },
    ],
    substitutions: [
      {
        original: 'Cream cheese',
        alternative: 'White sauce (butter, flour, milk)',
        note: 'Cheaper base made from pantry staples instead of a tub of cream cheese.',
      },
    ],
  },
  {
    id: 'chickpea-spinach-curry',
    title: 'Chickpea & spinach curry',
    summary: 'High-fibre, meat-free curry that leans on tinned chickpeas and fresh spinach.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 30,
    costPerServing: 17,
    dietaryTags: ['Vegetarian', 'Higher fibre', 'Lower salt', 'Quick meal'],
    explanation: 'Low-salt, high-fibre plant-based curry ready in half an hour.',
    ingredients: [
      { name: 'Tinned chickpeas', quantity: '2 tins', estimatedPrice: 28 },
      { name: 'Spinach', quantity: '1 bunch', estimatedPrice: 15 },
      { name: 'Curry powder', quantity: '2 tsp', estimatedPrice: 4 },
      { name: 'Tomatoes', quantity: '2', estimatedPrice: 10 },
      { name: 'Rice', quantity: '2 cups', estimatedPrice: 16 },
    ],
    substitutions: [
      {
        original: 'Tinned chickpeas',
        alternative: 'Sugar beans',
        note: 'Similar texture and cost, uses what you already have in the pantry.',
      },
    ],
  },
  {
    id: 'beef-stew-dumplings',
    title: 'Beef stew with dumplings',
    summary: 'A slow-cooked weekend stew with soft dumplings — worth the extra time.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 55,
    costPerServing: 34,
    dietaryTags: ['Family favourite', 'Higher protein'],
    explanation: 'Best suited to a weekend when there is time for a slower, richer meal.',
    ingredients: [
      { name: 'Beef chuck', quantity: '600 g', estimatedPrice: 90 },
      { name: 'Carrots', quantity: '4', estimatedPrice: 12 },
      { name: 'Potatoes', quantity: '4', estimatedPrice: 14 },
      { name: 'Self-raising flour', quantity: '1 cup', estimatedPrice: 8 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
    ],
    substitutions: [
      {
        original: 'Beef chuck',
        alternative: 'Beef cubes (stewing pack)',
        note: 'Often sold pre-cut and a little cheaper per kilogram.',
      },
    ],
  },
  {
    id: 'grilled-fish-rice',
    title: 'Grilled fish with rice',
    summary: 'Simple grilled hake fillets with steamed rice and a squeeze of lemon.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 25,
    costPerServing: 29,
    dietaryTags: ['Higher protein', 'Lower salt', 'Quick meal'],
    explanation: 'Light, low-salt dinner that cooks in one pan and one pot.',
    ingredients: [
      { name: 'Hake fillets', quantity: '4', estimatedPrice: 88 },
      { name: 'Rice', quantity: '2 cups', estimatedPrice: 16 },
      { name: 'Lemon', quantity: '1', estimatedPrice: 5 },
      { name: 'Cooking oil', quantity: '1 tbsp', estimatedPrice: 2 },
    ],
    substitutions: [
      {
        original: 'Hake fillets',
        alternative: 'Frozen fish portions',
        note: 'Usually the most affordable fresh-fish substitute at most supermarkets.',
      },
    ],
  },
  {
    id: 'butternut-chickpea-curry',
    title: 'Butternut & chickpea curry',
    summary: 'Hearty vegetarian curry built around roasted butternut and chickpeas.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 35,
    costPerServing: 19,
    dietaryTags: ['Vegetarian', 'Higher fibre'],
    explanation: 'Naturally sweet, high-fibre curry that works well with rice or pap.',
    ingredients: [
      { name: 'Butternut', quantity: '1', estimatedPrice: 22 },
      { name: 'Tinned chickpeas', quantity: '1 tin', estimatedPrice: 14 },
      { name: 'Coconut milk', quantity: '400 ml', estimatedPrice: 18 },
      { name: 'Curry powder', quantity: '2 tsp', estimatedPrice: 4 },
      { name: 'Rice', quantity: '2 cups', estimatedPrice: 16 },
    ],
    substitutions: [
      {
        original: 'Coconut milk',
        alternative: 'Tomato and water base',
        note: 'Removes coconut milk to save about R4 per serving.',
      },
    ],
  },
  {
    id: 'mince-potato-bake',
    title: 'Mince & potato bake',
    summary: 'Layered mince and potato bake — a filling, no-fuss family dinner.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 45,
    costPerServing: 27,
    dietaryTags: ['Family favourite', 'Higher protein'],
    explanation: 'Oven bake that feeds the whole household and reheats well the next day.',
    ingredients: [
      { name: 'Beef mince', quantity: '500 g', estimatedPrice: 60 },
      { name: 'Potatoes', quantity: '6', estimatedPrice: 18 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
      { name: 'Cheese', quantity: '1 cup grated', estimatedPrice: 26 },
    ],
    substitutions: [
      {
        original: 'Beef mince',
        alternative: 'Soy mince',
        note: 'Vegetarian swap that cuts the cost noticeably per serving.',
      },
    ],
  },
  {
    id: 'tofu-veg-stirfry',
    title: 'Stir-fried tofu & vegetables',
    summary: 'Quick, meat-free stir-fry with crispy tofu and seasonal vegetables.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 20,
    costPerServing: 23,
    dietaryTags: ['Vegetarian', 'Quick meal', 'Higher protein'],
    explanation: 'Protein-rich vegetarian option on the table in under 20 minutes.',
    ingredients: [
      { name: 'Firm tofu', quantity: '400 g', estimatedPrice: 32 },
      { name: 'Mixed vegetables', quantity: '3 cups', estimatedPrice: 24 },
      { name: 'Soy sauce', quantity: '2 tbsp', estimatedPrice: 4 },
      { name: 'Garlic', quantity: '2 cloves', estimatedPrice: 3 },
    ],
    substitutions: [
      {
        original: 'Firm tofu',
        alternative: 'Tempeh or extra vegetables',
        note: 'Use whichever meat-free protein is cheaper this week.',
      },
    ],
  },
  {
    id: 'bean-butternut-stew',
    title: 'Smoky bean & butternut stew',
    summary: 'Slow-simmered bean and butternut stew with smoked paprika.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 35,
    costPerServing: 15,
    dietaryTags: ['Vegetarian', 'Higher fibre', 'Lower salt'],
    explanation: 'One of the cheapest dinners in the catalog, and genuinely high in fibre.',
    ingredients: [
      { name: 'Sugar beans', quantity: '500 g', estimatedPrice: 22 },
      { name: 'Butternut', quantity: '1', estimatedPrice: 22 },
      { name: 'Smoked paprika', quantity: '1 tsp', estimatedPrice: 3 },
      { name: 'Tomatoes', quantity: '2', estimatedPrice: 10 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
    ],
    substitutions: [
      {
        original: 'Sugar beans',
        alternative: 'Tinned butter beans',
        note: 'Cuts cook time significantly since they don’t need pre-soaking.',
      },
    ],
  },
  {
    id: 'chicken-stirfry-noodles',
    title: 'Chicken stir-fry noodles',
    summary: 'Fast noodle stir-fry with strips of chicken breast and vegetables.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 20,
    costPerServing: 28,
    dietaryTags: ['Higher protein', 'Quick meal'],
    explanation: 'One-pan dinner ready in 20 minutes for busy weeknights.',
    ingredients: [
      { name: 'Chicken breast', quantity: '500 g', estimatedPrice: 70 },
      { name: 'Instant noodles', quantity: '4 packets', estimatedPrice: 20 },
      { name: 'Mixed vegetables', quantity: '2 cups', estimatedPrice: 16 },
      { name: 'Soy sauce', quantity: '2 tbsp', estimatedPrice: 4 },
    ],
    substitutions: [
      {
        original: 'Chicken breast',
        alternative: 'Chicken strips (pre-cut)',
        note: 'Saves prep time if available at a similar price.',
      },
    ],
  },
  {
    id: 'beef-bobotie',
    title: 'Beef bobotie',
    summary: 'Classic South African spiced mince bake with an egg custard topping.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 50,
    costPerServing: 29,
    dietaryTags: ['Family favourite', 'Higher protein'],
    explanation: 'A traditional weekend bake — worth the longer oven time for the whole household.',
    ingredients: [
      { name: 'Beef mince', quantity: '500 g', estimatedPrice: 60 },
      { name: 'Curry powder', quantity: '1 tbsp', estimatedPrice: 4 },
      { name: 'Bread (for soaking)', quantity: '2 slices', estimatedPrice: 4 },
      { name: 'Eggs', quantity: '2', estimatedPrice: 8 },
      { name: 'Milk', quantity: '1 cup', estimatedPrice: 6 },
    ],
    substitutions: [
      {
        original: 'Beef mince',
        alternative: 'Lentils',
        note: 'A vegetarian bobotie works well with the same spice blend.',
      },
    ],
  },
  {
    id: 'grilled-chicken-salad',
    title: 'Grilled chicken salad',
    summary: 'Light, low-salt dinner with grilled chicken breast over a fresh salad.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 20,
    costPerServing: 27,
    dietaryTags: ['Higher protein', 'Lower salt', 'Quick meal'],
    explanation: 'A lighter dinner option with minimal added salt, ready in 20 minutes.',
    ingredients: [
      { name: 'Chicken breast', quantity: '500 g', estimatedPrice: 70 },
      { name: 'Mixed salad leaves', quantity: '1 bag', estimatedPrice: 22 },
      { name: 'Cucumber', quantity: '1', estimatedPrice: 8 },
      { name: 'Olive oil', quantity: '1 tbsp', estimatedPrice: 3 },
    ],
    substitutions: [
      {
        original: 'Chicken breast',
        alternative: 'Tinned tuna',
        note: 'No-cook protein swap for an even faster version.',
      },
    ],
  },
  {
    id: 'veg-lentil-soup',
    title: 'Vegetable & lentil soup',
    summary: 'Thick, high-fibre soup that works as a light, low-salt dinner.',
    mealType: 'Dinner',
    servings: 4,
    durationMinutes: 30,
    costPerServing: 13,
    dietaryTags: ['Vegetarian', 'Higher fibre', 'Lower salt', 'Quick meal'],
    explanation: 'The cheapest dinner in the catalog, and ready in half an hour.',
    ingredients: [
      { name: 'Red lentils', quantity: '1.5 cups', estimatedPrice: 15 },
      { name: 'Carrots', quantity: '3', estimatedPrice: 9 },
      { name: 'Onion', quantity: '1', estimatedPrice: 5 },
      { name: 'Vegetable stock cube', quantity: '1', estimatedPrice: 3 },
    ],
    substitutions: [
      {
        original: 'Red lentils',
        alternative: 'Split peas',
        note: 'Similar cook time and cost, whichever is available.',
      },
    ],
  },
  {
    id: 'chicken-mayo-wrap',
    title: 'Chicken mayo sandwich wraps',
    summary: 'Fast lunchtime wrap using leftover or tinned chicken.',
    mealType: 'Lunch',
    servings: 4,
    durationMinutes: 10,
    costPerServing: 16,
    dietaryTags: ['Quick meal', 'Higher protein'],
    explanation: 'No-cook lunch that uses leftover roast chicken or a tin of chicken.',
    ingredients: [
      { name: 'Cooked chicken', quantity: '300 g', estimatedPrice: 40 },
      { name: 'Wraps/tortillas', quantity: '4', estimatedPrice: 20 },
      { name: 'Mayonnaise', quantity: '3 tbsp', estimatedPrice: 6 },
      { name: 'Lettuce', quantity: '4 leaves', estimatedPrice: 6 },
    ],
    substitutions: [
      {
        original: 'Cooked chicken',
        alternative: 'Tinned pilchards',
        note: 'Cheaper protein swap for the same wrap.',
      },
    ],
  },
  {
    id: 'tuna-sweetcorn-salad',
    title: 'Tuna & sweetcorn salad',
    summary: 'No-cook, low-salt lunch salad built around tinned tuna.',
    mealType: 'Lunch',
    servings: 4,
    durationMinutes: 15,
    costPerServing: 18,
    dietaryTags: ['Quick meal', 'Higher protein', 'Lower salt'],
    explanation: 'A fast, filling lunch with no cooking required.',
    ingredients: [
      { name: 'Tinned tuna', quantity: '2 tins', estimatedPrice: 44 },
      { name: 'Sweetcorn', quantity: '1 tin', estimatedPrice: 12 },
      { name: 'Mixed salad leaves', quantity: '1 bag', estimatedPrice: 22 },
      { name: 'Olive oil', quantity: '1 tbsp', estimatedPrice: 3 },
    ],
    substitutions: [
      {
        original: 'Tinned tuna',
        alternative: 'Tinned chickpeas',
        note: 'A vegetarian swap that keeps the same no-cook prep.',
      },
    ],
  },
  {
    id: 'peanut-butter-banana-toast',
    title: 'Peanut butter & banana toast',
    summary: 'Simple, meat-free lunch or light meal ready in minutes.',
    mealType: 'Lunch',
    servings: 4,
    durationMinutes: 5,
    costPerServing: 8,
    dietaryTags: ['Quick meal', 'Vegetarian'],
    explanation: 'The fastest, cheapest meal in the catalog for a light midday option.',
    ingredients: [
      { name: 'Bread', quantity: '8 slices', estimatedPrice: 14 },
      { name: 'Peanut butter', quantity: '4 tbsp', estimatedPrice: 10 },
      { name: 'Bananas', quantity: '4', estimatedPrice: 16 },
    ],
    substitutions: [
      {
        original: 'Peanut butter',
        alternative: 'Any nut or seed butter',
        note: 'Whichever is cheapest or already in the pantry.',
      },
    ],
  },
  {
    id: 'oats-banana-pb',
    title: 'Oats with banana & peanut butter',
    summary: 'Warm, high-fibre breakfast that keeps the household going until lunch.',
    mealType: 'Breakfast',
    servings: 4,
    durationMinutes: 10,
    costPerServing: 9,
    dietaryTags: ['Vegetarian', 'Higher fibre', 'Quick meal'],
    explanation: 'A high-fibre breakfast made entirely from pantry staples.',
    ingredients: [
      { name: 'Oats', quantity: '2 cups', estimatedPrice: 14 },
      { name: 'Bananas', quantity: '4', estimatedPrice: 16 },
      { name: 'Peanut butter', quantity: '4 tbsp', estimatedPrice: 10 },
      { name: 'Milk', quantity: '2 cups', estimatedPrice: 12 },
    ],
    substitutions: [
      {
        original: 'Milk',
        alternative: 'Water',
        note: 'Cuts cost slightly if milk is low this week.',
      },
    ],
  },
  {
    id: 'scrambled-eggs-toast',
    title: 'Scrambled eggs on toast',
    summary: 'Quick, protein-rich breakfast using pantry eggs.',
    mealType: 'Breakfast',
    servings: 4,
    durationMinutes: 10,
    costPerServing: 11,
    dietaryTags: ['Higher protein', 'Quick meal'],
    explanation: 'A fast, filling breakfast ready in 10 minutes.',
    ingredients: [
      { name: 'Eggs', quantity: '8', estimatedPrice: 32 },
      { name: 'Bread', quantity: '8 slices', estimatedPrice: 14 },
      { name: 'Butter', quantity: '2 tbsp', estimatedPrice: 6 },
    ],
    substitutions: [
      {
        original: 'Butter',
        alternative: 'Margarine',
        note: 'Usually the cheaper spread option.',
      },
    ],
  },
];

// Recipes created by Gemini, stored by id. Screens look recipes up through
// getRecipeById, which checks both the catalog and these.
const dynamicRecipes = new Map<string, Recipe>();

// Cost per serving = sum of ingredient prices ÷ servings, so meal cards,
// ingredient lists and the basket always agree.
function costFromIngredients(recipe: Recipe): number {
  const total = recipe.ingredients.reduce((sum, item) => sum + item.estimatedPrice, 0);
  return Math.round(total / Math.max(recipe.servings, 1));
}

for (const recipe of recipeCatalog) {
  recipe.costPerServing = costFromIngredients(recipe);
}

/** Adds or replaces AI-invented recipes, keeping ones already registered. */
export function registerDynamicRecipes(recipes: Recipe[]): void {
  for (const recipe of recipes) {
    dynamicRecipes.set(recipe.id, { ...recipe, costPerServing: costFromIngredients(recipe) });
  }
}

/** All currently-registered AI-invented recipes, for persisting to Firestore. */
export function getAllDynamicRecipes(): Recipe[] {
  return Array.from(dynamicRecipes.values());
}

/** Clears AI recipes on sign-out so the next user doesn't see them. */
export function clearDynamicRecipes(): void {
  dynamicRecipes.clear();
}

export function getRecipeById(recipeId: string): Recipe | undefined {
  return dynamicRecipes.get(recipeId) ?? recipeCatalog.find((recipe) => recipe.id === recipeId);
}
