# Pitfalls Research

**Domain:** Adding reminder/digest email, metering/quotas, rent ledger, public intake, notification center, legal notices, and reporting consolidation to an existing Next.js 16 + Supabase landlord SaaS (TenantFlow v10.0)
**Researched:** 2026-07-19
**Confidence:** HIGH (grounded in the live schema, edge-function code, and migrations; framework idioms verified against current Next.js 16 docs via Context7)

> These are pitfalls of **adding these features to *this* system**, not generic advice. Every one is cross-checked against the actual tables (`lease_reminders`, `notifications`, `notification_logs`, `activity`, `email_suppressions`, `email_deliverability`, `notification_settings`, `expenses`, `leases`), the actual edge functions (`sign-lease-token`, `export-report`, `tier-gate.ts`, `resend.ts`), and the actual constraints (integer money columns, no tenant accounts, no rent facilitation, n8n hop being removed, `@modal` subsystem, EdgeRuntime hibernation).

**Phase-time legend** used throughout:
- **schema-time** — decide it in the migration / table design or it is expensive to reverse
- **build-time** — enforce it in the edge function / RPC / component logic
- **ship-time** — catch it in E2E / perfect-PR review / redirect + regression verification

---

## Critical Pitfalls

### Pitfall 1: Reminder double-send when the n8n hop is replaced by an edge function

**What goes wrong:**
Renewal reminders are delivered today by a DB Webhook firing `notify_n8n_lease_reminder()` on every `INSERT` into `lease_reminders` → n8n → Resend (currently dead because the n8n workflow is disabled). v10.0 replaces the n8n hop with an in-house edge function draining the queue. If the new edge function drains `lease_reminders` **and** the `notify_n8n_lease_reminder` trigger is left wired (even to a re-enabled or half-configured n8n), every reminder fires twice. Worse, if the drainer selects "rows where not yet emailed" but the `lease_reminders` table has no `emailed_at` column, the drainer has no idempotency anchor and re-emails the whole queue every run.

**Why it happens:**
The existing dedup guard is `UNIQUE (lease_id, reminder_type)` — it prevents duplicate *rows*, not duplicate *sends*. The row's existence means "queued," not "emailed." The trigger-based delivery and a new poll-based drainer are two independent delivery paths against the same rows. There is no `emailed_at`/`delivery_status` column on `lease_reminders` today (columns are `id, lease_id, reminder_type, sent_at, created_at` — `sent_at` misleadingly defaults to `now()` at insert, i.e. "queued time," not "sent time").

**How to avoid:**
- **schema-time:** Add a delivery-state column to `lease_reminders` (`delivered_at timestamptz`, `delivery_status text CHECK IN ('queued','sent','failed','suppressed')`, `resend_message_id text`, `attempt_count int`). The drainer selects `WHERE delivery_status = 'queued' FOR UPDATE SKIP LOCKED LIMIT N` and stamps `sent` inside the same transaction — mirror the `queue_payment_reminders()` + `FOR UPDATE SKIP LOCKED` pattern already used in cron cleanup jobs.
- **build-time:** Pass Resend's `Idempotency-Key` (already supported in `_shared/resend.ts` `sendEmail`) keyed on `lease_reminders.id`, so even a double-drain is deduped at the Resend boundary.
- **schema/ship-time:** In the same migration that ships the drainer, `DROP TRIGGER` the `lease_reminders` → n8n webhook and the `notify_n8n_lease_reminder` function (or gate it behind an explicit `app_config` kill so exactly one delivery path is live). Grep `cron.schedule(` and DB-webhook definitions and confirm one and only one path writes to Resend.

**Warning signs:**
Owners report receiving the same 30-day renewal notice repeatedly; `email_deliverability` shows multiple `delivered` events for one `lease_id`+`reminder_type`; drainer run count doesn't match `delivery_status='sent'` count.

**Phase to address:** Track A — Renewal reminder delivery (schema-time migration adds delivery-state columns; build-time drainer; ship-time removes the n8n trigger atomically).

---

### Pitfall 2: Timezone-wrong send dates — reminders fire on the wrong calendar day

**What goes wrong:**
Lease `end_date` is a bare `date` (no time, no zone). The reminder cron runs at a fixed UTC hour (existing jobs run `0 9 * * *` UTC and the cleanup window is 3 AM UTC). "30 days before end_date" computed in UTC can land a full calendar day early or late for an owner in Pacific/Hawaii/Eastern, and a "1_day" reminder can arrive *after* the lease has already lapsed for west-coast owners. The digest email ("your monthly report") stamped "July report" can be generated on the last UTC day of June for a US owner.

**Why it happens:**
Mixing `date` arithmetic with `timestamptz now()` and never anchoring to the owner's timezone. v8.0 already did a "timezone sweep" for display; the reminder *scheduling* math is a separate surface that the display sweep didn't touch. There is no per-owner timezone column today.

**How to avoid:**
- **schema-time:** Store the reminder threshold comparison against `end_date` using date-only arithmetic (`end_date - INTERVAL '30 days' = CURRENT_DATE` in a fixed reference zone), and pick a documented reference timezone (America/New_York is the pragmatic default for a US-only landlord product) rather than UTC for the "which day is it" decision. Optionally add `users.timezone` and compute per-owner.
- **build-time:** Never compute "days until due" with `now()::timestamptz - end_date`; compute with `CURRENT_DATE` at a fixed zone. Digest period labels derive from the owner's local month boundary, not UTC.
- **ship-time:** E2E/unit test the boundary: an owner whose lease ends "tomorrow local" must get the 1-day reminder, not a 0-day or already-expired one, across DST transitions.

**Warning signs:**
Reminders arriving a day early/late in support tickets; digest titled with the wrong month near month boundaries; DST week produces off-by-one send dates.

**Phase to address:** Track A — Renewal reminders + Track D — Scheduled owner digest + Compliance date reminders (all share the date-math discipline).

---

### Pitfall 3: Reminder storm after downtime / backfill

**What goes wrong:**
The renewal feature is sold on Growth+ but delivery has been dead for weeks (n8n disabled). The moment the in-house drainer goes live, it finds a backlog: every lease whose 30/7/1-day threshold passed *while delivery was dead* is either (a) already queued in `lease_reminders` and un-emailed, or (b) not queued and the cron backfills all of them at once. Result: an owner with 15 leases gets a burst of 10+ "your lease expires" emails in one minute — many for leases that already expired. This looks like spam, trips Resend rate/complaint thresholds, and destroys trust on the exact feature you're trying to prove works.

**Why it happens:**
Queue semantics assume "drain continuously." After a long outage the queue (or the backfill) represents historical intent, not "send now." No suppression of stale thresholds.

**How to avoid:**
- **build-time:** The drainer must **skip stale reminders**: don't email a `30_days` reminder if `end_date` is already in the past or within a smaller threshold; collapse multiple pending thresholds for one lease into the single most-relevant one. Cap sends-per-owner-per-run.
- **build-time:** On first go-live, run the drainer in a dry-run / `delivery_status='suppressed'` mode for pre-existing backlog rows (mark historical queue entries as suppressed-stale) so only *newly* crossed thresholds email going forward.
- **ship-time:** Before flipping delivery on in prod, query the backlog size and eyeball it. A "would send N emails to M owners" pre-flight count is a required review artifact.

**Warning signs:**
Backlog count in the hundreds at go-live; multiple reminder types pending for the same lease; Resend complaint/bounce spike right after launch.

**Phase to address:** Track A — Renewal reminder delivery (build-time stale-skip + ship-time backfill dry-run gate).

---

### Pitfall 4: Suppression-list bypass — the in-house sender ignores unsubscribes and bounces

