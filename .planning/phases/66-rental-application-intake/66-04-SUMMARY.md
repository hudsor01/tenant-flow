---
phase: 66-rental-application-intake
plan: 04
subsystem: database
tags: [postgres, supabase, rpc, security-definer, pgcrypto, rate-limiting, fair-housing, tokenized-links]

# Dependency graph
requires:
  - phase: 66-01
    provides: "the two tables, their column contract, the disposition_reason and status CHECK vocabularies, and the deliberate absence of any INSERT/UPDATE policy that makes these RPCs the only write path"
  - phase: 66-02
    provides: "SUBMISSION_REQUIRED_KEYS and NUMBER_FIELDS in supabase/functions/_shared/application-guards.ts, which the RPC's defence-in-depth payload validation mirrors"
  - phase: 52-notification-center
    provides: "create_notification() single-writer RPC (NOTIF-01) and the notifications_notification_type_check that 66-01 extends with application_received"
provides:
  - "create_application_link(uuid, integer) -> (link_id, raw_token, expires_at), authenticated"
  - "revoke_application_link(uuid) -> void, authenticated"
  - "get_application_context(text) -> (valid, reason, property_label, unit_label, rent_amount, owner_display_name), service_role"
  - "submit_rental_application(text, uuid, jsonb, text, text) -> (success, reason, application_id), service_role"
  - "set_application_status(uuid, text, text) -> void, authenticated"
  - "set_application_notes(uuid, text) -> void, authenticated"
  - "record_application_conversion(uuid, uuid) -> (success, reason), authenticated"
  - "the closed reason-code set: invalid_token | expired_token | revoked_token | link_capped | rate_capped | invalid_payload | duplicate"
affects:
  - 66-06 (applies this file; must smoke-call create_application_link to prove the pgcrypto qualification)
  - 66-07 (public apply form calls the two service-role RPCs through the Edge Function)
  - 66-09 (the submit Edge Function is the only caller of the service-role pair)
  - 66-10 (RLS + parallel-RPC integration tests)
  - 66-13 (owner queue and detail page call the five owner RPCs)
  - 66-15 (decline dialog calls set_application_status with a disposition reason)
  - 66-16 (conversion flow calls record_application_conversion)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schema-qualified pgcrypto (extensions.digest / extensions.gen_random_bytes) inside a function pinned to search_path = public"
    - "Cap evaluation under the token row's FOR UPDATE lock, in the same transaction as the write it bounds, as the fail-closed replacement for a limiter that fails open"
    - "Uniform failure shape on a public read path: valid=false plus a reason code with NULL for every detail column, so no failure reason is distinguishable from another"
    - "Return-a-reason instead of raise, everywhere an applicant's in-flight submission would otherwise be destroyed by a transaction abort"

key-files:
  created:
    - supabase/migrations/20260806121000_rental_application_rpcs.sql
  modified: []

key-decisions:
  - "Payload validation returns invalid_payload rather than raising, because a raise aborts the transaction and loses the form the applicant just filled in - the same abort class as the Phase 52 C6 bug"
  - "Numeric and date payload values are pattern-checked BEFORE any cast, so attacker text cannot raise 22P02/22003 mid-transaction; bounds mirror NUMBER_FIELDS in application-guards.ts"
  - "set_application_status splits into two UPDATE branches rather than one CASE, so the terminal branch carries the literal decided_at = coalesce(decided_at, now()) and the non-terminal branch clears the decision record entirely"
  - "get_application_context inner-joins properties while submit_rental_application left-joins it - deliberate asymmetry, stated in Deviations"
  - "certified_at is stamped server-side with now() and never read from the payload, so an attestation cannot be backdated by whoever built the request"

patterns-established:
  - "Pattern 1: when a schema ships no UPDATE policy, the RPC file must be audited against the UI's action inventory, not against the plan's task list - an omitted mutation has no fallback and fails only when a later UI plan calls it"
  - "Pattern 2: a literal-string acceptance gate catches cosmetic drift that review would not - SQL column alignment silently broke the decided_at retention-clock assertion"

requirements-completed: [APPLY-01, APPLY-02, APPLY-03, APPLY-04]

# Metrics
duration: 14min
completed: 2026-08-06
---

# Phase 66 Plan 04: Rental Application RPCs Summary

**Seven SECURITY DEFINER functions in one 954-line migration form a closed write surface over two tables that have no INSERT or UPDATE policy: five owner functions gated on `(select auth.uid())`, two service-role functions the Edge Function calls, and a submission path whose abuse caps are evaluated under the token row's `FOR UPDATE` lock so they cannot be raced.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-08-06T23:33Z
- **Completed:** 2026-08-06T23:47Z
- **Tasks:** 3 of 3
- **Files created:** 1 (954 lines)

