# Create personal products

## Problem Statement

Users can log products from the public Open Food Facts catalog but cannot define their own products. A missing barcode match, a product without a barcode, or nutrition that differs from the catalog leaves the user without a reusable product to log.

Users need to enter label information once, keep it private, and find it again without adding a meal entry just to save a product.

## Solution

Add manual creation of personal products using the existing Pencil design, reduced to two steps: product details and nutrition. Save personal products to the creator's My foods collection, separate from public catalog search.

Users can start from My foods or a barcode no-match result. They can enter an optional barcode manually or with the existing barcode scanner. Saved products can be searched, selected, and logged through the existing portion flow. Saving never records consumption.

## User Stories

1. As a signed-in user, I want to create a personal product, so that I can log food missing from the catalog.
2. As a signed-in user, I want my personal products to stay private, so that other users cannot discover or use them.
3. As a signed-in user, I want creation to leave the public catalog unchanged, so that my entries do not alter shared information.
4. As a signed-in user, I want to start creation from My foods, so that I can define a product without scanning anything.
5. As a signed-in user, I want to create a product after a barcode no-match result, so that an unsuccessful lookup is not a dead end.
6. As a signed-in user, I want the unmatched barcode prefilled, so that I do not have to enter it again.
7. As a signed-in user, I want a two-step manual form, so that product details and nutrition remain manageable on a phone.
8. As a signed-in user, I want to enter a required product name, so that I can recognize the product later.
9. As a signed-in user, I want to enter an optional brand, so that I can distinguish similar products.
10. As a signed-in user, I want to save products without barcodes, so that unpackaged or unlisted products are supported.
11. As a signed-in user, I want to type an optional barcode, so that I can identify the product when I scan it later.
12. As a signed-in user, I want to scan the barcode into the form, so that I can avoid typing a long code.
13. As a signed-in user, I want leading barcode zeros preserved, so that lookup uses the exact code I entered.
14. As a signed-in user, I want malformed barcode feedback, so that I can correct the code before saving.
15. As a signed-in user, I want an optional package quantity description, so that I can record information such as 500 g or 1 L.
16. As a signed-in user, I want an optional serving size description, so that I can record information such as one slice weighing 30 g.
17. As a signed-in user, I want to choose nutrition per 100 g or per 100 ml, so that the values match my label.
18. As a signed-in user, I want per 100 g selected initially, so that common weight-based products require fewer actions.
19. As a signed-in user, I want changing the basis to retain the entered values and explain that no conversion occurs, so that I can correct the basis without retyping.
20. As a signed-in user, I want to enter calories, protein, carbohydrates, and fat, so that the product can contribute to my food log totals.
21. As a signed-in user, I want zero to be a valid nutrient value, so that products with no sugar, fat, or calories can be represented.
22. As a signed-in user, I want to enter decimal commas or decimal points, so that I can type values in a familiar format.
23. As a signed-in user, I want optional fields for energy in kJ, saturated fat, sugars, fibre, salt, and sodium, so that I can retain additional label information.
24. As a signed-in user, I want optional blanks to mean unknown rather than zero, so that missing information is not misrepresented.
25. As a signed-in user, I want entered label values preserved without forced nutrition equations or derived values, so that label rounding does not prevent saving.
26. As a signed-in user, I want invalid negative or non-finite nutrition rejected, so that unusable numbers do not enter my collection.
27. As a signed-in user, I want entered precision retained, so that display rounding does not change the saved nutrition.
28. As a signed-in user, I want to move between steps without losing fields, so that I can review and correct my entry.
29. As a signed-in user, I want barcode scanning to preserve my draft, so that using the camera does not restart the form.
30. As a signed-in user, I want a warning before discarding unsaved changes, so that I do not lose work accidentally.
31. As a signed-in user, I want failed saves to retain my input, so that I can retry without retyping.
32. As a signed-in user, I want repeated save attempts for the same submission to create only one product, so that a slow or lost response does not produce duplicates.
33. As a signed-in user, I want a personal product to be allowed to share a public catalog barcode, so that I can record my own label values without changing the catalog.
34. As a signed-in user, I want a duplicate personal barcode error with an action to view my existing product, so that I can resolve the conflict without overwriting it.
35. As a signed-in user, I want a duplicate error to preserve my draft, so that I can correct or remove its barcode.
36. As a signed-in user, I want products with the same name to be allowed, so that similarly named products are not incorrectly treated as duplicates.
37. As a signed-in user, I want barcode lookup to prefer my personal product over a public match, so that scans use the nutrition I saved.
38. As a signed-in user, I want other users' personal products excluded from lookup, so that my results remain independent of their private data.
39. As a signed-in user, I want My foods to list products without requiring a search, so that I can browse my collection immediately.
40. As a signed-in user, I want the newest products first when browsing, so that recently created products are easy to find.
41. As a signed-in user, I want to search personal product names and brands using word prefixes regardless of case or accents, so that I can find products without exact spelling of accented characters.
42. As a signed-in user, I want search results sorted alphabetically, so that matching products are predictable to browse.
43. As a signed-in user, I want to load more than the first 20 products or matches, so that older products remain reachable.
44. As a signed-in user, I want My foods separate from catalog search, so that I know which products are mine.
45. As a signed-in user, I want saving to return to My foods with confirmation, so that I know the product is available.
46. As a signed-in user, I want saving to preserve my selected meal and date without logging anything, so that creation does not imply consumption.
47. As a signed-in user, I want to select a saved personal product and enter a portion, so that I can log it through the familiar flow.
48. As a signed-in user, I want the logging unit to match the personal product's nutrition basis, so that weight and volume are not silently exchanged.
49. As a signed-in user, I want package and serving descriptions kept distinct from loggable portions, so that the app does not invent conversions from text.
50. As a signed-in user, I want personal-product entries to retain captured names and nutrition, so that my consumption history remains stable.
51. As an existing catalog user, I want public search, attribution, and catalog logging behavior preserved, so that personal products do not break my current workflow.

