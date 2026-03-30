---
phase: 26-database-stabilization
verified: 2026-03-30T22:00:00Z
status: gaps_found
score: 3/4 success criteria verified
gaps:
  - truth: "No client-side 7-day expiry calculation exists in any INSERT path"
    status: partial
    reason: "selection-step-filters.tsx (InlineTenantInvite) still computes and passes expires_at on INSERT — this code path was not in plan scope but is a real INSERT path that circumvents the DB-04 server-side default"
    artifacts:
      - path: "src/components/leases/wizard/selection-step-filters.tsx"
        issue: "Lines 46 and 56: computes expiresAt client-side and passes expires_at in .insert() payload"
    missing:
      - "Remove expiresAt variable (line 46) from selection-step-filters.tsx"
      - "Remove expires_at: expiresAt from .insert() payload (line 56) in selection-step-filters.tsx"
human_verification:
  - test: "Apply migration to live database and confirm a new invitation row has expires_at auto-set without any client value"
    expected: "Row appears with expires_at = NOW() + 7 days, set by Postgres, not the client"
    why_human: "Migration has not been pushed to live DB yet (supabase db push pending); cannot verify DB DEFAULT behavior without running against live Supabase"
  - test: "Attempt to insert two pending invitations for the same email+owner via dashboard"
    expected: "Second insert is rejected by the unique index with a uniqueness violation error"
    why_human: "Duplicate enforcement relies on the unique index from the migration being applied; can only be confirmed against live DB"
---

# Phase 26: Database Stabilization Verification Report

**Phase Goal:** The tenant_invitations table is correct, safe, and self-managing -- no bad data can enter, no duplicate active invitations can exist, and expiry is handled server-side
**Verified:** 2026-03-30T22:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from Plan 01 and Plan 02 must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Rows with type='portal_access' are updated to 'platform_access' before any constraint touches them | ✓ VERIFIED | Migration step 1: `update public.tenant_invitations set type = 'platform_access' where type = 'portal_access'` (line 17-18) |
| 2 | All 4 RLS policies on tenant_invitations reference owner_user_id, not property_owner_id | ✓ VERIFIED | 5 stale policies dropped IF EXISTS; 4 new policies created with `owner_user_id = (select auth.uid())` — no `property_owner_id` appears in new policy bodies |
| 3 | SELECT policy allows both owner (by owner_user_id) and invitee (by email) access | ✓ VERIFIED | `using (owner_user_id = (select auth.uid()) or email = (select auth.email()))` (lines 49-52) |
| 4 | Duplicate active invitations per (email, owner_user_id) are cancelled, keeping only the newest | ✓ VERIFIED | DO block with ranked CTE cancels all rn > 1 rows; RAISE NOTICE logs each cancelled row |
| 5 | A partial unique index on (email, owner_user_id) WHERE status IN ('pending','sent') exists | ✓ VERIFIED | `create unique index if not exists idx_tenant_invitations_active_email_owner on public.tenant_invitations (email, owner_user_id) where status in ('pending', 'sent')` (lines 120-122) |
| 6 | expires_at column has DEFAULT NOW() + INTERVAL '7 days' | ✓ VERIFIED | `alter column expires_at set default now() + interval '7 days'` (line 134) |
| 7 | Stale index idx_tenant_invitations_property_owner_id is replaced with idx_tenant_invitations_owner_user_id | ✓ VERIFIED | `drop index if exists public.idx_tenant_invitations_property_owner_id` + `create index if not exists idx_tenant_invitations_owner_user_id` (lines 145-148) |
| 8 | invite-tenant-form.tsx inserts type='platform_access', not 'portal_access' | ✓ VERIFIED | Line 74: `type: 'platform_access'` confirmed; zero matches for 'portal_access' in file |
| 9 | invite-tenant-form.tsx does not pass expires_at in the insert payload | ✓ VERIFIED | No `expires_at` in insert payload; no `expiresAt` variable exists in file |
| 10 | onboarding-step-tenant.tsx does not pass expires_at in the insert payload | ✓ VERIFIED | No `expires_at` or `expiresAt` in file; type='platform_access' confirmed on line 54 |
| 11 | tenant-invite-mutation-options.ts invite() does not pass expires_at in the insert payload | ✓ VERIFIED | No `expiresAt` variable in invite(); no `expires_at` in invite() .insert() |
| 12 | tenant-invite-mutation-options.ts resend() still sets expires_at explicitly (UPDATE, not INSERT) | ✓ VERIFIED | `newExpiry` variable preserved in resend(); documenting comment on line 134 present |
| 13 | No client-side 7-day expiry calculation exists in any of the 3 INSERT paths covered by plan scope | ✓ VERIFIED | invite-tenant-form.tsx, onboarding-step-tenant.tsx, and invite() in tenant-invite-mutation-options.ts all clean |
| 14 | No client-side 7-day expiry calculation exists in ANY INSERT path (including out-of-scope paths) | ✗ PARTIAL | selection-step-filters.tsx lines 46+56: `const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` still passed as `expires_at: expiresAt` in .insert() |
| 15 | All existing unit tests pass after the changes | ✓ VERIFIED | SUMMARY 26-02 reports 1,482 unit tests pass; commits are present in git log |

