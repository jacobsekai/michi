#!/bin/sh
# Deploys the transfer-key sync worker to Cloudflare and points the app at it.
# Prereq (once): npx wrangler login
set -e
cd "$(dirname "$0")/../worker"
if grep -q REPLACE_WITH_KV_ID wrangler.toml; then
  id=$(npx --yes wrangler kv namespace create SLOTS 2>&1 | sed -n 's/.*"id": *"\([0-9a-f]*\)".*/\1/p; s/.*id = "\([0-9a-f]*\)".*/\1/p' | head -1)
  [ -n "$id" ] || { echo "Could not create KV namespace"; exit 1; }
  sed -i '' "s/REPLACE_WITH_KV_ID/$id/" wrangler.toml
fi
out=$(npx --yes wrangler deploy 2>&1) || { echo "$out"; exit 1; }
echo "$out" | tail -5
url=$(echo "$out" | grep -o 'https://[a-z0-9.-]*workers\.dev' | head -1)
[ -n "$url" ] || { echo "Deployed, but could not find the workers.dev URL above"; exit 1; }
sed -i '' "s|https://michi-sync[^']*|$url|" ../js/config.js
echo "SYNC_URL set to $url"