## Implementation Decisions

### Domain boundaries and persistence

- Food owns catalog products and personal products. Auth supplies the authenticated owner. Food log records consumption; defining a product does not create a food entry.
- Personal products belong to exactly one user. Enforce ownership on every personal product read, search, lookup, creation, and logging request. The authenticated session determines ownership, not a supplied user identifier.
- Keep personal data in the private user database, separate from the public catalog database. The public catalog remains read-only to application users.
- Personal products need an identity independent of barcode because barcode is optional. Product references must distinguish personal products from catalog products; do not use a fabricated barcode as identity.
- Store owner, product identity, creation ordering information, product details, explicit nutrition basis, required nutrition, and nullable optional nutrition.
- Enforce barcode uniqueness per owner when a barcode is present. Permit the same barcode across different owners and in the public catalog. Permit multiple products without barcodes and duplicate names.
- Make creation idempotent for retries of the same submission, including submissions without barcodes. Distinguish retrying a successful creation from a separate creation that conflicts on barcode. Enforce this in persistence, not solely by disabling the Save button. The exact request-key representation is an implementation choice.
- Food entries capture personal product name and nutrition at logging time, as catalog entries already do. Retain enough source and basis information to enforce personal-product units during later entry changes. Do not change the existing catalog entry unit behavior.

### Two-step form

- Adapt the Pencil creation screens to two steps. Open product details directly; omit the method chooser and nutrition-label scanner.
- Step 1 contains product name, optional brand, optional barcode with scanner action, optional package quantity, and optional serving size.
- Step 2 contains the nutrition basis switch, required nutrition, optional nutrition, and Save product action.
- Require a trimmed, nonblank product name of at most 200 characters. Trim optional brand, package quantity, and serving size and cap each at 200 characters.
- Package quantity and serving size are descriptive text only. Do not parse them into package or serving portions.
- Accept an absent barcode or a code of 4–24 digits, preserving leading zeros. Reuse existing barcode format rules and do not add checksum validation.
- Default to per 100 g. Support per 100 ml. Switching retains the numbers and changes their declared basis without conversion; explain this beside the control.
- Require calories in kcal and protein, carbohydrates, and fat in grams. Optional fields are energy in kJ, saturated fat, sugars, fibre, salt, and sodium, with all non-energy fields in grams.
- Accept zero and finite nonnegative decimals. Browser entry supports decimal points and commas. Blank required fields are invalid; blank optional nutrition remains unknown.
- Do not enforce plausibility caps, macro sums, component nutrient relationships, or calorie equations. Do not automatically derive kJ or sodium.
- Preserve numeric precision within the existing number representation. Do not round on save; round for display only. Arbitrary-precision decimal storage is not implied.
- Preserve fields between steps and while opening, completing, or cancelling barcode capture. The scanner fills the barcode field rather than navigating into the normal lookup-and-log flow. Manual entry remains available if scanning cannot be used.
- Warn before discarding a dirty form. Do not persist drafts across page reloads or closing the page. Browser unload prompts are subject to browser restrictions.
- Save failures retain input and provide a retry path. Validation errors identify the affected fields. A duplicate personal barcode error includes View existing product and allows correcting or removing the draft barcode; no silent overwrite occurs.