## Task Commits

1. **Task 1: owner link lifecycle** - `f2def9b74` (feat)
2. **Task 2: the two service-role public paths** - `b2c3514c0` (feat)
3. **Task 3: owner mutations - status, notes, conversion** - `2511225e3` (feat)

## The owner-side write inventory

This is the check the plan and the 66-01 carry-forward both flagged as the likeliest silent gap, so it is recorded explicitly rather than asserted. Wave 1 ships **no UPDATE policy on either table for any role**, so an owner mutation without an RPC has no path at all and would fail only when a wave-5 or wave-6 UI plan tried to call it.

Every owner-side write the phase's UI surfaces require, taken from UI-SPEC §B-5, §B-6, §B-7 and §C rather than from this plan's task list:

| # | Owner write | UI trigger | Covered by |
|---|---|---|---|
| 1 | Create a link | §C "Create link" (no-link state) | `create_application_link` |
| 2 | Create a replacement link | §C "Create a new link" (expired / revoked states) | `create_application_link` - the active-link guard checks `revoked_at is null and expires_at > now()`, so expired and revoked links deliberately do **not** block |
| 3 | Revoke a link | §C "Revoke" + confirm dialog | `revoke_application_link` |
| 4 | Mark reviewing | §B-6 secondary control | `set_application_status(id, 'reviewing')` |
| 5 | Approve | §B-6 primary control | `set_application_status(id, 'approved')` |
| 6 | Decline with a required reason | §B-7 decline dialog | `set_application_status(id, 'rejected', reason)` |
| 7 | Save owner notes | §B-5 "Save notes" | `set_application_notes` |
| 8 | Record a conversion | §B-6, after the tenant form saves | `record_application_conversion` |
| 9 | Delete an application | §B-7 UI-17 overflow menu | **Not an RPC.** PostgREST `DELETE`, covered by the `rental_applications_delete` policy from 66-01 |

Row 9 is the one intentional non-RPC and is called out in the migration header so a reviewer does not read it as the missing eighth function: a delete needs no field-level guard, and 66-01 already ships an owner-scoped DELETE policy for it.

Rows 2 and 7 are the two most easily missed. Row 7 is the one the 66-01 summary explicitly warned about. Row 2 is subtler - it is not a separate mutation but a *precondition* on row 1, and an active-link guard written as "any link exists for this unit" instead of "any **active** link exists" would have silently made every expired listing permanently un-relistable.

Reads are unaffected: the link panel's URL and `raw_token`, the queue and the detail page all go through the two SELECT policies from 66-01.

## Accomplishments

- **The pgcrypto qualification, which is the one line the repo cannot prove.** Both calls are `extensions.gen_random_bytes(32)` and `extensions.digest(v_raw, 'sha256')`, per D-15's production verification that `digest_in_public = 0`. `66-RESEARCH.md`'s example is unqualified and would have parsed, applied clean, and then raised `function digest(text, unknown) does not exist` the first time an owner clicked Create link. The gate is the **negative** grep (`[^.a-z_]digest\(` must be zero), not the positive one.
- **Token entropy is server-side and 256-bit.** `gen_random_uuid` appears twice in the file and **zero times in executable SQL** - both occurrences are prohibitive prose explaining why it must never be a token source (122 bits, structured).
- **The cap race is closed by construction.** `submit_rental_application` takes `select ... for update` on the link row as its first statement, before evaluating the 250 lifetime cap or the 25 rolling-hour cap. Both reads therefore see every increment that has already committed.
- **Idempotency does not corrupt the cap.** The `on conflict (submission_id) do nothing` branch returns `success=true, reason='duplicate'` and neither increments `submission_count` nor notifies. An implementation that still incremented would let a flaky connection walk the lifetime cap toward zero with no additional application stored.
- **The public read path leaks nothing.** All four failure paths in `get_application_context` (`invalid_token`, `revoked_token`, `expired_token`, and a missing unit mapped to `invalid_token`) return NULL for all four detail columns, so a revoked link cannot confirm which property it belonged to.
- **Zero references to owner contact details.** `users.email` / `users.phone` count is 0; only `full_name` is selected (UI-20).
- **Non-enumerating errors throughout.** "unit not found", "link not found", "application not found" and "tenant not found" each cover both "does not exist" and "not yours", so no signed-in owner can probe another owner's ids.
- **The retention clock is stamped with `coalesce`** in both writers, so a status flipped approved -> reviewing -> approved does not push the anonymization date forward and hold applicant PII past policy.

## Verification

All three automated gates pass, run against the comment-stripped file exactly as each task specifies. Tasks 1 and 2 were re-run after every subsequent append; no regression.

