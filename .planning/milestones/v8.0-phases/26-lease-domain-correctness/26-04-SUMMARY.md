---
phase: 26-lease-domain-correctness
plan: 04
subsystem: infra
tags: [edge-functions, lease-signing, pdf, currency, deno, intl]

# Dependency graph
requires: []
provides:
  - "formatMoney in _shared/lease-signing.ts renders 2-decimal USD, matching the signing page's formatCurrency"
  - "exported formatMoney + Deno formatter tests (1500.5, 1500, null/empty)"
affects: [lease-signature Edge Function signed-PDF rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intl.NumberFormat en-US USD (min/max 2 fraction digits) as the single 2-decimal money format shared conceptually with src/lib/utils/currency.ts formatCurrency"

key-files:
  created: []
  modified:
    - supabase/functions/_shared/lease-signing.ts
    - supabase/functions/tests/lease-signing-test.ts

key-decisions:
  - "Format money with Intl.NumberFormat 2-decimal USD instead of bare toLocaleString (which defaulted to 0 min fraction digits)"
  - "Export the previously module-internal formatMoney so the pure Deno test can assert it (no functions serve / no network needed)"
  - "Values treated as dollars — no cents conversion; N/A guard for null/empty/NaN retained"

requirements-completed: [LEASE-07]

# Metrics
duration: ~15min
completed: 2026-07-05
---

# Phase 26 Plan 04: LEASE-07 Signed-PDF Money Format

**The lease-signature Edge Function now formats money with exactly two decimals (e.g. 1500.5 -> "$1,500.50", 1500 -> "$1,500.00") in the legally-signed PDF, matching the signing page's formatCurrency, instead of the bare toLocaleString that produced "$1,500.5".**

## Accomplishments

- Rewrote `formatMoney` in `supabase/functions/_shared/lease-signing.ts` to use `Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })`; retained the `"N/A"` fallback for null / empty / NaN; no cents conversion.
- Exported `formatMoney` and added three Deno formatter tests: `1500.5 -> "$1,500.50"`, `1500 -> "$1,500.00"`, `null` and `""` -> `"N/A"`.

## Task Commits

1. **Task 1: Format signed-PDF money with 2 decimals** — `07becdb05` (fix)
2. **Task 2: Deploy the lease-signature Edge Function** — DEFERRED owner/manual step (see below).

## Verification

- `grep -n "minimumFractionDigits: 2" supabase/functions/_shared/lease-signing.ts` → line 114. ✔
- Deno is not installed locally, so the Deno test was not executed here; the formatter output was independently verified with the same `Intl.NumberFormat` config in Node:
  `[1500.5, 1500, null, "", "abc"]` → `["$1,500.50", "$1,500.00", "N/A", "N/A", "N/A"]`. ✔ (ICU behavior is identical between Node and Deno for this format.)
- biome ignores `supabase/functions/**` (Deno-linted, not biome), so the change carries no biome-lint risk.

## DEFERRED OWNER STEP — Edge Function deploy (Task 2, blocking checkpoint)

The `formatMoney` fix lives in `_shared/lease-signing.ts`, which is bundled into the **`lease-signature`** Edge Function. **CI does NOT deploy Edge Functions** and the CLI intermittently 401s, so the deploy is an out-of-band owner step and was NOT performed here (per the plan's `user_setup` + Task-2 checkpoint, and the task directive to not deploy).

To deploy after merge:

```
bun scripts/deploy-edge-functions.ts            # preferred — also warms the CLI
# or
supabase functions deploy lease-signature --project-ref bshjmbshupiibfiewpxb
```

Then send a test lease for signature whose rent has a single trailing decimal (e.g. 1500.5) and confirm the generated signed PDF shows "$1,500.50".

## Self-Check: PASSED
- `formatMoney` uses a 2-decimal USD `Intl.NumberFormat` + retains the `"N/A"` fallback; no cents conversion.
- Deno test asserts the three money cases; formatter output verified via Node.
- Deploy flagged as a deferred owner step (not executed).

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-05*
