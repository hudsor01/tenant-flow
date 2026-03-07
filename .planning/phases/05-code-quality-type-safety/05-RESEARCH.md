# Phase 5: Code Quality & Type Safety - Gap Closure Research

**Researched:** 2026-03-05
**Domain:** Hook file splitting, query key factory consolidation, cache invalidation
**Confidence:** HIGH

## Summary

This is a gap closure research targeting 4 specific verified failures from Phase 5 verification (19/23 truths passed). The gaps are: (1) 11 hook files exceeding 300 lines because Plan 04 was never executed, (2) string literal query keys remaining in 10+ component files, (3) page-level delete mutations missing dashboard cache invalidation, and (4) revenue trends RPC not fully deduplicated in report-keys.ts and financial-keys.ts.

All 4 gaps are mechanically straightforward. The codebase already has established patterns for each fix -- query key factories exist in `query-keys/`, mutation splitting has been done for tenant-portal hooks, and dashboard invalidation is used consistently in hook-level mutations. The work is applying existing patterns to files that were missed.

**Primary recommendation:** Execute as a single plan with 4 waves: (1) split 11 oversized hook files using query/mutation separation, (2) replace all string literal query keys with factory references, (3) add dashboard invalidation to page-level delete mutations, (4) wire report-keys.ts and financial-keys.ts to shared revenueTrendsQuery.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Stub hooks -- zero tolerance: All stubs replaced with real implementations (DONE)
- File splitting -- real rewrites with flat domain naming: `use-tenant-mutations.ts` not `use-tenant-portal-mutations.ts`
- Query key consolidation -- align with TanStack Query v5 official guidance: all raw string literal query keys must be replaced
- `'use client'` full audit -- align with Next.js 16 official guidance (DONE)

### Claude's Discretion
- Exact split boundaries within oversized files (based on domain analysis)
- Order of operations for the refactoring (dependencies between tasks)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CODE-11 | Hook files split to stay under 300 lines | Gap 1: 11 files identified with exact line counts and split boundaries |
| CODE-03 | All mutation onSuccess use canonical query key factories | Gap 2: 10+ files with string literals mapped to existing factory references |
| CODE-04 | All entity mutations invalidate ownerDashboardKeys.all | Gap 3: 2 page-level delete mutations identified with exact fix |
| CODE-17 | get_revenue_trends_optimized deduplicated via shared query | Gap 4: 2 files still calling RPC directly instead of using revenueTrendsQuery |
</phase_requirements>

## Gap 1: Hook File Splitting (CODE-11)

### Current State

| File | Lines | Split Strategy | Target Files |
|------|-------|---------------|--------------|
| `use-tenant.ts` | 838 | Queries (lines 73-267) stay, mutations (lines 269-838) move | `use-tenant.ts` (~200) + `use-tenant-mutations.ts` (~570) |
| `use-lease.ts` | 664 | Queries (40-128) stay, mutations (133-664) move | `use-lease.ts` (~130) + `use-lease-mutations.ts` (~490) |
| `use-billing.ts` | 599 | Keys+queries (90-300) stay, mutations+subscription hooks (302-599) move | `use-billing.ts` (~300) + `use-billing-mutations.ts` (~300) |
| `use-payments.ts` | 586 | Keys+queries (64-473) stay, mutations (486-586) move | `use-payments.ts` (~410) + `use-payment-mutations.ts` (~180) |
| `use-profile.ts` | 578 | Keys+queries+detail (40-137) stay, mutations (140-578) move | `use-profile.ts` (~140) + `use-profile-mutations.ts` (~440) |
| `use-auth.ts` | 506 | Keys+queries+cache utils (56-247) stay, mutations (297-506) move | `use-auth.ts` (~250) + `use-auth-mutations.ts` (~260) |
| `use-reports.ts` | 497 | Query hooks (260-317) stay, mutations+download (37-258, 444-497) move | `use-reports.ts` (~200) + `use-report-mutations.ts` (~300) |
| `use-owner-dashboard.ts` | 493 | Keys+queries (41-220) stay, hooks+chart logic (222-493) move | `use-owner-dashboard.ts` (~220) + `use-dashboard-hooks.ts` (~275) |
| `use-inspections.ts` | 482 | Query hooks (34-58) stay, mutations (59-482) move | `use-inspections.ts` (~60) + `use-inspection-mutations.ts` (~425) |
| `use-properties.ts` | 431 | Query hooks (51-165) stay, mutations (167-431) move | `use-properties.ts` (~170) + `use-property-mutations.ts` (~265) |
| `use-financials.ts` | 313 | Query hooks (91-119) stay, expense CRUD (126-313) move | `use-financials.ts` (~120) + `use-expense-mutations.ts` (~195) |

