## Journey details

1. A guest sees only shelf-relevant benefits: expiry/open-by reminders, conflict checks, and quick product capture.
2. **Build my beauty shelf** opens the existing password-free account flow with an “add my first product” intent.
3. After Google or email-link sign-in, the customer continues to **Add Product** rather than onboarding.
4. Returning signed-in customers land on their shelf. An empty shelf already provides the correct “Add your first product” action.
5. The skin questionnaire remains optional and no longer contains Shelfie. Completing it ends at Add Product.
6. Shelfie remains available from its existing bottom-menu tab, as requested, but is not presented as part of setup or the landing promise.

## Copy and interface updates
- Tighten the landing headline/supporting copy around knowing what is fresh, what expires next, and which products should not be used together.
- Replace “Five guided steps” with reassurance appropriate to the product-first account handoff.
- Update onboarding progress, metadata, completion copy, and account-sheet text from five steps to four and remove all Shelfie branches.
- Update sign-in metadata so it no longer promotes Shelfie scores.

## Technical notes
- Use a small same-device post-sign-in destination marker for both Google and email-link paths, then clear it after navigation.
- Remove the forced `onboarded` redirect from the shelf page so a new account can reach the empty shelf/add flow.
- Keep existing profile fields and stored data unchanged; this is a journey and presentation change only.
- Add the required route metadata fields (`og:type` and `twitter:card`) while touching affected content routes.

## Verification
- Guest CTA → account handoff → Add Product intent.
- New signed-in customer is not redirected into onboarding.
- Onboarding has four steps, no Shelfie language or actions, and completes toward Add Product.
- Landing page contains no Shelfie skin-score banner and clearly explains expiry and conflict checks.
- Existing Shelfie tab/page still works and remains outside onboarding.
