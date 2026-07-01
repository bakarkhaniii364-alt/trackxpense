# TrackXpense — Full Platform Plan

## What you're building

A personal finance app that works as:
- A **hosted web app** (trackxpense.com)
- A **PWA** installable from the browser
- An **Android APK** via Capacitor
- An **iOS app** via Capacitor
- All three synced in real time to the same cloud account

---

## Phase 0 — Foundation (do this before anything else)

Everything else depends on these decisions being made correctly.

### 0.1 — Choose your backend: Supabase

**Why Supabase over Firebase:**
- Your data model is relational (transactions belong to wallets, wallets belong to users, debts link to users). Postgres handles this naturally. Firestore would force you to denormalize.
- Supabase has Row Level Security (RLS) built in — one SQL policy enforces that users can only read their own data. No separate auth middleware needed.
- Supabase Storage handles receipt images. Firebase Storage is equivalent but costs more at scale.
- Supabase Realtime uses Postgres logical replication for live sync — no separate websocket infrastructure.
- Free tier is generous enough to build on. You pay when you scale.

**Services you'll use from Supabase:**
- Auth (email/password, Google OAuth, Apple Sign-In)
- Postgres (all app data)
- Realtime (live sync across devices)
- Storage (receipt attachments)
- Edge Functions (server-side AI calls, protecting your Gemini key)

### 0.2 — Hosting

- **Web app**: Vercel or Cloudflare Pages. Both deploy from GitHub automatically. Cloudflare Pages is faster globally and has a better free tier.
- **Domain**: Get trackxpense.com or trackxpense.app now.
- **Android**: Google Play Store. Capacitor builds the APK. You need a $25 one-time developer account.
- **iOS**: Apple App Store. Requires a Mac for the Xcode build step and a $99/year developer account.

### 0.3 — Environment variables

Right now your app stores credentials in `.env.local`. For production, ensure these are managed via your CI/CD provider (Vercel/Cloudflare).

---

## Phase 1 — Auth

### What to build

An auth layer that sits before the rest of the app. If the user isn't signed in, they see the landing page and a sign-in/sign-up screen. If they are, they see the app.

### The auth flow

```
App loads
  → check Supabase session
  → session exists? → load user data → render app
  → no session?    → show AuthScreen
                     → sign up with email
                     → sign in with email
                     → sign in with Google
                     → sign in with Apple (required for iOS App Store)
```

### Data model change

Every record in your database gets a `user_id` column that references `auth.users`. RLS policies enforce this automatically. No user can ever read or write another user's data.

### Packages to add

```
@supabase/supabase-js
```

That's the only new dependency needed for auth, database, realtime, and storage.

### Guest mode (important)

Don't force sign-up immediately. Let users try the app without an account, storing data locally as they do now. Show a persistent "Sync your data — create a free account" prompt. When they sign up, migrate their local IndexedDB data to Supabase automatically. This dramatically improves conversion.

---

## Phase 2 — Cloud Database Schema

Your current `AppData` object gets decomposed into proper relational tables. Each table has RLS enabled so users can only access their own rows.

### Tables

**users** (extends Supabase auth.users)
```
id          uuid PK (references auth.users)
name        text
daily_goal  numeric
monthly_goal numeric
created_at  timestamptz
```

**wallets**
```
id              uuid PK
user_id         uuid FK → users
name            text
type            text ('STANDARD' | 'GOAL')
target_amount   numeric
currency        text (e.g. 'BDT', 'USD') ← new
created_at      timestamptz
updated_at      timestamptz
```

**transactions**
```
id              uuid PK
user_id         uuid FK → users
wallet_id       uuid FK → wallets
amount          numeric
type            text ('INCOME' | 'EXPENSE' | 'TRANSFER')
category        text
note            text
date            timestamptz
is_private      boolean
attachment_url  text     ← new (Supabase Storage URL)
splits          jsonb    ← new (split transaction support)
template_id     uuid     ← new (FK → templates, nullable)
created_by      uuid     ← new (for shared wallets)
updated_at      timestamptz
```

**debts**
```
id          uuid PK
user_id     uuid FK → users
person      text
amount      numeric
type        text ('I_OWE' | 'OWES_ME')
note        text
due_date    date
is_settled  boolean
payments    jsonb    ← new: [{amount, date, note}]
created_at  timestamptz
updated_at  timestamptz
```

**subscriptions**
```
id              uuid PK
user_id         uuid FK → users
wallet_id       uuid FK → wallets
name            text
amount          numeric
category        text
frequency       text ('DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY')
next_due        date
is_active       boolean
auto_log        boolean  ← auto-creates transaction on due date
updated_at      timestamptz
```

**provisions**
```
id          uuid PK
user_id     uuid FK → users
name        text
amount      numeric
date        date
updated_at  timestamptz
```

**templates** ← new
```
id          uuid PK
user_id     uuid FK → users
name        text
amount      numeric
category    text
wallet_id   uuid FK → wallets
type        text
note        text
```

