// App state: profile, pantry, meal plan, budget and tracked prices, saved through storage.ts.
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { getRecipeById, registerDynamicRecipes } from '../data/recipes';
import { planDays, priceCheckedAt } from '../data/mockData';
import {
  loadCustomPriceItems,
  loadCustomRecipes,
  loadOnboardingComplete,
  loadPantry,
  loadPlan,
  loadPlanHistory,
  loadProfile,
  saveCustomPriceItems,
  saveOnboardingComplete,
  savePantry,
  savePlan,
  savePlanHistory,
  saveProfile,
} from '../services/storage';
import { getDeviceId } from '../services/deviceId';
import { fetchLivePrices, isLiveBackendConfigured } from '../services/liveApi';
import {
  addSharedTrackedItem,
  isSharedTrackingConfigured,
  migrateLegacyPriceItems,
  removeSharedTrackedItem,
  subscribeToSharedTrackedItems,
} from '../services/trackedItems';
import {
  buildShoppingBasket,
  countPantryMatches,
  estimatePlanCost,
} from '../utils/basket';
import { setLivePackPrices } from '../utils/livePricing';
import { colors } from '../theme/colors';
import {
  CustomPriceItem,
  PantryItem,
  PlanHistoryEntry,
  PlannedMeal,
  UserProfile,
} from '../types';

