---
phase: 66
slug: rental-application-intake
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-06
updated: 2026-08-06
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Wave 0 note.** This phase creates no separate scaffolding wave. Every plan that
> produces code also produces its own tests in the same plan, so no task references a test
> file that does not yet exist at the moment it runs. The `MISSING — Wave 0 must create X`
> escape hatch is therefore unused here, deliberately: a separate scaffold wave would
> create empty test files whose green result means nothing.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit framework** | Vitest 4 + jsdom (`vitest.config.ts`, project `unit`) |
| **Integration framework** | Vitest, project `integration` — dual-client RLS **against production** |
| **E2E framework** | Playwright 1.62.0 (`tests/e2e/playwright.config.ts`, baseURL `localhost:3050`) |
| **Edge Function tests** | Deno (`supabase/functions/tests/`) — **Deno is not installed locally**, so this phase does not add any. See the workaround below. |
| **Quick run command** | `bun run test:unit` |
| **Single file** | `bun run test:unit -- --run <path>` |
| **Full suite command** | `bun run validate:quick` (typecheck + lint + unit) |
| **Integration** | `bun run test:integration` |
| **E2E** | `bun run test:e2e` |
| **Estimated runtime** | unit ~60s · integration ~180s (hits prod) · e2e ~240s |

**The Deno workaround, and why it is not a compromise.** Deno is not installed on this
machine, so the Edge Function's logic is not testable as a Deno module. Rather than skip
it, plan 66-02 puts every pure decision — honeypot, timing guard, strict payload
validation — in `supabase/functions/_shared/application-guards.ts`, a **leaf module with
zero imports and no `Deno.` references**. `vitest.config.ts` already includes
`supabase/functions/__tests__/**`, and `tsconfig.json` already includes it in the root TS
program, so a Vitest test imports that module directly and exercises real behaviour. Only
orchestration stays in the Deno entrypoint, and that is covered by a source-reading
contract guard (plan 66-07) plus live boundary checks against the deployed function
(plans 66-08 and 66-10).

---

## Sampling Rate

- **After every task commit:** `bun run test:unit` — already enforced by lefthook
  pre-commit alongside 80% coverage, typecheck, lint and gitleaks.
- **After every wave:** `bun run validate:quick`, plus `bun run test:integration` for any
  wave that touched SQL (waves 2, 3, 5).
- **Before `/gsd:verify-work`:** unit + integration + `bun run test:e2e` all green.
  **E2E is non-optional this phase** — it is the only layer that proves the applicant
  surface renders correctly, and jsdom computes no layout.