**Score (plan must_haves):** 14/15 truths verified

### Success Criteria (from ROADMAP.md)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| SC1 | Owner can create a tenant invitation from the dashboard without hitting a CHECK constraint error | ✓ VERIFIED | portal_access typo fixed to platform_access in invite-tenant-form.tsx; no 'portal_access' string remains anywhere in src/ |
| SC2 | Owner's PostgREST insert into tenant_invitations succeeds with RLS policies referencing the correct owner_user_id column | ✓ VERIFIED | Migration drops all 5 stale policies, creates 4 new policies using `owner_user_id = (select auth.uid())` with no `property_owner_id` references in policy bodies |
| SC3 | Attempting to create a second active invitation for the same email and owner is rejected by the database | ? HUMAN | Partial unique index `idx_tenant_invitations_active_email_owner` is in migration; enforcement requires migration to be applied to live DB (supabase db push not yet confirmed) |
| SC4 | A newly inserted invitation row has expires_at automatically set to 7 days from now without any client-side date calculation | ✗ PARTIAL | DB DEFAULT is in migration; three of four INSERT paths omit expires_at; BUT selection-step-filters.tsx still passes client-computed expires_at (harmless since DB will prefer the supplied value, but violates the "no client-side date calculation" goal) |

**Score (ROADMAP success criteria):** 2 fully verified, 1 partial, 1 needs human

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260330180000_stabilize_tenant_invitations.sql` | Atomic migration fixing all 4 DB requirements | ✓ VERIFIED | 148 lines (>80 required); all 5 steps present; committed as 76d9eff23 |
| `src/types/supabase.ts` | Regenerated types reflecting expires_at as optional on Insert | ✓ VERIFIED | `expires_at?: string | null` on tenant_invitations Insert type (line 1862); manually edited in commit 5d222d1c6 (migration not yet applied to live DB) |
| `src/components/tenants/invite-tenant-form.tsx` | Fixed invitation form with correct type and no client expires_at | ✓ VERIFIED | `type: 'platform_access'` on line 74; no expiresAt variable; no expires_at in insert payload |
| `src/components/onboarding/onboarding-step-tenant.tsx` | Onboarding tenant step with no client expires_at | ✓ VERIFIED | No expiresAt variable; no expires_at in insert; `type: 'platform_access'` line 54 |
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | Mutation options with no client expires_at on invite(), preserved on resend() | ✓ VERIFIED | invite() insert has no expires_at; resend() update preserves newExpiry with documenting comment |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `supabase/migrations/20260330180000_stabilize_tenant_invitations.sql` | tenant_invitations table | Supabase migration runner | ✓ WIRED | `alter table public.tenant_invitations` present; all 5 steps target tenant_invitations |
| `src/components/tenants/invite-tenant-form.tsx` | tenant_invitations table | PostgREST .insert() | ✓ WIRED | `.from('tenant_invitations').insert({..., type: 'platform_access'})` — no expires_at |
| `src/components/onboarding/onboarding-step-tenant.tsx` | tenant_invitations table | PostgREST .insert() | ✓ WIRED | `.from('tenant_invitations').insert({...})` — no expires_at |
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | tenant_invitations table | PostgREST .insert() in invite() | ✓ WIRED | `.from('tenant_invitations').insert({...})` in invite() — no expires_at |

### Data-Flow Trace (Level 4)

Not applicable for this phase. Phase 26 modifies a migration file and removes client-side computed values from INSERT payloads. No new component rendering dynamic data was created.

### Behavioral Spot-Checks

Step 7b: SKIPPED — migration behavior requires live database; cannot test DB DEFAULT or unique index enforcement without `supabase db push` having been run. Client-side code changes are verified through static analysis above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DB-01 | 26-01, 26-02 | Fix CHECK constraint violation — change 'portal_access' to 'platform_access' in code and backfill any bad rows | ✓ SATISFIED | Migration step 1 backfills DB rows; invite-tenant-form.tsx now inserts 'platform_access'; zero 'portal_access' strings remain in src/ |
| DB-02 | 26-01 | Audit and fix RLS policies on tenant_invitations to reference owner_user_id (not stale property_owner_id) | ✓ SATISFIED | 5 stale policies dropped, 4 new policies created with owner_user_id = (select auth.uid()) |
| DB-03 | 26-01 | Add partial unique index on (email, owner_user_id) WHERE status IN ('pending', 'sent') to prevent duplicate active invitations | ✓ SATISFIED (migration) / ? PENDING (live DB) | idx_tenant_invitations_active_email_owner exists in migration; not yet applied to live DB |
| DB-04 | 26-01, 26-02 | Move invitation expiry calculation to DB default (NOW() + INTERVAL '7 days') instead of client-side | ✓ PARTIAL | DB DEFAULT added in migration; 3/4 INSERT paths in code clean; selection-step-filters.tsx still calculates client-side |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/leases/wizard/selection-step-filters.tsx` | 46, 56 | `const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` passed as `expires_at: expiresAt` in INSERT | ⚠️ Warning | Client-supplied value overrides DB DEFAULT (Postgres prefers explicit value over DEFAULT); defeats server-side expiry goal for this path. Acknowledged as deferred in 26-02-SUMMARY.md. |