**What goes wrong:**
There are **three** independent suppression mechanisms in this codebase, and a naive drainer consults none of them:
1. `email_suppressions` table (email, reason, suppressed_at) — the app's own hard-suppress list.
2. Resend's own suppression list — `sendEmail` relies on this implicitly ("Resend automatically checks its suppression list… suppressed recipients get a suppressed status, not an error").
3. `app_config: notifications.suppressed_emails` + `is_notification_suppressed()` — the synthetic-CI-account guard consulted by the n8n notify functions.
4. `notification_settings` per-owner channel/category toggles (`email`, `leases`, `general`).

When you drop the n8n hop, you also drop the `is_notification_suppressed()` check that lived inside `notify_n8n_lease_reminder()`. If the new edge-function drainer just calls `sendEmail`, it (a) will spam the synthetic CI owners on every RLS/E2E run (the exact bug migration `20260611141843` was written to stop), (b) will email owners who toggled off lease reminders in `notification_settings`, and (c) may email an address the owner hard-suppressed in `email_suppressions` if it isn't yet on Resend's list.

**Why it happens:**
Suppression logic was embedded in the n8n-notify trigger, not in a shared sender. Removing the trigger silently removes the guard. `sendEmail` only leans on Resend's list, not the app's `email_suppressions` table or `notification_settings`.

**How to avoid:**
- **build-time:** Before every drainer send, check in order: `is_notification_suppressed(owner_email)` (CI guard), `email_suppressions` (hard bounce/complaint), and `notification_settings.email && notification_settings.leases` (owner opt-out). Only then `sendEmail`. Centralize this in one `shouldSendTo(email, category)` helper so digest, comms-log, notice-delivery, and compliance reminders all inherit it.
- **build-time:** Wire the `resend-webhook` (already handles `email.bounced` / `email.complained`) to write hard bounces/complaints into `email_suppressions` so the app's own list stays authoritative — don't rely solely on Resend's opaque internal list.
- **ship-time:** RLS/E2E runs must not deliver to `e2e-owner-a/b@tenantflow.app` — assert zero Resend calls for suppressed synthetic owners.

**Warning signs:**
Synthetic owner inbox fills during CI; an owner who unsubscribed still gets reminders; `email_deliverability` shows sends to addresses present in `email_suppressions`.

**Phase to address:** Track A — Renewal reminders (establish the shared `shouldSendTo` gate); reused by Track D digest / comms-log / notice-delivery / compliance reminders.

---

### Pitfall 5: Quota counter race conditions — two concurrent uploads/signs both pass the gate

**What goes wrong:**
E-sign metering ("25/month" on Growth) and storage quotas (1/10/50 GB) both require "is the owner under their cap?" checks. If the check is a read-then-write (`SELECT count(...); if under cap, INSERT`), two concurrent requests both read `count = 24`, both pass, both write → 26 signs on a 25 cap. Same for storage: two parallel uploads each see 9.9 GB free and both commit.

**Why it happens:**
Non-atomic check-and-increment. The e-sign gate today (`checkTierEntitlement`) only checks *plan tier*, not *usage count* — there is no counter at all yet, so the counter is greenfield and easy to build non-atomically.

**How to avoid:**
- **schema-time:** Model usage as a monotonic ledger or an atomic counter. For e-sign, count real rows (`SELECT count(*) FROM lease_signatures WHERE owner_user_id=$1 AND signed_at >= date_trunc('month', now())`) inside a SECURITY DEFINER RPC that also performs the gated action, so the count and the insert are one transaction; or use an `INSERT ... ON CONFLICT` on a `(owner_user_id, period)` usage row with `UPDATE ... SET used = used + 1 WHERE used < cap RETURNING` — the `WHERE used < cap` makes the increment atomic and the "no row returned" means "over cap."
- **build-time:** Enforce at the single choke point (the `lease-signature` call site / the upload path), never in the client. Client-side count is advisory UX only.
- **ship-time:** Concurrency test — fire N+1 parallel gated calls and assert exactly `cap` succeed.

**Warning signs:**
Usage occasionally exceeds cap by 1–2; "unlimited" Max plan is fine but Growth owners intermittently get 26–27 signs; storage meter and actual bucket size disagree.

**Phase to address:** Track A — E-sign metering + Storage quota enforcement (schema-time counter design; build-time atomic gate).

---

### Pitfall 6: Retroactive quota enforcement locks out existing over-quota owners (no grandfathering)

**What goes wrong:**
Storage quotas and e-sign caps are being *added* to a live product where owners have been uploading with **zero enforcement**. Flip enforcement on and an owner already at 12 GB on a 10 GB plan is instantly blocked from every upload — including uploading a signed lease or a compliance doc they need *today*. Same for an owner who already did 30 e-signs this month before metering existed. This converts a silent non-feature into an active, punitive regression the day it ships.

**Why it happens:**
Enforcement designed as "hard block at cap" without accounting for the pre-enforcement population that is already over. No grace, no grandfather, no "read-only over quota" state.

**How to avoid:**
- **build-time:** Soft-enforce, matching the product's own language in PROJECT.md ("soft-enforce at upload with upgrade prompt"). Over-quota → show the usage meter + upgrade CTA and (option) allow the upload but flag the account, rather than a hard 403. Never block deletion or downgrade paths (owners must be able to get *under* quota).
- **schema/build-time:** Grandfather the existing population: compute each owner's current usage at launch; either raise their effective cap to `max(planCap, currentUsage)` until next billing cycle, or apply enforcement only to *new* usage crossing the line after launch date.
- **ship-time:** Pre-launch report: "how many owners are already over each cap?" If non-trivial, grandfathering is mandatory, not optional.

**Warning signs:**
Support tickets "can't upload anymore" immediately after launch; churn spike among heaviest (most valuable) users; owners over cap who can't even downgrade because the flow is blocked.

**Phase to address:** Track A — Storage quota + E-sign metering (ship-time grandfather report gates the enforcement flip).

---

### Pitfall 7: Metering drift — the meter and the real bucket disagree

**What goes wrong:**
The storage usage meter is computed from `documents.file_size` (an `integer` column, nullable) summed per owner. But files can be deleted from the Storage bucket without the row being deleted (or vice versa), `file_size` can be NULL for older rows, and the zip-download / lease-PDF flows write bytes that may not be reflected in `documents`. Over time the meter reads 8 GB while the bucket holds 11 GB (or the reverse), so quota enforcement is either too loose (owner blows past cap) or too strict (owner blocked with headroom).

**Why it happens:**
Two sources of truth (the `documents` metadata rows vs. the actual Storage objects) that drift, plus nullable/absent `file_size`.

**How to avoid:**
- **schema-time:** Backfill `file_size` for existing rows; make it `NOT NULL` going forward, set from the actual object size at upload. Decide one authoritative source — prefer summing `storage.objects.metadata->>'size'` per owner-prefixed path (the bucket) over trusting `documents.file_size`, or reconcile the two on a schedule.
- **build-time:** On every upload/delete, update the usage figure transactionally with the object operation; don't recompute lazily only at render.
- **ship-time:** A reconciliation job (nightly) compares metered vs. actual bucket size and alerts on drift beyond a threshold.

**Warning signs:**
Meter and Supabase Storage dashboard disagree; owners near cap report inconsistent block/allow; NULL `file_size` rows in `documents`.

**Phase to address:** Track A — Storage metering (schema-time `file_size` backfill; build-time transactional update; ship-time reconciliation).

---

### Pitfall 8: Plan-downgrade edge cases leave usage above the new cap