### Splitting Pattern (established in codebase)

The tenant-portal split was already completed successfully using this pattern:
- `use-tenant-portal.ts` (1431 lines) was split into `use-tenant-payments.ts`, `use-tenant-maintenance.ts`, `use-tenant-lease.ts`, `use-tenant-autopay.ts`
- Each file imports query factories from `query-keys/` and re-exports for consumers
- Mutation files import `useQueryClient` and key factories, define `useMutation` hooks

**Split boundary rule:** Query hooks (useQuery wrappers) stay in the base file. Mutation hooks (useMutation wrappers) move to `-mutations` file. Query key factories and queryOptions stay in `query-keys/` files (already extracted for most domains).

### Critical Dependency: Import Path Updates

Every file that imports from a split hook needs its import path updated. Key consumers:

| Split File | Known Importers (check with grep before executing) |
|------------|---------------------------------------------------|
| `use-tenant.ts` | tenants/page.tsx, tenant detail pages, lease-form.tsx |
| `use-lease.ts` | leases/page.tsx, lease detail pages, lease-form.tsx |
| `use-properties.ts` | properties/page.tsx, property detail pages |
| `use-auth.ts` | auth-provider.tsx, login/signup pages, signout page |
| `use-billing.ts` | billing-settings.tsx, subscription pages |
| `use-profile.ts` | general-settings.tsx, profile pages |
| `use-owner-dashboard.ts` | dashboard/page.tsx |
| `use-payments.ts` | payment pages, rent collection pages |

### Special Cases

1. **`use-payments.ts` (586 lines):** The keys+queries section is already ~410 lines. After splitting mutations out, the base file will still be over 300 lines. The query key factories (`rentCollectionKeys`, `rentPaymentKeys`, `paymentVerificationKeys`) and `rentCollectionQueries`/`tenantPaymentQueries` should be extracted to `query-keys/payment-keys.ts` to bring it under 300.

2. **`use-billing.ts` (599 lines):** Contains `billingKeys`, `subscriptionsKeys`, and `billingQueries` inline (not in query-keys/). These should be extracted to `query-keys/billing-keys.ts` first, then mutations split out.

3. **`use-auth.ts` (506 lines):** Contains `authKeys` and `authQueries` inline. The CLAUDE.md rule says "Single auth query key factory: authKeys from src/hooks/api/use-auth.ts. No other key definitions allowed." -- so authKeys MUST stay in use-auth.ts. Only mutations move.

4. **`use-financials.ts` (313 lines):** Only 13 lines over limit. Extracting expense CRUD mutations to `use-expense-mutations.ts` will bring it under.

5. **`use-owner-dashboard.ts` (493 lines):** Contains `ownerDashboardKeys` which is imported by 4+ other hook files for invalidation. Keys must remain importable from same location or re-exported.

### Confidence: HIGH
Based on direct file inspection. Line counts verified. Split boundaries identified from grep of function signatures.

## Gap 2: String Literal Query Keys (CODE-03)

### Files and Fixes

