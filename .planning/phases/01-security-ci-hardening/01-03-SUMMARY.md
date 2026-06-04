---
phase: 01-security-ci-hardening
plan: 03
subsystem: edge-functions
tags: [timing-safe, constant-time, auth-hook, hook-secret, edge-functions, security, vitest]

# Dependency graph
requires: []
provides:
  - Shared constant-time string compare helper (timingSafeEqualStr) in supabase/functions/_shared/
  - auth-email-send hook-secret check is now constant-time (CISEC-03)
  - CI-gated unit test pinning timingSafeEqualStr equal/unequal/length-mismatch/empty behavior
affects: [auth-email-send, edge-functions, auth-hooks, supabase-auth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract one _shared/timing-safe.ts helper instead of inlining a fourth copy of the crypto.subtle.timingSafeEqual + XOR-fallback pattern (no-duplicate ethos)"
    - "src/ unit test importing a supabase/functions/_shared/ helper across the Deno/Node boundary — typechecks clean under bundler resolution + noEmit; runs in the checks gate"
    - "Feature-detect crypto.subtle.timingSafeEqual via an `as unknown as` runtime shim (feature-detection, NOT an RPC boundary — outside CLAUDE.md rule #8 scope)"

key-files:
  created:
    - supabase/functions/_shared/timing-safe.ts
    - src/lib/__tests__/timing-safe.test.ts
  modified:
    - supabase/functions/auth-email-send/index.ts

key-decisions:
  - "Took the src/ test path (NOT the Deno fallback): the cross-boundary import typechecked clean on the FIRST `bun run typecheck`, so the test lives under src/lib/__tests__/ and runs in the checks/unit gate as planned"
  - "Imported the helper in the test WITHOUT the `.ts` extension (../../../supabase/functions/_shared/timing-safe) so Vite/tsc bundler resolution resolves it; the Edge Function import keeps the `.ts` extension Deno requires"
  - "Raw-secret compare only — did NOT HMAC the token (auth-email-send compares the shared secret directly; HMAC would break the Supabase Auth Hook config)"
  - "Length early-return on mismatch is intentional and acceptable (secret length is not itself secret; matches all three existing inline helpers)"

patterns-established:
  - "Constant-time secret comparisons in Edge Functions go through _shared/timing-safe.ts timingSafeEqualStr; new shared-secret checks should reuse it rather than inlining"

requirements-completed: [CISEC-03]

# Metrics
duration: 8min
completed: 2026-06-04
---

# Phase 1 Plan 03: Constant-Time Hook-Secret Compare Summary

**Extracted a shared `timingSafeEqualStr` helper (lifting the resend-webhook `crypto.subtle.timingSafeEqual` + XOR-fallback pattern) and swapped `auth-email-send`'s `token !== hookSecret` short-circuit compare for `!timingSafeEqualStr(token, hookSecret)`, closing the timing side-channel on `SUPABASE_AUTH_HOOK_SECRET` while preserving the byte-for-byte 401-on-mismatch contract.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-04T13:08:00Z
- **Completed:** 2026-06-04T13:16:00Z
- **Tasks:** 2
- **Files:** 2 created, 1 modified

## Accomplishments
- Closed CISEC-03: `auth-email-send` now compares the Auth-Hook secret in constant time, so response timing no longer leaks how many leading secret bytes matched (mitigates T-01-06 Information Disclosure and hardens T-01-07 forged-POST spoofing).
- Created `supabase/functions/_shared/timing-safe.ts` exporting `timingSafeEqualStr(a, b)` — lifts the proven `resend-webhook/index.ts:145-168` pattern: `TextEncoder` encode, length-mismatch early-return, `crypto.subtle.timingSafeEqual` when available (feature-detected via a runtime shim), XOR-loop fallback with `?? 0` index guards.
- One-line swap in `auth-email-send/index.ts`: condition `token !== hookSecret` → `!timingSafeEqualStr(token, hookSecret)` plus the `../_shared/timing-safe.ts` import. The 401 body, `captureWebhookError`, and the `validateEnv` startup guard are unchanged.
- Pinned the helper behavior in `src/lib/__tests__/timing-safe.test.ts` (6 cases: equal, unequal-same-length, different-length, empty-equal, longer-secret-equal, final-byte-differs) — runs in the `checks`/`unit` gate.

## Test-Location Decision: `src/` path (NOT the Deno fallback)

The plan flagged this as the first `src/` test importing a `supabase/functions/` Deno helper and instructed running `bun run typecheck` EARLY, falling back to a Deno-only test if the Node tsconfig rejected the cross-boundary import.

**Outcome: the `src/` path held.** The first `bun run typecheck` after writing both files passed clean — the Deno helper imports nothing Deno-specific (only `TextEncoder` + `crypto.subtle`, both present in Node/jsdom), and the project's `bundler` moduleResolution + `noEmit: true` accept the cross-boundary import. The test imports the helper WITHOUT the `.ts` extension (`../../../supabase/functions/_shared/timing-safe`) so Vite/tsc resolve it; the Edge Function keeps the `.ts` extension Deno requires. No Deno-only fallback test was created; `files_modified` matches the plan as written.

## Verification

- `bun run test:unit src/lib/__tests__/timing-safe.test.ts` → 6 passed (1 file).
- `grep -n "token !== hookSecret" supabase/functions/auth-email-send/index.ts` → no match (regression guard satisfied).
- `grep -c "timingSafeEqualStr" supabase/functions/auth-email-send/index.ts` → 2 (import + call site).
- `grep -c 'from "../_shared/timing-safe.ts"' supabase/functions/auth-email-send/index.ts` → 1.
- `grep -c "export function timingSafeEqualStr" supabase/functions/_shared/timing-safe.ts` → 1.
- `bun run typecheck` → clean (rc=0).
- `bun run lint` → clean (rc=0; the single biome `migrate` info is pre-existing/out-of-scope).
- Full lefthook pre-commit gate (gitleaks, lockfile-verify, typecheck, unit-tests w/ 80% coverage threshold, lint, commitlint) ran on both commits — NEVER `--no-verify`.

## Deviations from Plan

**1. [Rule 3 - Blocking] `bun run test:unit -- --run <file>` crashed (duplicate `--run`)**
- **Found during:** Task 1 verification.
- **Issue:** The plan's verify command `bun run test:unit -- --run <file>` failed because the `test:unit` package script already injects `--run`; vitest's CAC parser rejects the duplicated flag ("Expected a single value for option `--run`").
- **Fix:** Invoked as `bun run test:unit <file>` (no second `--run`). Behavior-equivalent — vitest still runs once, non-watch. No source change.
- **Files modified:** none.

**2. [Rule 1 - Format] Biome formatting on the test's multi-line `expect(...).toBe(false)`**
- **Found during:** Task 1 commit (lefthook `lint` step aborted the first commit).
- **Issue:** The hand-written multi-line `expect(timingSafeEqualStr(...)).toBe(\n  false,\n)` block did not match biome's preferred wrap.
- **Fix:** Ran `biome check --write` on the new test file; re-staged and committed. Auto-format only, no semantic change.
- **Files modified:** src/lib/__tests__/timing-safe.test.ts (formatting).
- **Commit:** 2dc4c07ac (final committed form).

## Post-Merge Follow-Up (not part of the merge gate)

The Edge Function must be redeployed out-of-band after merge (`bun scripts/deploy-edge-functions.ts`) — there is no CI deploy step for Edge Functions. Until then, the running prod `auth-email-send` keeps the old `!==` compare. The merge gate is the source change + tests; deployment is the documented follow-up dance.

## Commits

- `2dc4c07ac` feat(01-03): add shared timingSafeEqualStr constant-time compare helper
- `3a779e516` fix(01-03): constant-time hook-secret compare in auth-email-send (CISEC-03)

## Self-Check: PASSED

- FOUND: supabase/functions/_shared/timing-safe.ts
- FOUND: src/lib/__tests__/timing-safe.test.ts
- FOUND: supabase/functions/auth-email-send/index.ts (modified)
- FOUND commit: 2dc4c07ac
- FOUND commit: 3a779e516
