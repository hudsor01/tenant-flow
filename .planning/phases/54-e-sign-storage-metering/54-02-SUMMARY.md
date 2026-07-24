---
phase: 54-e-sign-storage-metering
plan: 02
subsystem: api
tags: [supabase-edge-functions, deno, metering, e-sign, tanstack-query, paywall, 402]

# Dependency graph
requires:
  - phase: 54-01
    provides: meter_esign_send(uuid,uuid) advisory-lock RPC + get_esign_usage_current_month() (live in prod, typed in supabase.ts)
provides:
  - lease-signature edge fn meters the send action via meter_esign_send (send-only, after checkTierEntitlement, before the pending_signature flip) and returns a 402 upgrade payload over cap
  - lease-signature refactored to an injectable handleRequest(req, deps) so metering branches are unit-testable with a fake client (no functions serve)
  - callLeaseSignatureEdgeFunction preserves a 402 upgrade_url via PaywallError (no longer discards status+url)
  - useSendLeaseForSignatureMutation surfaces an Upgrade toast CTA to /billing/plans?source=esign_quota on the over-cap 402
  - Deno branch coverage (send-blocked 402 / send-allowed / Max / meter-error / resend-never-meters) + wrapper unit coverage
affects: [54-05 Settings usage widget, METER-01, METER-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable handleRequest(req, deps) + DENO_TEST_NO_SERVE guard so an edge fn's branches are drivable by a fake SupabaseClient (mirrors send-lease-reminders)"
    - "Up-front metered reservation: reserve the slot immediately before the lease state change; accept a rare failed-send over-count (revertSendToDraft leaves the event) rather than refunding"
    - "402 upgrade payload -> PaywallError(upgradeUrl) at the client boundary -> Upgrade toast action (mirrors report-keys.ts / use-report-mutations.ts)"

key-files:
  created:
    - supabase/functions/tests/lease-signature-metering-test.ts
    - src/hooks/api/query-keys/lease-mutation-options.test.ts
  modified:
    - supabase/functions/lease-signature/index.ts
    - src/hooks/api/query-keys/lease-mutation-options.ts
    - src/hooks/api/use-lease-signature-mutations.ts

key-decisions:
  - "Meter placed AFTER fetchLeaseSigningData + the tenant-email guard and immediately BEFORE the draft->pending_signature update — reserves up-front (before any state change) while never burning a slot on an input-validation 400"
  - "Reuse the existing PaywallError (report-keys.ts) rather than a duplicate error class — imported directly (no barrel), typed boundary, no as-unknown-as"
  - "Refactor lease-signature to an exported handleRequest with injectable createClient (send-lease-reminders pattern) so the send/resend metering branches are pure-unit testable without functions serve"
  - "Usage-widget invalidation NOT wired here — usageQueries lives in usage-keys.ts (Plan 05, wave 3); referencing it now would need a string-literal query key (CLAUDE.md rule 9)"

patterns-established:
  - "Testable edge-fn handler via dependency-injected client + DENO_TEST_NO_SERVE"
  - "Client edge-fn wrapper preserves structured 402 upgrade payloads as PaywallError for an actionable CTA"

requirements-completed: []  # METER-01 call-site authored; NOT complete until the orchestrator deploys lease-signature + verifies the live send branch

# Metrics
duration: 30min
completed: 2026-07-23
---

# Phase 54 Plan 02: Lease-signature E-sign Metering Hook + Honest Upgrade CTA Summary

**The lease-signature `send` action now reserves one e-sign against the Growth 25/month cap via `meter_esign_send` (send-only, up-front, before any lease state change) and refuses the 26th with a 402 upgrade payload; the client wrapper preserves that `upgrade_url` as a `PaywallError` so the send mutation shows a real Upgrade toast CTA instead of a swallowed generic error.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-07-23
- **Tasks:** 2 of 3 authored here (Task 3 deploy deferred to the orchestrator)
- **Files created:** 2 · **Files modified:** 3

## Accomplishments
- **Edge-fn metered send hook (METER-01 call site):** in `supabase/functions/lease-signature/index.ts`, inside the `if (action === "send")` block, `meter_esign_send({ p_owner: user.id, p_lease: leaseId })` is called after the `checkTierEntitlement` esign gate + the send guards (rate-limit, draft-status, notice-address, record + tenant-email) and **immediately before** the `leases.update({ lease_status: "pending_signature" })` flip. On `allowed=false` it returns HTTP 402 `{ error, upgrade_required: true, upgrade_url: "/billing/plans?source=esign_quota" }` via `getJsonHeaders(req)` — before any lease state change. RPC errors route through `errorResponse` (no raw `err.message`). Max owners return `unlimited=true` and pass through unchanged. **`resend` never calls the RPC (D-02).**
- **Testability refactor:** extracted the `Deno.serve` callback into an exported `handleRequest(req, deps)` with an injectable `createClient` (mirrors `send-lease-reminders`), guarded by `DENO_TEST_NO_SERVE`, so the metering branches are drivable by a fake `SupabaseClient` with no `functions serve` / network.
- **Deno branch coverage** (`supabase/functions/tests/lease-signature-metering-test.ts`): send-blocked → 402 + `upgrade_url` + **no pending_signature flip** + no token/email; send-allowed → proceeds (flip + token + one email); Max (`unlimited=true`) → never blocked; meter RPC error → 500 generic body, no flip; **resend → `meter_esign_send` never invoked**.
- **Client 402 gap closed (RESEARCH Pitfall 4):** `callLeaseSignatureEdgeFunction` now parses the error body and, when it carries a string `upgrade_url`, throws `PaywallError(message, upgrade_url, "esign")` (reused from `report-keys.ts`, imported directly) instead of the prior `new Error(error.error)` that discarded status + url. `useSendLeaseForSignatureMutation.onError` detects the `PaywallError` and shows an "E-sign limit reached" toast with an **Upgrade** action navigating to the returned `upgrade_url`; all other errors still route through `handleMutationError`.
- **Wrapper unit coverage** (`src/hooks/api/query-keys/lease-mutation-options.test.ts`): a 402 `{ error, upgrade_url }` body yields a `PaywallError` exposing `upgradeUrl`; a non-paywall 400 stays a plain `Error`; a 200 returns the success body.

## Task Commits

1. **Task 1: Hook meter_esign_send into the send action + Deno branch coverage** — `d0971427e` (feat)
2. **Task 2: Preserve the 402 upgrade_url in the client wrapper + Upgrade CTA** — `7ca4649fa` (feat)

**Plan metadata (SUMMARY):** committed separately (docs).

_Task 3 (deploy) intentionally not committed here — see "Deferred to Orchestrator"._

## Files Created/Modified
- `supabase/functions/lease-signature/index.ts` — exported `handleRequest(req, deps)` + `DENO_TEST_NO_SERVE`-guarded `Deno.serve`; `meter_esign_send` send-only hook before the pending_signature flip; 402 over-cap upgrade response
- `supabase/functions/tests/lease-signature-metering-test.ts` — pure-unit fake-client Deno test of the send/resend/Max/error metering branches
- `src/hooks/api/query-keys/lease-mutation-options.ts` — `callLeaseSignatureEdgeFunction` preserves the 402 `upgrade_url` via `PaywallError`
- `src/hooks/api/use-lease-signature-mutations.ts` — `handleSendSignatureError` surfaces the Upgrade toast CTA on `PaywallError`
- `src/hooks/api/query-keys/lease-mutation-options.test.ts` — wrapper 402/400/200 coverage

## Decisions Made
- **Meter placement:** after `fetchLeaseSigningData` + the tenant-email guard and immediately before the `pending_signature` update — reserves up-front (before any state change, per RESEARCH Pattern 2) while avoiding a burned slot on an input-validation 400. The only accepted over-count is the RESEARCH-sanctioned case: a later email failure that runs `revertSendToDraft` leaves the reserved event (conservative toward the cap, never a data trap).
- **Reused `PaywallError`** from `report-keys.ts` (imported directly, no re-export/barrel) rather than defining a duplicate error class — typed boundary, no `any` / `as unknown as`.
- **Injectable `handleRequest`** (send-lease-reminders pattern) chosen over a heavier integration harness so the send/resend metering branches are provable as pure unit tests.
- **Usage-widget freshness deferred to Plan 05** — `usageQueries.esign()` lives in `usage-keys.ts` (wave 3), so wiring `invalidateQueries` here would require a string-literal query key (CLAUDE.md rule 9). Plan 05 owns the send-mutation `onSuccess` invalidation.

## Deviations from Plan

**1. [Rule 3 - Blocking] Refactored lease-signature to an exported `handleRequest` for testability**
- **Found during:** Task 1 (authoring the Deno branch coverage)
- **Issue:** The plan's `<read_first>` names `send-lease-reminders-test.ts` (the handler-with-fake-client model) as the branch-test approach, but `lease-signature/index.ts` inlined its logic in `Deno.serve(async (req) => …)` with a hard-coded `createAdminClient` — there was no seam to drive the send/resend metering branches with a fake client.
- **Fix:** Extracted the callback into `export async function handleRequest(req, deps = {})` with `const makeClient = deps.createClient ?? createAdminClient`, and guarded the real listener with `if (!Deno.env.get("DENO_TEST_NO_SERVE")) Deno.serve((req) => handleRequest(req))` — the exact `send-lease-reminders` pattern. Pure-ASCII; behavior in prod is unchanged.
- **Files modified:** supabase/functions/lease-signature/index.ts
- **Verification:** grep confirms `meter_esign_send` sits between the `send` and `resend` blocks; typecheck (edge fns are outside the Node tsc include set) unaffected; the Deno test drives `handleRequest` directly.
- **Committed in:** `d0971427e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). **Impact on plan:** the refactor was required to make the plan's own test approach possible; no scope creep, no prod behavior change.

## Issues Encountered
- **TanStack v5 `mutationFn` requires a `(variables, context)` signature** — the wrapper test's direct `mutationFn(vars)` call tripped `TS2554: Expected 2 arguments`. Resolved by passing a minimal valid `MutationFunctionContext` (`{ client: new QueryClient(), meta: undefined }`); the send `mutationFn` ignores it. typecheck now exits 0.
- **`bun run test:unit`** injects `--run` itself — invoke as `bun run test:unit -- <file>` (not `-- --run <file>`, which is a CAC duplicate-flag crash).

## Verification Run Here
- `bun run typecheck` — exits 0
- `bun run lint` (`biome check`) — exits 0 (the "1 info" is a pre-existing biome.json migration notice, unrelated)
- `bun run test:unit -- src/hooks/api/query-keys/lease-mutation-options.test.ts` — 3/3 pass
- grep: `meter_esign_send` present, send < meter < resend, `source=esign_quota` present; wrapper `upgrade_url` + mutation `upgradeUrl/PaywallError` present
- lefthook pre-commit (gitleaks, lockfile-verify, lint, typecheck, full unit suite) — green on both task commits

## Deferred to Orchestrator (Task 3 — [BLOCKING], owner/orchestrator-run)

The code + tests are committed on `gsd/phase-54-esign-storage-metering`; the following require tools this agent does not have (CLI-401 deploy workaround + Supabase MCP + a running `functions serve`):

1. **Deploy `lease-signature`** via the disk-reading script — `bun scripts/deploy-edge-functions.ts lease-signature` (never `supabase functions deploy` [CLI-401]; never MCP `deploy_edge_function` [edge-deploy-mcp-fidelity — corrupts source via model emission]). The edit is pure-ASCII, but deploy via the disk script regardless.
2. **Verify the live send branch** via MCP `get_edge_function lease-signature` — confirm a bumped version whose body contains the `meter_esign_send` call in the `send` branch.
3. **Run the Deno edge test** — `deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/lease-signature-metering-test.ts`. It is a pure-unit test (`DENO_TEST_NO_SERVE=1`, injected client) and does NOT need `functions serve`, but it was NOT run here (no `functions serve` was up per the execution boundary; deferred to CI/orchestrator).

`src/types/supabase.ts`, `STATE.md`, and `ROADMAP.md` were intentionally **NOT modified**. METER-01's call site is authored + unit-proven; it is **live only after the orchestrator completes the deploy + `get_edge_function` verify** — do not mark METER-01 complete until then.

## Next Phase Readiness
- Plan 05 can wire `invalidateQueries({ queryKey: usageQueries.esign().queryKey })` into `useSendLeaseForSignatureMutation.onSuccess` once `usage-keys.ts` exists (wave 3) — the send mutation and its Upgrade CTA are in place.
- Blocker: the metered send is not live in prod until the orchestrator deploys `lease-signature` and verifies the send-branch body.

## Self-Check: PASSED

- FOUND: supabase/functions/lease-signature/index.ts (meter_esign_send hook)
- FOUND: supabase/functions/tests/lease-signature-metering-test.ts
- FOUND: src/hooks/api/query-keys/lease-mutation-options.ts (upgrade_url / PaywallError)
- FOUND: src/hooks/api/query-keys/lease-mutation-options.test.ts
- FOUND: src/hooks/api/use-lease-signature-mutations.ts (PaywallError / upgradeUrl)
- FOUND commit: d0971427e (feat(54-02): hook meter_esign_send into lease-signature send path)
- FOUND commit: 7ca4649fa (feat(54-02): surface the over-cap 402 upgrade_url as an actionable prompt)
- CONFIRMED NOT modified: src/types/supabase.ts, .planning/STATE.md, .planning/ROADMAP.md

---
*Phase: 54-e-sign-storage-metering*
*Completed: 2026-07-23*