### My foods and navigation

- Offer Create product from My foods and from a barcode no-match result. Carry the unmatched barcode into the latter flow.
- Require authentication for My foods and creation.
- My foods lists personal products separately from public catalog search. Do not merge personal products into public catalog search results.
- Without a query, sort newest first. With a query, match every word as a prefix across name and brand, ignoring case and accents, including ł, and sort alphabetically.
- Return 20 products at a time and expose Load more for browsing and searching. Use deterministic ordering for tied results so paging does not skip or repeat products in an unchanged collection. Cursor representation is an implementation choice.
- On successful save, return to My foods with confirmation and refreshed collection data. Preserve any selected logging destination. Saving creates no food entry and does not increment logging-session addition counts.
- Selecting a saved product opens the existing portion flow. Logging remains a separate action and follows existing meal, date, positive-amount, and finite-calculation rules.
- For personal products, logging and subsequent entry edits must use the stored nutrition basis unit. A per-100-ml product uses ml; a per-100-g product uses g. No weight/volume conversion is introduced.
- Public catalog logging retains its existing user-selected unit behavior.

### Lookup and API contracts

- Extend the Food API with authenticated personal product creation, listing/search, and retrieval sufficient for selection and duplicate recovery.
- Signed-in barcode lookup checks the caller's personal products first and otherwise falls back to the public catalog. Anonymous lookup continues to use only the public catalog.
- Extend the food logging contract to accept an explicit personal product reference as well as the existing catalog reference. Resolve the product server-side and check ownership before capturing nutrition.
- Preserve catalog response attribution. Do not attribute a manually entered personal product to Open Food Facts or give it an invented source URL. Responses and client product models must represent the distinction.
- Personal lookup and list caches must be scoped to the authenticated user or cleared when authentication changes; cached data must not leak between accounts.
- Keep the existing Hono/tRPC transport, type-only router consumption by the web app, Effect backend service architecture, and D1 persistence.
- Follow the existing validation ADR: use Effect Schema and its Standard Schema adapter rather than adding a competing validation library. Extract shared runtime validation only where browser and server both need it; do not import server runtime code into the browser.
- Generate schema migrations through the existing Drizzle workflow and apply them through Wrangler. Do not change the pinned backend dependency train for this feature.
- Exact procedure names, database column names, pagination tokens, and retry-key representation are not fixed by this spec. Choose them to satisfy these contracts without changing existing catalog behavior.

## Testing Decisions

### Proposed seams, awaiting user confirmation

Use the existing Playwright application-level suite against the built web app, real local Worker, and migrated local D1 databases. This is the highest existing seam that exercises the full feature.

- Use browser interactions for creation, navigation, My foods, validation feedback, recovery, and logging.
- Use authenticated HTTP requests through the same suite and Worker for broad validation cases, ownership isolation, barcode conflicts, concurrency, pagination, and retry behavior that would be slow or difficult to cover through UI interactions alone.
- This reuses one application-level test setup with browser and HTTP entry points. Do not add a new service-mocking framework or another test environment.
- Existing catalog and food-log Playwright tests are the prior art. They already exercise public lookup against local food D1, authenticated browser flows, account isolation, input validation, and idempotent mutations against the user D1 database.
- Existing in-process Food and Food log API tests may be updated for changed contracts, but mocked service calls are not sufficient evidence for persistence, uniqueness, or authorization correctness.

### What makes a good test

