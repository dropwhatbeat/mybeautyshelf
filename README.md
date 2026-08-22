# My Beauty Shelf

A cross-brand beauty product manager and skin companion for mobile web.

**Live app**: https://mybeautyshelf.lovable.app

## Why it exists

People own 10–30 skincare and makeup products from many different brands, and no
one place knows about all of them. Retailer apps only know what you bought from
them. So nobody can answer the ordinary questions: *what's about to expire, what
conflicts with what, and is any of it actually suiting my skin?*

Shelf knows your whole shelf. You photograph a product, AI reads the label, and
from then on the app tracks freshness, flags ingredient clashes across everything
you own, and tells you where your shelf has gaps against the concerns you named.

It is deliberately not a shop. It never recommends a specific product to buy, and
it never claims to diagnose a skin condition — gaps are described generically
("a shelf like yours has nothing with a humectant in it"), and Shelfie scores are
cosmetic observations, not medical ones.

## What it does

- **Shelf** (`/`) — a grid of everything you own, each card carrying a coloured
  freshness dot: fresh, expiring soon, expired, or unknown (which prompts you to
  set a date opened). Sortable by expiry, recency, or category.
- **Add a product** (`/add`) — the critical flow. Camera-first: shoot the front,
  optionally the back, and a vision call returns brand, name, category, size,
  PAO months, expiry date and the full ingredient list as strict JSON. You get an
  editable confirmation card to correct rather than a form to type. Then one
  question: when did you open it?
- **Add several at once** (`/bulk`) — photograph a whole shelf; the model returns
  up to 20 products with positions, and a chat turn lets you correct the batch
  conversationally before saving.
- **Product detail** (`/product/$id`) — images, full ingredients with actives
  highlighted, freshness with days remaining, and a review prompt that appears
  30 days after opening.
- **Insights** (`/insights`) — expiring soon, what to open next, per-product fit
  against your skin profile (great / good / take care / avoid), a routine check
  that flags active conflicts in plain language, and shelf gaps per concern.
- **Shelfie** (`/shelfie`) — one selfie returns skin scores (hydration, fine
  lines, pores, redness, evenness, under-eye, T-zone and cheek oil, plus an
  overall) and a seasonal colour analysis with best and avoid shades, rendered as
  a shareable card. Colour season is flagged as experimental.
- **Onboarding** (`/onboarding`) and **skin profile** (`/settings`) — skin type,
  concerns, undertone and Fitzpatrick as tappable chips, never dropdowns.
  Settings also holds the delete-all-my-data control.

## Stack

React 19 + TanStack Start / Router, Vite, Tailwind v4, shadcn/ui, TanStack Query,
Supabase (auth, Postgres, storage). Vision calls run server-side through the
Lovable AI gateway via TanStack server functions, so no model key reaches the
browser. Mobile-first, single column, thumb-reachable — assume it's used standing
in a bathroom.

### Layout

```
src/routes/        file-based routes (screens listed above) + /mcp, sitemap
src/lib/           freshness.ts, actives.ts (actives + conflict rules), fit.ts
                   (profile scoring), ai.server.ts (prompts), ai.functions.ts
                   (validated server fns), queries.ts (Query hooks)
src/components/    AppShell, ProductCard, Chip, AuthCard, LandingPage, ui/
src/integrations/  Supabase client, auth middleware, generated DB types
supabase/migrations/  schema, enums, RLS policies, storage policies
```

### Data model

`profiles` (skin type, undertone, fitzpatrick, concerns, saved season),
`products` (brand, name, category, image paths, ingredients, PAO, date opened,
expiry, size, status), `product_reviews` (rating + repurchase verdict),
`routines` (AM/PM ordered product ids), `skin_checks` (Shelfie history).

Every table is row-level-secured to `auth.uid()`, and photos live in a per-user
folder of the `shelf-photos` bucket with matching storage policies — a user can
only ever read or write their own files.

## Development

Requires [Bun](https://bun.sh) (the repo uses `bun.lock`; npm also works).

```bash
bun install && bun run dev
```

Other scripts: `build`, `preview`, `lint`, `format`.

Copy the Supabase values into `.env` — `SUPABASE_URL`, `SUPABASE_PROJECT_ID`,
`SUPABASE_PUBLISHABLE_KEY` and their `VITE_`-prefixed twins.

`bunfig.toml` enforces a 24-hour supply-chain guard: package versions published
less than a day ago are skipped. Confirm with the maintainer before adding any
exclusion.

## Design

Warm, editorial, uncluttered — closer to a well-made notes app than a beauty
retailer. Generous whitespace, one accent colour, serif display headings with a
clean sans body. The user's own photos carry the aesthetic, so they fill their
cards edge to edge. Light and dark mode.

## Lovable

This project is connected to [Lovable](https://lovable.dev) and edits sync both
ways with the [project editor](https://lovable.dev/projects/f32ace8e-cdae-423c-bc8a-22e83ed17318).
Don't rewrite published git history (force push, rebase, amend or squash pushed
commits) — it rewrites history on Lovable's side too. Keep `main` in a working
state, since commits pushed there show up in the editor.
