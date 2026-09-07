# Food API

A read-only Polish-market catalog in its own D1 database, `calwise-food`. The `calwise-food-api` Worker has no public domain, workers.dev URL, or preview URL. The existing Calwise API forwards food requests through its `FOOD_API` service binding. The user database and its migrations are unchanged.

## Endpoints

These paths are available on the Calwise API origin:

- `GET /foods/search?q=zolty%20ser&limit=20` returns `{ products, attribution }`.
- `GET /foods/barcode/5900000000000` returns `{ product, attribution }`, or 404.

Search accepts 2 to 100 characters and a limit from 1 to 50, default 20. It matches every word as a prefix across names and brands. Polish accents, including ł, are folded for matching. Results sort by name, then barcode. There is no typo tolerance, pagination, stemming, or nutrition conversion. Invalid input returns 400; missing barcodes return 404; database failures return a generic 500.

Product fields use camelCase, matching the Drizzle schema. Missing optional nutrition stays `null`. OFF's `100g` field names can represent per 100 ml for liquids. Do not use them as per-serving values or convert liquid volume to weight without more product metadata. Names are the snapshot's default names and are not guaranteed to be Polish.

The endpoints are public read-only routes on the existing API, with the same allowed-origin CORS policy. They do not require a session. Forwarded requests do not carry session cookies or authorization headers. Every successful catalog response includes Open Food Facts attribution and the database license. No food-search UI is included.

## One-time local import

From the repository root, after following [snapshot extraction](../../tools/open-food-facts/README.md):

```sh
DATA="$HOME/.cache/calwise/open-food-facts"
python3 -B tools/open-food-facts/prepare_import.py "$DATA/poland.jsonl" "$DATA/poland.sql"
pnpm --filter @calwise/food-api db:migrate:local
pnpm --filter @calwise/food-api exec wrangler d1 execute calwise-food --local --file="$DATA/poland.sql"
pnpm dev
```

Root `pnpm dev` starts both Workers and the web app. Search through `http://localhost:8787/foods/search?q=ser`, or call the food Worker directly on port 8788 during local development. Stop the dev command when finished.

The initial snapshot has 34,542 Polish-market products; 20,881 have names, kcal, protein, fat, and carbohydrates and qualify for import. The SQL generator skips incomplete products and uses barcode upserts, so retrying an interrupted import does not duplicate products. FTS triggers keep search entries consistent with inserts and updates. The script does not download, schedule, delete old products, or contact Cloudflare. The real dataset and generated SQL stay outside Git. The checked-in fixture is synthetic test data only.

## Production rollout

1. Before merging the first food deployment, run the existing **Infrastructure** workflow against this branch: plan, review that it only adds the food database/output, then apply. Terraform still owns D1; Wrangler owns Worker deployments and bindings.
2. Merge after checks pass. CI migrates food D1 and deploys the private Food Worker before deploying the Calwise API that binds it. Food-only changes deploy independently. No product dataset is imported by CI.
3. With `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set locally, run the one-time import:

   ```sh
   pnpm --filter @calwise/food-api exec wrangler d1 execute calwise-food --remote \
     --file="$HOME/.cache/calwise/open-food-facts/poland.sql"
   ```

4. Verify the imported count and search through the public API:

   ```sh
   pnpm --filter @calwise/food-api exec wrangler d1 execute calwise-food --remote \
     --command='SELECT count(*) AS products FROM products'
   curl --fail 'https://calwise-api.lastlab.win/foods/search?q=ser&limit=2'
   ```

Until the import runs, search returns an empty array. No production resources are created by local migration commands. Production provisioning and import are explicit operator steps, not scheduled jobs.

## Verification

`pnpm test` covers validation and the HTTP forwarding boundary. `python3 -B -m unittest discover -s tools/open-food-facts -v` checks extraction and real SQLite FTS migrations, upserts, escaping, and index updates. `CI=true pnpm e2e` starts both Workers, imports a synthetic product into separate `.wrangler/e2e-state` storage, and exercises search and barcode lookup through the service binding and D1. It also runs the existing web tests.
