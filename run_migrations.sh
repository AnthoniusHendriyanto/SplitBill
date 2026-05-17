#!/bin/bash
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  # export only actual non-empty, non-comment key-value pairs
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
echo "Target Database: ${DB_NAME}"
echo "Target Host:     ${DB_HOST}:${DB_PORT}"
echo "Database User:   ${DB_USER}"
echo "=================================================="

# Set PGPASSWORD so psql doesn't prompt for password
export PGPASSWORD=$DB_PASS

# Run each migration file in alphabetical/numerical order
for file in $(ls migrations/*.sql | sort); do
  echo "Applying: $file ..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
  echo "Success!"
  echo "--------------------------------------------------"
done

echo "🎉 All migrations applied successfully!"
