# Phase 53: Renewal Reminder Delivery - Research

**Researched:** 2026-07-21
**Domain:** In-house transactional email delivery over pg_cron + Edge Function + Resend, draining an existing dedup queue with exactly-once + multi-layer suppression, replacing a dead n8n hop
**Confidence:** HIGH (all schema/function facts verified against applied migration files; a few prod *runtime* values — backlog row count, current `app_config` values, live trigger set — could not be queried this session and are flagged in Open Questions / Environment Availability. They do not block planning.)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (cadence):** Keep the existing 30/7/1-day-before-lease-end thresholds and the `queue_lease_reminders()` job unchanged (`reminder_type` CHECK stays `'30_days'/'7_days'/'1_day'`). Delivery is the gap; widening cadence is out of scope for REMIND-01..05.
- **D-02 (tier):** Renewal-reminder EMAIL is gated to Growth/Max via the existing tier-gate (`GROWTH_AND_MAX_PLANS` / `checkTierEntitlement`, mirror the `lease-signature` edge-fn gate). Starter/trial owners get the free in-app notification (REMIND-05) + the existing expiring-leases dashboard widget, but NO email. Honest tiering: the paid channel is email delivery; expiry awareness is free.
- **D-03 (email shape):** One email per `(lease, reminder_type)` row — no digest. Maps 1:1 to the delivery-state model, keeps idempotency clean, deep-links each lease. Low volume at 30/7/1 cadence.
- **D-04 (CTA):** Primary CTA deep-links to the lease detail page (`/leases/[id]`), where the owner has terms + the existing renew-lease dialog.
- **D-05 (template):** A **new reminder-specific email template** (user's explicit choice — NOT the generic transactional layout). Still built on the shared Resend rail (`_shared/resend.ts`, `escapeHtml` on all user values, `getCorsHeaders`/error conventions), with its own reminder-tailored subject/body/CTA. Owner-facing, plain, no emojis.
- **D-06 (clean-slate go-live):** The pre-flip migration COUNTS the queued `lease_reminders` backlog (logged for the record), marks every existing queued row delivered/expired via the new delivery-state column WITHOUT sending, THEN enables delivery. Only reminders queued AFTER go-live ever send. No catch-up, no storm.
- **D-07 (flag):** Delivery flip controlled by a `reminders_delivery_enabled` flag in the existing `app_config` table (default OFF). The `send-lease-reminders` edge fn early-returns while the flag is off. The backlog-clear migration sets the flag true as its LAST step, so delivery physically cannot fire before the clear runs. Auditable + reversible.

### Claude's Discretion
- Exact `delivery_status` column shape/enum values (`pending`/`sent`/`suppressed`/`failed` or similar) and whether `delivered_at` is separate — mirror the retention/webhook state patterns.
- Resend Idempotency-Key derivation (recommend `lease_id:reminder_type` or the row id).
- Reminder-email copy specifics, subject line wording, days-remaining phrasing.
- pg_cron slot for the drain job (find a free window; avoid the 3 AM cleanup cluster and the `queue_lease_reminders` slot).

### Deferred Ideas (OUT OF SCOPE)
- Widening reminder cadence (60/30/7 etc.) — a queue + CHECK + backfill change; revisit if owners ask.
- Per-owner digest coalescing of same-day reminders — Phase 62 (Scheduled Owner Digest) owns the digest surface.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REMIND-01 | Growth/Max owner receives automated renewal reminder emails, delivered in-house by a `send-lease-reminders` Edge Function draining `lease_reminders` on pg_cron (dead n8n hop `wf-lease-reminder` removed) | New edge fn mirrors `lease-signature` rail (Resend + `_shared/*`); cron→`net.http_post`→edge-fn invocation mirrors the n8n `notify_n8n_*` `net.http_post` shape; queue filler `queue_lease_reminders()` stays (D-01). Removal = drop `trg_lease_reminders_notify_n8n` trigger + `notify_n8n_lease_reminder()` fn. |
| REMIND-02 | Exactly once per (lease, reminder_type) — delivery-state column (`delivery_status`/`delivered_at`) added, `FOR UPDATE SKIP LOCKED` drain, Resend Idempotency-Key | `lease_reminders` today has NO delivery-state column (only `sent_at` which defaults to `now()` at INSERT = queued-time). Add columns; drain `WHERE delivery_status='pending' FOR UPDATE SKIP LOCKED LIMIT N`; `sendEmail({ idempotencyKey })` already supported in `_shared/resend.ts`. |
| REMIND-03 | Honors ALL suppression layers — `notification_settings` opt-out, `email_suppressions`, and the synthetic-CI-owner guard currently embedded in `notify_n8n_lease_reminder` (re-ported, not dropped) | The trigger's ONLY app-level guard is `is_notification_suppressed(owner_email)`; the drainer must re-port that AND add the two layers n8n/absence covered: `email_suppressions` + `notification_settings.email && .leases`. Full ordered gate below. |
| REMIND-04 | Delivery flip gated on a backlog dry-run — queued backlog counted and expired/cleared before enabling sends (no storm) | The pre-flip migration counts + `UPDATE ... SET delivery_status='expired'` all pre-existing rows without sending, then flips the flag true as its LAST statement (D-06/D-07). |
| REMIND-05 | Each delivered reminder also creates an in-app notification via the notification write path | `create_notification(...)` RPC (Phase 52, service_role-only) with a NEW `notification_type` value (the CHECK must be extended). |
</phase_requirements>

## Summary

Renewal-reminder delivery is a **plumbing** phase, not a feature-design phase: the queue (`lease_reminders`), the filler cron (`queue_lease_reminders()`, still live, still accumulating a backlog every day), the send rail (`_shared/resend.ts` + `escapeHtml` + `email-layout`), the tier gate (`GROWTH_AND_MAX_PLANS`), the in-app write-path (`create_notification`), the suppression primitives (`is_notification_suppressed`, `email_suppressions`, `notification_settings`), and the flag store (`app_config`) all already exist. The one confirmed gap is that delivery is wired to a **dead n8n hop** (an AFTER-INSERT pg trigger `trg_lease_reminders_notify_n8n` → `net.http_post` to a disabled workflow), so the queue fills and no email ever sends. Zero new npm/Deno dependencies.

The work: (1) add a delivery-state model to `lease_reminders`; (2) build `send-lease-reminders`, a service-role Edge Function that drains queued rows `FOR UPDATE SKIP LOCKED`, creates the in-app notification for every owner (all tiers), and — for entitled Growth/Max owners who pass **every** suppression layer — sends one Resend email with an Idempotency-Key, stamping `delivery_status`/`delivered_at`; (3) schedule a pg_cron drain job that invokes the fn via `net.http_post` with a bearer; (4) add an `app_config.reminders_delivery_enabled` kill-flag (default OFF) that the fn honors with an early return; (5) run the REMIND-04 pre-flip migration that counts + expires the whole backlog without sending, drops the n8n trigger, and flips the flag true as its last statement.

**The #1 load-bearing risk (PITFALLS.md #1 + #4):** the suppression guard `is_notification_suppressed()` lives *inside* the trigger being deleted. Drop it without re-porting and every CI run spams the synthetic owners (`e2e-owner-a/b@tenantflow.app`) — the exact bug migration `20260611141843` was written to stop — and owners who toggled off lease reminders still get email. The drainer must re-implement the full suppression stack before the flag is flipped true.

**Primary recommendation:** Build `send-lease-reminders` as a verify_jwt=false, shared-secret-authenticated, service-role drainer that mirrors `lease-signature`'s edge-fn conventions; gate the email (not the in-app notification) behind an ordered `shouldEmail(owner)` check = entitled-tier AND `is_notification_suppressed`=false AND not in `email_suppressions` AND `notification_settings.email && .leases`; guard exactly-once with `delivery_status` + `FOR UPDATE SKIP LOCKED` + Resend Idempotency-Key = `lease_reminders.id`; ship the pre-flip backlog-expiry + trigger-drop + flag-flip as the final migration.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Threshold queueing (30/7/1) | Database (pg_cron `queue_lease_reminders`) | — | Unchanged (D-01); already live in prod |
| Drain scheduling / invocation | Database (pg_cron + pg_net `net.http_post`) | — | Mirrors the existing n8n `net.http_post` shape; cron owns "when" |
| Email rendering + send | Edge Function (Deno) + Resend | — | pg_net cannot render HTML, escape, or handle Resend responses; that's the `_shared/resend.ts` rail |
| Tier entitlement (email gate) | Edge Function | Database (`users.subscription_status/plan`) | Per-owner lookup reusing `GROWTH_AND_MAX_PLANS`; `checkTierEntitlement` is per-request so it's a mirror, not a direct call |
| Suppression enforcement | Edge Function | Database (`is_notification_suppressed`, `email_suppressions`, `notification_settings`) | Was embedded in the trigger; re-ported into the drainer (REMIND-03) |
| Exactly-once delivery state | Database (`lease_reminders.delivery_status`) | Edge Function (Resend Idempotency-Key) | Row-level lock + null-guard is the real guard; Idempotency-Key is a secondary within-run guard |
| In-app notification | Database (`create_notification` RPC) | Edge Function (caller) | Single un-bypassable write path (NOTIF-01); always created, all tiers |
| Delivery kill-switch | Database (`app_config` flag) | Edge Function (early return) | Auditable, reversible, gates the physical send (D-07) |
| Backlog clean-slate | Database (pre-flip migration) | — | Count + expire-without-send + trigger-drop + flag-flip, atomic ordering (D-06) |

## Standard Stack

**Zero new dependencies.** Every capability rides an existing, in-repo rail (STACK.md HIGH-confidence verdict). This phase installs no npm/Deno packages.

### Core (existing rails reused)
| Rail | Location | Purpose | Provenance |
|------|----------|---------|-----------|
| `sendEmail` | `supabase/functions/_shared/resend.ts` | Resend REST send; already supports `idempotencyKey`, `tags`, `attachments`; never throws | [VERIFIED: file read] |
| `escapeHtml` | `supabase/functions/_shared/escape-html.ts` | XSS-escape all user values in HTML | [VERIFIED: file read] |
| `wrapEmailLayout` | `supabase/functions/_shared/email-layout.ts` | Branded header/footer wrapper (D-05 builds a NEW body but MAY reuse the wrapper for deliverability/brand) | [VERIFIED: file read] |
| `getCorsHeaders` / `handleCorsOptions` / `getJsonHeaders` | `_shared/cors.ts` | CORS (fail-closed on unset `NEXT_PUBLIC_APP_URL`) | [VERIFIED: file read] |
| `errorResponse` / `captureWebhookError` / `logEvent` | `_shared/errors.ts` | Sentry + structured logging; never leaks `err.message` to client | [VERIFIED: file read] |
| `validateEnv` | `_shared/env.ts` | Required/optional env validation inside the handler | [VERIFIED: file read] |
| `createAdminClient` | `_shared/supabase-client.ts` | Service-role client (RLS-bypassing) for the drainer | [VERIFIED: referenced by lease-signature] |
| `GROWTH_AND_MAX_PLANS` | `_shared/tier-gate.ts` | Exported price-ID/lookup-key set for the email tier gate | [VERIFIED: file read] |
| `create_notification(...)` RPC | migration `20260719193759` | Service-role-only in-app write path (REMIND-05) | [VERIFIED: migration] |
| `is_notification_suppressed(text)` | migration `20260611141843` | Synthetic-CI-owner guard (REMIND-03) | [VERIFIED: migration] |
| `email_suppressions` table | migration `20260219100002` | Hard bounce/complaint suppression (REMIND-03) | [VERIFIED: migration] |
| `notification_settings` table | migration `20251216120000` | Per-owner opt-out (`email`, `leases` columns) | [VERIFIED: migration] |
| `app_config` table | migration `20260504162155` | Service-role-only KV for the delivery flag + drain secret | [VERIFIED: migration] |
| `lease_reminders` table + `queue_lease_reminders()` | migrations `20260222110100` / `20260222120000` | The dedup queue + filler (unchanged, D-01) | [VERIFIED: migration] |
| pg_cron + pg_net (`net.http_post`) | `extensions` schema | Scheduling + HTTP invoke | [VERIFIED: migration usage] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge-fn drain | pg_net → Resend direct | Rejected (ARCHITECTURE.md): pg_net can't render/escape HTML or handle Resend responses/idempotency |
| New reminder template (D-05) | Reuse generic transactional layout | User explicitly chose a NEW template; MAY still wrap in `wrapEmailLayout` for brand/deliverability |
| Shared-secret bearer auth on the drain fn | verify_jwt=true + service-role JWT from Vault | Both viable; shared-secret-in-`app_config` mirrors the existing n8n auth exactly (recommended) — see Open Questions |

**Installation:** none.

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** STACK.md verified (HIGH) that renewal delivery rides entirely on existing rails (pg_cron + pg_net + `_shared/resend.ts`). No npm/PyPI/crates/Deno additions; the Package Legitimacy Gate has nothing to audit. If the planner discovers a dependency is actually needed (it should not be), run the gate before adding it.

## Architecture Patterns

### System / Data Flow Diagram (the target async flow)

```
        (unchanged, D-01, LIVE in prod)
pg_cron  queue-lease-reminders (0 6 * * * UTC)
   └─► queue_lease_reminders()  ──INSERT ON CONFLICT DO NOTHING──►  lease_reminders
                                                                    (delivery_status='pending')
        (NEW — the drain)
pg_cron  send-lease-reminders-drain (pick a FREE slot, D-04 discretion; avoid 06:00 + 3AM cluster)
   └─► SECURITY DEFINER fn  ──net.http_post(url, Bearer <drain_secret from app_config>)──►
                                                              send-lease-reminders (Edge, verify_jwt=false)
                                                                        │
   ┌────────────────────────────────────────────────────────────────┘
   ▼
 if app_config.reminders_delivery_enabled != 'true'  ──►  early return (D-07 no-op)   [REMIND-04 physical gate]
   │
   ▼  claim batch: SELECT ... WHERE delivery_status='pending' FOR UPDATE SKIP LOCKED LIMIT N   [REMIND-02]
   for each row → join leases → users(owner email/name, subscription_status/plan) + property + tenant
      │
      ├─► create_notification(owner, 'lease_renewal_reminder', title, msg, 'lease', lease_id, '/leases/<id>')  [REMIND-05, ALL tiers]
      │
      ├─► shouldEmail(owner)?  [REMIND-03 ordered gate]
      │      1. entitled?  active/trialing sub AND GROWTH_AND_MAX_PLANS.has(plan)   (D-02)  → else 'suppressed'/'skipped'
      │      2. is_notification_suppressed(owner_email)   (CI synthetic guard)      → else 'suppressed'
      │      3. NOT in email_suppressions (bounced/complained)                      → else 'suppressed'
      │      4. notification_settings.email = true AND .leases = true (opt-out)     → else 'suppressed'
      │            (Resend ALSO auto-checks its own list on send — belt & suspenders)
      │
      ├─► if all pass: sendEmail({ to:[owner_email], subject, html, idempotencyKey: row.id, tags })  [REMIND-02]
      │        success → UPDATE delivery_status='sent', delivered_at=now(), resend_message_id=<id>
      │        failure → UPDATE delivery_status='failed', attempt_count = attempt_count + 1  (+ Sentry)
      │
      └─► if gated: UPDATE delivery_status='suppressed'  (in-app already created above)
   Sentry cron check-in on completion (mirror queue_payment_reminders pattern)
```

### Recommended Project Structure
```
supabase/functions/send-lease-reminders/
└── index.ts            # Deno.serve drainer (mirror lease-signature/index.ts conventions)
supabase/functions/tests/
└── send-lease-reminders-test.ts   # deno test, mocked Resend fetch (mirror lease-signing-test.ts)
supabase/migrations/
├── <ts>_lease_reminders_delivery_state.sql   # add columns + extend notification_type CHECK + add app_config flag(false)
├── <ts>_send_lease_reminders_drain_cron.sql  # SECURITY DEFINER invoke fn + cron.schedule (safe no-op while flag off)
└── <ts>_lease_reminders_goflip.sql           # REMIND-04 pre-flip: count + expire backlog + drop n8n trigger + flag=true (LAST)
supabase/config.toml
└── [functions.send-lease-reminders] verify_jwt = false
src/components/notifications/notification-item.tsx
└── TYPE_VISUALS: add 'lease_renewal_reminder' icon/chip (optional; neutral Bell fallback works)
```

### Pattern 1: Delivery-state model on `lease_reminders` (REMIND-02)
**What:** Add a claim/stamp state to the queue. `sent_at` is NOT usable — it defaults to `now()` at INSERT (queued-time, misleading; documented in its own column comment). Mirror the text+CHECK convention (no ENUMs, CLAUDE.md rule 6).
**Recommended columns (Claude's discretion, D-02):**
```sql
alter table public.lease_reminders
  add column if not exists delivery_status text not null default 'pending'
    constraint lease_reminders_delivery_status_check
    check (delivery_status in ('pending','sent','suppressed','failed','expired')),
  add column if not exists delivered_at       timestamptz,
  add column if not exists resend_message_id  text,
  add column if not exists attempt_count      integer not null default 0;

create index if not exists idx_lease_reminders_pending
  on public.lease_reminders (delivery_status) where delivery_status = 'pending';

comment on column public.lease_reminders.delivery_status is
  'pending=queued not yet drained; sent=Resend accepted; suppressed=blocked by a suppression/tier gate (in-app still created); failed=Resend error (retryable); expired=backlog cleared at go-live without sending (REMIND-04).';
```
Status semantics: `pending`→claimed→(`sent`|`suppressed`|`failed`); `expired` set only by the pre-flip migration. The planner MAY split `suppressed` vs a distinct `skipped_tier` if per-analytics granularity is wanted — [ASSUMED] discretion.

### Pattern 2: Drainer skeleton (mirror `lease-signature/index.ts`)
```typescript
// supabase/functions/send-lease-reminders/index.ts  [pattern, not verbatim]
Deno.serve(async (req: Request) => {
  const options = handleCorsOptions(req); if (options) return options;
  try {
    const env = validateEnv({ required: [
      "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL", "RESEND_API_KEY",
      "REMINDERS_INVOKE_SECRET",           // shared secret; also stored in app_config for the cron
    ] });
    // 1. authenticate the cron caller (verify_jwt=false → self-check the bearer)
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${env["REMINDERS_INVOKE_SECRET"]}`)
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: getJsonHeaders(req) });

    const supabase = createAdminClient(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"]);
    const appUrl = env["NEXT_PUBLIC_APP_URL"].replace(/\/$/, "");

    // 2. D-07 physical gate — early return while the flag is off
    const { data: flag } = await supabase.from("app_config")
      .select("value").eq("key", "reminders_delivery_enabled").maybeSingle();
    if (flag?.value !== "true")
      return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { status: 200, headers: getJsonHeaders(req) });

    // 3. claim a batch (REMIND-02). Prefer a SECURITY DEFINER RPC that does the
    //    FOR UPDATE SKIP LOCKED claim server-side (PostgREST cannot express row locks).
    const { data: claimed } = await supabase.rpc("claim_lease_reminders", { p_limit: 100 });
    // ... per row: create_notification (always) → shouldEmail gate → sendEmail → stamp status
  } catch (err) {
    return errorResponse(req, 500, err, { fn: "send-lease-reminders" });
  }
});
```
**Note on the claim:** `FOR UPDATE SKIP LOCKED` is a SQL row-lock — PostgREST cannot express it. Recommend a small SECURITY DEFINER RPC `claim_lease_reminders(p_limit int)` that `UPDATE ... SET delivery_status='claimed' ... WHERE id IN (SELECT id FROM lease_reminders WHERE delivery_status='pending' ... FOR UPDATE SKIP LOCKED LIMIT p_limit) RETURNING ...` (claim-in-one-statement), so overlapping cron runs never double-claim. This mirrors the `FOR UPDATE SKIP LOCKED` discipline in `calculate_late_fees()`/`expire_leases()`. [ASSUMED] design — planner confirms whether to add a 'claimed' interim state or claim+send in one pass.

### Pattern 3: The suppression gate (REMIND-03 — load-bearing)
Re-port the trigger's `is_notification_suppressed` AND add the two layers it never had. Order cheap→expensive:
```typescript
async function shouldEmail(supabase, owner): Promise<boolean> {
  // (1) tier (D-02): active/trialing AND Growth/Max
  const entitled = ["active","trialing"].includes(owner.subscription_status)
                && GROWTH_AND_MAX_PLANS.has(owner.subscription_plan ?? "");
  if (!entitled) return false;
  // (2) CI synthetic guard — re-ported from notify_n8n_lease_reminder
  const { data: sup } = await supabase.rpc("is_notification_suppressed", { p_email: owner.email });
  if (sup === true) return false;
  // (3) hard bounce/complaint
  const { data: bounced } = await supabase.from("email_suppressions")
    .select("email").eq("email", owner.email).maybeSingle();
  if (bounced) return false;
  // (4) per-owner opt-out ("Lease expirations, renewals, and signatures" = the `leases` category)
  const { data: ns } = await supabase.from("notification_settings")
    .select("email, leases").eq("user_id", owner.id).maybeSingle();
  if (ns && (ns.email === false || ns.leases === false)) return false;   // absent row = defaults true = send
  return true; // Resend also auto-checks its own suppression list on send
}
```
Note `is_notification_suppressed` is REVOKEd from public/anon/authenticated but the service-role drainer can call it (SECURITY DEFINER runs as owner). `create_notification` is likewise service_role-only granted — the admin client can `.rpc()` both.

### Pattern 4: In-app notification (REMIND-05) — always created, all tiers
```typescript
await supabase.rpc("create_notification", {
  p_user_id: owner.id,
  p_type: "lease_renewal_reminder",         // NEW type — extend the CHECK (see Pattern 5)
  p_title: `Lease renewal reminder`,        // copy is Claude's discretion (D-05)
  p_message: `${propertyLabel} — lease ends in ${daysLabel}`,
  p_entity_type: "lease",
  p_entity_id: leaseId,
  p_action_url: `/leases/${leaseId}`,       // app-relative (open-redirect guard in resolveHref)
});
```
**Interpretation of D-02 vs REMIND-03 (flag for confirm):** the in-app notification is created for EVERY owner (Growth/Max/Starter/trial), consistent with Phase 52's contract that `create_notification` does NOT consult `notification_settings` ("in-app notifications are always created", per `20260719193759` header). Only the EMAIL honors the tier gate + suppression layers. This resolves the apparent tension between D-02 ("Starter gets the in-app notification, no email") and REMIND-03 ("honors ALL suppression layers") — suppression gates the *email channel*. [ASSUMED interpretation — recommend the planner/discuss confirm whether a CI-synthetic or hard-opted-out owner should also be skipped for the in-app row.]

### Pattern 5: New `notification_type` + extend the CHECK (REMIND-05)
Current live CHECK allows exactly: `maintenance, lease, payment, system, lease_signed, lease_executed, lease_finalize_failed, maintenance_created, maintenance_status` (migration `20260720001542`). There is NO reminder type — a `create_notification` insert with an unlisted type will violate the CHECK *inside* the drainer and abort. Must extend:
```sql
alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check
  check (notification_type = any (array[
    'maintenance','lease','payment','system',
    'lease_signed','lease_executed','lease_finalize_failed',
    'maintenance_created','maintenance_status',
    'lease_renewal_reminder'                         -- NEW
  ]::text[]));
