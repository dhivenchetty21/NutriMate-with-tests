/**
 * Calls to the NutriMate Cloudflare Worker (AI meal plans and live prices).
 * Every function returns null instead of throwing when the Worker is not
 * configured or the request fails, so screens can fall back to local data.
 */
import { Recipe } from '../types';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL?.replace(/\/$/, '') ?? '';

export function isLiveBackendConfigured(): boolean {
  return WORKER_URL.length > 0;
}

export type AiPlanRequest = {
  preferences: { cookingTime: string; diet: string };
  householdSize: number;
  weeklyBudget: number;
};

export type AiPlanResult = {
  /** New recipes written by Gemini. The caller registers them so they can be found by id. */
  recipes: Recipe[];
  tip: string;
};

// Reason the last AI request failed, so the screen can tell the user why it
// used the local recipes instead.
let lastAiPlanError: string | null = null;

export function getLastAiPlanError(): string | null {
  return lastAiPlanError;
}

export async function generateAiMealPlan(
  request: AiPlanRequest,
): Promise<AiPlanResult | null> {
  lastAiPlanError = null;

  if (!WORKER_URL) {
    lastAiPlanError = 'Live backend URL is not configured (EXPO_PUBLIC_WORKER_URL is empty).';
    return null;
  }

  try {
    const controller = new AbortController();
    // AI generation can be slow, so allow up to 45 seconds.
    const timeout = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(`${WORKER_URL}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Keep the Worker's error text (for example an invalid Gemini key).
      const bodyText = await res.text().catch(() => '');
      lastAiPlanError = `Worker responded ${res.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ''}`;
      return null;
    }

    const data = (await res.json()) as AiPlanResult;
    if (!Array.isArray(data.recipes) || data.recipes.length === 0) {
      lastAiPlanError = 'Worker responded OK but returned no usable recipes.';
      return null;
    }
    return data;
  } catch (err) {
    lastAiPlanError =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request to the live backend timed out.'
        : `Could not reach the live backend (${err instanceof Error ? err.message : 'unknown error'}).`;
    return null;
  }
}

export type LivePriceItem = {
  id: string;
  name: string;
  url: string;
  price: number | null;
  source?: 'retailer' | 'open-prices' | 'unavailable';
  /** Store name, e.g. "Checkers", or "Open Prices" for the fallback source. */
  retailer?: string;
  /** All retailer prices found, when the link is a comparison page such as PriceCheck. */
  offers?: { retailer: string; price: number }[];
  error?: string;
};

export type LivePrices = {
  updatedAt: string | null;
  items: LivePriceItem[];
};

export async function fetchLivePrices(): Promise<LivePrices | null> {
  if (!WORKER_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${WORKER_URL}/api/prices`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return (await res.json()) as LivePrices;
  } catch {
    return null;
  }
}

export type FetchPriceResult = {
  price: number | null;
  source: 'retailer' | 'open-prices' | 'unavailable';
  retailer: string;
  /** All retailer prices found, when the link is a comparison page such as PriceCheck. */
  offers?: { retailer: string; price: number }[];
};

/** Looks up the price for one product link. Used by the "Track a new item" screen. */
export async function fetchPriceForUrl(
  url: string,
  name: string,
): Promise<FetchPriceResult | null> {
  if (!WORKER_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${WORKER_URL}/api/fetch-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return (await res.json()) as FetchPriceResult;
  } catch {
    return null;
  }
}
