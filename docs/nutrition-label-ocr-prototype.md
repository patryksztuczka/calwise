# Nutrition label OCR prototype

The `/create-product` page now starts with a choice. Manual entry opens the existing two-step form. Label scanning runs Tesseract.js in the browser and copies reviewed values into that same editable draft. The scan never saves a product or logs a meal.

## What stays local

Camera frames and selected image files are passed directly to the browser's Tesseract worker. Calwise does not send them to tRPC, an OCR API, or another server.

The first scan downloads these pinned runtime assets from jsDelivr:

- Tesseract.js worker 7.0.0
- Tesseract.js core 7.0.0
- English and Polish `tessdata_fast` 4.1.0 models

The CDN receives normal asset request metadata, such as the user's IP address. It does not receive the label image. Browsers may cache language models in IndexedDB.

## Conservative parsing rules

The parser accepts only an explicit `per 100 g`, `per 100 ml`, `w 100 g`, or `w 100 ml` heading. It does not use a broad percentage of page width as column evidence. A value must sit directly under the horizontal span of the `100` plus unit heading: either the value's center is inside that span or the printed value spans the heading's center. A kJ/kcal companion outside the span is accepted only when a trusted value anchors the same target cell and the pair is joined by a printed slash or a gap no larger than that row's text height. This rule scales and translates with OCR coordinates. A serving heading counts only when its vertical position matches the per-100 heading. Without that heading, multiple columns, a lone nearby serving value, or a missing target cell cause abstention; package metadata such as `Serving size 30 g` cannot define a table column.

Basis words, numbers, and units need at least 70 percent Tesseract confidence. Lower-confidence critical tokens produce a review warning and never fill that field. The TSV adapter retains low-confidence words and symbols so they cannot disappear and expose a neighboring value by accident.

It leaves a field blank when it cannot establish the basis, column, nutrient, unit, or exact value. Contradictory bases, unresolved columns, and conflicting duplicate rows block the whole prefill. Before accepting a value, the parser checks the complete nutrient row, including serving cells and words or symbols after the unit. English and Polish inequalities and approximations—such as less/more than, at least/most, approximately, about, `mniej/więcej niż`, `co najmniej/najwyżej`, `około`, `<`, `>=`, `≥`, `~`, and `≈`—make that nutrient row abstain. Low-confidence qualifier tokens still retain that meaning. A qualifier in one nutrient row does not block unrelated rows, but a qualified serving cell blocks the target value on the same row. Literal zero remains zero.

Safety does not depend on that modifier vocabulary. After a supported English or Polish nutrient label, every remaining token must be accounted for by a fail-closed value-cell grammar: an exact decimal number with its supported unit, repeated serving/target cells, kJ/kcal slash separators, an optional label colon, or a table-border pipe. Unknown or misspelled words, split annotations, words before a number or after its unit, reference-intake text, unsupported punctuation, missing units, and unfamiliar layouts make that nutrient row abstain with an `unsupported-row` warning. Common multiword labels such as `of which saturated fat`, `w tym kwasy tłuszczowe nasycone`, `of which sugars`, `w tym cukry`, and `wartość energetyczna` are explicitly recognized. Other layouts are left for manual entry rather than guessed.

Any English or Polish prepared marker in the parsed table rejects the whole table. This includes `as prepared` or `po przygotowaniu` on the per-100 line, above or below it, and wrapped across adjacent header lines. The prototype deliberately does not try to distinguish mixed as-sold and prepared tables.

A scan cannot add values to a draft with a different established basis. No values change until the user resolves the basis and existing nutrition together. A scan with no usable basis also leaves both basis choices unselected in the review form. The user must choose `g` or `ml` before saving. A basis chosen before scanning remains selected. The copied-value notice counts nutrient fields that actually changed, not every value present in the OCR result, so preserved manual values are excluded.

The prototype does not:

- normalize per-serving values
- convert prepared values
- derive kcal from kJ or kJ from kcal
- derive salt from sodium or sodium from salt
- store labels, photos, OCR text, or allergens
- recognize every table design, language, abbreviation, or damaged package

Missing required values remain blank in the normal form. The user must complete calories, protein, carbohydrates, and fat before saving.

Live camera results appear only after two matching safe readings from separate sampled frames. A selected bitmap is read once. Its result says `IMAGE READ. REVIEW REQUIRED` because running deterministic OCR on the same pixels twice would not provide independent evidence.

## Checks

Run the deterministic parser, state, TSV, lifecycle, and browser-request-policy tests:

