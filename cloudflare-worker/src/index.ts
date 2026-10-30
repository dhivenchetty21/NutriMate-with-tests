/**
 * NutriMate live backend (Cloudflare Worker, free plan).
 *
 *  POST /api/plan         Asks Gemini to write new recipes for the household's
 *                         preferences and budget. Each recipe is validated
 *                         before it is returned to the app.
 *  GET  /api/prices       Returns the latest prices for TRACKED_PRODUCTS from KV.
 *  POST /api/fetch-price  Looks up the price for one product link (used when a
 *                         user tracks a new item in the app).
 *  POST /api/refresh-now  Refreshes prices now (needs REFRESH_SECRET).
 *  Scheduled (every 6 h)  Refreshes TRACKED_PRODUCTS and, if the Firebase
 *                         service-account secrets are set, the shared
 *                         trackedItems collection in Firestore.
 *
 * Deploy steps are in cloudflare-worker/README.md.
 */

import {
  FirebaseAdminEnv,
  isFirebaseAdminConfigured,
  listCollection,
  patchDocumentFields,
} from './firestoreAdmin';

export interface Env extends FirebaseAdminEnv {
  GEMINI_API_KEY: string;
  REFRESH_SECRET: string;
  PRICES: KVNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Refresh-Secret',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// 1. AI meal plan (Gemini writes new recipes)
// ---------------------------------------------------------------------------

type PlanRequest = {
  preferences: {
    cookingTime: string;
    diet: string;
  };
  householdSize: number;
  weeklyBudget: number;
};

// Recipe shape the app expects (matches Recipe in src/types/index.ts).
type InventedRecipe = {
  title: string;
  summary: string;
  mealType: string;
  servings: number;
  durationMinutes: number;
  costPerServing: number;
  dietaryTags: string[];
  explanation: string;
  ingredients: { name: string; quantity: string; estimatedPrice: number }[];
  substitutions: { original: string; alternative: string; note: string }[];
};

// Gemini model on Google AI Studio's free tier.
const GEMINI_MODEL = 'gemini-3.8-flash';

const VALID_MEAL_TYPES = new Set(['Breakfast', 'Lunch', 'Dinner']);

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks one recipe from Gemini: every field must have the right type and a
 * sensible range. Returns null for an invalid recipe, which is then dropped.
 */
function sanitiseInventedRecipe(raw: unknown, index: number): (InventedRecipe & { id: string }) | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.title)) return null;
  const mealType = isNonEmptyString(r.mealType) && VALID_MEAL_TYPES.has(r.mealType) ? r.mealType : 'Dinner';

  const servings = isFiniteNumber(r.servings) ? Math.min(Math.max(Math.round(r.servings), 1), 12) : 4;
  const durationMinutes = isFiniteNumber(r.durationMinutes)
    ? Math.min(Math.max(Math.round(r.durationMinutes), 5), 180)
    : 30;
  const costPerServing = isFiniteNumber(r.costPerServing)
    ? Math.min(Math.max(r.costPerServing, 1), 500)
    : 25;

  const dietaryTags = Array.isArray(r.dietaryTags)
    ? r.dietaryTags.filter(isNonEmptyString).slice(0, 5)
    : [];

  const ingredientsRaw = Array.isArray(r.ingredients) ? r.ingredients : [];
  const ingredients = ingredientsRaw
    .map((ing) => {
      if (typeof ing !== 'object' || ing === null) return null;
      const i = ing as Record<string, unknown>;
      if (!isNonEmptyString(i.name) || !isNonEmptyString(i.quantity)) return null;
      return {
        name: i.name.trim().slice(0, 60),
        quantity: i.quantity.trim().slice(0, 30),
        estimatedPrice: isFiniteNumber(i.estimatedPrice)
          ? Math.min(Math.max(i.estimatedPrice, 0), 300)
          : 10,
      };
    })
    .filter((i): i is InventedRecipe['ingredients'][number] => i !== null)
    .slice(0, 12);

  if (ingredients.length === 0) return null;

  const substitutionsRaw = Array.isArray(r.substitutions) ? r.substitutions : [];
  const substitutions = substitutionsRaw
    .map((sub) => {
      if (typeof sub !== 'object' || sub === null) return null;
      const s = sub as Record<string, unknown>;
      if (!isNonEmptyString(s.original) || !isNonEmptyString(s.alternative) || !isNonEmptyString(s.note)) {
        return null;
      }
      return {
        original: s.original.trim().slice(0, 60),
        alternative: s.alternative.trim().slice(0, 60),
        note: s.note.trim().slice(0, 140),
      };
    })
    .filter((s): s is InventedRecipe['substitutions'][number] => s !== null)
    .slice(0, 3);

  const title = r.title.trim().slice(0, 80);

  return {
    // Random suffix keeps ids unique if two recipes share a title.
    id: `ai-${slugify(title)}-${Date.now().toString(36)}-${index}`,
    title,
    summary: isNonEmptyString(r.summary) ? r.summary.trim().slice(0, 160) : 'An AI-generated recipe.',
    mealType,
    servings,
    durationMinutes,
    costPerServing,
    dietaryTags,
    explanation: isNonEmptyString(r.explanation) ? r.explanation.trim().slice(0, 240) : '',
    ingredients,
    substitutions,
  };
}

