#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! $1 =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: deploy.sh <commit-sha>" >&2
  exit 2
fi
if [[ -z ${BETTER_AUTH_SECRET:-} ]]; then
  echo "BETTER_AUTH_SECRET must be set" >&2
  exit 2
fi

commit_sha=$1
root=$(cd "$(dirname "$0")/../.." && pwd)
umask 077
secrets_file=$(mktemp)
trap 'rm -f "$secrets_file"' EXIT

node -e '
  const { writeFileSync } = require("node:fs");
  writeFileSync(process.argv[1], JSON.stringify({ BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET }));
' "$secrets_file"
unset BETTER_AUTH_SECRET

# Wrangler uploads this checkout's code, production config, bindings, and secret
# as one version, then deploys the ID returned by that upload. A PR version that
# is uploaded concurrently cannot become the production deployment.
pnpm --dir "$root" --filter @calwise/api exec wrangler deploy \
  --config "$root/apps/api/wrangler.jsonc" \
  --secrets-file "$secrets_file" \
  --message "Production at ${commit_sha}"
