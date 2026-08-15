---
phase: 66-rental-application-intake
plan: 05
subsystem: database
tags: [postgres, supabase, migration, pii-retention, pg-cron, gdpr, fair-housing]

# Dependency graph
requires:
  - phase: 66-01
    provides: "public.rental_applications and public.rental_application_links - the exact column names, the retention-compatible nullability, the partial retention index, and the closed disposition_reason vocabulary this sweep depends on"
  - phase: 52-notification-center
    provides: "anonymize_deleted_user's C2 fix (notifications_archive delete) - the body this plan redefines and must preserve"
  - phase: n8n-config (20260504162155)
    provides: "public.app_config service-role-only key/value table and its on-conflict-do-nothing seed convention"
provides:
  - "app_config key applications.retention_days seeded to 730, operator-raisable without a migration"
  - "public.anonymize_old_rental_applications() - batched, config-driven, converted-row-excluding PII sweep returning the row count"
  - "cron job anonymize-rental-applications at 35 3 * * *, behind a cron.unschedule idempotence guard"
  - "public.anonymize_deleted_user(uuid) extended to hard-delete both rental application tables"
affects:
  - 66-06 (the owner-gated apply step for both files, and the mandatory pg_get_functiondef reconcile)
  - 66-10 (integration tests for the default-window path and the cascade)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deliberate deviation from archive-then-delete: a PII sweep writes no second copy, gated by a zero-occurrence grep on 'archive' in executable SQL"
    - "Double fallback on a config-driven interval (nullif for empty string, coalesce for missing row) so a NULL window cannot fail open silently"
    - "create-or-replace migration that names the live definition as authoritative and instructs the apply step to reconcile before applying"

key-files:
  created:
    - supabase/migrations/20260806122000_rental_applications_retention.sql
    - supabase/migrations/20260806123000_rental_applications_gdpr_cascade.sql
  modified: []

key-decisions:
  - "Stated plainly in the migration that research's cron ordering justification is FALSE at :35 rather than repeating it - process-account-deletions is at :45, so the sweep runs ten minutes BEFORE the cascade, and the file explains why that is harmless instead of inventing a rationale"
  - "Revoked the sweep from public, anon AND authenticated rather than the plan's 'from public' alone, matching the newest batch-job precedent (claim_lease_reminders, 20260722005310)"
  - "Ordered the two cascade deletes applications-then-links so the ON DELETE SET NULL on link_id never fires against rows being deleted in the same block"

patterns-established:
  - "Pattern 1: when a retention job must NOT follow the project-wide archive-then-delete norm, the deviation and its reasoning live in the migration header and are enforced by a grep gate, because the sibling jobs are what an executor will pattern-match on"
  - "Pattern 2: a create-or-replace of a shipped function carries an explicit reconcile-against-live instruction naming pg_get_functiondef, because create or replace silently deletes anything the repo copy has drifted away from"

requirements-completed: [APPLY-05]

# Metrics
duration: 11min
completed: 2026-08-06
---

# Phase 66 Plan 05: Rental Application Retention and GDPR Cascade Summary

**Two authored-not-applied migrations: a config-driven 730-day PII sweep that clears 29 applicant columns in place with no archive table anywhere, scheduled at the free 3 AM :35 slot; and `anonymize_deleted_user` extended by exactly two hard deletes, with the function body verified byte-for-byte identical to its last recorded definition apart from those two lines.**

## Performance

- **Duration:** ~11 min
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 0

## Task Commits

1. **Task 1: the anonymize sweep and its cron slot** - `bb4e99720` (feat)
2. **Task 2: extend the GDPR cascade to both new tables** - `8f49d57a0` (feat)

## The clear-vs-placeholder split, and why each column falls where it does

This is the decision most likely to diverge from precedent, so it is stated explicitly.

The sweep follows the **mixed strategy** that `anonymize_deleted_user` established in `20260720015620` and does not invent a second convention: **placeholder where the column is `NOT NULL`, hard `NULL` where it is nullable.** Wave 1 authored the schema around exactly this and said so in its own header - the nullability of the form-required PII columns IS the retention mechanism, which is why nothing was "tightened".