async function handlePlan(request: Request, env: Env): Promise<Response> {
  let body: PlanRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.preferences || !isFiniteNumber(body.householdSize) || !isFiniteNumber(body.weeklyBudget)) {
    return json({ error: 'Missing preferences, householdSize or weeklyBudget' }, 400);
  }

  const budgetPerServing = Math.max(
    1,
    Math.round(body.weeklyBudget / (Math.max(body.householdSize, 1) * 7)),
  );

  const systemPrompt =
    'You are a budget-conscious meal planning assistant for a South African household. ' +
    'Invent 3 to 5 wholly ORIGINAL dinner recipes (not copies of famous or copyrighted dishes by ' +
    'name) tailored to the household\'s preferences and budget. Use ingredients realistically ' +
    'available in South African supermarkets, with realistic Rand prices. The app will repeat ' +
    'these across the 7 days of the week, so favor variety in protein/style over similar meals. ' +
    'Keep each recipe\'s costPerServing at or below the household\'s per-serving budget where ' +
    'realistically possible. ' +
    'Reply with ONLY a JSON object, no markdown fences, no extra text, matching exactly this shape: ' +
    '{"recipes":[{"title":"...","summary":"one short sentence","mealType":"Dinner",' +
    '"servings":4,"durationMinutes":30,"costPerServing":24,"dietaryTags":["..."],' +
    '"explanation":"one short sentence on why this fits the household",' +
    '"ingredients":[{"name":"...","quantity":"...","estimatedPrice":12}],' +
    '"substitutions":[{"original":"...","alternative":"...","note":"..."}]}],' +
    '"tip":"one short, specific, friendly sentence introducing the week"}';

  const userPrompt = JSON.stringify({
    preferences: body.preferences,
    householdSize: body.householdSize,
    weeklyBudget: body.weeklyBudget,
    budgetPerServing,
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        // Turn off "thinking" so the reply arrives within the app's timeout,
        // and allow enough tokens for five full recipes.
        generationConfig: {
          maxOutputTokens: 3000,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    return json({ error: 'AI provider error', detail: errText }, 502);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return json({ error: 'No text in AI response' }, 502);
  }

  let parsed: { recipes: unknown[]; tip: string };
  try {
    // Remove code fences if Gemini adds them.
    const cleaned = text.trim().replace(/^```json\s*|```$/g, '');
    parsed = JSON.parse(cleaned);
  } catch {
    return json({ error: 'Could not parse AI response', raw: text }, 502);
  }

  const rawRecipes = Array.isArray(parsed.recipes) ? parsed.recipes : [];
  const safeRecipes = rawRecipes
    .map((r, index) => sanitiseInventedRecipe(r, index))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (safeRecipes.length === 0) {
    return json({ error: 'AI did not return any usable recipes' }, 502);
  }

  const tip = isNonEmptyString(parsed.tip) ? parsed.tip.trim().slice(0, 200) : '';

  return json({ recipes: safeRecipes, tip });
}

// ---------------------------------------------------------------------------
// 2. Live price tracking
// ---------------------------------------------------------------------------

// Built-in tracked products (Checkers product pages).
const TRACKED_PRODUCTS: { id: string; name: string; url: string }[] = [
  {
    id: 'bread-albany-superior-700g',
    name: 'Albany Superior White Bread 700g',
    url: 'https://www.checkers.co.za/product/albany-superior-white-bread-700g-10136301EA',
  },
  {
    id: 'chicken-farmers-choice-drum-thigh-16pc',
    name: "Farmer's Choice Chicken Drum & Thigh 16 Piece",
    url: 'https://www.checkers.co.za/product/farmers-choice-fresh-drum-and-thigh-chicken-individually-wrapped-16-piece-10732965KG',
  },
  {
    id: 'beef-stewing-per-kg',
    name: 'Stewing Beef per kg',
    url: 'https://www.checkers.co.za/product/stewing-beef-per-kg-10151647KG',
  },
  {
    id: 'milk-clover-full-cream-2l',
    name: 'Clover Fresh Full Cream Milk 2L',
    url: 'https://www.checkers.co.za/product/clover-fresh-full-cream-milk-2l-10136729EA',
  },
  {
    id: 'eggs-nulaid-xl-18pack',
    name: 'Nulaid Extra Large Eggs 18 Pack',
    url: 'https://www.checkers.co.za/product/nulaid-extra-large-eggs-18-pack-10125871EA',
  },
];

const PRICES_KEY = 'latest-prices';

// Maps a link's domain to a store name (e.g. "Checkers"). Unknown stores use
// a cleaned-up hostname.
const KNOWN_RETAILERS: Record<string, string> = {
  'checkers.co.za': 'Checkers',
  'shoprite.co.za': 'Shoprite',
  'pnp.co.za': 'Pick n Pay',
  'picknpay.co.za': 'Pick n Pay',
  'woolworths.co.za': 'Woolworths',
  'spar.co.za': 'SPAR',
  'game.co.za': 'Game',
  'makro.co.za': 'Makro',
  'pricecheck.co.za': 'PriceCheck',
};

function retailerNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (KNOWN_RETAILERS[hostname]) return KNOWN_RETAILERS[hostname];

    // Unknown store: "somestore.co.za" becomes "Somestore".
    const label = hostname.split('.')[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return 'Retailer';
  }
}

