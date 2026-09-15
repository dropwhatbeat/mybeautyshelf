# Refine the onboarding account handoff

## UX critique

- The questionnaire currently shows **Skip on every step**, which weakens the sense of a short, guided profile and can produce an incomplete profile without explaining the consequence.
- The Shelfie step has competing actions: **Take my Shelfie**, **Create my account**, **Skip**, and the manual undertone option. Their hierarchy is unclear.
- Sending someone from the completed journey to the generic sign-in page is an abrupt context switch. The page repeats the broad product pitch instead of confirming that their profile answers are safe.
- The answers are already retained on the device and transferred after sign-in, but that reassurance appears too late or not at all in the non-Shelfie path.
- A mobile bottom sheet is better than a centered popup here: it keeps the completed profile visible behind it, feels like the next step rather than a new journey, and has enough room for Google and email-link choices.

## Proposed journey

1. Keep Back and Continue throughout the questionnaire, but remove **Skip** from every step before Shelfie.
2. Make Shelfie the only optional step:
   - Primary: **Take my Shelfie**
   - Secondary: **Continue without Shelfie**
   - Keep **I know my undertone** as an optional inline choice, not a competing exit.
3. When the customer chooses either Shelfie path and needs an account, open an account bottom sheet without leaving onboarding.
4. Reassure them in the sheet:
   - **Your beauty profile is ready**
   - **Your answers are saved on this device. Create an account to keep them and start your shelf.**
   - If Shelfie was chosen, tailor the final line to explain that sign-in continues to the camera and unlocks the analysis.
5. Offer **Continue with Google** first, then email magic-link sign-up in the same sheet. Avoid the generic landing-page sales copy.
6. After sign-in, retain the current branching:
   - Shelfie chosen → continue to Shelfie
   - Shelfie declined → continue to Add your first product
7. Allow closing the sheet to return to the Shelfie choice without losing answers.

## Implementation details

- Add a contextual account handoff sheet to onboarding using the existing dialog/sheet components and passwordless sign-in methods.
- Reuse the existing Google and email authentication behavior while giving onboarding-specific headings, confirmation states, and errors.
- Keep the onboarding draft and intended destination stored until the profile update succeeds; only then clear it and navigate.
- Remove the shared Skip control from pre-Shelfie steps and give the final step its own explicit actions.
- Update onboarding metadata and any step-count copy so it matches the five-step journey.
- Verify both guest paths, account return behavior, back/close behavior, and mobile layout in the preview.

## Expected result

Customers complete a coherent profile journey, understand that their work is preserved, and create an account in context. Shelfie remains optional, but earlier profile questions are no longer casually skippable.
