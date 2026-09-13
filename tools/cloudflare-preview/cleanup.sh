#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! $1 =~ ^[0-9]+$ ]]; then
  echo "usage: cleanup.sh <pull-request-number>" >&2
  exit 2
fi

pr_number=$1
root=$(cd "$(dirname "$0")/../.." && pwd)

wrangler() {
  pnpm --dir "$root" --filter @calwise/api exec wrangler "$@"
}

delete_if_present() {
  local name=$1
  if wrangler d1 list --json | jq -e --arg name "$name" 'any(.[]; .name == $name)' >/dev/null; then
    wrangler d1 delete "$name" --skip-confirmation
  fi
}

delete_if_present "calwise-pr-${pr_number}"
delete_if_present "calwise-food-pr-${pr_number}"
