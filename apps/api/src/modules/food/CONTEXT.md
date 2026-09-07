# Food

A read-only catalog of Polish-market products from Open Food Facts, separate from private user data.

## Language

**Polish-market product**:
A product tagged as sold in Poland, including imported brands. Its name is the snapshot's default name, not necessarily Polish.

**Catalog product**:
A product with a barcode, name, calories, protein, fat, and carbohydrates. Missing optional nutrition stays absent, and zero is a valid nutrient value.

**Barcode**:
The product's exact identifier, including any leading zeros. Lookup returns one product or no match.

**Search**:
A match for every query word as a prefix across product names and brands, ignoring case and accents, including ł. Results sort by name, then barcode, with no typo tolerance, stemming, or pagination.

**Nutrition basis**:
The source's values per 100 g or per 100 ml, depending on the product. These are not per-serving values, and liquid volume cannot be converted to weight without more product metadata.

**Attribution**:
Credit to Open Food Facts contributors and the ODbL 1.0 database license, included with every successful catalog response. The catalog excludes private user data.
