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

Keep downloaded and generated datasets outside the repository. JSONL is an intermediate dataset, not a D1 SQL import file. This extraction script does not create or populate D1. Use `prepare_import.py` to turn the selected JSONL into barcode-upsert SQL, then follow the [one-time D1 import instructions](#one-time-local-import). Only products with names, calories, and complete macros qualify for that import.

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

## Catalog storage

The API Worker binds the separate `calwise-food` D1 database as `FOOD_DB`. Catalog schema and migrations live in `packages/database/src/food-schema.ts` and `packages/database/migrations-food/`, separate from user tables and migrations. Private user data stays out of the ODbL catalog. There is no separate food Worker or deployment.

See the [food glossary](../../apps/api/src/modules/food/CONTEXT.md) for domain terms and search semantics.

## Queries

Both tRPC queries are public and need no session:

- `food.search({ q: "zolty ser", limit: 20 })` returns `{ products, attribution }`.
- `food.barcode({ barcode: "5900000000000" })` returns `{ product, attribution }`, or `NOT_FOUND`.

Input schemas live next to `searchExpression` in `apps/api/src/modules/food/food-service.ts`. Search accepts 2 to 100 characters after trimming and a numeric integer limit from 1 to 50, default 20. It matches every word as a prefix across names and brands. SQLite's `unicode61 remove_diacritics 2` tokenizer handles case and accents. The FTS triggers and query builder fold ł and Ł to l. FTS stores its own folded text; the catalog table and importer keep the source fields. Results sort by name, then barcode. There is no typo tolerance, pagination, stemming, or nutrition conversion. Invalid input returns `BAD_REQUEST`; database failures return a generic `INTERNAL_SERVER_ERROR`.

Product fields use camelCase. Database queries select only the public columns; internal row IDs never leave D1. Missing optional nutrition stays `null`. OFF's `100g` field names can represent per 100 ml for liquids. Do not use them as per-serving values or convert liquid volume to weight without more product metadata. Names are the snapshot's default names and are not guaranteed to be Polish.

Every successful catalog response includes Open Food Facts attribution and the database license. The queries use the existing tRPC CORS policy. No food-search UI is included.

## One-time local import

From the repository root, after extracting the snapshot above:

```sh
DATA="$HOME/.cache/calwise/open-food-facts"
python3 -B tools/open-food-facts/prepare_import.py "$DATA/poland.jsonl" "$DATA/poland.sql"
pnpm --filter @calwise/api db:migrate:local
pnpm --filter @calwise/api exec wrangler d1 execute calwise-food --local --file="$DATA/poland.sql"
pnpm dev
```

Root `pnpm dev` starts the API Worker on port 8787 and the web app. To try the synthetic fixture instead of the real dataset, run `pnpm --filter @calwise/api e2e:serve`. It migrates both databases and imports the fixture into separate `.wrangler/e2e-state` storage before starting the API. Stop the dev command when finished.

```sh
curl --fail --get 'http://localhost:8787/trpc/food.search' \
  --data-urlencode 'input={"q":"ser","limit":2}'
```

The initial snapshot has 34,542 Polish-market products; 20,881 have names, kcal, protein, fat, and carbohydrates and qualify for import. The extractor owns country selection. The SQL generator expects its Poland JSONL output, skips incomplete products, and uses barcode upserts, so retrying an interrupted import does not duplicate products. FTS triggers keep search entries consistent with inserts and updates. The script does not download, schedule, delete old products, or contact Cloudflare. The real dataset and generated SQL stay outside Git. Checked-in fixtures are synthetic test data only.

## Production rollout

1. Before merging the first food deployment, run the existing **Infrastructure** workflow against this branch. Review the plan for the food database/output, then apply. Terraform owns D1; Wrangler owns Worker deployments and bindings.
2. Merge after checks pass. The API deployment applies migrations to both databases before deploying the single Worker. No product dataset is imported by CI.
3. With `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set locally, run the one-time import:

   ```sh
   pnpm --filter @calwise/api exec wrangler d1 execute calwise-food --remote \
     --file="$HOME/.cache/calwise/open-food-facts/poland.sql"
   ```

4. Verify the imported count and search through the API:

   ```sh
   pnpm --filter @calwise/api exec wrangler d1 execute calwise-food --remote \
     --command='SELECT count(*) AS products FROM products'
   curl --fail --get 'https://calwise-api.lastlab.win/trpc/food.search' \
     --data-urlencode 'input={"q":"ser","limit":2}'
   ```

Until the import runs, search returns an empty array. No production resources are created by local migration commands. Production provisioning and import are explicit operator steps, not scheduled jobs.

## Verification

`pnpm test` covers tRPC validation and query expression generation. `python3 -B -m unittest discover -s tools/open-food-facts -v` checks extraction and real SQLite FTS migrations, upserts, escaping, and index updates. Both suites use `tools/open-food-facts/fixtures/search.json` to pin the query/tokenizer contract, including decomposed accents and ł.

`CI=true pnpm e2e` starts the single API Worker, imports a synthetic product into isolated local storage, and exercises search, barcode lookup, and public field selection against D1. It also runs the existing web tests.