**balance_snapshots** ← new
```
id          uuid PK
user_id     uuid FK → users
wallet_id   uuid FK → wallets
balance     numeric
date        date
```

**settings**
```
user_id             uuid PK FK → users
theme               text
dark_mode           boolean
currency_symbol     text
privacy_mode        boolean
vault_passcode      text (hashed)
stealth_mode_enabled boolean
stealth_hotkey      text
haptics_enabled     boolean
budget_limits       jsonb
updated_at          timestamptz
```

---

## Phase 3 — Sync Engine

This is the hardest part. Your app must work offline and sync when connectivity returns.

### Architecture: Local-first with cloud sync

```
Device (IndexedDB)  ←→  SyncEngine  ←→  Supabase Realtime
```

The IndexedDB remains the source of truth for the UI. The SyncEngine keeps it in sync with Supabase. This means:
- The UI never waits for a network call to render
- Changes made offline are queued and flushed when connectivity returns
- Changes from other devices arrive via Supabase Realtime and update IndexedDB

### Conflict resolution strategy: Last-write-wins with updated_at

Every record has an `updated_at` timestamp. When syncing:
- If local `updated_at` > server `updated_at` → push local to server
- If server `updated_at` > local `updated_at` → pull server to local
- If equal → no-op

This is simple and correct for a personal finance app where only one person edits most of the time. For shared wallets, you'll need to handle conflicts more carefully (show a "someone else edited this" notice).

### Sync queue

When offline, writes go into a sync queue in IndexedDB:
```
sync_queue: [{ id, table, operation, payload, timestamp }]
```

When connectivity returns, the queue flushes in order. Failed items stay in the queue with an error count. After 3 failures, surface an error to the user.

### Implementation plan

1. Create `services/supabase.ts` — initialise the Supabase client
2. Create `services/SyncEngine.ts` — manages the queue, listens to Realtime, handles flush
3. Modify `services/storage.ts` — all writes go through SyncEngine, not directly to IndexedDB
4. Add a `useSyncStatus` hook — exposes `{ isSyncing, lastSyncedAt, pendingCount }` to the UI
5. Show a sync indicator in the header (a small dot: green = synced, amber = syncing, red = offline)

### Realtime subscriptions

On app load, after auth, subscribe to:
```javascript
supabase
  .channel('user-data')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, handleChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` }, handleChange)
  // ... same for debts, provisions, subscriptions
  .subscribe()
