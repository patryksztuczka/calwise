# Food

Products available for food logging: a public, read-only catalog of Polish-market products from Open Food Facts and personal products private to their creators.

## Language

**Polish-market product**:
A product tagged as sold in Poland, including imported brands. Its name is the snapshot's default name, not necessarily Polish.

**Catalog product**:
A product with a barcode, name, calories, protein, fat, and carbohydrates. Missing optional nutrition stays absent, and zero is a valid nutrient value.

**Personal product**:
A product defined by a user and visible only to that user, with an optional barcode. It is separate from the public catalog; creating one does not record consumption.

**My foods**:
The user's collection of personal products, available for later food logging, separate from public catalog search.

**Barcode**:
An exact product code, including any leading zeros. A user can have at most one personal product with a given barcode; lookup prefers that user's personal product over a public catalog match.

**Package quantity**:
A description of the amount in a package, such as "500 g" or "1 L". It does not define a loggable portion.

**Serving size**:
A description of a serving, such as "1 slice, 30 g". It does not define a loggable portion.

**Catalog search**:
A match for every query word as a prefix across product names and brands, ignoring case and accents, including ł. Results sort by name, then barcode, with no typo tolerance, stemming, or pagination.

**My foods search**:
A match for every query word as a prefix across the user's personal product names and brands, ignoring case and accents, including ł. Matches sort alphabetically; without a query, My foods shows newest products first.

**Nutrition basis**:
The source's values per 100 g or per 100 ml, depending on the product. These are not per-serving values, and liquid volume cannot be converted to weight without more product metadata. A personal product's creator selects its basis, which determines its allowed logging unit.

**Attribution**:
Credit to Open Food Facts contributors and the ODbL 1.0 database license, included with every successful catalog response. The catalog excludes private user data.
