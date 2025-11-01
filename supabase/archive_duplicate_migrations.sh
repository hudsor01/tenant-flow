#!/bin/bash
set -e

echo "🗄️ Migration Cleanup - Step 2: Archive Duplicate Migrations"
echo "============================================================="
echo ""
echo "Analysis Results:"
echo "- Group 1 (20251024000005): Keep NEWER Oct 31 file (more comprehensive)"
echo "- Group 2 (20251024000006): Keep LARGER 4.1KB file (more complete)"
echo "- Group 3 (20251024000007): Keep LARGER 1.6KB file (more complete)"
echo ""
echo "SAFETY: These duplicates have same timestamp, so Supabase could only"
echo "        apply ONE of them. We're archiving the less comprehensive version."
echo ""

# Confirm
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd "$(dirname "$0")/migrations"

# Ensure archive directory exists
mkdir -p ../archive/duplicates

echo ""
echo "📦 Archiving duplicate migrations..."
echo ""

# Group 1: 20251024000005 - Keep Oct 31 (newer, more comprehensive)
echo "Group 1: RLS Performance (20251024000005)"
if [ -f "20251024000005_fix_rls_performance_issues.sql" ]; then
    mv -v 20251024000005_fix_rls_performance_issues.sql \
        ../archive/duplicates/20251024000005_fix_rls_performance_issues.sql.OLDER
    echo "  ✓ Archived OLDER version (Oct 27, 11KB)"
    echo "  ✓ Kept: 20251024000005_optimize_rls_policies_performance.sql (Oct 31, 9KB)"
    echo "  → Reason: Oct 31 version is more comprehensive (auth.uid() + duplicate removal)"
fi

echo ""

# Group 2: 20251024000006 - Keep larger file (more complete)
echo "Group 2: RLS Auth UID (20251024000006)"
if [ -f "20251024000006_fix_remaining_rls_performance_issues.sql" ] && \
   [ -f "20251024000006_fix_rls_auth_uid_performance.sql" ]; then

    # Check which is larger
    size1=$(wc -c < "20251024000006_fix_remaining_rls_performance_issues.sql")
    size2=$(wc -c < "20251024000006_fix_rls_auth_uid_performance.sql")

    if [ $size2 -gt $size1 ]; then
        mv -v 20251024000006_fix_remaining_rls_performance_issues.sql \
            ../archive/duplicates/20251024000006_fix_remaining_rls_performance_issues.sql.SMALLER
        echo "  ✓ Archived SMALLER version (2.7KB)"
        echo "  ✓ Kept: 20251024000006_fix_rls_auth_uid_performance.sql (4.1KB)"
        echo "  → Reason: Larger file likely has more complete fixes"
    else
        mv -v 20251024000006_fix_rls_auth_uid_performance.sql \
            ../archive/duplicates/20251024000006_fix_rls_auth_uid_performance.sql.SMALLER
        echo "  ✓ Archived SMALLER version (4.1KB)"
        echo "  ✓ Kept: 20251024000006_fix_remaining_rls_performance_issues.sql (2.7KB)"
        echo "  → Reason: Larger file likely has more complete fixes"
    fi
fi

echo ""

# Group 3: 20251024000007 - Keep larger file (more complete)
echo "Group 3: RLS Profiles (20251024000007)"
if [ -f "20251024000007_fix_profiles_rls_performance.sql" ] && \
   [ -f "20251024000007_fix_service_role_duplicate_policies.sql" ]; then

    # Check which is larger
    size1=$(wc -c < "20251024000007_fix_profiles_rls_performance.sql")
    size2=$(wc -c < "20251024000007_fix_service_role_duplicate_policies.sql")

    if [ $size1 -gt $size2 ]; then
        mv -v 20251024000007_fix_service_role_duplicate_policies.sql \
            ../archive/duplicates/20251024000007_fix_service_role_duplicate_policies.sql.SMALLER
        echo "  ✓ Archived SMALLER version (828B)"
        echo "  ✓ Kept: 20251024000007_fix_profiles_rls_performance.sql (1.6KB)"
        echo "  → Reason: Larger file likely has more complete fixes"
    else
        mv -v 20251024000007_fix_profiles_rls_performance.sql \
            ../archive/duplicates/20251024000007_fix_profiles_rls_performance.sql.SMALLER
        echo "  ✓ Archived SMALLER version (1.6KB)"
        echo "  ✓ Kept: 20251024000007_fix_service_role_duplicate_policies.sql (828B)"
        echo "  → Reason: Larger file likely has more complete fixes"
    fi
fi

echo ""
echo "✅ Step 2 Complete!"
echo ""
echo "Summary:"
echo "- Archived 3 duplicate migration files"
echo "- Kept the most comprehensive version of each"
echo "- All archived files moved to ../archive/duplicates/"
echo ""
echo "File count before: 140"
echo "File count now:   $(ls -1 *.sql 2>/dev/null | wc -l)"
echo ""
echo "Next Steps:"
echo "1. Verify migration folder is clean"
echo "2. Continue with security audit (tenants.service.ts)"
echo "3. Plan Q1 2026 consolidation"