```
- `notifications_archive` had its copied CHECK **dropped** in `20260720015620`, so the archive does NOT need re-extending (validated at source). [VERIFIED: migration]
- Frontend: add `lease_renewal_reminder` to `TYPE_VISUALS` in `src/components/notifications/notification-item.tsx` (e.g. `CalendarClock`/`BellRing` lucide icon + chip). Optional — the `FALLBACK_VISUAL` (neutral Bell) renders unmapped types safely, but per the UI-SPEC copywriting/visual contract a dedicated icon is preferred. No TS union to extend (`mapNotificationRow` treats `notification_type` as a plain string). [VERIFIED: file read]

### Pattern 6: pg_cron drain job invoking the edge fn (mirror the n8n `net.http_post` shape)
```sql
-- SECURITY DEFINER wrapper; SET search_path=public,extensions; Sentry check-in (mirror queue_payment_reminders)
create or replace function public.invoke_send_lease_reminders()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text; v_sentry text; v_start timestamptz := clock_timestamp();
begin
  select value into v_url    from public.app_config where key = 'reminders.drain_url';     -- the edge fn URL
  select value into v_secret from public.app_config where key = 'reminders.drain_secret';  -- == REMINDERS_INVOKE_SECRET
  if v_url is null or v_url = '' then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(v_secret,'')),
    timeout_milliseconds := 5000
  );
  -- Sentry cron check-in (register a NEW monitor slug, mirror payment-reminders check-in)
  select value into v_sentry from public.app_config where key = 'sentry.cron.send_lease_reminders_url';
  if v_sentry is not null and v_sentry <> '' then
    perform net.http_post(url := v_sentry,
      body := jsonb_build_object('status','ok','environment','production',
                                 'duration', round(extract(epoch from (clock_timestamp()-v_start))::numeric,3)),
      headers := jsonb_build_object('Content-Type','application/json'), timeout_milliseconds := 5000);
  end if;