| File | Line(s) | Current | Replace With |
|------|---------|---------|-------------|
| `src/app/(owner)/tenants/page.tsx` | 112 | `queryKey: ['tenants']` | `queryKey: tenantQueries.all()` |
| `src/app/(owner)/properties/page.tsx` | 138 | `queryKey: ['properties']` | `queryKey: propertyQueries.all()` |
| `src/components/leases/lease-form.tsx` | 100 | `queryKey: ['leases']` | `queryKey: leaseQueries.all()` |
| `src/components/leases/lease-form.tsx` | 101 | `queryKey: ['units']` | `queryKey: unitQueries.all()` |
| `src/components/leases/lease-form.tsx` | 102 | `queryKey: ['tenants']` | `queryKey: tenantQueries.all()` |
| `src/components/settings/general-settings.tsx` | 26 | `queryKey: ['user-profile']` | `queryKey: profileKeys.all` |
| `src/components/settings/general-settings.tsx` | 45 | `queryKey: ['company-profile']` | New: `profileKeys.company` or inline with profileKeys extended |
| `src/components/settings/general-settings.tsx` | 95 | `queryKey: ['user-profile']` | `queryKey: profileKeys.all` |
| `src/components/settings/billing-settings.tsx` | 57 | `queryKey: ['payment-methods']` | `queryKey: paymentMethodsKeys.all` |
| `src/hooks/api/use-auth.ts` | 171 | `queryKey: ['auth']` | `queryKey: authKeys.all` |
| `src/providers/auth-provider.tsx` | 60 | `queryKey: ['auth']` | `queryKey: authKeys.all` |
| `src/app/auth/signout/page.tsx` | 26 | `queryKey: ['auth', 'signout-check']` | New: `[...authKeys.all, 'signout-check'] as const` |
| `src/components/leases/wizard/selection-step.tsx` | 84 | `queryKey: ['properties', 'list']` | `queryKey: [...propertyQueries.all(), 'list']` |
| `src/components/leases/wizard/selection-step.tsx` | 103 | `queryKey: ['units', 'by-property', ...]` | `queryKey: [...unitQueries.all(), 'by-property', data.property_id, 'available']` |
| `src/components/leases/wizard/selection-step.tsx` | 124 | `queryKey: ['tenants', 'list', ...]` | `queryKey: [...tenantQueries.all(), 'list', data.property_id]` |
| `src/components/leases/wizard/lease-creation-wizard.tsx` | 108 | `queryKey: ['properties', ...]` | `queryKey: [...propertyQueries.all(), selectionData.property_id]` |
| `src/components/leases/wizard/lease-creation-wizard.tsx` | 123 | `queryKey: ['units', ...]` | `queryKey: [...unitQueries.all(), selectionData.unit_id]` |
| `src/components/leases/wizard/lease-creation-wizard.tsx` | 138 | `queryKey: ['tenants', ...]` | `queryKey: [...tenantQueries.all(), selectionData.primary_tenant_id]` |

### Existing Factories Available

| Factory | Location | `all()` key |
|---------|----------|-----------|
| `propertyQueries` | `query-keys/property-keys.ts` | `['properties']` |
| `tenantQueries` | `query-keys/tenant-keys.ts` | `['tenants']` |
| `leaseQueries` | `query-keys/lease-keys.ts` | `['leases']` |
| `unitQueries` | `query-keys/unit-keys.ts` | `['units']` |
| `authKeys` | `use-auth.ts` | `['auth']` (as `.all`, not `.all()`) |
| `profileKeys` | `use-profile.ts` | `['profile']` (as `.all`, not `.all()`) |
| `paymentMethodsKeys` | `use-payment-methods.ts` | `['payment-methods']` (as `.all`, not `.all()`) |
| `billingKeys` | `use-billing.ts` | `['billing']` (as `.all`, not `.all()`) |

### New Keys Needed

1. **`profileKeys.company`** -- for `['company-profile']` in general-settings.tsx. Add to `profileKeys` in use-profile.ts: `company: () => [...profileKeys.all, 'company'] as const`
2. **`authKeys.signoutCheck`** -- for `['auth', 'signout-check']` in signout/page.tsx. Add to `authKeys`: `signoutCheck: () => [...authKeys.all, 'signout-check'] as const`

### Important: profileKeys.all vs ['user-profile'] Mismatch

The `general-settings.tsx` component uses `['user-profile']` while `profileKeys.all` is `['profile']`. These are DIFFERENT cache keys. Two options:
- (a) **Preferred:** Replace the inline useQuery in general-settings.tsx with `useProfile()` hook from use-profile.ts, which already queries the same data correctly via `profileQueries.detail()`. Then change the invalidation to `profileKeys.all`.
- (b) Add `profileKeys.userProfile` as `['user-profile'] as const` for backward compatibility.

Option (a) is recommended -- it eliminates the duplicate query entirely and aligns with the "use hook, not inline query" pattern.

### Confidence: HIGH
All files inspected directly. Factory references verified against actual exports.

