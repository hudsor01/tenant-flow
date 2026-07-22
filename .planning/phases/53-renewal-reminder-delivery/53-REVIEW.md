---
phase: 53-renewal-reminder-delivery
reviewed: 2026-07-21T00:00:00Z
depth: deep
files_reviewed: 10
files_reviewed_list:
  - supabase/functions/send-lease-reminders/index.ts
  - supabase/functions/tests/send-lease-reminders-test.ts
  - supabase/migrations/20260722005310_lease_reminders_delivery_state.sql
  - supabase/migrations/20260722012107_send_lease_reminders_drain_cron.sql
  - supabase/migrations/20260722013850_lease_reminders_goflip.sql
  - supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql
  - supabase/config.toml
  - scripts/deploy-edge-functions.ts
  - src/components/notifications/notification-item.tsx
  - tests/integration/rls/lease-reminders-delivery.rls.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: fixed
fixed: 2026-07-21T00:00:00Z
fix_outcomes:
  CR-01: fixed  # grant migration 20260722015716 applied + code fail-closed in shouldEmail
  WR-01: fixed  # shouldEmail layers 3 & 4 fail closed on query error
  WR-02: fixed  # migration 20260722015716 (claimed_at + stale-claim reclaim)
  WR-03: fixed  # new migration 20260722020000_fix_reminder_drain_sentry_checkin.sql, prod-apply deferred to orchestrator
  IN-01: fixed  # corrected C1 timestamp reference in C2 migration + go-live runbook
  IN-02: fixed  # escapeHtml on ctaUrl href
---

# Phase 53: Code Review Report

**Reviewed:** 2026-07-21
**Depth:** deep (drainer traced end-to-end; migrations cross-checked against the edge fn, shared utilities, and prod grant state inferred from Phase 52 tests)
**Files Reviewed:** 10
**Status:** fixed (2026-07-21)

## Fix Outcomes

| Finding | Severity | Outcome | Resolution |
|---------|----------|---------|------------|
| CR-01 | Critical | fixed | DB grant half applied in `20260722015716` (`grant execute on is_notification_suppressed(text) to service_role`); code half makes `shouldEmail()` layer 2 fail closed + capture the RPC error. |
| WR-01 | Warning | fixed | `shouldEmail()` layers 3 (`email_suppressions`) & 4 (`notification_settings`) now inspect `error` and fail closed (return false + `captureWebhookError`). |
| WR-02 | Warning | fixed | Migration `20260722015716` (applied): added `claimed_at` + `claim_lease_reminders` reclaims rows stuck `claimed > 1h` so a crashed run self-heals. (The `failed`-status no-retry gap is documented-accepted future scope.) |
| WR-03 | Warning | fixed | New migration `20260722020000_fix_reminder_drain_sentry_checkin.sql` create-or-replaces `invoke_send_lease_reminders()` so the Sentry check-in posts `ok` only when the Bearer is configured AND `net.http_post` returned a request id, else `error`. **prod-apply DEFERRED TO ORCHESTRATOR.** |
| IN-01 | Info | fixed | Corrected the stale `20260722013000` C1 reference to `20260722013850` in the C2 migration header and `53-GO-LIVE-RUNBOOK.md`. |
| IN-02 | Info | fixed | `ctaUrl` now passed through `escapeHtml` in the reminder email `href`, matching the D-05 escape-every-value contract. |

## Summary

Traced the renewal-reminder drainer end-to-end (cron invoke → `claim_lease_reminders` → per-row lookup → `create_notification` → `shouldEmail` gate → Resend send → terminal stamp) and cross-checked the four go-live migrations against the deployed function, the shared `_shared/*` utilities, and the RLS/grant model.

The exactly-once safety property holds (claim flips `pending → claimed` atomically with `FOR UPDATE SKIP LOCKED`; only `pending` is ever re-claimed; Resend `Idempotency-Key = row.id`; a re-drain of a `sent`/`suppressed`/`expired` row is a no-op). Bearer auth is constant-time and cannot be bypassed by the flag/claim path. The email template escapes user values and the notification/CTA links resolve to the real `/leases/[id]` route.

However, deep analysis surfaced one **BLOCKER**: the second suppression layer — the CI-synthetic-owner guard that Pitfall 1 says MUST be live before the flag flips — is **runtime-dead**. `is_notification_suppressed(text)` revokes EXECUTE from PUBLIC and is never granted to `service_role`, but the drainer calls it directly as `service_role` via PostgREST. The call will be rejected (permission denied), the drainer ignores the RPC `error`, and the gate silently **fails open**. Three WARNINGs (fail-open on the other suppression layers, no reaper/retry for stranded `claimed`/`failed` rows, and a false-green Sentry cron check-in) and two INFO items round out the review.

