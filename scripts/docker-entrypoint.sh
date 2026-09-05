#!/bin/sh
set -e
mkdir -p /app/data

# Bootstrap DB + super admin on first boot / every deploy
if [ ! -f /app/data/nexora.db ]; then
  echo "Seeding database..."
  npx tsx scripts/seed.ts || node --import tsx scripts/seed.ts || true
fi

node scripts/upsert-admin.mjs || true
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
