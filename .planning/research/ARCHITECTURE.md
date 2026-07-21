# Architecture Research

**Domain:** v10.0 feature integration into a mature Next.js 16 + Supabase landlord-SaaS
**Researched:** 2026-07-19
**Confidence:** HIGH (architecture verified against the live codebase; Next.js 16 idioms verified against current official docs via Context7)

> Scope: how each of the 13 v10.0 features plugs into the EXISTING architecture. Existing patterns are treated as fixed (per the milestone brief) and are only named as mirror targets — never re-derived. Every recommendation names the concrete file/function to copy.

---

## Standard Architecture (existing — the rails every new feature rides)

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                                   │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────────────┐    │
│  │ Server Comp. │  │ Client Comp.      │  │ Public token page        │    │
│  │ (page.tsx    │  │ ('use client' —   │  │ /sign/[token] (SSR,      │    │
│  │  async fetch)│  │  TanStack Query)  │  │  force-dynamic, no auth) │    │
│  └──────┬───────┘  └─────────┬─────────┘  └────────────┬─────────────┘    │
├─────────┼────────────────────┼─────────────────────────┼──────────────────┤
│  EDGE / MIDDLEWARE          proxy.ts (session refresh + sub gate + CSP)    │
├─────────┼────────────────────┼─────────────────────────┼──────────────────┤
│         │  PostgREST + RPCs  │  (typed boundary mappers)│  Edge Functions  │
│         ▼                    ▼                          ▼  (Deno + _shared)│
│  ┌───────────────────────────────────────────────┐  ┌───────────────────┐ │
│  │  SUPABASE POSTGRES  (RLS on every table)       │  │ lease-signature   │ │
│  │  owner_user_id scoping · CHECK-constraint enums │  │ sign-lease-token  │ │
│  │  SECURITY DEFINER RPCs · get_current_owner_...  │  │ export-report ... │ │
│  └───────────────────────────────────────────────┘  └─────────┬─────────┘ │
│         ▲                    ▲                                 │           │
│  pg_cron (3AM window) ─► queue tables ─► pg_net ─► [n8n hop]   ▼  Resend   │
│  (named SECURITY DEFINER fns, Sentry check-ins)              Stripe FDW    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (existing, load-bearing for v10.0)

| Component | Responsibility | Mirror target file |
|-----------|----------------|--------------------|
| Server-Component page | Initial async data fetch, `force-dynamic` when reading live/credential state | `src/app/sign/[token]/page.tsx` |
| Query-key factory | `queryOptions()` + typed row mapper at PostgREST boundary | `src/hooks/api/query-keys/report-keys.ts`, `document-keys.ts` (`mapDocumentRow`) |
| Tier gate | 402 + `gate_events` analytics row + upgrade URL | `supabase/functions/_shared/tier-gate.ts` (`checkTierEntitlement`) |
| Paywall client handling | Detect 402 → `PaywallError` → upgrade CTA | `report-keys.ts` (`PaywallError`, `parsePaywallResponse`) |
| Public token edge fn | `verify_jwt=false`, SHA-256 token hash, dual-layer rate limit, SECURITY DEFINER RPC lookup | `supabase/functions/sign-lease-token/index.ts` |
| Authed edge fn | `validateBearerAuth`, per-owner rate limit, Resend, rollback-on-failure | `supabase/functions/lease-signature/index.ts` |
| Reminder queue | dedup table + `UNIQUE(entity, type)` + `ON CONFLICT DO NOTHING` + pg_net trigger | `lease_reminders`, `notify_n8n_lease_reminder()` |
| pg_cron job | named SECURITY DEFINER fn, `SET search_path`, Sentry cron check-in | `queue_payment_reminders()` in `20260224091106_payment_reminders_cron.sql` |
| App shell | client (`'use client'`) shell with header Bell + sidebar | `src/components/shell/app-shell.tsx`, `app-shell-header.tsx` |
| Route redirects | build-time filtered `async redirects()` in config | `next.config.ts` `redirects()` + `src/lib/seo/blog-redirects.ts` |

---

## Next.js 16 idioms verified against current docs (Context7 `/vercel/next.js`)

