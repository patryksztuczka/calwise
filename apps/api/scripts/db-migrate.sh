#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
for database in calwise calwise-food; do
  wrangler d1 migrations apply "$database" "$@"
done
