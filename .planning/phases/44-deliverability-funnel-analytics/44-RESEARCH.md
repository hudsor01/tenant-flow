# Phase 44: Deliverability + Funnel Analytics — Research

**Researched:** 2026-04-14
**Domain:** Resend webhook ingestion, Supabase data modelling, onboarding funnel instrumentation, admin analytics UI
**Confidence:** HIGH on codebase patterns and DB conventions; MEDIUM on Resend webhook payload shape (field-level schema not fully documented publicly — see Assumptions A3/A4); HIGH on Svix manual verification algorithm and recharts API

## Summary

Phase 44 adds one Edge Function (ingest Resend webhook events), two new DB tables (`email_deliverability`, `onboarding_funnel_events`), four SECURITY DEFINER RPCs (two admin-only aggregates per category + potentially a backfill helper), a one-time backfill migration, and the first admin-only Next.js route tree. None of the existing Resend senders need rewriting — every outbound `sendEmail()` call today already passes `tags: [{name: 'category', ...}]`, and the webhook payload preserves those tags, so template classification is a read-side concern, not a send-side refactor. [VERIFIED by grep across `supabase/functions/**/*.ts`]

The project's existing patterns map cleanly onto this phase:

- **HMAC/Svix verification**: `supabase/functions/docuseal-webhook/index.ts:220-277` is the canonical reference for reading the raw body, running `crypto.subtle` HMAC with constant-time compare, and returning 401 on mismatch. Resend's Svix algorithm differs (HMAC input is `${id}.${timestamp}.${body}`, secret is base64-decoded after stripping `whsec_`, signature is `v1,<base64>`) but the Edge Function skeleton is near-identical.
- **Admin-only RPCs**: `supabase/migrations/20260413120000_launch_readiness_instrumentation.sql:61-91` (`get_payout_timing_stats`) is the direct template — `SECURITY DEFINER` + `set search_path = 'public'` + `if not is_admin() then raise exception 'Unauthorized'`. Phase 44's two aggregate RPCs follow the same shape.
- **RLS tests for admin RPCs**: `tests/integration/rls/error-monitoring.test.ts` is the direct template — sign in as non-admin owner, call RPC, assert `error.message` matches `/access denied|admin only/i`.
- **Archive + retention**: `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` establishes the `*_archive` mirror table + `cleanup_old_*()` pg_cron function pattern. `email_deliverability` should follow the same convention (90-day retention, archive-then-delete, 3 AM UTC window).
- **Admin UI**: does not exist yet. `src/app/admin/**/*` returns zero matches. Phase 44 is the first admin route tree in this codebase, which means the proxy-middleware admin-gate is also net-new work.

**Primary recommendation:** Create one new route group `src/app/(admin)/` with a layout that runs `is_admin()` check in a server component, a single `/admin/analytics` page, and two client charts (deliverability table + funnel visualization). Use the **Resend Node SDK's `resend.webhooks.verify()` isn't available in Deno** — do manual Svix verification with `crypto.subtle` (HMAC-SHA256, base64-encoded comparison). Funnel events use **DB triggers** on `users`, `properties`, `tenant_invitations` (not `tenants` — invitation is the earlier signal), and `rent_payments` status transitions, because triggers are atomic with source writes and cannot be skipped. Backfill is a one-time SQL migration with `ON CONFLICT DO NOTHING` on `(owner_user_id, step_name)` so it is idempotent and re-runnable.

## User Constraints

This phase has no CONTEXT.md yet. Constraints come from ROADMAP.md lines 148-161 and REQUIREMENTS.md ANALYTICS-01..05.

### Locked Decisions (from requirements)

- **ANALYTICS-01**: Edge Function with Resend signature verification ingests `email.delivered`, `email.bounced`, `email.opened`, `email.complained`, `email.delivery_delayed` into an `email_deliverability` table keyed by Resend message id, with event timestamp, event type, recipient email, and originating template tag.
- **ANALYTICS-02**: Admin dashboard surfaces per-template deliverability stats (sent/delivered/bounced/complained rate) over a rolling window via a `SECURITY DEFINER` RPC with `is_admin()` guard.
- **ANALYTICS-03**: Four funnel steps tracked server-side: signup, first property added, first tenant invited, first rent collected (`rent_payments.status = 'succeeded'`). Stored with owner user id, step name, timestamp. Retroactive one-time backfill over existing users.
- **ANALYTICS-04**: SECURITY DEFINER RPC with `is_admin()` guard returns funnel aggregate stats (count at each step, conversion rate between steps, median time between steps), scoped to a date range.
- **ANALYTICS-05**: Admin analytics view renders funnel RPC output as a stepped visualization with conversion percentages and drop-off highlighting.
- RLS tests in `tests/integration/rls/` prove non-admin rejected, admin gets aggregated data.
- `pnpm typecheck && pnpm lint && pnpm test:unit` zero errors.
- **Out of scope (locked)**: PostHog/Amplitude/Mixpanel (first-class Supabase only), SMS deliverability (email only), tenant-side analytics (owner onboarding only), rewriting existing Stripe webhook handlers.

### Claude's Discretion

- Table and column naming (`email_deliverability` vs `email_events`; `onboarding_funnel_events` vs `user_activation_events`).
- Template tag extraction strategy — which of the existing `tags[].name` values (`category`, `type`) is canonical; whether to prefer Resend's `tags` object vs fall back to subject-line regex.
- Trigger vs explicit-write decision for funnel events (recommendation: triggers — see Pattern 3).
- Backfill mechanism: one-time migration script vs admin-callable RPC (recommendation: migration).
- Admin UI path — `/admin/analytics` vs `/dashboard/admin/analytics` vs `/(admin)/analytics` (recommendation: `/admin/analytics` in a new `(admin)` route group).
- Chart library: use existing `recharts` 3.7 `FunnelChart` vs roll from `BarChart` (recommendation: recharts `FunnelChart` — lowest new-code surface).
- Retention window for `email_deliverability` (recommendation: 90 days, matching existing `security_events` / `user_errors` / `stripe_webhook_events` retention per CLAUDE.md "Data Retention" section).
- Rolling window default for deliverability stats RPC (recommendation: 30 days — matches `get_payout_timing_stats`).

### Deferred Ideas (out of scope)

