---
phase: 54-e-sign-storage-metering
plan: 05
subsystem: frontend
tags: [react, tanstack-query, settings, billing, metering, usage, upgrade-prompt]

# Dependency graph
requires:
  - phase: 54-01
    provides: get_esign_usage_current_month() authenticated read RPC (live + typed in supabase.ts) — the e-sign usage source
  - phase: 54-03
    provides: get_storage_usage_summary() authenticated read RPC (live + typed in supabase.ts) — the storage usage source
provides:
  - usageQueries.esign()/storage() — queryOptions() factories in src/hooks/api/query-keys/usage-keys.ts reading the two owner-guarded usage RPCs via typed boundary mappers (no as unknown as / any), staleTime 60s
  - formatBytes GB branch — src/lib/format-bytes.ts now renders GB (was topping out at MB); storage quotas display GB-correctly
  - UsageSection — src/components/settings/sections/usage-section.tsx e-sign + storage widgets with 80% near-cap upgrade prompts, rendered in BillingSettings
  - send-mutation freshness — useSendLeaseForSignatureMutation.onSuccess now invalidates usageQueries.esign() (the Plan 02 wave-2 deferral, closed here)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "queryOptions() usage factory reading a param-less owner-guarded RPC with a typed boundary mapper that Number()-coerces a bigint (used_bytes) arriving as a string over PostgREST and treats limit_gb -1 as unlimited"
    - "Proactive near-cap upgrade surface (80% threshold) reusing the Phase 52 Settings section pattern (BlurFade + rounded-lg border bg-card p-6 + uppercase muted heading) + Progress variant warning/destructive + a full-literal /billing/plans?source=... CTA"
    - "Cross-wave query-key freshness: an earlier-wave mutation's usage invalidation deferred to the wave that defines the factory, keeping it a factory key (CLAUDE.md rule 9) not a string literal"

key-files:
  created:
    - src/hooks/api/query-keys/usage-keys.ts
    - src/hooks/api/query-keys/__tests__/usage-keys.test.ts
    - src/lib/__tests__/format-bytes.test.ts
    - src/components/settings/sections/usage-section.tsx
    - src/components/settings/__tests__/usage-section.test.tsx
  modified:
    - src/lib/format-bytes.ts
    - src/components/settings/billing-settings.tsx
    - src/hooks/api/use-lease-signature-mutations.ts

key-decisions:
  - "formatBytes MB->GB crossover branches on the rounded MB value (mirrors the existing KB->MB rounded-boundary rule) so a byte count that rounds up to 1024 MB flips to GB instead of rendering a four-digit MB string"
  - "The e-sign cap is read from the RPC row (25 fallback only guards a missing row); Max is signalled by the RPC's unlimited:true, storage unlimited by limit_gb -1 — the UI never hardcodes plan logic beyond the fallback"
  - "Near-cap threshold is 80% for both widgets (20/25 e-signs; 80% of the storage GB quota); Progress goes warning at >=80% and destructive at >=100%; division guards return ratio 0 when the cap/limit is 0"
  - "CTA hrefs are full string literals (ESIGN_UPGRADE_HREF / STORAGE_UPGRADE_HREF) rather than interpolated from a source prop — keeps the Stripe source attribution greppable and matches the reactive 402 rail's esign_quota source"
  - "The send-mutation esign-usage invalidation lives in Plan 05 (wave 3) not Plan 02 (wave 2) because usageQueries is defined here; importing it directly keeps the invalidation a factory key, not a string literal"

patterns-established:
  - "Pattern: owner-scoped usage queryOptions factory (param-less RPC + Number()-coercing typed mapper + unlimited sentinel handling + staleTime 60s)"
  - "Pattern: Settings usage widget (WidgetShell + Progress variant-by-ratio + conditional near-cap UpgradePrompt with a literal source-attributed CTA)"

requirements-completed: [METER-02, METER-03]

# Metrics
duration: 10min
completed: 2026-07-24
---

# Phase 54 Plan 05: Settings Usage UI (METER-02/03) Summary

**A new `usageQueries` queryOptions factory reading the two live owner-guarded usage RPCs with typed bigint-safe mappers, a `formatBytes` GB branch, and a `UsageSection` rendering e-sign (X of 25 / Unlimited) and storage (X.X GB of Y GB / Unlimited) widgets with 80% near-cap upgrade prompts inside BillingSettings — plus the deferred Plan 02 send-mutation `usageQueries.esign()` invalidation, wired here where the factory is defined.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-24T04:22:50Z
- **Completed:** 2026-07-24T04:32:26Z
- **Tasks:** 2 of 2 complete
- **Files:** 5 created, 3 modified

## Accomplishments