```

When a change arrives, update IndexedDB and trigger a React state update. The UI re-renders with fresh data automatically.

---

## Phase 4 — Mobile (Capacitor)

### What needs to change

Your Capacitor config is minimal right now. To be a real mobile app you need:

**capacitor.config.ts additions:**
```typescript
{
  appId: 'com.trackxpense.app',
  appName: 'TrackXpense',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#6366F1'
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#000000',
      showSpinner: false
    }
  }
}
```

**Capacitor plugins to install:**
```
@capacitor/push-notifications   — cloud push (debt reminders, budget alerts)
@capacitor/local-notifications  — on-device scheduled notifications
@capacitor/splash-screen        — proper splash screen
@capacitor/status-bar           — status bar theming
@capacitor/keyboard             — keyboard behaviour on inputs
@capacitor/share                — share expense reports
@capacitor/haptics              — you already have this service, just needs the plugin
```

### iOS platform

Run `npx cap add ios` to generate the `ios/` folder. You'll need a Mac with Xcode to build and submit to the App Store. The Capacitor docs walk through the signing certificate setup.

### Push notifications flow

1. User signs in → request push permission
2. Capacitor returns a device token
3. Store the token in Supabase (`push_tokens` table, linked to user)
4. Supabase Edge Function sends push via Firebase Cloud Messaging (FCM for Android) or APNs (for iOS) when:
   - A debt is due tomorrow
   - A subscription is due today
   - Spending exceeds daily goal
   - A shared wallet gets a new transaction

---

## Phase 5 — New Features (enabled by the above)

These features are only practical once auth and sync exist.

### 5.1 — Multi-currency wallets

Add `currency` to the `wallets` table. In Analytics, fetch live exchange rates from the Frankfurter API (free, no key needed) via an Edge Function to normalize all wallet balances to the user's base currency for totals.

### 5.3 — Recurring transactions engine

Your `subscriptions` table has `next_due` and `auto_log`. A Supabase Edge Function runs on a cron schedule (daily at midnight) and:
1. Queries subscriptions where `next_due <= today AND is_active = true AND auto_log = true`
2. Creates a transaction for each
3. Advances `next_due` to the next occurrence

The user wakes up and their rent is already logged.

### 5.4 — Transaction templates

The `templates` table stores saved quick-add entries. In the AddTransactionModal, show a "Templates" tab with saved entries. Tap one to pre-fill the form. After submission, ask "Save as template?" if it's a new pattern.

### 5.5 — Balance snapshots / net worth over time

A Supabase Edge Function runs daily, calculates the balance of each wallet for each user, and writes a row to `balance_snapshots`. Your AnalyticsView can then plot net worth over time using this historical data.

### 5.6 — Multi-currency wallets

Add `currency` to the `wallets` table. In Analytics, fetch live exchange rates from the Frankfurter API (free, no key needed) via an Edge Function to normalize all wallet balances to the user's base currency for totals.

### 5.7 — Data export

A "Export my data" button in Settings generates a CSV of all transactions and triggers a download. On mobile, use `@capacitor/share` to share the file. This is also required for GDPR compliance if you're hosting publicly.

### 5.8 — Split transactions

Add `splits: [{category: string, amount: number}]` as a JSONB column on transactions. In the AddTransactionModal, a "Split" mode lets users divide one transaction across multiple categories. The total must equal the transaction amount.

### 5.9 — Debt partial payments

Replace `is_settled: boolean` with `payments: [{amount, date, note}]` on debts. The debt shows a progress bar (amount paid / total). When payments sum to the full amount, it auto-marks as settled.

### 5.10 — Transaction search

Add a search bar to HistoryView that filters by note, category, and amount. This is entirely client-side since all data is in IndexedDB — no server call needed.

### 5.11 — Predictive Engine Polish

Refine the local heuristic-based `PredictiveEngine` to include more complex pattern detection (e.g., payday detection, bill cycles) without using external AI services.

---

## Phase 6 — Landing Page & Marketing

You need a landing page at your domain before you can acquire users.

**What it needs:**
- Hero: what TrackXpense does in one sentence
- Screenshots of the app (mobile and desktop)
- Feature highlights (sync, stealth mode, debt tracking, AI)
- Download links (App Store, Play Store, "Use on Web")
- Sign up / Sign in buttons
- Pricing section if you have tiers

**Stack:** Build it as a separate route in your Vite app, or as a completely separate static site. If separate, Cloudflare Pages with Astro is fast and simple.

---

## Phase 7 — Tiers & Monetisation (optional but planned)

You already have "Platinum features" comments in your codebase. Here's how to implement gating:

**Free tier:**
- 1 wallet
- 90 days of transaction history
- No AI features
- No shared wallets
- No receipt attachments

**Pro tier (suggested: $3/month or $25/year):**
- Unlimited wallets
- Full history
- AI insights and receipt scanning
- Shared wallets (up to 2 members)
- Receipt attachments
- CSV export
- Priority sync

**Implementation:**
- Store `tier: 'FREE' | 'PRO'` on the users table
- Gate features in the UI with a `useTier()` hook
- Use Stripe for payments, with a Supabase Edge Function as the webhook handler
- Supabase has a Stripe integration guide in their docs

---

## Build order (recommended sequence)

```
Week 1-2:  Phase 0 — Supabase setup, environment, domain
Week 3-4:  Phase 1 — Auth (sign up, sign in, guest mode)
Week 5-6:  Phase 2 — Database schema, RLS policies
Week 7-9:  Phase 3 — Sync engine (this takes longest)
Week 10:   Phase 4 — Capacitor plugins, push notifications
Week 11:   Phase 5a — Attachments, templates, search (quick wins)
Week 12:   Phase 5b — Recurring engine, shared wallets, snapshots
Week 13:   Phase 6 — Landing page
Week 14+:  Phase 7 — Tiers and monetisation
```

---

## Key files to create / modify

**New files:**
```
src/services/supabase.ts          — Supabase client init
src/services/SyncEngine.ts        — sync queue, realtime, flush
src/hooks/useAuth.ts              — auth state, sign in/out
src/hooks/useSyncStatus.ts        — sync indicator state
src/components/AuthScreen.tsx     — sign in / sign up UI
src/components/SyncIndicator.tsx  — dot in the header
supabase/functions/ai-proxy/      — Gemini edge function
supabase/functions/cron-subscriptions/ — recurring tx engine
supabase/functions/cron-snapshots/    — daily balance snapshots
supabase/functions/push-sender/       — notification dispatcher
supabase/migrations/              — all SQL schema files
```

**Modified files:**
```
App.tsx                — wrap with auth check, add sync indicator
services/storage.ts    — route writes through SyncEngine
types.ts               — add new fields (currency, splits, payments[], etc.)
capacitor.config.ts    — add plugin config
package.json           — add @supabase/supabase-js and Capacitor plugins
```

---

## Estimated cost at scale

| Service | Free tier | Paid starts at |
|---|---|---|
| Supabase | 500MB DB, 1GB storage, 50k MAU | $25/month |
| Cloudflare Pages | Unlimited | Free for most cases |
| FCM (Android push) | Free | Free |
| APNs (iOS push) | Free | Free |
| Frankfurter API (FX rates) | Free, no limit | Free |
| Stripe | Free to set up | 2.9% + 30¢ per transaction |

For a personal project or early-stage app, everything runs free until you have thousands of active users.
