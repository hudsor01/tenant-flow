---
phase: 66-rental-application-intake
plan: 01
subsystem: database
tags: [postgres, supabase, rls, migration, pii-retention, fair-housing, tokenized-links]

# Dependency graph
requires:
  - phase: 52-notification-center
    provides: "create_notification() single-writer RPC and notifications_notification_type_check, which this migration extends"
  - phase: e-signature (20260617142623)
    provides: "lease_signing_tokens hashed-token table, the pattern this schema mirrors minus the single-use stamp"
provides:
  - "public.rental_application_links - reusable per-unit public application link with token_hash, owner-readable raw_token, expires_at, revoked_at, submission_count cap counter"
  - "public.rental_applications - the full D-05 applicant column set, four named CHECK constraints, seven indexes, set_updated_at trigger"
  - "RLS posture: three policies total (two owner SELECT, one owner DELETE), zero INSERT/UPDATE policies for any role"
  - "anon revoked at the grant layer on both tables"
  - "notifications_notification_type_check extended to eleven values including application_received"
affects:
  - 66-02 (public apply route)
  - 66-03 (submit Edge Function)
  - 66-04 (owner RPCs - link create/revoke, status mutations, conversion)
  - 66-05 (retention sweep + anonymize_deleted_user extension)
  - 66-06 (the owner-gated apply step for this file)
  - 66-10 (RLS integration tests)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable public token table: hashed lookup key + stored raw value + fail-closed counter, replacing the single-use consumption stamp"
    - "Write-policy-free table: reads via RLS, every write via SECURITY DEFINER RPC, anon revoked at the grant layer"
    - "Retention-compatible nullability: PII columns nullable or placeholder-compatible at the column level, required-ness enforced at write time only"

key-files:
  created:
    - supabase/migrations/20260806120000_rental_applications_schema.sql
  modified: []

key-decisions:
  - "No UPDATE policy on rental_applications at all - stricter than 66-RESEARCH.md's proposed owner-UPDATE-with-WITH-CHECK, removing row re-parenting and applicant_email rewriting as threat classes rather than guarding them"
  - "rental_application_links.unit_id cascades; rental_applications.unit_id set-nulls - opposite policies on the same FK target, because a link to a deleted unit is meaningless but an application is fair-housing evidence"
  - "Migration authored in pure ASCII (no em-dashes) to protect fidelity through plan 66-06's MCP apply_migration hop"

patterns-established:
  - "Pattern 1: a public write surface is closed by absence of policy plus explicit grant revoke, not by RLS alone"
  - "Pattern 2: PII columns that a retention sweep must clear are nullable by design; a reviewer tightening them to NOT NULL is a regression, and the migration header says so"

requirements-completed: [APPLY-01, APPLY-02, APPLY-03, APPLY-05]

# Metrics
duration: 12min
completed: 2026-08-06
---

# Phase 66 Plan 01: Rental Application Schema Summary

**Two-table intake schema authored as a single 459-line migration: a reusable per-unit tokenized link with a fail-closed submission counter, a write-policy-free applications table whose PII columns are nullable specifically so the 730-day retention sweep can clear them, and the `notifications` type CHECK extended to eleven values.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-06T17:12Z
- **Completed:** 2026-08-06T17:20Z
- **Tasks:** 2
- **Files created:** 1

## Accomplishments

