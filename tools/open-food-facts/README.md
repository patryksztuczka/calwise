# Polish food catalog snapshot

Download the current Open Food Facts export and extract products **sold in Poland**, using the exact `en:poland` country tag. This includes imported brands. Products missing that tag are excluded even if their names are Polish.

Requires Python 3, curl, and enough disk space for the compressed snapshot, currently about 1.3 GB, plus the extracted data. No Python dependencies or project services are needed.

```sh
DATA="$HOME/.cache/calwise/open-food-facts"
mkdir -p "$DATA"
curl --fail --location --retry 3 \
  --dump-header "$DATA/download.headers" \
  --output "$DATA/products.tsv.gz.partial" \
  https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz && \
  mv "$DATA/products.tsv.gz.partial" "$DATA/products.tsv.gz"

python3 tools/open-food-facts/extract_poland.py \
  "$DATA/products.tsv.gz" "$DATA/poland.jsonl"

python3 -B -m unittest discover -s tools/open-food-facts -v
```

Keep downloaded and generated datasets outside the repository. JSONL is an intermediate dataset for a later D1 importer, not a D1 SQL import file. This extraction script does not create or populate D1. Use `prepare_import.py` to turn the selected JSONL into barcode-upsert SQL, then follow the [one-time D1 import instructions](../../apps/food-api/README.md#one-time-local-import). Only products with names, calories, and complete macros qualify for that import.

## Selected fields

| Output                                                                                                                          | Purpose                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `barcode`                                                                                                                       | Product identity and barcode lookup, stored as text to retain leading zeros |
| `name`, `brands`                                                                                                                | Search and display                                                          |
| `package_quantity`, `serving_size`                                                                                              | Original text, preserving units such as g and ml                            |
| `energy_kcal_100g`, `energy_kj_100g`                                                                                            | Energy as supplied by OFF, no calculated fallback                           |
| `fat_100g`, `saturated_fat_100g`, `carbohydrates_100g`, `sugars_100g`, `fiber_100g`, `protein_100g`, `salt_100g`, `sodium_100g` | Nutrition for food logging                                                  |
| `countries`, `categories`                                                                                                       | Country selection audit and future filtering                                |
| `allergens`, `traces`                                                                                                           | Source declarations, not a guarantee that a food is safe                    |
| `image_url`, `thumbnail_url`                                                                                                    | Display without downloading images                                          |
| `source_url`, `source_modified_at`                                                                                              | Attribution, correction link, and source modification time in Unix seconds  |
| `data_quality_errors`                                                                                                           | OFF flags for later validation                                              |

OFF's `_100g` nutrient columns represent values per 100 g or per 100 ml, depending on the product. Do not interpret these as per-serving values or assume that 1 ml equals 1 g. The TSV's default product name is not necessarily Polish. Language-specific names and richer nutrition-unit metadata may require the JSONL export later.

Empty text and missing, negative, invalid, or non-finite numbers become JSON `null`. Zero stays zero. Missing tags become empty arrays. Products with missing names or nutrition are retained so we can measure coverage before choosing API eligibility rules. Missing barcodes are skipped. Duplicate barcodes fail the extraction rather than silently choosing a record. Other implausible nutrient values are not corrected by this script.

The extractor streams the gzipped TSV without unpacking it to disk. It writes a temporary output and replaces the final JSONL only after reading the complete snapshot successfully. The adjacent `poland.manifest.json` records source URL, snapshot SHA-256, extraction time, row counts, missing-field counts, and output size. Extraction time is not the snapshot publication time.

## License

Attribute **Open Food Facts contributors** and link to <https://world.openfoodfacts.org>. The database is distributed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Follow its attribution and share-alike requirements when publishing the resulting database. Product images have separate licensing requirements, see <https://world.openfoodfacts.org/terms-of-use>.
