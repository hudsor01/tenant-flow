# Stack Research

**Domain:** Landlord-only property-management SaaS — v10.0 Claims Integrity + Canonical Feature Expansion (brownfield additions to a mature Next.js 16 app)
**Researched:** 2026-07-19
**Confidence:** HIGH

## Headline

**v10.0 requires ZERO new npm runtime dependencies.** Every one of the 4 tracks composes rails that already ship in the repo (Resend edge helper, pg_cron + pg_net, tier-gate, `useSupabaseUpload` + react-dropzone, Supabase Storage, `storage.objects` metadata, recharts/xlsx/jspdf/pdf-lib, satori/@vercel/og, TanStack Query/Form). The only genuine stack *decisions* are (1) whether to keep browser push (recommend **CUT**) and (2) confirming the Next.js 16 idioms the new surfaces must follow. This document is therefore framed as **what NOT to add** and **which existing rail each feature rides**, per the milestone's "no framework swaps" constraint.

## The Four Evaluation Points (direct answers)

### (1) Web Push for browser notifications — RECOMMEND CUT

**Verdict: remove the toggle (same as SMS). Do not build browser push in v10.0.**

Hard technical facts (verified, HIGH confidence):
- Web Push **cannot** work without an active service worker — `PushManager.subscribe()` requires a registered SW and the `push` event only fires inside the SW. There is no SW-less path. (MDN Push API, WebKit.)
- iOS/iPadOS only deliver web push when the site is **installed to the Home Screen as a PWA** (iOS 16.4+). A landlord using tenantflow.app in mobile Safari without installing gets nothing — a large silent-failure surface for a B2B web app.
- Requires net-new infrastructure with no existing analog in the repo: VAPID keypair (vault-stored), a `push_subscriptions` table + RLS, subscription pruning on 410/expiry, a payload-encrypting edge function (Web Push protocol / VAPID JWT), and a permission-prompt UX. Confirmed: no `push_subscriptions`/`vapid`/`web_push` artifacts exist today.

The banned-SW safety question (asked explicitly): a **push-only SW is technically safe** from the prior prod incident. That incident (`public/sw.js` kill-switch header) was a *fetch* handler doing cache-first serving of hashed `/_next/` chunks → stale-chunk hydration failure. A SW that registers **only** `push` + `notificationclick` listeners and **no `fetch` handler** is architecturally incapable of that failure mode. So push is not *blocked* by the ban — it is *not worth it*:

- The app **actively tears down all service workers on every load** today (`src/components/sw/register-sw.tsx` unregisters every SW + purges every cache; `public/sw.js` is a self-unregistering kill-switch). Adding push means *reversing* that deliberate teardown and re-introducing a SW the team removed on purpose — a cultural and operational regression, not just code.
- Track B ships an **in-app notification center** (bell + inbox over existing `notifications`/`notification_logs`) and Track A/D ship **email** (renewal reminders, monthly digest, comms). Between in-app + email, the notification surface is fully covered. Browser push adds marginal reach for a desktop-first landlord tool at high infra + risk cost.

If push is ever revived, it is a **standalone future milestone** with its own SW risk review, using a dedicated push-only SW (no fetch handler) + VAPID + a Web Push edge function (`jsr:@negrel/webpush` or `npm:web-push` in Deno) — flagged LOW confidence on exact library/version, verify at that time. **Not v10.0.**

### (2) Storage usage metering over Supabase Storage — NO library, RPC over `storage.objects`

Supabase Storage keeps per-object metadata in the Postgres table `storage.objects`, where `(metadata->>'size')::bigint` is the object byte size. Per-owner usage is a `SUM()` over that column filtered by the owner's path prefix (buckets already use owner-scoped paths — `avatars`, `property-images`, plus the documents vault).

**Recommended:** a `SECURITY DEFINER` RPC (e.g. `get_storage_usage_bytes(owner uuid)`) that sums `storage.objects.metadata->>'size'` across the owner's buckets/prefixes, `SET search_path = public`, gated on `auth.uid()`. Surface it as a usage meter in Settings; **soft-enforce at upload** by checking usage vs. the plan-tier cap and returning an upgrade prompt — reusing the exact `_shared/tier-gate.ts` + `_shared/plan-tier.ts` entitlement pattern already used for e-sign. **Zero new dependencies.**

Rejected alternative: a trigger-maintained running-total table (`storage_usage` incremented on `storage.objects` INSERT/DELETE). More scalable for millions of objects, but overkill for the target segment (landlords with 1–15 rentals → hundreds of objects). Sum-on-read is simpler, has no drift risk, and can be cached in TanStack Query. Choose the trigger-counter only if the object count per owner ever reaches tens of thousands.