**What goes wrong:**
Owner on Max (unlimited e-sign, 50 GB) downgrades to Growth (25 e-sign, 10 GB) mid-cycle. Now they're at 40 e-signs and 30 GB against Growth caps. Questions no one designed for: does the counter reset on plan change? Is the owner instantly over quota (see Pitfall 6)? Does a `past_due` / canceled subscription drop them to free-tier caps and lock their existing documents behind a paywall? The billing lifecycle (v9.0) already had `past_due` lockout bugs — quotas re-introduce that risk.

**Why it happens:**
Metering treats the plan cap as static; Stripe subscription changes (upgrade, downgrade, cancel, past_due, trialing→active) each shift the cap and the counter's reset boundary. `subscription_plan` on `users` changes via webhook, decoupled from usage state.

**How to avoid:**
- **build-time:** Define cap resolution as a pure function of current `subscription_status` + `subscription_plan` read at enforcement time (never cache the cap). Downgrade → soft-enforce (Pitfall 6 grandfather), never destroy or hide existing data.
- **build-time:** Never let `past_due`/`canceled` retroactively lock *reading/downloading* existing documents — that's data the owner already stored. Cap only *new* writes.
- **ship-time:** Test matrix: upgrade, downgrade, cancel-to-free, past_due, trialing→active — each with usage above/below the target cap.

**Warning signs:**
Downgraded owner reports being locked out of their own documents; counter shows negative headroom; past_due owner can't download their tax docs at tax time.

**Phase to address:** Track A — Metering (build-time cap-as-pure-function; ship-time downgrade/past_due matrix), coordinated with the existing billing lifecycle code.

---

### Pitfall 9: Rent-ledger money corruption — integer columns, cents, and partial payments

**What goes wrong:**
CLAUDE.md says "all amount columns store dollars as numeric(10,2)," but in prod `leases.rent_amount`, `leases.security_deposit`, `leases.late_fee_amount`, and `expenses.amount` are **`integer`** (whole dollars). The rent ledger derives "expected charge" from `leases.rent_amount` (integer) but must record "amount received," which for partial payments and proration is inherently fractional ($812.50, a half-month, a $33.33 late fee split three ways). If ledger `amount_received` is also `integer`, every partial/prorated cent is silently truncated; if it's `numeric` while the charge is `integer`, joins and comparisons mix types and balances drift. The v8.0 milestone already had a 100× money corruption bug from a `*100` round-trip — the ledger re-opens this exact wound because it sits between an integer rent column and a decimal-capable ledger.

**Why it happens:**
Inconsistent money representation across the schema (integer legacy columns vs. the CLAUDE.md numeric convention), plus classic float/rounding when allocating one payment across multiple charges.

**How to avoid:**
- **schema-time:** Make ledger money columns `numeric(10,2)` explicitly (charges *and* receipts) and document the integer↔numeric boundary. When deriving an expected charge from `leases.rent_amount` (integer), cast to `numeric(10,2)` at the boundary with a typed mapper — never arithmetic that can float. Absolutely no `*100`/`÷100` anywhere (v2.0 hard rule).
- **build-time:** Partial-payment allocation is deterministic integer-cent math: work in cents internally (`bigint`/`numeric` cents), allocate oldest-charge-first (or explicit user allocation), and assert the sum of allocations equals the payment to the cent. Never `float`.
- **ship-time:** Property test: sum of per-charge allocations == payment; balance never has >2 decimal places; a $100 payment across three $33.34/$33.33/$33.33 charges reconciles exactly.

**Warning signs:**
Balances ending in fractional cents; a tenant balance that never reaches exactly $0; ledger totals disagreeing with `expenses`/revenue by a few cents that grow over time.

**Phase to address:** Track D — Rent ledger (schema-time numeric decision + boundary mappers; build-time cent-exact allocation).

---

### Pitfall 10: Rent-ledger double-counting when it joins existing revenue analytics

**What goes wrong:**
Existing revenue analytics (`get_dashboard_data_v2`, the financial surfaces) derive revenue from `leases.rent_amount` — i.e. **expected** rent, treated as actuals because no payment data ever existed. The ledger introduces **actual** "amount received" data. If the dashboard now sums *both* the lease-derived expected revenue *and* the ledger receipts, every dollar is counted twice. PROJECT.md explicitly wants the ledger to "feed revenue analytics with actuals" — the trap is turning on the ledger feed without turning off the lease-rent-derived estimate, so the numbers double or wobble between the two definitions.

**Why it happens:**
Two definitions of "revenue" (expected-from-lease vs. received-in-ledger) coexisting during the migration. Analytics RPCs were written when only the estimate existed.

**How to avoid:**
- **build-time:** Pick one revenue definition per metric and label it. "Expected revenue" (from leases) and "Collected/received" (from ledger) are *different KPIs* — show both, never add them. Rewrite the revenue RPC to source actuals from the ledger and clearly rename the lease-derived figure to "scheduled/expected."
- **schema-time:** Ensure the ledger has a clean owner-scoped aggregation path so the analytics RPC can switch its source without ambiguity.
- **ship-time:** Reconcile: dashboard revenue before/after ledger launch for an owner with zero recorded receipts should read $0 collected (not the old expected figure silently relabeled), and expected should match the prior number exactly.

**Warning signs:**
Dashboard revenue jumps when the ledger ships; the same month shows two different revenue numbers on two surfaces; "collected" exceeds "expected" impossibly.

**Phase to address:** Track D — Rent ledger + Track C — Reporting consolidation (build-time single-definition-per-KPI; ship-time reconciliation).

---

### Pitfall 11: Editable ledger history instead of immutable entries

**What goes wrong:**
Treating the ledger like an editable spreadsheet — owners edit/delete a past "received $1,200" row directly — destroys the audit trail landlords need for tax and disputes. When a charge is wrong, an in-place edit erases what actually happened; a tenant dispute ("I paid in March") becomes unresolvable because the March entry was overwritten in June. Regenerating charges when lease terms change (Pitfall 12) also clobbers historical entries if they're mutable.

**Why it happens:**
Ledgers modeled as CRUD tables. It feels simpler to let owners fix a typo by editing the row.

**How to avoid:**
- **schema-time:** Append-only ledger. Corrections are new reversing/adjusting entries (`entry_type IN ('charge','payment','adjustment','reversal')`, each referencing the entry it corrects), not `UPDATE`/`DELETE`. RLS grants owners `SELECT`/`INSERT` but the "edit" UX writes an adjustment, not an update. `created_at` is authoritative and never changes.
- **build-time:** "Delete" in the UI posts a reversal entry; balance is always `SUM` of entries, never a stored mutable field.
- **ship-time:** RLS integration test: an owner cannot `UPDATE`/`DELETE` a historical ledger entry; balance recomputes from the entry stream.

**Warning signs:**
Owners asking "how do I undo a payment I entered wrong"; a balance field that's stored rather than summed; no way to answer "what did the ledger look like on date X."

**Phase to address:** Track D — Rent ledger (schema-time append-only design).

---

### Pitfall 12: Charge regeneration when lease terms change

**What goes wrong:**
Owner raises rent mid-lease from $1,200 to $1,300, or corrects a lease `start_date`. If expected charges are generated eagerly from lease terms, changing the lease either (a) silently rewrites already-posted historical charges (a $1,200 March charge becomes $1,300 retroactively) or (b) duplicates future charges. Deleting/soft-deleting a lease (status handling) can orphan or wipe its ledger history.

**Why it happens:**
Charges materialized from lease terms without a "generated through" watermark; no separation between "past charges are frozen" and "future charges follow current terms."