function extractPriceFromHtml(html: string): number | null {
  // Method 1: schema.org Product/Offer JSON-LD data on the page.
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of ldMatches) {
    try {
      const block = JSON.parse(match[1].trim());
      const candidates = Array.isArray(block) ? block : [block];
      for (const candidate of candidates) {
        const offers = candidate?.offers;
        const price = Array.isArray(offers) ? offers[0]?.price : offers?.price;
        if (price) {
          const num = Number(price);
          if (!Number.isNaN(num)) return num;
        }
      }
    } catch {
      // Not valid JSON: skip it.
    }
  }

  // Method 2: price fields inside JSON embedded in the page's <script> tags
  // (used by JavaScript-heavy stores such as Checkers).
  const jsonKeyPatterns = [
    /"sellingPrice"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i,
    /"specialPrice"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i,
    /"currentPrice"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i,
    /"unitPrice"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i,
    /"price"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i,
  ];
  for (const pattern of jsonKeyPatterns) {
    const match = html.match(pattern);
    if (match) {
      const num = Number(match[1]);
      // Ignore values outside a realistic grocery price range.
      if (!Number.isNaN(num) && num > 0.5 && num < 5000) {
        return num;
      }
    }
  }

  // Method 3 (last resort): the first "R123.45" amount on the page.
  const priceMatch = html.match(/R\s?(\d{1,4}[.,]\d{2})/);
  if (priceMatch) {
    return Number(priceMatch[1].replace(',', '.'));
  }

  return null;
}

/**
 * Reads every retailer's price from a PriceCheck offers page
 * (pricecheck.co.za/offers/<id>/<slug>). The page's JSON-LD Product has an
 * AggregateOffer listing one Offer per retailer, so one link gives a full
 * comparison. Returns null if the markup doesn't match.
 */
