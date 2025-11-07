#!/bin/bash
set -e

# TenantFlow Migration Helper
# Simplifies the migration workflow to prevent sync issues

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔍 Checking migration status..."

# Function to apply migration via MCP
apply_via_mcp() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)

    echo "📝 Applying $migration_name via Supabase MCP..."

    # Use the Supabase MCP tool to apply the migration
    # This bypasses CLI connectivity issues
    doppler run -- pnpm exec supabase-mcp apply-migration "$migration_file"
}

# Check for unapplied migrations
UNAPPLIED=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)

if [ "$UNAPPLIED" -eq 0 ]; then
    echo "✅ No new migrations to apply"
    exit 0
fi

echo "📦 Found $UNAPPLIED migration file(s)"

# Try standard push first
echo "🚀 Attempting standard migration push..."
if doppler run -- supabase db push 2>&1 | grep -q "successfully"; then
    echo "✅ Migrations applied successfully via CLI"

    # Update TypeScript types
    echo "🔄 Updating TypeScript types..."
    pnpm update-supabase-types

    echo "✅ Migration complete!"
    exit 0
fi

echo "⚠️  Standard push failed. This usually happens due to:"
echo "   - Migration history mismatch"
echo "   - Database connectivity issues"
echo "   - Type errors in migrations"
echo ""
echo "💡 Recommended workflow:"
echo "   1. Use Supabase MCP server: mcp__supabase__apply_migration"
echo "   2. Then run: pnpm update-supabase-types"
echo "   3. Commit the migration files and updated types"
echo ""
echo "📚 See CLAUDE.md ## Database Migrations for details"

exit 1