end; $$;

select cron.schedule('send-lease-reminders-drain', '30 6 * * *',   -- example: 06:30 UTC, just after the 06:00 filler
  $$select public.invoke_send_lease_reminders()$$);
```
While `reminders_delivery_enabled` is off the fn early-returns, so scheduling the cron before go-live is a safe no-op.

### Pattern 7: `config.toml` block (verify_jwt)
Every function needs an explicit `[functions.*]` block (config.toml comment: default is verify_jwt=true). The drainer self-authenticates the cron bearer → verify_jwt=false:
```toml
[functions.send-lease-reminders]
verify_jwt = false   # cron-invoked; the function's own REMINDERS_INVOKE_SECRET bearer check IS the auth
```

### Go-Live Ordering (REMIND-04 — the safe sequence)
1. **Migration A** — `ALTER lease_reminders` add delivery-state cols; extend `notifications_notification_type_check`; `INSERT app_config('reminders_delivery_enabled','false') ON CONFLICT DO NOTHING`; seed `reminders.drain_url` / `reminders.drain_secret` / sentry slug keys (empty → operator fills). Add `claim_lease_reminders` RPC.
2. **Deploy** `send-lease-reminders` via `bun scripts/deploy-edge-functions.ts send-lease-reminders` (CLI-401 workaround; owner-run if PAT stale). Fn is deployed with FULL suppression logic but flag is OFF → early-return no-op.
3. **Migration B** — create `invoke_send_lease_reminders()` + `cron.schedule('send-lease-reminders-drain', ...)`. Still a no-op (flag off).
4. **Migration C (the pre-flip gate)** — in ONE migration, in this order:
   a. `SELECT count(*) ... WHERE delivery_status='pending'` → `RAISE NOTICE` (log the backlog for the record, D-06).
   b. `UPDATE lease_reminders SET delivery_status='expired', delivered_at=now() WHERE delivery_status='pending'` (clear WITHOUT sending).
   c. `DROP TRIGGER IF EXISTS trg_lease_reminders_notify_n8n ON public.lease_reminders;` then `DROP FUNCTION IF EXISTS public.notify_n8n_lease_reminder();` (remove the dead hop; suppression already re-ported in the fn).
   d. **LAST statement:** `UPDATE app_config SET value='true' WHERE key='reminders_delivery_enabled';`
   After Migration C, only rows the filler queues AFTER go-live are `pending` and will ever send.

**Anti-Patterns to avoid**
- **Flipping the flag before the backlog is expired** → storm (PITFALLS #3). The flag flip is the LAST statement of the pre-flip migration.
- **Dropping the n8n trigger without re-porting `is_notification_suppressed`** → CI spam + opt-out bypass (PITFALLS #4). Re-port first (in the fn, step 2), drop last (step 4c).
- **Using `sent_at` as the delivery guard** → it's queued-time, not sent-time; double-sends (PITFALLS #1, tech-debt table). Add real delivery-state cols.
- **Calling `checkTierEntitlement` directly in the drainer** → it needs a `req`, writes a `gate_events` row, and returns a 402 Response; it's a per-request UI gate, not a batch primitive. Reuse only the exported `GROWTH_AND_MAX_PLANS` set + inline the active-sub check.
- **Two delivery paths live at once** (leaving the trigger wired) → double-send. Exactly one path after Migration C.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Send email | A raw `fetch` to Resend | `sendEmail` (`_shared/resend.ts`) | Handles chunked base64, Idempotency-Key header, Resend suppression, Sentry capture, never-throws |
| HTML escaping | Inline `.replace` | `escapeHtml` (`_shared/escape-html.ts`) | Consistent, XSS-safe on all user values (owner name, property label) |
| Env validation | `Deno.env.get` scattered | `validateEnv({required})` inside the handler | Fail-fast, cached, house convention |
| In-app notification insert | Direct `INSERT INTO notifications` | `create_notification(...)` RPC | NOTIF-01 single-writer invariant; direct inserts were removed as a Phase 52 BLOCKER (`20260719211249`) |
| CI-owner suppression | A hardcoded email list | `is_notification_suppressed(p_email)` | Suppression is DATA in `app_config`; no code change to add/remove synthetic accounts |
| Bounce/complaint suppression | Nothing (rely on Resend) | `email_suppressions` read + existing `resend-webhook` writer | App list is authoritative; Resend's internal list is opaque |
| Exactly-once | A `SELECT` then `UPDATE` in two steps | `delivery_status` + `FOR UPDATE SKIP LOCKED` claim + Resend Idempotency-Key | Row lock + null-guard survives overlapping cron runs (mirror `calculate_late_fees`) |
| Cron scheduling | A Node/BullMQ/Inngest scheduler | pg_cron + pg_net | Live rail; zero new deps (STACK.md) |

**Key insight:** every "custom" temptation here (raw Resend call, direct notification insert, hardcoded suppression) has already bitten this codebase — Phase 52's duplicate-notification BLOCKER, the `20260611141843` CI-spam fix. The rails exist *because* the hand-rolled versions failed.

## Runtime State Inventory

This IS a removal/migration phase (drops the n8n hop, adds delivery state, clears a backlog). After every repo file is updated, what runtime state still carries the old wiring?

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (queue rows) | `lease_reminders` has a **live, growing backlog** — the `queue-lease-reminders` cron (0 6 * * * UTC) is still scheduled (never unscheduled; only `calculate-late-fees` + `payment-reminders` were unscheduled in the April demolition) and fills the queue daily; the n8n hop never drains it. Exact count NOT queryable this session (prod access blocked) — the pre-flip COUNT migration logs it (D-06). | Migration C: count + `UPDATE ... delivery_status='expired'` all pre-existing `pending` rows without sending. Data migration, not just code. |
| Live service config (DB, not git) | `app_config` rows: `n8n.webhook.lease_reminder_url`, `n8n.webhook.secret` — current values NOT queryable this session. If `lease_reminder_url` is empty the trigger already no-ops; if set, it POSTs to a dead workflow (harmless). Either way the trigger is removed. NEW rows to add: `reminders_delivery_enabled` (false→true), `reminders.drain_url`, `reminders.drain_secret`, `sentry.cron.send_lease_reminders_url`. | Migration A seeds the new keys empty; operator fills `drain_url`/`drain_secret`/sentry-slug post-deploy (runbook). Migration C flips `reminders_delivery_enabled` true. |
| OS/DB-registered state (triggers, cron) | `trg_lease_reminders_notify_n8n` AFTER-INSERT trigger + `notify_n8n_lease_reminder()` fn on `public.lease_reminders` (a plain pg trigger + pg_net, NOT a Dashboard "Database Webhook"). NEW `send-lease-reminders-drain` cron + `invoke_send_lease_reminders()` fn + a NEW Sentry cron monitor slug. | Migration C drops the trigger + fn. Migration B registers the new cron. Register the Sentry monitor (owner-run, like `payment-reminders`). Verify at plan time via prod introspection that NO other trigger/webhook fires on `lease_reminders` INSERT. |
| Secrets / env vars | Edge fn needs `RESEND_API_KEY` (already set for lease-signature), `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already set), and a NEW `REMINDERS_INVOKE_SECRET` (Supabase function secret) that MUST equal `app_config.reminders.drain_secret`. The retired `n8n.webhook.secret` is untouched (other notify fns may still reference it — do NOT delete it in this phase). | Set `REMINDERS_INVOKE_SECRET` as a Supabase function secret + mirror it into `app_config.reminders.drain_secret` (owner-run). |
| Build artifacts / installed packages | None — no npm/Deno package changes; no egg-info/compiled artifacts. `supabase.ts` regen (`bun run db:types`) after the migrations land (new columns on `lease_reminders`, extended CHECK). | Owner-run `bun run db:types` after Migration A/C applied + reconciled. |

