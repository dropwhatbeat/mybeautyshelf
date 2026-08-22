# My Beauty Shelf

Build "Shelf" — a cross-brand beauty product manager and skin companion for mobile web.

CORE IDEA

People own 10-30 skincare and makeup products from many brands. They don't know

what's expiring, what conflicts with what, or whether anything is working.

Retailer apps only know what you bought from them. Shelf knows your whole shelf.

STACK

React + Vite + Tailwind + shadcn/ui, Supabase (auth, Postgres, storage).

Mobile-first, single-column, thumb-reachable. Assume it's used standing in a bathroom.

DATA MODEL (Supabase)

- profiles: id, display_name, skin_type (dry/oily/combination/normal/sensitive),

  undertone (cool/neutral/warm), fitzpatrick (1-6), concerns (text[]),

  season_result (text, nullable), created_at

- products: id, user_id, brand, name, category (cleanser/serum/moisturiser/spf/

  treatment/makeup/other), image_front_url, image_back_url, ingredients (text[]),

  pao_months (int, nullable), date_opened (date, nullable), date_added,

  size_ml, status (active/finished/discarded), notes

- product_reviews: id, product_id, user_id, rating (1-5), verdict

  (repurchase/undecided/never_again), note, created_at

- routines: id, user_id, time_of_day (am/pm), ordered product_ids (jsonb)

SCREENS

1. Onboarding (3 steps, skippable): skin type + concerns + undertone as tappable

   chips, never dropdowns. End on "Add your first product."

2. Shelf (home): grid of product cards. Each card shows image, brand, name, and a

   coloured freshness dot — green (fresh), amber (expiring within 60 days), red

   (expired), grey (unknown, prompts user to set date opened). Sort control:

   expiring soonest / recently added / category.

3. Add Product — THE CRITICAL FLOW. Camera-first. User photographs the front, then

   optionally the back. Send both to an AI vision call that returns strict JSON:

   { brand, name, category, size_ml, pao_months, ingredients: [] }.

   Show an editable confirmation card with everything pre-filled — the user

   corrects rather than types. Then one question: "When did you open it?" with

   quick options (Today / This month / A few months ago / Not yet opened).

   Target: under 20 seconds from tap to saved. Show a skeleton loader with a

   playful status line while the vision call runs.

4. Product Detail: images, full ingredient list with any flagged actives

   highlighted (retinoids, AHAs/BHAs, vitamin C, benzoyl peroxide, niacinamide),

   freshness status with days remaining, and a "Still working for you?" review

   prompt that appears 30 days after date_opened.

5. Insights: three cards —

   (a) Expiring Soon — list with "mark finished" and "still good" actions

   (b) Routine Check — flags common actives conflicts across the user's active

       products, each with a plain-language one-line explanation

   (c) Shelf Gaps — for each stated concern, note whether the shelf contains a

       product with a relevant active; if not, say what category of ingredient

       would help, generically, never naming a product to buy

6. Colour Analysis (standalone, shareable): user takes a selfie in natural light

   against a plain background. AI vision returns a seasonal colour analysis

   (season, undertone, 6 hex best colours, 3 hex avoid colours, one-paragraph

   rationale). Render as a beautiful shareable card, downloadable as an image.

   Save season_result to the profile. This is the viral hook — make it the most

   visually polished screen in the app.

AI CALLS

Use structured JSON output for every vision call and validate the shape before

writing to the database. On low-confidence extraction, return partial fields and

let the user fill the rest rather than guessing. Never fabricate an ingredient

list — if the back photo is unreadable, say so and offer to retry.

GUARDRAILS — IMPORTANT

This is not medical advice. Ingredient conflict flags are general cosmetic-usage

guidance, phrased as "these are often advised not to be layered" rather than

diagnoses. Include a persistent, non-alarming disclaimer on the Insights screen.

Never claim to detect a skin condition. Never recommend a specific product to buy.

Face and product photos belong to the user: store in a per-user Supabase storage

bucket with row-level security, and put a working "delete all my data" button in

Settings.

DESIGN

Warm, editorial, uncluttered — closer to a well-made notes app than a beauty

retailer. Generous whitespace, one accent colour, serif display headings with a

clean sans body. Products are the visual hero; the user's own photos carry the

aesthetic, so let them fill their cards edge to edge. Light and dark mode.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mybeautyshelf.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f32ace8e-cdae-423c-bc8a-22e83ed17318).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
