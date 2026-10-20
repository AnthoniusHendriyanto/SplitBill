#!/bin/bash
set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-splitmate}

echo "=================================================="
echo "SplitMate Database Migration Runner"
echo "=================================================="
if [ -n "$DATABASE_URL" ]; then
  echo "Target:          DATABASE_URL (DB_* fields ignored)"
  PSQL_TARGET=("$DATABASE_URL")
else
  echo "Target Database: ${DB_NAME}"
  echo "Target Host:     ${DB_HOST}:${DB_PORT}"
  echo "Database User:   ${DB_USER}"
  export PGPASSWORD=$DB_PASS
  PSQL_TARGET=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME")
fi
echo "=================================================="

# Create migration tracking table (idempotent)
psql -q "${PSQL_TARGET[@]}" -c "
CREATE TABLE IF NOT EXISTS _migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
"

for file in $(ls migrations/*.sql | sort); do
  name=$(basename "$file")
  already_applied=$(psql -q "${PSQL_TARGET[@]}" -tAc "SELECT 1 FROM _migrations WHERE name = '$name'")
  if [ "$already_applied" = "1" ]; then
    echo "Skipping $name (already applied)"
    continue
  fi
  echo "Applying: $name ..."
  psql -q "${PSQL_TARGET[@]}" --set ON_ERROR_STOP=on -f "$file"
  psql -q "${PSQL_TARGET[@]}" -c "INSERT INTO _migrations (name) VALUES ('$name') ON CONFLICT DO NOTHING"
  echo "Success!"
  echo "--------------------------------------------------"
done

echo "All migrations applied successfully!"
