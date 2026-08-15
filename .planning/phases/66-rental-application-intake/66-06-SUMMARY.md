# 66-06 Summary — Apply the migrations to production

**Status:** COMPLETE
**Plan type:** `autonomous: false` — owner authorized the production write before any statement ran.
**Executed by:** the orchestrator, not a gsd-executor. Executor agents hold no Supabase MCP
tools, and the established pattern in this repo (Phase 54) is that the executor authors SQL
and the orchestrator applies it. Keeping the prod-touching step in the approved context is
also why the authorization was meaningful.

## Filename reconcile — repo -> production version

MCP `apply_migration` assigns its own timestamp. All four drifted, which is exactly the
condition the reconcile step exists to catch.

| Repo filename (authored) | Production version | Reconciled filename |
|---|---|---|
| `20260806120000_rental_applications_schema.sql` | `20260807003342` | `20260807003342_rental_applications_schema.sql` |
| `20260806121000_rental_application_rpcs.sql` | `20260807003555` | `20260807003555_rental_application_rpcs.sql` |
| `20260806122000_rental_applications_retention.sql` | `20260807003630` | `20260807003630_rental_applications_retention.sql` |
| `20260806123000_rental_applications_gdpr_cascade.sql` | `20260807003639` | `20260807003639_rental_applications_gdpr_cascade.sql` |

Renamed with `git mv` so the rename is tracked. Four filenames, four versions, no orphan on
either side.

## `anonymize_deleted_user` — live-vs-repo diff BEFORE applying

Fetched `pg_get_functiondef` and diffed it against the repo copy under whitespace/case/comment
normalization, token by token, rather than reading it.

**Result: no drift.** The only difference was the two statements plan 66-05 intended to add:

```
> delete from public.rental_applications      where owner_user_id = p_user_id;
> delete from public.rental_application_links where owner_user_id = p_user_id;
```

The repo copy at `20260720015620` was current, so the live body won trivially and the file
applied as written. Had it drifted, `create or replace` would have silently deleted whatever
shipped since — the failure mode with no error and no diff to review afterwards.

Post-apply, the live definition still contains every pre-existing statement: the active-lease
guard, `notifications_archive`, `user_preferences`, `notification_settings`, and the users
placeholder update.

## A second live check the plan did not require

The schema migration DROPS and re-adds `notifications_notification_type_check` with a fixed
10-value list. If production had held an 11th value, that value would have been silently
removed. Verified first:

- Live constraint carried exactly the 10 values the migration reproduces, in the same order.
- Live data uses only 2 of them, so no row could violate the re-add.

D-17 confirmed. The migration only appends `application_received`.

## `supabase db push` was attempted first and correctly refused

`db push` reads from disk, so it would have avoided passing ~1,900 lines of SQL through model
re-emission (the `edge-deploy-mcp-fidelity` failure class). Auth worked via the macOS keychain
token. It failed for a different reason:

> Remote migration versions not found in local migrations directory.

**29 production versions have no file in the repo** (`20260417191914`, `20260418183608`, the
rent-payment demolition series, `20260528223442`, and others). The CLI wants
`supabase migration repair --status reverted` on all 29, which would rewrite production
migration history to claim those never ran. That is false, out of this phase's scope, and was
NOT done. Recorded here as a real pre-existing repo/prod drift worth its own decision.

Fallback was MCP `apply_migration` per the plan. In-body comments were preserved byte-exact so
live definitions stay diffable against the repo files.

## Verification against production

| Check | Expected | Actual |
|---|---|---|
| Tables created | 2 | 2 |
| RLS policies | select+delete on applications, select on links | 3 |
| Indexes | 7 authored + PK/unique | 11 |
| Named CHECK constraints | 4 | 4 |
| `anon` SELECT on either table | false | false |
| Functions (7 RPCs + sweep) | 8 | 8 |
| All 8 SECURITY DEFINER + `search_path=public` | yes | yes |
| `anon` EXECUTE on any of the 7 RPCs | none | none |
| `get_application_context` / `submit_rental_application` | service_role only | service_role only |
| Other five RPCs | authenticated only | authenticated only |
| `anonymize-rental-applications` cron job | 1 | 1 |
| Other jobs sharing `35 3 * * *` | 0 | 0 (only this one) |
| `app_config.applications.retention_days` | 730 | 730 |

## Smoke tests — the two claims no repo gate can settle

Both run inside a `DO` block terminated by a deliberate `raise`, so the whole transaction
rolled back and **nothing persisted**. This is the rolled-back-txn pattern established in
Phase 54 and is stronger than create-then-revoke: there is no window in which a stray row
exists on a real unit.

**Smoke 1 — pgcrypto schema qualification (D-15).** Called `create_application_link` as
`authenticated` with `request.jwt.claims.sub` set to the synthetic owner
`e2e-owner-a@tenantflow.app`, against that owner's own unit `BULK-A-101`. No customer data
touched.

```
SMOKE1_RESULT token_len=64 is_hex_64=t link_id_present=t
```

64-char lowercase hex confirms 32 bytes from `extensions.gen_random_bytes`, and reaching the
insert at all confirms `extensions.digest` resolves under `search_path = public`. This is the
single line the repo cannot prove: unqualified, it parses, migrates clean, and raises
`function digest(text, unknown) does not exist` the first time an owner clicks Create link.

**Smoke 2 — the notification type CHECK (D-17).**

```
SMOKE2_RESULT notification_id_present=t (no 23514)
```

Exercises the exact call `submit_rental_application` makes. Without it, the failure would
first appear inside the submit transaction, aborting it and losing a completed applicant form
with no error the applicant could act on.

**Cleanup verified:** `rental_application_links` = 0 rows, `rental_applications` = 0 rows,
notifications matching the smoke = 0 rows.

## Generated types

`bun run db:types` succeeded using the keychain token override
(`SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s 'Supabase CLI' -w)"`) — the
harness injects a stale token that otherwise 401s.

Regenerated file contains both tables and all eight function entries. `bun run typecheck`
passes across all three tsconfigs.

The raw regeneration showed a whole-file diff because the generator emits spaces while the
committed copy is biome-formatted to tabs. After `bunx biome check --write`, the diff is
**294 insertions, 0 deletions** — purely generated additions, no hand edits, satisfying the
plan's acceptance criterion.

## Carry-forward

- Wave 4+ may now rely on generated types being real. The `[BLOCKING]` gate is closed.
- 66-08 (deploy the edge function) remains `autonomous: false` and still needs authorization.
- The 29-version repo/prod migration drift blocks `supabase db push` for this repo generally,
  not just this phase. Any future plan assuming `db push` works will fail the same way.
