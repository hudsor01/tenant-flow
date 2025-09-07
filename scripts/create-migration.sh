#!/bin/bash

# Create a new Supabase migration with proper timestamp
# Usage: ./scripts/create-migration.sh "migration_name" [sql_content_file]

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <migration_name> [sql_content_file]"
    echo "Example: $0 'add_user_preferences_table'"
    echo "Example: $0 'add_user_preferences_table' migration.sql"
    exit 1
fi

MIGRATION_NAME="$1"
SQL_CONTENT_FILE="$2"

# Generate unique timestamp (YYYYMMDDHHMMSS format)
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")

# Create migration filename
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_${MIGRATION_NAME}.sql"

# Ensure migrations directory exists
mkdir -p supabase/migrations

if [ -n "$SQL_CONTENT_FILE" ] && [ -f "$SQL_CONTENT_FILE" ]; then
    # Use provided SQL file content
    cp "$SQL_CONTENT_FILE" "$MIGRATION_FILE"
    echo "Created migration: $MIGRATION_FILE (from $SQL_CONTENT_FILE)"
else
    # Create empty migration template
    cat > "$MIGRATION_FILE" << EOF
-- Migration: $MIGRATION_NAME
-- Created: $(date -u)
-- Description: Add your migration description here

-- Add your SQL statements here
-- Example:
-- CREATE TABLE IF NOT EXISTS "example" (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

EOF
    echo "Created empty migration template: $MIGRATION_FILE"
fi

echo "You can now edit the migration file and run:"
echo "  supabase db push"
echo "or use the MCP server:"
echo "  mcp__supabase__apply_migration with project_id and the SQL content"