**Placeholdered to `'[deleted]'` - 3 columns.** These are `NOT NULL` in `20260806120000` and therefore physically cannot be nulled; the placeholder is the only way to clear them without violating the constraint. Wave 1 calls them "placeholder-compatible" for this reason.

- `applicant_first_name`
- `applicant_last_name`
- `applicant_email`

**Nulled - 26 columns.** Every one is nullable in `20260806120000`. Several are *required on the form* (phone, move-in date, address block, income, reference 1); their nullability at the column level exists solely so this sweep can clear them, with required-ness enforced at write time by the Edge Function validator and the submit RPC.

`applicant_phone`, `desired_move_in_date`, `current_street`, `current_city`, `current_state`, `current_postal_code`, `current_landlord_name`, `current_landlord_phone`, `reason_for_moving`, `gross_monthly_income`, `employer_name`, `employer_role`, `employer_months`, `other_income_source`, `other_income_amount`, `pet_details`, `vehicle_details`, `reference_1_name`, `reference_1_relationship`, `reference_1_phone`, `reference_2_name`, `reference_2_relationship`, `reference_2_phone`, `owner_notes`, `submitted_ip`, `submitted_user_agent`

`owner_notes` deserves its own line: it is owner-authored free text, not applicant-typed, and it is cleared anyway because it routinely restates applicant PII. Clearing it costs no defensibility precisely because `disposition_reason` - a closed seven-value vocabulary that cannot become free-text PII - survives in its place (D-11d).

**Verified mechanically, not by eye.** The 29 columns the sweep touches were diffed against the 29 PII columns declared in `20260806120000`: the sets match exactly, with `anonymized_at` as the only additional column written (the stamp). No PII column was missed and none outside the schema's PII block was touched.

**Retained stub - 16 columns:** `id`, `owner_user_id`, `link_id`, `unit_id`, `property_label`, `unit_label`, `submission_id`, `status`, `decided_at`, `disposition_reason`, `converted_tenant_id`, `converted_at`, `occupant_count`, `certified_at`, `created_at`, `anonymized_at`. `updated_at` is also bumped, by the existing `set_updated_at` trigger, not by the sweep.

## Accomplishments

### Task 1 - `20260806122000_rental_applications_retention.sql`