**The canonical question answered:** after the repo is updated, the runtime still holds (a) a growing queue backlog, (b) a live filler cron, (c) the n8n trigger, and (d) `app_config` values invisible to git. Migration C addresses (a) and (c); (b) is kept by design (D-01); (d) is operator-filled.

## Common Pitfalls

### Pitfall 1: Suppression bypass — the drainer spams CI synthetic owners / ignores opt-outs (PITFALLS.md #4, THE load-bearing one)
**What goes wrong:** `is_notification_suppressed()` lives inside `notify_n8n_lease_reminder`. Drop the trigger, forget to re-port, and every RLS/E2E run's synthetic owners (`e2e-owner-a/b@tenantflow.app`) get emailed on every CI run (the exact bug `20260611141843` fixed), plus owners who opted out of the `leases` category still get email.
**Why:** suppression was embedded in the trigger, not in a shared sender. `sendEmail` only leans on Resend's opaque list.
**How to avoid:** the ordered `shouldEmail()` gate (Pattern 3) — all four layers — MUST be live in the deployed fn BEFORE Migration C flips the flag true.
**Warning signs:** synthetic inbox fills during CI; an unsubscribed owner still gets reminders; `delivery_status='sent'` rows for an address present in `email_suppressions`.

### Pitfall 2: Reminder storm at go-live (PITFALLS.md #3)
**What goes wrong:** delivery has been dead for weeks while the filler kept queuing; flip delivery on and an owner gets a burst of stale "your lease expires" emails, many for leases already expired. Trips Resend complaint thresholds, destroys trust on the feature you're proving.
**How to avoid:** D-06 clean slate — the pre-flip migration expires the ENTIRE backlog (`delivery_status='expired'`) without sending, and the flag flip is the LAST statement. Only post-go-live rows send.
**Warning signs:** backlog count in the hundreds at go-live; multiple thresholds pending for one lease.

