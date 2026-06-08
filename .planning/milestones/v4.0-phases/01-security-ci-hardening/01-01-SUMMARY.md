---
phase: 01-security-ci-hardening
plan: 01
subsystem: testing
tags: [stripe, webhook, signature, hmac, vitest, ci-gate, security]

# Dependency graph
requires: []
provides:
  - CI-gated Stripe-webhook signature accept/reject contract test (CISEC-01)
  - Vitest unit test pinning generateTestHeaderString + constructEvent behavior
affects: [stripe-webhooks, edge-functions, payments-security]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Test the SDK contract an Edge Function depends on, not the Deno function file (avoids npm:/jsr: specifier resolution in Vite)"
    - "Mint a real HMAC via stripe.webhooks.generateTestHeaderString instead of hand-rolling the Stripe-Signature header"

key-files:
  created:
    - src/lib/__tests__/stripe-webhook-signature.test.ts
  modified: []

key-decisions:
  - "Used the synchronous constructEvent (Node SDK) as the correct mirror of the Edge Function's constructEventAsync (Deno) — same t=,v1= HMAC-SHA256 scheme"
  - "Throwaway test secrets only; no prod STRIPE_WEBHOOK_SECRET, no server, no supabase functions serve"

patterns-established:
  - "Edge-Function signature contracts are gated in the unit vitest project (src/**) so they run in the already-green checks gate without booting the Deno runtime"

requirements-completed: [CISEC-01]

# Metrics
duration: 12min
completed: 2026-06-04
---

# Phase 1 Plan 01: Stripe-Webhook Signature CI Gate Summary

**Vitest unit test that mints a genuine HMAC via the stripe SDK and pins the Stripe-webhook signature accept/reject contract (valid accepted; tampered/wrong-secret/stale rejected) inside the already-green `checks` gate.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-04T12:55:00Z
- **Completed:** 2026-06-04T13:03:00Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments
- Closed CISEC-01: the Stripe-webhook signature path is now a hard CI gate — a PR breaks if a valid signature stops being accepted OR a forged/tampered/stale one stops being rejected.
- Test mints a real HMAC via `stripe.webhooks.generateTestHeaderString` (no hand-rolled header literal) and asserts all four contract cases against `constructEvent`.
- Runs in the `unit` vitest project (`src/**`), so it executes in the existing `checks` gate with no server, no prod secret, no `supabase functions serve`, and no new dependency.
- Guards the `constructEventAsync` contract at `supabase/functions/stripe-webhooks/index.ts:73` (linked in a header comment for future readers).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the Stripe webhook-signature accept/reject unit test** - `c64d06f54` (test)

_Note: this is a pure test-only artifact (the test IS the deliverable; no production source code), so the RED/GREEN cycle collapses to a single passing test commit — there is no implementation source to add in a separate GREEN commit._

## Files Created/Modified
- `src/lib/__tests__/stripe-webhook-signature.test.ts` - Vitest unit test minting a valid Stripe signature via the SDK and asserting accept (valid) + reject (tampered body, wrong secret, stale timestamp outside tolerance).

## Decisions Made
- Used the synchronous `constructEvent` from the Node SDK rather than `constructEventAsync` — the Edge Function only uses the async variant because Deno requires the async Web-Crypto path; both implement the identical signed-header scheme. Documented in a comment so nobody "fixes" the test to match the Edge Function's async call.
- Used throwaway, internally-consistent test secrets (`whsec_test_…`) shaped like real signing secrets; the wrong-secret case uses a distinct `whsec_wrong_…` value.
- Passed an explicit `tolerance` (300s) to `constructEvent` only on the stale-timestamp case so the SDK enforces the timestamp window; the other reject paths rely on the default behavior.

## Deviations from Plan

### Adjustments (no rule-class deviation)

**1. Comment wording adjusted to satisfy the `t=.*v1=` grep acceptance guard**
- **Found during:** Task 1 (acceptance-criteria grep check)
- **Issue:** My initial header comment explained the Stripe scheme using the literal text `t=<timestamp>,v1=<hmac-sha256>` and `t=…,v1=…` to warn against hand-rolling. The acceptance criterion `grep -cE "t=.*v1=" … returns 0` matched those explanatory comment lines (returned 2), even though no code hand-rolls a header.
- **Fix:** Reworded the comment to describe the scheme in prose ("an HMAC-SHA256 over the timestamp-and-payload, carried in the Stripe-Signature header") without the literal `t=…,v1=…` pattern. Intent (warn against hand-rolling) preserved.
- **Files modified:** src/lib/__tests__/stripe-webhook-signature.test.ts
- **Verification:** `grep -cE "t=.*v1=" …` now returns 0; `grep -c "generateTestHeaderString" …` returns 5; 4 tests still pass.
- **Committed in:** c64d06f54 (Task 1 commit)

**2. `bun run test:unit -- --run <file>` corrected to `bun run test:unit -- <file>`**
- **Found during:** Task 1 (running the plan's stated verify command)
- **Issue:** The `test:unit` package.json script is already `vitest --run --project unit`, so the plan's `bun run test:unit -- --run <file>` passed `--run` twice and vitest 4 errored ("Expected a single value for option --run").
- **Fix:** Ran `bun run test:unit -- <file>` (the script already injects `--run --project unit`). Also confirmed via the plan's exact `bunx vitest --run --project unit <file>` form, which passes cleanly.
- **Files modified:** none (command-invocation fix only)
- **Verification:** Both forms pass — 4/4 tests green.
- **Committed in:** n/a (no file change)

---

**Total deviations:** 2 minor adjustments (1 comment-wording to satisfy a grep guard, 1 command-invocation fix). No rule-class auto-fixes (no bugs, missing functionality, or blockers in code).
**Impact on plan:** Plan executed as written. No scope creep, no production code touched, no new dependency.

## Issues Encountered
- The plan's literal `--run` flag in the verify command duplicated the script's own `--run` (vitest 4 rejects duplicate single-value options). Resolved by dropping the redundant flag; the underlying assertion is unchanged. See Deviation 2.

## User Setup Required
None - no external service configuration required. The test uses only throwaway in-test secrets and the already-installed `stripe` + `vitest` packages.

## Next Phase Readiness
- CISEC-01 is closed; the signature contract is gated on every PR via `checks`.
- Remaining Phase 1 requirements (CISEC-02 CSP nonce, CISEC-03 constant-time hook-secret compare, CISEC-04 SHA-pin GitHub Actions) are independent and untouched by this plan.
- No blockers introduced.

## Self-Check: PASSED
- FOUND: src/lib/__tests__/stripe-webhook-signature.test.ts
- FOUND: commit c64d06f54

---
*Phase: 01-security-ci-hardening*
*Completed: 2026-06-04*