## Critical Issues

### CR-01: Layer-2 suppression (`is_notification_suppressed`) is not executable by `service_role` — the CI-guard silently fails open

**File:** `supabase/functions/send-lease-reminders/index.ts:129-132` (call site) + `supabase/migrations/20260611141843_notification_suppression_list.sql:41` (missing grant)

**Issue:**
`is_notification_suppressed(p_email text)` was created for SECURITY DEFINER *trigger* callers (owner = `postgres`, which executes as owner). Its migration does:

```sql
revoke execute on function public.is_notification_suppressed(text) from public, anon, authenticated;
-- no `grant execute ... to service_role`
```

The Phase 53 drainer is a **new caller** that invokes it directly as the `service_role` DB role via PostgREST RPC:

```ts
const { data: suppressed } = await supabase.rpc("is_notification_suppressed", {
  p_email: owner.email,
});
if (suppressed === true) return false;   // error is NOT inspected
```

`service_role` does not hold EXECUTE on this function. Proof from the existing prod-passing suite: `tests/integration/rls/notifications.rls.test.ts` asserts `create_notification` — which does `revoke ... from public` **without** revoking `authenticated`, then `grant ... to service_role` — is *not* callable by `authenticated`. That can only be true if Supabase grants **no** default direct EXECUTE to non-owner roles on `public` functions (only the PostgreSQL PUBLIC default applies, which every one of these functions revokes). By the same rule, `is_notification_suppressed` (PUBLIC revoked, `service_role` never granted) is executable **only by its owner**. The two functions the drainer relies on that *do* work — `claim_lease_reminders` and `create_notification` — both carry an explicit `grant execute ... to service_role`; this one does not.

Runtime consequence: the RPC returns a permission error (SQLSTATE `42501` / PostgREST `PGRST202`). The drainer discards `error`, so `suppressed` is `null`, `null === true` is `false`, and layer 2 **never suppresses**. This is exactly Pitfall 1 — the re-ported CI-synthetic-owner guard is dead, per-list opt-outs via this layer are bypassed, and the failure is silent. Migration C2's go-live precondition ("the re-ported CI guard MUST be live BEFORE this flip") would be violated the moment the flag is flipped.

**Fix (two parts — both required):**

1. Grant EXECUTE to `service_role` in a new migration (belt-and-suspenders, matching `claim_lease_reminders`/`create_notification`):
```sql
grant execute on function public.is_notification_suppressed(text) to service_role;
```
2. Make the gate **fail closed** on a suppression-check error so a future revoke/outage cannot silently re-open it:
```ts
const { data: suppressed, error: supErr } = await supabase.rpc(
  "is_notification_suppressed",
  { p_email: owner.email },
);
if (supErr) return false;          // cannot verify -> do not email
if (suppressed === true) return false;
```

## Warnings

### WR-01: The email suppression gate fails OPEN on any query error (layers 3 & 4)

**File:** `supabase/functions/send-lease-reminders/index.ts:135-149`

**Issue:** Like layer 2, the hard-bounce/complaint check and the per-owner opt-out check discard their `error`:

```ts
const { data: bounced } = await supabase
  .from("email_suppressions").select("email").eq("email", owner.email).maybeSingle();
if (bounced) return false;

const { data: settings } = await supabase
  .from("notification_settings").select("email, leases").eq("user_id", owner.id).maybeSingle();
const ns = settings as { email: boolean; leases: boolean } | null;
if (ns && (ns.email === false || ns.leases === false)) return false;
```

