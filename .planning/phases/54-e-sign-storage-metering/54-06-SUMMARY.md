# 54-06 — Storage Enforcement Go-Flip: SUMMARY

**Plan:** 54-06 (METER-04 grandfather go-flip gate)
**Status:** COMPLETE — enforcement flipped ON in prod 2026-07-24 (owner-approved at the blocking checkpoint)
**Migration:** `supabase/migrations/20260724133113_storage_grandfather_goflip.sql` (prod-assigned version; reconciled from the `20260723150000` placeholder)

## What happened

1. **Over-quota population report** (the checkpoint decision input) run via MCP `execute_sql` → **0 rows**. No owner is at/over their storage quota (top owner ~35 MB vs the 1 GB minimum quota).
2. **Blocking human-verify checkpoint** — owner reviewed the empty report and approved the flip (`AskUserQuestion` → "Flip enforcement ON now").
3. **Go-flip migration applied** via MCP `apply_migration`:
   - Grandfather snapshot stamped `users.storage_grandfathered_at` for all non-Max over-quota owners → **0 stamped** (empty population).
   - `app_config.storage_enforcement_enabled` flipped `'true'` as the LAST statement.

## Verified live (MCP)

| Check | Result |
|---|---|
| `storage_enforcement_enabled` | `'true'` (enforcement active) |
| grandfathered owners | `0` (clean slate) |
| real owners now blocked | `0` (everyone under quota — no disruption) |
| enforcement path (proven Wave 3, flag now genuinely on) | over-quota non-grandfathered → `plan_limit_exceeded:` block; system-bucket / grandfathered / Max / flag-off → allowed |

## Effect

The sold storage quotas (Trial 1 / Starter 10 / Growth 50 GB / Max unlimited) are now **actually enforced**. Nobody was over quota at flip time, so no one is blocked today; only NEW uploads that would cross a plan quota get the upgrade prompt going forward. Reads/downloads/deletes are never affected.

**Reversible:** `update public.app_config set value='false' where key='storage_enforcement_enabled';` returns the BEFORE-INSERT guard to a no-op at any time.

## Residual (owner-run / CI)

The post-flip RLS assertion lives in `tests/integration/rls/storage-metering.rls.test.ts` (the METER-04 matrix authored in 54-04). That dual-client suite is CI/owner-run (needs `.env.local` vars absent in the orchestration environment); the enforcement behavior was instead proven directly against prod via rolled-back MCP transactions.
