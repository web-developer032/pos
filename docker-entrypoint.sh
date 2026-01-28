#!/bin/sh
set -e

echo "Starting POS Application..."

# Run Prisma migrations (DATABASE_URL must be set)
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy || true
  echo "Migrations complete."
fi

# Start the application (seed runs via instrumentation on first request if needed)
echo "Starting Next.js server..."
exec node server.js
