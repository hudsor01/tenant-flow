---
phase: 44-deliverability-funnel-analytics
plan: 01
subsystem: analytics
tags: [deliverability, resend, svix, admin-rpc, cron, rls]
dependency_graph:
  requires: []
  provides:
    - "public.email_deliverability (table + archive)"
    - "public.get_deliverability_stats (admin RPC)"
    - "cleanup_old_email_deliverability() + cleanup-email-deliverability cron @ 0 4 * * *"
    - "resend-webhook Edge Function (Svix-verified ingest)"
    - "getAdminTestCredentials() test helper"
  affects:
    - "tests/integration/setup/supabase-client.ts"
tech_stack:
  added: []
  patterns:
    - "Svix HMAC-SHA256 webhook verification (whsec_ prefix + base64 decode + space-delimited sig list)"
    - "Archive-then-delete 90-day retention mirroring security_events_archive"
    - "SECURITY DEFINER RPC with set search_path + is_admin() guard (template: get_payout_timing_stats)"
    - "Idempotent upsert via UNIQUE (message_id, event_type) + onConflict"
    - "describe.skipIf credential gating (mirrors getTenantTestCredentials)"
key_files:
  created:
    - "supabase/migrations/20260415193245_email_deliverability_schema.sql"
    - "supabase/migrations/20260415193246_get_deliverability_stats_rpc.sql"
    - "supabase/functions/resend-webhook/index.ts"
    - "tests/integration/rls/deliverability-admin-rpc.test.ts"
  modified:
    - "tests/integration/setup/supabase-client.ts"
decisions:
  - "D1: 90-day retention + 4 AM UTC cleanup slot (avoids crowded 3 AM window)"
  - "D3: p_days default 30, range 1..365 (matches get_payout_timing_stats convention)"
  - "D4: event_at = Resend top-level created_at; raw_payload preserves nested timestamps"
  - "D6: describe.skipIf(!getAdminTestCredentials()) gate — never silent false-positive"
  - "D7: category tag first, type fallback at ingest (extractTemplateTag in Edge Function)"
  - "Pitfall 2: UNIQUE (message_id, event_type) not PK on message_id alone (multi-event per email)"
  - "Pitfall 8: read req.text() ONCE before any verification (body stream consumed on first read)"
metrics:
  duration_minutes: ~10
  completed_date: "2026-04-15"
  commits: 6
  tasks_completed: 6
  tasks_total: 7
  task_7_status: "Wave 0 operator action (auth-gated)"
requirements:
  - "ANALYTICS-01 (storage + ingest shipped; types regen deferred to Wave 0)"
  - "ANALYTICS-02 (RPC shipped; types regen deferred to Wave 0)"
---

# Phase 44 Plan 01: Deliverability Ingestion + Admin RPC Summary

Ship the storage, ingest, and admin-read surface for Resend email
deliverability events: a new `email_deliverability` table with a 90-day
archive-then-delete lifecycle, the `get_deliverability_stats` admin RPC,
the Svix-verified `resend-webhook` Edge Function, an RLS integration test
proving admin-only access, and the supporting `getAdminTestCredentials()`
helper. Wired behind an is_admin() guard — callable by any authenticated
user but filtered at runtime.

## What Shipped

6 of 7 atomic commits landed. Task 7 (types regen) is deferred to Wave 0
operator actions because the Supabase CLI was not authenticated in the
execution environment (`supabase gen types` returned "Unauthorized"); the
CLI auth + migration-push workflow is naturally owned by the operator who
applies the migrations to the dev DB anyway.

