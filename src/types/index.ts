// Shared TypeScript types for the app's data.
export type PantryItem = {
  id: string;
  name: string;
  quantity: string;
  category: 'Staple' | 'Protein' | 'Produce' | 'Vegetable' | 'Other';
};

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export type Recipe = {
  id: string;
  title: string;
  summary: string;
  mealType: MealType;
  servings: number;
  durationMinutes: number;
  costPerServing: number;
  dietaryTags: string[];
  explanation: string;
  ingredients: { name: string; quantity: string; estimatedPrice: number }[];
  substitutions: { original: string; alternative: string; note: string }[];
};

export type PlannedMeal = {
  id: string;
  recipeId: string;
  day: string;
  mealType?: MealType;
  title: string;
  duration: string;
  costPerServing: number;
  dietaryTag: string;
  pantryItemsUsed: number;
};

export type BasketItem = {
  id: string;
  name: string;
  quantity: string;
  alreadyInPantry: boolean;
  estimatedPrice: number;
};

export type UserProfile = {
  userName: string;
  householdSize: number;
  weeklyBudget: number;
  monthlyBudget: number;
  dietaryRequirements: string[];
  language: string;
  goal?: string;
  location?: string;
  cookingPreference?: string;
};

export type MealGeneratorFilters = {
  mealType: MealType;
  householdSize: number;
  maxDurationMinutes: number;
  budgetPerServing: number;
  dietaryRequirements: string[];
  usePantryOnly: boolean;
};

/** A snapshot of a past week's plan, saved whenever a new plan replaces it. */
export type PlanHistoryEntry = {
  id: string;
  savedAt: number;
  meals: PlannedMeal[];
};

/** A grocery item a user added in-app by pasting a real product URL. */
export type CustomPriceItem = {
  id: string;
  name: string;
  url: string;
  price: number | null;
  source: 'retailer' | 'open-prices' | 'unavailable';
  /** Store name taken from the link's domain, e.g. "Checkers". */
  retailer: string;
  fetchedAt: string;
  /** All retailer prices, when the link is a comparison page such as PriceCheck. */
  offers?: { retailer: string; price: number }[];
  /** uid of the user who added the item; only they can remove it. */
  addedBy?: string;
  addedAt?: string;
};
