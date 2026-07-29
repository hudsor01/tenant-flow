# Phase 53: Renewal Reminder Delivery - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 7 (1 new edge fn, 1 new Deno test, 3 migrations, 1 config edit, 1 optional component edit)
**Analogs found:** 7 / 7 (every file has an exact or role-match in-repo analog; the cron→edge-fn *invocation* is the one net-new composition, assembled from existing pieces)

Note: the "new reminder email template" (D-05) and the `claim_lease_reminders` RPC and the `create_notification` call are all *inside* files 1 and 3 — they are covered as sub-patterns under those files, not separate files.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/send-lease-reminders/index.ts` (NEW) | edge fn / service | batch + request-response | `supabase/functions/lease-signature/index.ts` (skeleton) + `sign-lease-token/index.ts` (verify_jwt=false machine-invoke) | exact |
| `supabase/functions/tests/send-lease-reminders-test.ts` (NEW) | test | unit (mocked fetch) | `supabase/functions/tests/lease-signing-test.ts` | exact |
| `supabase/migrations/<ts>_lease_reminders_delivery_state.sql` (NEW — Migration A) | migration | transform / schema + CHECK | `20260415193245_email_deliverability_schema.sql` (text-CHECK state col) + `20260720001542_extend_notification_type_check.sql` (CHECK drop/re-add) + `20260504162155` (app_config seed) | role-match (composite) |
| `supabase/migrations/<ts>_send_lease_reminders_drain_cron.sql` (NEW — Migration B) | migration | event-driven / scheduling | `20260504162221` `notify_n8n_lease_reminder` (net.http_post shape) + `20260224091106` `queue_payment_reminders` (Sentry check-in + cron.schedule) | role-match (composite) |
| `supabase/migrations/<ts>_lease_reminders_goflip.sql` (NEW — Migration C) | migration | batch / data + drop | `20260616161248_drop_dead_tenants_user_id.sql` (idempotent drop) + `20260224091106:174` (drop trigger) | role-match |
| `supabase/config.toml` (MODIFY) | config | — | `[functions.sign-lease-token]` block (config.toml:402-404) | exact |
| `src/components/notifications/notification-item.tsx` (MODIFY, optional) | component | — | `TYPE_VISUALS` map (notification-item.tsx:25-34) | exact |

## Pattern Assignments

### `supabase/functions/send-lease-reminders/index.ts` (edge fn / service, batch drain)

**Analog (skeleton):** `supabase/functions/lease-signature/index.ts`
**Analog (verify_jwt=false machine-invoke, RPC-driven, best-effort email):** `supabase/functions/sign-lease-token/index.ts`

**Imports pattern** (`lease-signature/index.ts:14-40`) — copy the `_shared/*` import block verbatim, MINUS `validateBearerAuth`/`rate-limit` (not a browser/user path), PLUS keep `GROWTH_AND_MAX_PLANS` and DROP `checkTierEntitlement` (see Shared Patterns → Tier gate):
```typescript
import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { wrapEmailLayout } from "../_shared/email-layout.ts";
import { sendEmail } from "../_shared/resend.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import { GROWTH_AND_MAX_PLANS } from "../_shared/tier-gate.ts";
import { timingSafeEqualStr } from "../_shared/timing-safe.ts"; // for the bearer compare (A2)
```

**Deno.serve + CORS + env + admin-client + appUrl boilerplate** (`lease-signature/index.ts:95-111`) — copy exactly; add `RESEND_API_KEY` + the new `REMINDERS_INVOKE_SECRET` to `required`:
```typescript
Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req);
  if (optionsResponse) return optionsResponse;
  try {
    const env = validateEnv({ required: [
      "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL",
      "RESEND_API_KEY", "REMINDERS_INVOKE_SECRET",
    ] });
    const appUrl = env["NEXT_PUBLIC_APP_URL"].replace(/\/$/, "");
    const supabase = createAdminClient(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"]);
    // ...
  } catch (err) {
    return errorResponse(req, 500, err, { fn: "send-lease-reminders" });
  }
});
```

**Machine-caller auth (verify_jwt=false) — NEW composition, not in lease-signature.** `sign-lease-token` is the verify_jwt=false analog but authenticates by *token-hash RPC*, not a shared bearer. For this fn re-port the n8n Bearer discipline instead: read the shared secret from env and constant-time compare the `Authorization` header. Use `timingSafeEqualStr` from `_shared/timing-safe.ts:17` (its own docstring lists exactly this "compare Authorization Bearer against a shared secret" use case). Return 401 on mismatch using `getJsonHeaders(req)` (the 4xx shape used throughout `lease-signature`, e.g. lines 126-131).

**Flag early-return (D-07)** — RESEARCH.md:379-384 gives the exact shape (`app_config` select via the service-role client that `lease-signature:108` builds):
```typescript
const { data: flag } = await supabase.from("app_config")
  .select("value").eq("key", "reminders_delivery_enabled").maybeSingle();
if (flag?.value !== "true")
  return new Response(JSON.stringify({ ok: true, skipped: "disabled" }),
    { status: 200, headers: getJsonHeaders(req) });
```

**Claim + RPC-call pattern** — mirror `sign-lease-token/index.ts:146-148,263-269` for calling a SECURITY DEFINER RPC through the admin client and reading its `data` rows:
```typescript
const { data: claimed, error } = await supabase.rpc("claim_lease_reminders", { p_limit: 100 });
if (error) return errorResponse(req, 500, error, { action: "claim" });
// ((claimed ?? []) as Row[]) — then loop
```

**In-app notification per row (REMIND-05)** — copy the `create_notification` RPC-call shape verbatim from `_shared/lease-signing.ts:289-297` (its `notifyFinalizeFailed` helper is the canonical caller; note app-relative `action_url`, `p_message: null` allowed):
```typescript
const { error } = await supabase.rpc("create_notification", {
  p_user_id: owner.id,
  p_type: "lease_renewal_reminder",   // NEW type — extend the CHECK in Migration A first
  p_title: "Lease renewal reminder",
  p_message: `${propertyLabel} — lease ends in ${daysLabel}`,
  p_entity_type: "lease",
  p_entity_id: leaseId,
  p_action_url: "/leases/" + leaseId,
});
```

**The NEW reminder email template (D-05)** — build a local `buildReminderEmail(...)` helper mirroring `buildSigningEmail` (`lease-signature/index.ts:64-93`) and `emailOwnerToCountersign` (`sign-lease-token/index.ts:58-85`): an inline HTML `body` string with `escapeHtml()` on EVERY user value, a `<table role="presentation">` CTA button linking `${appUrl}/leases/${leaseId}`, wrapped in `wrapEmailLayout(body)`. The template is new (its own subject/copy) but the rail — escape + table-button + `wrapEmailLayout` — is copied. `wrapEmailLayout` signature/behavior: `_shared/email-layout.ts:23-64`.

**Send with idempotency (REMIND-02)** — `sendEmail` already supports the Idempotency-Key header (`_shared/resend.ts:79-81`); pass `idempotencyKey: row.id`, `tags`, and check `.success`. Mirror the result-handling + stamp shape from `lease-signature/index.ts:289-315` (success → update terminal state; failure → `errorResponse`/log + release):
```typescript
const result = await sendEmail({
  to: [owner.email], subject, html,
  idempotencyKey: row.id,                            // === lease_reminders.id
  tags: [{ name: "type", value: "lease_renewal_reminder" }],
});
// success → UPDATE delivery_status='sent', delivered_at=now(), resend_message_id=result.id
// failure → UPDATE delivery_status='failed', attempt_count=attempt_count+1  (+ captureWebhookError)
```

**Error handling / logging** — `sendEmail` never throws (`resend.ts:3,106-114`); use `captureWebhookError`/`logEvent` from `_shared/errors.ts:58,97` for per-row failures (do NOT abort the whole batch on one bad row) and the top-level `errorResponse(req, 500, err, {...})` catch (`lease-signature/index.ts:564-566`).

---

### `supabase/functions/tests/send-lease-reminders-test.ts` (test, unit / mocked fetch)

**Analog:** `supabase/functions/tests/lease-signing-test.ts` (exact — same runner, same fake-client + Resend-stub pattern).

**Run header** (`lease-signing-test.ts:9-11`):
```
deno test --allow-all --no-check --import-map=supabase/functions/deno.json \
  supabase/functions/tests/send-lease-reminders-test.ts
```

**Stateful fake SupabaseClient + rpc recorder** (`lease-signing-test.ts:108-188`) — copy the `makeClient` factory: a `from(table)` builder returning `{ select, eq, is, update, maybeSingle, then }`, plus `rpc: async (name, args) => { calls.rpcs.push({name, args}); return {data,error} }`. This is exactly how the drainer's `claim_lease_reminders` / `create_notification` / `is_notification_suppressed` calls get recorded and asserted. The `calls.rpcs.find(r => r.name === "create_notification" && r.args.p_type === ...)` assertion at `lease-signing-test.ts:363-371` is the template for the REMIND-05 assertion.

**Resend fetch stub** (`lease-signing-test.ts:190-214`) — copy `withResendStub({ ok })`: swaps `globalThis.fetch` to count calls and return `{ id: "email-1" }` at status 200/500, sets/restores `RESEND_API_KEY`. `fetchCount()` is the per-branch send-count assertion primitive.

**Branch matrix to assert** (RESEARCH.md:496, Test Map REMIND-03): flag-off → `fetchCount()===0`; non-entitled tier → 0 sends; `is_notification_suppressed`=true → 0 sends; in `email_suppressions` → 0 sends; `notification_settings.leases=false` → 0 sends; all-clear entitled → exactly 1 send with `Idempotency-Key === row.id`; and in EVERY suppressed case assert the `create_notification` rpc WAS still recorded (A1 — in-app always created).

---

### `supabase/migrations/<ts>_lease_reminders_delivery_state.sql` (Migration A — schema + CHECK + flag + claim RPC)

Composite migration; three analogs.

**(a) delivery-state text-CHECK column** — analog `20260415193245_email_deliverability_schema.sql:27-37` (a `text ... check (... in (...))` state column, no ENUM per CLAUDE.md rule 6). RESEARCH.md:159-173 gives the exact recommended DDL (`delivery_status default 'pending' check in ('pending','sent','suppressed','failed','expired')` + `delivered_at`/`resend_message_id`/`attempt_count` + partial index `where delivery_status='pending'`). Column comment style: mirror `20260415193245:42-43`. The existing `lease_reminders` schema being altered is `20260222110100:175-198` (note the misleading `sent_at default now()` — do NOT reuse it as a delivery guard).

**(b) extend notification_type CHECK** — analog `20260720001542_extend_notification_type_check.sql:12-27` (copy the exact drop-if-exists → add-constraint `= any (array[...]::text)` idempotent pattern; append `'lease_renewal_reminder'::text` to the 9 current values). This MUST land here so `create_notification('lease_renewal_reminder', …)` never raises 23514 inside the drainer (Pitfall 4 / the Phase 52 review-C6 bug class).

**(c) seed the app_config flag (default OFF)** — analog `20260504162155:34-41` (`INSERT INTO public.app_config (key, value) VALUES (...) ON CONFLICT (key) DO NOTHING`). Seed `('reminders_delivery_enabled','false')` + empty `('reminders.drain_url','')` / `('reminders.drain_secret','')` / `('sentry.cron.send_lease_reminders_url','')` for the operator to fill. `app_config` is service-role-only RLS (`20260504162155:17-24`).

**(d) `claim_lease_reminders` RPC (FOR UPDATE SKIP LOCKED claim)** — RESEARCH.md:388-403 gives the exact fn; the row-lock idiom is copied from `calculate_late_fees()` (`20260222120000:61-74`, `for update skip locked`). Grant discipline (REVOKE from public/anon/authenticated, GRANT EXECUTE to service_role) copied from `create_notification` (`20260719193759:66-67`) and `cleanup_old_notifications` (`20260719202447:117-118`).

---

### `supabase/migrations/<ts>_send_lease_reminders_drain_cron.sql` (Migration B — invoke fn + cron.schedule)

**Analog (net.http_post invoke shape):** `notify_n8n_lease_reminder()` at `20260504162221:93-126` — copy the SECURITY DEFINER + `set search_path to 'public','extensions'` header, the `SELECT value INTO v_url/v_secret FROM public.app_config WHERE key = ...`, the empty-URL early `return`, and the `perform net.http_post(url, headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||coalesce(v_secret,'')), timeout_milliseconds := 5000)` block. RESEARCH.md:267-291 gives the assembled `invoke_send_lease_reminders()` (reads `reminders.drain_url`/`reminders.drain_secret` from app_config).

**Analog (Sentry cron check-in + cron.schedule):** `queue_payment_reminders()` at `20260224091106:198-296` — copy the `v_start_ts := clock_timestamp()` … `duration = extract(epoch ...)` Sentry check-in POST (lines 255-275) and the `select cron.schedule('<name>', '<cron>', $$select public.<fn>()$$)` registration (lines 292-296). `cron.schedule` is idempotent by jobname (`20260222120000:24-25,189`). Pick a free slot ~`30 6 * * *` (RESEARCH A7); avoid the 3 AM cleanup cluster (`:00/:15/:30/:45` are taken — `20260719202447:121-122`) and the 06:00 filler slot.

Scheduling this while the flag is OFF is a safe no-op (the fn early-returns) — RESEARCH.md:292.

---

### `supabase/migrations/<ts>_lease_reminders_goflip.sql` (Migration C — REMIND-04 pre-flip gate)

**Analog (idempotent count + data-migration + drop):** `20260616161248_drop_dead_tenants_user_id.sql` (a real "count/inspect → rewrite dependents → drop" migration with `drop … if exists` throughout) + `20260224091106:174` (`drop trigger if exists trg_..._notify_n8n on public.<table>;`). The exact statement order is RESEARCH.md:305-310:
1. `SELECT count(*) ... WHERE delivery_status='pending'` → `RAISE NOTICE` (log backlog for the record, D-06). The `raise notice` idiom: `cleanup_old_email_deliverability` at `20260415193245:135`.
2. `UPDATE lease_reminders SET delivery_status='expired', delivered_at=now() WHERE delivery_status='pending'` (clear WITHOUT sending).
3. `DROP TRIGGER IF EXISTS trg_lease_reminders_notify_n8n ON public.lease_reminders;` then `DROP FUNCTION IF EXISTS public.notify_n8n_lease_reminder();` (the trigger is dropped/created at `20260222130000:244-248`; the fn body being removed — with its re-ported `is_notification_suppressed` guard — is `20260611141843:101-153`).
4. **LAST statement:** `UPDATE app_config SET value='true' WHERE key='reminders_delivery_enabled';`

Anti-pattern (RESEARCH.md:313): the flag flip MUST be the final statement so delivery physically cannot fire before the backlog is expired and the n8n hop is gone.

Prod fact (RESEARCH.md:586): `trg_lease_reminders_notify_n8n` is the SOLE non-internal trigger on `lease_reminders` — removal is clean.

---

### `supabase/config.toml` (MODIFY — add function block)

**Analog:** `[functions.sign-lease-token]` block (`config.toml:402-404`) — a verify_jwt=false machine/token endpoint with the required `import_map`. Append:
```toml
# Send lease reminders — cron-invoked drainer. verify_jwt=false; the function's
# own REMINDERS_INVOKE_SECRET Bearer check (constant-time) IS the auth boundary.
[functions.send-lease-reminders]
verify_jwt = false
import_map = "./functions/deno.json"
```
Every block MUST carry `import_map` (config.toml:343-344). The verify_jwt=false decision + inline auth-mechanism comment convention is documented at config.toml:352-360.

---

### `src/components/notifications/notification-item.tsx` (MODIFY, optional)

**Analog:** the `TYPE_VISUALS` map (`notification-item.tsx:25-34`) — add one entry, e.g. `lease_renewal_reminder: { Icon: CalendarClock, chip: "icon-bg-primary" }` (import a lucide icon at lines 4-12). `FALLBACK_VISUAL` (lines 38-41) already renders unmapped types safely (a neutral Bell), so this edit is cosmetic-only. No TS union to extend — `notification_type` is a plain string at the mapper boundary (RESEARCH.md:262). `resolveHref` (lines 54-73) already guards the app-relative `/leases/<id>` action_url — no change needed.

## Shared Patterns

### Tier gate (email-only, D-02) — do NOT call `checkTierEntitlement`
**Source:** `_shared/tier-gate.ts` — reuse ONLY the exported `GROWTH_AND_MAX_PLANS` set (lines 26-38) and inline the active-sub check (mirror the `ACTIVE_SUB_STATUSES` logic at lines 19-22,79-84).
**Apply to:** `send-lease-reminders/index.ts` `shouldEmail()` gate.
**Why not the full helper:** `checkTierEntitlement(req, …)` (lines 54-135) is a per-*request* UI gate — it needs a `req`, writes a `gate_events` row via `EdgeRuntime.waitUntil`, and returns a 402 `Response`. It is wrong for a batch drainer (RESEARCH.md:316, anti-pattern). Inline:
```typescript
const entitled = ["active","trialing"].includes(owner.subscription_status ?? "")
  && GROWTH_AND_MAX_PLANS.has(owner.subscription_plan ?? "");
```

### Suppression stack (REMIND-03 — load-bearing)
**Sources:** `is_notification_suppressed(text)` RPC (`20260611141843:22-39`, REVOKEd from public/anon/authenticated — the service-role admin client CAN call it) + `email_suppressions` table (`20260219100002`, `email PK, reason check('bounced','complained')`) + `notification_settings` (`20251216120000:4-18`, `email boolean default true`, `leases boolean default true`, `user_id` FK).
**Apply to:** `send-lease-reminders/index.ts` — the ordered `shouldEmail(owner)` gate (RESEARCH.md:214-231, 592). Order cheap→expensive: (1) tier, (2) `.rpc("is_notification_suppressed", { p_email })`, (3) `email_suppressions` maybeSingle, (4) `notification_settings.email && .leases` (absent row = defaults true = send). The CI-guard layer (2) is the re-port of the guard being deleted with the trigger — it MUST be live before Migration C flips the flag (Pitfall 1).

### Service-role admin client
**Source:** `createAdminClient(url, key)` — `_shared/supabase-client.ts:9-14`; built once per request as in `lease-signature/index.ts:108-111`. This is the client used for every DB write, RPC, and `create_notification` call in the drainer (RLS-bypassing).

### HTML escaping on all user values
**Source:** `escapeHtml` — `_shared/escape-html.ts:2-9`. Applied to owner name, property/tenant labels in the reminder email exactly as `lease-signature/index.ts:75,80` does. Never interpolate a raw user value into email HTML.

### Error logging (never leak, never abort the batch)
**Source:** `errorResponse` / `captureWebhookError` / `captureWebhookWarning` / `logEvent` — `_shared/errors.ts:14,58,82,97`. Top-level catch returns generic `{ error: "An error occurred" }`; per-row failures log + continue.

## No Analog Found

None. Every file maps to an exact or composite in-repo analog. The single net-new *composition* is the cron→edge-fn drain invocation (there is no existing cron→edge-fn drainer in the repo — `queue_payment_reminders`' drain was demolished in `20260418140000`, RESEARCH.md:601), but every constituent piece exists: the `net.http_post` invoke shape (`notify_n8n_*`), the Sentry check-in + `cron.schedule` (`queue_payment_reminders`), and the verify_jwt=false self-authenticating fn (`sign-lease-token` + the n8n Bearer discipline).

## Metadata

**Analog search scope:** `supabase/functions/` (`_shared/*`, `lease-signature`, `sign-lease-token`, `tests/`), `supabase/migrations/` (schema/CHECK/cron/app_config/suppression/drop analogs), `supabase/config.toml`, `src/components/notifications/`, `tests/integration/rls/`.
**Files scanned:** ~22 (10 edge-fn/shared, 9 migrations, config.toml, notification-item.tsx, notifications.rls.test.ts).
**Deploy note (not a code file):** the new fn ships via `bun scripts/deploy-edge-functions.ts send-lease-reminders` (CLI/PAT-401 + MCP non-ASCII workaround; owner-run if PAT stale — RESEARCH.md:471). Post-migration `bun run db:types` regenerates `src/types/supabase.ts` for the new `lease_reminders` columns + extended CHECK.
**Pattern extraction date:** 2026-07-21
