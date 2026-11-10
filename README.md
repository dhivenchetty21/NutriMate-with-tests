# NutriMate

NutriMate is a React Native (Expo) app that helps South African households plan
weekly meals within a food budget, turn the plan into a grocery list, and compare
live grocery prices across retailers.

## Tech stack

| Layer | Technology |
|---|---|
| App | React Native with Expo and TypeScript |
| Navigation | Expo Router (file-based: tabs, stack and modals) |
| Login | Firebase Authentication (email and password) |
| Database | Cloud Firestore, with an AsyncStorage copy on the device |
| Live services | Cloudflare Worker: Gemini AI recipes and live retailer prices |
| State | React Context (`AuthContext`, `AppContext`) |

Live backend: https://nutrimate-live.dhiven-dev.workers.dev

## Project structure

```
src/
  app/            Screens (Expo Router). (tabs)/ holds the five bottom tabs.
  components/ui/  Reusable UI components (cards, buttons, chips, headers).
  context/        AuthContext (login state) and AppContext (app data and actions).
  services/       Firebase setup, Firestore storage, shared tracked items, Worker calls.
  utils/          Basket, budget, pricing, matching and recommendation logic.
  data/           Recipe catalog and starting data.
  theme/          Colours, fonts, spacing and text styles.
  types/          Shared TypeScript types.
tests/              Automated logic tests (tests/logic.test.ts, 23 tests).
cloudflare-worker/  The live backend (AI plans and price lookups). See its README.
FIRESTORE-SETUP.md  Firebase project, database and security-rule setup.
```

## Data stored in Firestore

| Collection | Document id | Contents |
|---|---|---|
| `households` | User's Firebase uid | Profile, pantry, planned meals, plan history, AI recipes, onboarding flag, owner email and name |
| `trackedItems` | Item id | Shared live-price items: name, link, retailer, price, offers, `addedBy` |

Security rules allow each signed-in user to read and write only their own
`households` document. Anyone can read `trackedItems`; only signed-in users can
add items, and only the user who added an item can delete it.

## Running the app

1. Install Node.js (LTS) and the Expo Go app on your phone.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env` and fill in the Worker URL and the six Firebase
   values (see `FIRESTORE-SETUP.md`).
4. Run `npx expo start` and scan the QR code with Expo Go.
   If the phone can't connect, use `npx expo start --tunnel`.
   Campus Wi-Fi often blocks phone-to-laptop traffic ("Failed to download remote
   update"). Use a phone hotspot for both the laptop and the phone, or `--tunnel`.

The Worker is deployed separately; see `cloudflare-worker/README.md`.
Without `.env` values the app still runs, using local storage and the built-in
recipe catalog only.

## Testing

Run the automated logic tests (diet matching, basket totals, pricing,
recommendations, catalogue):

    npm test

Type-check the app:

    npx tsc --noEmit

Manual testing was done on a real Android phone in Expo Go. The full test plan,
results and defect register are in Deliverable 5. Results were recorded against
commit 97d4923; the final commit is 4176631.

## Known limitations

- Tested on one Android phone in Expo Go; iOS and other devices are untested.
- No password reset yet.
- Recipe calories and protein are placeholders, not calculated from ingredients.
- Live prices depend on retailer page layouts; if a page changes, that item shows
  its last or an estimated price.