- Tenant-side funnel (v1.7 is owner-onboarding only per REQUIREMENTS.md).
- SMS/Twilio deliverability.
- Third-party analytics vendors.
- Alerting on high bounce rate (admin dashboard renders; notifications are a follow-up).
- Backfilling historical Resend events (Resend only delivers webhooks going forward; historical email_deliverability will be empty until the Edge Function has been live).
- Rewriting existing Resend senders to add new tag conventions (existing `{name: 'category'}` + `{name: 'type'}` tags are sufficient; classify at read time in the RPC).
- Cross-milestone: payout timing and autopay notifications (Phase 41 + Stage 1 already shipped).
- Tenant activation funnel (accept invite → first payment) — separate future phase.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANALYTICS-01 | Resend webhook Edge Function writes events to `email_deliverability` keyed by message_id, with timestamp, event_type, recipient, template_tag | Svix manual HMAC-SHA256 verification (docs.svix.com) + `docuseal-webhook/index.ts:220-277` skeleton + event types list verified against resend.com/docs/dashboard/webhooks |
| ANALYTICS-02 | SECURITY DEFINER RPC with `is_admin()` guard returns per-template sent/delivered/bounced/complained rate over rolling window | `get_payout_timing_stats()` template from migration `20260413120000` + `is_admin()` definition in `20251230220000` |
| ANALYTICS-03 | Server-side funnel step recording (signup, first property, first tenant invited, first rent collected); one-time backfill | Existing tables (`users`, `properties`, `tenant_invitations`, `rent_payments`) + `AFTER INSERT` / `AFTER UPDATE` trigger pattern; backfill migration follows `20260304170000_onboarding_backfill.sql` idempotent pattern |
| ANALYTICS-04 | SECURITY DEFINER RPC with `is_admin()` guard returns funnel count / conversion rate / median time-between-steps, scoped to date range | Same RPC pattern as ANALYTICS-02; `percentile_cont(0.5)` for median matches `get_payout_timing_stats` idiom |
| ANALYTICS-05 | Admin route renders funnel as stepped visualization with conversion % + drop-off highlighting | Recharts 3.7 `FunnelChart` + `Funnel` + `Cell` components (recharts.github.io); first admin route group (`(admin)` grouping) and middleware-level `is_admin()` gate |

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 44 |
|-----------|---------------------|
| No `any` types — use `unknown` with type guards | Webhook payload typed as `unknown` at entry, narrowed via runtime type guards before destructuring |
| No barrel files / re-exports | Import query key factories directly from `src/hooks/api/query-keys/`; import chart components directly from defining file |
| No duplicate types — search `src/types/` first | Check `src/types/analytics.ts` for existing funnel/deliverability types before defining new ones (none exist — can add fresh) |
| No `as unknown as` assertions | Use typed mapper functions at RPC/PostgREST boundaries — write `mapDeliverabilityStats()` / `mapFunnelStats()` per CLAUDE.md "RPC Return Typing" |
| No string literal query keys | Add `deliverability-keys.ts` and `funnel-keys.ts` to `src/hooks/api/query-keys/` using `queryOptions()` factory |
| No inline styles — Tailwind only | Chart custom colors via Tailwind class or `fill` prop with CSS variable from `globals.css` |
| No PostgreSQL ENUMs — use `text` + `CHECK` constraints | `email_deliverability.event_type` = `text check (event_type in ('delivered','bounced','opened','complained','delivery_delayed'))`; `onboarding_funnel_events.step_name` = `text check (step_name in ('signup','first_property','first_tenant_invited','first_rent_collected'))` |
| No `@radix-ui/react-icons` — lucide-react only | Chart header icons use `lucide-react` (e.g., `Mail`, `TrendingUp`, `Users`) |
| Server Components by default | Admin analytics page is a server component; fetches RPC data server-side; `"use client"` only on the chart components |
| Max 300 lines per component, 50 per function | Split admin analytics page into `page.tsx` (server, data fetch), `deliverability-table.tsx` (client), `funnel-chart.tsx` (client), each under limit |
| Soft-delete filter `.neq('status', 'inactive')` on properties | Backfill query for `first_property` step must respect this — use `.neq('status', 'inactive')` when enumerating existing properties |
| Mutations must invalidate `ownerDashboardKeys.all` | N/A — this phase has no owner-facing mutations; only admin reads |
| `set_updated_at()` is the only `updated_at` trigger | If `email_deliverability` has `updated_at`, use `set_updated_at()` trigger — never define a duplicate |
| All pg_cron jobs use named SECURITY DEFINER functions, `SET search_path = public` | Retention cleanup job follows this pattern |
| Archive-then-delete pattern | `email_deliverability_archive` mirrors main table, cleanup function archives before delete, runs at 3 AM UTC window (next slot: `0 4 * * *` or squeeze into existing 3:00/3:15/3:30/3:45 — check availability) |
| RLS on every table — policies per operation per role | `email_deliverability`: admin-only SELECT, service_role INSERT; `onboarding_funnel_events`: admin-only SELECT, service_role INSERT |
| All SECURITY DEFINER RPCs validate `auth.uid()` or `is_admin()` | Both RPCs guard with `if not is_admin() then raise exception 'Unauthorized'` |
| Edge Functions: `validateEnv` inside handler, `errorResponse` for errors, `createAdminClient` for service role | Follow exact pattern of `docuseal-webhook/index.ts:220-309` |
| CORS fail-closed — webhook does not need CORS headers (server-to-server) | Skip `handleCorsOptions` in this Edge Function; just validate signature and return JSON |
| No module-level Supabase client in hooks | Create `createClient()` inside each mutation/query function |
| Structured error responses: generic `{ error: 'An error occurred' }`, full detail to Sentry | Use `errorResponse(req, 500, err, {...})` from `_shared/errors.ts` |

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Deno runtime | (Supabase Edge Functions default) | Webhook ingest runtime | Matches all existing Edge Functions |
| `@supabase/supabase-js` | 2.97 [VERIFIED: `supabase/functions/deno.json`] | DB writes from Edge Function + RPC calls from frontend | Already standard |
| `@sentry/deno` | 9.x [VERIFIED: existing imports in `_shared/errors.ts:6`] | Error capture in Edge Function | Standard via `_shared/errors.ts` |
| `recharts` | 3.7.0 [VERIFIED: `package.json:169`] | Funnel visualization via `FunnelChart` + `Funnel` + `Cell` | Already installed and used by 20+ chart files |
| `@tanstack/react-query` | 5.90 [VERIFIED: CLAUDE.md] | Admin analytics queries on the client | Already standard; follow `queryOptions()` factory pattern |
| `lucide-react` | (existing) | Admin page icons (`Mail`, `TrendingUp`, `AlertTriangle`) | CLAUDE.md: sole icon library |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `crypto.subtle` (Web Crypto API) | HMAC-SHA256 for Svix signature | Deno runtime — no library dependency; exact pattern from `docuseal-webhook/index.ts:249-277` (adjust algorithm to match Svix format) |
| `atob` / `btoa` (Deno-native) | Base64 decode the `whsec_` secret after stripping prefix + encode computed HMAC for compare | Needed because Svix secrets are base64-encoded unlike Docuseal which uses hex |
| Admin route group `src/app/(admin)/` (net-new) | Admin-only pages | First admin area in codebase; adds Next.js 16 server-component `is_admin()` gate |
| PostgreSQL triggers (`AFTER INSERT`, `AFTER UPDATE`) | Funnel step recording atomic with source write | Preferred over explicit Edge Function writes — triggers cannot be skipped and cannot drift from source table state |
| `ON CONFLICT (...) DO NOTHING` | Idempotency of `email_deliverability.message_id + event_type` and `onboarding_funnel_events.(owner_user_id, step_name)` | Standard PostgreSQL idiom; matches the `webhook_events` idempotency pattern in `20260221130000_create_stripe_webhook_events.sql` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual Svix verification via `crypto.subtle` | `resend.webhooks.verify()` from Resend Node SDK | SDK is Node-first; Deno import path (`npm:resend`) technically works but adds dep surface. Manual verification is ~30 lines and matches `docuseal-webhook` style — no new dependency, no version drift risk. |
| Manual Svix | `svix` npm package (`Webhook.verify`) | Same Deno import concern; the manual algorithm is well-documented and stable (HMAC-SHA256 of `id.timestamp.body`) |
| DB triggers for funnel | Edge Function explicit writes | Triggers are atomic with source writes; cannot forget to call. Downside: adds DB load on common tables (`users`, `properties`). The load is one row insert per source insert — negligible. |
| `FunnelChart` from recharts | Roll custom from `BarChart` with horizontal orientation + custom `Cell` shapes | `FunnelChart` is built-in since recharts 2.x, survives into 3.x — zero custom shape code, free conversion-percentage labels via `LabelList`. Custom only needed if design demands a specific trapezoid shape recharts does not ship. |
| One-time migration backfill | Admin-callable RPC | Migration runs once on deploy, no re-trigger footgun. RPC would need an idempotency guard that duplicates the `ON CONFLICT DO NOTHING` that migration already uses — redundant. |
| `email_deliverability` as single event table | Split `email_sends` + `email_events` | Single table simpler; a `send` is implied by the first `delivered` or `bounced` event (if Resend sends a `sent` webhook that's captured) — sent-vs-event distinction is a read-time aggregation concern, not a schema concern. |
| Admin check in RPC only | Check in middleware AND RPC | Belt-and-suspenders per CLAUDE.md "Security Model" (RLS primary + proxy route-level enforcement). Middleware catches 99% of requests before DB round-trip; RPC check is last-resort defense. |
| Separate deliverability + funnel Edge Functions | Single webhook ingest function | Resend is the only inbound webhook sender for email events; no reason to split. Funnel events use triggers (no Edge Function at all). |

### Installation

No new npm packages required. Everything lives in existing stack:
- Edge Function uses `crypto.subtle` (Deno-native, no import)
- Frontend uses already-installed `recharts` and `@tanstack/react-query`
- DB layer uses PostgreSQL native triggers + RPCs

**Version verification (performed 2026-04-14):**
- `recharts` 3.7.0 pinned in package.json line 169 [VERIFIED by grep]. `FunnelChart` / `Funnel` / `Cell` exist in v3.x API per recharts.github.io [CITED: recharts.github.io/en-US/api/FunnelChart/, 2026-04-14]
- `@supabase/supabase-js` 2.97 pinned in `supabase/functions/deno.json` import map [VERIFIED: CLAUDE.md Edge Functions section]
- `@sentry/deno` 9 imported at `_shared/errors.ts:6` [VERIFIED]
- `svix` JavaScript library current major: checking registry blocked by sandbox EPERM on `npm view`; manual Svix verification algorithm stable since 2020 per docs.svix.com [CITED: docs.svix.com/receiving/verifying-payloads/how-manual]

## Architecture Patterns

### Recommended File Layout

```
supabase/
├── functions/
│   ├── resend-webhook/
│   │   └── index.ts                          # NEW — inbound webhook ingestion
│   └── tests/
│       ├── resend-webhook-delivered-test.ts  # NEW — Deno integration test
│       ├── resend-webhook-signature-test.ts  # NEW — signature verification test
│       └── resend-webhook-idempotency-test.ts # NEW — duplicate message_id + event_type idempotency
├── migrations/
│   ├── 20260415120000_email_deliverability_schema.sql           # NEW — table + indexes + RLS
│   ├── 20260415121000_onboarding_funnel_events_schema.sql       # NEW — table + indexes + RLS + triggers
│   ├── 20260415122000_analytics_rpcs.sql                         # NEW — two admin-only RPCs
│   ├── 20260415123000_onboarding_funnel_backfill.sql             # NEW — one-time idempotent backfill
│   └── 20260415124000_email_deliverability_retention.sql         # NEW — archive table + cleanup cron

src/
├── app/
│   └── (admin)/                              # NEW route group
│       ├── layout.tsx                        # server-component is_admin() gate
│       └── analytics/
│           ├── page.tsx                      # server component, fetches both RPCs
│           ├── deliverability-table.tsx      # client component (recharts-free table)
│           └── funnel-chart.tsx              # client component (recharts FunnelChart)
├── hooks/
│   └── api/
│       ├── query-keys/
│       │   ├── deliverability-keys.ts        # NEW queryOptions() factory
│       │   └── funnel-keys.ts                # NEW queryOptions() factory
│       └── use-admin-analytics.ts            # NEW admin-scoped hook
├── lib/
│   └── supabase/
│       └── is-admin-check.ts                 # NEW — server-side helper that wraps getUser + users.user_type check
└── types/
    └── admin-analytics.ts                    # NEW — DeliverabilityStats, FunnelStats, FunnelStep types

tests/
└── integration/
    └── rls/
        ├── deliverability-rpc.test.ts        # NEW — non-admin rejection test
        ├── funnel-rpc.test.ts                # NEW — non-admin rejection test
        └── email-deliverability-rls.test.ts  # NEW — non-admin cannot read table

proxy.ts                                      # MODIFY — add /admin route enforcement
```

### Pattern 1: Svix webhook signature verification in Deno

**What:** Resend signs webhooks using Svix (HMAC-SHA256 over `${id}.${timestamp}.${body}`). Secret starts with `whsec_`; strip prefix, base64-decode. Signature header format is `v1,<base64_sig>` (possibly space-delimited list). Timestamp tolerance 5 minutes.

**When to use:** Always for Resend webhook. Mandatory per ANALYTICS-01.

**Algorithm:**

```typescript
// Source: docs.svix.com/receiving/verifying-payloads/how-manual + pattern from
//         supabase/functions/docuseal-webhook/index.ts:249-277
// Reference only — do not compile in this research doc.

async function verifySvix(
  secret: string,            // "whsec_..." format
  svixId: string,            // from "svix-id" header
  svixTimestamp: string,     // from "svix-timestamp" header — seconds since epoch
  svixSignature: string,     // from "svix-signature" header — "v1,<base64> v1,<base64>"
  rawBody: string
): Promise<boolean> {
  // 1. Timestamp freshness (5-minute tolerance either direction)
  const nowSec = Math.floor(Date.now() / 1000)
  const tsSec = parseInt(svixTimestamp, 10)
  if (!Number.isFinite(tsSec) || Math.abs(nowSec - tsSec) > 300) {
    return false
  }

  // 2. Strip whsec_ prefix and base64-decode secret
  const secretBytes = Uint8Array.from(
    atob(secret.replace(/^whsec_/, '')),
    (c) => c.charCodeAt(0)
  )

  // 3. HMAC-SHA256 over "${id}.${timestamp}.${body}"
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
  const key = await crypto.subtle.importKey(
    'raw', secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(signedContent)
  )
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)))

  // 4. Header may contain multiple space-delimited signatures
  const signatures = svixSignature.split(' ').map((part) => {
    const [, value] = part.split(',', 2)
    return value ?? ''
  })

  // 5. Constant-time compare
  return signatures.some((candidate) => {
    if (candidate.length !== expectedBase64.length) return false
    const a = new TextEncoder().encode(candidate)
    const b = new TextEncoder().encode(expectedBase64)
    try {
      return (crypto.subtle as unknown as { timingSafeEqual?: (x: Uint8Array, y: Uint8Array) => boolean })
        .timingSafeEqual?.(a, b) ?? false
    } catch {
      // Fallback XOR compare if runtime lacks timingSafeEqual
      let d = 0
      for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]
      return d === 0
    }
  })
}
```

**Notes:**
- Docuseal uses raw HMAC (hex-encoded signature, header is a single hex string). Resend/Svix uses base64 signature inside `v1,<base64>` envelope — different enough to warrant its own helper.
- `crypto.subtle.timingSafeEqual` is available in Deno but may not be in all runtimes; the manual XOR fallback is belt-and-suspenders.
- Returning 401 on invalid signature matches `docuseal-webhook/index.ts:230-234, 265-277`.

### Pattern 2: `email_deliverability` table schema

**What:** Append-only event log; one row per (message_id, event_type) combination.

```sql
-- Source: adapted from supabase/migrations/20260221130000_create_stripe_webhook_events.sql
--         + supabase/migrations/20260413120000_launch_readiness_instrumentation.sql
-- Reference only.

create table if not exists public.email_deliverability (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,              -- Resend email_id (UUID format per docs)
  event_type text not null,
  event_at timestamptz not null,         -- from Resend top-level created_at (NOT data.created_at — that is email-created, not event-created)
  recipient_email text,                  -- from data.to[0] (normalized lowercase at insert)
  template_tag text,                     -- extracted from data.tags[] where name = 'category' (fallback to 'type')
  from_address text,                     -- for debugging
  subject text,                          -- for debugging
  raw_payload jsonb not null,            -- full payload for forensic analysis
  received_at timestamptz not null default now(),
  constraint email_deliverability_event_type_check check (
    event_type in ('delivered', 'bounced', 'opened', 'complained', 'delivery_delayed')
  ),
  constraint email_deliverability_unique unique (message_id, event_type)  -- idempotency
);

create index idx_email_deliverability_template_event on public.email_deliverability
  (template_tag, event_type, event_at desc);
create index idx_email_deliverability_recipient on public.email_deliverability
  (recipient_email, event_at desc);
create index idx_email_deliverability_event_at on public.email_deliverability
  (event_at desc);

alter table public.email_deliverability enable row level security;

-- Admin-only SELECT. Service role bypasses RLS for INSERT via Edge Function.
create policy email_deliverability_admin_select on public.email_deliverability
  for select to authenticated
  using ((select public.is_admin()));
```

**Why `unique (message_id, event_type)` not `primary key message_id`:** A single email can produce multiple webhook events (delivered → opened → complained). Keying only by message_id would lose events.

**Why `jsonb raw_payload`:** Lets us reprocess without re-ingesting (field migrations), and lets support answer "why did this bounce?" questions without a schema change.

### Pattern 3: `onboarding_funnel_events` table + triggers

**What:** Append-only funnel log; one row per (owner_user_id, step_name). Trigger-driven to guarantee atomicity with source writes.

```sql
-- Reference only.

create table if not exists public.onboarding_funnel_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  step_name text not null,
  completed_at timestamptz not null default now(),
  metadata jsonb,                        -- e.g., { "property_id": "...", "invitation_id": "..." }
  constraint onboarding_funnel_events_step_check check (
    step_name in ('signup', 'first_property', 'first_tenant_invited', 'first_rent_collected')
  ),
  constraint onboarding_funnel_events_unique unique (owner_user_id, step_name)
);

create index idx_onboarding_funnel_events_step_time on public.onboarding_funnel_events
  (step_name, completed_at);
create index idx_onboarding_funnel_events_owner on public.onboarding_funnel_events
  (owner_user_id);

alter table public.onboarding_funnel_events enable row level security;

create policy onboarding_funnel_events_admin_select on public.onboarding_funnel_events
  for select to authenticated
  using ((select public.is_admin()));
```

**Trigger 1 — signup:**
```sql
create or replace function record_funnel_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_type = 'OWNER' then
    insert into public.onboarding_funnel_events (owner_user_id, step_name, completed_at)
    values (new.id, 'signup', coalesce(new.created_at, now()))
    on conflict (owner_user_id, step_name) do nothing;
  end if;
  return new;
end; $$;

create trigger trg_funnel_signup
  after insert on public.users
  for each row execute function record_funnel_signup();
```

Handles: new owner row inserted.
**Also needs:** trigger AFTER UPDATE OF user_type when a PENDING user selects OWNER (see `20260305130000_restrict_user_type_change.sql` — transitions from PENDING are allowed). Covers the OAuth-first flow where user exists as PENDING before selecting role.

**Trigger 2 — first_property:**
```sql
create or replace function record_funnel_first_property() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.onboarding_funnel_events
    (owner_user_id, step_name, completed_at, metadata)
  values
    (new.owner_user_id, 'first_property', coalesce(new.created_at, now()),
     jsonb_build_object('property_id', new.id))
  on conflict (owner_user_id, step_name) do nothing;
  return new;
end; $$;

create trigger trg_funnel_first_property
  after insert on public.properties
  for each row execute function record_funnel_first_property();
```
**`status` filter:** None needed — all newly-inserted properties count even if soft-deleted later. The funnel step is "reached" permanently.

**Trigger 3 — first_tenant_invited:**
```sql
-- Fires on tenant_invitations insert (not tenants — invitation is the earlier, more-reliable signal).
create or replace function record_funnel_first_tenant_invited() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.onboarding_funnel_events
    (owner_user_id, step_name, completed_at, metadata)
  values
    (new.owner_user_id, 'first_tenant_invited', coalesce(new.created_at, now()),
     jsonb_build_object('invitation_id', new.id))
  on conflict (owner_user_id, step_name) do nothing;
  return new;
end; $$;

create trigger trg_funnel_first_tenant_invited
  after insert on public.tenant_invitations
  for each row execute function record_funnel_first_tenant_invited();
```

**Trigger 4 — first_rent_collected:**
```sql
-- Fires when rent_payments.status transitions to 'succeeded' (or is inserted as 'succeeded').
-- Must look up owner_user_id via lease_id -> leases.owner_user_id.
create or replace function record_funnel_first_rent_collected() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
begin
  if new.status = 'succeeded'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    select l.owner_user_id into v_owner_id
    from public.leases l
    where l.id = new.lease_id;

    if v_owner_id is not null then
      insert into public.onboarding_funnel_events
        (owner_user_id, step_name, completed_at, metadata)
      values
        (v_owner_id, 'first_rent_collected',
         coalesce(new.paid_at, new.created_at, now()),
         jsonb_build_object(
           'lease_id', new.lease_id,
           'rent_payment_id', new.id
         ))
      on conflict (owner_user_id, step_name) do nothing;
    end if;
  end if;
  return new;
end; $$;

create trigger trg_funnel_first_rent_insert
  after insert on public.rent_payments
  for each row execute function record_funnel_first_rent_collected();

create trigger trg_funnel_first_rent_update
  after update of status on public.rent_payments
  for each row execute function record_funnel_first_rent_collected();
```

**Why two triggers for rent_payments:** `rent_payments` rows can be inserted directly as `succeeded` (via `record_rent_payment` RPC) or start as `pending` / `processing` and update to `succeeded` via webhook. Both paths must capture the event.

**Why `leases.owner_user_id` not `rent_payments.owner_user_id`:** Check the actual schema. From CLAUDE.md "Schema Conventions": `leases has single owner column owner_user_id`. `rent_payments.lease_id` joins back to leases. No denormalized owner column on rent_payments (search codebase to confirm before writing).

### Pattern 4: Backfill migration — idempotent

**What:** One-time migration that backfills funnel steps for all existing OWNER users. Must be safe to re-run.

```sql
-- Source: pattern adapted from supabase/migrations/20260304170000_onboarding_backfill.sql
-- Reference only.

-- Step 1: signup
insert into public.onboarding_funnel_events (owner_user_id, step_name, completed_at)
select id, 'signup', coalesce(created_at, now())
from public.users
where user_type = 'OWNER'
on conflict (owner_user_id, step_name) do nothing;

-- Step 2: first_property (for each OWNER, earliest property)
insert into public.onboarding_funnel_events
  (owner_user_id, step_name, completed_at, metadata)
select
  p.owner_user_id, 'first_property',
  p.created_at,
  jsonb_build_object('property_id', p.id)
from (
  select distinct on (owner_user_id) id, owner_user_id, created_at
  from public.properties
  order by owner_user_id, created_at asc
) p
on conflict (owner_user_id, step_name) do nothing;

-- Step 3: first_tenant_invited (earliest tenant_invitation per owner)
insert into public.onboarding_funnel_events
  (owner_user_id, step_name, completed_at, metadata)
select
  ti.owner_user_id, 'first_tenant_invited',
  ti.created_at,
  jsonb_build_object('invitation_id', ti.id)
from (
  select distinct on (owner_user_id) id, owner_user_id, created_at
  from public.tenant_invitations
  order by owner_user_id, created_at asc
) ti
on conflict (owner_user_id, step_name) do nothing;

-- Step 4: first_rent_collected (earliest succeeded payment per owner)
insert into public.onboarding_funnel_events
  (owner_user_id, step_name, completed_at, metadata)
select
  sub.owner_user_id, 'first_rent_collected',
  sub.paid_at,
  jsonb_build_object('lease_id', sub.lease_id, 'rent_payment_id', sub.id)
from (
  select distinct on (l.owner_user_id)
    rp.id, l.owner_user_id, rp.lease_id,
    coalesce(rp.paid_at, rp.created_at) as paid_at
  from public.rent_payments rp
  join public.leases l on l.id = rp.lease_id
  where rp.status = 'succeeded'
  order by l.owner_user_id, coalesce(rp.paid_at, rp.created_at) asc
) sub
on conflict (owner_user_id, step_name) do nothing;
```

**Why `DISTINCT ON (owner_user_id)` ordered ASC:** gives us the earliest row per owner. Same idiom PostgreSQL docs recommend for "min per group" queries.
**Why `ON CONFLICT DO NOTHING`:** idempotent — re-running inserts nothing new. Triggers fire for future rows; backfill handles existing.

### Pattern 5: SECURITY DEFINER RPCs

**Deliverability RPC (`get_deliverability_stats`):**

```sql
-- Source: template from supabase/migrations/20260413120000_launch_readiness_instrumentation.sql:61-91
-- Reference only.
create or replace function public.get_deliverability_stats(
  p_days integer default 30
) returns jsonb
language plpgsql security definer set search_path = 'public'
as $$
begin
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'template_tag', coalesce(template_tag, 'untagged'),
          'sent', total_events,                         -- proxy for sent count; see note
          'delivered', delivered_count,
          'bounced', bounced_count,
          'opened', opened_count,
          'complained', complained_count,
          'delivered_rate',
            case when total_unique_messages = 0 then 0
                 else round((delivered_count::numeric / total_unique_messages) * 100, 2)
            end,
          'bounced_rate',
            case when total_unique_messages = 0 then 0
                 else round((bounced_count::numeric / total_unique_messages) * 100, 2)
            end,
          'complained_rate',
            case when total_unique_messages = 0 then 0
                 else round((complained_count::numeric / total_unique_messages) * 100, 2)
            end
        )
      )
      from (
        select
          template_tag,
          count(*) as total_events,
          count(distinct message_id) as total_unique_messages,
          count(*) filter (where event_type = 'delivered') as delivered_count,
          count(*) filter (where event_type = 'bounced') as bounced_count,
          count(*) filter (where event_type = 'opened') as opened_count,
          count(*) filter (where event_type = 'complained') as complained_count
        from public.email_deliverability
        where event_at >= now() - make_interval(days => p_days)
        group by template_tag
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_deliverability_stats(integer) to authenticated;
```

**Note on "sent":** Resend webhooks deliver `email.sent` events in practice. If the project wants a true send count, include `'sent'` in the event_type CHECK constraint — but that adds a 6th event type not listed in ANALYTICS-01. Cleanest interpretation: denominator for rate is `count(distinct message_id)` which approximates "attempted sends." Surface this as an Open Question.

**Funnel RPC (`get_funnel_stats`):**

```sql
-- Reference only.
create or replace function public.get_funnel_stats(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path = 'public'
as $$
declare
  v_counts jsonb;
  v_medians jsonb;
begin
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  -- Counts per step for cohort of owners whose signup is in window.
  with cohort as (
    select owner_user_id, completed_at as signup_at
    from public.onboarding_funnel_events
    where step_name = 'signup'
      and completed_at between p_from and p_to
  ),
  step_times as (
    select
      c.owner_user_id,
      c.signup_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_property') as first_property_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_tenant_invited') as first_tenant_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_rent_collected') as first_rent_at
    from cohort c
  ),
  counts as (
    select
      count(*) filter (where signup_at is not null) as signup_count,
      count(*) filter (where first_property_at is not null) as first_property_count,
      count(*) filter (where first_tenant_at is not null) as first_tenant_count,
      count(*) filter (where first_rent_at is not null) as first_rent_count
    from step_times
  ),
  medians as (
    select
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_property_at - signup_at)) / 3600.0
      ) filter (where first_property_at is not null) as median_hours_signup_to_property,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - first_property_at)) / 3600.0
      ) filter (where first_tenant_at is not null and first_property_at is not null)
        as median_hours_property_to_tenant,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_rent_at - first_tenant_at)) / 3600.0
      ) filter (where first_rent_at is not null and first_tenant_at is not null)
        as median_hours_tenant_to_rent
    from step_times
  )
  select
    jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'steps', jsonb_build_array(
        jsonb_build_object('step', 'signup', 'count', c.signup_count),
        jsonb_build_object('step', 'first_property', 'count', c.first_property_count,
          'conversion_rate_from_prev', case when c.signup_count = 0 then 0
            else round((c.first_property_count::numeric / c.signup_count) * 100, 2) end),
        jsonb_build_object('step', 'first_tenant_invited', 'count', c.first_tenant_count,
          'conversion_rate_from_prev', case when c.first_property_count = 0 then 0
            else round((c.first_tenant_count::numeric / c.first_property_count) * 100, 2) end),
        jsonb_build_object('step', 'first_rent_collected', 'count', c.first_rent_count,
          'conversion_rate_from_prev', case when c.first_tenant_count = 0 then 0
            else round((c.first_rent_count::numeric / c.first_tenant_count) * 100, 2) end)
      ),
      'medians', jsonb_build_object(
        'hours_signup_to_property', m.median_hours_signup_to_property,
        'hours_property_to_tenant', m.median_hours_property_to_tenant,
        'hours_tenant_to_rent', m.median_hours_tenant_to_rent
      )
    )
  into v_counts
  from counts c, medians m;

  return v_counts;
end;
$$;

grant execute on function public.get_funnel_stats(timestamptz, timestamptz) to authenticated;
```

**Cohort semantics choice:** The RPC above uses **signup cohort** — owners who signed up in the date range, and their follow-through regardless of when downstream steps happened. Alternative: **step window** — count events per step that happened in the range, without cohort alignment. Cohort is more honest for "what % of owners who signed up in March have collected rent by now," but it means a new signup from yesterday drags down the conversion rate. Surface as Open Question.

### Pattern 6: Admin route group with server-component gate

**What:** First admin area in the app. Route group `(admin)` lets us put an admin-only layout without changing URLs.

**File: `src/app/(admin)/layout.tsx` (server component):**

```typescript
// Reference only.
import { redirect } from 'next/navigation'
import { createServerClient } from '#lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/analytics')

  // getUser() sets auth on supabase client; now check user_type directly from JWT via app_metadata
  const userType = user.app_metadata?.user_type
  if (userType !== 'ADMIN') redirect('/dashboard')

  return <>{children}</>
}
```

**Proxy-level defense (`proxy.ts` modify):**

```typescript
// Add after line 96 (OWNER/ADMIN tenant-route enforcement block):
// TENANT or OWNER accessing admin routes
if (userType !== 'ADMIN' && pathname.startsWith('/admin')) {
  return redirectWithCookies(
    new URL(userType === 'TENANT' ? '/tenant' : '/dashboard', request.url),
    supabaseResponse
  )
}
```

**Why both:** Middleware blocks pre-DB-round-trip. Server-component gate catches the edge case where middleware is bypassed (e.g., internal routing, Next.js 16 edge cases). RPC check (via `is_admin()`) is the ultimate defense and also guards direct PostgREST calls.

### Pattern 7: Admin analytics page + charts

**File: `src/app/(admin)/analytics/page.tsx` (server component, 70 lines):**

```typescript
// Reference only. Fetches both RPCs server-side so initial render has data.
import { createServerClient } from '#lib/supabase/server'
import { DeliverabilityTable } from './deliverability-table'
import { FunnelChartClient } from './funnel-chart'

export default async function AdminAnalyticsPage() {
  const supabase = await createServerClient()
  const [deliverabilityResult, funnelResult] = await Promise.all([
    supabase.rpc('get_deliverability_stats', { p_days: 30 }),
    supabase.rpc('get_funnel_stats', {}),
  ])

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl font-semibold">Admin Analytics</h1>
      <section>
        <h2 className="text-lg font-semibold mb-4">Email Deliverability (30d)</h2>
        <DeliverabilityTable data={deliverabilityResult.data ?? []} />
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Onboarding Funnel</h2>
        <FunnelChartClient data={funnelResult.data} />
      </section>
    </div>
  )
}
```

**File: `src/app/(admin)/analytics/funnel-chart.tsx` (client component, recharts FunnelChart):**

```typescript
// Source: recharts.github.io/en-US/api/FunnelChart/
// Reference only.
'use client'
import { FunnelChart, Funnel, Cell, LabelList, Tooltip, ResponsiveContainer } from 'recharts'

interface FunnelStep {
  step: string
  count: number
  conversion_rate_from_prev?: number
}

const STEP_LABEL: Record<string, string> = {
  signup: 'Signed Up',
  first_property: 'Added Property',
  first_tenant_invited: 'Invited Tenant',
  first_rent_collected: 'Collected Rent',
}

export function FunnelChartClient({ data }: { data: { steps: FunnelStep[] } | null }) {
  if (!data?.steps) return <div>No data</div>
  const chartData = data.steps.map((s) => ({
    name: STEP_LABEL[s.step] ?? s.step,
    value: s.count,
    fill: s.conversion_rate_from_prev !== undefined && s.conversion_rate_from_prev < 50
      ? 'var(--color-destructive)'
      : 'var(--color-primary)',
  }))
  return (
    <ResponsiveContainer width="100%" height={320}>
      <FunnelChart>
        <Funnel dataKey="value" data={chartData} isAnimationActive={false}>
          <LabelList position="right" dataKey="name" />
          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Funnel>
        <Tooltip />
      </FunnelChart>
    </ResponsiveContainer>
  )
}
```

**Why `isAnimationActive={false}`:** matches existing chart conventions and improves repeat-render perf.

### Anti-Patterns to Avoid

- **Do NOT hand-roll HMAC by concatenating headers without the exact Svix format.** The signed content is `${id}.${timestamp}.${body}` — any deviation fails verification silently.
- **Do NOT use `data.created_at` for event timestamp.** That is the email-created timestamp, not the event timestamp. Use top-level `created_at` or (safer) extract from event-specific nested timestamp. See Open Question 4.
- **Do NOT rely on webhook idempotency via `message_id` alone.** Multiple events share the same message_id. Use `(message_id, event_type)` composite uniqueness.
- **Do NOT backfill via Edge Function or admin RPC callable from the browser.** One-time backfill is a migration — runs once on deploy, no retrigger footgun.
- **Do NOT read `users.user_type` in a query inside the admin layout for the gate check.** Use the JWT claim `user.app_metadata.user_type` (already populated by `custom_access_token_hook`). Avoids an extra DB round-trip on every admin page load.
- **Do NOT put PostgreSQL ENUMs on event_type or step_name.** CLAUDE.md rule: `text` + `CHECK` constraint.
- **Do NOT add another global query key namespace string-literal like `['admin-analytics']`.** Build a `queryOptions()` factory per CLAUDE.md convention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Svix webhook signature verification | Custom concatenation of headers with your own HMAC flavor | Exact Svix algorithm (`${id}.${timestamp}.${body}`, HMAC-SHA256, base64-decoded `whsec_...` secret, constant-time compare) | Svix spec is narrow and exact — any deviation silently rejects valid webhooks or accepts forged ones |
| Median time-between-steps | Application-level min/max loop | `percentile_cont(0.5) within group (order by ...)` in PostgreSQL | Matches `get_payout_timing_stats` idiom; runs in DB where the data lives |
| Funnel chart shape | Custom SVG with path elements | `recharts` `FunnelChart` + `Funnel` + `Cell` + `LabelList` | Shipped since recharts 2.x, API stable in 3.x; free conversion labels |
| Cross-step conversion rate math | Client-side derivation | Compute in RPC; return shape `{ step, count, conversion_rate_from_prev }` per step | Ensures consistent calculation across dashboard + any other consumer |
| Event archive + delete | Per-job custom batch logic | Follow `cleanup_old_webhook_events()` pattern: `limit 10000 for update skip locked`, `insert ... on conflict do nothing`, then delete by id | Safe concurrent scheduling via pg_cron already proven |
| Admin gating | Role-based conditional rendering scattered across pages | Route group `(admin)` + layout-level check + middleware check + RPC `is_admin()` check | Three layers of defense; middleware is cheapest gate so it runs first |
| Template tag extraction | Subject-line regex or custom lookup table | Read `data.tags[].name = 'category'` (or `'type'`) directly from Resend payload | Tags are already set on every existing `sendEmail()` call site [VERIFIED by grep] |
| Idempotent backfill | SET-based check-then-insert | `insert ... on conflict do nothing` with a UNIQUE constraint | One SQL statement; race-safe; re-runnable |

**Key insight:** Every sub-problem in Phase 44 has a mature solution already present in the codebase or the PostgreSQL/recharts ecosystem. The implementation is ~90% composition of existing patterns and ~10% net-new glue (admin route group, one Edge Function, triggers, two RPCs).

## Runtime State Inventory

Not applicable — Phase 44 is additive (new Edge Function, new tables, new RPCs, new route group). No renames, no migrations of existing data beyond the one-time funnel backfill (explicitly covered). No external services have "TenantFlow analytics" or similar strings registered yet. One environment variable is net-new: `RESEND_WEBHOOK_SECRET` (`whsec_...`) must be added to Supabase Edge Function secrets; surfaced in Environment Availability.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Deno runtime | Edge Function | ✓ | (Supabase-managed) | — |
| `@supabase/supabase-js` 2.97 | Edge Function + frontend | ✓ | 2.97 [VERIFIED] | — |
| `recharts` 3.7.0 | Admin funnel chart | ✓ | 3.7.0 [VERIFIED: package.json:169] | — |
| `@tanstack/react-query` 5.90 | Admin analytics hooks | ✓ | 5.90 [CLAUDE.md] | — |
| `RESEND_WEBHOOK_SECRET` (Supabase Edge Function secret) | Signature verification | ✗ (must be created) | — | Workflow cannot run without it; webhook returns 401 for every request |
| Resend dashboard webhook endpoint configured | Sending webhooks | ✗ (must be configured) | — | No events land; wave 0 creates the webhook subscription pointing to deployed Edge Function URL |
| PostgreSQL 15+ (for `make_interval`) | RPC idioms | ✓ (Supabase default) | 15+ | — |
| `is_admin()` PL/pgSQL function | RPC guard | ✓ | Defined at `20251230220000_fix_jwt_claims_path.sql:77` [VERIFIED] | — |
| `custom_access_token_hook` | JWT claim population | ✓ | [VERIFIED in same migration] | — |
| pg_cron extension | Retention cleanup schedule | ✓ | Active per `cleanup_cron_scheduling.sql` | — |
| `E2E_OWNER_*` test credentials | RLS integration tests | ✓ | [VERIFIED: `tests/integration/setup/supabase-client.ts`] | Tests skip if missing, which is unacceptable for admin RPC testing |
| Admin test account | RLS test where admin gets data | ✗ (probably missing) | — | Need an `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` env var pair, or skip admin-gets-data branch and document manually |

**Missing dependencies with no fallback (Wave 0 blockers):**
- `RESEND_WEBHOOK_SECRET` — create in Resend dashboard (Webhooks page) → copy → set via `supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...`
- Resend webhook subscription pointing to deployed Edge Function URL (post-deploy configuration step)

**Missing dependencies with fallback:**
- Admin test credentials — if test environment lacks an ADMIN user, the RLS test for "admin gets data" can be marked `describe.skipIf(!adminCredentials)`. The "non-admin rejected" test still runs against owner/tenant credentials and provides negative-path coverage.

## Common Pitfalls

### Pitfall 1: Tags format assumption

**What goes wrong:** Research found two possible shapes for tags in Resend webhook payload — either `"tags": [{ "name": "category", "value": "auth" }]` (matching the send format) or `"tags": { "category": "auth" }` (object map, per the Turso article example).

**Why it happens:** Different Resend docs pages show different shapes. Without a current verified payload sample from production, the ingest code may assume array shape and silently set `template_tag = null` for every event.

**How to avoid:**
1. Before writing the final ingest code, deploy the Edge Function with raw-payload dump only (log `data.tags` shape and exit).
2. Or parse defensively: handle both array and object at the same spot.

```typescript
// Defensive — handles both shapes
function extractTemplateTag(tags: unknown): string | null {
  if (!tags) return null
  if (Array.isArray(tags)) {
    const categoryTag = tags.find(
      (t): t is { name: string; value: string } =>
        typeof t === 'object' && t !== null && (t as { name?: unknown }).name === 'category'
    )
    if (categoryTag) return categoryTag.value
    const typeTag = tags.find(
      (t): t is { name: string; value: string } =>
        typeof t === 'object' && t !== null && (t as { name?: unknown }).name === 'type'
    )
    return typeTag ? typeTag.value : null
  }
  if (typeof tags === 'object') {
    const obj = tags as Record<string, unknown>
    const cat = obj['category']
    if (typeof cat === 'string') return cat
    const typ = obj['type']
    if (typeof typ === 'string') return typ
  }
  return null
}
```

**Warning signs:** Every row in `email_deliverability` has `template_tag = null` → tags format does not match the parser.

### Pitfall 2: Message_id collision across event types

**What goes wrong:** Primary key on `message_id` alone rejects the second event for the same email (opened after delivered).

**Why it happens:** First instinct is `primary key (message_id)`; Resend sends multiple events per email (delivered, opened, complained).

**How to avoid:** Use `unique (message_id, event_type)` and a surrogate `uuid id` primary key.

**Warning signs:** Insert of the second event for a known message_id returns a duplicate-key error; `email_deliverability` has exactly one row per message_id instead of one per event.

### Pitfall 3: Trigger-induced deadlock on rent_payments

**What goes wrong:** Trigger fires inside the same transaction as the source write. If the trigger also writes to a table that the source transaction already locks (e.g., users), Postgres can deadlock.

**Why it happens:** `record_funnel_first_rent_collected()` does a `select from leases` (join path) — in theory harmless. But if an OWNER insert happens concurrently with a trigger that tries to insert into `onboarding_funnel_events` which references `users.id`, there can be lock contention on the referenced row.

**How to avoid:**
- `onboarding_funnel_events.owner_user_id references users(id) on delete cascade` — FK acquires a shared lock; benign.
- Keep trigger functions read-light: single `select` for join, single `insert`, no `update` on source tables.
- Set `search_path = public` on every trigger function (required) and run as `security definer` so RLS doesn't block service-role-driven writes.
- Test under concurrency in the Deno integration tests (simulate two owner signups + rent payment in parallel).

**Warning signs:** Log `deadlock detected` from Postgres; triggers fail but source rows succeed.

### Pitfall 4: Backfill counts incomplete tenant_invitations

**What goes wrong:** Some owners may have invited tenants via the `tenants` table directly (pre-invitation-flow) rather than via `tenant_invitations`. Backfilling only from `tenant_invitations` misses those cohorts.

**Why it happens:** `tenant_invitations` table was added in v1.3 (Phase 21 per ROADMAP). Owners who invited tenants before that may have `tenants` rows without a corresponding `tenant_invitations` row.

**How to avoid:** Backfill from `tenants` as a union with `tenant_invitations`:
```sql
insert into public.onboarding_funnel_events (owner_user_id, step_name, completed_at, metadata)
select owner_user_id, 'first_tenant_invited', min(created_at), jsonb_build_object('source', source)
from (
  select owner_user_id, created_at, 'invitation' as source
    from public.tenant_invitations
  union all
  select owner_user_id, created_at, 'tenant' as source
    from public.tenants
    where owner_user_id is not null  -- check schema; may not have direct owner col
) combined
group by owner_user_id, source
on conflict (owner_user_id, step_name) do nothing;
```
(Verify `tenants.owner_user_id` exists — CLAUDE.md says `owner_user_id` is canonical on properties/leases/maintenance_requests/documents, but does not explicitly list `tenants`. Check `src/types/supabase.ts` or run `\d public.tenants` before writing the final migration.)

**Warning signs:** Funnel stats show zero owners at `first_tenant_invited` step for cohorts pre-Phase 21.

### Pitfall 5: `get_funnel_stats` cohort confusion

**What goes wrong:** Admin expects "conversion rate in March" to show 100%/80%/60%/40% for step1/step2/step3/step4 because 100 signed up and 40 collected rent. In reality the March cohort's conversion to rent-collected took 6 weeks — if the RPC filters by `p_from/p_to` on `completed_at` for each step independently, the denominator shifts and numbers look inconsistent.

**Why it happens:** Two valid cohort semantics: (a) signup cohort (owners who signed up in window, track their downstream forever) vs (b) event-window (count events per step that happened in window, decoupled).

**How to avoid:** Pick one explicitly, document the choice in RPC comment, and show the semantics label on the admin page.

**Warning signs:** Team asks "why does the funnel look different than I expected" — usually means semantics don't match mental model.

### Pitfall 6: Middleware admin check bypass via direct RPC

**What goes wrong:** Middleware gate only protects page routes. An attacker who bypasses the page (direct PostgREST RPC call from browser) gets data if only the page checks `is_admin()`.

**Why it happens:** Middleware is HTTP-level; RPC is DB-level; only DB-level check is sufficient for defense in depth.

**How to avoid:** `is_admin()` guard inside every admin-only RPC (already in the pattern). Also: `email_deliverability` RLS policy with `using ((select public.is_admin()))`.

**Warning signs:** Penetration test finds admin data leaking via direct RPC; RLS test on RPC is missing.

### Pitfall 7: Resend event timestamp drift

**What goes wrong:** `data.created_at` is the email-created timestamp (when the send happened). Top-level `created_at` is the event timestamp. If we conflate them, "delivered after bounced" paradoxes appear in the data.

**Why it happens:** Both fields exist and have similar names.

**How to avoid:** Use top-level `created_at` (the event created time) as `event_at`. Document in comment on the table.

**Warning signs:** Bounce event timestamped before send in the admin report.

### Pitfall 8: Signature verification before body is fully read

**What goes wrong:** Deno's `req.text()` can only be called once. If you try to `await req.json()` first (to read payload) and then call `req.text()` for signature verification, it throws.

**Why it happens:** Common footgun in webhook handlers.

**How to avoid:** Read `const rawBody = await req.text()` FIRST, then `const payload = JSON.parse(rawBody)`. Matches `docuseal-webhook/index.ts:237-290` exactly.

**Warning signs:** Edge Function returns 401 on every request; logs show "body already consumed."

## Code Examples

Verified patterns from the existing codebase:

### HMAC body reading + verification skeleton (Deno)
Reference: `supabase/functions/docuseal-webhook/index.ts:237-277`. Adapt the algorithm from hex-HMAC to Svix-base64 per Pattern 1.

### Admin-only SECURITY DEFINER RPC with is_admin()
Reference: `supabase/migrations/20260413120000_launch_readiness_instrumentation.sql:61-91`
```sql
if not is_admin() then
  raise exception 'Unauthorized';
end if;
```

### Archive-then-delete with pg_cron schedule
Reference: `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql:222-284`

### RLS test for admin-only RPC (non-admin rejection)
Reference: `tests/integration/rls/error-monitoring.test.ts:16-23`
```typescript
const { data, error } = await clientA.rpc('get_error_summary', { hours_back: 24 })
expect(error).not.toBeNull()
expect(error!.message).toMatch(/access denied|admin only/i)
```

### Server component data fetch for admin page
Reference: `src/hooks/api/use-analytics.ts:42-57` pattern (converted to server-component `createServerClient()`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw HMAC (docuseal pattern, hex signature) | Svix standard (HMAC over `id.timestamp.body`, base64, `v1,<sig>` envelope) | Svix became the dominant webhook signing lib 2022-2023 | Resend-specific; other providers (Clerk, Supabase Auth, Stripe) each have their own signing scheme |
| PostHog/Amplitude third-party | First-class Supabase tables | v1.7 REQUIREMENTS.md explicit locked decision | Eliminates data leakage concerns; full control over retention/schema |
| Funnel tracking via client-side events | Server-side DB triggers on source tables | 2024+ industry shift away from "client sends analytics event" because of ad-blocker / race condition reliability | Triggers cannot be skipped; events are atomic with source writes |
| Individual `*_stats` RPCs per metric | Consolidated RPCs returning JSONB per dashboard section | v1.1 onwards (CLAUDE.md "Performance Conventions") | Matches project pattern; one RPC per admin section |

**Deprecated / outdated:**
- Resend's older `bounce` event (singular) was replaced by `email.bounced` (5-event family) — confirm event name strings are the `email.*` prefixed form at ingest.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Existing `sendEmail()` call sites tag with `{name: 'category', value: '<template>'}` sufficient for template_tag extraction | Summary, Pattern 1, Pitfall 1 | [VERIFIED via grep on `supabase/functions/**/*.ts`] — all 10 call sites pass tags. If a new sender adds without tags, `template_tag` would be null for that sender. Mitigation: defensive null handling in aggregation RPC (tag = 'untagged'). |
| A2 | Resend webhooks use Svix signature format | Pattern 1, Standard Stack | [CITED: resend.com/docs/dashboard/webhooks/verify-webhooks-requests]. If Resend migrates signing scheme later, the verifier must be re-implemented. |
| A3 | Resend webhook payload includes `data.email_id` (UUID) as the message_id | Pattern 2 | [CITED: turso.tech blog example, resend.com/blog/webhooks mention]. If the canonical docs name differs (e.g., `data.id` or `resend_id`), the ingest function must adapt. Deploy-with-log-dump on first event confirms this quickly. |
| A4 | Webhook payload preserves tags as either array of `{name, value}` or object map `{name: value}` | Pitfall 1 | [ASSUMED]. Recommend defensive parser that handles both shapes. |
| A5 | `tenants` table has an `owner_user_id` or equivalent that backfill can use | Pitfall 4 | [ASSUMED — CLAUDE.md does not explicitly list `tenants` in the canonical-owner-column list]. Verify in `src/types/supabase.ts` before writing backfill. |
| A6 | `rent_payments.paid_at` exists and is the right source timestamp for `first_rent_collected` | Pattern 3, Pattern 4 | [ASSUMED — typical SaaS schema]. If the column is named differently (`succeeded_at`, `charged_at`), update trigger and backfill. |
| A7 | `user.app_metadata.user_type` is populated by `custom_access_token_hook` on every JWT | Pattern 6 (admin gate) | [CITED: `supabase/migrations/20251230220000_fix_jwt_claims_path.sql:77-91`]. If hook is not enabled in prod, `is_admin()` returns false for all users — all admin routes empty. Wave 0 step must verify. |
| A8 | Recharts 3.x ships `FunnelChart` with `Funnel`, `Cell`, `LabelList` | Pattern 7 | [CITED: recharts.github.io/en-US/api/FunnelChart/]. Fallback: roll from BarChart horizontal orientation with custom shape prop. |
| A9 | 90-day retention matches other event tables | Table schema | [VERIFIED via CLAUDE.md "Data Retention" section + grep on `cleanup_cron_scheduling.sql`]. |
| A10 | Signup trigger on `users` INSERT + UPDATE of `user_type` captures both Google-OAuth-first and email-signup flows | Pattern 3 | [ASSUMED based on `20260227160724_google_oauth_pending_user_type.sql` + `20260305130000_restrict_user_type_change.sql`]. Verify by inspecting both flows' user_type progressions. |
| A11 | The "first tenant invited" step uses `tenant_invitations` (not `tenants`) | Pattern 3 | [ASSUMED]. `tenant_invitations` was added in v1.3 (Phase 21). Older owners may have `tenants` rows without matching invitations — see Pitfall 4. |
| A12 | Admin test account exists in test env with `user_type = 'ADMIN'` | Environment Availability | [ASSUMED false — likely needs to be created]. Without it, admin-gets-data RLS test can only be skipped or done manually. |

**If A1–A3 hold (very likely) and A4 resolves in first deploy (easy), phase has no blockers. A5, A6 require a 5-minute schema check before writing the backfill migration.**

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 (unit + component) + Vitest integration (RLS) + Deno test (Edge Function integration) + Playwright (optional E2E — skip for this phase) |
| Config file | `vitest.config.ts` (existing, adds no new config) + `supabase/functions/deno.json` (existing) |
| Quick run command | `pnpm test:unit -- --run src/app/\(admin\)/analytics/` (for admin UI unit tests) |
| Full suite command | `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANALYTICS-01 | Edge Function verifies Svix signature (reject 401 on mismatch) | Deno integration | `cd supabase/functions && deno test --allow-all --no-check tests/resend-webhook-signature-test.ts` | ❌ Wave 0 |
| ANALYTICS-01 | Edge Function writes to `email_deliverability` on valid event | Deno integration | `cd supabase/functions && deno test --allow-all --no-check tests/resend-webhook-delivered-test.ts` | ❌ Wave 0 |
| ANALYTICS-01 | Duplicate `(message_id, event_type)` is idempotent (returns 200, inserts nothing) | Deno integration | `cd supabase/functions && deno test --allow-all --no-check tests/resend-webhook-idempotency-test.ts` | ❌ Wave 0 |
| ANALYTICS-02 | `get_deliverability_stats` rejects non-admin | Vitest RLS | `pnpm test:integration -- tests/integration/rls/deliverability-rpc.test.ts` | ❌ Wave 0 |
| ANALYTICS-02 | `get_deliverability_stats` returns per-template stats for admin | Vitest RLS (if admin creds) / manual | Same as above with `E2E_ADMIN_EMAIL` set | ❌ Wave 0 |
| ANALYTICS-03 | Insert into users/properties/tenant_invitations/rent_payments fires trigger | Vitest integration (RLS path) | Owner mutation tests assert new funnel row exists afterward | ❌ Wave 0 |
| ANALYTICS-03 | Backfill migration is idempotent (run migration twice, same row count) | SQL migration unit-check | `pnpm db:reset` equivalent plus assertion | Manual |
| ANALYTICS-04 | `get_funnel_stats` rejects non-admin | Vitest RLS | `pnpm test:integration -- tests/integration/rls/funnel-rpc.test.ts` | ❌ Wave 0 |
| ANALYTICS-04 | `get_funnel_stats` returns correct step counts / medians for admin | Vitest RLS (if admin creds) | Same | ❌ Wave 0 |
| ANALYTICS-05 | Admin analytics page renders without error | Vitest component | `pnpm test:component -- src/app/\(admin\)/analytics/` | ❌ Wave 0 |
| ANALYTICS-05 | Non-admin request to `/admin/analytics` redirects to `/dashboard` | Proxy middleware unit test | `pnpm test:unit -- proxy.test.ts` (extend existing) | ❌ Wave 0 |
| All | `pnpm typecheck && pnpm lint && pnpm test:unit` zero errors | Standard | `pnpm validate:quick` | ✓ existing |

### Sampling Rate

- **Per task commit:** `pnpm test:unit` (runs <10s) + typecheck + lint via lefthook pre-commit
- **Per wave merge:** `pnpm test:unit` + `pnpm test:integration` (requires env vars)
- **Phase gate:** Full suite green (`pnpm validate:quick` + `pnpm test:integration`) + manual smoke on deployed Edge Function + confirm admin route redirects for non-admin in a real browser

### Wave 0 Gaps

- [ ] Create `tests/integration/rls/deliverability-rpc.test.ts` — admin RPC rejection test
- [ ] Create `tests/integration/rls/funnel-rpc.test.ts` — admin RPC rejection test
- [ ] Create `tests/integration/rls/email-deliverability-rls.test.ts` — table RLS test
- [ ] Create `supabase/functions/tests/resend-webhook-signature-test.ts`
- [ ] Create `supabase/functions/tests/resend-webhook-delivered-test.ts`
- [ ] Create `supabase/functions/tests/resend-webhook-idempotency-test.ts`
- [ ] Create admin test user in the test Supabase project (`user_type = 'ADMIN'`)
- [ ] Add `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` to test env secrets and `tests/integration/setup/supabase-client.ts` `getAdminTestCredentials()` helper
- [ ] Create/update `proxy.test.ts` if it doesn't exist — cover the new `/admin` block
- [ ] Create `RESEND_WEBHOOK_SECRET` secret in Resend dashboard + Supabase Edge Function secrets

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Edge Function authenticated via Svix signature; admin RPCs authenticated via JWT (Bearer → `auth.uid()` → `is_admin()`) |
| V3 Session Management | yes | Admin pages use Supabase SSR session via `createServerClient()` + `getAll`/`setAll` cookie pattern (CLAUDE.md: "Supabase Auth"). `getUser()` on every request — never `getSession()` for security decisions |
| V4 Access Control | yes | Three-layer: proxy middleware `/admin` gate + server-component layout `is_admin()` + RPC-level `is_admin()` guard + RLS policy on `email_deliverability` and `onboarding_funnel_events` |
| V5 Input Validation | yes | Webhook payload narrowed via runtime type guards (no `any`); event_type validated against `CHECK` constraint; template_tag extracted defensively (see Pitfall 1); `message_id` regex-validated if used in URLs |
| V6 Cryptography | yes | HMAC-SHA256 via Web Crypto API `crypto.subtle`; constant-time comparison via XOR loop (no hand-rolled crypto — standard algorithm only) |

### Known Threat Patterns for {Resend webhook + admin analytics}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook signature forgery | Spoofing | Svix HMAC verification; reject on missing or invalid signature (401) |
| Timestamp replay | Tampering | 5-minute timestamp tolerance on Svix; events older than tolerance rejected |
| Duplicate delivery (same event replayed) | Tampering / DoS | `(message_id, event_type)` UNIQUE constraint + `on conflict do nothing` — writes idempotent by design |
| Command injection via message_id / recipient in SQL | Tampering | Parameterized queries via supabase-js (never string-concat SQL); event_type validated against CHECK constraint before insert |
| PII leakage (recipient emails) in error responses | Information Disclosure | `errorResponse()` returns generic `{ error: 'An error occurred' }`; full detail only to Sentry + logs |
| Admin data leak via direct RPC call | Information Disclosure | `is_admin()` guard inside RPC + RLS on source tables; middleware gate is defense-in-depth not primary |
| Signed-URL leakage of webhook endpoint | Spoofing | Endpoint is public by design (webhooks are public); signature verification is the auth mechanism |
| Tag injection in `template_tag` (attacker-controlled Resend tag) | Tampering | `template_tag` stored as text only; used only in SELECT aggregation WHERE equals — no string interpolation into dynamic SQL |
| Bypass admin UI via bookmarked URL | Spoofing | Middleware `/admin` gate runs before layout; layout still re-checks; defense-in-depth |
| Backfill migration run against production accidentally (data divergence) | Tampering | Migration is idempotent (`on conflict do nothing`); re-run is safe |

## Open Questions (for /gsd-discuss-phase)

1. **Retention + archive for `email_deliverability`: 90 days matching `security_events`, or longer for compliance?**
   - What we know: `security_events`, `user_errors`, `stripe_webhook_events` (succeeded) all at 90 days. `stripe_webhook_events` (failed) at 180 days.
   - What's unclear: Deliverability data may have longer retention value for anti-abuse (identifying domain reputation trends). 180 days matches failed-webhook retention.
   - Recommendation: 90 days for v1, archive-then-delete, cleanup at 3 AM UTC (45 min slot — existing slots taken at :00, :15, :30, :45 for other cleanups; use :00 on hour 4, i.e., `0 4 * * *`, or extend window). Revisit if anti-abuse workflow needs longer window.

2. **Cohort semantics for `get_funnel_stats`: signup cohort or event-window?**
   - What we know: Both are valid; each gives different answers.
   - What's unclear: Team's mental model when reading the admin dashboard.
   - Recommendation: Signup cohort (owners who signed up in window, track to present day), because it answers "for March signups, what % converted to rent-collected." Label the page "For owners who signed up in {p_from} – {p_to}, here's how their funnel progressed."

3. **Rolling window default for deliverability stats: 30 days or configurable by admin via URL param?**
   - What we know: `get_payout_timing_stats` uses hardcoded 30 days.
   - What's unclear: Whether admin wants a date picker on the page.
   - Recommendation: 30-day default, accept `p_days` parameter (1..365), no UI picker for v1. Can add as follow-up once usage patterns emerge.

4. **Resend event timestamp: top-level `created_at` or event-specific nested timestamp (e.g., `data.bounced_at`)?**
   - What we know: Top-level `created_at` is the event-created timestamp. Event-specific nested timestamps exist for some events (bounce.timestamp, click.timestamp per the turso article).
   - What's unclear: Which is authoritative when both are present.
   - Recommendation: Use top-level `created_at` for `event_at` column. Store entire `data.*` in `raw_payload jsonb` so event-specific timestamps are queryable if later needed. Document choice in the column comment.

5. **Admin UI URL path: `/admin/analytics` (new route group) or extend `/dashboard/admin/*`?**
   - What we know: No admin routes exist. `(admin)` route group lets us put admin pages without user-type leak in URL.
   - What's unclear: Whether admin = owner-admin (owner with ADMIN role who still has owner dashboard) or admin = platform-admin (different navigation entirely).
   - Recommendation: `/admin/analytics` in new `(admin)` route group. Clear separation. Admin user still navigates to `/dashboard` for their owner-facing view; `/admin/analytics` is pure platform analytics.

6. **Admin test account for RLS tests: create a dedicated test-env admin, or mark the "admin gets data" branch as manual-only?**
   - What we know: `tests/integration/setup/supabase-client.ts` has `getTestCredentials()` for ownerA/ownerB, `getTenantTestCredentials()` for tenantA. No admin helper exists.
   - What's unclear: Whether the test Supabase project policy allows creating an admin user without human intervention.
   - Recommendation: Add `getAdminTestCredentials()` helper that returns null if env vars missing; add the tests with `describe.skipIf(!adminCreds)` pattern used by tenant tests. Document Wave 0 step to create the admin account.

7. **Tag extraction priority: `category` first, then fall back to `type`, or first-available?**
   - What we know: All existing `sendEmail()` calls include `{name: 'category', value: '...'}`. Some also include `{name: 'type', value: '...'}`.
   - What's unclear: Whether a template sending as both `category = 'auth'` + `type = 'signup'` should be tagged as `'auth'` or `'signup'`.
   - Recommendation: Prefer `category` (higher-level classification; 'auth' groups signup + recovery + magic_link — more useful for admin to spot systemic auth-email issues). Fall back to `type` if missing. Document in RPC comment.

8. **Should `first_tenant_invited` include owners who created `tenants` rows directly (pre-v1.3) or only those who used `tenant_invitations`?**
   - What we know: Pre-v1.3 owners may have `tenants` rows without `tenant_invitations` (Pitfall 4).
   - What's unclear: Whether to retroactively classify those as "invited."
   - Recommendation: Backfill from both tables (union). Rationale: funnel analytics is retrospective; a March 2025 owner who added a tenant via the old flow still completed the intent of "first tenant invited." Modern inserts use `tenant_invitations` trigger; legacy inserts come via backfill.

## Implementation Sketch

Translating the above research into a concrete task structure (for the planner to refine):

### Wave 0 — Test + infrastructure preparation
- Create `RESEND_WEBHOOK_SECRET` in Resend dashboard + Supabase secrets
- Create admin test account + env vars
- Create empty test files per "Wave 0 Gaps" list

### Wave 1 — DB foundation (migrations)
- **Migration 1** (`20260415120000_email_deliverability_schema.sql`): create table, unique index, RLS policies, admin-select policy
- **Migration 2** (`20260415121000_onboarding_funnel_events_schema.sql`): create table, indexes, RLS, 4 trigger functions + 5 triggers (signup INSERT + UPDATE, property INSERT, invitation INSERT, rent_payments INSERT + UPDATE OF status)
- **Migration 3** (`20260415122000_analytics_rpcs.sql`): `get_deliverability_stats(p_days)`, `get_funnel_stats(p_from, p_to)` — both SECURITY DEFINER + is_admin() guard
- **Migration 4** (`20260415123000_onboarding_funnel_backfill.sql`): 4 idempotent INSERT ... ON CONFLICT DO NOTHING statements, one per step
- **Migration 5** (`20260415124000_email_deliverability_retention.sql`): archive table mirror, cleanup function, pg_cron schedule (1 AM or 4 AM UTC)

### Wave 2 — Edge Function
- `supabase/functions/resend-webhook/index.ts` — Svix verification + JSON parse + extract tag + insert
- Deploy: `supabase functions deploy resend-webhook`
- Configure webhook in Resend dashboard pointing to deployed URL, select 5 event types
- Smoke test: send a test email via existing sender, verify event lands in `email_deliverability`

### Wave 3 — Admin UI
- `proxy.ts` modify: add `/admin` gate
- `src/app/(admin)/layout.tsx` — server-component `is_admin()` check
- `src/app/(admin)/analytics/page.tsx` — server component fetches both RPCs
- `src/app/(admin)/analytics/deliverability-table.tsx` — client, Tailwind table
- `src/app/(admin)/analytics/funnel-chart.tsx` — client, `FunnelChart`
- `src/hooks/api/query-keys/deliverability-keys.ts` + `funnel-keys.ts` — `queryOptions()` factories
- `src/types/admin-analytics.ts` — typed shapes

### Wave 4 — Tests
- `tests/integration/rls/deliverability-rpc.test.ts` — non-admin rejected
- `tests/integration/rls/funnel-rpc.test.ts` — non-admin rejected
- `tests/integration/rls/email-deliverability-rls.test.ts` — table admin-select
- `supabase/functions/tests/resend-webhook-*` — 3 Deno tests
- Unit tests for admin page components (light — the heavy lifting is in the RPC)

### Wave 5 — Verification
- `pnpm validate:quick` green
- `pnpm test:integration` green
- Deno tests green (`cd supabase/functions && deno test --allow-all --no-check tests/resend-webhook-*`)
- Manual smoke: navigate `/admin/analytics` as non-admin → redirect; as admin → page renders with data

## Risk / Pitfall Summary (quick reference for planner)

1. **Tags shape unknown** (Pitfall 1) — plan defensively, deploy-log-dump before finalizing.
2. **Message_id not unique alone** (Pitfall 2) — use composite unique.
3. **Trigger deadlock possibility** (Pitfall 3) — low but real; keep triggers read-light.
4. **Legacy `tenants` without `tenant_invitations`** (Pitfall 4) — backfill union.
5. **Cohort semantics ambiguity** (Pitfall 5) — pick one, document.
6. **Direct RPC bypass of middleware** (Pitfall 6) — RPC-level `is_admin()` guard is primary.
7. **Timestamp confusion** (Pitfall 7) — top-level `created_at` for `event_at`.
8. **Body read once** (Pitfall 8) — `req.text()` first, then parse.
9. **Admin test account missing** (A12, Wave 0) — create as Wave 0 step.
10. **Webhook secret missing** (Environment Availability) — hard blocker; Wave 0 step.

## Sources

### Primary (HIGH confidence)

- Project codebase:
  - `/Users/richard/Developer/tenant-flow/CLAUDE.md` — all conventions
  - `/Users/richard/Developer/tenant-flow/.planning/ROADMAP.md:148-161` — phase definition
  - `/Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md:42-49` — ANALYTICS-01..05
  - `/Users/richard/Developer/tenant-flow/supabase/functions/docuseal-webhook/index.ts` — HMAC webhook pattern
  - `/Users/richard/Developer/tenant-flow/supabase/functions/auth-email-send/index.ts` — Resend sender + tag convention
  - `/Users/richard/Developer/tenant-flow/supabase/functions/_shared/resend.ts` — `sendEmail()` helper (tags supported)
  - `/Users/richard/Developer/tenant-flow/supabase/migrations/20260413120000_launch_readiness_instrumentation.sql` — `get_payout_timing_stats()` admin RPC template
  - `/Users/richard/Developer/tenant-flow/supabase/migrations/20251230220000_fix_jwt_claims_path.sql:77-91` — `is_admin()` definition
  - `/Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` — archive-then-delete pattern
  - `/Users/richard/Developer/tenant-flow/supabase/migrations/20260221130000_create_stripe_webhook_events.sql` — idempotency table pattern
  - `/Users/richard/Developer/tenant-flow/supabase/migrations/20260304170000_onboarding_backfill.sql` — idempotent backfill pattern
  - `/Users/richard/Developer/tenant-flow/tests/integration/rls/error-monitoring.test.ts` — admin RPC rejection test pattern
  - `/Users/richard/Developer/tenant-flow/proxy.ts` — route protection patterns
  - `/Users/richard/Developer/tenant-flow/package.json:169` — recharts 3.7.0 pinned
  - `/Users/richard/Developer/tenant-flow/.planning/phases/43-post-deploy-sentry-regression-gate/43-RESEARCH.md` — format precedent

### Secondary (MEDIUM confidence — verified via docs)

- [Resend Webhooks Introduction](https://resend.com/docs/dashboard/webhooks/introduction) — event types confirmed
- [Resend Verify Webhook Requests](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests) — Svix verification + headers
- [Svix Manual Verification](https://docs.svix.com/receiving/verifying-payloads/how-manual) — exact algorithm: `${id}.${timestamp}.${body}`, HMAC-SHA256, base64 signature, 5-minute tolerance
- [Svix Receiving Webhooks with TypeScript](https://www.svix.com/guides/receiving/receive-webhooks-with-typescript/) — client-side pattern
- [Recharts FunnelChart API](https://recharts.github.io/en-US/api/FunnelChart/) — 3.x API confirmed; props verified
- [Turso: Save Resend Email Events](https://turso.tech/blog/save-resend-email-events-to-your-turso-database) — payload shape example
- [Resend API Emails Send](https://resend.com/docs/api-reference/emails/send-email) — tags parameter format (array of {name, value}, 256-char max)

### Tertiary (LOW confidence — flagged for verification on first deployment)

- Resend webhook payload exact shape for each of the 5 event types — docs list events but not field-level schemas per event; verify via log-dump on first event. See Pitfall 1 + Assumption A3/A4.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries pinned in codebase, verified versions, API stability confirmed for recharts + Svix
- Architecture (Edge Function + RPCs + triggers): HIGH — direct template from existing successful patterns
- Pitfalls (especially tags shape, cohort semantics): MEDIUM — some are speculative; defensive code handles uncertainty
- Admin UI gate: HIGH — proxy + layout + RPC three-layer approach is the project's standard
- Resend event payload field names: MEDIUM — docs confirm `data.email_id` and tags, do not exhaustively document every event's nested fields

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days — Resend webhooks and Svix format are stable; only real churn risk is Resend adding event types)