### Pitfall 3: Double-send / no idempotency anchor (PITFALLS.md #1)
**What goes wrong:** `UNIQUE(lease_id, reminder_type)` dedups ROWS, not SENDS. Without a delivery-state column the drainer re-emails the whole queue every run; leaving the n8n trigger wired = two delivery paths.
**How to avoid:** `delivery_status` + `FOR UPDATE SKIP LOCKED` claim (Pattern 1/2) + Resend Idempotency-Key = `lease_reminders.id`; drop the n8n trigger in the same rollout (Migration C).
**Warning signs:** drainer run count ≠ `delivery_status='sent'` count; owners report repeated notices.

### Pitfall 4: notification_type CHECK violation aborts the drainer mid-transaction
**What goes wrong:** `create_notification('lease_renewal_reminder', ...)` with the type NOT in the CHECK raises `23514` inside the drainer and, if the in-app write and the state-stamp share a transaction, aborts the claim. (This is exactly the Phase 52 review-C6 class of bug — the event triggers wrote un-allowed types and aborted their parent statements until hotfix `20260720001542`.)
**How to avoid:** extend the CHECK (Pattern 5) in Migration A, BEFORE the fn can run against a flag-on state.
**Warning signs:** drainer 500s with a constraint error; no `pending` rows ever flip to `sent`.

### Pitfall 5: Timezone / stale-threshold edge (PITFALLS.md #2) — inherited, mostly out of scope
**What goes wrong:** UTC date math can fire a "1_day" reminder after a west-coast lease already lapsed.
**How to avoid:** D-01 keeps `queue_lease_reminders()` (which already uses `CURRENT_DATE` arithmetic) unchanged — the drainer does NOT recompute thresholds, it drains what's queued. Keep the email's days-remaining phrasing derived from `reminder_type` (30/7/1) or `end_date - CURRENT_DATE`, not `now()::timestamptz`. Timezone precision is out of scope for REMIND-01..05 (a cadence change belongs to the deferred 60/30/7 work).
**Warning signs:** off-by-one send-day tickets — track but do not fix in this phase.

## Code Examples

### Reading the delivery flag (D-07 early return)
```typescript
const { data: flag } = await supabase.from("app_config")
  .select("value").eq("key", "reminders_delivery_enabled").maybeSingle();
if (flag?.value !== "true") return new Response(JSON.stringify({ ok: true, skipped: "disabled" }),
  { status: 200, headers: getJsonHeaders(req) });
```

### The claim RPC (server-side FOR UPDATE SKIP LOCKED) — recommended
```sql
create or replace function public.claim_lease_reminders(p_limit int default 100)
returns setof public.lease_reminders
language sql security definer set search_path = public as $$
  update public.lease_reminders lr
  set delivery_status = 'claimed', attempt_count = lr.attempt_count + 1
  where lr.id in (
    select id from public.lease_reminders
    where delivery_status = 'pending'
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning lr.*;
$$;
revoke all on function public.claim_lease_reminders(int) from public, anon, authenticated;
grant execute on function public.claim_lease_reminders(int) to service_role;
```
(A 'claimed' interim state makes a crashed run's rows visible for retry; alternatively claim+send in one pass and only ever write terminal states — [ASSUMED] planner's call.)

