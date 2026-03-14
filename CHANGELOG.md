# Self Paced Learning — Project Changelog

Platform for Australian students preparing for **NAPLAN, OC, and Selective** school exams.
Live domain: `exambooster.com.au` / `selfpaced.com.au`
Stack: **Next.js 14 App Router · Supabase (PostgreSQL) · Google OAuth · Vercel**

---

## [2026-03-15] Promo Code Feature

### What was built
- **User-facing:** Promo code input box on the Plans & Pricing screen. Users enter a code, click Apply, and see instant success (new tier + expiry) or a specific error message. Tier updates live without a page reload.
- **Admin-facing:** New "Promo Codes" tab in the admin panel. Create codes with configurable tier (Gold/Platinum), duration in days (blank = permanent), max uses (blank = unlimited), and an optional expiry date. Activate/deactivate or delete existing codes.
- **API:**
  - `POST /api/promo` — validates code, checks expiry/usage limits/duplicate redemption, upgrades user tier, records redemption.
  - `GET /api/admin?action=promos` — list all promo codes.
  - `POST /api/admin?action=createPromo|togglePromo|deletePromo` — admin management.
- **Auto-expiry:** `/api/auth` now checks `promo_expires_at` on every login. If expired, it reverts the user's tier back to what their referral count would earn (silver/gold/platinum), then clears the field.

### DB migrations required
```sql
alter table users add column if not exists promo_expires_at timestamptz;

create table if not exists promo_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  tier text not null check (tier in ('gold','platinum')),
  duration_days integer,
  max_uses integer,
  uses_count integer default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists promo_redemptions (
  id uuid default gen_random_uuid() primary key,
  promo_code_id uuid references promo_codes(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  tier_granted text,
  tier_expires_at timestamptz,
  redeemed_at timestamptz default now(),
  unique(promo_code_id, user_id)
);
```

### Files changed
- `src/app/api/promo/route.js` *(new)*
- `src/app/api/admin/route.js` — added listPromos, createPromo, togglePromo, deletePromo actions
- `src/app/api/auth/route.js` — promo expiry check in `respond()`
- `src/app/page.js` — promo box UI in `PlansScreen`
- `src/app/admin/page.js` — `PromoManager` component + Promo Codes tab
- `src/app/globals.css` — promo box styles
- `supabase-schema.sql` — promo_codes, promo_redemptions, promo_expires_at

---

## [2026-03-15] Daily Question Limits by Subscription Tier

### What was built
- Server-side enforcement of how many questions a user can answer per day, based on their tier.
- Limits: Silver = 10/day, Gold = 40/day, Platinum/Admin = unlimited.
- When the limit is hit, `/api/generate` returns HTTP 429 with `error: 'QUESTION_LIMIT'`.
- The UI shows a friendly "limit reached" card with an upgrade CTA instead of a question.

### Files changed
- `src/lib/constants.js` — added `QUESTION_LIMITS` map
- `src/app/api/generate/route.js` — daily count check before serving a question
- `src/app/page.js` — `QUESTION_LIMIT` error handling UI

---

## [2026-03-14] Refer a Friend + Auto Tier Upgrades

### What was built
- Every user gets a unique `referral_code` generated on first sign-in (backfilled for existing users).
- Referral link flow: `?ref=CODE` captured on landing → stored in `localStorage` → passed to `/api/auth` on sign-in → `referred_by` set on new user row.
- Auto-upgrade: when a referrer's count of successful referrals hits 3, they're upgraded to Gold; at 5, Platinum.
- **ReferralModal:** shows the user's referral link with a copy button and their current referral count.
- **TrialModal / Plans screen:** updated copy explaining 3 friends = Gold, 5 friends = Platinum.
- `GET /api/referral` — returns `referral_code` and `referral_count` for the logged-in user.

### DB migrations required
```sql
alter table users add column if not exists referral_code text unique;
alter table users add column if not exists referred_by uuid references users(id) on delete set null;
create index if not exists users_referral_code_idx on users(referral_code);
```

### Files changed
- `src/app/api/auth/route.js` — referral code generation, referrer lookup, `checkAndUpgradeReferrer()`
- `src/app/api/referral/route.js` *(new)*
- `src/app/page.js` — ReferralModal, referral count state, ?ref= param capture

---

## [2026-03-14] Rebrand to "Self Paced Learning"

### What was built
- Site name changed from "Exam Booster" / "RepHub" to **Self Paced Learning**.
- Tagline: **Practice · Consistency · Feedback**.
- Updated in all locations: `page.js`, `admin/page.js`, `HistoryScreen.js`, `RankingScreen.js`, `layout.js`.
- Landing page hero replaced stat grid with an inline SVG illustration (student at desk).
- Three pillar cards added with custom SVGs: Practice, Consistency, Feedback.
- Stats strip (questions answered, students, accuracy) moved below the hero.

### Files changed
- `src/app/page.js` — branding, HeroIllustration, pillar cards, stats strip
- `src/app/admin/page.js`
- `src/components/HistoryScreen.js`
- `src/components/RankingScreen.js`
- `src/app/layout.js`
- `src/app/globals.css` — pillar, hero illustration, stats strip styles

---

## [2026-03-14] SEO & Metadata Update

