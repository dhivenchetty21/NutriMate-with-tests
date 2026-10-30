import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import {
  defaultPlannedMeals,
  defaultPantryItems,
  defaultProfile,
} from '../data/mockData';
import {
  CustomPriceItem,
  PantryItem,
  PlanHistoryEntry,
  PlannedMeal,
  Recipe,
  UserProfile,
} from '../types';
import { getDeviceId } from './deviceId';
import { getAuthInstance, getDb, isAuthConfigured } from './firebase';

/**
 * Data layer for everything a user saves.
 *  - Firestore (households/{uid}) is the real database and the source of truth.
 *  - AsyncStorage is an on-device copy, so screens load instantly and the app
 *    still works offline.
 * Every save writes to both. Every load prefers Firestore and falls back to the
 * local copy. If Firebase is not configured, only the local copy is used.
 */

const PANTRY_KEY = 'mealplanner.pantry.v1';
const PLAN_KEY = 'mealplanner.plan.v1';
const PROFILE_KEY = 'mealplanner.profile.v1';
const ONBOARDING_KEY = 'mealplanner.onboarding.v1';
const CUSTOM_RECIPES_KEY = 'mealplanner.customRecipes.v1';
const PLAN_HISTORY_KEY = 'mealplanner.planHistory.v1';
const CUSTOM_PRICE_ITEMS_KEY = 'mealplanner.customPriceItems.v1';

const ALL_BASE_KEYS = [
  PANTRY_KEY,
  PLAN_KEY,
  PROFILE_KEY,
  ONBOARDING_KEY,
  CUSTOM_RECIPES_KEY,
  PLAN_HISTORY_KEY,
  CUSTOM_PRICE_ITEMS_KEY,
];

// Caps so these ever-growing lists can't make the Firestore document too large.
const MAX_CUSTOM_RECIPES = 40;
const MAX_PLAN_HISTORY_ENTRIES = 12;

type HouseholdDoc = {
  profile: UserProfile;
  pantryItems: PantryItem[];
  plannedMeals: PlannedMeal[];
  onboardingComplete: boolean;
  customRecipes: Recipe[];
  planHistory: PlanHistoryEntry[];
  customPriceItems: CustomPriceItem[];
};

// The signed-in user's Firebase uid is used as the Firestore document id, so
// their data follows them to any device. AuthContext updates it on sign-in/out.
let activeUserId: string | null = null;

export function setActiveStorageUser(uid: string | null): void {
  if (activeUserId === uid) return;
  activeUserId = uid;
  // The cached read belonged to the previous user, so drop it.
  remoteReadPromise = null;
}

async function resolveStorageId(): Promise<string> {
  return activeUserId ?? getDeviceId();
}

// Local keys are stored per account ("guest" when signed out), so each account
// keeps its own offline copy and a failed Firestore read never shows another
// user's data or the sample defaults.
function localKey(base: string): string {
  return activeUserId ? `${base}.${activeUserId}` : `${base}.guest`;
}

// Reads the per-account key. If it is missing, copies over any value saved
// under the old shared key (from before per-account storage existed).
async function readLocal(base: string): Promise<string | null> {
  const namespaced = localKey(base);
  const current = await AsyncStorage.getItem(namespaced);
  if (current !== null) {
    return current;
  }

  const legacy = await AsyncStorage.getItem(base);
  if (legacy !== null) {
    await AsyncStorage.setItem(namespaced, legacy);
    return legacy;
  }

  return null;
}

async function writeLocal(base: string, value: string): Promise<void> {
  await AsyncStorage.setItem(localKey(base), value);
}

function isPermissionDenied(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'permission-denied';
}

// Right after sign-in Firestore can briefly reject requests while the auth
// token catches up. Retry "permission denied" errors after these delays (ms).
const PERMISSION_DENIED_RETRY_DELAYS_MS = [500, 1000, 2000];

