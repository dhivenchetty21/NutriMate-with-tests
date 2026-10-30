# NutriMate live backend (Cloudflare Workers, 100% free plan)

This is the entire backend for the two "live" features: AI meal planning
(via Google's free Gemini API) and live price tracking. It runs on
Cloudflare's free Workers plan — no credit card needed, no billing risk.

## One-time setup

```bash
cd cloudflare-worker
npm install

# Sign in (opens a browser)
npx wrangler login

# Create the free KV namespace that caches scraped prices
npx wrangler kv namespace create PRICES
```

That last command prints something like:

```
[[kv_namespaces]]
binding = "PRICES"
id = "abcd1234..."
```

Copy that `id` value into `wrangler.toml` in this folder, replacing
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

## Secrets (never committed to git, never shown in this chat)

```bash
npx wrangler secret put GEMINI_API_KEY
# paste your key from aistudio.google.com/apikey when prompted — free, no card

npx wrangler secret put REFRESH_SECRET
# make up any random string — this just protects the manual refresh endpoint
```

## Deploy

```bash
npm run deploy
```

Wrangler prints a URL like `https://nutrimate-live.<your-subdomain>.workers.dev`.
**Copy this URL** — you'll paste it into the app's `.env` file as
`EXPO_PUBLIC_WORKER_URL` (see the main project README).

## Adding real tracked products

Open `src/index.ts` and find the `TRACKED_PRODUCTS` array near the top of the
price-tracking section. Add real product page URLs there, e.g.:

```ts
const TRACKED_PRODUCTS = [
  { id: 'chicken-1kg', name: 'Chicken portions 1kg', url: 'https://www.retailer.co.za/product/12345' },
  { id: 'milk-2l', name: 'Full cream milk 2L', url: 'https://www.retailer.co.za/product/67890' },
];
```

Then redeploy with `npm run deploy`. For each product, the refresh job tries
two sources in order:

1. **The retailer page itself** — looks for schema.org `Product`/`Offer`
   structured data first (most storefronts embed this for Google Shopping),
   then price data embedded in the page's scripts, then a plain `R123.45`
   pattern match. The last fallback is fragile and may need adjusting for
   some stores.
2. **Open Prices** (prices.openfoodfacts.org) — a free, open, crowd-sourced
   grocery price database, tried automatically whenever the retailer page
   doesn't yield a price. No setup needed, no API key. South Africa's
   coverage on this dataset is currently thin, so treat any hits as a bonus
   rather than your main source — the app labels each live price with
   which source it came from.

If both sources fail for an item, it's simply omitted from the live prices
panel that turn rather than showing a wrong number.

## Testing without waiting for the cron job

The scheduled refresh runs every 6 hours by default (edit the `crons` line
in `wrangler.toml` to change that). To trigger it immediately for testing:

```bash
curl -X POST https://nutrimate-live.<your-subdomain>.workers.dev/api/refresh-now \
  -H "X-Refresh-Secret: <the REFRESH_SECRET you chose above>"
```

Then check it worked:

```bash
curl https://nutrimate-live.<your-subdomain>.workers.dev/api/prices
```

## Local development

```bash
npm run dev
```

Runs the Worker locally (Wrangler prints a `localhost` URL) so you can test
`/api/plan` and `/api/prices` with `curl` or Postman before deploying.

## Costs

Genuinely R0. The Workers Free plan includes 100,000 requests/day with no
card on file. The Gemini API's free tier (Google AI Studio) also needs no
card — as of writing it allows roughly 500 requests/day on the model this
Worker uses (`gemini-2.5-flash`), which is far more than a student project's
testing/demo usage needs. Free-tier limits do change over time; check
aistudio.google.com for current numbers if requests start failing with a
rate-limit error.
