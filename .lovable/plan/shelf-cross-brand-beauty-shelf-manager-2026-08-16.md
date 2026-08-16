# Shelf — cross-brand beauty shelf manager

A mobile-first web app where someone photographs the products they already own and gets back freshness tracking, layering warnings, and a shareable colour analysis. Backend runs on Lovable Cloud (database, auth, photo storage, AI vision).

## What gets built

**Onboarding (3 skippable steps)** — skin type, concerns, undertone, all as tappable chips. Ends on "Add your first product."

**Shelf (home, `/`)** — grid of product cards, photo edge to edge, with a freshness dot: green fresh, amber expiring within 60 days, red expired, grey unknown (taps through to set a date opened). Sort by expiring soonest / recently added / category.

**Add Product (`/add`)** — the critical flow. Camera-first: front photo, optional back photo, both sent to an AI vision call that returns strict JSON (brand, name, category, size_ml, pao_months, ingredients). Playful skeleton loader while it runs. Result lands in an editable confirmation card so the user corrects rather than types, then one question: "When did you open it?" with Today / This month / A few months ago / Not yet opened. Unreadable back photo returns partial fields plus a retry offer — never an invented ingredient list.

**Product Detail (`/product/$id`)** — photos, full ingredients with flagged actives highlighted (retinoids, AHAs/BHAs, vitamin C, benzoyl peroxide, niacinamide), freshness with days remaining, and a "Still working for you?" review prompt that appears 30 days after date opened.

**Insights (`/insights`)** — Expiring Soon (with mark finished / still good), Routine Check (actives conflicts across active products, one plain-language line each), Shelf Gaps (per stated concern, whether the shelf covers it and what kind of ingredient would help — generic, never a product to buy). Persistent calm disclaimer at the top.

**Colour Analysis (`/colour`)** — selfie in natural light, AI returns season, undertone, 6 best hex colours, 3 to avoid, and a short rationale. Rendered as the most polished screen in the app and downloadable as an image; season saved to the profile.

**Settings (`/settings`)** — profile edits, light/dark toggle, and a working "delete all my data" button that removes rows and stored photos.

## Guardrails

Conflict flags are phrased as "these are often advised not to be layered", never as diagnosis. No claims about detecting skin conditions, no product purchase recommendations. Photos live in a per-user storage bucket that only that user can read or write.

## Design

Warm editorial: cream/ink palette with a single terracotta accent, serif display headings over a clean sans body, generous whitespace, single column, thumb-reachable actions. Full light and dark mode.

## Technical notes

- Enable Lovable Cloud first; email/password auth with an auto-created `profiles` row.
- Tables `profiles`, `products`, `product_reviews`, `routines` exactly as specified, each with grants, RLS scoped to `auth.uid()`, and a private `shelf-photos` bucket with per-user-folder policies.
- Vision calls run in TanStack server functions against the Lovable AI Gateway (Gemini multimodal), with a Zod schema validating the JSON before anything is written; low confidence returns nulls, not guesses.
- Freshness computed client-side from `date_opened + pao_months` (grey when either is missing).
- Conflict rules and concern-to-active mappings live in a small static rules table in the codebase, not in the AI call, so the wording stays predictable.
- Colour card exported via canvas rendering for the download.

## Build order

1. Cloud + schema + storage + auth
2. Shelf, product detail, onboarding
3. Add Product with vision extraction
4. Insights
5. Colour Analysis + share card
6. Settings and data deletion