### What was built
- Full Next.js metadata in `layout.js`: title template, description, 20+ keywords, Open Graph tags, Twitter cards, robots directives, canonical URL.
- `metadataBase`: `https://exambooster.com.au`, `siteName`: Self Paced Learning, `lang="en-AU"`.
- `src/app/robots.js` — blocks `/api/` and `/admin` from crawlers, points to sitemap.
- `src/app/sitemap.js` — returns homepage with `weekly` changeFrequency.
- Installed `@vercel/analytics` — `<Analytics />` added to root layout.

### Files changed
- `src/app/layout.js`
- `src/app/robots.js` *(new)*
- `src/app/sitemap.js` *(new)*

---

## [2026-03-14] UI Cleanup — Token Usage & WhatsApp

### What was built
- Removed all token usage info from student/user view (was shown in nav bar and question screen). Token data is now admin-only.
- Removed `token-bar-wrap` from the nav header.
- Removed WhatsApp "Chat with us" floating button for logged-in users (still visible on landing page for guests).
- Removed unused `limit`, `tokenPct`, `tokenFillColor` variables.

### Files changed
- `src/app/page.js`

---

## [2026-03-13] URL Hash Persistence Fix

### What was built
- After signing in, the URL hash fragment (e.g. `#how-it-works`) was persisting across all screens.
- Fixed by calling `window.history.replaceState(null, '', window.location.pathname)` immediately after successful Google sign-in.

### Files changed
- `src/app/page.js` — `handleGoogleSignIn()`

---

## [2026-03-13] Sign Out Redirects to Landing Page

### What was built
- Previously, signing out landed the user on the sign-in screen.
- Changed to redirect to the landing (`home`) screen instead.

### Files changed
- `src/app/page.js` — `handleSignOut()`

---

## [2026-03-12] DB-Only Question Flow

### What was built
- Questions are no longer generated on-the-fly by AI for regular users.
- `/api/generate` now fetches unanswered questions from the `questions` DB table, picks one at random, and returns it.
- Tracks answered questions per user via `question_responses` to avoid repeats within a topic.
- When all questions in a topic are answered, returns a friendly "come back soon" message.
- AI generation is now an **admin-only** operation via `/api/admin?action=generateQuestions`.

### Files changed
- `src/app/api/generate/route.js` — full rewrite to DB-only flow
- `src/app/page.js` — updated loading/error messaging

---

## [2026-03-11] Admin Panel Extracted to `/admin` Route

### What was built
- Admin panel moved from an in-app modal to a standalone `/admin` route.
- Subdomain middleware added to support `admin.selfpaced.com.au` routing.
- Admin-specific Google sign-in with email check against `ADMIN_EMAIL`.
- Admin session persisted in `localStorage` separately from user session.

### Files changed
- `src/app/admin/page.js` *(new standalone page)*
- `src/middleware.js` *(new)*

---

## [Earlier] Core Platform Features

| Feature | Description |
|---|---|
| Google OAuth sign-in | GSI client, token verification via `google-auth-library` |
| Tier system | silver / gold / platinum / admin with `TIER_PERMISSIONS` |
| Question bank | Questions stored in Supabase `questions` table per `topic_id`, `exam_type`, `subtopic` |
| Response tracking | `question_responses` table records every answer with `is_correct` |
| History screen | Per-topic breakdown of answered questions and accuracy |
| Ranking screen | Leaderboard of top users by questions answered |
| Session persistence | Session stored in `localStorage`, token expiry handled gracefully |
| Admin: User management | Approve/reject/change tier for any user |
| Admin: Quiz Bank | Upload questions via JSON or PDF; view counts by topic/exam/user |
| Admin: AI Generator | Generate questions via Claude API, stored directly to DB |
| Admin: Analytics | 30-day daily activity, active users, new signups, accuracy rates |
| Admin: Answer Review | Review any user's full answer history with correct/wrong highlights |
| Admin: Token Limits | Configurable daily token limits per tier (stored in `config` table) |
| Duplicate question fix | 4 root-cause bugs fixed to prevent the same question repeating |
| Streak rewards | Celebrations every 3 correct answers (Gold/Platinum only) |

---

## Architecture Overview

```
/src
  app/
    page.js              # Main SPA — all student-facing screens
    layout.js            # Root layout, SEO metadata, Analytics
    globals.css          # All styles
    admin/page.js        # Standalone admin portal
    api/
      auth/route.js      # Google sign-in, user upsert, referral, promo expiry
      generate/route.js  # Serve next unanswered question from DB
      promo/route.js     # Promo code redemption
      referral/route.js  # Referral code + count for user
      admin/route.js     # All admin actions (users, quiz bank, analytics, promos...)
      record-response/   # Save answer + is_correct
      history/           # User answer history
      rankings/          # Leaderboard
      topics/            # Topics available for an exam type
      ...
    robots.js            # Crawler rules
    sitemap.js           # XML sitemap
  components/
    HistoryScreen.js
    RankingScreen.js
  lib/
    constants.js         # EXAM_TYPES, EXAM_TOPICS, QUESTION_LIMITS, TIER_LABELS, etc.
    supabase.js          # Supabase client (service key)
    google.js            # verifyGoogleToken()
```

### Key DB Tables
| Table | Purpose |
|---|---|
| `users` | Profiles, tier, referral_code, referred_by, promo_expires_at |
| `questions` | Question bank (topic_id, exam_type, subtopic, options, correct, explanation) |
| `question_responses` | Every answer recorded per user |
| `promo_codes` | Admin-created promo codes |
| `promo_redemptions` | Which user redeemed which code |
| `token_usage` | Daily AI token usage per user (admin analytics) |
| `config` | Key/value store for configurable limits |