async function readRemoteOnce(): Promise<Partial<HouseholdDoc> | null> {
  if (!remoteReadPromise) {
    remoteReadPromise = (async () => {
      const db = getDb();
      if (!db) return null;

      // Signed-out reads are always denied by the security rules, so skip them.
      if (isAuthConfigured() && !activeUserId) return null;

      for (let attempt = 0; attempt <= PERMISSION_DENIED_RETRY_DELAYS_MS.length; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, PERMISSION_DENIED_RETRY_DELAYS_MS[attempt - 1]),
          );
        }

        try {
          const id = await resolveStorageId();

          // Fetching the ID token makes Firestore use the newly signed-in user.
          const authUser = getAuthInstance()?.currentUser;
          if (activeUserId && authUser) {
            await authUser.getIdToken();
          }

          const snap = await getDoc(doc(db, 'households', id));
          return snap.exists() ? (snap.data() as HouseholdDoc) : null;
        } catch (err) {
          const isLastAttempt = attempt === PERMISSION_DENIED_RETRY_DELAYS_MS.length;

          if (!isPermissionDenied(err)) {
            // Offline or another error: retrying won't help, use the local copy.
            console.warn('[storage] Firestore read failed, falling back to local cache:', err);
            return null;
          }

          if (isLastAttempt) {
            console.warn(
              `[storage] Firestore read still denied after ${PERMISSION_DENIED_RETRY_DELAYS_MS.length} retries, falling back to local cache:`,
              err,
            );
            return null;
          }
          // Otherwise wait and try again.
        }
      }

      return null;
    })();
  }
  return remoteReadPromise;
}

// All load functions read the same document on start-up; share one request.
let remoteReadPromise: Promise<Partial<HouseholdDoc> | null> | null = null;

async function writeRemote(partial: Partial<HouseholdDoc>): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (isAuthConfigured() && !activeUserId) return;

  for (let attempt = 0; attempt <= PERMISSION_DENIED_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, PERMISSION_DENIED_RETRY_DELAYS_MS[attempt - 1]));
    }

    try {
      const id = await resolveStorageId();
      const authUser = getAuthInstance()?.currentUser;
      if (activeUserId && authUser) {
        await authUser.getIdToken();
      }
      // Store the owner's email and name so the document is easy to identify
      // in the Firebase console (the id itself must stay the uid).
      const owner = {
        ...(activeUserId && authUser?.email ? { email: authUser.email } : {}),
        ...(activeUserId && authUser?.displayName ? { displayName: authUser.displayName } : {}),
      };
      await setDoc(
        doc(db, 'households', id),
        { ...partial, ...owner, updatedAt: Date.now() },
        { merge: true },
      );

      // Update the cached read too, so a later reload doesn't bring back stale data.
      if (remoteReadPromise) {
        const previous = remoteReadPromise;
        remoteReadPromise = previous.then((prev) => ({ ...(prev ?? {}), ...partial }));
      }
      return;
    } catch (err) {
      const isLastAttempt = attempt === PERMISSION_DENIED_RETRY_DELAYS_MS.length;
      if (!isPermissionDenied(err) || isLastAttempt) {
        // The local copy is already saved; log so the failed cloud write is visible.
        console.warn('[storage] Firestore write failed, local copy kept only:', err);
        return;
      }
      // Permission denied and retries left: try again.
    }
  }
}

export async function loadPantry(): Promise<PantryItem[]> {
  const remote = await readRemoteOnce();
  if (remote?.pantryItems) {
    await writeLocal(PANTRY_KEY, JSON.stringify(remote.pantryItems));
    return remote.pantryItems;
  }
  const saved = await readLocal(PANTRY_KEY);
  return saved ? JSON.parse(saved) : defaultPantryItems;
}

export async function savePantry(items: PantryItem[]): Promise<void> {
  await writeLocal(PANTRY_KEY, JSON.stringify(items));
  await writeRemote({ pantryItems: items });
}