| Gate | Result |
|---|---|
| Task 1 | **PASS** - both pgcrypto calls qualified, both negative greps 0, `search_path` >= 2, revoke present |
| Task 2 | **PASS** - `for update` present, `on conflict (submission_id) do nothing` present, `perform public.create_notification` present, 0 direct notification inserts, `'application_received'` present, 0 `users.email`/`users.phone`, submit granted but **not** to `authenticated` |
| Task 3 | **PASS** - 7/7/7/7 on function declarations, `revoke all on function`, `grant execute on function`, `set search_path = public`; `already_converted` present; `decided_at = coalesce(decided_at, now())` present; `auth.uid()` line count == `(select auth.uid())` line count (5 == 5) |

Structural checks beyond the plan's gates, since no local Postgres exists to parse the file:

- **INSERT arity:** 37 columns, 37 values, positionally aligned.
- **Column existence:** all 37 insert columns and all 6 link-insert columns parsed out of `20260806120000_rental_applications_schema.sql`; zero unknown names. No column name was inferred.
- **Signature parity:** for all 7 functions the declared parameter types, the `revoke all on function` signature, the `grant execute on function` signature and the `comment on function` signature are identical. A mismatch on any of these raises `function ... does not exist` at apply time, and a mismatched grant would leave PUBLIC EXECUTE intact - the exact regression the revoke exists to prevent.
- **Balance:** dollar-quote-aware scan gives final paren depth 0, no unterminated string literal, 14 `$function$` markers (7 functions x 2).
- **Grant ledger:** 5 -> `authenticated`, 2 -> `service_role`, machine-extracted and matching the header table.
- **Pure ASCII:** 0 non-ASCII bytes (`LC_ALL=C grep -c '[^ -~\t]'`), protecting fidelity through 66-06's MCP `apply_migration` hop.
- `bun run lint`, `bun run typecheck` and the full unit suite with coverage ran clean via lefthook pre-commit on all three commits. No `--no-verify`.

**Column names were read, never inferred.** `units.owner_user_id` in particular was verified against the generated types rather than assumed - CLAUDE.md's canonical-owner list names properties, leases, maintenance_requests and documents but not units, so `66-RESEARCH.md`'s `units.owner_user_id` predicate needed confirming before `create_application_link` could rely on it. It is correct.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SQL column alignment silently broke the retention-clock gate**

- **Found during:** Task 3
- **Issue:** I wrote the UPDATE clauses with aligned `=` signs (`decided_at         = coalesce(...)`). Task 3's gate requires the literal string `decided_at = coalesce(decided_at, now())`, which the padding broke. The gate failed with everything else at 7/7/7/7.
- **Why it matters beyond the gate:** the assertion exists to pin the retention clock, and a formatting choice made it un-assertable while leaving the SQL semantically identical. Review would very likely have passed it.
- **Fix:** removed `=` alignment from all three SET clauses in `set_application_status` and `record_application_conversion`.
- **Commit:** `2511225e3`

### Implementation discretion inside the plan's contract

These are not deviations - the plan left the mechanism open - but each is a judgement call worth recording:

1. **Payload failures return `invalid_payload`; they never raise.** The plan says to validate defensively but does not say how to report. A raise aborts the transaction and reaches the applicant as a 500 that loses their form. Every one of the eleven validation exits returns a reason code instead.
2. **Pattern-check before cast.** `occupant_count`, `gross_monthly_income`, `desired_move_in_date`, `other_income_amount` and `employer_months` are regex-checked and range-checked before any `::` cast, with bounds mirroring `NUMBER_FIELDS` in `application-guards.ts` (50, 10000000, 1200). An unchecked cast of attacker-supplied text raises 22P02 or 22003 mid-transaction - the same abort the point above avoids.
3. **`get_application_context` inner-joins `properties`; `submit_rental_application` left-joins it.** Deliberate and opposite: a context call that cannot resolve the listing must not render a partial summary, so it degrades to `invalid_token`; a submission must not be discarded over a label lookup, so it coalesces to `'Property'`. Neither triggers in practice - `units.property_id` is NOT NULL with an FK - but the two functions fail in the directions their callers need.
4. **`get_application_context` is marked `stable`.** Not requested. It is read-only and calls only `now()`.
5. **`set_application_notes` normalizes rather than truncating blindly.** The plan sketched `left(p_notes, 5000)`; shipped as `nullif(btrim(left(coalesce(p_notes, ''), 5000)), '')` so "no notes" has one representation instead of three (`NULL`, `''`, `'   '`).
6. **`submitted_ip` is capped at 100 characters.** The plan only specified capping the user agent. An IP arrives from a proxy header and is not inherently bounded; 100 leaves room for a chained `X-Forwarded-For` value while bounding the column.
7. **`certified_at` is stamped `now()` server-side.** The payload's `certified` boolean is checked for a true attestation, but the timestamp is never read from the client, so it cannot be backdated.

