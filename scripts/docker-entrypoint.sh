#!/bin/sh
set -e
mkdir -p /app/data
node scripts/upsert-admin.mjs || true
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
