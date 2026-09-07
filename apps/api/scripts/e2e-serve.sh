#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
state_dir=".wrangler/e2e-state"
importer_dir="../../tools/open-food-facts"
fixture_sql=".wrangler/food-fixture.sql"

mkdir -p "$state_dir"
pnpm db:migrate:local --persist-to="$state_dir"
python3 -B "$importer_dir/prepare_import.py" "$importer_dir/fixtures/poland.jsonl" "$fixture_sql"
wrangler d1 execute calwise-food --local --persist-to="$state_dir" --file="$fixture_sql"
exec pnpm dev --persist-to="$state_dir"