- **The window is 730 days and the statute is in the file.** The header carries 42 U.S.C. 3610(a)(1)(A)(i) (1-year HUD complaint), 3613(a)(1)(A) with the "not later than 2 years after the occurrence or the termination of an alleged discriminatory housing practice" quotation, and the 3613(a)(1)(B) tolling rule, plus the sentence that 180 days was shorter than the shortest filing window that exists. A future "tighten privacy" PR has to argue against primary source, in the file it is editing.
- **Config-driven, not hardcoded.** `app_config('applications.retention_days','730')` seeded with `on conflict (key) do nothing`, so re-applying the migration cannot walk an operator-raised jurisdictional value (CA/WA guidance supports 1460) back down to 730. The header spells out the one-line `update` that raises it.
- **Double fallback, and the header explains why neither half is redundant.** `nullif(value,'')` covers a row that exists with an empty string - which is how every other seeded config key in this project starts life - and the following `coalesce(v_days, 730)` covers the row being absent entirely. Without both, `make_interval` returns NULL, the predicate is never true, and the sweep anonymizes nothing forever with no error and no log line (T-66-23).
- **Three-condition predicate, each condition commented.** `anonymized_at is null` (do not burn a 10000-row batch re-clearing empty rows), `converted_tenant_id is null` (a converted applicant's data is governed by the tenant record, not this clock), and `coalesce(decided_at, created_at)` (decided rows age from the decision, ignored ones from submission - safe because `rental_applications_decided_at_check` guarantees a terminal-status row always has `decided_at`).
- **Batched `limit 10000` + `for update skip locked`**, matching `cleanup_old_notifications`. The partial index `rental_applications_retention_idx` satisfies conditions (1) and (2) from its own predicate.
- **No archive table, and the header says why at length.** This job knowingly deviates from CLAUDE.md's archive-then-delete norm because archiving would preserve verbatim the PII the sweep exists to remove - the C2 bug in a new costume. The header opens with "do not make this consistent with the other retention jobs. Consistency here is the bug."
- **Scheduled** at `'35 3 * * *'` behind a `cron.unschedule ... where exists` guard, with a single `select public.anonymize_old_rental_applications()` as the third argument.

### Task 2 - `20260806123000_rental_applications_gdpr_cascade.sql`

- `anonymize_deleted_user(uuid)` redefined with the pre-existing body plus exactly two statements, placed with the other deletes.
- **The body was diffed, not trusted.** A programmatic unified diff against `20260720015620:25-64` returns only the two added deletes and their comment - the active-lease guard, the properties deactivation, the activity redaction, both notifications deletes (live and `_archive`), the preferences and settings deletes and the users-row redaction are byte-for-byte intact, including `set search_path to 'public'` in the live quoted form.
- **The active-lease guard is untouched.** No application-shaped clause was added; an owner whose only outstanding item is an unreviewed application can still delete their account.
- **Header carries the reconcile instruction plan 66-06 must execute**, numbered and unambiguous: fetch `pg_get_functiondef('public.anonymize_deleted_user(uuid)'::regprocedure)`, diff it against this body, and on any difference the live body wins and this file is updated before applying.

## Decisions Made

- **The cron ordering claim was checked and is false, so it is not repeated.** The plan flagged research's justification ("`:35` runs after `process-account-deletions`") for verification and said to state the truth plainly rather than invent a rationale. `process-account-deletions` is scheduled at `:45` (`20260306180000_gdpr_anonymize_cascade.sql:230`, restated in `20260606205922_cron_stagger_index_cleanup.sql:6`, and consistent with D-16's live reading of the occupied minutes). So the sweep runs **ten minutes before** the cascade, not after. The header says exactly that, and then explains why it does not matter: the cascade hard-deletes a departing owner's applications, so a sweep running first anonymizes rows the cascade then removes, and a sweep running second finds nothing left. The only requirement on the slot is that it be free, and `:35` is.

  **Verification limit, stated rather than hidden:** this was verified against the repo's two migration sources and D-16's recorded production reading of 2026-08-06, not against a live `cron.job` query - the execution constraint forbade every Supabase MCP call, including read-only ones. Plan 66-06 can confirm at apply time.

- **Grant discipline widened beyond the plan's literal text.** The plan specified `revoke all on function ... from public`. Written as `from public, anon, authenticated`, matching the newest batch-job precedent in the repo (`claim_lease_reminders`, `20260722005310`) rather than the older `cleanup_old_notifications` form. Strictly a superset of what was asked; it closes the case where a project-level `alter default privileges` has granted execute to a client role directly rather than via `PUBLIC`.

- **Delete order inside the cascade: applications first, links second.** `rental_applications.link_id` is `ON DELETE SET NULL` against `rental_application_links`, so deleting links first would run a pointless set-null pass over rows being deleted moments later. The plan's snippet already had this order; the reasoning is now recorded in the file.

- **No grants re-issued on `anonymize_deleted_user`.** `20260416193000` already revoked it from everyone and granted it to `service_role`; `create or replace` preserves the existing ACL, so re-granting would be noise at best and a widening at worst. The header records that this omission is deliberate.

- **Pure ASCII in both files**, verified by `LC_ALL=C grep -n '[^ -~\t]'` returning nothing. Plan 66-06 pushes these through MCP `apply_migration`, and the `edge-deploy-mcp-fidelity` memory records MCP corrupting non-ASCII source through model re-emission. Plans 66-01 and 66-04 did the same.

## Deviations from Plan

None requiring a deviation rule. The grant widening and the delete-order rationale are implementation discretion inside the plan's stated contract. The cron ordering comment is not a deviation either - the plan explicitly instructed verifying the claim and stating the truth plainly if it did not hold, which is what happened.

## Verification

Both automated gates pass, run exactly as the plan specifies against the comment-stripped file (`grep -v '^[[:space:]]*--'`):