export async function loadPlan(): Promise<PlannedMeal[]> {
  const remote = await readRemoteOnce();
  if (remote?.plannedMeals) {
    await writeLocal(PLAN_KEY, JSON.stringify(remote.plannedMeals));
    return remote.plannedMeals;
  }
  const saved = await readLocal(PLAN_KEY);
  return saved ? JSON.parse(saved) : defaultPlannedMeals;
}

export async function savePlan(meals: PlannedMeal[]): Promise<void> {
  await writeLocal(PLAN_KEY, JSON.stringify(meals));
  await writeRemote({ plannedMeals: meals });
}

export async function loadProfile(): Promise<UserProfile> {
  const remote = await readRemoteOnce();
  if (remote?.profile) {
    await writeLocal(PROFILE_KEY, JSON.stringify(remote.profile));
    return remote.profile;
  }
  const saved = await readLocal(PROFILE_KEY);
  return saved ? JSON.parse(saved) : defaultProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await writeLocal(PROFILE_KEY, JSON.stringify(profile));
  await writeRemote({ profile });
}

export async function loadOnboardingComplete(): Promise<boolean> {
  const remote = await readRemoteOnce();
  if (typeof remote?.onboardingComplete === 'boolean') {
    await writeLocal(ONBOARDING_KEY, remote.onboardingComplete ? 'true' : 'false');
    return remote.onboardingComplete;
  }

  const saved = await readLocal(ONBOARDING_KEY);
  if (saved !== null) {
    return saved === 'true';
  }

  const existingProfile = await readLocal(PROFILE_KEY);
  return existingProfile !== null;
}

export async function saveOnboardingComplete(complete: boolean): Promise<void> {
  await writeLocal(ONBOARDING_KEY, complete ? 'true' : 'false');
  await writeRemote({ onboardingComplete: complete });
}

export async function loadCustomRecipes(): Promise<Recipe[]> {
  const remote = await readRemoteOnce();
  if (remote?.customRecipes) {
    await writeLocal(CUSTOM_RECIPES_KEY, JSON.stringify(remote.customRecipes));
    return remote.customRecipes;
  }
  const saved = await readLocal(CUSTOM_RECIPES_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function saveCustomRecipes(recipes: Recipe[]): Promise<void> {
  // Keep the newest recipes only, one per id.
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const capped = Array.from(byId.values()).slice(-MAX_CUSTOM_RECIPES);
  await writeLocal(CUSTOM_RECIPES_KEY, JSON.stringify(capped));
  await writeRemote({ customRecipes: capped });
}

export async function loadPlanHistory(): Promise<PlanHistoryEntry[]> {
  const remote = await readRemoteOnce();
  if (remote?.planHistory) {
    await writeLocal(PLAN_HISTORY_KEY, JSON.stringify(remote.planHistory));
    return remote.planHistory;
  }
  const saved = await readLocal(PLAN_HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function savePlanHistory(entries: PlanHistoryEntry[]): Promise<void> {
  const capped = entries.slice(-MAX_PLAN_HISTORY_ENTRIES);
  await writeLocal(PLAN_HISTORY_KEY, JSON.stringify(capped));
  await writeRemote({ planHistory: capped });
}

export async function loadCustomPriceItems(): Promise<CustomPriceItem[]> {
  const remote = await readRemoteOnce();
  if (remote?.customPriceItems) {
    await writeLocal(CUSTOM_PRICE_ITEMS_KEY, JSON.stringify(remote.customPriceItems));
    return remote.customPriceItems;
  }
  const saved = await readLocal(CUSTOM_PRICE_ITEMS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function saveCustomPriceItems(items: CustomPriceItem[]): Promise<void> {
  await writeLocal(CUSTOM_PRICE_ITEMS_KEY, JSON.stringify(items));
  await writeRemote({ customPriceItems: items });
}

/** Deletes the current account's local copy (for a future "reset my data" option). */
export async function clearLocalCache(): Promise<void> {
  await AsyncStorage.multiRemove(ALL_BASE_KEYS.map((base) => localKey(base)));
}