**How to avoid:**
- **schema-time:** Store each charge with the terms it was generated under (amount, period), and a per-lease `charges_generated_through` date. Term changes only affect periods *after* the change's effective date; already-posted charges are immutable (Pitfall 11).
- **build-time:** Charge generation is idempotent per `(lease_id, period)` (a UNIQUE guard, like `lease_reminders`), so re-running never duplicates. Rent changes create new-term charges from the effective date forward.
- **ship-time:** Test: raise rent mid-lease → historical charges unchanged, future charges reflect new rent, no duplicates. Soft-deleting a lease preserves its ledger history for tax.

**Warning signs:**
Historical charges change when a lease is edited; duplicate charges for one period; ledger loses rows when a lease is deactivated.

**Phase to address:** Track D — Rent ledger (schema-time charge-generation model with UNIQUE period guard).

---

### Pitfall 13: Public application intake — anonymous-write RLS and token guessability

**What goes wrong:**
The rental application is a public token URL per vacant unit with **no applicant account** — an anonymous (or service-role-backed) write path into an owner-scoped, RLS-protected database. Get this wrong and you either (a) open an `anon INSERT` policy so broad that anyone can write arbitrary rows / enumerate other owners' units, or (b) use a guessable/short token so applications can be submitted against units the sender never shared, or (c) leak the owner's or other applicants' PII back through the same public endpoint (the way `sign-lease-token` must gate the unsigned-PDF render).

**Why it happens:**
Anonymous writes are the opposite of the "RLS everywhere, owner-scoped" model the rest of the app uses. Developers reach for a permissive `anon` policy or a service-role edge function without the token being the actual credential.

**How to avoid:**
- **build-time:** Reuse the **exact `sign-lease-token` pattern** already proven in this codebase: `verify_jwt = false` edge function, 256-bit high-entropy token, stored only as a **SHA-256 hash**, looked up via SECURITY DEFINER RPC, rate-limited per IP, no raw errors leaked. The token *is* the credential and maps to exactly one vacant unit.
- **schema-time:** No blanket `anon INSERT` policy on the applications table. Writes go only through the SECURITY DEFINER RPC that validates the token hash and inserts a row scoped to that token's unit/owner. The public read side returns only the minimal context (property label, not owner PII or other applicants).
- **build-time:** One-application-per-token or per-token rate limiting; token single-use or time-boxed where appropriate.

**Warning signs:**
An `anon` role with `INSERT`/`SELECT` on the applications table in the RLS test suite; short/sequential tokens; the public endpoint returning fields beyond what the applicant needs.

**Phase to address:** Track D — Rental application intake (schema-time RLS design; build-time token-hash edge function mirroring `sign-lease-token`).

---

### Pitfall 14: Applicant PII under GDPR — deletion and retention with no account

**What goes wrong:**
Applicants submit name, email, phone, income, employment, prior-address, SSN-adjacent data — real PII — but have **no account**, so they can't self-serve a deletion request the way the owner can (`request_account_deletion`). GDPR/CCPA still grants the applicant deletion rights. Applications that never convert sit forever with sensitive PII, expanding breach surface and violating retention-minimization. The existing GDPR machinery anonymizes *owners*, not *applicant records* an owner holds.

**Why it happens:**
The GDPR design (30-day grace, `anonymize_deleted_user`) is built around authenticated users. Applicant PII is a new category of personal data held about non-users, with no deletion pathway.

**How to avoid:**
- **schema-time:** Define an application retention policy up front (e.g. purge/anonymize non-converted applications after N days) using the established archive-then-delete + `FOR UPDATE SKIP LOCKED` cron pattern. Add applicant records to the owner-deletion cascade/anonymization so deleting an owner also handles applicant PII.
- **build-time:** Provide an owner-facing "delete this application" that hard-removes PII (not soft-delete), and a documented process for an applicant emailing to request deletion (owner acts on their behalf). Minimize collected fields — don't collect SSN if screening isn't offered (screening is explicitly out of scope).
- **ship-time:** Privacy-policy copy must disclose applicant-data handling; retention cron verified.

**Warning signs:**
Applications table growing unbounded with PII; no retention job; no way to delete a single applicant's data; privacy policy silent on applicants.

**Phase to address:** Track D — Rental application intake (schema-time retention + owner-deletion cascade; build-time PII-minimal form).

---

### Pitfall 15: Public form spam and abuse

**What goes wrong:**
A public, unauthenticated intake form is a spam magnet: bots submit garbage applications, harvest the endpoint for injection, or flood an owner's inbox via the auto-notify. Without rate limiting and abuse controls, one vacant-unit link posted publicly becomes a fake-application firehose.

**Why it happens:**
Public write endpoints attract automated abuse; teams add the happy path first and bolt on anti-abuse later (or never).

