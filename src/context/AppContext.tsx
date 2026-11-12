import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { planDays } from '../data/mockData';
import { getRecipeById, registerDynamicRecipes } from '../data/recipes';
import { getDeviceId } from '../services/deviceId';
import { fetchLivePrices, isLiveBackendConfigured } from '../services/liveApi';
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
import {
  addSharedTrackedItem,
  isSharedTrackingConfigured,
  migrateLegacyPriceItems,
  removeSharedTrackedItem,
  subscribeToSharedTrackedItems,
} from '../services/trackedItems';
import { colors } from '../theme/colors';
import {
  CustomPriceItem,
  PantryItem,
  PlanHistoryEntry,
  PlannedMeal,
  UserProfile,
} from '../types';
import {
  buildShoppingBasket,
  countPantryMatches,
  estimatePlanCost,
} from '../utils/basket';
import { setLivePackPrices } from '../utils/livePricing';
import { useAuth } from './AuthContext';

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
  // The account whose data is currently loaded. Data counts as ready only for that account,
  // so right after a sign-in the old (signed-out) state is never treated as the user's data.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [planHistory, setPlanHistory] = useState<PlanHistoryEntry[]>([]);
  const [customPriceItems, setCustomPriceItems] = useState<CustomPriceItem[]>([]);
  // Bumped when live prices load, so the basket and plan cost recalculate.
  const [livePriceVersion, setLivePriceVersion] = useState(0);

  // Reload everything when the signed-in user changes (storage.ts reads that user's document).
  const authKey = isAuthConfigured ? user?.uid ?? 'signed-out' : 'local-only';
  const isReady = loadedKey === authKey;

  useEffect(() => {
    // Wait for Firebase to finish restoring the session before loading any data.
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

      // Register AI recipes first so saved meals can find their recipe by id.
      registerDynamicRecipes(savedCustomRecipes);

      setProfile(savedProfile);
      setPantryItems(savedPantry);
      setPlannedMeals(savedPlan);
      console.log('[app] loaded', authKey, 'onboarded:', onboardingComplete, 'name:', savedProfile.userName);
      setHasOnboarded(onboardingComplete);
      setPlanHistory(savedPlanHistory);

      if (isSharedTrackingConfigured()) {
        // Tracked items are a shared pool kept live by the subscription below.
        // Move this account's older private items into it (does nothing once migrated).
        if (isAuthConfigured && user && legacyPriceItems.length > 0) {
          migrateLegacyPriceItems(user.uid, legacyPriceItems).catch(() => {
            // Migration retries on the next login.
          });
        }
      } else {
        // No Firestore: keep tracked items on this device only.
        setCustomPriceItems(legacyPriceItems);
      }

      setLoadedKey(authKey);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [authKey, isAuthConfigured, authLoading, user]);

  // The name shown on Home and Profile is the one entered at sign-up.
  // Falls back to the start of the email if the account has no name.
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
      // Syncs again on the next successful load.
    });
  }, [profile, registeredName]);

  // Load live prices for tracked staples (eggs, milk, bread, beef, chicken).
  // Skipped if the Worker is not configured.
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

  // Live shared list of tracked price items: every user sees items added by any user.
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

  // No purchases are tracked, so "spent" means the planned cost:
  // this week's plan, and that projected over a month (about 4.3 weeks).
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

    // Save the plan being replaced into history (only if it had meals).
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

    // The current plan goes into history too, so restoring never loses it.
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
      // Write to the shared list; the subscription updates the screen.
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