### Absolute CTA URL (mirror lease-signature)
```typescript
const appUrl = env["NEXT_PUBLIC_APP_URL"].replace(/\/$/, "");
const ctaUrl = `${appUrl}/leases/${leaseId}`;   // absolute for the email button; action_url stays app-relative '/leases/<id>'
```

### Deno test skeleton (mirror `tests/lease-signing-test.ts`, mock Resend fetch)
```typescript
// Run: deno test --allow-all --no-check supabase/functions/tests/send-lease-reminders-test.ts
// Stub globalThis.fetch to capture Resend calls; assert: flag-off → 0 sends; suppressed owner → 0 sends,
// in-app still created; entitled+clean → exactly 1 send with Idempotency-Key === row.id.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `lease_reminders` INSERT → `trg_lease_reminders_notify_n8n` → pg_net → n8n `wf-lease-reminder` → Resend | pg_cron → `send-lease-reminders` edge fn drains queue → Resend + `create_notification` | Phase 53 (this phase) | Removes the dead hop; delivery in-house, exactly-once, suppression-honoring |
| `payment_reminders` + `queue_payment_reminders()` + `payment-reminders` cron (the ARCHITECTURE/CONTEXT "mirror analog") | **Dropped** in `20260418140000_demolish_rent_and_tenant_portal.sql` (table, fn, cron all removed) | 2026-04-18 | The CONTEXT/ARCHITECTURE reference to "mirror `queue_payment_reminders`" is STALE — it no longer exists in prod. Mirror the still-live `queue_lease_reminders` (scheduling) + the migration-file `queue_payment_reminders` (Sentry check-in shape) + the `notify_n8n_*` `net.http_post` shape (invoke). There is NO existing cron→edge-fn drain in the repo — this pattern is new. |
| Direct `INSERT INTO notifications` in signing RPCs | `create_notification` single-writer (NOTIF-01) | Phase 52 (`20260719211249`) | The drainer MUST use the RPC, never a direct insert |

**Deprecated/outdated:**
- `notify_n8n_lease_reminder()` + `trg_lease_reminders_notify_n8n` — dropped by this phase.
- `notify_n8n_payment_reminder()` may still exist as an ORPHAN function (redefined in May migrations AFTER its table was dropped in April) with no table/trigger — out of scope; do NOT touch in this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | In-app notification is created for ALL tiers/owners (including CI-synthetic + opted-out); only the EMAIL honors suppression/tier | Pattern 4 | If REMIND-03 is meant to suppress the in-app row too for CI owners, CI would accumulate notification rows for synthetic owners (harmless — already happens via other Phase 52 triggers — but confirm intent) |
| A2 | Drain-fn auth = verify_jwt=false + shared `REMINDERS_INVOKE_SECRET` bearer mirrored into `app_config.reminders.drain_secret` | Pattern 2/6/7 | If the team prefers verify_jwt=true + service-role JWT from Vault, the cron invoke + config differ |
| A3 | `delivery_status` enum = `pending/sent/suppressed/failed/expired`; Idempotency-Key = `lease_reminders.id` | Pattern 1/3 | Both are Claude's-discretion per D-02; a different split (e.g. `skipped_tier`) or key (`lease_id:reminder_type`) is equally valid |
| A4 | New `notification_type` value = `lease_renewal_reminder` | Pattern 5 | Naming only; must match between the CHECK, the drainer call, and `TYPE_VISUALS` |
| A5 | The prod `notify_n8n_lease_reminder` body = the `20260611141843` version (with `is_notification_suppressed`), i.e. no later MCP-only override exists | REMIND-03 | Verified: no repo migration after `20260611141843` touches the fn. A prod-only hotfix (unlikely) would change the re-port list — verify via `pg_get_functiondef` at plan time |
| A6 | A new SECURITY DEFINER `claim_lease_reminders` RPC does the row-lock claim (PostgREST can't express `FOR UPDATE SKIP LOCKED`) | Pattern 2 | If the planner instead claims via a per-row `UPDATE ... WHERE id=$ AND delivery_status='pending' RETURNING`, concurrency is still safe but batch efficiency differs |
| A7 | Pick a free cron slot ~06:30 UTC (just after the 06:00 filler) | Pattern 6 | Slot is Claude's discretion (D-04); avoid the 3AM cleanup cluster + the 06:00 slot |

## Open Questions

1. **Exact current backlog size in `lease_reminders`** (informs REMIND-04 review artifact).
   - What we know: the filler cron is live and never drained → a real, growing backlog exists.
   - What's unclear: the count (prod query blocked this session — Management API 401, MCP tools unavailable to this agent).
   - Recommendation: non-blocking. The pre-flip migration's `RAISE NOTICE count(*)` produces the artifact at apply time. Owner MAY pre-check via Supabase MCP `execute_sql` (`select count(*), min(created_at), max(created_at) from lease_reminders where delivery_status is null` — note the column won't exist until Migration A, so pre-check is just `count(*)`).

2. **Current `app_config` values for `n8n.webhook.lease_reminder_url` / `n8n.webhook.secret`.**
   - What we know: the n8n workflow is disabled (confirmed gap); the trigger no-ops if the URL is empty.
   - What's unclear: whether the URL is empty (trigger already inert) or set (POSTing to a dead endpoint).
   - Recommendation: non-blocking — the trigger is dropped regardless. Verify at plan time so the PR body notes whether removal changes any live behavior.

3. **Confirm no OTHER trigger/DB-webhook fires on `lease_reminders` INSERT** (e.g. a Dashboard-created `supabase_functions.http_request` webhook).
   - Recommendation: plan-time MCP introspection: `select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.lease_reminders'::regclass and not tgisinternal`. Removal is "complete" only if `trg_lease_reminders_notify_n8n` is the sole non-internal trigger.

4. **A1 (in-app-for-all vs suppress-in-app-too) and A2 (drain-fn auth).** Recommend the discuss-phase / planner confirm before locking.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pg_cron | Drain scheduling | ✓ (in `extensions`) | — | none needed |
| pg_net (`net.http_post`) | Cron→edge invoke + Sentry check-in | ✓ | — | none needed |
| Resend (`RESEND_API_KEY`) | Email send | ✓ (used by lease-signature/auth-email-send) | — | none |
| `create_notification` RPC | REMIND-05 | ✓ (Phase 52, prod) | — | none |
| `is_notification_suppressed`, `email_suppressions`, `notification_settings` | REMIND-03 | ✓ | — | none |
| `app_config` | Flag + drain secret | ✓ | — | none |
| Supabase Edge deploy | Ship the drainer | ⚠ via `bun scripts/deploy-edge-functions.ts send-lease-reminders` ONLY | — | Owner-run if PAT stale (CLI/PAT 401; MCP corrupts non-ASCII — this fn is pure ASCII so MCP is tolerable but the disk-reading script is canonical) |
| Prod SQL (this research session) | Verify backlog/app_config live | ✗ | — | Migration-file evidence (authoritative — applied to prod) + plan-time MCP introspection |
| `bun run db:types` | Regen `supabase.ts` after schema change | ⚠ | — | Owner-run (needs PAT refresh per MEMORY) |

**Missing dependencies with no fallback:** none — every rail exists.
**Missing with fallback:** live prod introspection (use migration files now + MCP at plan/execute time); edge deploy + db:types are owner-run residuals (known CLI-401 pattern).