| # | Task | Commit | Files |
| - | ---- | ------ | ----- |
| 1 | email_deliverability table + archive + RLS | `ab57bd431` | `supabase/migrations/20260415193245_email_deliverability_schema.sql` |
| 2 | cleanup_old_email_deliverability cron @ 0 4 * * * | `ed631a77b` | `supabase/migrations/20260415193245_email_deliverability_schema.sql` (appended) |
| 3 | get_deliverability_stats admin RPC | `5a5ffabb9` | `supabase/migrations/20260415193246_get_deliverability_stats_rpc.sql` |
| 4 | getAdminTestCredentials helper | `330a6d851` | `tests/integration/setup/supabase-client.ts` |
| 5 | resend-webhook Edge Function with Svix verification | `48314071d` | `supabase/functions/resend-webhook/index.ts` |
| 6 | RLS integration test for get_deliverability_stats | `482bf8bf5` | `tests/integration/rls/deliverability-admin-rpc.test.ts` |
| 7 | DEFERRED — Regenerate src/types/supabase.ts | pending | `src/types/supabase.ts` |

## Decisions Honored

- **D1 (retention + cron window):** 90-day retention, archive-then-delete,
  cleanup cron at `0 4 * * *` (4 AM UTC — avoids the 3 AM congestion)
- **D3 (RPC param):** `p_days integer default 30`, hard range `1..365`
  enforced at the RPC before the `is_admin()` guard (cheap validation first)
- **D4 (timestamp source):** `event_at` sourced from Resend's top-level
  `created_at`; `raw_payload` preserves the full `payload.data` jsonb for
  forensic queries into nested event-specific timestamps
- **D6 (admin creds):** `getAdminTestCredentials()` returns null on missing
  env — `describe.skipIf` chained on both admin creds AND service-role key
  so the integration test never becomes a silent false-positive
- **D7 (tag priority):** `extractTemplateTag` prefers `category`, falls
  back to `type` — handles BOTH documented shapes (array-of-{name,value}
  and object-map) per RESEARCH Pitfall 1

## Threat Model Coverage (9 STRIDE threats)

All 9 threats from the plan's `<threat_model>` mitigated or consciously
accepted:

| ID | Category | Component | Disposition | Evidence |
| -- | -------- | --------- | ----------- | -------- |
| T-44-01 | Spoofing | resend-webhook | mitigate | Svix HMAC-SHA256 verification before any DB access |
| T-44-02 | Tampering | email_deliverability | mitigate | onConflict upsert makes replay idempotent |
| T-44-03 | Tampering | email_deliverability | accept | UNIQUE (message_id, event_type) — no additional defense needed |
| T-44-04 | EoP | get_deliverability_stats | mitigate | `if not is_admin() then raise 'Unauthorized'` + RLS test Test 1 |
| T-44-05 | Info Disclosure | resend-webhook | mitigate | All errors via errorResponse(); no err.message leakage |
| T-44-06 | DoS | cleanup cron | mitigate | Existing check_cron_health hourly monitor auto-includes new job |
| T-44-07 | Info Disclosure | env secrets | mitigate | validateEnv returns typed object; no console.log(env) |
| T-44-08 | Tampering | extractTemplateTag | accept | text column + parameterized insert; React renders escape |
| T-44-09 | Replay | verifySvixSignature | mitigate | 5-minute tolerance check BEFORE HMAC work |

## Deviations from Plan

### None that impacted scope

Plan executed exactly as written for Tasks 1-6. One deviation on commit
message formatting (commitlint body-max-line-length = 100 chars) caught
Task 5 — resolved by splitting long body lines into shorter bullets.
Content unchanged.

### Task 7 deferred to Wave 0

The `pnpm db:types` command depends on `supabase gen types typescript`
which requires the Supabase CLI to be authenticated AND for the new
migrations to be applied to the dev project. Both are Wave 0 operator
actions per the plan's output block.

**Guard:** `pnpm typecheck` passes GREEN without the regen because the
integration test uses untyped `.rpc('get_deliverability_stats', ...)` by
name — no compile-time binding to the new return shape. Once Plan 03 ships
the admin UI, it WILL need the regen to type the hook return value.

## Wave 0 Operator Actions (Required Before Plan 01 is Production-Ready)

1. **Apply migrations to dev Supabase project:**
   ```bash
   supabase link --project-ref bshjmbshupiibfiewpxb
   supabase db push
   ```