| Idiom | Verified guidance | v10.0 application |
|-------|-------------------|-------------------|
| **Path consolidation redirects** | `async redirects()` in `next.config.ts`, `permanent: true` → 308 (cached), wildcards via `:slug`. This is the canonical server-side redirect for moving routes. | Reporting-hub old→new paths go in the existing `next.config.ts` `redirects()` block (same array as the blog/legal aliases). NOT `proxy.ts` — proxy is for auth/CSP, not SEO redirects. |
| **Server Component data fetch** | `async` component + `cookies()`/`await` from `next/headers`; reading cookies opts the route into dynamic rendering automatically. | Every new list/detail page fetches server-side first (mirror `sign/[token]/page.tsx`), hydrates a client island only where interaction is needed. |
| **`force-dynamic`** | Still valid on stable Next 16 for always-fresh/credential-sensitive pages (Cache Components' obviation of it is a canary opt-in TenantFlow has NOT adopted). | Public intake page `/apply/[token]` uses `export const dynamic = "force-dynamic"` exactly like `sign/[token]`. |
| **`connection()`** | `import { connection } from 'next/server'; await connection()` forces dynamic render so client search-param islands render server-side. | Reporting hub's nuqs date-range surface if it needs SSR-consistent search params. |
| **Polling vs subscription** | Next has no opinion; data-freshness is a client/data-layer concern. TanStack Query `refetchInterval` is the app's existing idiom (global `refetchOnWindowFocus: true`). | Notification unread-count uses TanStack Query polling, NOT a bespoke Realtime channel (see feature 1). |

---

## Per-Feature Integration (the core deliverable)

Legend — **NEW** = create; **MOD** = modify existing; each row names the mirror target.

### 1. In-app notification center

**Verdict on the emphasis question:** **Poll with TanStack Query `refetchInterval`, not Supabase Realtime.** Rationale: (a) the app shell (`app-shell.tsx`) is already a client component driving `useSupabaseUser`, so a polling badge is a drop-in; (b) the global query config already assumes `refetchOnWindowFocus: true`, so a 60s `refetchInterval` on a single lightweight `HEAD`/count query is consistent and free of a new Realtime connection to manage, RLS-on-Realtime config, and reconnect/backoff edge cases; (c) notifications here are low-urgency (lease/maintenance/application events), not chat — sub-minute latency is not a requirement. Realtime is a documented future upgrade if unread latency ever matters, but it is over-engineering for v10.0.

**Badge placement:** the unread-count badge lives in the **client** `AppShellHeader` Bell, NOT the server shell. `owner-dashboard-layout.tsx` (server) renders `<AppShell>` (client) which renders `AppShellHeader` (client) — the badge is a new client child of the existing header. Do NOT try to server-render the count into the layout: the layout is `async` but the count must refresh, so it belongs in the client polling island. Change the Bell from a `<Link href="/settings?tab=notifications">` into a dropdown/inbox trigger.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `notifications`, `notification_logs` tables | MOD | Already exist (base schema L1433/L1415), unused by frontend. Add owner-scoped SELECT/UPDATE RLS policies (they are queue-only today). | RLS shape of `lease_reminders` owner-select policy |
| `notification-keys.ts` factory | NEW | `queryOptions()` for `unreadCount` (count-exact HEAD) + `list` (paginated), `refetchInterval: 60_000` on the count. | `report-keys.ts`, `owner-notification-settings-keys.ts` |
| `use-notification-mutations.ts` | NEW | `markRead`, `markAllRead` → PostgREST update; invalidate `notificationKeys` + `ownerDashboardKeys.all`. | `use-lease-mutations.ts` invalidation pattern |
| `NotificationBell` client comp | NEW | Badge + dropdown inbox; child of `AppShellHeader`. | `GlobalSyncIndicator` (already in header) |
| `AppShellHeader` | MOD | Replace Bell `<Link>` with `<NotificationBell>`. | — |
| Notification write path (RPC) | NEW | `create_notification(user_id, type, title, message, entity, action_url)` SECURITY DEFINER — the single insert point every feature calls (renewal reminders, applications, sign events already write via `sign_lease_with_token`). | `sign_lease_with_token`'s atomic in-app notification insert |

**Data flow:** feature event → SECURITY DEFINER RPC `create_notification` inserts row → owner's browser poll (60s) picks up new `is_read=false` count → badge increments → open inbox → `markRead` mutation.

---

### 2. Dashboard activity feed

Smallest Track-B item; the `activity` table (base schema L1239) + `get_user_dashboard_activities` RPC already exist.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `activity` table | MOD | Add owner SELECT RLS if absent. | `lease_reminders` RLS |
| `activity-keys.ts` | NEW | `queryOptions()` calling `get_user_dashboard_activities` RPC via typed mapper. | `report-keys.ts` `runs()` |
| Activity feed panel (server comp) | NEW | Server-render initial page on `/dashboard`, client "load more". | dashboard KPI tiles pattern |
| Write path | MOD | Reuse the `create_notification` companion — emit an `activity` row from the same feature RPCs. | — |

**Note:** Notification (1) and Activity (2) are near-duplicates in write-path. Build (1) first; (2) reuses its RPC insert helper. They differ in read surface only (bell inbox vs. dashboard timeline).

---

### 3. Reporting-hub consolidation

Merge three surfaces — `/financials/*` (income-statement, expenses, cash-flow, balance-sheet, tax-documents), `/analytics/*` (financial, occupancy, leases, maintenance, property-performance, overview), `/reports/*` (year-end, generate, analytics) — into one `/reports` hub.

**Route architecture:** Pick `/reports` as the canonical hub root (it already owns the export/generate edge-function plumbing via `report-keys.ts` → `export-report`/`generate-pdf`). Re-home the financial statement pages and analytics pages as subroutes of `/reports`, then 308-redirect the old paths.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `/reports` hub landing | NEW/MOD | Card grid linking to statements, analytics, exports. | existing `reports/generate/components/report-card-grid.tsx` |
| Old→new redirects | MOD | Add pairs to the existing `async redirects()` array in `next.config.ts`, `permanent: true`. e.g. `/financials/income-statement`→`/reports/income-statement`, `/analytics/financial`→`/reports/financial`. | `next.config.ts` legal/blog aliases + `blog-redirects.ts` |
| Moved page trees | MOD | Move `financials/*` + `analytics/*` page/layout files under `reports/`; keep the per-page `layout.tsx`/`loading.tsx`/`error.tsx` triplet convention. | existing `financials/*` file triplets |
| Query keys | MOD | `financial-keys.ts`, `analytics-keys.ts`, `report-analytics-keys.ts`, `report-keys.ts` stay — only import paths of consuming pages change. No key renames (avoids cache-key churn). | — |
| Sidebar nav | MOD | Collapse three nav entries to one "Reports" section in `app-shell.tsx` nav array. | `app-shell.tsx` nav config |

**Anti-pattern to avoid:** do NOT redirect via `proxy.ts` — SEO/permanent redirects belong in `next.config.ts` (verified canonical). `proxy.ts` stays auth/CSP-only. **Do NOT** delete the old route folders without the redirect (external links/sitemap reference `/financials/*`; the milestone's backward-compat constraint applies).

**Dependency:** the hub *displays best* once the rent ledger (feature 4) supplies revenue actuals, but the consolidation + redirects can ship independently against existing data. Sequence redirects early, ledger-fed widgets later.

---

### 4. Rent ledger (record-keeping only)

**Schema-shape verdict:** **Two tables — `rent_charges` (expected) + `rent_receipts` (actuals) — NOT one ledger table, and do NOT reuse `rent_payments`.** Rationale: (a) `rent_payments` is the DEMOLISHED Stripe-facilitation table (`stripe_payment_intent_id NOT NULL`, `application_fee_amount NOT NULL`, integer-cents) — reusing it re-imports facilitation semantics the positioning forbids; (b) charges and receipts have different lifecycles (charges are system-generated/immutable expectations; receipts are owner-entered actuals), different cardinality (one charge → zero-or-many partial receipts), and different mutation rules — one table would need nullable-everything and a discriminator, which muddies late-flag logic and RLS. Two tables keep "expected vs received" a clean join.

**Charge generation verdict:** **pg_cron generation from lease terms into `rent_charges`, NOT on-read derivation.** Rationale: on-read derivation cannot represent "this month's charge was manually adjusted / waived / prorated," cannot be marked-received against a stable row id, and re-computes every render. A monthly pg_cron job that materializes the next period's charge per active lease (idempotent via `UNIQUE(lease_id, period_start)` + `ON CONFLICT DO NOTHING`) mirrors exactly the `queue_payment_reminders()` pattern and gives every charge a durable id to attach receipts and late flags to.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `rent_charges` table | NEW | `owner_user_id`, `lease_id`, `period_start`, `amount numeric(10,2)` (dollars per CLAUDE.md), `due_date`, `status ('expected'/'partial'/'received'/'waived'/'late')`, `UNIQUE(lease_id, period_start)`. RLS owner-scoped. | `payment_reminders` table + RLS |
| `rent_receipts` table | NEW | `owner_user_id`, `charge_id` FK, `amount numeric(10,2)`, `received_date`, `method text CHECK`, `note`. Owner insert/update RLS. | `expenses` table shape |
| `generate_rent_charges()` cron fn | NEW | SECURITY DEFINER, `SET search_path=public`, `FOR UPDATE SKIP LOCKED`, Sentry check-in; inserts next-period charges for active leases. 3AM window. | `queue_payment_reminders()` |
| `mark_late_charges()` | NEW | Flip `expected`→`late` past `due_date + grace_period_days`. Same cron file. | same |
| `rent-ledger-keys.ts` | NEW | `queryOptions()` per-lease ledger + per-tenant balance (charges − receipts). Typed mapper. | `report-keys.ts` |
| `use-rent-ledger-mutations.ts` | NEW | `recordReceipt`, `waiveCharge`; invalidate ledger keys + `ownerDashboardKeys.all` + financial keys. | `use-expense-mutations.ts` |
| Revenue analytics RPCs | MOD | `get_revenue_trends_optimized`, `get_dashboard_data_v2`, `fetchRevenueWithExpenses` currently derive revenue from... (verify source). Point them at `SUM(rent_receipts.amount)` for actuals. This is where the ledger "feeds existing revenue analytics." | `analytics-keys.ts` `fetchRevenueWithExpenses` |

**Positioning guard:** no Stripe, no payment intents, no `payment_methods`. Receipts are owner-logged actuals only. Keep `amount` in **dollars `numeric(10,2)`** (CLAUDE.md) — do NOT copy `rent_payments`' integer-cents.

**Feeds:** `rent_receipts` sums become the "actual revenue" series in the reporting hub (feature 3) and the dashboard revenue KPI — replacing/augmenting whatever placeholder the demolished facilitation left (`collection_rate` was already dropped as fabricated per v2.0 decision).

---

### 5. E-sign monthly metering

**Counter-location verdict:** **Dedicated append-only `esign_events` ledger table + atomic count inside a SECURITY DEFINER RPC — NOT a count-on-send query, NOT a mutable counter column.** Rationale: (a) count-on-send (`SELECT count(*) FROM leases WHERE sent_this_month`) is racy — two concurrent `send` calls both read N<limit and both proceed; (b) a mutable `users.esign_used_this_month` column needs a monthly reset cron and is lost on plan change; (c) an append-only event row per successful send is auditable, self-describing (which lease, when), and lets the check be a single `INSERT ... WHERE (SELECT count(*) ...) < limit` guarded atomically.

**Race-safety:** perform the count-and-insert in ONE SECURITY DEFINER RPC (`consume_esign_credit(user_id)`) that takes a per-user advisory lock (`pg_advisory_xact_lock(hashtext(user_id))`) or relies on `SERIALIZABLE`, so concurrent sends serialize. Return `{allowed, used, limit}`.

**Enforcement point:** inside `lease-signature/index.ts`'s `send` action, AFTER the existing `checkTierEntitlement` (which proves Growth/Max) and BEFORE issuing the token. Growth = 25/mo cap → 402; Max = unlimited (`-1`) → skip. This makes Max's "unlimited" real and Growth's cap enforced.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `esign_events` table | NEW | `user_id`, `lease_id`, `created_at`. Index `(user_id, created_at)`. service_role-only writes. | `gate_events` table (tier-gate.ts) |
| `consume_esign_credit()` RPC | NEW | Atomic count-in-current-month + insert; returns cap status. Reads limit from `get_user_plan_limits`. | `enforce_plan_limit`, `get_user_plan_limits` |
| `lease-signature` `send` | MOD | Call `consume_esign_credit` after tier gate; on cap return the same 402 upgrade-shape body. | existing `checkTierEntitlement` call site |
| Client paywall | MOD | `use-lease-signature-mutations.ts` already surfaces 402 → extend the `PaywallError` copy to "monthly e-sign limit reached." | `report-keys.ts` `PaywallError` |
| Usage meter UI | NEW | Settings/billing "X of 25 e-signs this month" from a `esign-usage-keys.ts` count query. | storage-meter (feature 6) — build together |

---

### 6. Storage usage metering + quota enforcement

**Computation verdict:** **Sum `storage.objects.metadata->>'size'` via a SECURITY DEFINER RPC keyed on the owner's path prefix — NOT the Storage list API, NOT a hand-tracked column (as the primary source of truth).** Rationale: (a) the Storage JS `list()` API paginates and is O(files) round-trips — unusable for a live meter across `documents`/`lease-documents`/`inspection-photos`/`property-images`/`avatars`/maintenance photos; (b) a tracked `users.storage_bytes` column drifts on any out-of-band delete/cron cleanup and needs perfect increment/decrement discipline at every upload/delete site; (c) `storage.objects` is a real Postgres table — `SELECT COALESCE(SUM((metadata->>'size')::bigint),0)` filtered by `owner` (via the `owner` column or the path-prefix convention) is one indexed query and always exact.

**Optional optimization:** cache the computed total in a `storage_usage` row refreshed by a nightly pg_cron recompute (mirrors the retention-cleanup crons) so the live meter reads a cheap cached row and the upload check uses the exact RPC. Cache is a read accelerator, RPC is truth.

**Enforcement point:** at upload. TenantFlow uploads run **client-side** through PostgREST/Storage (`use-supabase-upload.ts`, `document-keys.ts` upload-then-insert). A client can't be trusted to self-enforce, and Storage RLS can't easily express "sum < quota." So enforce in the **DB insert step** that already follows every upload: the document/photo insert RPC (or a `BEFORE INSERT` trigger on the metadata tables) calls the storage-sum RPC and rejects (errcode `23514`-style) when over quota. Soft-enforce = surface upgrade prompt; the milestone says "soft-enforce at upload with upgrade prompt."

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `get_owner_storage_bytes()` RPC | NEW | SUM over `storage.objects` for the owner; SECURITY DEFINER, `search_path` locked. | data-retention cleanup fns |
| `storage-usage-keys.ts` | NEW | `queryOptions()` → RPC; feeds Settings meter. | `owner-notification-settings-keys.ts` |
| Upload enforcement | MOD | Add quota check in the document-insert path (`document-keys.ts` upload mutation) — compare `get_owner_storage_bytes + file_size` vs `get_user_plan_limits.storage` (GB → bytes; `-1` = unlimited). Over → throw `PaywallError`. | `document-keys.ts` upload rollback block |
| Settings usage meter UI | NEW | "X GB of 10 GB" progress bar. Ship alongside e-sign meter. | pricing `checkPlanLimits` |

**Note:** `src/config/pricing.ts` already encodes `limits.storage` (1/10/50/`-1`). Reuse it; `get_user_plan_limits` is the DB source. No new limit config.

---

### 7. Renewal reminder delivery in-house

**Drain-mechanism verdict:** **A second pg_cron job invokes a NEW `send-lease-reminders` edge function that drains un-emailed `lease_reminders` rows and sends via Resend — NOT pg_net-direct-to-Resend, and DROP the dead n8n hop.** Rationale: (a) the existing `notify_n8n_lease_reminder()` pg_net trigger POSTs to a disabled n8n workflow (`wf-lease-reminder.json`) — the queue fills, email never sends (the confirmed claims gap); (b) pg_net can't render the branded email layout, escape HTML, or handle Resend's response/retry — that's what the edge `_shared/resend.ts` + `email-layout.ts` + `escape-html.ts` exist for; (c) an edge-function drain reuses `sendEmail`, Sentry error capture, and the exact PDF/email infra the lease-signature function already uses.

**Idempotency / never-double-send:** the `lease_reminders` table already guarantees ONE row per `(lease_id, reminder_type)` via `UNIQUE` + `ON CONFLICT DO NOTHING`. Add an **`emailed_at timestamptz`** column: the drain selects `WHERE emailed_at IS NULL FOR UPDATE SKIP LOCKED`, sends, then stamps `emailed_at`. Row-level lock + null-guard = a reminder is emailed exactly once even across overlapping cron runs. (This mirrors the "queue row is the dedup key" discipline already in the file's comments.)

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `lease_reminders.emailed_at` | NEW col | Drain claim/stamp column. | — |
| `notify_n8n_lease_reminder()` trigger | MOD/DROP | Remove the dead pg_net→n8n POST (or leave inert). Delivery moves to the drain. | — |
| `send-lease-reminders` edge fn | NEW | Drains `emailed_at IS NULL` rows, joins lease/tenant/owner, renders email, `sendEmail`, stamps `emailed_at`, writes `create_notification` (in-app). Also gates on Growth+ (renewal reminders are a Growth+ claim). | `lease-signature` (Resend + rollback) + `export-report` (auth/env) |
| pg_cron drain job | NEW | 3AM-window `cron.schedule` calling the edge fn via pg_net (`net.http_post` to the function URL with the service-role/webhook bearer) OR a SECURITY DEFINER fn that `perform net.http_post`. Sentry check-in. | `queue_payment_reminders()` cron + `notify_critical_error_http_delivery` pg_net-invoke pattern |

**Reuse for feature 10 (compliance dates):** compliance reminders ride the SAME queue-drain-Resend rails — add a `compliance_reminders` queue with identical `emailed_at`/`UNIQUE` shape and let the same edge fn (or a sibling) drain it.

---

### 8. Scheduled owner digest

**Verdict:** **pg_cron → NEW `send-owner-digest` edge function → per-owner batched Resend, reusing the reporting aggregation + optional PDF infra.** This is the renewal-reminder drain pattern (feature 7) applied to a monthly aggregate email.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `send-owner-digest` edge fn | NEW | Loop active owners (or claim from a `digest_queue`), aggregate month's rent-receipts/expenses/occupancy/expiring-leases via existing analytics RPCs, render email (optionally attach a PDF from `generate-pdf`), `sendEmail`. Per-owner batching = one email per owner per run; `Promise.allSettled` for partial-failure tolerance. | `send-lease-reminders` (7) + `export-report`/`generate-pdf` PDF path |
| `owner_digest_settings` | NEW (or reuse `notification_settings`) | Opt-in + cadence. Prefer extending `notification_settings` (already has channels) over a new table. | `notification_settings` |
| Monthly pg_cron | NEW | 1st-of-month 3AM window; Sentry check-in. | `queue_payment_reminders()` schedule |

**Dependency:** best after rent ledger (4) + reporting hub (3) so the digest's numbers are the real actuals; build last among the email features.

---

### 9. Digital rental application intake (public token)

**Verdict:** **Mirror `/sign/[token]` end-to-end. Public route `/apply/[token]`, a `verify_jwt=false` edge function `application-intake`, SHA-256-hashed tokens, and edge-function-mediated inserts via SECURITY DEFINER RPC — NOT anonymous RLS INSERT.**

**RLS-for-anonymous verdict:** do NOT grant `anon` an INSERT policy on an applications table. The `/sign` precedent proves the safe pattern: the anon browser never touches Postgres directly; it POSTs to a `verify_jwt=false` edge function that (a) rate-limits, (b) validates the token by hash lookup through a SECURITY DEFINER RPC, and (c) inserts using the service-role client. This keeps the applications table's RLS owner-only (no anon grants to reason about) while still accepting public submissions. This is exactly how `sign-lease-token`'s `sign` action records tenant data with no tenant account.

**Token pattern:** one durable per-vacant-unit application link (not single-use like signing — an application link stays open until the owner closes the unit). Store `application_links(token_hash, unit_id, owner_user_id, active, expires_at)`; the URL carries the raw high-entropy token, the DB stores only its SHA-256 (copy `sha256Hex` + `generateSigningToken` from `_shared/lease-signing.ts`).

**Spam/abuse controls (emphasis):**
1. Dual-layer `rateLimit()` exactly like `sign-lease-token` context (coarse per-IP 300/min + per-token bucket) — reuse `_shared/rate-limit.ts` (Upstash sliding window).
2. Honeypot hidden field + minimum-time-on-form check in the client, validated server-side.
3. Token validity gate (active + not expired) via the SECURITY DEFINER RPC before any insert — an invalid token returns a reason only (no unit/owner enumeration), mirroring `sign-lease-token`'s "return reason alone" guard.
4. Per-token submission cap (e.g., N applications/hour/token) to blunt a leaked-link flood.
5. `escapeHtml()` all applicant free-text before it appears in the owner's notification email.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `/apply/[token]/page.tsx` | NEW | SSR, `force-dynamic`, `robots: noindex`; fetch context via edge fn; render form or invalid-state card. | `sign/[token]/page.tsx` |
| `ApplicationForm` client comp | NEW | POSTs `{action:'submit', token, ...}` to edge fn; honeypot; success/invalid states. | `sign-lease-form.tsx` |
| `application-intake` edge fn | NEW | `verify_jwt=false`; actions `context`/`submit`; hashed-token lookup; service-role insert; rate-limit; notify owner (Resend + `create_notification`). | `sign-lease-token/index.ts` |
| `application_links` + `rental_applications` tables | NEW | Links table (token) + applications table (applicant records). RLS owner-only; NO anon policies. | `lease_signing_tokens` + owner-scoped tables |
| `get_application_context(token_hash)` + `submit_application(...)` RPCs | NEW | SECURITY DEFINER, `search_path` locked, validate token, return reason-only when invalid. | `get_lease_signing_context`, `sign_lease_with_token` |
| `proxy.ts` | MOD | `/apply` is public — it already falls through (not in `PRIVATE_ROUTE_PREFIXES`); confirm no gate. `/sign` is already public, same treatment. | `proxy.ts` public fall-through |
| Owner-side inbox + convert-to-tenant | NEW | `/applications` list (owner, authed) + "convert applicant → tenant record." No applicant accounts (positioning). | tenant create mutation |

---

### 10. State-aware notice library

Rides the **lease-template rails** (existing `documents/lease-template`, `template-definition-keys.ts`, `generate-pdf`/`lease-pdf.ts`).

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `notice_templates` seed | NEW | Per-state pay-or-quit/cure-or-quit/entry/non-renewal bodies as template definitions (text, not ENUM — CHECK on `notice_type`/`state`). | `document_categories` per-owner seed; `template-definition-keys.ts` |
| `notices` table | NEW | `owner_user_id`, `lease_id`, `notice_type`, `state`, `served_at`, `delivery_method`, `document_path`. Owner RLS. | `documents` + `lease_signing_tokens` |
| Notice PDF render | MOD | Extend `generate-pdf`/`_shared/lease-pdf.ts` renderer with notice layouts. | `lease-pdf.ts` |
| Delivery tracking | NEW | Log served/delivered; optional email via Resend + `create_notification`. | `notification_logs` |
| `notice-keys.ts` + mutations | NEW | Generate/serve/track. | `lease-mutation-options.ts` |

**Positioning guard:** notices are landlord→tenant records; no tenant login. State-awareness is a `state` CHECK column + template selection, not i18n (out of scope).

---

### 11. Compliance & key-date tracking

**Delivery:** reuse the renewal-reminder queue/drain rails (feature 7).

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `compliance_dates` table | NEW | `owner_user_id`, `property_id?`, `type ('insurance'/'license'/'tax'/'inspection')` CHECK, `due_date`, `notes`. Owner RLS. | `expenses`/`leases` owner-scoped |
| `compliance_reminders` queue | NEW | `UNIQUE(compliance_date_id, reminder_type)` + `emailed_at`; same shape as `lease_reminders`. | `lease_reminders` |
| `queue_compliance_reminders()` cron | NEW | Populate queue at thresholds; 3AM window; Sentry check-in. | `queue_payment_reminders()` |
| Drain | MOD | The `send-lease-reminders` edge fn (feature 7) drains this queue too (or a sibling fn). | feature 7 drain |
| `compliance-keys.ts` + mutations + UI | NEW | List/calendar + CRUD. | `report-keys.ts`, `use-expense-mutations.ts` |

**Dependency:** hard-depends on the reminder-drain infra from feature 7 — sequence after it.

---

### 12. Schedule E expense intelligence + receipt photos

Expands the existing `expenses` table (base schema L1269 — note `amount integer`, links to `maintenance_request_id`).

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `expenses` table | MOD | Add `schedule_e_line text CHECK` (the ~15 Schedule E categories), `receipt_path text`, and decouple from mandatory `maintenance_request_id` (make nullable so standalone expenses exist). Watch the `amount integer` vs dollars mismatch (MEMORY notes `expenses.amount` is integer in prod — reconcile per CLAUDE.md money rule). | `document_type` soft-FK + CHECK on `documents` |
| Receipt upload | NEW | Storage upload to a `receipts` bucket (or `documents`), then expense row update. Subject to storage quota (feature 6). | `use-supabase-upload.ts`, inspection-photo upload |
| Schedule E mapping | NEW | Category→line map (config, not ENUM). Feeds year-end/1099 exports. | `financials/tax-documents`, `export-report` PREMIUM types |
| `expense-keys.ts` | MOD | Add Schedule-E grouping query. | existing `expense-keys.ts` |

**Dependency:** receipt upload should land after storage metering (6) so uploads count against quota.

---

### 13. Unit turnover workflow

Orchestration layer chaining EXISTING subsystems: move-out inspection → maintenance → deposit worksheet → new lease. Highest coupling → build LAST.

| Element | New/Mod | Detail | Mirror |
|---------|---------|--------|--------|
| `unit_turnovers` table | NEW | `owner_user_id`, `unit_id`, `status` (state machine CHECK), links to `inspection_id`/`maintenance_request_id`/`deposit_worksheet`/`new_lease_id`. Owner RLS. | `inspections`↔`leases` relations |
| Turnover state RPCs | NEW | Advance-stage SECURITY DEFINER fns; write `activity` + `create_notification` at each transition. | inspection/lease lifecycle mutations |
| Deposit worksheet | NEW | Itemized deductions vs `leases.security_deposit`; dollars `numeric(10,2)`. | `expenses` shape |
| UI wizard | NEW | Multi-step; `useUnsavedChangesWarning` (CLAUDE.md forms rule). | lease wizard |

**Dependency:** touches inspections, maintenance, leases, ledger (deposit accounting), notifications, activity — sequence dead last.

---

## Data Flow (representative new flows)

**Renewal reminder (feature 7) — the reference async flow:**
```
pg_cron queue_lease_reminders() ──(3AM)──► INSERT lease_reminders (ON CONFLICT DO NOTHING)
                                                    │  emailed_at = NULL
pg_cron drain-job ──(3AM+5m)──► pg_net POST ──► send-lease-reminders (edge)
   SELECT ... WHERE emailed_at IS NULL FOR UPDATE SKIP LOCKED
        │
        ├─► sendEmail (Resend, _shared/resend.ts + email-layout.ts)
        ├─► create_notification RPC (in-app, feature 1)
        └─► UPDATE lease_reminders SET emailed_at = now()   ◄── exactly-once guard
```

**Public application intake (feature 9) — the reference public flow:**
```
Anon browser  ──POST {action:'submit', token, applicant...}──►  application-intake (verify_jwt=false)
   rateLimit (IP 300/min + token bucket) ─► sha256Hex(token) ─► get_application_context RPC (validity)
        │ invalid → { reason } only (no enumeration)
        │ valid   → submit_application RPC (service-role insert, owner-scoped row)
        └─► notify owner: sendEmail(escapeHtml(...)) + create_notification
```

**Rent ledger (feature 4) — the reference record-keeping flow:**
```
pg_cron generate_rent_charges() ─► INSERT rent_charges (UNIQUE lease_id,period_start)
Owner UI  ─► recordReceipt mutation ─► INSERT rent_receipts (charge_id)
        └─► invalidate rentLedgerKeys + financial-keys + ownerDashboardKeys.all
Reporting hub / dashboard revenue ─► SUM(rent_receipts.amount) via analytics RPC (actuals)
```

---

## Suggested Build Order (dependency-respecting)

| # | Feature | Why here | Blocks / depends on |
|---|---------|----------|---------------------|
| 1 | **Notification center** (1) | Provides the `create_notification` write-path every later feature calls; surfaces existing tables. | none |
| 2 | **Activity feed** (2) | Reuses notification write-path; tiny. | 1 |
| 3 | **Renewal reminder delivery** (7) | Claims-integrity P0; establishes the queue-drain-Resend rails reused by compliance + digest. | 1 (in-app writes) |
| 4 | **E-sign + storage metering** (5, 6) | Claims-integrity P0; share tier-gate/`get_user_plan_limits` + a settings usage-meter surface — build together. | none (tier-gate exists) |
| 5 | **Rent ledger** (4) | Foundational financial data; feeds reporting + digest actuals. | none |
| 6 | **Reporting-hub consolidation** (3) | Redirects can land anytime; ledger-fed widgets slot in after 5. | 5 (for actuals), redirects independent |
| 7 | **Rental application intake** (9) | Independent public-token feature; mirrors `/sign`. | 1 (owner notify) |
| 8 | **Tenant communication log** | Reuses Resend + notification + activity. | 1, 3 (email infra) |
| 9 | **Notice library** (10) | On lease-template + PDF rails. | none (uses existing PDF) |
| 10 | **Compliance tracking** (11) | Rides the reminder-drain rails. | 3 (drain infra) |
| 11 | **Schedule E + receipts** (12) | Receipt upload counts against quota. | 6 (storage metering) |
| 12 | **Owner digest** (8) | Numbers must be real actuals. | 3 (drain), 4 (ledger), 5→(reporting) |
| 13 | **Unit turnover** (13) | Orchestrates inspections/maintenance/leases/ledger/notifications. | most of the above |

**Claims-integrity track (1,3,4,5,6 partial) front-loaded** because those close the 4 confirmed marketing-vs-code gaps (renewal delivery, e-sign metering, storage enforcement) — the milestone's stated priority. Notification honesty (remove SMS toggle / ship-or-remove push) is a MOD to `notification_settings` + Settings UI, folded into feature 1's settings pass.

---

## Anti-Patterns (v10.0-specific)

**1. Reusing `rent_payments` for the rent ledger.** It's the demolished Stripe-facilitation table (`stripe_payment_intent_id NOT NULL`, integer-cents, `application_fee_amount`). Re-importing it re-imports facilitation semantics the positioning forbids and the wrong money unit. → New `rent_charges`/`rent_receipts` in dollars `numeric(10,2)`.

**2. Redirecting consolidated report routes in `proxy.ts`.** Proxy is auth/session/CSP. SEO/permanent redirects belong in `next.config.ts` `async redirects()` (`permanent:true`, verified canonical), alongside the existing blog/legal aliases. → Add pairs to the existing redirects array.

**3. Anonymous RLS INSERT for public application submissions.** Grants `anon` write to reason about and enumerate. → Edge-function-mediated service-role insert behind a hashed-token SECURITY DEFINER RPC, exactly like `sign-lease-token`.

**4. Count-on-send e-sign metering.** Racy under concurrent sends. → Append-only `esign_events` + atomic count-and-insert RPC under an advisory lock.

**5. Storage-usage tracked column as source of truth.** Drifts on out-of-band deletes/cron cleanup. → Exact `SUM(storage.objects.metadata->>'size')` RPC; optional nightly cache row as a read accelerator only.

**6. Keeping the dead n8n hop for reminder delivery.** The pg_net→n8n POST fills the queue but never sends (the confirmed gap). → Edge-function drain over `lease_reminders` with an `emailed_at` exactly-once guard; drop/inert the n8n trigger.

**7. Server-rendering the notification unread count into the layout.** The count must refresh; the layout is a one-shot async render. → Client `NotificationBell` island with TanStack Query `refetchInterval`.

**8. Realtime subscription for the notification badge.** Adds connection/RLS-on-Realtime/reconnect complexity for low-urgency events. → 60s TanStack Query poll, consistent with the app's `refetchOnWindowFocus` idiom. (Realtime is a documented future upgrade, not v10.0.)

---

## Integration Points

### External services
| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| Resend | `_shared/resend.ts` `sendEmail` + `email-layout.ts` + `escape-html.ts` | ALL new email (reminders, digest, applications, notices) routes through it — never pg_net-direct. |
| Upstash (rate-limit) | `_shared/rate-limit.ts` sliding window | Public intake (9) reuses the dual-layer `/sign` config; fail-open. |
| Stripe FDW | read-only `stripe.*` foreign tables | Metering reads plan via `get_user_plan_limits`/`users.subscription_plan` — NOT new Stripe writes. |
| Sentry | cron check-ins + `captureWebhookError` | Every new pg_cron job registers a monitor slug + check-in (mirror `payment-reminders`). |

### Internal boundaries
| Boundary | Communication | Notes |
|----------|---------------|-------|
| pg_cron ↔ edge fn | pg_net `net.http_post` to function URL w/ bearer | New drain jobs (7, 8, 11) mirror `notify_critical_error_http_delivery` invoke shape. |
| Feature RPC ↔ notification/activity | `create_notification` + `activity` insert inside the SECURITY DEFINER RPC | Single write-path; atomic with the feature's own mutation (mirror `sign_lease_with_token`). |
| Client ↔ metered edge fn | 402 → `PaywallError` → upgrade CTA | e-sign (5), storage (6), premium reports all share the `parsePaywallResponse` shape. |
| Public browser ↔ token edge fn | `verify_jwt=false` + hashed-token RPC | `/apply` (9) mirrors `/sign` (no direct Postgres from anon). |

---

## Sources

- Live codebase (HIGH): `supabase/functions/sign-lease-token/index.ts`, `lease-signature/index.ts`, `_shared/tier-gate.ts`, `_shared/lease-signing.ts`, `src/proxy.ts`, `src/hooks/api/query-keys/report-keys.ts`, `src/components/shell/app-shell*.tsx`, `src/app/sign/[token]/page.tsx`, `next.config.ts`, `src/lib/seo/blog-redirects.ts`, `src/config/pricing.ts`, migrations `20260222110100`/`20260222130000`/`20260224091106` (reminder queues + pg_cron + pg_net), `20251101000000_base_schema.sql` (notifications/activity/expenses/rent_payments).
- Next.js 16 official docs via Context7 `/vercel/next.js` (HIGH): `redirects.mdx` (permanent 308 redirects), `redirecting.mdx` (config vs middleware), `cookies.mdx` (Server Component data), `use-search-params.mdx`/`connection()`, `migrating-to-cache-components.mdx` (`force-dynamic` status).
- Project context (HIGH): `.planning/PROJECT.md` v10.0 milestone, CLAUDE.md (money-in-dollars, no-ENUM, query-key-factory, RLS, edge-fn conventions), MEMORY.md (n8n reminder gap, `expenses.amount` integer, tier-gate history).

---
*Architecture research for: v10.0 Claims Integrity + Canonical Feature Expansion feature integration*
*Researched: 2026-07-19*
