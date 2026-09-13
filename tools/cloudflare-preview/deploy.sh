#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || ! $1 =~ ^[0-9]+$ || ! $2 =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: deploy.sh <pull-request-number> <commit-sha>" >&2
  exit 2
fi

pr_number=$1
commit_sha=$2
alias="pr-${pr_number}"
user_database="calwise-${alias}"
food_database="calwise-food-${alias}"
root=$(cd "$(dirname "$0")/../.." && pwd)
config="$root/apps/api/wrangler.preview-${pr_number}.json"
secrets_file=$(mktemp)
upload_log=$(mktemp)
trap 'rm -f "$config" "$secrets_file" "$upload_log"' EXIT

wrangler() {
  pnpm --dir "$root" --filter @calwise/api exec wrangler "$@"
}

database_id() {
  local name=$1
  wrangler d1 list --json | jq -er --arg name "$name" 'first(.[] | select(.name == $name) | .uuid)'
}

ensure_database() {
  local name=$1
  local id
  if id=$(database_id "$name"); then
    printf '%s' "$id"
    return
  fi

  wrangler d1 create "$name" --location weur >/dev/null
  database_id "$name"
}

user_database_id=$(ensure_database "$user_database")
food_database_id=$(ensure_database "$food_database")

jq -n \
  --arg user_name "$user_database" \
  --arg user_id "$user_database_id" \
  --arg food_name "$food_database" \
  --arg food_id "$food_database_id" \
  '{
    "$schema": "../../node_modules/wrangler/config-schema.json",
    name: "calwise-api",
    main: "src/worker.ts",
    compatibility_date: "2026-08-25",
    workers_dev: false,
    preview_urls: true,
    observability: { enabled: false },
    d1_databases: [
      {
        binding: "FOOD_DB",
        database_name: $food_name,
        database_id: $food_id,
        migrations_dir: "../../packages/database/migrations-food",
        migrations_pattern: "../../packages/database/migrations-food/*/migration.sql"
      },
      {
        binding: "DB",
        database_name: $user_name,
        database_id: $user_id,
        migrations_dir: "../../packages/database/migrations",
        migrations_pattern: "../../packages/database/migrations/*/migration.sql"
      }
    ]
  }' >"$config"

wrangler d1 migrations apply "$user_database" --remote --config "$config"
wrangler d1 migrations apply "$food_database" --remote --config "$config"
wrangler d1 execute "$food_database" --remote --config "$config" \
  --file "$root/tools/cloudflare-preview/food-fixtures.sql"

# A stable repository secret becomes a stable, PR-specific signing key. Existing
# preview sessions survive updates, while production and other PRs use other keys.
printf '%s:%s' "$PREVIEW_BETTER_AUTH_SECRET" "$pr_number" \
  | openssl dgst -sha256 -binary \
  | base64 \
  | jq -Rs '{BETTER_AUTH_SECRET: rtrimstr("\n")}' >"$secrets_file"
chmod 600 "$secrets_file"

wrangler versions upload \
  --config "$config" \
  --preview-alias "$alias" \
  --message "PR #${pr_number} at ${commit_sha}" \
  --secrets-file "$secrets_file" 2>&1 | tee "$upload_log"

api_url=$(grep -Eo 'https://[a-zA-Z0-9.-]+\.workers\.dev' "$upload_log" \
  | grep -E "^https://${alias}-calwise-api\." \
  | tail -1 || true)
if [[ -z $api_url ]]; then
  echo "Wrangler did not report the expected aliased Worker preview URL" >&2
  exit 1
fi

node "$root/tools/cloudflare-preview/write-proxy.mjs" "$api_url" "$root/apps/web/dist/_worker.js"
pages_output=$(pnpm --dir "$root" --filter @calwise/web exec wrangler pages deploy dist \
  --project-name calwise \
  --branch "$alias" \
  --commit-hash "$commit_sha" 2>&1)
printf '%s\n' "$pages_output"

web_url="https://${alias}.calwise.pages.dev"
curl --fail --silent --show-error --retry 5 --retry-delay 5 --retry-all-errors \
  "$web_url/health" >/dev/null

if [[ -n ${GITHUB_OUTPUT:-} ]]; then
  printf 'api_url=%s\nweb_url=%s\n' "$api_url" "$web_url" >>"$GITHUB_OUTPUT"
fi
