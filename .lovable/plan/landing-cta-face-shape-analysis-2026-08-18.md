# Landing CTA + face shape analysis

## 1. Landing CTA (do now)

Replace the "Start free — no account yet" button on the landing page with a single confident CTA:

- Button: **Build my beauty profile**
- Subline below it stays reassuring but drops the account framing: "Three quick taps. No account needed to start."
- Also soften the hero paragraph's trailing "you only need an account when you want to save it" so the account idea appears once, not twice.
- Everything else (sign-in link, feature cards, doodles) unchanged.

## 2. Face shape analysis — recommendation

Yes, it fits, and it fits best as an extra read on the Shelfie you already take rather than a new screen.

Why it works here:
- The photo is already captured and already sent for colour season + skin scores, so it is one more field in the same analysis, no extra user effort.
- It makes the makeup half of the app useful. Right now colour season drives shade choice; face shape drives *placement* — where blush and contour go, brow shape, which is a real gap for a cross-brand makeup shelf.
- It gives the Shelfie result card a third tile so the payoff feels substantial.

Caveats to design around:
- Face shape from one photo is approximate (angle and hair change it). Present it as "Reads closest to: Oval" with a confidence word, never as a verdict, and let the user override it in the skin profile.
- Keep it descriptive and flattering — shape guidance, not "flaws to fix".
- No new selfie, no separate scoring history; it is a stable trait, so store the latest value on the profile rather than as a time series.

Proposed shape when built:
- Shelfie analysis returns `face_shape` (oval / round / square / heart / oblong / diamond), a one-line rationale, and 2-3 placement tips.
- Shown as a card under the skin scores on the Shelfie result, with an edit control.
- Saved on the profile so it can inform future makeup suggestions.

## Technical notes

- Copy change: `src/components/LandingPage.tsx` only.
- Face shape (if approved): extend the Shelfie prompt and response schema in `src/lib/ai.server.ts`, add a `face_shape` column to `profiles`, render and allow override in `src/routes/shelfie.tsx` and `src/routes/settings.tsx`. Not included in this plan's build step unless you say go.
