# Project Research Summary

**Project:** TenantFlow v10.0 "Claims Integrity + Canonical Feature Expansion"
**Domain:** Landlord-only property-management SaaS — brownfield feature expansion on a mature Next.js 16 + Supabase app
**Researched:** 2026-07-19
**Confidence:** HIGH

## Executive Summary

v10.0 is a brownfield expansion, not a greenfield build, and the research across all four tracks converges on one conclusion: **every one of the 13 target features rides an existing rail** — `pg_cron` + `pg_net` + Resend for scheduled delivery, `_shared/tier-gate.ts` for metering, `storage.objects` for usage accounting, `/sign/[token]`'s hashed-token edge-function pattern for public writes, and the existing `notifications`/`activity` tables for the orphaned-backend surfacing. Zero new npm dependencies are required. The real work is disciplined reuse: closing the 4 confirmed claims-vs-code gaps (renewal reminders sold but undelivered, e-sign metering absent, storage quotas unenforced, dishonest SMS/push toggles), surfacing backend that already exists but has no UI (notification center, activity feed), consolidating three duplicated reporting surfaces into one hub, and building the canonical landlord feature set (rent ledger, rental applications, notices, compliance tracking) strictly as record-keeping — never crossing into payment facilitation, tenant accounts, or screening, which are permanently out of scope per PROJECT.md.

The recommended approach is to front-load the claims-integrity and orphaned-backend work (Tracks A/B) because they establish two reusable primitives every later feature depends on: the `create_notification` RPC write-path and the queue-drain-Resend delivery pattern (proven by fixing renewal reminders). The rent ledger should land early among Track D features because it is the flagship canonical feature and the single dependency that unlocks honest revenue/collection-rate analytics for both the reporting hub and the owner digest — shipping the digest or reporting consolidation before the ledger risks re-fabricating metrics the product deliberately dropped in v2.0.