### (3) Schedule E mapping, receipt handling, rent ledger — NO libraries (argued)

All three are **data + existing-rail** problems, not library problems:

- **Rent ledger (record-keeping only):** new Postgres tables (expected charges derived from lease terms, `mark-received`, late flags, per-tenant balance) + PostgREST + TanStack Query + `date-fns` (already a dep) for date math. Money stays `numeric(10,2)` dollars per house rules. **Explicitly no payments library** (no Stripe PaymentIntents, no Plaid, no ACH) — that would violate the demolished "no rent facilitation" positioning. Adding any payment SDK here is a blocking positioning violation.
- **Schedule E mapping:** a static category→line mapping (a reference table or a `text` column with a `CHECK` constraint — house rule forbids PG ENUMs). Reporting is a `GROUP BY` in an analytics RPC (same shape as the existing `get_expense_summary` / `get_property_performance_*` RPCs), exported via the **already-installed** `xlsx` (SheetJS) + `jspdf`/`jspdf-autotable`, or the `export-report` edge function. No tax library.
- **Receipt photo upload:** the existing `useSupabaseUpload` hook (`src/hooks/use-supabase-upload.ts`) already wraps `react-dropzone` (dep) + Supabase Storage — identical to the document-vault and property-image flows. Thumbnails come free from Supabase Storage image transforms or the already-present `sharp`. No new upload/image library.

### (4) Scheduled email digests — existing pg_cron + pg_net + Edge Function + Resend rail

This rail is **already live in the repo** — no additions:
- `pg_net` is installed and `net.http_post()` is used throughout (`payment_reminders_cron.sql`, `phase56_db_webhooks.sql`, notification triggers, etc.) to invoke edge functions/webhooks from Postgres.
- 12 `cron.schedule` jobs already run (house rule: named `SECURITY DEFINER` functions, 3 AM UTC window).
- `_shared/resend.ts` sends via the Resend REST API (incl. base64 attachments for PDFs); `_shared/email-layout.ts` + `_shared/escape-html.ts` template safely.

**Monthly owner digest pattern:** `pg_cron` (monthly, 3 AM UTC) → `net.http_post` → a new `owner-digest` edge function → query owners → render HTML (existing `email-layout.ts`) and optionally a PDF via the existing `generate-pdf` / `export-report` / satori (`@vercel/og`) infra → `sendEmail()`. **The dead renewal-reminder delivery (Track A) uses the identical rail**: an edge function draining the existing `lease_reminders` queue via Resend, triggered by cron+pg_net, replacing the disabled n8n hop. Zero new dependencies for either.

Rejected alternative — **React Email (`@react-email/components`)** for templating: nicer DX than hand-rolled HTML, but it is an *add*, and `_shared/email-layout.ts` + `escape-html.ts` already produce safe, consistent templates that Resend renders. Not needed; adding it duplicates a working rail.

## Next.js 16 Idioms (verified against current docs, not memory)

Verified via Context7 `/vercel/next.js` (v16.2.9) and the official Next.js 16 release blog (nextjs.org/blog/next-16, published 2025-10-21). Project is on `next@16.2.10`, `react@19.2.7`, React Compiler stable-enabled.

