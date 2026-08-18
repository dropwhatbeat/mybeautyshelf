# Explore before signing up

Right now `/` shows a sign-in form immediately. New visitors will instead get a short landing page, can run through onboarding as a guest, and only hit sign-up when they want their Shelfie result and shelf saved.

## Flow

```text
/  (signed out)  ->  landing: hero + 3 feature cards + "Start free" / "Sign in"
      |
      v
/onboarding (guest)  ->  skin type -> concerns -> undertone
      |
      v
teaser screen: "Your profile is ready" + locked Shelfie result preview
      |
      v
sign in (magic link or Google) -> answers saved to profile -> /shelfie
```

Signed-in users see their shelf at `/` exactly as today.

## What gets built

1. **Landing page** (signed-out `/`): short hero with the existing doodle and headline, three feature cards (Freshness tracking, Routine conflict check, Shelfie skin score), primary "Start free" button to `/onboarding`, and a quieter "Sign in" link to `/auth`.
2. **Sign-in page** at `/auth`: the current AuthCard moved onto its own route, unchanged behaviour (magic link + Google).
3. **Guest onboarding**: `/onboarding` works without an account. Answers are held in browser storage instead of being written to the database. Signed-in users keep the current save-to-profile behaviour.
4. **Teaser + sign-up gate**: after the undertone step a guest sees a blurred/locked Shelfie card ("Take a Shelfie to score hydration, fine lines and pores") with a sign-up CTA. Selfie analysis stays behind auth — no AI runs for anonymous visitors.
5. **Claim on sign-in**: once the session lands, stored guest answers are written to the profile, marked onboarded, storage cleared, and the user is sent to `/shelfie` (or `/add` if they skipped).

## Technical notes

- New `src/routes/auth.tsx` renders `AuthCard`; `AuthCard` gets an optional post-login redirect target.
- `src/routes/index.tsx` renders the new `LandingPage` component when signed out instead of `AuthCard`.
- Guest answers live in `localStorage` under a single key (`shelf-onboarding-draft`) with skin type, concerns, undertone.
- `src/routes/onboarding.tsx`: `finish()` branches — signed in writes to `profiles` as today; guest writes the draft and shows the teaser step.
- Claiming runs in a small hook mounted in `__root.tsx` on `SIGNED_IN`, so it works for both magic-link return and Google redirect.
- The Shelfie server function keeps `requireSupabaseAuth`; nothing is loosened.
- Each new route gets its own `head()` metadata; the landing page keeps a single descriptive H1 for SEO.
