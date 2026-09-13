# Card Benefits

A small personal site that tracks every credit card's perks and tells you what to do
with them. No login: anyone with the link can view and edit, from a phone or computer.

For each card you record the annual fee (and whether it's currently waived), the open
date, what a point is worth to you, the credits it gives (Uber Cash, airline fee credit,
hotel credit…) with how often each resets, and the earning rates by spending category.
Presets for a dozen popular cards prefill all of that — review the amounts, since
issuers change them often.

What it does with that:

- **Tracks each credit against its reset window** — monthly, quarterly, twice a year,
  calendar year, cardmember year (from the open date), or one-time — with a one-click
  "used it" and a form for partial amounts. History is kept per usage so a card page
  shows exactly what you got out of it.
- **Use these** — the home page leads with every credit still holding value across all
  cards, expiring first, then coming up, then one-time credits like Global Entry, each
  with its own "Used all" and "Log part" buttons. Credits gated on enrollment sit apart
  with a link into the card.
- **Decisions** — annual fees about to post with a keep-or-downgrade verdict based on the
  past 12 months of realized value, fee waivers ending, and missing setup.
- **Fee waivers** — mark a fee as not currently charged (military waiver, promo) and
  optionally when the waiver ends. The dashboard shows what you actually pay today, and
  warns you before the first real charge with a verdict based on what you've used.
- **Which card should I use?** — for each spending category, the card with the best
  real return (multiplier × your point value), with the runner-up.
- **Fee coverage** — per card and overall: fees paid, credits on offer, value realized
  this year, and value still waiting to be used.
- **Online lookup** — type any card's name and the app searches the issuer's site and
  recent coverage for its current credits, fee, and earning rates, then fills the form
  for you to review. A card saved with no benefits gets a "find its benefits" panel that
  shows what it found as a checklist to confirm. Needs `ANTHROPIC_API_KEY`; see below.
- **Update from screenshots** — issuers don't expose credit balances through any API, so
  the app reads screenshots instead. Screenshot the benefits screen in the Amex or Chase
  app, add the images on the card's page, and it matches each "$10 of $15 used" or
  "$120 remaining" to a benefit and shows the change it would log. Only what you confirm
  is written; the images are not stored. Also needs `ANTHROPIC_API_KEY`.

**Stack:** Next.js (App Router, Server Actions) + Prisma + Postgres. Deploys free on
Vercel with a free Neon Postgres database. `DATABASE_URL` is the only required setting.

## Environment variables

| Variable | Required | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Neon in production). |
| `ANTHROPIC_API_KEY` | for online lookup | Lets the app research a card's benefits with Claude and web search. Create a key at [console.anthropic.com](https://console.anthropic.com); each lookup costs a few cents. Unset, the lookup buttons explain how to enable it and everything else works. |

## Local development

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL
npx prisma db push     # creates the tables (no migration files; db push keeps it simple)
npm run dev
```

Open http://localhost:3000.

## Deploying (free, ~10 minutes)

### 1. Create a free Postgres database on Neon

1. Go to [neon.com](https://neon.com) and sign up (GitHub login is easiest).
2. Create a new project (any name/region).
3. On the project dashboard, copy the **connection string** (starts with
   `postgresql://...?sslmode=require`).

### 2. Import the repo into Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**, and import this repo.
2. Before deploying, expand **Environment Variables** and add
   `DATABASE_URL` = the Neon connection string.
3. Click **Deploy**.

The build runs `prisma db push`, so the first deploy creates the tables and every later
deploy applies schema changes on its own. A change that would drop data fails the build
instead of applying — run `npx prisma db push` by hand in that case, after deciding what
to keep.

### 3. You're live

Vercel assigns the URL (rename it under **Settings → Domains**). From here on, every
`git push` to `main` auto-deploys.

## Data model

Four tables: `CreditCard`, `Benefit` (one per credit or perk, with its reset frequency),
`BenefitUsage` (one row per time you use a credit, tagged with the reset window it counts
against), and `EarningRate` (multiplier per spending category). See `prisma/schema.prisma`.
