# Shelf life + expiry tracking

Right now a product only has an opened date and a period-after-opening (PAO) clock. Sealed products, and products with a printed expiry/batch date, have no expiry at all. This adds that second dimension and makes the shelf tell you when to *open* something, not just when to bin it.

## What changes for you

**Two dates, one clear answer**
- Every product can now store a **printed expiry date** (the "EXP" / best-before on the box) alongside the opened date and PAO clock.
- If the product is **opened**: expiry = opened date + PAO, but never later than the printed expiry (whichever comes first wins).
- If the product is **unopened**: it counts down to the printed expiry, and the card shows an **"open by" date** = printed expiry minus the PAO window. That's the last day you can crack it open and still finish it before it turns.

**New states on the shelf**
- Sealed & fine: "Sealed, open by 12 Mar 2027"
- Sealed & urgent: "Open it soon — 3 weeks to open by" (amber)
- Sealed & too late: "Open by date passed — use it up fast"
- Opened: unchanged countdown, but capped by printed expiry
- No dates at all: "Add an expiry or opened date"

**Capture and editing**
- The AI reading of a product photo also picks up a printed expiry / best-before date (and translates non-English date formats), so it's pre-filled in the confirm step.
- Product detail gets an "Unopened / Opened" toggle, a printed-expiry field, and shows the derived "open by" date under it.
- Insights' expiring section now includes sealed products whose open-by date is near or passed, in a separate "Open these next" group.

## Landing page copy

The "Freshness at a glance" card becomes:

> **Never waste a good product**
> Track opened dates, period-after-opening and printed expiry together — we'll nudge you to open the sealed ones in time to actually finish them.

## Technical notes

- Migration: add `expiry_date date` (nullable) and `is_opened boolean` derivation stays implicit (`date_opened is null` = sealed) to `public.products`.
- `src/lib/freshness.ts`: extend `freshnessFor(dateOpened, paoMonths, expiryDate)` returning new statuses `sealed` / `open-soon` / `open-overdue` plus existing `fresh|soon|expired|unknown`, an `openByDate`, and effective expiry = `min(opened+PAO, expiry_date)`. Keep the 60-day amber threshold; use 30 days for open-by warnings.
- Update consumers: `ProductCard`, `product.$id.tsx`, `insights.tsx`, `add.tsx`, `bulk.tsx`, plus MCP tools (`list-products`, `add-product`, `update-product`) to expose `expiry_date`.
- `ai.server.ts`: add `expiry_date` (ISO `YYYY-MM-DD`, normalised from formats like `2027/03`, `03.2027`, Japanese labels) to the single-product and bulk extraction schemas; when only month/year is printed, use the last day of that month.