**Total:** 1 auto-fixed bug (Rule 1), 7 recorded discretionary choices. No Rule 4 architectural question arose; no scope was added or dropped.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-66-05 | mitigate | **Done.** 250 lifetime + 25 rolling-hour caps, both evaluated after `select ... for update` on the link row, in the same transaction as the insert. |
| T-66-01 | mitigate | **Done.** 256 bits from `extensions.gen_random_bytes(32)`; lookup by SHA-256 hash only; identical failure shape for every reason. |
| T-66-02 | mitigate | **Done.** NULL for all detail columns on every invalid path; one error message for "missing" and "not yours" in all four owner lookups. |
| T-66-14 | mitigate | **Done.** Every owner RPC gates on `(select auth.uid())`; `record_application_conversion` verifies ownership of BOTH rows under `for update`. |
| T-66-19 | mitigate | **Done.** 7/7 `revoke all on function ... from public`, with signatures machine-verified to match the declarations - a mismatched revoke silently no-ops the lockdown. |
| T-66-11 | mitigate | **Done.** `full_name` only; 0 references to `users.email` / `users.phone`. |
| T-66-13 | mitigate | **Done.** `decided_at = coalesce(decided_at, now())` in both writers; cleared on a return to a non-terminal status so 66-01's CHECK stays satisfiable. |
| T-66-20 | mitigate | **Done.** `on conflict (submission_id) do nothing` with no increment and no notification on the duplicate branch; `record_application_conversion` refuses a second conversion in the RPC, not only in the UI. |
| T-66-SC | mitigate | **Done.** Zero packages. SQL only. |

## Critical Constraint Honoured

**This migration is NOT applied.** No `supabase db push`, no `supabase migration up`, and **no Supabase MCP tool call of any kind** - including read-only ones such as `list_migrations`, which the execution constraint prohibited even though the plan's verification section mentions it. Confirming this migration's absence from production is therefore plan 66-06's first step, not a claim this summary makes.

The file is pure ASCII for the same reason 66-01 is: 66-06 pushes it through MCP `apply_migration`, and the `edge-deploy-mcp-fidelity` incident records MCP corrupting non-ASCII source through model re-emission.

## Issues Encountered

No local Postgres exists on this machine, so the migration could not be executed against a real server and **its SQL validity is not proven by this plan**. The structural checks above (arity, column existence, signature parity, paren/quote balance, dollar-quote count) are the strongest evidence obtainable from the repo, and they are structural, not a parse. Plan 66-06 is the gate where real validity is established.

## Next Phase Readiness

**The RPC contract is now fixed on disk and six downstream plans call these functions by name.** A rename or a signature change in a later plan is a breaking change to 66-06, 66-07, 66-09, 66-10, 66-13, 66-15 and 66-16.

Carry-forwards:

- **66-06 (apply):** the smoke call must be `create_application_link`, not one of the others. It is the only function that exercises the schema-qualified pgcrypto path, and that path is the single line in this file that cannot be proven from the repo. A migration that applies cleanly proves nothing about it - the failure is at first invocation. After applying, reconcile the filename to the prod-assigned timestamp and regenerate `src/types/supabase.ts` so the RPC signatures reach the TypeScript client.
- **66-09 (Edge Function):** hash the URL token with `sha256Hex()` in Deno and pass `p_token_hash` already hashed - these RPCs never hash a raw value. Mint `p_submission_id` once per form load, not per submit attempt, or the idempotency path never engages. Map all seven reason codes to the single uniform unavailable screen; `duplicate` arrives with `success=true` and must be treated as success.
- **66-10 (integration tests):** the `FOR UPDATE` serialization is invisible to any single-threaded test. Two concurrent `submit_rental_application` calls against a link at `submission_count = 249` is the behavioural check, and it is the only one that can fail if the lock is ever moved or removed.
- **66-13 / 66-15 / 66-16 (owner UI):** there is no PostgREST `.update()` fallback for anything. The nine-row inventory above is the complete owner write surface; row 9 (delete) is the only one that is not an RPC.

No blockers.

## Self-Check: PASSED

**Files verified present on disk:**

- `supabase/migrations/20260806121000_rental_application_rpcs.sql` - FOUND, 954 lines
- `.planning/phases/66-rental-application-intake/66-04-SUMMARY.md` - FOUND

**Commits verified in `git log`:** `f2def9b74`, `b2c3514c0`, `2511225e3`

**Branch:** `gsd/phase-66-rental-application-intake` (verified before the first commit; never `main`)

## Known Stubs

None. This plan produces SQL only - no placeholder values, no mock data sources, no unwired components. Every one of the seven functions has a complete body.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-06*