- `public.rental_application_links`: mirrors `lease_signing_tokens` minus the single-use consumption stamp (D-01/D-02). `token_hash` is the public lookup key; `raw_token` is stored deliberately (D-03a) so the owner can re-copy a link already posted to a listing; `submission_count` replaces the abuse cap that dropping the single-use stamp removed (D-04a).
- `public.rental_applications`: the complete D-05 column set. Every D-06 forbidden field (SSN, date of birth, government ID, driver's licence, passport, financial account, routing, income classification, marital status, criminal history, per-occupant jsonb) is structurally absent, and the migration carries that prohibition as a written contract rather than an omission.
- Four named `text` + `CHECK` constraints, zero PostgreSQL ENUMs: status vocabulary, the closed-list `disposition_reason`, `occupant_count >= 1`, and the `decided_at` guard that stops a terminal-status row from being aged off its submission date and swept before the 2-year federal fair-housing window.
- Seven indexes including a partial retention index (`where anonymized_at is null and converted_tenant_id is null`) that keeps plan 66-05's nightly sweep bounded.
- RLS with exactly three policies (two owner SELECT, one owner DELETE), no INSERT or UPDATE policy for any role, plus `revoke all ... from anon` on both tables.
- `notifications_notification_type_check` extended from ten to eleven values by appending `application_received`, preserving the ten live values in their production order.

## Task Commits

1. **Task 1: tables, constraints, indexes, trigger** - `15738b324` (feat)
2. **Task 2: RLS, grant lockdown, notification type CHECK** - `985f900e1` (feat)

## Files Created

- `supabase/migrations/20260806120000_rental_applications_schema.sql` - 459 lines. Header block answers the three questions the plan's success criteria demand a reviewer be able to answer without leaving the file: why there is no single-use consumption column, why `raw_token` is stored (with the residual risk stated rather than hidden), and why several form-required columns are nullable.

## Decisions Made

- **No UPDATE policy on `rental_applications`.** `66-RESEARCH.md` proposed an owner UPDATE policy with a `WITH CHECK` guarding `owner_user_id`. The plan overrode that and I implemented the stricter design: every owner mutation routes through owner-gated SECURITY DEFINER RPCs in plan 66-04. This removes the row re-parenting threat class outright and prevents an owner silently rewriting `applicant_email` — the fair-housing record the retention window exists to preserve. **Plan 66-04 must therefore supply RPCs for every owner-side write, including `owner_notes`;** there is no PostgREST fallback.
- **Pure-ASCII migration.** Written with plain hyphens, no em-dashes or other non-ASCII, verified by `grep -P '[^\x00-\x7F]'` returning zero. Plan 66-06 applies this file via Supabase MCP `apply_migration`, and the `edge-deploy-mcp-fidelity` memory records that MCP tool calls corrupt non-ASCII source through model re-emission. Not required by the plan; cheap insurance for the one hop where the file's bytes pass through a model.
- **`reference_1_*` / `reference_2_*` column naming** rather than a `references` column, since `references` is a reserved SQL word (called out in `66-RESEARCH.md`).

## Deviations from Plan

None — plan executed exactly as written. The two ASCII/naming choices above are implementation discretion inside the plan's stated contract, not deviations from it; no deviation rule was invoked.

## Verification

Both automated gates pass, run against the comment-stripped file (`grep -v '^[[:space:]]*--'`) exactly as the plan specifies:

- Task 1 gate: **PASS**. Both `create table` statements present in executable SQL; zero `used_at`; zero D-06 forbidden tokens; `links.unit_id` cascade AND `applications.unit_id` set-null AND `converted_tenant_id` set-null all present; zero `create type`.
- Task 2 gate: **PASS**. Zero `for all`; zero `to anon`; zero `for insert`; zero `for update`; `auth.uid()` line count equals `(select auth.uid())` line count (3 = 3); both `revoke ... from anon` statements present; `'application_received'::text` present with 11 `::text` members.
- Task 1's gate re-run after the Task 2 append: **still PASS** (no regression from the second edit).
- Structural check: 27 statements parse with balanced parentheses at every `;`, no unterminated string literal (single-quote and `--` aware parser). This is a structural check, not a Postgres parse — no local Postgres is installed and production was deliberately not touched.
- `bun run lint`, `bun run typecheck` and the unit suite ran clean via lefthook pre-commit on both commits. No `--no-verify`.

## Issues Encountered

None. No local Postgres exists on this machine (`psql`, `pg_ctl`, `postgres` all absent, no Docker containers), so the migration could not be executed against a real server. That is expected — the plan explicitly forbids applying it here, and plan 66-06 is the gate where real SQL validity is proven.

## Critical Constraint Honoured

**This migration is NOT applied.** No `supabase db push`, no `supabase migration up`, no Supabase MCP tool call of any kind was made during this plan — including read-only ones such as `list_migrations`, which the execution constraint prohibited even though the plan's verification section mentions it. Confirming the migration's absence from production is therefore plan 66-06's first step, not a claim this summary makes.

This separation is load-bearing: `bun run typecheck` and `next build` both pass against a stale generated `src/types/supabase.ts`, so an unapplied migration produces a fully green CI. This project shipped three unapplied migrations that way in v9.0 (2026-07-17).

## Next Phase Readiness

**The column contract is now fixed on disk and nine downstream plans read names from it.** Any rename in a later plan is a breaking change to 66-02 through 66-10.

Carry-forwards for downstream plans:

- **66-03 (Edge Function):** hash the token with `sha256Hex()` in Deno and pass `p_token_hash` already hashed. Per D-15, pgcrypto lives in the `extensions` schema on this project and `digest()` is not reachable from a function pinned to `search_path = public` — an unqualified call fails at first invocation, not at migration time.
- **66-04 (owner RPCs):** must cover *every* owner-side write, because there is no UPDATE policy. Link creation, revocation, status transitions, `owner_notes`, and conversion all need an RPC. The submission cap must be read and incremented under the token row's lock in the same transaction as the insert; that lock is the only fail-closed layer, since `_shared/rate-limit.ts` fails open at `:159`.
- **66-05 (retention sweep):** ages rows from `coalesce(decided_at, created_at)`; `rental_applications_retention_idx` is on `(created_at)` with the partial predicate. Placeholder `'[deleted]'` for the three NOT NULL PII columns, null for the rest. No archive table (D-11c).
- **66-06 (apply):** applies this file via MCP `apply_migration`, then reconciles the repo filename to the prod-assigned timestamp via `list_migrations`, then regenerates `src/types/supabase.ts`.

No blockers.

## Self-Check: PASSED

- `supabase/migrations/20260806120000_rental_applications_schema.sql` — FOUND on disk
- `.planning/phases/66-rental-application-intake/66-01-SUMMARY.md` — FOUND on disk
- Commit `15738b324` — FOUND in git log
- Commit `985f900e1` — FOUND in git log

## Known Stubs

None. This plan produces SQL only; there are no placeholder values, mock data sources or unwired components.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-06*
