---
phase: 27-production-seed-data
plan: 01
type: summary
---

# Summary: Three-Tier Seed Data System

## Outcome: SUCCESS

All tasks completed successfully. Created a modular three-tier seed data system with idempotent SQL, helper functions, and verification scripts.

## What Was Built

### 1. Seed Data Structure (`supabase/seeds/`)

| File | Purpose | Data Volume |
|------|---------|-------------|
| `seed-common.sql` | Helper functions, version tracking | Shared infrastructure |
| `seed-smoke.sql` | CI fast (<5s) | 2 owners, 2 tenants, 4 properties, 8 units |
| `seed-development.sql` | Realistic local dev | 10 owners, 50 tenants, ~100 properties, ~500 units |
| `seed-performance.sql` | Load testing | 100 owners, 500 tenants, 1000+ properties, 50K+ records |

### 2. Helper Functions

- `seed_random_date(months_back)` - Temporal distribution across N months
- `seed_random_choice(choices[])` - Random array element selection
- `seed_random_int(min, max)` - Random integer in range
- `seed_random_decimal(min, max)` - Random decimal with 2 places
- `seed_random_address()` - Realistic street addresses
- `seed_random_phone()` - US phone numbers

### 3. Version Tracking

- `seed_versions` table tracks applied seeds
- Prevents duplicate runs via `ON CONFLICT DO UPDATE`
- Records tier, version, timestamp, and notes

### 4. pnpm Scripts

```bash
pnpm db:seed:smoke   # Fast CI seed
pnpm db:seed:dev     # Development seed
pnpm db:seed:perf    # Performance testing seed
```

### 5. Verification Script

`scripts/verify-seeds.sh [tier]` checks:
- Row count minimums per tier
- Seed version tracking
- Temporal distribution (dev/perf)
- RLS isolation setup (smoke)
- Data integrity (foreign keys)

## Key Decisions

1. **Inline seed.sql** - Main `supabase/seed.sql` contains smoke tier inline (not `\i` include) for compatibility with `supabase start`

2. **Idempotent Design** - All seeds use `ON CONFLICT DO NOTHING/UPDATE` for re-runnability

3. **Isolated Test Data** - Smoke tier has Owner A and Owner B with completely separate data for RLS testing

4. **Temporal Distribution** - Development/Performance tiers distribute data across 24 months for realistic analytics testing

## Files Changed

| File | Action |
|------|--------|
| `supabase/seeds/seed-common.sql` | Created |
| `supabase/seeds/seed-smoke.sql` | Created |
| `supabase/seeds/seed-development.sql` | Created |
| `supabase/seeds/seed-performance.sql` | Created |
| `supabase/seed.sql` | Replaced with smoke tier |
| `package.json` | Added 3 seed scripts |
| `scripts/verify-seeds.sh` | Created |

## Commit

- `6b09a3ac2` feat(27-01): create three-tier seed data system

## Verification

- [x] All four seed SQL files exist in `supabase/seeds/`
- [x] Each seed file has version tracking
- [x] Package.json has db:seed:smoke, db:seed:dev, db:seed:perf scripts
- [x] supabase/seed.sql updated to use smoke tier
- [x] Verification script exists and is executable
- [x] Pre-commit validation passed (lint, typecheck, tests)

## Next Steps

Phase 27 is complete. Continue to Phase 28: Test Data Factories per the roadmap.