function extractPriceCheckOffers(html: string): { retailer: string; price: number }[] | null {
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  let sawProductBlock = false;
  let blockCount = 0;

  for (const match of ldMatches) {
    blockCount += 1;
    try {
      const block = JSON.parse(match[1].trim());
      if (block?.['@type'] !== 'Product') continue;
      sawProductBlock = true;

      // offers can be a list (two or more retailers) or a single Offer object.
      const offersField = block.offers as Record<string, unknown> | undefined;
      const nestedOffers: unknown[] = Array.isArray(offersField?.offers)
        ? (offersField!.offers as unknown[])
        : offersField && typeof offersField === 'object' && 'price' in offersField
          ? [offersField]
          : [];

      if (nestedOffers.length === 0) {
        console.log(
          'PriceCheck: Product block found but no usable offers field. Shape:',
          JSON.stringify(offersField).slice(0, 300),
        );
        continue;
      }

      const offers = nestedOffers
        .map((raw: unknown) => {
          if (typeof raw !== 'object' || raw === null) return null;
          const offer = raw as Record<string, unknown>;
          const seller = offer.seller as Record<string, unknown> | undefined;
          const retailer = typeof seller?.name === 'string' ? seller.name.trim() : '';
          const price = Number(offer.price);
          // Same realistic price range as above.
          if (!retailer || !Number.isFinite(price) || price <= 0.5 || price >= 5000) {
            return null;
          }
          return { retailer, price };
        })
        .filter((o): o is { retailer: string; price: number } => o !== null)
        .slice(0, 10);

      if (offers.length > 0) return offers;
      console.log(
        'PriceCheck: offers array present but every entry failed validation. Raw:',
        JSON.stringify(nestedOffers).slice(0, 300),
      );
    } catch (err) {
      console.log(
        'PriceCheck: JSON-LD block failed to parse:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  if (!sawProductBlock) {
    console.log(`PriceCheck: no Product JSON-LD block found among ${blockCount} script(s).`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2b. Open Prices (prices.openfoodfacts.org): free, crowd-sourced price data
//     used when the store page gives no price. Errors count as "no match".
//     South African coverage is small, so this is a backup only.
// ---------------------------------------------------------------------------

async function fetchOpenPricesFallback(productName: string): Promise<number | null> {
  try {
    const url =
      'https://prices.openfoodfacts.org/api/v1/prices?' +
      new URLSearchParams({
        product_name: productName,
        countries_tags: 'en:south-africa',
        order_by: '-created',
        size: '1',
      }).toString();

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: { price?: number }[];
      results?: { price?: number }[];
    };
    const list = data.items ?? data.results ?? [];
    const price = list[0]?.price;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

type PriceLookupResult = {
  price: number | null;
  source: 'retailer' | 'open-prices' | 'unavailable';
  /** Store name, e.g. "Checkers", or "Open Prices" for the fallback. */
  retailer: string;
  /** All retailer prices, when the link is a PriceCheck comparison page. */
  offers?: { retailer: string; price: number }[];
  error?: string;
};

/**
 * Full price lookup for one product: the store page first, then Open Prices.
 * Used by the scheduled refresh and by /api/fetch-price.
 */
async function lookupProductPrice(url: string, name: string): Promise<PriceLookupResult> {
  const retailer = retailerNameFromUrl(url);
  const isPriceCheckUrl = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '') === 'pricecheck.co.za';
    } catch {
      return false;
    }
  })();

  try {
    const res = await fetch(url, {
      headers: {
        // Some stores block requests without a browser user agent.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const html = await res.text();

      if (isPriceCheckUrl) {
        const offers = extractPriceCheckOffers(html);
        if (offers && offers.length > 0) {
          const cheapest = offers.reduce((a, b) => (b.price < a.price ? b : a));
          return { price: cheapest.price, source: 'retailer', retailer: cheapest.retailer, offers };
        }
        // PriceCheck markup didn't match: try the general methods below.
      }

      const price = extractPriceFromHtml(html);
      if (price !== null) {
        return { price, source: 'retailer', retailer };
      }
    }
  } catch {
    // Continue to the Open Prices fallback.
  }

  const fallbackPrice = await fetchOpenPricesFallback(name);
  if (fallbackPrice !== null) {
    return { price: fallbackPrice, source: 'open-prices', retailer: 'Open Prices' };
  }

  return { price: null, source: 'unavailable', retailer, error: 'No price found from either source' };
}

async function refreshPrices(env: Env): Promise<void> {
  if (TRACKED_PRODUCTS.length === 0) {
    return;
  }

  const results = await Promise.all(
    TRACKED_PRODUCTS.map(async (product) => {
      const result = await lookupProductPrice(product.url, product.name);
      return { ...product, ...result };
    }),
  );

  await env.PRICES.put(
    PRICES_KEY,
    JSON.stringify({ updatedAt: new Date().toISOString(), items: results }),
  );
}

// ---------------------------------------------------------------------------
// 2d. Refresh the shared trackedItems collection in Firestore, so every
//     user sees current prices. Only runs when the FIREBASE_* service-account
//     secrets are set (see firestoreAdmin.ts).
// ---------------------------------------------------------------------------

async function refreshSharedTrackedItems(env: Env): Promise<void> {
  if (!isFirebaseAdminConfigured(env)) return;

  let items: Awaited<ReturnType<typeof listCollection>>;
  try {
    items = await listCollection(env, 'trackedItems');
  } catch (err) {
    // Could not reach Firestore: try again on the next run.
    console.error('refreshSharedTrackedItems: could not list trackedItems', err);
    return;
  }

  await Promise.all(
    items.map(async (itemDoc) => {
      const url = typeof itemDoc.fields.url === 'string' ? itemDoc.fields.url : '';
      const name = typeof itemDoc.fields.name === 'string' ? itemDoc.fields.name : 'Item';
      if (!url) return;

      const result = await lookupProductPrice(url, name);
      try {
        await patchDocumentFields(env, 'trackedItems', itemDoc.id, {
          price: result.price,
          source: result.source,
          retailer: result.retailer,
          // Keep the per-retailer offers for PriceCheck items.
          offers: result.offers ?? null,
          fetchedAt: new Date().toISOString(),
        });
      } catch (err) {
        // One failed write doesn't stop the others.
        console.error(`refreshSharedTrackedItems: patch failed for ${itemDoc.id}`, err);
      }
    }),
  );
}

async function handleGetPrices(env: Env): Promise<Response> {
  const cached = await env.PRICES.get(PRICES_KEY);
  if (!cached) {
    return json({ updatedAt: null, items: [] });
  }
  return json(JSON.parse(cached));
}

// ---------------------------------------------------------------------------
// 2c. Price lookup for one product link (used by "Track a new item")
// ---------------------------------------------------------------------------

type FetchPriceRequest = {
  url: string;
  name: string;
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function handleFetchPrice(request: Request): Promise<Response> {
  let body: FetchPriceRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isHttpUrl(body.url)) {
    return json({ error: 'A valid http(s) product URL is required' }, 400);
  }

  const name = isNonEmptyString(body.name) ? body.name.trim().slice(0, 80) : 'Item';
  const result = await lookupProductPrice(body.url, name);
  return json(result);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/plan' && request.method === 'POST') {
      return handlePlan(request, env);
    }

    if (url.pathname === '/api/prices' && request.method === 'GET') {
      return handleGetPrices(env);
    }

    if (url.pathname === '/api/fetch-price' && request.method === 'POST') {
      return handleFetchPrice(request);
    }

    if (url.pathname === '/api/refresh-now' && request.method === 'POST') {
      const secret = request.headers.get('X-Refresh-Secret');
      if (secret !== env.REFRESH_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
      await Promise.all([refreshPrices(env), refreshSharedTrackedItems(env)]);
      return json({ ok: true, crossAccountRefresh: isFirebaseAdminConfigured(env) });
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      Promise.all([refreshPrices(env), refreshSharedTrackedItems(env)]),
    );
  },
};