## Gap 3: Dashboard Cache Invalidation (CODE-04)

### Exact Changes

**`src/app/(owner)/tenants/page.tsx` line 110-113:**
```typescript
// BEFORE
onSuccess: () => {
    toast.success('Tenant deleted')
    queryClient.invalidateQueries({ queryKey: ['tenants'] })
},

// AFTER
onSuccess: () => {
    toast.success('Tenant deleted')
    queryClient.invalidateQueries({ queryKey: tenantQueries.all() })
    queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
},
```

**`src/app/(owner)/properties/page.tsx` line 136-139:**
```typescript
// BEFORE
onSuccess: () => {
    toast.success('Property deleted')
    queryClient.invalidateQueries({ queryKey: ['properties'] })
},

// AFTER
onSuccess: () => {
    toast.success('Property deleted')
    queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
    queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
},
```

**Required imports:**
- `tenants/page.tsx`: add `import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'` and `import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'`
- `properties/page.tsx`: add `import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'` and `import { propertyQueries } from '#hooks/api/query-keys/property-keys'`

This also fixes Gap 2 string literals for these two files simultaneously.

### Confidence: HIGH
Direct file inspection. Pattern matches all other mutation hooks in codebase.

## Gap 4: Revenue Trends RPC Deduplication (CODE-17)

### Current State

`analytics-keys.ts` exports `revenueTrendsQuery` which returns raw `Record<string, unknown>`. It is used by:
- `lease-keys.ts` -- imports and uses correctly
- `use-owner-dashboard.ts` -- imports and uses correctly

NOT used by:
- `report-keys.ts` (line 144: direct `supabase.rpc('get_revenue_trends_optimized')`)
- `financial-keys.ts` (line 146: direct `supabase.rpc('get_revenue_trends_optimized')`)

### Problem

Both `report-keys.ts` and `financial-keys.ts` have their own mapping logic that transforms the raw RPC response into domain-specific types (`RevenueData[]` and `MonthlyMetric[]` respectively). The shared `revenueTrendsQuery` returns `Record<string, unknown>` -- so the consumers need to map the raw data after fetching.

### Recommended Solution

Use TanStack Query's `select` option to transform shared query data. This fully deduplicates both key and fetch -- one RPC call, one cache entry, multiple `select` transforms for different domain types:

```typescript
// report-keys.ts
import { revenueTrendsQuery } from './analytics-keys'

monthlyRevenue: (months: number = 12) =>
    queryOptions({
        ...revenueTrendsQuery({ months }),
        // Shared queryKey means shared cache
        select: (raw): RevenueData[] => {
            const rows = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>
            return rows.map((row): RevenueData => ({
                month: String(row.month ?? ''),
                revenue: Number(row.revenue ?? 0),
                expenses: Number(row.expenses ?? 0),
                profit: Number(row.profit ?? row.net_income ?? 0),
                propertyCount: Number(row.property_count ?? 0),
                unitCount: Number(row.unit_count ?? 0),
            }))
        }
    }),
```

Same pattern for `financial-keys.ts` with its `MonthlyMetric` mapper.

### Confidence: HIGH
Direct inspection of all 4 files. The `revenueTrendsQuery` factory already returns the correct raw data shape.

## Architecture Patterns

### Hook File Split Pattern
```
src/hooks/api/
  use-tenant.ts           # Query hooks: useTenant(), useTenantList(), useTenantStats()
  use-tenant-mutations.ts # Mutation hooks: useCreateTenantMutation(), useUpdateTenantMutation(), ...
  query-keys/
    tenant-keys.ts        # tenantQueries factory with queryOptions
```

Mutation file template:
```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { tenantQueries } from './query-keys/tenant-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

export function useCreateTenantMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: CreateTenantInput) => { /* ... */ },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantQueries.all() })
            queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
            toast.success('Tenant created')
        }
    })
}
```

### Query Key Factory Invalidation Pattern
```typescript
// CORRECT: Use factory reference
queryClient.invalidateQueries({ queryKey: tenantQueries.all() })

// WRONG: String literal
queryClient.invalidateQueries({ queryKey: ['tenants'] })
```