- **Max feedback latency:** 60s (unit), 240s (full).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | APPLY-01/02/05 | T-66-12/13/15 | No `used_at`; no D-06 forbidden column; correct FK delete rules | source gate | `grep` gates in plan 66-01 T1 | ✅ | ⬜ pending |
| 66-01-02 | 01 | 1 | APPLY-02/03 | T-66-04/14/19 | Zero `FOR ALL`, zero anon policy, zero INSERT/UPDATE policy, anon revoked | source gate | `grep` gates in plan 66-01 T2 | ✅ | ⬜ pending |
| 66-02-01 | 02 | 1 | APPLY-02 | T-66-08/11 | Unknown-key rejection (`ssn` → `unknown_field`), honeypot + timing guards | unit | `bun run test:unit -- --run supabase/functions/__tests__/application-guards.test.ts` | ✅ | ⬜ pending |
| 66-02-02 | 02 | 1 | APPLY-02 | T-66-11 | Strict zod; bidirectional parity with the Deno validator | unit | `bun run test:unit -- --run src/lib/validation/__tests__/rental-applications.test.ts supabase/functions/__tests__/application-payload-parity.test.ts` | ✅ | ⬜ pending |
| 66-02-03 | 02 | 1 | APPLY-06/03 | T-66-02/09 | Seven APPLY-06 promises individually asserted; unavailable copy names no token state | unit | `bun run test:unit -- --run src/lib/applications/__tests__/application-copy.test.ts` | ✅ | ⬜ pending |
| 66-03-01 | 03 | 1 | APPLY-01 | T-66-10/17/18 | `/applications` gated, `/apply` reachable — both via the proxy's own boundary predicate | unit | `bun run test:unit -- --run src/app/robots.test.ts` | ✅ | ⬜ pending |
| 66-03-02 | 03 | 1 | APPLY-03 | — | Flat nav entry present at both consumers | source gate | `grep` gates in plan 66-03 T2 | ✅ | ⬜ pending |
| 66-03-03 | 03 | 1 | APPLY-03 | — | No bare vivid token as text | source gate | `grep` gate in plan 66-03 T3 | ✅ | ⬜ pending |
| 66-04-01 | 04 | 2 | APPLY-01 | T-66-01/02/19 | pgcrypto schema-qualified; ownership gate; non-enumerating errors | source gate | `grep` gates in plan 66-04 T1 | ✅ | ⬜ pending |
| 66-04-02 | 04 | 2 | APPLY-02 | T-66-05/02/11/20 | Caps under `FOR UPDATE`; idempotent insert; `create_notification` single-writer; no owner contact | source gate + integration | plan 66-04 T2 gates; behaviour in 66-10 | ✅ | ⬜ pending |
| 66-04-03 | 04 | 2 | APPLY-03/04 | T-66-14/13/20 | 7/7/7 revoke/grant/search_path; conversion refuses a second mint | source gate + integration | plan 66-04 T3 gates; behaviour in 66-10 | ✅ | ⬜ pending |
| 66-05-01 | 05 | 2 | APPLY-05 | T-66-12/13/21/23/24 | No archive table; three-condition predicate; 730 fallback; free cron slot | source gate + integration | plan 66-05 T1 gates; behaviour in 66-10 T3 | ✅ | ⬜ pending |
| 66-05-02 | 05 | 2 | APPLY-05 | T-66-22/26 | Cascade covers both tables; pre-existing body preserved | source gate + integration | plan 66-05 T2 gates; behaviour in 66-10 T3 | ✅ | ⬜ pending |
| 66-06-01 | 06 | 3 | APPLY-01..05 | T-66-24/26 | Human authorization before an irreversible production write | **manual (blocking)** | — see Manual-Only table | n/a | ⬜ pending |
| 66-06-02 | 06 | 3 | APPLY-01..05 | T-66-25/26 | Four migrations live; filenames reconciled to prod versions | live query | `mcp__supabase__list_migrations` + `information_schema` / `pg_proc` / `cron.job` counts | n/a | ⬜ pending |
| 66-06-03 | 06 | 3 | APPLY-01/02 | T-66-27/28 | pgcrypto callable; `application_received` accepted by the CHECK | live smoke | `bun run db:types && bun run typecheck` + two recorded RPC smokes | n/a | ⬜ pending |
| 66-07-01 | 07 | 3 | APPLY-02 | T-66-02/07 | CORS preflight first; env inside handler; hash in Deno; two context buckets | source gate | `grep` gates in plan 66-07 T1 | ✅ | ⬜ pending |
| 66-07-02 | 07 | 3 | APPLY-02 | T-66-06/08/11 | IP-keyed submit limit; guard ordering; no resend import | source gate + `awk` order gate | plan 66-07 T2 gates | ✅ | ⬜ pending |
| 66-07-03 | 07 | 3 | APPLY-02 | T-66-29 | `verify_jwt=false` + `import_map` inside the correct block; ordering assertion | unit | `bun run test:unit -- --run supabase/functions/__tests__/apply-token-contract.test.ts` | ✅ | ⬜ pending |
| 66-08-01 | 08 | 4 | APPLY-02 | T-66-30/31 | Disk-reading deploy, never MCP model-emitted source | **manual (blocking)** | — see Manual-Only table | n/a | ⬜ pending |
| 66-08-02 | 08 | 4 | APPLY-02 | T-66-30/31/32/08 | Byte-identical deploy; runs without JWT; CORS both directions; honeypot writes zero rows | live curl + SQL | plan 66-08 T2 automated block | n/a | ⬜ pending |
| 66-09-01 | 09 | 4 | APPLY-03/04 | T-66-33/34/35 | Typed mapper, no casts; `count: 'exact'`; dashboard invalidation | unit | `bun run test:unit -- --run src/hooks/api/query-keys/__tests__/application-keys.test.ts` | ✅ | ⬜ pending |
| 66-09-02 | 09 | 4 | APPLY-01 | T-66-44/47 | Revoked-over-expired ordering; URL from `NEXT_PUBLIC_APP_URL` | unit | `bun run test:unit -- --run src/hooks/api/query-keys/__tests__/application-link-keys.test.ts` | ✅ | ⬜ pending |
| 66-10-01 | 10 | 5 | APPLY-01 | T-66-01/36 | Token shape + hash recomputed in Node; re-copyability; owner isolation | integration | `bun run test:integration -- --run tests/integration/rls/rental-application-links.rls.test.ts` | ✅ | ⬜ pending |
| 66-10-02 | 10 | 5 | APPLY-02/03/04 | T-66-04/05/36/20 | **anon + authenticated write denial**; caps under `Promise.all`; conversion edges | integration | `bun run test:integration -- --run tests/integration/rls/rental-applications.rls.test.ts` | ✅ | ⬜ pending |
| 66-10-03 | 10 | 5 | APPLY-05 | T-66-12/21/22/23/37 | 26-column sweep; config default; no archive; cascade | integration | `bun run test:integration -- --run tests/integration/rls/rental-applications-retention.test.ts` | ✅ | ⬜ pending |
| 66-11-01 | 11 | 4 | APPLY-01 | T-66-02/38 | No per-reason message map; `no-store` | unit | `bun run test:unit -- --run "src/app/apply/[token]/__tests__/apply-context.test.ts"` | ✅ | ⬜ pending |
| 66-11-02 | 11 | 4 | APPLY-01/06 | T-66-02/10/11/38 | RSC purity; `noindex`; one unavailable card; no owner contact | source gate | `grep` gates in plan 66-11 T2 | ✅ | ⬜ pending |
| 66-12-01 | 12 | 5 | APPLY-02 | — | `inputSize="lg"`, no `Select`, no `space-y-` | source gate | `grep` gates in plan 66-12 T1 | ✅ | ⬜ pending |
| 66-12-02 | 12 | 5 | APPLY-02/06 | T-66-41/11 | One `<h3>`, no card, no `Select` in Income; occupant count only | source gate | `grep` gates in plan 66-12 T2 | ✅ | ⬜ pending |
| 66-12-03 | 12 | 5 | APPLY-02/06 | T-66-40/08/06/42/11 | No client persistence; no inline styles; 429 keeps state; forbidden-field absence | unit | `bun run test:unit -- --run src/components/applications/__tests__/rental-application-form.test.tsx` | ✅ | ⬜ pending |
| 66-13-01 | 13 | 5 | APPLY-03 | T-66-09/56 | Row link classes, `min-w-0`, list neutralizers | source gate | `grep` gates in plan 66-13 T1 | ✅ | ⬜ pending |
| 66-13-02 | 13 | 5 | APPLY-03 | T-66-17 | RSC page; `/applications` present in the deny-list | source gate | `grep` gates in plan 66-13 T2 | ✅ | ⬜ pending |
| 66-13-03 | 13 | 5 | APPLY-03 | T-66-35/43 | Total from `count`; both empty states distinct; no `PGRST` leak | unit | `bun run test:unit -- --run src/components/applications/__tests__/application-queue.test.tsx` | ✅ | ⬜ pending |
| 66-14-01 | 14 | 6 | APPLY-01 | T-66-44/45/46/47 | URL from env; revoke confirm names its consequence | source gate | `grep` gates in plan 66-14 T1 | ✅ | ⬜ pending |
| 66-14-02 | 14 | 6 | APPLY-01 | T-66-15/45/47 | Full-URL assertion; re-copyability across re-render; confirm gating | unit | `bun run test:unit -- --run src/components/applications/__tests__/application-link-panel.test.tsx` | ✅ | ⬜ pending |
| 66-15-01 | 15 | 6 | APPLY-03/04 | T-66-11/50 | Conversion href carries id only; anonymized cards suppressed | source gate | `grep` gates in plan 66-15 T1 | ✅ | ⬜ pending |
| 66-15-02 | 15 | 6 | APPLY-03 | T-66-16/48 | Closed disposition vocabulary; no IP/UA rendered | source gate | `grep` gates in plan 66-15 T2 | ✅ | ⬜ pending |
| 66-15-03 | 15 | 6 | APPLY-03/04 | T-66-11/16/50 | Anchored href regex; three action-bar states; confirmation gating | unit | `bun run test:unit -- --run src/components/applications/__tests__/application-detail.test.tsx` | ✅ | ⬜ pending |
| 66-16-01 | 16 | 5 | APPLY-04 | T-66-51/54 | `initialValues` at BOTH call sites; merge not replace | source gate | `grep` gates in plan 66-16 T1 | ✅ | ⬜ pending |
| 66-16-02 | 16 | 5 | APPLY-04 | T-66-20/53 | `already_converted` is not an error; duplicate notice never blocks | source gate | `grep` gates in plan 66-16 T2 | ✅ | ⬜ pending |
| 66-16-03 | 16 | 5 | APPLY-04 | T-66-51/54/20 | Five-key equality; modal path asserted independently | unit | `bun run test:unit -- --run src/components/tenants/__tests__/add-tenant-form-prefill.test.tsx "src/app/(owner)/@modal/(.)tenants/new/page.test.tsx"` | ✅ | ⬜ pending |
| 66-17-01 | 17 | 7 | APPLY-01/02/06 | T-66-02/08/10/11/42 | **E-1, E-6, E-7, E-8, E-9, E-10 — requirement-level, non-optional** | **E2E** | `bun run test:e2e -- tests/e2e/tests/public/apply-token.spec.ts` | ✅ | ⬜ pending |
| 66-17-02 | 17 | 7 | APPLY-03/04 | T-66-56/11 | E-17..E-21 computed-style and anchored-href assertions | **E2E** | `bun run test:e2e -- tests/e2e/tests/owner/applications.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity check:** the longest run of consecutive tasks without a
Vitest/Playwright `<automated>` command is 3 (66-04-01 → 66-05-01, all SQL-authoring
tasks whose behaviour is proven in 66-10). Each of those three still carries a
non-vacuous source gate that runs in under a second, and every one of them has a named
behavioural test downstream in plan 66-10. No task is unverified.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Vitest, the RLS integration
harness and Playwright are all present and configured; `supabase/functions/__tests__/` is
already inside both the Vitest `include` and the root `tsconfig` `include`, so no config
change is needed for the Deno-logic workaround.

No framework install. **Deno is deliberately not installed** — the leaf-module extraction
in plan 66-02 removes the need, and it gives faster feedback than a Deno test would.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authorizing the production migration | APPLY-01..05 | Irreversible write to production; no local Supabase stack and no staging environment exist | Plan 66-06 Task 1: read all four migration files, run `select jobname, schedule from cron.job order by schedule;` to confirm `35 3 * * *` is free, then reply `apply` |
| Deploying `apply-token` | APPLY-02 | `supabase functions deploy` 401s against a PAT that works for `projects list`; the deploy is an owner-run residual in this project | Plan 66-08 Task 1: `bun scripts/deploy-edge-functions.ts apply-token`, then curl for HTTP 200 + `x-deno-execution-id` |
| The 730-day window is *legally* correct | APPLY-05 | Not a testable property. The statute citations are in the migration header; a human reviews them | Read `42 U.S.C. § 3610(a)(1)(A)(i)`, `§ 3613(a)(1)(A)` and `§ 3613(a)(1)(B)` as quoted in `20260806122000_rental_applications_retention.sql` |
| pg_cron actually fires at 03:35 UTC | APPLY-05 | No test can wait a day | Plan 66-10 asserts the `cron.job` row exists; confirm the first live run via `cron.job_run_details` post-deploy |
| Meta `noindex` honoured by Google | APPLY-01 | External system | E-9 asserts the tag renders; confirm in Search Console after the first crawl |
| Rate limit fires at the right threshold in production | APPLY-02 | Upstash is external and fails open by design | Scripted burst against the deployed function; assert 429 + `Retry-After`. Not a merge gate — the DB cap (66-10 assertion 8) is the enforced bound |
| Visual pass on `/apply` at 375px | APPLY-06 | `[UAT]` items from `66-UI-SPEC.md` §A-4: the shared `Checkbox` renders 44×44 at ≤768px, so confirm the oversized control still reads as aligned against the two-line attestation label | Load `/apply/<valid>` at 375px with a real device or Playwright `channel:"chrome"`; record in the phase UAT doc |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a Manual-Only entry with instructions
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify (longest run is 3, all with sub-second source gates plus named downstream behavioural tests)
- [x] Wave 0 covers all MISSING references — none exist; every plan ships its own tests
- [x] No watch-mode flags (`--run` everywhere)
- [x] Feedback latency < 60s for the unit loop
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-06
