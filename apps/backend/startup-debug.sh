#!/bin/bash
# Startup debug script for Railway

echo "=== STARTUP DEBUG ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "Environment: NODE_ENV=$NODE_ENV, PORT=$PORT"
echo "Database URL exists: ${DATABASE_URL:+yes}"
echo "Supabase URL exists: ${SUPABASE_URL:+yes}"
echo "JWT Secret exists: ${JWT_SECRET:+yes}"

echo "=== Directory structure ==="
ls -la

echo "=== Checking dist folder ==="
ls -la dist/

echo "=== Testing database connection ==="
node -e "
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set!');
  process.exit(1);
}
console.log('Database URL format looks valid');
"

echo "=== Starting server with verbose logging ==="
exec node dist/main.js