# Supabase Migration Strategy

## Migration Lifecycle

### Do You Need to Keep Migrations Forever?

**Short Answer: No, but with caveats.**

### Current State
- **26 RLS-related migrations** over 10 months
- Many are incremental fixes to the same issues
- Some have overlapping/duplicate functionality
- **Total: ~100+ migration files**

### Long-Term Strategy

#### What to Keep
✅ **Keep these migrations** (applied and critical):
- Initial schema creation
- Core RLS policies (`20250832_fix_all_rls_vulnerabilities.sql`)
- Active feature migrations (last 3 months)
- Compliance-related changes (audit, retention)

#### What Can Be Consolidated
🔄 **Can consolidate** (after all environments are synchronized):
- Incremental RLS fixes → Single canonical RLS state
- Performance optimizations → Current optimized state
- Bug fixes → Final working version
- Duplicate migrations (same date/time)

#### What to Archive
📦 **Can archive** (move to `/archive/` folder):
- Failed experiments
- Reverted changes
- Historical context migrations
- Pre-production migrations (if never deployed)

### Consolidation Process

#### Phase 1: Document Current State (Now)
```bash
# Generate current schema as baseline
doppler run -- supabase db dump --schema public > supabase/schema_baseline_20251031.sql

# This becomes your "truth" - all migrations led to this
```

#### Phase 2: Verify All Environments Match
```bash
# Production
doppler run -- psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 10"

# Staging
# Dev
# Local
```

#### Phase 3: Create Consolidated Migration (Future)
Once all environments are at the same version:

```sql
-- supabase/migrations/20260101_consolidated_baseline.sql
-- This migration represents the consolidated state of all migrations
-- up to 2025-12-31. Previous migrations are archived for reference.
--
-- To recreate from scratch:
-- 1. Apply this consolidated migration
-- 2. You now have the complete schema state
--
-- Historical migrations are in /archive/ for reference only

-- (Complete schema definition here)
```

#### Phase 4: Archive Old Migrations
```bash
mkdir -p supabase/migrations/archive/2025
mv supabase/migrations/202501*.sql supabase/migrations/archive/2025/
mv supabase/migrations/202502*.sql supabase/migrations/archive/2025/
# etc...

# Keep only:
# - 20260101_consolidated_baseline.sql
# - Any migrations after consolidation
```

### Best Practices Going Forward

#### 1. Migration Naming Convention
```bash
# ✅ Good (descriptive, single purpose)
20251101_add_property_images_table.sql
20251102_fix_property_ownerId_column.sql

# ❌ Bad (vague, multiple purposes)
20251101_various_fixes.sql
20251102_update_stuff.sql
```

#### 2. One Purpose Per Migration
```sql
-- ✅ Good
-- Fix: Correct property.userId → property.ownerId in analytics functions

-- ❌ Bad
-- Various security fixes and performance improvements
```

#### 3. Include Rollback Instructions
```sql
-- ============================================================================
-- Migration: Add property_images table
-- Rollback: DROP TABLE property_images CASCADE;
-- ============================================================================
```

#### 4. Test Before Applying
```bash
# Local test
doppler run -- supabase db reset
doppler run -- supabase db push

# Verify
doppler run -- psql $DIRECT_URL -c "SELECT * FROM property_images LIMIT 1"
```

### When to Consolidate

**Consolidate when:**
- ✅ All environments are synchronized
- ✅ No pending migrations in any environment
- ✅ You have a complete backup
- ✅ You've tested the consolidated migration locally
- ✅ It's been >6 months since last consolidation

**Don't consolidate when:**
- ❌ Environments are out of sync
- ❌ Active feature branches with migrations
- ❌ Recent production incidents
- ❌ During high-traffic periods

### Current RLS Security State (2025-10-31)

#### Core RLS Policies
All tables have proper RLS policies enforcing multi-tenant isolation:

```sql
-- Property table (canonical example)
CREATE POLICY "Users can only access their own properties"
ON "property"
AS PERMISSIVE FOR ALL TO authenticated
USING ("ownerId" = auth.uid()::text)
WITH CHECK ("ownerId" = auth.uid()::text);
```

#### Application Layer
- ✅ **Services use `getUserClient(token)`** - Respects RLS
- ❌ **Deprecated: `getAdminClient()`** - Bypasses RLS (ESLint error)
- ✅ **RPC functions** - Use SECURITY DEFINER but still check ownership

#### Known Issues Fixed
- ✅ Property service RLS bypass → Fixed 2025-10-31
- ✅ Incorrect `property.userId` references → Fixed 2025-10-31
- ✅ ESLint rule prevents future bypasses → Added 2025-10-31

### Migration File Size Concerns

**Current size:** ~100 migration files
**Recommended max:** ~50-100 before consolidation
**Your action:** Consider consolidation in Q1 2026

**Why it matters:**
- ⚠️ Slower CI/CD (applies all migrations sequentially)
- ⚠️ Harder to understand schema evolution
- ⚠️ Increased risk of migration conflicts
- ⚠️ Longer reset times in development

**Why it's OK for now:**
- ✅ Supabase handles migrations efficiently
- ✅ Only applies new migrations (tracks applied ones)
- ✅ Historical context is valuable
- ✅ No performance impact on production

### Immediate Actions (2025-10-31)

1. ✅ **Applied:** Fix broken analytics functions
2. ✅ **Applied:** ESLint rule to prevent RLS bypasses
3. 📋 **Next:** Document RLS patterns in CLAUDE.md
4. 📋 **Next:** Add automated RLS tests
5. 📋 **Next:** Plan Q1 2026 consolidation

### Resources

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/managing-environments)
- [Database Branching](https://supabase.com/docs/guides/cli/branching)
- [Schema Diffs](https://supabase.com/docs/reference/cli/supabase-db-diff)

### FAQ

**Q: Can I delete old migrations?**
A: Not directly. Supabase tracks which migrations have been applied. Deleting them breaks this tracking. Instead, consolidate after all environments are synchronized.

**Q: What if I mess up consolidation?**
A: This is why you test locally first and keep backups. Never consolidate in production directly.

**Q: How often should I consolidate?**
A: Every 6-12 months, or when you hit ~100 migrations.

**Q: Do consolidated migrations run faster?**
A: No. They're faster to understand, but runtime is the same (only unapplied migrations run).

**Q: What about production databases?**
A: They already have all migrations applied. Consolidation only affects fresh installs and local development.

---

**Last Updated:** 2025-10-31
**Next Review:** 2026-01-01 (Q1 consolidation planning)