- **Task 1 gate: PASS.** `limit 10000`, `for update skip locked`, `converted_tenant_id is null`, `coalesce(decided_at, created_at)`, `applications.retention_days`, `'35 3 * * *'`, **zero** occurrences of `archive`, **zero** `create table`, `set search_path = public`, `revoke all on function`, and `3610`/`3613` in the full file.
- **Task 2 gate: PASS.** `create or replace function public.anonymize_deleted_user`, both `delete from public.rental_application*` statements keyed on `owner_user_id`, the `notifications_archive` delete preserved, the `active leases` guard preserved, at least one `archive` mention.

Additional checks beyond the plan's gates:

- **Column-set diff (Task 1):** the 29 columns the sweep writes were compared set-wise against the 29 PII columns declared in `20260806120000`. Exact match, with `anonymized_at` as the only extra write. This is the check that would have caught a typo'd or omitted column, which no grep gate covers.
- **Body diff (Task 2):** unified diff of the new `anonymize_deleted_user` against `20260720015620`'s returns only the two added deletes plus their comment. Nothing was dropped.
- **Structural checks on both files:** balanced parentheses outside comments, even dollar-quote counts (4 `$$` in the retention file - one function body, one cron argument; 2 `$function$` in the cascade), even single-quote counts.
- **Pure ASCII:** both files clean.
- `bun run lint`, `bun run typecheck` and the unit suite ran clean via lefthook pre-commit on both commits. No `--no-verify`.

**Not a Postgres parse.** No local Postgres exists on this machine and production was deliberately not touched, so these are structural checks. Real SQL validity is proven at plan 66-06's apply step.

## Critical Constraint Honoured

**Neither migration is applied.** No `supabase db push`, no `supabase migration up`, and **no Supabase MCP tool call of any kind** - including read-only ones such as `list_migrations` and the live `cron.job` query the plan's Task 1 action would otherwise have wanted. Confirming these files' absence from production is plan 66-06's first step, not a claim this summary makes.

This separation is load-bearing: `bun run typecheck` and `next build` both pass against a stale generated `src/types/supabase.ts`, so an unapplied migration produces fully green CI. This project shipped three that way in v9.0.

## Carry-forwards for Plan 66-06

1. **Mandatory before applying `20260806123000`:** fetch `pg_get_functiondef('public.anonymize_deleted_user(uuid)'::regprocedure)` from production and diff it against the file. **On any difference, the live body wins** - update the file to the live body plus the two added deletes, then apply. Do not apply as written on the assumption the repo is current. `create or replace` replaces the whole body, so a stale repo transcription silently deletes shipped fixes with no error and no reviewable diff. The file's own header states this as a numbered instruction.
2. **Apply order matters:** `20260806122000` (retention) then `20260806123000` (cascade), and both after `20260806120000` (schema) and `20260806121000` (RPCs). The cascade references `rental_applications` and `rental_application_links`, which the schema migration creates.
3. **Confirm the `:35` slot is still free** at apply time via `select jobname, schedule from cron.job` and confirm `process-account-deletions` is still at `:45`. The header's ordering statement is sourced from the repo and D-16's 2026-08-06 reading, not a live query made by this plan. If the live schedule has drifted, correct the comment - it asserts nothing that requires the ordering to hold.
4. **After applying,** reconcile both filenames to the prod-assigned timestamps returned by `list_migrations` (the `migration-mcp-prod-drift` convention) and regenerate `src/types/supabase.ts`.

## Carry-forward for Plan 66-10

The integration test must assert **the default path explicitly** (T-66-23): with no `applications.retention_days` row, or with one holding an empty string, the sweep must still use 730 days rather than silently anonymizing nothing. That failure mode raises no exception and writes no log line, so only a test that asserts the default window will ever catch it.

## Issues Encountered

None.

## Known Stubs

None. This plan produces SQL only - no placeholder values, mock data sources or unwired components.

## Self-Check: PASSED

- `supabase/migrations/20260806122000_rental_applications_retention.sql` - FOUND on disk
- `supabase/migrations/20260806123000_rental_applications_gdpr_cascade.sql` - FOUND on disk
- Commit `bb4e99720` - FOUND in git log
- Commit `8f49d57a0` - FOUND in git log

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-06*
