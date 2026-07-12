# Phase 6 Summary — Auth & Dollar-Hook Unit Tests (TEST-03)

**Status:** Complete (workflow-orchestrated under ultracode)
**Branch:** gsd/phase-6-auth-dollar-hook-tests

## What shipped
107 passing unit tests across the 6 TEST-03 hooks (5 new files + 1 extended), authored + adversarially reviewed via a 2-stage workflow fan-out (one agent per hook: author-to-green, then an independent reviewer re-derived correctness from source and hardened false-greens).

| Hook | File | Cases | Notes |
|------|------|-------|-------|
| use-auth-mutations | `__tests__/use-auth-mutations.test.tsx` (new, 552L) | 16 | all 3 `useChangePasswordMutation` reject branches + happy; signup `confirmed_at` branch + field mapping; login/logout/reset/updateProfile success+error + exact cache invalidation |
| use-mfa | `__tests__/use-mfa.test.tsx` (new, 477L) | 15 | enroll field mapping + custom friendlyName; verify challenge→verify order + both error branches; unenroll; status/factors mapping+error |
| use-sessions | `__tests__/use-sessions.test.tsx` (new, 560L) | 17 | all 4 revoke routing paths (current-signOut / non-current-RPC / decode-failed fast-path / post-RPC re-decode signOut) + getUser-error + not-authenticated + optimistic remove/rollback |
| use-expense-mutations | `__tests__/use-expense-mutations.test.tsx` (new, 449L) | 12 | create/delete invalidate EXACTLY `[expenseKeys.all, financialKeys.all, ownerDashboardKeys.all]` (spied); select unwrap; DOLLAR forwarded unchanged; default tax year |
| use-report-mutations | `__tests__/use-report-mutations.test.tsx` (new, 544L) | 15 | PaywallError→Upgrade-toast CTA (`action.onClick`→`window.location.assign`); non-paywall fallthrough; `callGeneratePdfFromHtml` no-auth/fetch-fail/blob-download; 4 download hooks |
| use-reports | `__tests__/use-reports.test.tsx` (extended 473→1124L) | 32 | + per-query error paths + 7 dollar-magnitude tests seeding odd values (12345.67 etc.) that drift if cents math leaks |

## Correctness
- **No false-greens:** the review stage independently re-derived every branch from source and tightened trivially-passing assertions (e.g. the auth reviewer alone hardened 6: pinning the exact error-handler routing + the user-facing toast bodies per signup branch + dual-fire guards). Mocks at the `#lib/supabase/client` factory + named-lib boundaries; `vi.hoisted()`; chai-6-safe `.rejects.toMatchObject`.
- **Dollar correctness (phase intent):** asserts amounts flow through the read + mutation boundaries as dollars with NO `*100`/`/100` cents conversion (cents live only at the Stripe boundary, which is not these hooks). Odd-magnitude seeds make any leaked cents math visibly fail.

## Verification
- All 6 files green together: `Tests 107 passed (107)` (2.2s).
- Both commits passed the full lefthook gate (gitleaks, lockfile, unit-tests + **coverage**, lint, typecheck) — coverage threshold (80%) held; new tests only raise it.
- No production code changed (test-only); no `any`/`as unknown as`/barrel.

## Notes
- Workflow surfaced a repo quirk: `bun run test:unit -- --run <file>` errors (the `test:unit` script already injects `--run`); correct single-file form is `bun run test:unit -- <file>`.
- 2 commits (auth group / dollar group) to limit full-suite lefthook runs.
