---
phase: 44-deliverability-funnel-analytics
plan: 03
subsystem: analytics
tags: [admin-ui, funnel-chart, deliverability-table, proxy-gate, defense-in-depth, recharts, rls-test, playwright]
dependency_graph:
  requires:
    - "get_deliverability_stats(p_days integer) from Plan 1"
    - "get_funnel_stats(p_from timestamptz, p_to timestamptz) from Plan 2"
    - "is_admin() helper from launch_readiness_instrumentation"
    - "getAdminTestCredentials() from Plan 1 Task 4"
  provides:
    - "/admin/analytics route (admin-only, three-layer defense)"
    - "DeliverabilityTable client component"
    - "FunnelChartClient + FunnelRenderer client components"
    - "deliverabilityQueries / funnelQueries query-key factories"
    - "useDeliverabilityStats / useFunnelStats thin hooks"
    - "Playwright E2E spec admin-analytics.spec.ts"
    - "RLS integration test admin-analytics-access.rls.test.ts"
  affects:
    - "proxy.ts (new /admin/* gate)"
    - "src/types/analytics.ts (new types appended)"
tech_stack:
  added: []
  patterns:
    - "Three-layer admin defense: proxy.ts -> (admin)/layout.tsx -> is_admin() in RPC"
    - "next/dynamic ssr:false for recharts FunnelChart (tree-shake isolation)"
    - "Server-side Promise.all over two RPCs, pass mapped data as props to client components"
    - "Typed mapper functions at PostgREST boundary (zero as-unknown-as)"
    - "describe.skipIf + test.skip credential gating for env-dependent tests"
key_files:
  created:
    - "src/app/(admin)/layout.tsx (47 lines)"
    - "src/app/(admin)/admin/analytics/page.tsx (86 lines)"
    - "src/components/admin/deliverability-table.tsx (111 lines)"
    - "src/components/admin/funnel-chart.tsx (105 lines)"
    - "src/components/admin/funnel-renderer.tsx (61 lines)"
    - "src/hooks/api/query-keys/deliverability-keys.ts (67 lines)"
    - "src/hooks/api/query-keys/funnel-keys.ts (113 lines)"
    - "src/hooks/api/use-deliverability-stats.ts (11 lines)"
    - "src/hooks/api/use-funnel-stats.ts (14 lines)"
    - "tests/e2e/tests/admin-analytics.spec.ts (52 lines)"
    - "tests/integration/rls/admin-analytics-access.rls.test.ts (75 lines)"
  modified:
    - "proxy.ts (+13 lines: /admin/* gate)"
    - "src/types/analytics.ts (+63 lines: DeliverabilityStats + FunnelStats types)"
decisions:
  - "D2 (signup-cohort): FunnelStats.cohortLabel passed through from RPC; page renders it above chart"
  - "D5 (route group): (admin) route group with layout.tsx server-component admin gate"
  - "D6 (admin creds): getAdminTestCredentials() already existed from Plan 1 Task 4 -- no duplicate added"
  - "RPC field names differ from plan doc (Rule 1 - Bug): step names are signup/first_property/first_tenant/first_rent (not first_tenant_invited/first_rent_collected); RPC shape uses 'from'/'to' not 'cohort_from'/'cohort_to'; column names are sent_count/delivered_count/etc not sent/delivered/etc. Mapper adjusted to match actual SQL."
  - "Bounce/complaint rates in percentage points (0..100) not fractions (0..1) -- the SQL multiplies by 100 before returning. DeliverabilityStats uses bouncePercent/complaintPercent naming for clarity."
  - "Server client export name: src/lib/supabase/server.ts exports createClient() not createServerClient() -- plan code snippet was inaccurate; imports corrected in layout.tsx and page.tsx."
metrics:
  duration_minutes: ~12
  completed_date: "2026-04-15"
  commits: 8
  tasks_completed: 9
  tasks_total: 9
requirements:
  - ANALYTICS-05
  - ANALYTICS-06
---

# Phase 44 Plan 03: Admin Analytics UI Summary

