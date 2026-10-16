#!/usr/bin/env sh
# Fetch the live Conservative States Partner API OpenAPI document.
# Always generate clients and check field names against this, never a cached copy.
#
#   scripts/fetch-openapi.sh [output-file]
#
# The document is public (no key needed). Override the origin with CS_ORIGIN.
set -eu
ORIGIN="${CS_ORIGIN:-https://my.conservativestates.app}"
OUT="${1:-openapi.json}"
curl -fsSL -H 'Accept: application/json' "$ORIGIN/api/partner/v1/openapi.json" -o "$OUT"
echo "Saved $OUT from $ORIGIN/api/partner/v1/openapi.json"