Assert observable outcomes: saved products, visible errors, lookup results, paged collections, captured food entries, and unchanged data for unauthorized callers. Avoid assertions about component state, hook calls, service invocation counts, private helpers, or exact generated SQL. Prefer existing accessible labels and roles for browser actions.

Do not duplicate every validation matrix at every layer. Use a few full browser journeys and HTTP-level cases for the remaining combinations. Use isolated test accounts and deterministic product fixtures rather than depending on developer database state.

### Required coverage

- Create a barcode-free product using the two-step form, reload My foods, retrieve it, and log it separately. Verify saving alone leaves the food log unchanged.
- Create from a barcode no-match result and verify the barcode and selected meal/date survive the round trip.
- Create a per-100-ml product, switch basis while editing, verify values remain unchanged, and verify logging and entry editing reject an incompatible unit. Retain catalog tests that demonstrate its existing unit choice.
- Verify required text, text limits, required nutrition, optional blanks, explicit zero, decimal comma entry, negative and malformed values, and preservation of precision. Include finite but implausible values to prove no unintended plausibility rules were added.
- Verify all optional nutrition fields survive save and retrieval without derivation or replacement of unknown values with zero.
- Verify scanner completion and cancellation preserve the draft and populate only the barcode field. Use a controlled camera/decoder input at the browser boundary where necessary; do not replace product creation with a mocked success response. Manually verify the camera interaction on a supported device if automation cannot cover it reliably.
- Verify back navigation between steps, discard warning cancellation, actual discard, and absence of persisted drafts after a confirmed reload.
- Verify a failed save retains fields. Verify retries after an uncertain outcome create only one product, including when no barcode is present.
- Verify duplicate barcode conflicts within one account, no overwrite, draft retention, and retrieval through View existing product. Include concurrent duplicate submissions against real D1.
- Verify the same barcode can belong to personal products of two different users and a public product. Each signed-in lookup returns only its owner's personal match; anonymous and unrelated-user lookup fall back to the public catalog.
- Verify unauthenticated creation/listing/retrieval/logging is rejected. Verify another account cannot retrieve or log a private product even when its identity is known.
- Verify account changes do not display the previous account's cached personal data.
- Verify newest-first browsing, alphabetic search, multiword name/brand prefix matching, case and accent handling including ł, empty results, and pagination beyond 20 items for both browsing and search.
- Verify duplicate names and multiple barcode-free products remain separately selectable and reachable across pages.
- Verify snapshot nutrition calculations, unchanged logging destinations after creation, separate food entries for intentional repeated logging, and normal existing food-entry changes.
- Keep public catalog search, barcode lookup, attribution, and food logging regression tests passing.

## Out of Scope

- Nutrition-label reading, OCR, AI extraction, and the creation method chooser.
- Categories, countries sold in, allergens, possible traces, product photos, and the third form step.
- Editing or deleting personal products. Existing editing and deletion of food entries remain supported.
- Public product contributions, moderation, sharing, or submission to Open Food Facts.
- Copying a public product into an editable personal product as a separate workflow.
- Automatic logging on save.
- Package-based or serving-based portions, parsing descriptive quantities, density metadata, and weight/volume conversions.
- Changing existing public catalog logging unit semantics.
- Nutrient plausibility caps, cross-field nutrition validation, automatic nutrient derivation, and barcode checksum validation.
- Persistent drafts, offline saving, and cross-device draft recovery.
- Merging personal products into public catalog name/brand search.
- Arbitrary-precision numeric storage or a new testing framework.

## Further Notes

- Product decisions were agreed across all interview rounds. The testing approach above is a proposal that still needs confirmation; it was not part of those rounds.
- Pencil is the visual reference. Its creation flow still shows deferred functionality and three steps; implement the agreed two-step subset rather than treating every control in that design as current scope.
- The existing domain glossaries have been updated to describe personal products and their logging rules, but application code has not been implemented.
- Some older platform ADR wording predates the application's existing authentication. Follow the current authenticated-user model while retaining the architectural separation between private user data and the public catalog.
- This spec is a local artifact at the user's request. It has not been published to an issue tracker or assigned a triage label.
- Do not treat creating this spec as permission to implement the feature. Stop any project services started for verification when finished.