- **Task 1 — usage data layer + GB formatter.** Created `usage-keys.ts` exporting `usageQueries.esign()` and `usageQueries.storage()` as `queryOptions()` factories (CLAUDE.md rule 9) reading the param-less, owner-guarded `get_esign_usage_current_month()` / `get_storage_usage_summary()` RPCs. Typed boundary mappers (`mapEsignUsageRow` / `mapStorageUsageRow`) coerce every numeric field via `Number(...)` — safely parsing the bigint `used_bytes` that arrives as a string over PostgREST — with no `as unknown as` and no `any`. `esign` maps `{used, cap, unlimited}` (Max -> `unlimited: true`); `storage` maps `{usedBytes, limitGb, unlimited}` (`limit_gb -1` -> `unlimited: true`); both `staleTime 60_000` and throw on RPC error. Extended `formatBytes` with a GB branch (it previously topped out at MB) using the same rounded-boundary rule as the KB->MB crossover.
- **Task 2 — UsageSection + render + send-mutation freshness.** Created `UsageSection` (client) rendering an e-sign widget and a storage widget inside the Phase 52 section shell (`BlurFade` + `rounded-lg border bg-card p-6` + uppercase muted "Usage" heading). Each widget: `Progress` bar (variant `warning` at >=80%, `destructive` at >=100%), Lucide icons (`FileSignature`/`HardDrive`/`AlertTriangle`), `text-muted-foreground` copy, `bg-card` surface, no inline styles, `aria-label` on each Progress and `aria-hidden` on decorative icons. Unlimited plans render "Unlimited e-signs" / "Unlimited storage" with no bar; at >=80% a near-cap `UpgradePrompt` shows a literal `/billing/plans?source=esign_quota` / `?source=storage_quota_gate` CTA. Rendered `<UsageSection />` in `BillingSettings` between the Current Plan section and `<BillingHistorySection />`. Wired `useSendLeaseForSignatureMutation.onSuccess` to `invalidateQueries({ queryKey: usageQueries.esign().queryKey })` (the Plan 02 deferral) alongside the existing `ownerDashboardKeys.all` invalidation — the Plan 02 onError Upgrade-CTA is untouched.
- **Tests (22 assertions across 3 files, all green):** `usage-keys.test.ts` pins both mappers (Growth, Max/unlimited, `limit_gb -1`, bigint-string coercion, missing-row zero shape, RPC-error throw) and the factory shape (staleTime, factory keys); `format-bytes.test.ts` pins unchanged B/KB/MB/null/0 plus the GB branch and the `>=1024 MB` regression; `usage-section.test.tsx` proves the 80% e-sign prompt + esign_quota CTA, the Max/Unlimited no-bar state, and GB-range storage rendering + storage_quota_gate CTA.

## Task Commits

1. **Task 1: usage-keys queryOptions factory + formatBytes GB branch** - `db6b9db54` (feat)
2. **Task 2: usage widgets + BillingSettings render + send-mutation freshness** - `9b915c363` (feat)

Note on TDD: Task 1 tests were authored first and confirmed RED (GB assertions failed; usage-keys module missing), but the RED test-only commit could not land because the lefthook pre-commit gate requires green unit tests + typecheck (and `--no-verify` is forbidden). The tests and implementation therefore landed together in the single atomic Task 1 `feat` commit. RED-before-GREEN was verified locally prior to committing.

## Deviations from Plan

None affecting scope. Two mechanical adjustments during execution:
- The plan's `<automated>` verify used `bun run test:unit -- --run <files>`, but the `test:unit` script already injects `--run` (double-flag CAC error) — ran `bun run test:unit -- <files>` instead. No behavior change.
- The upgrade CTA was refactored from an interpolated `source` prop to two full-literal href constants so the exact `source=esign_quota` / `source=storage_quota_gate` routes are greppable (satisfying the plan's verify grep) and the Stripe source attribution is explicit. Same rendered hrefs; tests assert them exactly.

## Boundary Compliance

- `src/types/supabase.ts`, `.planning/STATE.md`, and `.planning/ROADMAP.md` were NOT modified (verified via `git diff --name-only` over both task commits — only the 8 intended source/test files changed).
- Zero package installs (T-54-SC accept holds): reused `Progress`, `formatBytes`, `queryOptions`, `BlurFade`, and Lucide.

## Threat Model Compliance

- **T-54-18 (info disclosure):** widgets call the param-less `get_esign_usage_current_month` / `get_storage_usage_summary`, which resolve `(select auth.uid())` server-side; no owner id crosses the wire. Honored.
- **T-54-19 (false sense of enforcement):** the widget is read-only UX; real enforcement is the Plan 01 RPC + Plan 04 trigger. Documented in the component header comment. Honored.

## Verification

- `bun run typecheck` -> 0 errors
- `bun run lint` (biome, via pre-commit) -> pass
- `bun run test:unit -- src/hooks/api/query-keys/__tests__/usage-keys.test.ts src/lib/__tests__/format-bytes.test.ts src/components/settings/__tests__/usage-section.test.tsx` -> 3 files / 22 tests passed
- Both task commits passed the full lefthook pre-commit suite (gitleaks, lockfile-verify, lint, typecheck, unit-tests) + commitlint.

## Self-Check: PASSED

- All 5 created source/test files exist on disk + the SUMMARY.
- Both task commits (`db6b9db54`, `9b915c363`) are reachable in git history.
