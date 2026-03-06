---
phase: 8
slug: performance-optimization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit + component) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm typecheck && pnpm lint` |
| **Full suite command** | `pnpm validate:quick` (types + lint + unit) |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm lint`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| PERF-01 | Tenant portal amountDue parallelized | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant-payments.test.ts` | Needs creation | ⬜ pending |
| PERF-02 | Shared tenant ID resolution | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant-portal-keys.test.ts` | Needs creation | ⬜ pending |
| PERF-03 | Recharts dynamically imported | manual-only | `next build` + bundle analysis | N/A | ⬜ pending |
| PERF-04 | react-markdown dynamically imported | manual-only | `next build` + bundle analysis | N/A | ⬜ pending |
| PERF-05 | refetchOnWindowFocus changed to true | unit | Check query-provider defaults | Existing provider may cover | ⬜ pending |
| PERF-06 | Virtualization on 4 list views | component | `pnpm test:component` | Needs creation | ⬜ pending |
| PERF-07 | Maintenance stats RPC | integration | `pnpm test:rls` | RLS test if applicable | ⬜ pending |
| PERF-08 | Lease stats RPC | integration | `pnpm test:rls` | RLS test if applicable | ⬜ pending |
| PERF-09 | optimizePackageImports added | manual-only | `pnpm typecheck` | N/A | ⬜ pending |
| PERF-10 | Webhook email optimization | unit | Existing handler tests | May exist | ⬜ pending |
| PERF-11 | Webhook charge+late_fee parallelized | manual-only | Edge Function deploy + test | N/A | ⬜ pending |
| PERF-12 | stripe-autopay-charge parallelized | manual-only | Edge Function deploy + test | N/A | ⬜ pending |
| PERF-13 | stripe-rent-checkout parallelized | manual-only | Edge Function deploy + test | N/A | ⬜ pending |
| PERF-14 | Blog pagination + column filter | unit | Existing blog hook tests | May exist | ⬜ pending |
| PERF-15 | Maintenance urgent/overdue .limit() | unit | Existing maintenance tests | May exist | ⬜ pending |
| PERF-16 | Tenant maintenance counts via DB | unit | Hook test for count query | May exist | ⬜ pending |
| PERF-17 | select('*') replaced with columns | manual-only | `pnpm typecheck` | N/A | ⬜ pending |
| PERF-18 | Notifications select specific columns | manual-only | `pnpm typecheck` | N/A | ⬜ pending |
| PERF-19 | Occupancy trends dedup | unit | Verify single queryOptions shared | May exist | ⬜ pending |
| PERF-20 | Expiring leases .limit() | unit | Existing lease tests | May exist | ⬜ pending |
| PERF-21 | next/image in file-upload-item | manual-only | Visual verification | N/A | ⬜ pending |
| PERF-22 | Stale CSS @source removed | manual-only | `pnpm dev` + verify styles | N/A | ⬜ pending |
| PERF-23 | Cache headers on invitation validate | manual-only | curl test | N/A | ⬜ pending |
| PERF-24 | use client audit | manual-only | `pnpm typecheck && pnpm lint` | N/A | ⬜ pending |
| DOC-01 | CLAUDE.md updated | manual-only | Review CLAUDE.md diff | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Migration files for `get_maintenance_stats()` and `get_lease_stats()` RPCs — needed before PERF-07/08 frontend work
- [ ] Verify `pnpm typecheck` passes with current codebase before starting phase
- [ ] Install `@tanstack/react-virtual` — needed before PERF-06

*Existing infrastructure covers most phase requirements. Wave 0 focuses on DB migrations and dependency installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recharts not in non-chart bundles | PERF-03 | Bundle composition check | Run `next build`, verify chart pages have recharts chunk, non-chart pages do not |
| react-markdown not in non-blog bundles | PERF-04 | Bundle composition check | Run `next build`, verify blog page has markdown chunk only |
| Edge Function parallelization | PERF-11-13 | Deno runtime, not testable in Vitest | Deploy + verify via Supabase logs or manual curl |
| select column filtering | PERF-17-18 | Query shape change, types verify | `pnpm typecheck` confirms column references valid |
| CSS source paths | PERF-22 | Visual regression | `pnpm dev`, spot-check pages for missing styles |
| Cache headers | PERF-23 | HTTP header check | `curl -I` against deployed function |
| next/image blob URL | PERF-21 | Blob URL compat with next/image | Visual check in dev, may be N/A |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