On any transient error (network blip, `maybeSingle()` raising on an unexpected duplicate row), `bounced`/`settings` is `undefined`/`null`, so the gate treats an *unknown* state as "not suppressed" and sends. For a suppression gate this is the wrong default: a transient failure can email a hard-bounced address (Resend's own list is the only remaining backstop) or an owner who explicitly opted out of lease emails.

**Fix:** Inspect `error` on both queries and fail closed (skip the email, stamp `suppressed`, or leave the row `claimed` for retry) rather than proceeding:
```ts
const { data: bounced, error: bounceErr } = await supabase.from("email_suppressions")...
if (bounceErr) return false;
...
const { data: settings, error: nsErr } = await supabase.from("notification_settings")...
if (nsErr) return false;
```

### WR-02: No reaper/retry — `claimed` (and `failed`) rows are stranded permanently

**File:** `supabase/migrations/20260722005310_lease_reminders_delivery_state.sql:114-132` (claim RPC) + `supabase/functions/send-lease-reminders/index.ts:297-316` (terminal stamps) + column comment L43

**Issue:** `claim_lease_reminders` flips up to 100 rows to `delivery_status = 'claimed'` in a single statement, then the drainer processes them one at a time (each row does several DB round-trips plus a Resend HTTP call). If the isolate is torn down mid-batch (edge wall-clock limit, crash, deploy) after the claim commits but before a row reaches a terminal state, those rows are stuck at `claimed` forever — the claim query only ever re-selects `delivery_status = 'pending'`, so nothing re-drains them. There is no reaper anywhere in the migrations (verified). Separately, the column comment documents `failed = "Resend error (retryable)"`, but nothing ever re-queues `failed` rows, and `attempt_count` is incremented on claim yet can never exceed 1 because claimed/failed rows are never re-claimed. Net effect: a partial-batch failure or any Resend error means those reminders are silently never delivered and never retried — a liveness/robustness gap for a user-facing commitment.

**Fix:** Add a stale-claim requeue so orphaned/failed rows recover, e.g. a small SECURITY DEFINER function scheduled just before the drain (or fold into the claim) that resets `claimed`/`failed` rows older than N minutes and under an `attempt_count` cap back to `pending`:
```sql
update public.lease_reminders
set delivery_status = 'pending'
where delivery_status in ('claimed', 'failed')
  and attempt_count < 5
  and sent_at < now() - interval '30 minutes';
```
(Reconcile the comment: either implement the retry or drop the "retryable" wording for `failed`.)

### WR-03: The Sentry cron check-in reports `status='ok'` regardless of the drainer's actual result

**File:** `supabase/migrations/20260722012107_send_lease_reminders_drain_cron.sql:57-82`

**Issue:** `invoke_send_lease_reminders()` `net.http_post`s the drainer (fire-and-forget; pg_net is async) and then unconditionally posts a Sentry cron check-in with `status = 'ok'`. It never inspects the drainer's HTTP response. So if the drainer returns `401` (the go-live runbook requires `app_config.reminders.drain_secret` to byte-match `REMINDERS_INVOKE_SECRET`; if the operator sets one but not the other, every drain 401s), or `500`, or sends zero emails, the monitor still shows green. This is precisely the misconfiguration class that a cron monitor exists to catch, and it will read as healthy while delivery is broken. It mirrors the accepted `queue_payment_reminders` pattern, but that precedent doesn't gate an owner-visible email-delivery path.

**Fix:** Move the success check-in into the drainer itself (it already knows `processed`/`sent`) and post `status='ok'` with the real counts on completion / `status='error'` on failure, or read the pg_net response asynchronously (`net._http_response`) before checking in. At minimum, alert when consecutive drains report `processed > 0, sent = 0`.

## Info

### IN-01: Migration C2 references Migration C1 by the wrong timestamp

**File:** `supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql:30`

**Issue:** The go-live precondition text reads `Migration C1 (20260722013000_lease_reminders_goflip.sql) has been applied`, but the actual C1 file is `20260722013850_lease_reminders_goflip.sql`. An operator following the runbook and grepping for `20260722013000` will not find the file.

**Fix:** Correct the referenced timestamp to `20260722013850` (and audit `53-GO-LIVE-RUNBOOK.md` for the same stale reference).

### IN-02: `ctaUrl` is interpolated into the `href` attribute without escaping while every other value is escaped

**File:** `supabase/functions/send-lease-reminders/index.ts:102` (template) + `:290` (call site)

**Issue:** `buildReminderEmail` escapes `ownerName`, `propertyLabel`, and `daysLabel` via `escapeHtml`, but `params.ctaUrl` is dropped straight into `href="${params.ctaUrl}"`. It is currently safe (`appUrl` comes from validated env and `row.lease_id` is a UUID primary key), so this is not exploitable today — but it is the one interpolation into an attribute context that diverges from the D-05 "escape every interpolated value" contract, and would become a latent injection point if the URL construction ever incorporated a non-UUID value.

**Fix:** Escape or `encodeURI()` the URL for consistency, or add a comment documenting why `ctaUrl` is exempt (env + UUID only):
```ts
<a href="${escapeHtml(params.ctaUrl)}" ...>
```

---

_Reviewed: 2026-07-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
