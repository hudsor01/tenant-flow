#!/bin/bash
set -e

echo "🧹 Migration Cleanup - Step 1: Move Non-Migration Files"
echo "========================================================"
echo ""
echo "This script moves non-migration files out of migrations/"
echo "- Backups → ../backups/"
echo "- Tests → ../tests/"
echo "- Docs → ../docs/"
echo "- Archive → ../archive/"
echo ""

# Confirm
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd "$(dirname "$0")/migrations"

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p ../backups ../tests ../docs ../archive/superseded ../archive/duplicates

# Move backup files
echo "📦 Moving backup files..."
if [ -f "supabase_backup_rls_policies.sql" ]; then
    mv -v supabase_backup_rls_policies.sql ../backups/
fi
if [ -f "supabase_backup_schema.sql" ]; then
    mv -v supabase_backup_schema.sql ../backups/
fi

# Move test files
echo "🧪 Moving test files..."
if [ -f "test-rls-security.sql" ]; then
    mv -v test-rls-security.sql ../tests/
fi
if [ -f "20251012_cleanup_test_users.sql" ]; then
    mv -v 20251012_cleanup_test_users.sql ../tests/
fi

# Move documentation files
echo "📄 Moving documentation files..."
if [ -f "auth-rpc-design.sql" ]; then
    mv -v auth-rpc-design.sql ../docs/
fi
if [ -f "auth-management.sql" ]; then
    mv -v auth-management.sql ../docs/
fi

# Move obviously superseded files
echo "🗄️ Archiving superseded files..."
if [ -f "rls-security-fix.sql" ]; then
    mv -v rls-security-fix.sql ../archive/superseded/
    echo "  → Superseded by 20250832_fix_all_rls_vulnerabilities.sql"
fi
if [ -f "supabase-rpc-functions.sql" ]; then
    mv -v supabase-rpc-functions.sql ../archive/superseded/
    echo "  → Superseded by multiple 2025 RPC migrations"
fi

# Move backups folder if it exists
if [ -d "backups" ]; then
    echo "📦 Moving backups/ folder contents..."
    if [ "$(ls -A backups)" ]; then
        mv -v backups/* ../backups/ 2>/dev/null || true
    fi
    rmdir backups && echo "  → Removed empty backups/ folder"
fi

echo ""
echo "✅ Step 1 Complete!"
echo ""
echo "Summary:"
echo "- Moved ~6-8 non-migration files"
echo "- Created organized folder structure"
echo "- migrations/ now contains ONLY migration files"
echo ""
echo "Next Steps:"
echo "1. Review MIGRATION_CLEANUP_PLAN.md"
echo "2. Check production DB for duplicate migrations (Step 2)"
echo "3. Continue with security audit (tenants.service.ts)"
echo ""
echo "File count before: 148"
echo "File count now:   $(ls -1 *.sql 2>/dev/null | wc -l)"
