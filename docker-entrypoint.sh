#!/bin/sh
set -e

echo "Starting POS Application..."

# Initialize database if it doesn't exist
if [ ! -f /app/data/db/local.db ]; then
  echo "Database not found. Initializing database..."
  tsx scripts/init-db.ts || echo "Database initialization completed or already exists"
else
  echo "Database found. Skipping initialization."
fi

# Start the application
echo "Starting Next.js server..."
exec node server.js