```sh
pnpm test apps/web/src/modules/scanner/tests/nutrition-label-parser.test.ts \
  apps/web/src/modules/scanner/tests/nutrition-scan-state.test.ts \
  apps/web/src/modules/scanner/tests/nutrition-scan-loop.test.ts \
  apps/web/src/modules/scanner/tests/nutrition-ocr.test.ts \
  apps/web/src/modules/scanner/tests/nutrition-ocr-network-policy.test.ts
```

The parser matrix covers known and unfamiliar modifiers before and after values, misspellings and token splits, serving-cell annotations, reference-intake tails, justified and unsupported punctuation, supported multiword nutrient labels, low-confidence qualifiers, multiline prepared headings, translated/scaled coordinates, narrow columns, omitted headings and target cells, and valid single-column tables. State tests cover all, partial, and zero-value capture merges.

Run real Tesseract against the two checked-in synthetic readable labels:

```sh
pnpm --filter @calwise/web ocr:smoke
```

The fixtures are `apps/web/e2e/fixtures/nutrition-label.png` and `apps/web/e2e/fixtures/nutrition-label-pl.png`. They are generated test graphics, not photos of retail packaging. The script asserts English and Polish text, page confidence, positioned word bounding boxes, and parsed fields. On 2026-09-13, the English image produced 91 page confidence and 40 words. It safely yielded per 100 ml energy, protein, and salt while leaving Tesseract's uncertain fat and carbohydrate readings blank. The Polish image produced 93 page confidence and 22 words, including `WARTOŚĆ ODŻYWCZA` with a bounding box. It yielded a per 100 g basis, energy, fat, carbohydrates, and protein. Its `0,7 g` salt reading scored 69 percent, so the 70 percent policy left salt blank with a warning.

Run the project checks and the product-creation browser journeys:

```sh
pnpm check
pnpm test
pnpm --filter @calwise/web typecheck
pnpm build
pnpm --filter @calwise/web e2e personal-product-journeys.spec.ts --workers=2
```

These commands cover formatting and lint, all unit suites, web TypeScript, the production bundle, actual copied-value notices, preservation of manual fields, explicit basis selection, save behavior, and the existing personal-product journeys.

Run the opt-in production-preview browser smoke:

```sh
RUN_REAL_OCR=1 pnpm --filter @calwise/web e2e nutrition-ocr-browser.smoke.spec.ts --workers=1
```

This test loads the built site and starts two separate scanners. Monitoring begins only after account setup, navigation, and initial fonts have settled. The cold scanner reads the English image and must expose the exact pinned worker, one permitted pinned core variant, and both exact language-model URLs. The warm scanner reads the Polish image through a new worker and verifies that IndexedDB avoids another language-data request.

For every request observed after monitoring starts, the guard allows only body-free GET or HEAD requests for the exact pinned OCR assets, narrowly allowlisted local static assets, or same-app blob assets. Queries, credentials, other jsDelivr paths or versions, local API calls, other origins, request bodies, and methods such as POST, PUT, or PATCH fail the test. The guard stores only URL, method, and a body-present boolean; it never records body contents. Unit tests prove that wrong CDN assets, unexpected queries, body-bearing requests, mutations, and unexpected outbound URLs are rejected even when no fixture filename is present.

This is evidence for traffic surfaced by Playwright's page request and response events, including the worker/model requests observed in this run. It is not a packet capture and does not prove traffic that a browser or service worker might keep outside that event surface.

## Manual mobile checklist

Use an HTTPS deployment on a physical phone.

1. Open `/create-product` with and without incoming name, barcode, date, and meal query values.
2. Choose scan, grant camera access, and check the loading percentage and privacy text.
3. Hold a Polish label still with its full nutrition table inside the guide. Repeat with an English label.
4. Check glare, tilted packages, serving and per-100 columns, `0`, decimal commas, and `<` values.
5. Confirm that live camera results appear only after the same safe reading occurs in two sampled frames. Check that an uploaded image instead says it had one deterministic read and needs review.
6. Tap "Review & edit". Check the captured basis, blanks, incoming details, and earlier manual edits.
7. Edit a scanned value. Return to the chooser, scan again, and confirm the edit is not replaced.
8. Background the browser during camera startup and during recognition. Return and confirm that scanning is stopped.
9. Leave the scan screen during camera permission and after OCR starts. Confirm that the camera indicator turns off.
10. Deny camera permission. Check image input, retry, and manual fallback.
11. Save only after reviewing the form. Confirm that the product appears in My foods and no meal entry was created.

Physical HTTPS phone camera and torch behavior remains a manual validation limit; it cannot be proven by the local desktop checks above.