type AppContextValue = {
  isReady: boolean;
  hasOnboarded: boolean;
  profile: UserProfile;
  pantryItems: PantryItem[];
  plannedMeals: PlannedMeal[];
  shoppingBasket: ReturnType<typeof buildShoppingBasket>;
  planCost: number;
  budgetRemaining: number;
  budgetSpent: number;
  monthlySpent: number;
  monthlyRemaining: number;
  weekSpent: number;
  priceCheckedAt: string;
  planHistory: PlanHistoryEntry[];
  customPriceItems: CustomPriceItem[];
  addPantryItem: (name: string) => void;
  removePantryItem: (itemId: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addMealToPlan: (recipeId: string, day: string, mealType?: string) => void;
  moveMealToDay: (mealId: string, day: string) => void;
  removeMealFromPlan: (mealId: string) => void;
  applyGeneratedPlan: (recipeIds: string[]) => Promise<void>;
  completeOnboarding: (updates: Partial<UserProfile>) => Promise<void>;
  restorePlanFromHistory: (entryId: string) => Promise<void>;
  addCustomPriceItem: (item: CustomPriceItem) => Promise<void>;
  removeCustomPriceItem: (itemId: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const { isAuthConfigured, isLoading: authLoading, user, displayName } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [planHistory, setPlanHistory] = useState<PlanHistoryEntry[]>([]);
  const [customPriceItems, setCustomPriceItems] = useState<CustomPriceItem[]>([]);
  // Changes when live prices arrive, so basket and plan costs recalculate.
  const [livePriceVersion, setLivePriceVersion] = useState(0);

  // Load the signed-in user's data, and reload it whenever the user changes.
  const authKey = isAuthConfigured ? user?.uid ?? 'signed-out' : 'local-only';

  useEffect(() => {
    // Wait until Firebase knows who is signed in.
    if (isAuthConfigured && authLoading) {
      return;
    }

    let isMounted = true;

    async function hydrate() {
      const [
        savedProfile,
        savedPantry,
        savedPlan,
        onboardingComplete,
        savedCustomRecipes,
        savedPlanHistory,
        legacyPriceItems,
      ] = await Promise.all([
        loadProfile(),
        loadPantry(),
        loadPlan(),
        loadOnboardingComplete(),
        loadCustomRecipes(),
        loadPlanHistory(),
        loadCustomPriceItems(),
      ]);

      if (!isMounted) {
        return;
      }

      // Register saved AI recipes first so planned meals can find them by id.
      registerDynamicRecipes(savedCustomRecipes);

      setProfile(savedProfile);
      setPantryItems(savedPantry);
      setPlannedMeals(savedPlan);
      setHasOnboarded(onboardingComplete);
      setPlanHistory(savedPlanHistory);

      if (isSharedTrackingConfigured()) {
        // Tracked items are shared (see trackedItems.ts). Move any older
        // private items into the shared list.
        if (isAuthConfigured && user && legacyPriceItems.length > 0) {
          migrateLegacyPriceItems(user.uid, legacyPriceItems).catch(() => {
            // If this fails, it is retried at the next login.
          });
        }
      } else {
        // No Firestore: keep tracked items on this device only.
        setCustomPriceItems(legacyPriceItems);
      }

      setIsReady(true);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [authKey, isAuthConfigured, authLoading, user]);

  // Show the name entered at sign-up on Home and Profile. Accounts without a
  // name use the first part of their email.
  const registeredName = useMemo(() => {
    if (!isAuthConfigured || !user) return null;
    const named = (displayName ?? user.displayName)?.trim();
    if (named) return named;
    const local = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
  }, [isAuthConfigured, user, displayName]);

  useEffect(() => {
    if (!profile || !registeredName || profile.userName === registeredName) return;
    const updated = { ...profile, userName: registeredName };
    setProfile(updated);
    saveProfile(updated).catch(() => {
      // If offline, it syncs on the next successful load.
    });
  }, [profile, registeredName]);

  // Load live prices for staples (eggs, milk, bread, beef, chicken) once, so
  // meal and basket costs use real shelf prices. Skipped without the Worker.
  useEffect(() => {
    if (!isLiveBackendConfigured()) return;
    let cancelled = false;
    fetchLivePrices().then((live) => {
      if (cancelled || !live) return;
      setLivePackPrices(live.items);
      setLivePriceVersion((version) => version + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the shared tracked-items list up to date in real time (Firestore only).
  useEffect(() => {
    if (!isSharedTrackingConfigured()) return undefined;
    const unsubscribe = subscribeToSharedTrackedItems(setCustomPriceItems);
    return unsubscribe;
  }, []);

  const shoppingBasket = useMemo(
    () => buildShoppingBasket(plannedMeals, pantryItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plannedMeals, pantryItems, livePriceVersion],
  );

  const planCost = useMemo(
    () => estimatePlanCost(plannedMeals, profile?.householdSize ?? 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plannedMeals, profile?.householdSize, livePriceVersion],
  );

  const budgetSpent = planCost;
  const budgetRemaining = useMemo(() => {
    if (!profile) {
      return 0;
    }

    return Math.max(profile.weeklyBudget - planCost, 0);
  }, [profile, planCost]);

  // Expected spend: this week's planned meals, and that amount over a month (~4.3 weeks).
  const weekSpent = Math.round(planCost);
  const monthlySpent = Math.round(planCost * 4.3);

  const monthlyRemaining = useMemo(() => {
    if (!profile) return 0;
    return Math.max(profile.monthlyBudget - monthlySpent, 0);
  }, [profile, monthlySpent]);

  async function addPantryItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const updated = [
      ...pantryItems,
      {
        id: Date.now().toString(),
        name: trimmed,
        quantity: 'Amount not set',
        category: 'Other' as const,
      },
    ];

    setPantryItems(updated);
    await savePantry(updated);
  }

  async function removePantryItem(itemId: string) {
    const updated = pantryItems.filter((item) => item.id !== itemId);
    setPantryItems(updated);
    await savePantry(updated);
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile) {
      return;
    }

    const updated = { ...profile, ...updates };
    setProfile(updated);
    await saveProfile(updated);
  }

  async function completeOnboarding(updates: Partial<UserProfile>) {
    if (!profile) {
      return;
    }

    const updated = { ...profile, ...updates };
    setProfile(updated);
    await Promise.all([saveProfile(updated), saveOnboardingComplete(true)]);
    setHasOnboarded(true);
  }

  async function addMealToPlan(recipeId: string, day: string, mealType = 'Dinner') {
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      return;
    }

    const existingIndex = plannedMeals.findIndex(
      (meal) => meal.day === day && (meal.mealType ?? 'Dinner') === mealType,
    );
    const nextMeal: PlannedMeal = {
      id: Date.now().toString(),
      recipeId: recipe.id,
      day,
      mealType: mealType as PlannedMeal['mealType'],
      title: recipe.title,
      duration: `${recipe.durationMinutes} min`,
      costPerServing: recipe.costPerServing,
      dietaryTag: recipe.dietaryTags[0] ?? 'Balanced',
      pantryItemsUsed: countPantryMatches(recipe.id, pantryItems),
    };

    const updated =
      existingIndex >= 0
        ? plannedMeals.map((meal, index) =>
            index === existingIndex ? { ...nextMeal, id: meal.id } : meal,
          )
        : [...plannedMeals, nextMeal];

    setPlannedMeals(updated);
    await savePlan(updated);
  }

  async function moveMealToDay(mealId: string, day: string) {
    const updated = plannedMeals.map((meal) =>
      meal.id === mealId ? { ...meal, day } : meal,
    );
    setPlannedMeals(updated);
    await savePlan(updated);
  }

  async function removeMealFromPlan(mealId: string) {
    const updated = plannedMeals.filter((meal) => meal.id !== mealId);
    setPlannedMeals(updated);
    await savePlan(updated);
  }

  async function applyGeneratedPlan(recipeIds: string[]) {
    const updated = recipeIds
      .map((recipeId, index) => {
        const recipe = getRecipeById(recipeId);
        if (!recipe) {
          return null;
        }

        const meal: PlannedMeal = {
          id: `${Date.now()}-${index}`,
          recipeId: recipe.id,
          day: planDays[index % planDays.length],
          mealType: recipe.mealType,
          title: recipe.title,
          duration: `${recipe.durationMinutes} min`,
          costPerServing: recipe.costPerServing,
          dietaryTag: recipe.dietaryTags[0] ?? 'Balanced',
          pantryItemsUsed: countPantryMatches(recipe.id, pantryItems),
        };
        return meal;
      })
      .filter((meal): meal is PlannedMeal => meal !== null);

    if (updated.length === 0) {
      return;
    }

    // Save the current plan to history before replacing it (if it has meals).
    if (plannedMeals.length > 0) {
      const historyEntry: PlanHistoryEntry = {
        id: `history-${Date.now()}`,
        savedAt: Date.now(),
        meals: plannedMeals,
      };
      const nextHistory = [...planHistory, historyEntry];
      setPlanHistory(nextHistory);
      await savePlanHistory(nextHistory);
    }

    setPlannedMeals(updated);
    await savePlan(updated);
  }

  async function restorePlanFromHistory(entryId: string) {
    const entry = planHistory.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }

    // Save the current plan to history too, so restoring never loses it.
    if (plannedMeals.length > 0) {
      const currentAsHistory: PlanHistoryEntry = {
        id: `history-${Date.now()}`,
        savedAt: Date.now(),
        meals: plannedMeals,
      };
      const nextHistory = [
        ...planHistory.filter((item) => item.id !== entryId),
        currentAsHistory,
      ];
      setPlanHistory(nextHistory);
      await savePlanHistory(nextHistory);
    }

    setPlannedMeals(entry.meals);
    await savePlan(entry.meals);
  }

  async function addCustomPriceItem(item: CustomPriceItem) {
    if (isSharedTrackingConfigured()) {
      // The live listener above updates the list for every user.
      const addedBy = user?.uid ?? (await getDeviceId());
      await addSharedTrackedItem(item, addedBy);
      return;
    }
    const updated = [...customPriceItems.filter((existing) => existing.id !== item.id), item];
    setCustomPriceItems(updated);
    await saveCustomPriceItems(updated);
  }

  async function removeCustomPriceItem(itemId: string) {
    if (isSharedTrackingConfigured()) {
      await removeSharedTrackedItem(itemId);
      return;
    }
    const updated = customPriceItems.filter((item) => item.id !== itemId);
    setCustomPriceItems(updated);
    await saveCustomPriceItems(updated);
  }

  if (!isReady || !profile) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loadingText}>Loading NutriMate…</Text>
      </View>
    );
  }

  return (
    <AppContext.Provider
      value={{
        isReady,
        hasOnboarded,
        profile,
        pantryItems,
        plannedMeals,
        shoppingBasket,
        planCost,
        budgetRemaining,
        budgetSpent,
        monthlySpent,
        monthlyRemaining,
        weekSpent,
        priceCheckedAt,
        planHistory,
        customPriceItems,
        addPantryItem,
        removePantryItem,
        updateProfile,
        addMealToPlan,
        moveMealToDay,
        removeMealFromPlan,
        applyGeneratedPlan,
        completeOnboarding,
        restorePlanFromHistory,
        addCustomPriceItem,
        removeCustomPriceItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmCream,
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 15,
  },
});