No other anti-patterns found in the four primary plan artifacts.

### Human Verification Required

#### 1. Live Database Migration Apply

**Test:** Run `supabase db push` to apply `20260330180000_stabilize_tenant_invitations.sql` to the live database
**Expected:** Migration applies cleanly; duplicate active invitations (if any) are cancelled with RAISE NOTICE output; expires_at column has DEFAULT; all 4 new RLS policies are active
**Why human:** Migration exists as a file but has not been confirmed as applied to the live Supabase project. The types were manually edited (not from `pnpm db:types`), and the SUMMARY explicitly states "Migration from Plan 01 still needs `supabase db push`."

#### 2. Duplicate Rejection Enforcement

**Test:** From the dashboard, invite the same email address twice for the same owner account without cancelling the first
**Expected:** Second insert is rejected with a PostgreSQL uniqueness violation error surfaced by PostgREST (23505)
**Why human:** Requires the migration to be applied to live DB; partial unique index enforcement cannot be verified statically

#### 3. Server-side expires_at Auto-Set

**Test:** Insert a new invitation via the dashboard form (not providing expires_at) and inspect the resulting row in Supabase Studio
**Expected:** Row has expires_at set to approximately NOW() + 7 days, set by Postgres, not the client
**Why human:** Requires live DB with migration applied; cannot verify DEFAULT behavior without executing against Postgres

### Gaps Summary

**One gap blocks full goal achievement:**

The phase goal states "no bad data can enter" and "expiry is handled server-side." Three of four INSERT paths in the codebase now correctly omit `expires_at` from the insert payload, allowing the DB DEFAULT to apply. However, `src/components/leases/wizard/selection-step-filters.tsx` (the `InlineTenantInvite` component used in the lease wizard) still computes `expiresAt` client-side (line 46) and passes it as `expires_at: expiresAt` in its `.insert()` payload (line 56).

This is a known deviation: the 26-02 SUMMARY documents this as a deferred item. The file was explicitly out of plan scope. However, it means the SC4 success criterion ("A newly inserted invitation row has expires_at automatically set to 7 days from now **without any client-side date calculation**") is not fully satisfied — an invitation created from the lease wizard still uses client-side expiry.

The gap does not cause a functional failure today (the DB will use the supplied value, and 7 days is the correct value), but it:
1. Defeats the clock-skew protection goal of DB-04
2. Leaves one INSERT path inconsistent with the others
3. Will need to be resolved in Phase 28 (Consumer Migration) per the deferred items log

**Migration application is also pending:** The migration file is ready and correct, but `supabase db push` has not been confirmed as executed. Until the migration runs, SC2 (RLS), SC3 (duplicate rejection), and SC4 (DB DEFAULT) are code-only fixes that have not taken effect in production.

---

_Verified: 2026-03-30T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