**How to avoid:**
- **build-time:** Reuse `_shared/rate-limit.ts` (Upstash sliding window, already used on unauthenticated functions) per IP + per token. Add honeypot field / minimal challenge; validate + `escapeHtml` all fields (XSS in the owner's review UI and in any notification email). Cap applications per token/day.
- **build-time:** Owner notification for new applications must itself respect suppression + not be triggerable in a loop.
- **ship-time:** Load/abuse test the endpoint; confirm rate-limit returns and no unescaped applicant input reaches the owner's HTML email or dashboard.

**Warning signs:**
Spike of low-quality applications; owner reports spammy submissions; unescaped `<script>` in an applicant name rendered in the review UI.

**Phase to address:** Track D — Rental application intake (build-time rate-limit + honeypot + escaping).

---

### Pitfall 16: Notification center unbounded growth and retention

**What goes wrong:**
Surfacing the existing `notifications` table as an in-app inbox (bell + list) without a retention story means the table grows forever. Every mutation that "should notify" writes a row; after a year an active owner has tens of thousands of notifications, the inbox query slows, and there's no archival like the other tables have (`security_events`, `user_errors` all have 90d retention + archive).

**Why it happens:**
Notifications feel ephemeral so retention is forgotten; the inbox is built as "select all for user" with no bound.

**How to avoid:**
- **schema-time:** Give `notifications` a retention/archive policy consistent with the rest of the schema (e.g. archive read notifications after 90d via the established cron pattern). Index for the access pattern (already has `idx_notifications_user_id`, `idx_notifications_is_read`, `idx_notifications_created_at` — good; keep a composite `(user_id, is_read, created_at)` for the inbox+unread query).
- **build-time:** Inbox queries are paginated/bounded (`.range()`/`.limit()`, `{ count: 'exact' }`) — never unbounded `select('*')` (CLAUDE.md rule).
- **ship-time:** Verify retention cron exists before declaring the feature done.

**Warning signs:**
Notifications table with no cleanup cron; inbox page slows for long-tenured owners; unbounded select in the notifications hook.

**Phase to address:** Track B — Notification center (schema-time retention/index; build-time bounded queries).

---

### Pitfall 17: N+1 unread counts on every render

**What goes wrong:**
The bell badge needs an unread count. If each page render fires `SELECT count(*) FROM notifications WHERE user_id=? AND is_read=false` separately (and the inbox refetches on `refetchOnWindowFocus: true`, which is the global default), plus per-item reads, you get a chatty, N+1-ish pattern that hammers PostgREST — especially combined with the activity feed doing the same.

**Why it happens:**
Unread count treated as an independent query per component; not consolidated; `refetchOnWindowFocus` amplifies it.

**How to avoid:**
- **build-time:** Consolidate unread count into a single RPC or a `HEAD` request with `{ count: 'exact', head: true }` (the CLAUDE.md pattern: "stats consolidate via single RPCs, not multiple HEAD queries"). Use a `queryOptions()` factory (new `notification-keys.ts`) with a sane `staleTime` so the badge doesn't refetch on every focus. Consider realtime or a single dashboard RPC that returns unread count alongside other dashboard data rather than a standalone poll.
- **build-time:** Mutations (mark-read) invalidate the notification key + `ownerDashboardKeys.all` (existing convention), not a full refetch loop.

**Warning signs:**
Network tab shows repeated count queries on focus; PostgREST request volume climbs with the notification center live; badge flicker.

**Phase to address:** Track B — Notification center (build-time consolidated count RPC + query-key factory).

---

### Pitfall 18: Notification spam erodes trust

**What goes wrong:**
Wiring "notify on everything" (every maintenance status change, every lease edit, every payment logged) floods the bell until owners ignore it entirely — the notification center becomes noise and the feature's perceived value goes negative. Compounds with email if the same events also email.

**Why it happens:**
Every mutation gets a notification "for completeness" without editorial judgment about what an owner actually wants surfaced.

**How to avoid:**
- **build-time:** Curate notification-worthy events (lease expiring, application received, signature completed, compliance date due) vs. noise (routine edits). Respect `notification_settings` categories. De-duplicate/coalesce (one "3 leases expiring" not three rows). Separate in-app from email channels — not every in-app notification should also email.
- **ship-time:** Dogfood volume: how many notifications does a typical week generate? If it's dozens of low-value rows, prune.

**Warning signs:**
Dozens of notifications/day per owner; owners disabling notifications wholesale; identical notifications for one logical event.

**Phase to address:** Track B — Notification center (build-time event curation + settings respect).

---

### Pitfall 19: Legal notice generation — unauthorized practice of law (UPL) exposure

**What goes wrong:**
A "state-aware notice library" (pay-or-quit, cure-or-quit, entry, non-renewal) that fills jurisdiction-specific legal documents from user data can be construed as **unauthorized practice of law** if it presents itself as legal advice or guarantees legal sufficiency. If a generated notice is legally defective (wrong notice period, missing statutory language) and an owner's eviction gets tossed as a result, that's direct liability. Self-help eviction actions (lockout, utility shutoff) are illegal in all 50 states — if the product's copy or flow nudges toward "just serve this and change the locks," the exposure compounds.

**Why it happens:**
Treating legal notices like any other template merge. The line between "document automation tool" (permissible, the LegalZoom/Avail model) and "giving legal advice" (UPL) is about framing, disclaimers, and not exercising legal judgment on the user's behalf.

**How to avoid:**
- **build-time:** Frame as a **self-help document tool the owner completes**, not advice. Prominent, unavoidable disclaimer on every generated notice and in the flow: "not a law firm, not legal advice, not a substitute for an attorney; verify current local requirements." Do not claim the notice is court-ready, guaranteed compliant, or legally sufficient. Mirror the established norm (Avail, LegalTemplates, Rocket Lawyer all lead with "not a substitute for legal advice / we are not a law firm").
- **build-time:** Don't auto-calculate and assert a definitive "notice period" as legal fact without a "verify locally" caveat; surface the source/statute where possible but disclaim currency.
- **ship-time:** Legal-review the disclaimer language with counsel before launch; keep the honesty principle — never imply capabilities (legal guarantee) the product doesn't have.

**Warning signs:**
Copy that says "legally compliant," "court-ready," "guaranteed"; no disclaimer on the generated document; the flow implying the notice alone effects an eviction.

**Phase to address:** Track D — State-aware notice library (build-time disclaimer + framing; ship-time counsel review of copy).

---

### Pitfall 20: Stale state law in the notice library

**What goes wrong:**
State landlord-tenant law changes (notice periods, required language, just-cause rules). A notice library hardcoded once with 2026 rules silently generates outdated, defective notices in 2027. There's already a shipped example of this exact risk class in the codebase — the ToS `[Your State]` governing-law placeholder that stalled because jurisdiction data must be *right*, not guessed. Legal content has a maintenance cost most feature builds ignore.

**Why it happens:**
Legal rules encoded as static data/templates with no "as-of" date, no update process, and no per-state coverage boundary.

**How to avoid:**
- **schema-time:** Store notice templates as **data** (per-state rows) with an `effective_date` / `last_reviewed` stamp and a coverage flag, not hardcoded in components. Only expose states you've actually vetted; for un-vetted states, degrade honestly ("template not available for your state") rather than emit a wrong one — the honesty principle (never fabricate).
- **build-time:** Surface "last reviewed" to the owner. Design an update path (data edit, not migration) so law changes don't require a deploy.
- **ship-time:** Ship a bounded set of vetted states first; don't claim "all 50 states" on the marketing surface unless all 50 are actually covered (every claim maps to working code).

**Warning signs:**
Hardcoded notice periods in TSX; no `last_reviewed` date; marketing claims "all 50 states" while only a few are implemented; the `[Your State]` placeholder pattern reappearing.

**Phase to address:** Track D — Notice library (schema-time state templates as dated data; ship-time honest coverage claim).

---

### Pitfall 21: Reporting consolidation breaks bookmarked/linked URLs

**What goes wrong:**
Merging `/financials/*`, `/analytics/financial`, and `/reports/*` into one hub deletes/moves ~15 existing routes (`/financials/income-statement`, `/financials/cash-flow`, `/financials/balance-sheet`, `/financials/tax-documents`, `/analytics/financial`, `/reports/year-end`, `/reports/generate`, etc.). Owners have bookmarked these; emails and the sitemap may reference them. Moving without redirects returns 404s on paths users rely on — a regression the project's own constraints explicitly forbid ("Long-form legal URLs must 301, not 404 — external links/emails/sitemaps may reference them").

**Why it happens:**
Route consolidation focuses on the new IH and forgets the old paths are a contract with existing users and search engines.

**How to avoid:**
- **ship-time:** Add 301 redirects (in `next.config.ts`/`proxy.ts`) from every retired route to its new hub location — the same discipline used for the legal long-form URLs. Do NOT add speculative typo redirects (memory: no typo-courtesy redirects) — only redirect paths that genuinely existed.
- **ship-time:** Update `sitemap.ts`, any in-app nav, and any email links to the new paths.
- **build-time:** Prefer keeping deep-linkable sub-views (tabs/segments) so the hub still has addressable URLs for each report.

**Warning signs:**
Retired routes 404 instead of 301; sitemap still lists old paths; owner support "my bookmark is broken."

**Phase to address:** Track C — Reporting consolidation (ship-time redirect map + sitemap update).

---

### Pitfall 22: Losing E2E/tier-gate coverage during the route move

**What goes wrong:**
Report exports are tier-gated in the `export-report` edge function via `PREMIUM_REPORT_TYPES` (`year-end`, `1099`, `financial`, `income-statement`, `cash-flow`) + `checkTierEntitlement(GROWTH_AND_MAX_PLANS)`. Consolidating the surfaces can (a) silently drop the tier gate if the new hub calls a different export path, letting free-tier owners export premium reports (revenue leak), or (b) orphan the E2E smoke tests that pointed at the old routes so CI goes green while the reports are actually broken. The `owner-axe`/`e2e-smoke` CI projects target specific routes — moving routes without moving tests loses coverage.

**Why it happens:**
The tier gate lives in the edge function, not the route, so a route rewrite can bypass it if the new UI calls export differently. Tests are route-coupled.

**How to avoid:**
- **build-time:** Route every export through the existing `export-report` edge function so the `PREMIUM_REPORT_TYPES` gate and `gate_events` analytics are preserved. Don't reimplement export in the new hub.
- **ship-time:** Move the E2E smoke coverage to the new hub routes in the same PR; assert the tier gate still 402s a free-tier owner on premium report types. Perfect-PR review must diff old→new route test coverage.

**Warning signs:**
Free-tier account can export a year-end/1099 report; E2E suite still references deleted routes; `gate_events` stops recording report gate hits.

**Phase to address:** Track C — Reporting consolidation (build-time keep export edge fn; ship-time move + re-assert tier-gate E2E).

---

### Pitfall 23: Stale financial data from Next.js 16 caching

**What goes wrong:**
Next.js 16 `fetch` in Server Components is uncached by default, but if a financial reporting Server Component opts into the `'use cache'` directive (with `cacheLife('hours')`/`cacheTag`) for perf, then an owner who records a rent receipt or edits an expense sees **stale numbers** until the tag is revalidated. The mutation happens through TanStack Query / PostgREST, which does **not** invalidate Next.js's `use cache` layer — the two caches are independent. Financial dashboards showing last-hour's numbers after the owner just recorded a payment reads as "the app is broken/lying," which violates the honesty principle for money.

**Why it happens:**
Two caching layers (Next.js `use cache` server-side; TanStack Query client-side, `staleTime: 5min`, `refetchOnWindowFocus: true`) that don't know about each other. `use cache` invalidation requires `revalidateTag()`; TanStack invalidation requires `queryClient.invalidateQueries`.

**How to avoid:**
- **build-time:** For financial/ledger reads, prefer the existing TanStack Query + PostgREST path (client server-state) and do **not** wrap them in `'use cache'` with a long `cacheLife`. If a Server Component `use cache` is used, tag it (`cacheTag('financials:'+ownerId)`) and call `revalidateTag` from the mutation's Server Action — but this app's mutation pattern is client-side TanStack, so `revalidateTag` won't run. Keep money reads on one caching layer.
- **build-time:** Ledger/expense mutations invalidate the financial query keys + `ownerDashboardKeys.all` (existing convention) so revenue/analytics reflect the change immediately.
- **ship-time:** Test: record a receipt → dashboard revenue updates without a hard refresh.

**Warning signs:**
Financial number doesn't change after a mutation until refresh; `'use cache'` on a money-reading function; two surfaces showing different revenue for the same period.

**Phase to address:** Track C — Reporting consolidation + Track D — Rent ledger (build-time single-cache-layer for money + invalidate query keys).

---

### Pitfall 24: @modal parallel-route / interceptor gotchas (it broke once already)

**What goes wrong:**
The `(owner)` layout has a `@modal` parallel-route slot (`@modal/default.tsx` present). This subsystem has broken before: a `[...catchAll]` in a `@modal` slot **soft-200'd every unknown URL app-wide**, silently breaking 404s (documented in project memory). New v10.0 features are prime candidates for intercepting-route modals — rent-ledger entry, application detail, notification detail, notice preview. Adding a catch-all or misconfigured `default.tsx` in `@modal` can re-break 404s across the whole app, and diff review won't catch it (behavioral, not textual).

**Why it happens:**
Parallel/intercepting routes have non-obvious matching semantics; a `default.tsx` or catch-all in a slot affects global routing in ways that don't show up in a code diff.

**How to avoid:**
- **build-time:** If a new feature uses `@modal` intercepting routes, do NOT add a `[...catchAll]` in the slot. Keep `@modal/default.tsx` returning `null`. Prefer plain client-side modal state (shadcn `Dialog` driven by nuqs/Zustand) over intercepting routes unless deep-linkable modals are a hard requirement.
- **ship-time:** After any `@modal`/routing change, behaviorally probe 404s: `next start` + `curl -I` an unknown URL and assert a real 404 (the documented detection method), not a soft 200. This must be an explicit review checklist item.

**Warning signs:**
Unknown URLs return 200 instead of 404; a new `default.tsx` or catch-all appears under `@modal`; `NotFoundPage` stops rendering for bad URLs.

**Phase to address:** Any track adding modals (Track B notification detail, Track D ledger/application/notice) — build-time avoid catch-all; ship-time 404 behavioral probe.

---

### Pitfall 25: Suspense waterfalls in consolidated dashboard/report widgets

**What goes wrong:**
The consolidated reporting hub and the dashboard activity feed + notification center render many independent data widgets. If each widget's data is awaited sequentially in a parent Server Component (or nested `Suspense` boundaries chain), you get a request waterfall — each query blocks the next — and the hub feels slow. Heavy libs (`recharts`) compound this if not dynamically imported.

**Why it happens:**
Awaiting data fetches serially in one component instead of kicking them off in parallel; over-nesting `Suspense`.

**How to avoid:**
- **build-time:** Start independent fetches in parallel (`Promise.all` in a Server Component, or independent `Suspense`-wrapped children that each fetch their own data so they stream concurrently). Keep `recharts`/`react-markdown` on `next/dynamic` with `ssr:false` + CSS skeletons (existing CLAUDE.md rule). Consolidate related metrics into single RPCs (existing pattern) rather than one query per widget.
- **ship-time:** Check the network waterfall for the hub; independent widgets should fetch concurrently.

**Warning signs:**
Hub TTFB/paint grows with widget count; sequential (staircase) request waterfall in devtools; charts blocking initial render.

**Phase to address:** Track C — Reporting hub + Track B — Activity feed / notification center (build-time parallel fetch + dynamic import).

---

### Pitfall 26: Client/server boundary mistakes leaking service-role or over-shipping JS

**What goes wrong:**
New features tempt `'use client'` sprawl (a whole report page marked client for one chart) and, worse, importing server-only code (service-role client, edge secrets) into a client component. The app rule is Server Components by default, `'use client'` only for hooks/handlers/browser APIs, and the frontend **never** uses service role. A ledger/report component that pulls the admin client for "convenience" leaks the service key to the browser bundle.

**Why it happens:**
Reaching for client-side data fetching or admin privileges out of habit; not respecting the server/client split for new surfaces.

**How to avoid:**
- **build-time:** Server Components by default; push `'use client'` to the leaf that needs interactivity. Data access via PostgREST/RPC with the anon/auth client (RLS-scoped) — never the service role in frontend. `createClient()` inside each query/mutation (no module-level client), per CLAUDE.md hook rules.
- **ship-time:** `next build` + bundle check; grep the client bundle for service-role usage; typecheck/lint catch server-only imports.

**Warning signs:**
`'use client'` at the top of a data-heavy page; service-role key referenced in a component; large client bundles for report pages.

**Phase to address:** All tracks (build-time boundary discipline; ship-time bundle/`next build` gate).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse `sent_at` as "delivered" on `lease_reminders` instead of a real delivery-state column | No migration | Can't distinguish queued vs. sent → double-sends, no retry, no suppressed state | Never — add delivery-state columns before shipping in-house delivery |
| Read-then-write quota check (non-atomic) | Simple | Race lets owners exceed cap; "unlimited" becomes the only reliable tier | Never for enforcement; fine for advisory client-side meter only |
| Hard-block at quota with no grandfathering | Clean rule | Locks out existing over-quota (highest-value) owners on launch day → churn | Never on a live product with pre-enforcement usage; require grandfather report |
| Editable/CRUD ledger rows | Familiar spreadsheet UX | Destroys audit trail; tax/dispute defense gone; regeneration clobbers history | Never — append-only with adjustment entries |
| Sum lease-derived expected revenue + ledger receipts | "More complete" number | Double-counts every dollar; two revenue definitions collide | Never — one definition per KPI, labeled |
| Hardcode notice periods/templates in TSX | Ships fast | Silently defective when law changes; no `last_reviewed`; UPL risk | Never — templates as dated data, honest coverage |
| Blanket `anon INSERT` policy for the application form | Form "just works" | Anyone writes arbitrary rows / enumerates units; RLS model broken | Never — SECURITY DEFINER RPC gated on token hash |
| Notify on every mutation | Feels responsive | Notification spam → owners disable the feature; N+1 counts | Never — curate events, respect `notification_settings` |
| Skip retention on `notifications`/applications | One less cron | Unbounded PII/row growth; slow inbox; GDPR non-compliance | Never — every new table gets a retention story like the rest of the schema |
| Wrap money reads in `'use cache'` for perf | Fast reports | Stale financials after mutations (two cache layers) → looks like the app lies | Only with `revalidateTag` wired into a Server Action mutation; not with client-side TanStack mutations |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Resend (email) | Assuming `sendEmail` handles all suppression because "Resend checks its list" | Also check app `email_suppressions`, `is_notification_suppressed()` (CI guard), and `notification_settings` before sending; pipe bounces/complaints from `resend-webhook` into `email_suppressions` |
| Resend (email) | No idempotency on reminder/digest sends | Pass `Idempotency-Key` (already supported) keyed on the queue row id |
| n8n (being removed) | Drop the drainer in but leave `notify_n8n_lease_reminder` trigger wired → double delivery + lost suppression check | Atomically remove the trigger/webhook in the same migration; port the suppression check into the new sender |
| Supabase Edge (Deno) | Fire-and-forget insert (e.g. usage-metering row, gate_events) dropped when the isolate hibernates | Use `EdgeRuntime.waitUntil()` (the documented, already-hit gotcha in `tier-gate.ts`) |
| Supabase Storage | Meter from nullable `documents.file_size` while bucket drifts | Backfill + `NOT NULL` file_size, or meter from `storage.objects` size; reconcile on a schedule |
| Stripe (billing) | Cache the plan cap; let `past_due`/downgrade lock existing data | Resolve cap as a pure function of live `subscription_status`+`subscription_plan`; cap only new writes, never reads/downloads |
| pg_cron | Inline SQL in `cron.schedule()`; UTC date math for reminders | Named SECURITY DEFINER fn, `SET search_path=public`, `FOR UPDATE SKIP LOCKED`; date math in a fixed reference zone |
| PostgREST | Unbounded `select('*')` for inbox/ledger/applications | `.range()`/`.limit()` + `{ count: 'exact' }`; specific columns for lists |
| Sentry | New cron (drainer, digest, retention) with no monitor | Add a Sentry cron check-in like `payment-reminders` so silent failure is visible |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 unread-count queries amplified by `refetchOnWindowFocus:true` | Repeated count queries on every focus | Single count RPC / `HEAD count:exact`; query-key factory with `staleTime` | As soon as the bell is on every page |
| Unbounded notifications/activity table | Slow inbox, growing DB | Retention + archive cron; composite index `(user_id,is_read,created_at)` | Long-tenured owners (~1yr) |
| Ledger balance recomputed by summing all entries per render | Slow ledger page for busy units | Bounded pagination; consider a materialized/rolling balance snapshot with append-only detail | Units with hundreds of entries |
| Suspense waterfall across hub widgets | Staircase request timeline; slow paint | Parallel fetch / independent Suspense children; single consolidated RPCs | Reporting hub with 5+ widgets |
| Storage meter recomputed by summing all documents at render | Slow Settings/usage page | Maintain a running usage figure updated transactionally on upload/delete | Owners with thousands of documents |
| Reminder drainer scanning the whole queue each run | Slow cron, lock contention | `WHERE delivery_status='queued' ... FOR UPDATE SKIP LOCKED LIMIT N` | Post-outage backlog |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Guessable/short application token | Anyone submits/enumerates against units | 256-bit token stored as SHA-256 hash, looked up via SECURITY DEFINER RPC (mirror `sign-lease-token`) |
| Blanket `anon` RLS write on applications | Arbitrary writes, owner data exposure | No anon table policy; writes only through token-gated RPC; public read returns minimal context |
| Applicant PII with no deletion path | GDPR/CCPA violation, breach surface | Retention/purge cron for non-converted apps; include applicant PII in owner-deletion cascade; minimal fields |
| Unescaped applicant input in owner email/UI | Stored XSS in the owner's dashboard/email | `escapeHtml()` all applicant fields (existing `_shared/escape-html.ts`) |
| Service-role client imported into a client component for reports/ledger | Service key in browser bundle | Frontend uses anon/auth client only; RLS-scoped; `next build` bundle check |
| Reminder/digest emailing PII to an unverified/typo'd owner address | PII leak | Validate address; honor `email_suppressions`; no PII beyond what's needed |
| Notice library implying legal sufficiency | UPL exposure + liability if notice is defective | "Not legal advice / not a law firm" disclaimer; no "court-ready/guaranteed" claims |
| Cross-owner leakage in new RPCs (ledger, applications, notifications) | Owner A sees Owner B data | RLS on every new table; owner-scoped policies; add cases to `tests/integration/rls/` (dual-client ownerA/ownerB) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Reminder storm at launch | Owner buried in stale "lease expiring" emails, trust destroyed | Stale-skip + per-owner cap + backfill dry-run |
| Hard quota lockout on existing over-quota owner | Can't upload the doc they need today; churn | Soft-enforce + grandfather + never block deletes/downgrade |
| Ledger that can't answer "what did they pay in March" | Owner can't defend a dispute or file taxes | Append-only entries; balance = sum; history immutable |
| Notification spam | Owners disable notifications entirely | Curate events; coalesce; respect `notification_settings` |
| Broken bookmarks after report consolidation | Owner's saved report link 404s | 301 old routes → new hub; update sitemap |
| Notice presented as guaranteed legal doc | Owner relies on it, eviction tossed | Disclaimer + "verify locally" + honest state coverage |
| Financial number stale after recording a payment | Looks like the app is lying about money | One cache layer for money; invalidate query keys on mutation |
| "All 50 states" notice claim vs. few implemented | Trust kill; honesty-principle violation | Only claim states actually covered; degrade honestly otherwise |

## "Looks Done But Isn't" Checklist

- [ ] **Renewal reminders:** email sends in the happy path — but verify: dedup on *send* (not just row), suppression list honored, `notification_settings` opt-out honored, stale/backlog skipped, timezone-correct send date, n8n trigger removed, Sentry cron monitor present.
- [ ] **E-sign metering:** cap enforced — but verify: atomic under concurrency, resets on the right monthly boundary, "unlimited" Max truly unlimited, downgrade doesn't lock, upgrade CTA fires (`gate_events` row written via `waitUntil`).
- [ ] **Storage quota:** meter shows a number — but verify: meter matches actual bucket, `file_size` backfilled/NOT NULL, over-quota is soft (upgrade prompt) not hard 403, existing over-quota owners grandfathered, deletes still allowed.
- [ ] **Rent ledger:** records payments — but verify: numeric money (not integer truncation), partial-payment allocation reconciles to the cent, entries immutable/append-only, charge regeneration doesn't rewrite history, revenue analytics not double-counted, ledger survives lease soft-delete.
- [ ] **Application intake:** form submits — but verify: token is hashed + high-entropy, no anon table write policy, rate-limited + honeypot, fields escaped, PII retention/deletion path exists, privacy policy updated, one-per-token.
- [ ] **Notification center:** inbox renders — but verify: retention cron, bounded queries, consolidated unread count (no N+1), events curated (no spam), mark-read invalidates keys, RLS owner-scoped.
- [ ] **Activity feed:** shows activity — but verify: bounded/paginated, RLS `activity_select_own` respected, no unbounded select.
- [ ] **Notice library:** generates a PDF — but verify: disclaimer present + unavoidable, no "court-ready/guaranteed" copy, templates dated data (not hardcoded), only vetted states claimed, delivery tracked.
- [ ] **Reporting hub:** shows reports — but verify: old routes 301 (not 404), sitemap updated, tier-gate on exports preserved (free-tier 402s on premium), E2E moved to new routes, single revenue definition per KPI.
- [ ] **Owner digest:** emails a report — but verify: correct month boundary (timezone), suppression honored, idempotent, doesn't double-send with reminders, PDF renders (satori hsl-only if using satori path).
- [ ] **Any modal feature:** modal opens — but verify: no `[...catchAll]` in `@modal`, unknown URLs still 404 (behavioral probe), `default.tsx` returns null.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Reminder double-send / storm | MEDIUM | Kill the drainer (app_config flag), mark backlog `suppressed`, add delivery-state column + Idempotency-Key, apologize if owner-visible |
| Quota race over-cap | LOW | Make the gate atomic (RPC with `WHERE used < cap`); reconcile counters; usually no data loss |
| Retroactive lockout of over-quota owners | MEDIUM | Ship grandfather patch (raise effective cap to current usage); switch hard-block to soft; comms to affected owners |
| Ledger money corruption | HIGH | Money bugs are trust-critical (v8.0 100× precedent) — halt, audit every balance, fix representation, re-derive from append-only entries; property-test before re-enabling |
| Double-counted revenue | MEDIUM | Pick one definition, relabel; re-point analytics RPC to the single source; reconcile against a known owner |
| Anon-write RLS hole | HIGH | Revoke the anon policy immediately, move to token-gated RPC, audit for injected rows, rotate tokens |
| Applicant PII with no deletion | MEDIUM | Add retention cron + owner-delete action; purge stale apps; update privacy policy |
| Broken report bookmarks | LOW | Add 301 redirects + update sitemap (fast follow) |
| Tier-gate export regression | MEDIUM | Route exports back through `export-report` edge fn; add E2E asserting free-tier 402; audit for leaked exports |
| @modal 404 breakage | LOW–MEDIUM | Remove the catch-all/fix `default.tsx`; behaviorally re-verify 404s with `next start`+`curl -I` |
| UPL/defective notice exposure | HIGH | Add disclaimers, remove sufficiency claims, counsel review; potentially pull un-vetted state templates |

## Pitfall-to-Phase Mapping

Phases 52+ are TBD in ROADMAP.md; mapped here by track + feature so the roadmapper can bind to concrete phase numbers. "When" = the phase-time within that phase.

| Pitfall | Prevention Phase (track/feature) | When | Verification |
|---------|----------------------------------|------|--------------|
| 1 Reminder double-send | A / Renewal reminders | schema+build+ship | One delivery path; delivery-state col; Idempotency-Key; n8n trigger dropped |
| 2 Timezone-wrong send dates | A / Reminders + D / Digest + Compliance | schema+build | Boundary/DST unit tests pass |
| 3 Reminder storm after downtime | A / Renewal reminders | build+ship | Backfill dry-run count reviewed; stale-skip works |
| 4 Suppression-list bypass | A / Reminders (shared `shouldSendTo`) | build+ship | CI shows zero sends to synthetic owners; opt-out honored |
| 5 Quota counter race | A / E-sign + Storage metering | schema+build | Concurrency test: exactly `cap` succeed |
| 6 Retroactive lockout / grandfathering | A / Storage + E-sign | build+ship | Pre-launch over-quota report; soft-enforce verified |
| 7 Metering drift | A / Storage metering | schema+build+ship | Reconciliation job; `file_size` NOT NULL |
| 8 Plan-downgrade edges | A / Metering (+billing) | build+ship | Upgrade/downgrade/cancel/past_due matrix |
| 9 Ledger money corruption | D / Rent ledger | schema+build | Cent-exact allocation property test; no `*100` |
| 10 Revenue double-counting | D / Ledger + C / Reporting | build+ship | Reconcile before/after; one definition per KPI |
| 11 Editable history | D / Rent ledger | schema | RLS test: no UPDATE/DELETE on entries |
| 12 Charge regeneration | D / Rent ledger | schema+build | Mid-lease rent change leaves history intact |
| 13 Anon-write RLS / token | D / Application intake | schema+build | RLS suite: no anon table write; hashed token |
| 14 Applicant PII / GDPR | D / Application intake | schema+build | Retention cron; owner-delete cascade; policy updated |
| 15 Public-form spam | D / Application intake | build+ship | Rate-limit + honeypot; escaped input |
| 16 Notification unbounded growth | B / Notification center | schema | Retention cron exists; composite index |
| 17 N+1 unread counts | B / Notification center | build | Consolidated count RPC; query-key factory |
| 18 Notification spam | B / Notification center | build+ship | Curated events; `notification_settings` respected |
| 19 UPL exposure | D / Notice library | build+ship | Disclaimer on every notice; counsel-reviewed copy |
| 20 Stale state law | D / Notice library | schema+ship | Templates as dated data; honest state coverage |
| 21 Broken bookmarks | C / Reporting consolidation | ship | 301s for all retired routes; sitemap updated |
| 22 Lost E2E / tier-gate | C / Reporting consolidation | build+ship | Free-tier 402 on premium export; E2E on new routes |
| 23 Stale financial cache | C / Reporting + D / Ledger | build+ship | Mutation updates money surfaces without refresh |
| 24 @modal 404 breakage | B/D modal features | build+ship | Behavioral 404 probe (`next start`+`curl -I`) |
| 25 Suspense waterfalls | C / Hub + B / Feed | build+ship | Parallel-fetch network timeline; dynamic imports |
| 26 Client/server boundary | All tracks | build+ship | `next build` bundle check; no service-role in client |

## Sources

- Live schema + migrations (HIGH): `20260222110100_phase56_schema_foundations.sql` (`lease_reminders`), `20260224091106_payment_reminders_cron.sql`, `20260611141843_notification_suppression_list.sql` (`is_notification_suppressed`), `20260418140000_demolish_rent_and_tenant_portal.sql` (dropped `rent_payments`/`payment_reminders`), `20251101000000_base_schema.sql` (`notifications`, `notification_logs`, `activity`, `expenses` integer amount, `leases` integer rent_amount), `20260219100002_create_email_suppressions.sql`, `20251216120000_notification_settings.sql`.
- Edge functions (HIGH): `_shared/tier-gate.ts` (tier gate + `EdgeRuntime.waitUntil` gotcha), `_shared/resend.ts` (`sendEmail`, Idempotency-Key, Resend suppression), `sign-lease-token/index.ts` (256-bit hashed-token anon pattern), `export-report/index.ts` (`PREMIUM_REPORT_TYPES` tier gate), `resend-webhook/index.ts` (bounce/complaint events), `_shared/rate-limit.ts`.
- Project docs (HIGH): `.planning/PROJECT.md` (v10.0 tracks, constraints), CLAUDE.md (money/integer, RLS, PostgREST, `@modal`, honesty, no-fabrication rules), MEMORY.md (parallel-route catch-all 404 break, timezone sweep, 100× money bug, `[Your State]` placeholder, no typo redirects, edge-deploy 401).
- Next.js 16 caching (HIGH): Context7 `/vercel/next.js` v16.2.x — `use cache` directive, `cacheLife`/`cacheTag`, `revalidateTag`, uncached `fetch` default in Server Components.
- UPL / legal-notice norms (MEDIUM): web survey of Avail, LegalTemplates, Rocket Lawyer, LawDepot disclaimers ("not a law firm / not a substitute for legal advice"); self-help eviction illegal in all 50 states. https://www.rocketlawyer.com/real-estate/landlords/property-management , https://legaltemplates.net/form/eviction-notice/ , https://www.lawdepot.com/us/real-estate/eviction-notice-landlord-forms/

---
*Pitfalls research for: adding reminder/digest email, metering/quotas, rent ledger, public intake, notification center, legal notices, and reporting consolidation to TenantFlow (existing Next.js 16 + Supabase landlord SaaS)*
*Researched: 2026-07-19*