| Concern | Next.js 16 canon | v10.0 directive |
|---------|------------------|-----------------|
| **Server vs Client Components** | RSC by default; `'use client'` only for hooks/events/browser APIs | New surfaces are server shells with small client islands (notification bell, ledger table, comms composer, dropzone). Keep the 300-line/50-line limits. |
| **Mutations: Server Actions vs Route Handlers vs PostgREST** | All three coexist | **Keep the established pattern**: authenticated owner mutations go through TanStack Query → PostgREST/RPC (works with the `queryOptions()` invalidation model). Do **NOT** rewrite the data layer to Server Actions. Server Actions stay reserved for RSC-page revalidation flows (as in `src/app/actions/blog-publish.ts` → `revalidatePath`). **Public unauthenticated writes (rental-application submit via token URL) → Edge Function**, reusing the `sign-lease-token` pattern (service-role insert behind a token + rate-limit), NOT a Route Handler or Server Action. |
| **Caching / revalidation (`use cache` / `cacheComponents`)** | `cacheComponents: true` config + `'use cache'` directive is the new **opt-in** model (renamed from `experimental.dynamicIO`; absorbs `experimental.ppr`). All dynamic code is request-time by default. | **Do NOT enable `cacheComponents` in v10.0** (it is currently off in `next.config.ts`). The app fetches nearly all server data client-side via TanStack Query, so the RSC fetch-cache surface is tiny; flipping on Cache Components forces a large "opt every page into `'use cache'`" migration with no payoff. |
| **`revalidateTag` / `updateTag` / `refresh`** | `revalidateTag(tag, profile)` now **requires a `cacheLife` profile** as 2nd arg (single-arg deprecated). `updateTag()` (Server-Actions-only, read-your-writes) and `refresh()` (Server-Actions-only, uncached) are new. | Only the existing blog Server Action touches `revalidate*`. New TanStack Query surfaces don't use these APIs at all — invalidate query keys + `ownerDashboardKeys.all` as house rules dictate. If any blog/RSC `revalidateTag` is added, pass the `cacheLife` profile (breaking change). |
| **`proxy.ts` (replaced `middleware.ts`)** | `middleware.ts` deprecated → `proxy.ts` (Node runtime), exported fn `proxy`. | Already migrated (`src/proxy.ts`). New authed routes inherit the subscription gate automatically; **public token routes (rental application) MUST be added to `PUBLIC_ROUTES`** in `proxy.ts`, like `/sign/[token]`. |
| **Streaming / Suspense** | PPR/Suspense boundaries for partial dynamic rendering | Use Suspense + CSS-only skeletons for the reporting hub and the dashboard activity feed, matching the existing `next/dynamic` `ssr:false` + skeleton convention for heavy libs (recharts). |
| **Parallel + intercepting routes** | Next 16 **requires explicit `default.js` in every parallel slot — builds fail without it**. | **Prefer plain routes + radix `Dialog`** for the notification center / application detail. The repo has a documented prod incident where a `[...catchAll]` in a `@modal` slot soft-200'd every unknown URL app-wide. If intercepting/parallel routes are used at all, every slot needs a `default.js` returning `null`/`notFound()`, and route-behavior must be probed with `next start` + `curl -I`. |

Other verified Next.js 16 facts relevant to new code: Turbopack is the default bundler (project already `--turbo`); React Compiler support is stable (enabled); `params`/`searchParams`/`cookies()`/`headers()` are **async — must be awaited** (applies to every new server route/page).

## What NOT to Add (the important half)

