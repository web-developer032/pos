#!/bin/sh
set -e

echo "Starting POS Application..."

# Check if container's database already exists
if [ -f /app/data/db/local.db ]; then
  echo "Using existing container database."
else
  # Container database doesn't exist, clone from source
  if [ -f /app/data/db-source/local.db ]; then
    echo "Cloning your local database to container..."
    cp /app/data/db-source/local.db /app/data/db/local.db
    echo "Database cloned successfully. Container will use its own copy."
  elif [ -f /app/data/db-default/local.db ]; then
    echo "Copying default database to container..."
    cp /app/data/db-default/local.db /app/data/db/local.db
    echo "Default database copied successfully."
  else
    echo "No source database found. Initializing new database..."
    tsx scripts/init-db.ts || echo "Database initialization completed or already exists"
  fi
fi

# Start the application
echo "Starting Next.js server..."
exec node server.js

