# Setting up the real database (Firestore)

This app's data (profile, pantry, weekly meal plan) is stored in **Cloud
Firestore** — a real, free, NoSQL database from Google/Firebase. This is a
one-time setup, separate from the Cloudflare Worker (which handles the AI
and live-pricing features, not your data).

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Give it a name (e.g. `nutrimate`). You can skip Google Analytics — not needed.
3. Firestore is free on the **Spark** (no-cost) plan for this use case — you
   do **not** need to upgrade to Blaze for this part. (Blaze was only ever
   needed for the Cloudflare Worker's outbound calls, which live on
   Cloudflare instead — see `cloudflare-worker/README.md`.)

## 2. Create the Firestore database

1. In the Firebase Console, open **Build → Firestore Database → Create database**.
2. Choose a location close to South Africa (e.g. `europe-west1`) — this is permanent, pick carefully.
3. Start in **production mode** (we'll set explicit rules in the next step — don't leave it in the default locked-down state, or in fully-open test mode either).

## 3. Set security rules

Go to the **Rules** tab of your Firestore database.

**If you've enabled Email/Password sign-in (step 3a below), use the real rule:**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{householdId} {
      allow read, write: if request.auth != null && request.auth.uid == householdId;
    }
    match /trackedItems/{itemId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.addedBy;
    }
  }
}
```

This only allows a signed-in user to read/write the one document whose ID
matches their own Firebase Auth `uid` — nobody else's data is reachable, even
if they guess an ID. This is the rule this app's code now expects once login
is set up (`src/services/storage.ts` writes to `households/{uid}` for a
signed-in user).

`trackedItems` is different on purpose: it's the **shared** pool of live
price-tracked items (built by `src/services/trackedItems.ts`), not private
per-account data. Every user — even signed out — can read it, so a product
anyone tracks shows up on everyone's Price Comparison screen. Only a
signed-in user can add or refresh one, and only whoever originally added an
item can delete it (so one user can't wipe out items other people are
relying on).

**If you haven't set up login yet, and just want the app running locally
first**, use the looser placeholder rule instead, and come back to this step
once Auth is working:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{householdId} {
      allow read, write: if true;
    }
    match /trackedItems/{itemId} {
      allow read, write: if true;
    }
  }
}
```

**Be clear-eyed about what this means:** without the real rule above, anyone
who knows a household's random document ID could read or write it. It's a
reasonable, honest trade-off for a local student project while you're only
testing locally, but it's not real security — switch to the real rule once
Auth is enabled.

### 3a. Enable Email/Password sign-in

1. In the Firebase Console, open **Build → Authentication → Get started**
   (or **Sign-in method** if you've been here before).
2. Click **Email/Password** in the provider list, toggle it **Enable**, and
   **Save**. You don't need "Email link (passwordless sign-in)" — leave that off.
3. That's it — no further config needed. The app's `src/context/AuthContext.tsx`
   talks to this directly.

## 4. Get your web app config

1. Project settings (gear icon) → **General** → scroll to **Your apps** → click the **Web** icon (`</>`) to register a new web app.
2. Give it any nickname — you don't need Firebase Hosting.
3. Copy the `firebaseConfig` object it shows you.

## 5. Add it to your `.env`

Copy `.env.example` to `.env` in the project root if you haven't already,
and fill in the six `EXPO_PUBLIC_FIREBASE_*` values from that config object.
Restart `npx expo start` afterwards — Expo only reads `.env` at startup.

## 6. Test it

Run the app, go through onboarding, then change something (e.g. your
budget in Profile). In the Firebase Console, open **Firestore Database →
Data** — you should see a `households` collection with one document whose
ID matches a long random string, holding your profile/pantry/plan as
fields. Change the same value again and watch it update in the console
within a second or two.

## What this does and doesn't give you

- **Does:** your data is now in a real, queryable, durable database instead
  of only living in the app's local storage. If Firestore is reachable,
  your data survives even if you clear the app's storage or reinstall it.
- With Email/Password sign-in enabled (step 3a) and the real security rule
  (step 3) in place, each person's data is keyed to their own account
  (`households/{their uid}`), not just "whoever has this phone" — so the
  same account's plan, pantry and budget follow them to a different device
  once they sign in there too.
- **If you skip Auth entirely:** the app still works exactly as before —
  no login screen appears, and data is keyed to a random per-install device
  id instead (`src/services/deviceId.ts`). This is the fail-soft design used
  everywhere in this app: every live feature (the Worker, Firestore, and now
  Auth) checks whether it's configured and quietly falls back to local-only
  behaviour if not, so nothing breaks if a setup step is skipped.

## 7. Optional: let the Worker auto-refresh the shared tracked items

Items anyone tracks from the app (see "Track a new item") live in the
shared `trackedItems` collection (`src/services/trackedItems.ts`) — every
signed-in user reads and writes that same collection, so one item tracked
by any account shows up on everyone's Price Comparison screen immediately,
live, without anyone needing to reopen the app. By default, though, the
Worker's scheduled job (the one that refreshes the 5 built-in Checkers
items every 6 hours) doesn't know this collection exists, so those shared
items only refresh when *someone* happens to have the Price Comparison
screen open.

To make the whole shared `trackedItems` collection refresh on the same
6-hourly schedule, even while nobody has the app open, give the Worker a
Firebase **service account** — a credential that lets it read and write
Firestore directly, the same way the Firebase Admin SDK would, without
needing the app open.

1. Firebase Console → the gear icon → **Project settings → Service accounts**.
2. Click **Generate new private key**. This downloads a `.json` file —
   treat it like a password; don't commit it to git or share it.
3. Open that file and find three fields: `project_id`, `client_email`, and
   `private_key`.
4. Set them as three more Worker secrets (from `cloudflare-worker/`):
   ```
   npx wrangler secret put FIREBASE_PROJECT_ID
   npx wrangler secret put FIREBASE_CLIENT_EMAIL
   npx wrangler secret put FIREBASE_PRIVATE_KEY
   ```
   For `FIREBASE_PRIVATE_KEY`, paste the whole `private_key` value from the
   JSON file exactly as it appears, including the `-----BEGIN PRIVATE
   KEY-----` / `-----END PRIVATE KEY-----` lines and the `\n` sequences —
   the Worker un-escapes those itself.
5. Redeploy: `npm run deploy`.

**This step is entirely optional.** With no service-account secrets set,
nothing changes from before: shared tracked items still refresh whenever
*anyone* opens Price Comparison, and the built-in 5 still refresh every 6
hours regardless.

**Worth knowing before you set this up:** this credential has broad read/
write access to your whole Firestore database, not just the `trackedItems`
collection — so it's exactly as sensitive as your Firebase config, just
more powerful. Keeping it as a Worker secret (never shipped in the app
bundle, never visible to users) is what keeps that safe. I implemented
this by hand using the Workers runtime's built-in Web Crypto API (no extra
npm package, since the usual Firebase Admin SDK needs Node.js APIs Workers
don't have) — I verified it compiles and bundles cleanly, but I have no
way to run it against a real Firebase project from here, so please
confirm it actually works end-to-end once deployed: track an item, wait
for (or manually trigger) a refresh via `/api/refresh-now`, and check in
Firebase Console that its `fetchedAt` timestamp updated in the
`trackedItems` collection.
