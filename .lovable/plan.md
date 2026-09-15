# Onboarding: only lock behind signup when a Shelfie is taken

## Problem
On the final onboarding step ("Let's read your skin"), both paths — "Take my Shelfie" **and** "Skip" / "See my beauty profile" — end in `finish()`, which for a guest shows the locked teaser screen ("Create account to unlock your scores"). Users who skipped the Shelfie haven't generated any scores, so there is nothing to unlock; they should go straight to creating an account and then to adding their first product.

## Change (src/routes/onboarding.tsx only)

1. **Split the finish paths** — replace the single `finish(to)` with two flows:
   - **Shelfie path** (`Take my Shelfie` button): keeps current behaviour — save the onboarding draft, show the locked teaser for guests ("Create account to unlock your scores"), or navigate to `/shelfie` for signed-in users.
   - **Direct path** (final-step "Continue"/"See my beauty profile" and "Skip" buttons): never shows the teaser.
     - Guest: save the draft, then navigate straight to `/auth` so they create an account. (The existing draft-claiming logic in `src/routes/__root.tsx` saves their answers to their profile on sign-in and routes them onward.)
     - Signed-in user: save the profile and navigate to `/add`, as today.

2. **Copy tidy-up on the last step** (guest only):
   - Primary button label stays "See my beauty profile" for signed-in users; for guests change to "Create my account" so it doesn't imply locked scores.
   - "Skip" keeps working and now also goes straight to account creation for guests.

3. **Teaser screen** — unchanged; it is now only reachable via the "Take my Shelfie" button.

## Technical details
- Edit only `src/routes/onboarding.tsx`:
  - In `finish()`, add a flag (e.g. `viaShelfie`) controlling whether `setTeaser(true)` is used; the non-shelfie guest path calls `saveDraft(...)` then `navigate({ to: "/auth" })`.
  - Update the last-step button handlers/labels accordingly.
- No changes to `__root.tsx` draft-claiming, the auth page, or any other route.
- Verify with a browser pass: guest completing onboarding via Skip → lands on sign-in page, no lock screen; guest via "Take my Shelfie" → still sees the locked teaser.