The dominant risk category is not technical complexity but **integrity regressions on a live product**: quota enforcement that retroactively locks out already-over-quota owners with no grandfathering, a reminder drainer that double-sends or storms a backlog after weeks of dead delivery, money corruption at the integer/numeric boundary in the new rent ledger (the exact failure class that caused v8.0's 100× bug), and a public application-intake endpoint that must mirror `/sign/[token]`'s hashed-token discipline exactly or it reopens the anonymous-RLS-write hole the rest of the schema was built to avoid. Every one of these has a concrete, cheap prevention documented in PITFALLS.md — the risk is skipping the prevention under time pressure, not the absence of a solution.

## Key Findings

### Recommended Stack

No new runtime dependencies for any of the 4 tracks. The two genuine stack decisions are (1) **cut browser push** — it requires reversing the app's deliberate service-worker teardown for marginal reach on a desktop-first B2B tool, and in-app notifications + email already cover the surface — and (2) hold the line on existing Next.js 16 idioms: keep `cacheComponents`/`'use cache'` OFF (the app's data layer is TanStack Query client-fetch, so there's no payoff), keep mutations on TanStack Query → PostgREST/RPC (never migrate to Server Actions), keep SEO/permanent redirects in `next.config.ts` `redirects()` (never `proxy.ts`), and route every public unauthenticated write through an edge function mirroring `sign-lease-token`, never a Route Handler or anonymous RLS policy.

**Core technologies (all already installed, reused not added):**
- `pg_cron` + `pg_net` + Resend (`_shared/resend.ts`) — scheduled delivery for reminders, digest, notice/compliance queues
- `_shared/tier-gate.ts` + `_shared/plan-tier.ts` — e-sign and storage metering enforcement points
- `storage.objects.metadata->>'size'` (SECURITY DEFINER RPC) — storage usage accounting, no separate metering service
- `useSupabaseUpload` + `react-dropzone` + Supabase Storage — receipt photos, application document uploads
- `xlsx`/`jspdf`/`jspdf-autotable`/`pdf-lib`/satori (`@vercel/og`) — Schedule E export, owner-digest PDF, notice PDFs
- `/sign/[token]` pattern (SHA-256 hashed token + `verify_jwt=false` edge fn + SECURITY DEFINER RPC) — the template for the rental-application public intake

### Expected Features

Full detail in FEATURES.md; distilled against the positioning guardrails (tenants are records not users, no rent-payment facilitation, no screening).

**Must have (v10.0 core / P1):**
- Renewal reminder delivery in-house (sold, currently dead — n8n hop disabled)
- E-sign monthly metering (sold, currently unenforced)
- Storage quota metering + soft enforcement (sold, currently unenforced)
- In-app notification center (backend exists, orphaned)
- Dashboard activity feed (backend exists, orphaned)
- Rent ledger — record-keeping only (flagship canonical feature; unlocks honest analytics)

**Should have (P2, add after validation):**
- Reporting hub consolidation (best after ledger provides actuals to unify around)
- Digital rental application intake (public token, no applicant accounts, no SSN/screening)
- Schedule E expense mapping + receipt photos (after storage meter ships)
- Scheduled monthly owner digest (after ledger provides real numbers)
- Tenant communication log (owner-side record only, no two-way chat/SMS)

**Defer / curate (P3, v10.x or v11+):**
- State-aware notice library — highest liability item (UPL exposure); launch with a curated state subset, never claim "all 50 states"
- Compliance & key-date tracking — valuable but standalone, rides the reminder rails whenever scheduled
- Unit turnover workflow — orchestration over five existing subsystems, highest integration surface, build last

**Explicit anti-features across every Track D feature:** any payment rail (Pay Now/ACH/autopay/tenant balance view), applicant accounts or SSN collection, built-in screening/background checks, two-way tenant chat/SMS, auto-serving legal notices or claiming legal validity/"attorney-reviewed," and auto-computing legally-binding deposit-return deadlines as authoritative.

### Architecture Approach

Every new feature is a server-shell-plus-client-island addition to the existing Next.js 16 + Supabase architecture: Server Components fetch initial data, small client islands (notification bell, ledger table, comms composer, dropzone) own interactivity, all mutations flow through TanStack Query → PostgREST/RPC with `queryOptions()` factory invalidation, and every new table gets owner-scoped RLS. Two reusable primitives are established early and consumed by nearly everything downstream: a `create_notification` SECURITY DEFINER RPC (single write-path for in-app notifications, called atomically inside each feature's own mutation RPC) and the queue-drain-Resend pattern (`emailed_at`-guarded `FOR UPDATE SKIP LOCKED` drain, first proven fixing renewal reminders, then reused for compliance reminders and the owner digest).

**Major components:**
1. **Notification/activity write-path** — `create_notification` RPC + `activity` insert, called from every feature's mutation, surfaced via a TanStack Query polling badge (`refetchInterval: 60s`, not Supabase Realtime — the app's existing `refetchOnWindowFocus` idiom is sufficient for low-urgency landlord events)
2. **Queue-drain-Resend delivery** — pg_cron populates a queue table (`lease_reminders`, new `compliance_reminders`), a second cron job drains un-emailed rows via an edge function with exactly-once (`emailed_at`) semantics and a shared `shouldSendTo()` suppression gate
3. **Rent ledger** — two new tables (`rent_charges` expected, `rent_receipts` actual — explicitly NOT the demolished `rent_payments` Stripe-facilitation table), append-only, `numeric(10,2)` dollars, pg_cron-generated charges with a `UNIQUE(lease_id, period_start)` idempotency guard
4. **Public token intake** — `/apply/[token]` mirrors `/sign/[token]` exactly: `verify_jwt=false` edge function, SHA-256-hashed token, SECURITY DEFINER RPC lookup, service-role insert, no anonymous RLS write policy ever
5. **Metering** — atomic SECURITY DEFINER RPCs (`consume_esign_credit`, `get_owner_storage_bytes`) at the single enforcement choke point (upload/send call site), never a client-trusted or racy read-then-write check
6. **Reporting hub** — route consolidation via `next.config.ts` permanent redirects (never `proxy.ts`), preserving the existing `export-report` tier-gate and `PREMIUM_REPORT_TYPES` enforcement unchanged

### Critical Pitfalls

Full list of 26 in PITFALLS.md; the five most consequential for phase sequencing:

1. **Reminder double-send/storm** — dropping the n8n hop without an `emailed_at` delivery-state column and a stale-skip/backfill-dry-run gate causes either duplicate emails or a burst of dozens of "your lease expired weeks ago" emails at go-live. Avoid: schema-time delivery-state column + `FOR UPDATE SKIP LOCKED` drain + pre-launch backlog-size review.
2. **Quota enforcement locks out existing over-quota owners** — flipping storage/e-sign caps on with zero enforcement history instantly blocks owners already over the new limit, including from uploading a signed lease they need today. Avoid: soft-enforce + grandfather report before flipping enforcement; never block reads/downloads/deletes.
3. **Rent-ledger money corruption at the integer/numeric boundary** — `leases.rent_amount` and `expenses.amount` are `integer` in prod while CLAUDE.md mandates `numeric(10,2)`; partial payments and prorated late fees need cent-exact allocation or balances never reach exactly $0 (the same failure class as v8.0's 100× bug). Avoid: explicit `numeric(10,2)` ledger columns + typed boundary mappers + cent-exact allocation property tests.
4. **Anonymous-write RLS hole in the application intake** — a blanket `anon INSERT` policy or a guessable token opens arbitrary writes/enumeration on an otherwise fully owner-scoped schema. Avoid: mirror `sign-lease-token` exactly (hashed 256-bit token, SECURITY DEFINER RPC, no anon table policy).
5. **UPL exposure in the notice library** — a generated pay-or-quit/cure-or-quit notice that implies legal sufficiency or omits "not legal advice" framing creates real liability if a defective notice gets an eviction dismissed. Avoid: unavoidable disclaimer on every generated notice, dated per-state template data (never hardcoded), honest coverage claims (never "all 50 states" until vetted).

## Implications for Roadmap

Research strongly supports a phase structure that mirrors ARCHITECTURE.md's dependency-respecting build order (13 features → up to 13 phases, consistent with the project's locked "fine granularity" GSD config of 8–13 phases). Two primitives — the notification write-path and the queue-drain-Resend pattern — should land first because nearly every later feature calls into them.

### Phase 1: In-app notification center
**Rationale:** Establishes the `create_notification` SECURITY DEFINER RPC that every subsequent feature (reminders, applications, notices, compliance, turnover) calls to write in-app notifications. Backend tables (`notifications`, `notification_logs`) already exist and are orphaned — this is primarily a UX + write-path task, not new schema.
**Delivers:** Bell + unread badge (TanStack Query poll, 60s `refetchInterval`) + inbox with mark-read/mark-all-read, owner-scoped RLS on `notifications`, retention/archive cron (mirroring `security_events`/`user_errors` 90d pattern).
**Addresses:** FEATURES.md #4 (notification center); also folds in Track A's "notification channel honesty" — remove the SMS toggle, cut browser push per STACK.md's recommendation.
**Avoids:** Pitfall 16 (unbounded notification growth — ship the retention cron in this phase), Pitfall 17 (N+1 unread-count queries — single consolidated count RPC), Pitfall 18 (notification spam — curate events, respect `notification_settings`).

### Phase 2: Dashboard activity feed
**Rationale:** Smallest Track B item; reuses Phase 1's write-path. The `activity` table + `get_user_dashboard_activities` RPC already exist and are orphaned.
**Delivers:** Dashboard timeline panel, clearly disambiguated from the notification center (feed = historical "what happened," center = actionable read/unread — must be decided in the same design pass to avoid duplication).
**Addresses:** FEATURES.md #5 (activity feed).
**Avoids:** Merging with the notification center (an explicit FEATURES.md guardrail); unbounded/unpaginated queries.

### Phase 3: Renewal reminder delivery in-house
**Rationale:** Highest-integrity fix — a sold Growth+ feature with a confirmed dead delivery path (disabled n8n workflow). Establishes the queue-drain-Resend pattern reused by Phase 10 (compliance) and Phase 12 (digest).
**Delivers:** `send-lease-reminders` edge function draining `lease_reminders` via an `emailed_at` exactly-once guard, atomic removal of the dead n8n trigger, a shared `shouldSendTo()` suppression gate (checks `email_suppressions`, `is_notification_suppressed()`, `notification_settings` in one place).
**Addresses:** FEATURES.md #1 (renewal reminder delivery); STACK.md's confirmed existing-rail pattern.
**Avoids:** Pitfall 1 (double-send), Pitfall 2 (timezone-wrong send dates — fix the date-math discipline here since Phase 10/12 inherit it), Pitfall 3 (reminder storm from backlog — dry-run gate before go-live), Pitfall 4 (suppression-list bypass).

### Phase 4: E-sign + storage metering
**Rationale:** Claims-integrity P0 — both features share `_shared/tier-gate.ts`/`get_user_plan_limits` and a Settings usage-meter UI pattern; build together for a single review pass. No architectural dependency on Phases 1–3.
**Delivers:** Append-only `esign_events` ledger + atomic `consume_esign_credit` RPC (advisory-lock or `WHERE used < cap` guarded), `get_owner_storage_bytes()` RPC summing `storage.objects.metadata`, soft-enforcement at the upload/send choke point, Settings usage meters for both.
**Uses:** `_shared/tier-gate.ts`, existing `pricing.ts` limit config, no new dependencies.
**Implements:** ARCHITECTURE.md's atomic-counter pattern (Anti-Pattern 4/5 in PITFALLS.md — never count-on-send, never a drifting tracked column as source of truth).
**Avoids:** Pitfall 5 (quota race conditions — concurrency test required), Pitfall 6 (retroactive lockout — mandatory grandfather report before flipping enforcement), Pitfall 7 (metering drift — backfill `file_size` or sum `storage.objects` as sole truth), Pitfall 8 (plan-downgrade edge cases).

### Phase 5: Rent ledger (record-keeping only)
**Rationale:** The flagship canonical feature and the single dependency that unlocks honest revenue/collection-rate analytics for Phases 6 and 12. No dependency on Phases 1–4 architecturally, but sequencing it before the reporting hub and digest prevents those phases from re-fabricating metrics.
**Delivers:** `rent_charges` (expected, pg_cron-generated) + `rent_receipts` (actual, owner-entered) tables — never reusing the demolished `rent_payments` Stripe table — append-only entries, `numeric(10,2)` dollars, per-lease/unit/property balance rollups, opening-balance "calculate since" onboarding.
**Addresses:** FEATURES.md #7 (rent ledger, deep-dive); the positioning-safe "no rent facilitation" boundary is load-bearing here.
**Avoids:** Pitfall 9 (money corruption at the integer/numeric boundary), Pitfall 11 (editable ledger history — append-only with adjustment entries only), Pitfall 12 (charge regeneration rewriting history on lease-term changes).

### Phase 6: Reporting hub consolidation
**Rationale:** Route/IA consolidation can start independently of the ledger, but ledger-fed revenue widgets should slot in after Phase 5 so the hub launches with real actuals rather than a second re-fabrication of `collection_rate`.
**Delivers:** Single `/reports` hub merging `/financials/*`, `/analytics/*`, `/reports/*`; 301 redirects for every retired route via `next.config.ts` (never `proxy.ts`); `export-report` tier-gate preserved unchanged; single revenue definition per KPI (expected vs. collected, never summed).
**Addresses:** FEATURES.md #6.
**Avoids:** Pitfall 10 (double-counted revenue when the ledger and lease-derived estimate coexist), Pitfall 21 (broken bookmarks — 301 not 404), Pitfall 22 (lost tier-gate coverage during route move), Pitfall 23 (stale financial data from Next.js `use cache` — keep money reads on the TanStack Query layer only), Pitfall 25 (Suspense waterfalls across hub widgets).

### Phase 7: Digital rental application intake
**Rationale:** Independent public-token feature; mirrors `/sign/[token]` byte-for-byte in its security pattern, so it can land any time after Phase 1 (for owner notification) without waiting on the ledger or reporting work.
**Delivers:** `/apply/[token]` public route, `application-intake` edge function (`verify_jwt=false`, hashed token, SECURITY DEFINER RPC), owner review queue + convert-to-tenant, explicit no-SSN/no-screening field set with FCRA hand-off disclaimer.
**Addresses:** FEATURES.md #8 (deep-dive); positioning guardrail "tenants are records, never users" is directly load-bearing.
**Avoids:** Pitfall 13 (anonymous-write RLS hole — no anon INSERT policy, ever), Pitfall 14 (applicant PII with no GDPR deletion path — retention cron + owner-deletion cascade), Pitfall 15 (public-form spam — rate limit + honeypot + `escapeHtml`).

### Phase 8: Tenant communication log
**Rationale:** Reuses Resend (Phase 3) + notification write-path (Phase 1); low architectural risk, sequences naturally before Phase 9 since notices write delivery events into this log.
**Delivers:** Owner-side communication timeline (manual calls/notes + auto-logged outbound email), never a two-way chat/SMS surface.
**Addresses:** FEATURES.md #9.
**Avoids:** Building a tenant-facing messaging UI (positioning violation — tenants aren't users).

### Phase 9: State-aware notice library
**Rationale:** Heaviest liability/effort item in Track D — sequence after the lease-template/PDF rails are proven stable and after the communication log exists to receive delivery events. Shares its state/jurisdiction data model with the outstanding ToS governing-law gap (MKTUI-02), so this phase should resolve or at least align with that placeholder.
**Delivers:** A curated (not "all 50 states") set of notice templates (pay-or-quit, cure-or-quit, entry, non-renewal) as dated per-state data, merge-field PDF generation on existing lease-template rails, delivery tracking into Phase 8's comms log, an unavoidable "not legal advice" disclaimer.
**Addresses:** FEATURES.md #10 (deep-dive).
**Avoids:** Pitfall 19 (UPL exposure — disclaimer + no sufficiency claims, counsel-reviewed copy before launch), Pitfall 20 (stale state law — templates as dated data with `last_reviewed`, honest coverage claims only).

### Phase 10: Compliance & key-date tracking
**Rationale:** Hard-depends on the reminder-drain infrastructure built in Phase 3 — reuses the identical queue/drain/suppression pattern for a different queue table.
**Delivers:** `compliance_dates` + `compliance_reminders` tables, calendar/dashboard surfacing, document-vault attachment per date.
**Addresses:** FEATURES.md #11.
**Avoids:** Positioning as a compliance guarantor (date tracker only, not certification); re-derives the timezone-correct date math established in Phase 3.

### Phase 11: Schedule E expense mapping + receipt photos
**Rationale:** Receipt upload consumes the storage quota, so this phase must land after Phase 4's storage meter ships or receipts bypass an unmetered cap.
**Delivers:** `schedule_e_line` category mapping (CHECK-constrained text, not ENUM) on the expenses taxonomy, receipt photo upload via existing `useSupabaseUpload`, Schedule E report export via existing PDF infra. Reconcile the documented `expenses.amount integer` vs. dollars `numeric(10,2)` mismatch as part of this schema touch.
**Addresses:** FEATURES.md #12 (deep-dive).
**Avoids:** Claiming to file taxes or give tax advice (frame as "simplified prep" only, per Stessa/Landlord Studio precedent).

### Phase 12: Scheduled monthly owner digest
**Rationale:** Numbers must be real — sequence after the ledger (Phase 5) and reporting consolidation (Phase 6) so the digest reports actual collected-vs-expected data, not a re-fabricated estimate. Reuses Phase 3's drain pattern for a monthly cadence.
**Delivers:** `send-owner-digest` edge function, monthly pg_cron, branded PDF (existing `generate-pdf`/satori infra) with income/expense/NOI/occupancy/compliance-date content, opt-out via `notification_settings`.
**Addresses:** FEATURES.md #13.
**Avoids:** Fabricated metrics (the v1.0/v2.0 honesty rule — no `collection_rate` claim until Phase 5's ledger backs it), over-frequency (monthly only).

### Phase 13: Unit turnover workflow
**Rationale:** Highest integration surface — orchestrates inspections, maintenance, leases, the ledger's deposit accounting, notifications, and (optionally) the application intake for re-lease. Build dead last so every subsystem it chains into already exists.
**Delivers:** `unit_turnovers` state-tracking table (advisory, non-gating checklist — never a rigid blocking state machine), security-deposit itemization worksheet, orchestration UI over existing inspection/maintenance/lease subsystems.
**Addresses:** FEATURES.md #14.
**Avoids:** Auto-computing legally-binding deposit-return deadlines as authoritative; a rigid linear state machine that blocks out-of-order landlord workflows.

### Phase Ordering Rationale

- **Notification write-path first (Phases 1–2):** nearly every other phase's feature RPC calls `create_notification` atomically — building it after would mean retrofitting every later migration.
- **Claims-integrity work front-loaded (Phases 3–4):** these close the 4 confirmed marketing-vs-code gaps that motivated the milestone; they also establish the queue-drain-Resend and atomic-metering patterns reused throughout Track D.
- **Rent ledger before reporting/digest (Phase 5 before 6, 12):** shipping the reporting hub or digest before the ledger risks re-fabricating `collection_rate`/delinquency metrics that v2.0 deliberately withheld for lack of data — the ledger is the only source of truth for "actual" revenue.
- **Storage metering before receipts (Phase 4 before 11):** receipts consume the same quota; shipping them first lets uploads blow past an unmetered cap.
- **Reminder-drain infra before compliance (Phase 3 before 10):** compliance reminders are architecturally identical to renewal reminders — reuse, don't reinvent.
- **Notice library and turnover deferred to the end (Phases 9, 13):** both carry the highest liability/integration surface in the entire milestone (UPL exposure for notices, five-subsystem orchestration for turnover) and benefit most from every upstream primitive already being proven.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 9 (State-aware notice library):** Per-state notice-period data and UPL-safe disclaimer language are jurisdiction-specific and only lightly sourced in this research pass (MEDIUM confidence on legal-notice norms). Needs a dedicated research pass on which states to launch with, current notice-period requirements per state, and disclaimer language, ideally coordinated with resolving the outstanding ToS governing-law placeholder (MKTUI-02).
- **Phase 13 (Unit turnover workflow):** Highest orchestration complexity (5+ existing subsystems); the "advisory, non-gating" state-machine design needs to be worked out concretely against the actual inspection/maintenance/lease schemas during planning, not assumed from this pass.
- **Phase 11 (Schedule E mapping):** The `expenses.amount integer` vs. dollars `numeric(10,2)` reconciliation (documented in project memory) needs to be scoped precisely — whether this phase fixes the underlying integer column or works around it at a mapper boundary is a planning-time decision this research didn't resolve.

Phases with standard, well-documented patterns (skip research-phase, plan directly from this SUMMARY + the 4 research docs):
- **Phase 1–2 (Notification center, Activity feed):** Backend tables and RPC already exist; this is a UI/wiring task with a clear mirror target (`GlobalSyncIndicator`, `report-keys.ts`) in ARCHITECTURE.md.
- **Phase 3 (Renewal reminders):** The queue-drain-Resend pattern, exactly-once guard, and suppression gate are fully specified in ARCHITECTURE.md and PITFALLS.md against the live schema.
- **Phase 4 (E-sign + storage metering):** Atomic-counter and soft-enforcement patterns are fully specified; `_shared/tier-gate.ts` is the proven mirror target.
- **Phase 5 (Rent ledger):** Semantics are thoroughly researched against Stessa/Landlord Studio (HIGH confidence, vendor help-center sourced) and the schema shape is explicit in ARCHITECTURE.md.
- **Phase 6 (Reporting hub):** Route-consolidation pattern (`next.config.ts` redirects, `export-report` tier-gate preservation) is a direct mirror of the existing blog/legal redirect precedent.
- **Phase 7 (Rental application intake):** Byte-for-byte mirror of the proven `/sign/[token]` pattern.
- **Phase 8, 10, 12 (Comms log, Compliance tracking, Owner digest):** Each is a straightforward reuse of an already-established rail (Resend, reminder-drain, PDF infra) with no novel architecture.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against the live `package.json`, live edge-function/migration source, and Context7 `/vercel/next.js` official docs (v16.2.9 canon). The "zero new dependencies" conclusion is repo-grounded, not inferred. |
| Features | HIGH | Competitor behaviors sourced from vendor help centers (Stessa, Landlord Studio, TurboTenant, Avail, Buildium) plus a regulator source (FTC) for the FCRA/screening boundary; positioning constraints cross-checked directly against PROJECT.md. |
| Architecture | HIGH | Every recommendation names a concrete existing file/function to mirror, verified by reading the live codebase (edge functions, migrations, query-key factories, `proxy.ts`, `next.config.ts`). Next.js 16 idioms verified against Context7, not memory. |
| Pitfalls | HIGH | Every pitfall is cross-checked against actual table schemas, actual edge-function code, and actual constraints (integer money columns, `@modal` incident history, existing suppression mechanisms) rather than generic SaaS advice. |

**Overall confidence:** HIGH

### Gaps to Address

- **Per-state notice library coverage and legal-notice content** — this research surfaced the UPL risk and the disclaimer pattern but did not (and could not, without legal counsel) produce actual per-state notice-period data. Flagged for `--research-phase` at Phase 9 and for counsel review before ship-time, per PITFALLS.md Pitfall 19/20.
- **Governing-law jurisdiction (MKTUI-02)** — the outstanding ToS `[Your State]` placeholder shares its state/jurisdiction model with the notice library; both are blocked on the same owner decision (which state's law governs) and should be resolved together, ideally before or during Phase 9 planning.
- **`expenses.amount` integer vs. `numeric(10,2)` dollars convention** — documented in project memory as a live schema debt; Schedule E mapping (Phase 11) touches this column directly and needs an explicit planning-time decision on whether to migrate the column type or handle it at a typed-mapper boundary.
- **Storage bucket path-prefix conventions for owner-scoped `storage.objects` SUM** — STACK.md flags this as MEDIUM-HIGH rather than HIGH confidence; validate exact bucket/prefix conventions (`avatars`, `property-images`, documents vault, receipts) during Phase 4 planning before writing the `get_owner_storage_bytes()` RPC.
- **Sum-on-read vs. trigger-maintained storage counter** — STACK.md explicitly defers this choice to actual object-count scale at planning time; the sum-on-read RPC is the recommended default unless object counts per owner reach the tens of thousands.
- **Owner-run deployment residuals** — per project memory, edge-function deploys require `bun scripts/deploy-edge-functions.ts` (CLI 401 workaround) and new migrations applied via MCP need post-apply filename reconciliation via `list_migrations`. Every phase introducing a new edge function or migration inherits this owner-run step; not a research gap but a recurring execution note worth carrying into phase planning.

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js` (v16.2.9) — `use cache`/`cacheComponents`/`cacheLife`/`cacheTag`, Server Actions + `revalidateTag`/`updateTag`/`refresh`, `redirects.mdx`/`redirecting.mdx`, `cookies.mdx`, `connection()`, `migrating-to-cache-components.mdx`
- Official Next.js 16 release blog (nextjs.org/blog/next-16, 2025-10-21) — Cache Components opt-in model, `proxy.ts` replacing `middleware.ts`, Turbopack default, React Compiler stable, parallel-route `default.js` requirement, async `params`/`cookies`/`headers`
- Live codebase (repo-verified across all 4 docs): `package.json`, `supabase/functions/_shared/{resend,tier-gate,plan-tier,email-layout,escape-html,rate-limit,lease-signing}.ts`, `supabase/functions/{sign-lease-token,lease-signature,export-report,resend-webhook}/index.ts`, `supabase/migrations/*` (reminder queues, pg_cron, notification suppression, base schema, rent-facilitation demolition), `src/proxy.ts`, `src/hooks/api/query-keys/*.ts`, `src/hooks/use-supabase-upload.ts`, `src/components/shell/app-shell*.tsx`, `next.config.ts`, `src/config/pricing.ts`
- FTC — "Using Consumer Reports: What Landlords Need to Know" (regulator source, FCRA duties on landlord)
- Vendor help centers (HIGH — direct product documentation): Stessa Tenant Ledger + Schedule E Report Mapping, Landlord Studio rent ledger + Schedule E categories, TurboTenant online application field set, Avail forms/notices, RentRedi state-specific leases, Buildium tenant turnover checklist
- MDN Push API + WebKit "Web Push for Web Apps on iOS and iPadOS" — Web Push technical requirements (SW mandatory, iOS PWA-install requirement)
- Project docs (HIGH): `.planning/PROJECT.md` v10.0 milestone scope and constraints, CLAUDE.md zero-tolerance rules, MEMORY.md (100× money bug precedent, `@modal` catch-all 404 incident, timezone sweep, `[Your State]` placeholder, edge-deploy 401 workaround)

### Secondary (MEDIUM confidence)
- Notification-center UX guides (Courier, Eleken, SuprSend) — in-app inbox best practices, multi-tenant scoping emphasis
- Owner-statement/monthly-report conventions (DoorLoop, Rentec Direct) — digest content norms
- Compliance/key-date tracking positioning (PropertyTools, Re-Leased)
- Communication-log patterns (AppFolio, Buildium)
- Security-deposit itemization statutory-window survey (Leasey.AI)
- Storage metering pattern (`storage.objects.metadata->>'size'` SUM) — canonical Supabase self-hosted-metering approach, validate exact prefixes during Phase 4 planning

### Tertiary (LOW confidence)
- "Not legal advice" disclaimer pattern confirmation (ailawyer.pro blog) — pattern-confirmation only, not a substitute for counsel review before Phase 9 ships

---
*Research completed: 2026-07-19*
*Ready for roadmap: yes*