Both produce `['tenants']` but the factory is the single source of truth. If the key ever changes, only the factory needs updating.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query key strings | Inline `['tenants']` arrays | `tenantQueries.all()` factory | Single source of truth, refactor-safe |
| Revenue trends data | Direct `supabase.rpc()` in each consumer | `revenueTrendsQuery()` from analytics-keys.ts | Cache deduplication, single fetch |
| Dashboard invalidation | Manual list of keys to invalidate | `ownerDashboardKeys.all` | Already established pattern |

## Common Pitfalls

### Pitfall 1: Import Circular Dependencies After Split
**What goes wrong:** Mutation file imports from query-keys file, which imports from another hook, creating a cycle.
**How to avoid:** Mutation files import only from `query-keys/` files and `use-owner-dashboard.ts` (for dashboard keys). Never import between sibling mutation files.

### Pitfall 2: Breaking Re-exports
**What goes wrong:** A component imports `useCreateTenantMutation` from `use-tenant.ts`, but after splitting it lives in `use-tenant-mutations.ts`.
**How to avoid:** After splitting, grep for all imports of moved functions and update import paths. Do NOT add re-exports from the base file (violates "no barrel files" rule in CLAUDE.md).

### Pitfall 3: profileKeys.all vs ['user-profile'] Cache Key Mismatch
**What goes wrong:** `general-settings.tsx` uses `['user-profile']` but `profileKeys.all` is `['profile']`. Blindly replacing creates a different cache key and the data never loads.
**How to avoid:** Replace the inline useQuery in general-settings.tsx with `useProfile()` from use-profile.ts, which already queries the same data correctly.

### Pitfall 4: revenueTrendsQuery Return Type
**What goes wrong:** The shared query returns `Record<string, unknown>` but the RPC actually returns an array. The select function receives the wrong type.
**How to avoid:** Check the actual RPC return shape at runtime. The shared factory wraps result as `Record<string, unknown>` but the raw data may be `Array<Record<string, unknown>>`. The select function must handle the actual runtime shape with `Array.isArray()` guard.

### Pitfall 5: use-payments.ts Still Over 300 After Mutation Split
**What goes wrong:** Splitting mutations from use-payments.ts only removes ~180 lines, leaving ~410 lines of keys+queries.
**How to avoid:** Extract `rentCollectionKeys`, `rentPaymentKeys`, `paymentVerificationKeys`, `rentCollectionQueries`, and `tenantPaymentQueries` to `query-keys/payment-keys.ts` before splitting mutations.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CODE-11 | All hook files under 300 lines | script | `wc -l src/hooks/api/use-*.ts` (verify all under 300) | N/A (script check) |
| CODE-03 | No string literal query keys | grep | `grep -rn "queryKey: \['" src/app src/components src/providers` | N/A (grep check) |
| CODE-04 | Delete mutations invalidate dashboard | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/` | Partial (test files exist) |
| CODE-17 | Revenue trends single source | grep | `grep -rn "get_revenue_trends_optimized" src/hooks/api/query-keys/` (should only be in analytics-keys.ts) | N/A (grep check) |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm test:unit -- --run`
- **Phase gate:** `pnpm validate:quick`

### Wave 0 Gaps
None -- existing test infrastructure covers basic hook behavior. The primary verification for CODE-11 and CODE-03 is mechanical (line counts and grep), not test-based.

## Sources

### Primary (HIGH confidence)
- Direct file inspection of all 11 oversized hook files (line counts, function signatures, split boundaries)
- Direct file inspection of all 10+ string literal query key files
- Direct inspection of `analytics-keys.ts`, `report-keys.ts`, `financial-keys.ts` for RPC deduplication
- Direct inspection of existing query key factories in `query-keys/` directory (11 files)
- Direct inspection of `use-payment-methods.ts` for `paymentMethodsKeys`

### Secondary (MEDIUM confidence)
- TanStack Query v5 `select` transform pattern for cache-shared queries with different output types

## Metadata

**Confidence breakdown:**
- Hook splitting: HIGH -- all files inspected, split boundaries identified from function signatures
- String literal fixes: HIGH -- all occurrences verified, replacement factories confirmed to exist
- Dashboard invalidation: HIGH -- exact lines identified, pattern established in 4+ other hook files
- Revenue trends dedup: HIGH -- shared factory exists, just needs wiring into 2 remaining consumers

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- internal codebase patterns, not external dependencies)
