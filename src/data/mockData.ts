// Starting data for new users, plus fixed lists (days, onboarding steps, diet options).
import { PantryItem, PlannedMeal, UserProfile } from '../types';

export const priceCheckedAt = 'Today, 08:30';

export const defaultProfile: UserProfile = {
  // Filled in from the account's registered name once signed in (see AppContext).
  userName: '',
  householdSize: 2,
  weeklyBudget: 600,
  monthlyBudget: 2500,
  dietaryRequirements: ['Balanced eating'],
  language: 'English',
  goal: 'Stay on budget',
  location: 'Johannesburg',
  cookingPreference: 'Quick meals',
};

export const defaultPantryItems: PantryItem[] = [
  { id: '1', name: 'Maize meal', quantity: '2 kg', category: 'Staple' },
  { id: '2', name: 'Spinach', quantity: '1 bunch', category: 'Produce' },
  { id: '3', name: 'Eggs', quantity: '6', category: 'Protein' },
  { id: '4', name: 'Sugar beans', quantity: '500 g', category: 'Protein' },
];

export const defaultPlannedMeals: PlannedMeal[] = [
  {
    id: '1',
    recipeId: 'chicken-spinach-pap',
    day: 'Monday',
    mealType: 'Dinner',
    title: 'Chicken, spinach & pap',
    duration: '35 min',
    costPerServing: 29,
    dietaryTag: 'Lower salt',
    pantryItemsUsed: 2,
  },
  {
    id: '2',
    recipeId: 'bean-stew-rice',
    day: 'Tuesday',
    mealType: 'Dinner',
    title: 'Bean stew with rice',
    duration: '30 min',
    costPerServing: 14,
    dietaryTag: 'High fibre',
    pantryItemsUsed: 3,
  },
  {
    id: '3',
    recipeId: 'vegetable-pasta',
    day: 'Wednesday',
    mealType: 'Dinner',
    title: 'Roasted vegetable pasta',
    duration: '25 min',
    costPerServing: 12,
    dietaryTag: 'Vegetarian',
    pantryItemsUsed: 1,
  },
];

export const planDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const planDayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const dietaryOptions = [
  'High protein',
  'Balanced',
  'Vegetarian',
  'Lower salt',
  'High fibre',
] as const;

export const onboardingSteps = [
  {
    title: 'Welcome to NutriMate',
    subtitle:
      'Eat better. Spend smarter. Let’s build a meal plan that fits your life.',
    question: 'Start with one small choice.',
    options: ['Stay on budget', 'Balanced eating', 'Healthy choices'] as const,
    field: 'goal' as const,
  },
  {
    title: 'Set your food budget',
    subtitle: 'Use a realistic weekly amount. You can change it later.',
    question: 'Choose the closest option',
    options: ['R400 / week', 'R600 / week', 'R800 / week'] as const,
    field: 'weeklyBudget' as const,
  },
  {
    title: 'Who are you planning for?',
    subtitle: 'Serving sizes and grocery quantities will adjust automatically.',
    question: 'Choose the closest option',
    options: ['1 person', '2 people', '4 people'] as const,
    field: 'householdSize' as const,
  },
  {
    title: 'Keep it practical',
    subtitle: 'Select what makes weekday cooking easier.',
    question: 'Choose the closest option',
    options: ['Quick meals', 'Familiar food', 'Minimal ingredients'] as const,
    field: 'cookingPreference' as const,
  },
  {
    title: 'Any food preferences?',
    subtitle: 'This is optional. Update dietary needs any time in your profile.',
    question: 'Choose the closest option',
    options: ['High protein', 'Vegetarian', 'No preference'] as const,
    field: 'dietary' as const,
  },
  {
    title: 'Where do you shop?',
    subtitle: 'Location helps NutriMate show relevant estimated grocery prices.',
    question: 'Choose the closest option',
    options: ['Johannesburg', 'Cape Town', 'Other location'] as const,
    field: 'location' as const,
  },
] as const;