Three-layer admin-gated analytics page at /admin/analytics rendering
email deliverability table (per-template bounce/complaint rates) and
onboarding funnel chart (4-step stepped visualization with conversion
drop-off) powered by the RPCs from Plans 1 and 2.

## What Shipped

8 atomic commits for 9 tasks (Task 7 was build-verification-only).

| # | Task | Commit | Key Files |
| - | ---- | ------ | --------- |
| 1 | /admin/* proxy gate | `bc9a369fe` | proxy.ts |
| 3 | Deliverability types + keys + hook | `2a53615ee` | analytics.ts, deliverability-keys.ts, use-deliverability-stats.ts |
| 4 | Funnel types + keys + hook | `123b73fa1` | analytics.ts, funnel-keys.ts, use-funnel-stats.ts |
| 5 | DeliverabilityTable component | `02b8183f7` | deliverability-table.tsx |
| 6 | FunnelChartClient + FunnelRenderer | `6194de10c` | funnel-chart.tsx, funnel-renderer.tsx |
| 2 | Admin layout + analytics page | `ba2366073` | (admin)/layout.tsx, (admin)/admin/analytics/page.tsx |
| 7 | Build smoke test | (no commit) | pnpm build exit 0, /admin/analytics listed as dynamic route |
| 8 | Playwright E2E spec | `cd7c20901` | admin-analytics.spec.ts |
| 9 | RLS integration test | `1e2e8e8c0` | admin-analytics-access.rls.test.ts |

Task execution order differed from plan numbering: Tasks 3-6 (types,
factories, components) shipped before Task 2 (page assembly) so that
the page could import from the factories without forward-declaring stubs.

## Admin Defense Architecture

Three independent layers, each sufficient to block non-admin access:

```
Browser request
  |
  v
[proxy.ts] -- /admin/* gate
  |  non-admin -> redirectWithCookies(/dashboard or /tenant)
  |  unauthenticated -> /login?redirect=/admin/analytics
  |  admin -> pass through
  v
[(admin)/layout.tsx] -- server-component gate
  |  reads app_metadata.user_type from JWT (no DB round-trip)
  |  non-admin -> redirect('/dashboard')
  |  no user -> redirect('/login?redirect=/admin/analytics')
  |  admin -> render children
  v
[page.tsx -> supabase.rpc()] -- DB-level gate
  |  get_deliverability_stats: if not is_admin() then raise 'Unauthorized'
  |  get_funnel_stats: if not is_admin() then raise 'Unauthorized'
```

Each layer independently rejects non-admin access. The Playwright E2E
spec verifies layers 1-2 (admin sees page, owner redirected to
/dashboard). The RLS integration test verifies layer 3 (owner client
receives error or null from both RPCs, admin client succeeds).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RPC field names differed from plan code snippets**
- **Found during:** Tasks 3-4
- **Issue:** Plan assumed `sent`/`delivered`/`bounced`/etc. but actual RPC
  returns `sent_count`/`delivered_count`/`bounced_count`. Plan assumed
  funnel step names `first_tenant_invited`/`first_rent_collected` but
  actual RPC uses `first_tenant`/`first_rent`. Plan assumed top-level
  keys `cohort_from`/`cohort_to` but actual RPC uses `from`/`to`.
- **Fix:** Mapper functions adjusted to match actual SQL migration output.
  Types renamed accordingly (e.g. `FunnelStep.step` not `.stepName`,
  `bouncePercent` not `bounceRate` since values are 0..100 not 0..1).
- **Files modified:** deliverability-keys.ts, funnel-keys.ts, analytics.ts
- **Commits:** `2a53615ee`, `123b73fa1`

**2. [Rule 1 - Bug] Server client export name**
- **Found during:** Task 2
- **Issue:** Plan code used `import { createServerClient } from '#lib/supabase/server'`
  but the actual module exports `createClient`.
- **Fix:** Used `import { createClient } from '#lib/supabase/server'`.
- **Files modified:** layout.tsx, page.tsx
- **Commit:** `ba2366073`

**3. [Rule 2 - Missing functionality] FunnelStats enriched fields**
- **Found during:** Task 4
- **Issue:** Plan's FunnelStep had only `count` and `conversionRateFromPrev`.
  Actual RPC returns richer data: `step_order`, `conversion_rate_from_signup`,
  `median_days_from_prior`, `median_days_from_signup`.
- **Fix:** FunnelStep type includes all fields from the actual RPC output.
  Not displaying all in v1 UI, but the types are complete so future
  drill-down views can use them without a type change.
- **Files modified:** analytics.ts, funnel-keys.ts
- **Commit:** `123b73fa1`

**4. [Rule 3 - Blocking] getAdminTestCredentials() already existed**
- **Found during:** Task 8
- **Issue:** Plan's Task 8 instructed adding `getAdminTestCredentials()` to
  supabase-client.ts, but Plan 1 Task 4 already added it (lines 65-76).
- **Fix:** Skipped the duplicate addition. Only the Playwright spec was
  created in Task 8.
- **Commit:** `cd7c20901`

**5. [Rule 2] funnel-renderer.tsx missing from plan files_modified**
- **Plan-check flag 1:** The plan's frontmatter `files_modified` list did
  not include `src/components/admin/funnel-renderer.tsx` (created in Task 6).
  The file was committed in `6194de10c`.

### Plan-Check Flags Addressed

1. **files_modified drift:** `src/lib/supabase/middleware.ts` had no changes
   (confirmed: the /admin/* gate lives in proxy.ts, not middleware.ts).
   Removed from commit scope. `funnel-renderer.tsx` was created in Task 6
   but was not in the plan's `files_modified` frontmatter -- documented above.

2. **E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not in D6 Wave 0 ops doc:**
   The Playwright non-admin-redirect test uses `E2E_OWNER_EMAIL` /
   `E2E_OWNER_PASSWORD` which were not documented in the D6 decision's
   Wave 0 operator actions. These env vars are already provisioned for
   existing RLS tests (`getTestCredentials()` uses them as ownerA).
   Adding them to the D6 Wave 0 checklist is a documentation follow-up,
   not a blocking issue.

## Verification Evidence

- **pnpm typecheck:** PASS (0 errors)
- **pnpm lint:** PASS (0 errors)
- **pnpm test:unit:** 1632/1632 passing
- **pnpm build:** PASS (exit 0, /admin/analytics listed as dynamic route)
- **playwright test --list:** 2 tests listed in admin-analytics.spec.ts
- **grep 'as unknown as':** 0 matches in all new files
- **Line counts:** max 113 (funnel-keys.ts), all under 300
- **No emojis, no inline styles, no Radix icons, no barrel files**

## Wave 0 Operator Items

All Wave 0 items from Plans 1 and 2 remain prerequisite for this plan's
runtime behavior:
1. Apply migrations to dev Supabase project (`supabase db push`)
2. Regenerate types (`pnpm db:types`) -- the mappers work without it
   (untyped `.rpc()` call by name) but typed return values will be
   available after regen
3. Set `RESEND_WEBHOOK_SECRET` in Edge Function secrets
4. Deploy `resend-webhook` Edge Function
5. Configure Resend webhook endpoint
6. Provision admin test user + set `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`

## Known Stubs

None. All code is wired end-to-end:
- Page server-component calls both RPCs and maps through typed mappers
- Components receive props (not client-fetched stubs)
- Empty states render when no data exists (not "coming soon" placeholders)

## Threat Flags

None. All network endpoints, auth paths, and schema changes at trust
boundaries match the plan's threat model. No new surfaces introduced
beyond the documented three-layer admin gate.

## Follow-up Items (v1.8 Candidates)

- URL date-range picker for funnel cohort window
- Per-template drill-down in deliverability table
- Admin audit logging (T-44-03-08 accepted risk)
- Sidebar navigation for the (admin) route group
- Median-days-to-step display in funnel chart (data already mapped)

## Self-Check: PASSED