## Validation Architecture

Nyquist validation is ENABLED (`workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Unit / component | Vitest 4 + jsdom (`test:unit` = `vitest --run --project unit`), 80% coverage (lefthook pre-commit) |
| Edge-fn (Deno) | `deno test --allow-all --no-check supabase/functions/tests/<file>` — mock `globalThis.fetch` for Resend (mirror `tests/lease-signing-test.ts`); NO `functions serve`, no deploy, no network |
| RLS / integration | Vitest `integration` project (`test:integration` = `vitest --run --project integration`), dual-client ownerA/ownerB, hits PROD, sequential (`tests/integration/rls/`) |
| MCP introspection | `mcp__supabase__execute_sql` at plan/verify time for prod-only facts |
| Config file | `vitest.config.*` (projects: unit/component/integration); edge tests have no runner script (invoked directly) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command / Method | File Exists? |
|-----|----------|-----------|------------------|--------------|
| REMIND-01 | Edge fn drains queue + sends via Resend; n8n trigger gone | edge-fn unit + MCP | `deno test .../send-lease-reminders-test.ts` (mock fetch → assert ≥1 Resend POST for a clean entitled row); MCP `pg_get_triggerdef` shows no `trg_lease_reminders_notify_n8n` | ❌ Wave 0 (new test + fn) |
| REMIND-02 | Exactly once; overlapping runs don't double-send | edge-fn unit + RLS/integration | Unit: second drain of an already-`sent` row → 0 Resend calls; Idempotency-Key === row.id asserted. Integration: concurrent `claim_lease_reminders` returns disjoint sets (SKIP LOCKED) | ❌ Wave 0 |
| REMIND-03 | Every suppression layer honored; flag-off early return | edge-fn unit (branch matrix) | Mock fetch; assert 0 sends for each: flag off, non-entitled tier, `is_notification_suppressed`=true, in `email_suppressions`, `notification_settings.leases=false`; assert 1 send only when all clear. In-app created in the suppressed cases (A1) | ❌ Wave 0 |
| REMIND-04 | Backlog counted + expired before any send | RLS/integration + MCP | Integration/MCP: after pre-flip migration, all pre-existing rows `delivery_status='expired'` with `delivered_at` set and 0 Resend sends; flag='true' only after. Assert flag flip is last (migration review) | ❌ Wave 0 |
| REMIND-05 | Each delivered reminder → in-app notification via write path | edge-fn unit + RLS/integration + MCP | Unit: asserts `create_notification` rpc called with `lease_renewal_reminder`, `/leases/<id>`. MCP: `notifications_notification_type_check` includes `lease_renewal_reminder`. Integration: owner-scoped SELECT returns the new row | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test:unit -- --run <touched file>` + `deno test --allow-all --no-check supabase/functions/tests/send-lease-reminders-test.ts`
- **Per wave merge:** `bun run validate:quick` (types + lint + unit) + full Deno test + targeted `test:integration` (notifications + lease-reminders)
- **Phase gate:** full suite green + MCP introspection assertions (trigger removed, flag state, delivery columns, CHECK extended) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/send-lease-reminders/index.ts` — the drainer (covers REMIND-01/02/03/05)
- [ ] `supabase/functions/tests/send-lease-reminders-test.ts` — mocked-fetch branch matrix (flag-off, suppression layers, idempotency, in-app-created)
- [ ] `tests/integration/rls/lease-reminders-delivery.rls.test.ts` — exactly-once + backlog-expiry + owner-scoped notification (new)
- [ ] `claim_lease_reminders` RPC + `create_notification`-type extension migration must land before the integration tests can assert state
- [ ] MCP introspection checklist (verify script): trigger absent, `reminders_delivery_enabled`='true' only post-flip, delivery columns present, CHECK includes new type, no other `lease_reminders` INSERT trigger

## Security Domain

`security_enforcement` absent in config → treated as ENABLED.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control (this phase) |
|---------------|---------|-------------------------------|
| V2 Authentication | yes | Drain fn authenticates the cron caller via a shared `REMINDERS_INVOKE_SECRET` bearer (verify_jwt=false pattern); service-role client only (never reaches frontend) |
| V3 Session Management | no | No user session — cron-invoked machine-to-machine |
| V4 Access Control | yes | `create_notification`, `is_notification_suppressed`, `claim_lease_reminders` are service_role-only (REVOKEd from public/anon/authenticated); `lease_reminders` owner-SELECT RLS unchanged; `app_config` service-role-only |
| V5 Input Validation | yes | `escapeHtml` on ALL user values (owner name, property/tenant labels) in the email; `action_url` app-relative only (open-redirect guard) |
| V6 Cryptography | partial | Reuse the shared-secret bearer (constant-time compare optional via `_shared/timing-safe.ts`); no new crypto — never hand-roll |
| V7 Error Handling / Logging | yes | `errorResponse`/`captureWebhookError` — never leak `err.message` to client; Sentry cron check-in for silent-failure visibility |

### Known Threat Patterns for pg_cron + Edge Function + Resend
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated drain invocation (anyone POSTs the fn URL → mass email) | Spoofing / Elevation | verify_jwt=false + shared-secret bearer check as the FIRST thing after CORS; 401 on mismatch (consider `_shared/timing-safe.ts` compare) |
| Suppression bypass → spam / PII to unsubscribed or bounced addresses | Repudiation / Info-disclosure | Ordered `shouldEmail()` gate (Pattern 3); the flag-off early return; Resend auto-suppression as backstop |
| XSS via applicant/tenant/property free-text in the owner email | Tampering | `escapeHtml` every interpolated value (already the `lease-signature` discipline) |
| Open redirect via `action_url` | Tampering | App-relative `/leases/<id>` only; `resolveHref` guard already rejects `//`, backslashes, control chars |
| Double-send / replay | Tampering | `delivery_status` + `FOR UPDATE SKIP LOCKED` + Idempotency-Key; single delivery path after Migration C |
| Secret leakage (service-role / drain secret in client bundle) | Info-disclosure | Drain fn is server-only; frontend never imports it; secrets in Supabase function env + `app_config` (service-role RLS) |
| Cross-owner leakage in the new RPC / notification | Elevation | `create_notification` writes owner-scoped `user_id`; add ownerA/ownerB RLS cases in `tests/integration/rls/` |

## Sources

### Primary (HIGH — applied migration files = prod source of truth)
- `supabase/migrations/20260222110100_phase56_schema_foundations.sql` — `lease_reminders` schema, `sent_at default now()`, `UNIQUE(lease_id, reminder_type)`, `reminder_type` CHECK, owner-SELECT RLS
- `supabase/migrations/20260222120000_phase56_pg_cron_jobs.sql` — `queue_lease_reminders()` filler + `queue-lease-reminders` schedule (still live, D-01)
- `supabase/migrations/20260222130000_phase56_db_webhooks.sql` — `notify_n8n_lease_reminder()` + `trg_lease_reminders_notify_n8n` (the hop to remove)
- `supabase/migrations/20260611141843_notification_suppression_list.sql` — `is_notification_suppressed()` + the synthetic-CI guard embedded in `notify_n8n_lease_reminder` (latest version of the fn; REMIND-03 re-port target)
- `supabase/migrations/20260504162155_app_config_table_for_n8n_webhooks.sql` + `20260504162221` + `20260505002058` + `20260504232614` — `app_config` KV table (service-role RLS), notify-fn app_config read pattern, owner_email resolution, secret short-circuit
- `supabase/migrations/20260224091106_payment_reminders_cron.sql` — the Sentry cron check-in + pg_cron scheduling shape to mirror (note: table/fn/cron themselves were later dropped)
- `supabase/migrations/20260418140000_demolish_rent_and_tenant_portal.sql` — confirms `payment_reminders`/`queue_payment_reminders`/`payment-reminders` cron DROPPED (the CONTEXT "mirror" is stale)
- `supabase/migrations/20260719193759_create_notification_and_reconcile_rls.sql` — `create_notification(p_user_id,p_type,p_title,p_message,p_entity_type,p_entity_id,p_action_url)` service_role-only signature
- `supabase/migrations/20260719200224_notification_and_activity_event_triggers.sql` — trigger call convention + app-relative `/leases/<id>` action_url + copywriting contract
- `supabase/migrations/20260720001542_extend_notification_type_check.sql` + `20260720015620_retention_gdpr_and_writer_hardening.sql` — current `notification_type` CHECK values; archive CHECK dropped
- `supabase/migrations/20251216120000_notification_settings.sql` — `email`/`sms`/`push`/`in_app`/`maintenance`/`leases`/`general` columns (opt-out = `leases`)
- `supabase/migrations/20260219100002_create_email_suppressions.sql` — `email PK, reason CHECK('bounced','complained'), suppressed_at`
- `supabase/functions/_shared/{resend,tier-gate,plan-tier,escape-html,email-layout,env,cors,errors}.ts` — the edge-fn rail (all read)
- `supabase/functions/lease-signature/index.ts` — the concrete drainer mirror (validateEnv, admin client, appUrl, escapeHtml, checkTierEntitlement usage)
- `supabase/config.toml` — `[functions.*] verify_jwt` convention
- `src/components/notifications/notification-item.tsx` — `TYPE_VISUALS` map + `FALLBACK_VISUAL` + `resolveHref` open-redirect guard
- `src/hooks/api/query-keys/notification-keys.ts` — `mapNotificationRow` boundary mapper (notification_type = plain string, no TS union)
- `scripts/deploy-edge-functions.ts` — accepts function-name args (`bun scripts/deploy-edge-functions.ts send-lease-reminders`)
- `.planning/research/{ARCHITECTURE,PITFALLS,STACK}.md` — milestone research (renewal-delivery integration, the suppression trap, zero-new-deps)
- `.planning/phases/52-.../` migrations = the create_notification contract this phase publishes through

### Secondary (MEDIUM)
- `.planning/phases/52-.../52-RESEARCH.md` (create_notification write-path context) — cross-referenced via the Phase 52 migrations

### Tertiary / could-not-verify (flagged)
- Prod runtime values (backlog `count(*)`, current `app_config` n8n values, live trigger set) — Management API 401 + MCP tools unavailable to this agent this session. Migration files are authoritative for schema; runtime values are plan-time MCP introspection items (Open Questions 1-3).

## Metadata

**Confidence breakdown:**
- Standard stack / rails: HIGH — every file read directly; zero new deps confirmed
- Schema (lease_reminders, CHECKs, RPC signatures, suppression primitives): HIGH — applied migration files (prod source of truth)
- Suppression re-port list (REMIND-03): HIGH — latest fn version verified; no later override in repo
- Prod runtime state (backlog count, app_config values, live-trigger uniqueness): MEDIUM — inferred from migration history + cron-still-scheduled fact; exact values are plan-time MCP checks (non-blocking)
- Drain-fn auth + delivery_status enum + idempotency key: MEDIUM — Claude's-discretion design recommendations ([ASSUMED], confirm at plan/discuss)

**Research date:** 2026-07-21
**Valid until:** ~2026-08-20 (30 days; stable brownfield rails). Re-verify the `notification_type` CHECK values and `notify_n8n_lease_reminder` body via MCP if any migration lands on `notifications`/`lease_reminders` before execution.

---

## Prod Verification + Open-Question Resolutions (orchestrator MCP, 2026-07-21)

Live prod facts (Supabase MCP `execute_sql`, project `bshjmbshupiibfiewpxb`) — authoritative over inferred values:

- **Backlog = 0 rows** in `lease_reminders` right now. The storm risk is LATENT (the `queue-lease-reminders` cron `0 6 * * *` is live and will queue rows between deploy and go-live), not current. REMIND-04 clean-slate migration still required; its COUNT will log the value at apply time.
- **Single trigger** on `lease_reminders`: `trg_lease_reminders_notify_n8n` → `notify_n8n_lease_reminder()`. Removal is clean (no other trigger/webhook fires on INSERT). Resolves Open Q3.
- **`lease_reminders` columns**: `id, lease_id, reminder_type, sent_at, created_at` — NO delivery-state column (confirmed). `sent_at` is queued-time.
- **Suppression re-port list (REMIND-03) — EXACT, from the live fn bodies:**
  - The trigger's ONLY app-level guard is `is_notification_suppressed(owner_email)`, which returns true iff `owner_email ∈ app_config['notifications.suppressed_emails']` (CSV) — the synthetic-CI-owner guard. **Re-port this verbatim.**
  - The trigger does NOT check `email_suppressions` or `notification_settings` — REMIND-03's "ALL suppression layers" = the re-ported CI guard PLUS these two NEW layers the drainer adds.
  - `notification_settings` opt-out = **`email = true AND leases = true`** (both booleans must be on to email; `leases` is the "Lease expirations, renewals, and signatures" category). Columns confirmed: `email, leases, general, maintenance, in_app, sms, push, user_id, version`.
  - Ordered `shouldEmail(owner)` gate: (1) tier ∈ Growth/Max, (2) NOT is_notification_suppressed(email), (3) NOT in email_suppressions, (4) notification_settings.email && .leases. Any false → skip email (mark `delivery_status='suppressed'`), but STILL create the in-app notification (see A1).
- **`notifications` type CHECK** currently 9 values (none a reminder). Migration A MUST extend it (add e.g. `'lease_reminder'`) or `create_notification` raises 23514 inside the drainer and aborts the parent — the exact Phase 52 review-C6 bug class.
- **Owner→email lookup** (mirror the trigger): `leases.owner_user_id` → `users.email, full_name`. Tier lookup: `users.subscription_plan` (confirm column at plan time).

### Open-question resolutions (locked)
- **A1 (in-app scope) — LOCKED: the REMIND-05 in-app notification is created for ALL tiers and REGARDLESS of email suppression/opt-out/CI-guard.** Consistent with Phase 52 D-05 (in-app is the always-on passive surface; toggles govern email only) and Phase 52's RLS test already asserts synthetic owners get in-app rows. Email is the only channel gated by the suppression stack + tier. So: every due reminder → in-app notification always; email only when `shouldEmail()` passes.
- **A2 (drain-fn invocation auth) — RECOMMENDED (planner discretion): `verify_jwt=false` + shared bearer secret read from `app_config` (mirror the `notify_n8n` Bearer pattern + the `sign-lease-token` verify_jwt=false pattern), constant-time compared in-function.** The fn instantiates its own service-role client from env for DB writes / `create_notification` regardless; this only governs who may invoke it. Avoids embedding a service-role JWT in cron SQL.
- **Q2 (n8n app_config values):** irrelevant — the trigger + fn are dropped either way; also drop/ignore the `n8n.webhook.lease_reminder_url` key (leave `n8n.webhook.secret` if shared).

### STALE reference correction
`queue_payment_reminders` + its cron + edge-fn drain were DROPPED in the rent demolition (`20260418140000`) — there is NO existing cron→edge-fn drain to mirror for invocation. The invocation pattern is new (mirror `notify_n8n_*` `net.http_post` shape for the cron→edge-fn call). The live scheduling/structure mirror is `queue_lease_reminders` itself.
