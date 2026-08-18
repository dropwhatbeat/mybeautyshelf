# Copy tidy-up + product fit ratings

## 1. Landing copy
Drop "finally in one place" from the landing headline (and the matching line on the sign-in card) so it reads "Your skincare and makeup shelf."

## 2. Onboarding: undertone step becomes the Shelfie step
Replace the last onboarding step with a Shelfie invitation that sells the outcome instead of asking for a chip choice:

- Title: "Let's read your skin"
- A short list of exactly what one selfie returns: undertone, colour season and best shades, skin scores (hydration, fine lines, pores, redness, evenness, oil zones, under-eye), skin depth and face shape with placement tips.
- Primary action: "Take my Shelfie" → finishes onboarding into `/shelfie` (guests still hit the locked teaser + "Create account to unlock").
- Secondary action: "I know my undertone" reveals the cool / neutral / warm chips inline, so the data is still capturable without a photo.

## 3. Tie the beauty profile to the shelf: a Fit score per product
New "Fit for your skin" read on every product, computed from the saved profile (skin type, sensitivity, concerns, avoid-list, pregnancy, SPF habit, age range) against the product's detected ingredients.

Each product gets:
- A 0-100 fit score with a plain-language band: Great match / Works for you / Use with care / Not recommended.
- Up to three "why it helps" lines, matched to the user's own concerns (e.g. "Niacinamide — one of your Hyperpigmentation targets").
- Up to three "watch-outs": ingredients on the avoid-list, retinoids while pregnant or breastfeeding, strong acids/fragrance/alcohol on very sensitive skin, heavy occlusives on oily skin, an actives count that stacks too high.
- A one-line verdict when the score lands in the bottom band, saying plainly why it isn't recommended.

Where it shows:
- Product detail: a fit card under the freshness block, with the score, the band, and the helps/watch-out lists.
- Shelf cards: a small coloured fit pip so problem products are visible at a glance.
- Insights: a new "Fit with your profile" section listing the lowest-scoring products first, plus a "best matches" note; the existing conflicts and gaps sections stay.

Scoring is deterministic and local (no AI call, instant, no cost), phrased as general guidance rather than medical advice. If the profile is empty, the card shows a prompt to complete the beauty profile instead of a score.

## Technical notes
- `src/lib/fit.ts` — new module: `scoreProduct(product, profile)` returning `{ score, band, helps[], cautions[], verdict }`, built on `detectActives` / `CONCERN_GUIDES` in `src/lib/actives.ts` plus new keyword sets for fragrance, drying alcohol, occlusives and pregnancy-avoid actives.
- `src/routes/product.$id.tsx` — render the fit card from `useProfile()` + product.
- `src/components/ProductCard.tsx` — fit pip.
- `src/routes/insights.tsx` — fit section using the same helper across all active products.
- `src/routes/onboarding.tsx` — restructure the final step; `finish("/shelfie")` already exists.
- `src/components/LandingPage.tsx`, `src/components/AuthCard.tsx` — headline copy.
- No schema changes; scores are derived at render time.