| Do NOT add | Why | Use the existing rail |
|------------|-----|------------------------|
| Any Web Push / VAPID library + service worker | Re-opens the deliberately-closed SW door for marginal value on a desktop-first B2B tool; iOS needs PWA install; in-app center + email already cover notifications | In-app notification center (Track B) + Resend email (Track A/D) |
| Any push/notification SaaS (OneSignal, MagicBell, Novu, FCM) | Vendor lock-in + a SW/SDK for a need already met in-house; violates "no framework swaps / no custom backend" spirit | `notifications`/`notification_logs` tables + TanStack Query bell |
| React Email / MJML | Duplicates working `_shared/email-layout.ts` + `escape-html.ts` | Existing email-layout helper + Resend REST |
| Any payments SDK (Stripe PaymentIntents, Plaid, Dwolla, ACH) for the rent ledger | Directly violates the demolished "no rent facilitation" positioning — record-keeping only | Plain Postgres tables + PostgREST; money as `numeric(10,2)` |
| A tax/accounting library for Schedule E | It is a static category→line map + a `GROUP BY`, not computation | Reference table/`CHECK` + analytics RPC + existing xlsx/jspdf export |
| A PDF/reporting library (react-pdf, pdfkit, puppeteer) | Report/PDF stack already exists | `jspdf`/`jspdf-autotable`, `xlsx`, `pdf-lib`, satori/`@vercel/og`, `generate-pdf`/`export-report` edge fns |
| A dropzone/upload library | Already present | `useSupabaseUpload` + `react-dropzone` + Supabase Storage |
| A scheduler/queue (BullMQ, Inngest, Trigger.dev, Vercel Cron) | The cron→edge→Resend rail is live | `pg_cron` + `pg_net` (`net.http_post`) + edge function |
| A separate storage-analytics service | Usage is a `SUM()` in Postgres | RPC over `storage.objects.metadata->>'size'` |
| Enabling `cacheComponents` / `'use cache'` in v10.0 | Large opt-in migration with no benefit for a client-fetch (TanStack Query) data model | Keep request-time RSC + TanStack Query client caching |
| Server Actions for the general data layer | Established convention is TanStack Query → PostgREST/RPC with query-key invalidation | Keep it; Server Actions only for RSC-page revalidation (blog) and never for the public token write (that's an edge function) |

## Existing Rails Map (per feature → no new deps)

| v10.0 feature | Rides on (all already installed) |
|---------------|----------------------------------|
| Renewal-reminder delivery (Track A) | `lease_reminders` table + `pg_cron` + `pg_net` + edge fn + `_shared/resend.ts` (drop dead n8n hop) |
| E-sign monthly metering (Track A) | `_shared/tier-gate.ts` + `_shared/plan-tier.ts` at the `lease-signature` gate + a monthly counter row |
| Storage metering + quota (Track A) | RPC over `storage.objects.metadata` + tier-gate soft-enforce at upload |
| Browser push (Track A) | **CUT** — remove toggle |
| Notification center + activity feed (Track B) | `notifications`/`notification_logs`/`activity` tables + `get_user_dashboard_activities` RPC + TanStack Query + radix Popover/`lucide-react` Bell |
| Reporting hub consolidation (Track C) | Existing analytics RPCs + `recharts` + `xlsx` + `jspdf(-autotable)` + `export-report` |
| Real `/documents` landing (Track C) | Existing vault components |
| Rent ledger (Track D) | New tables + PostgREST + TanStack Query + `date-fns` |
| Rental application intake (Track D) | Public token page (reuse `/sign/[token]`) + Edge Function submit + TanStack Form; add route to `PUBLIC_ROUTES` |
| Tenant comms log (Track D) | `_shared/resend.ts` send + DB log rows + TanStack Query |
| State-aware notice library (Track D) | Lease-template rails + `pdf-lib`/`generate-pdf` |
| Compliance + key-date tracking (Track D) | New tables + existing reminder queue (`pg_cron` + `pg_net`) |
| Schedule E mapping + receipts (Track D) | Reference/`CHECK` map + analytics RPC + `useSupabaseUpload`/`react-dropzone`/Storage |
| Owner monthly digest (Track D) | `pg_cron` + `pg_net` + edge fn + Resend + satori/`generate-pdf` |
| Unit turnover workflow (Track D) | New state tables + TanStack Query |

## Version Compatibility (current, verified)

| Package | Installed | Note |
|---------|-----------|------|
| next | 16.2.10 | Context7 confirms 16.2.9 canon; `cacheComponents`/`'use cache'` available but keep OFF; `proxy.ts` already adopted |
| react / react-dom | 19.2.7 | Next 16 App Router runs React 19.2 canary features (View Transitions, `useEffectEvent`, `Activity`) |
| babel-plugin-react-compiler | ^1.0.0 | React Compiler 1.0 stable; `reactCompiler: true` set |
| @tanstack/react-query / react-form | ^5.100.10 / ^1.32.0 | Data-layer + forms for all new surfaces; no version change |
| react-dropzone | ^15.0.0 | Receipt/document upload; no change |
| xlsx (SheetJS) | 0.20.3 (CDN tarball) | Report export; no change |
| jspdf / jspdf-autotable | 4.2.1 / 5.0.8 | PDF report/notice export; no change |
| @vercel/og | 0.11.1 | satori-based rendering (hsl only — no oklch) for digest/OG |
| stripe | ^22.1.1 | Subscription tier reads only; **no PaymentIntents for the ledger** |

## Sources

- Context7 `/vercel/next.js` (v16.2.9) — `use cache` / `cacheComponents` / `cacheLife` / `cacheTag` migration; Server Actions + `revalidatePath`/`revalidateTag`/`updateTag`/`refresh` semantics. HIGH.
- Official Next.js 16 release blog — nextjs.org/blog/next-16 (2025-10-21) — Cache Components opt-in model, `proxy.ts` replacing/deprecating `middleware.ts`, Turbopack default, React Compiler stable, `revalidateTag` breaking signature, parallel-route `default.js` requirement, async `params`/`cookies`/`headers`. HIGH.
- MDN Push API + WebKit "Web Push for Web Apps on iOS and iPadOS" + Apple WWDC22 "Meet Web Push for Safari" — SW-required, VAPID, iOS Home-Screen-install requirement. HIGH.
  - https://developer.mozilla.org/en-US/docs/Web/API/Push_API
  - https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Repo verification (HIGH): `package.json` deps; `supabase/functions/_shared/{resend,tier-gate,plan-tier,email-layout,escape-html}.ts`; `net.http_post`/`pg_net` + `cron.schedule` across `supabase/migrations/`; `public/sw.js` + `src/components/sw/register-sw.tsx` (SW kill-switch); `src/hooks/use-supabase-upload.ts`; `src/proxy.ts`; `next.config.ts` (`cacheComponents` off); `src/app/actions/blog-publish.ts` (Server Action + `revalidatePath` precedent); `storage.from(...)` usage.
- Storage metering approach (`storage.objects.metadata->>'size'` SUM) — standard Supabase self-hosted-metering pattern. MEDIUM-HIGH (canonical pattern; validate exact bucket path prefixes during phase planning).

---
*Stack research for: TenantFlow v10.0 (brownfield feature expansion — additions vs. existing-rail reuse)*
*Researched: 2026-07-19*