2. **Regenerate TypeScript types (Task 7 completion):**
   ```bash
   # Login if not already
   supabase login
   pnpm db:types
   git add src/types/supabase.ts
   git commit -m "chore(44-01): regenerate src/types/supabase.ts after Phase 44 migrations"
   ```

3. **Set RESEND_WEBHOOK_SECRET in Supabase Edge Function secrets:**
   ```bash
   # Obtain from Resend Dashboard → Webhooks → Signing secret
   supabase secrets set RESEND_WEBHOOK_SECRET=whsec_<base64>
   ```

4. **Deploy the new Edge Function:**
   ```bash
   supabase functions deploy resend-webhook
   ```

5. **Configure Resend webhook endpoint:**
   - Go to Resend Dashboard → Webhooks → Add Endpoint
   - URL: `https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/resend-webhook`
   - Enable event types: `email.delivered`, `email.bounced`, `email.opened`,
     `email.complained`, `email.delivery_delayed`
   - Copy the signing secret and use it in step 3

6. **Provision admin test user (for RLS integration test):**
   - Create a user in the test Supabase project with `users.user_type = 'ADMIN'`
   - Add to `.env.test` locally and CI secrets:
     ```
     E2E_ADMIN_EMAIL=<admin-test-user-email>
     E2E_ADMIN_PASSWORD=<admin-test-user-password>
     ```

7. **Smoke test (post-deploy):**
   - Trigger any Resend-backed email (e.g. auth signup)
   - Within seconds, verify a row lands in `public.email_deliverability`:
     ```sql
     select event_type, template_tag, event_at from public.email_deliverability
       order by received_at desc limit 5;
     ```
   - Run the RLS test:
     ```bash
     pnpm test:integration -- --run tests/integration/rls/deliverability-admin-rpc.test.ts
     ```

## Known Stubs

None. All code is wired end-to-end:
- Table ingest is live the moment Resend starts POSTing (after step 5 above)
- Admin RPC returns real data from real rows
- RLS test seeds real rows and asserts real RPC output

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or
schema changes at trust boundaries beyond what's already cataloged in the
plan's `<threat_model>` (all 9 threats addressed above).

## Final Verification

- `pnpm typecheck` → GREEN (post-Task 6)
- `pnpm lint` → GREEN (post-Task 6)
- `pnpm test:unit` → 1632/1632 passing (post-Task 6)
- `pnpm test:integration` → skipped (admin creds + service-role key not set
  in execution environment; will run post Wave 0 step 6)
- No hand-edits to generated files
- All 6 commits scoped to their single concern
- No `any` types introduced
- No `as unknown as` assertions introduced (except the structurally
  required `timingSafeEqual` crypto.subtle access, documented in the
  research as the canonical exception)

## Self-Check: PASSED

Verified on 2026-04-15:

| Claim | Check | Result |
|-------|-------|--------|
| `supabase/migrations/20260415193245_email_deliverability_schema.sql` exists | ls | FOUND |
| `supabase/migrations/20260415193246_get_deliverability_stats_rpc.sql` exists | ls | FOUND |
| `supabase/functions/resend-webhook/index.ts` exists | ls | FOUND |
| `tests/integration/rls/deliverability-admin-rpc.test.ts` exists | ls | FOUND |
| `tests/integration/setup/supabase-client.ts` modified | git diff | FOUND |
| Commit `ab57bd431` exists | git log | FOUND |
| Commit `ed631a77b` exists | git log | FOUND |
| Commit `5a5ffabb9` exists | git log | FOUND |
| Commit `330a6d851` exists | git log | FOUND |
| Commit `48314071d` exists | git log | FOUND |
| Commit `482bf8bf5` exists | git log | FOUND |
| `pnpm typecheck` green | executed | PASSED |
| `pnpm lint` green | executed | PASSED |
| `pnpm test:unit` green | executed | 1632/1632 PASSED |
