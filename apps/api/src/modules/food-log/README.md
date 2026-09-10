# Food logging

Food entries belong to the signed-in user and live in the private `DB` database. `FOOD_DB` remains a read-only public catalog. Apply the new user-database migration with `pnpm db:migrate:local` before running the app locally.

## API

All `foodLog` procedures require a session. Queries and writes always filter by the session's user ID; callers cannot supply an owner.

- `day({ date })` returns the caller's entries for a calendar date, in creation order.
- `entry({ id })` returns one owned entry or `NOT_FOUND`.
- `add({ id, barcode, amount, unit, date, meal })` captures the catalog name, brand, calories, protein, carbohydrates, and fat. `id` is a client-generated UUID retained for retries. A new addition gets a new UUID, even for the same product.
- `update({ id, amount, unit, date, meal })` changes the portion or destination without rereading the catalog.
- `remove({ id })` deletes an owned entry. Repeated removal is harmless.

Dates are valid `YYYY-MM-DD` calendar dates, not timestamps. Add and update reject dates later than today in UTC+14, the earliest zone to reach a new date. This accepts local today everywhere without trusting client-supplied time zones. The client enforces its own local today. Amounts must be finite and positive; calculated nutrition must also remain finite.

Users choose `g` or `ml` freely. This declares the nutrition basis, rather than converting volume and weight. Both use `amount / 100` times the captured values. Totals sum unrounded values; rounding is for display only.

## Screens

The implementation follows Pencil's Search / Edit portion, Search / Food added, Barcode matched / Review portion, Choose meal, Choose date, Meal detail, and Logged food / Edit and move frames.

The agreed deviations are an initially empty amount, only `g` and `ml`, and the result's plus button opening the editor rather than immediately adding food. Searching, expanding, and scanning never create entries.

Each addition saves immediately. The search screen stays open and offers Undo. Changing its destination affects only new additions. Done navigates to the selected meal and date; Back does not discard entries. Session counts and Undo confirmations are transient and reset when the logging flow is left or reloaded. Saved entries remain editable from the meal.

Moving an entry preserves its captured nutrition and portion. Undo moves it back. Removing an entry requires confirmation.

The daily overview shows all four slots, including empty meals, and supports browsing past dates. Consumption totals come from saved entries. The existing 2,000 kcal, 125 g protein, 225 g carbohydrates, and 67 g fat targets are labelled as defaults. Personal targets and the separate Diary screen remain outside this feature.

## Verification

`pnpm e2e` exercises the browser and authenticated API against migrated local D1, including reload persistence, duplicate additions, editing, moving and Undo, deletion, malformed input, and account isolation. `pnpm test` runs the unit suite.
