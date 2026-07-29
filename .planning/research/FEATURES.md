# Feature Research

**Domain:** Landlord-only property-management SaaS — v10.0 canonical feature expansion (Stessa / Avail / TurboTenant / RentRedi / Buildium / Baselane / Landlord Studio / TenantCloud landscape)
**Researched:** 2026-07-19
**Confidence:** HIGH (competitor behaviors verified against vendor help-centers and docs; positioning constraints cross-checked against PROJECT.md)

## Positioning Guardrails (apply to every feature below)

Three constraints from PROJECT.md are load-bearing and override any "table stakes" the competitor set implies:

1. **Tenants are records, never users.** No applicant/tenant login, portal, or auth account — ever. Every competitor "table stakes" that assumes a tenant-side app (autopay, tenant-submitted applications, two-way in-app chat, tenant ledger view) collapses to an **owner-side record-keeping** equivalent for us.
2. **No rent-payment facilitation.** The rent ledger is bookkeeping only. No ACH/card rails, no "Pay Now," no autopay, no payout events. Landlords *log* money that moved elsewhere.
3. **No tenant screening.** Rental application intake collects and organizes data; it does **not** run credit/criminal/background/eviction reports. Screening is disclaimed and handed off to the landlord's own FCRA-compliant provider.

These are not limitations to apologize for — they are the product's differentiated stance (simpler, cheaper, no compliance surface for payments/screening). Copy must frame them as intentional.

---

## Per-Feature Analysis

Each feature: **table stakes** (competitors have it, users penalize absence), **differentiator** (where we can win), **anti-feature** (looks good, creates problems or violates positioning), complexity, and dependencies on existing TenantFlow features.

### 1. Renewal reminder delivery (in-house) — Track A

| Category | Finding |
|----------|---------|
| Table stakes | Lease-expiration reminders that actually send. Avail/RentRedi/Buildium all fire email alerts ahead of expiry. This is *sold today* but delivery is dead (n8n `wf-lease-reminder.json` disabled) — the gap is fulfillment, not scope. |
| Differentiator | Configurable lead windows (90/60/30-day) tied to the lease record, with a per-lease "reminder sent" audit trail. |
| Anti-feature | Auto-generating a renewal *offer* or auto-renewing the lease. Reminder ≠ action. Keep it a nudge to the owner, not an automated legal instrument. |

- **Complexity:** LOW-MEDIUM. Queue + cron already live; only the send path is missing.
- **Dependencies:** `lease_reminders` queue + cron (exists), Resend deliverability (exists), lease records (exists). Replaces the n8n hop with an edge function draining the queue.
- **Competitor grounding:** Avail provides rent-increase and lease-renewal notice emails; RentRedi surfaces lease-renewal reminders.

### 2. E-sign monthly metering — Track A

| Category | Finding |
|----------|---------|
| Table stakes | If you sell "25 e-signs/month," the counter must exist and enforce. Every metered-tier SaaS (DocuSign, HelloSign) meters envelopes. Today there is a tier gate but zero metering. |
| Differentiator | In-context usage meter ("18 of 25 used this month") + upgrade prompt at cap, making Max "unlimited" a real value anchor. |
| Anti-feature | Hard-blocking a signature mid-flow with no grace. Soft-cap with an upgrade CTA converts better and avoids stranding a half-signed lease. |

- **Complexity:** LOW. Count rows in the existing signature table per calendar month at the `lease-signature` tier-gate call site.
- **Dependencies:** `lease-signature` edge function + tier gate (exists), `pricing.ts` tier limits (exists), token e-sign subsystem (exists).
- **Competitor grounding:** DocuSign/Dropbox Sign meter envelopes per plan; this is standard metered-feature behavior.

### 3. Storage quota metering + enforcement — Track A

| Category | Finding |
|----------|---------|
| Table stakes | Advertised GB caps (1/10/50/Unlimited) require a usage meter. Dropbox/Box/Google Workspace all show a usage bar; a cap with no meter reads as vaporware. |
| Differentiator | Per-owner usage bar in Settings + soft-enforce at upload with an upgrade prompt, computed from Supabase Storage object sizes. |
| Anti-feature | Silent hard-fail at the cap, or counting deleted/soft-deleted objects. Compute against live objects only; warn before blocking. |

- **Complexity:** MEDIUM. Aggregating bucket object sizes per owner (RPC over storage metadata) + enforcement hook at the upload boundary.
- **Dependencies:** Document vault + Supabase Storage (exists), `pricing.ts` quotas (exists), Settings surface (exists). Receipt-photo upload (feature #12) counts against the same meter — build the meter first.
- **Competitor grounding:** Standard SaaS storage-meter pattern (Dropbox/Box usage bars).

### 4. In-app notification center — Track B

| Category | Finding |
|----------|---------|
| Table stakes | Bell icon + unread count + dropdown/inbox; persistent, browsable log; mark-read / mark-all-read; click-through to the source record. Users scan in ~2 seconds and expect who/what/when frontloaded. |
| Differentiator | Grouping by day + type-based filter tabs (leases / maintenance / compliance / billing); the notification center becomes the "what changed since I last logged in" home. |
| Anti-feature | Notifying on *everything* (notification fatigue — the #1 documented failure mode) and building real-time websocket infrastructure for a low-frequency landlord workflow. Also: **do not re-add SMS/browser-push toggles** with no delivery behind them (v10.0 explicitly removes the dishonest toggles). |
| Anti-feature | Cross-tenant leakage. Multi-tenant scoping (each owner sees only their own) is the one hard requirement most guides under-emphasize — RLS handles it, but every notification query must be owner-scoped. |

- **Complexity:** MEDIUM. Backend tables exist; the work is UX (bell, inbox, read-state, grouping) and wiring producers.
- **Dependencies:** `notifications` / `notification_logs` tables + typed `inApp` channel (exist, orphaned), query-key factories, app shell for bell placement. Retention: reuse the archive-then-delete cron pattern (e.g., 90d) already established for `security_events`/`user_errors`.
- **Competitor grounding:** Standard B2B SaaS notification-inbox pattern (Courier/SuprSend design guides); in-app-first with email escalation for unread.

### 5. Dashboard activity feed — Track B

| Category | Finding |
|----------|---------|
| Table stakes | Chronological "recent activity" list on the dashboard: who did what, when. Buildium/AppFolio tie an activity/audit history to each profile. |
| Differentiator | Cross-entity feed (lease created, payment logged, maintenance closed, notice served) as a single timeline — leveraging the existing `activity` table + RPC. |
| Anti-feature | Duplicating the notification center. Draw the line clearly: **activity feed = "what happened in my portfolio" (historical, no action needed)**; **notification center = "what needs my attention" (actionable, read/unread state)**. Same event may appear in both, but the feed is not marked read/unread. |

- **Complexity:** LOW-MEDIUM. `activity` table + `get_user_dashboard_activities` RPC already exist; this is a surfacing task.
- **Dependencies:** `activity` table + `get_user_dashboard_activities` RPC (exist, orphaned), dashboard surface (exists).
- **Competitor grounding:** Buildium's per-profile history logs; AppFolio's audit log of communications with timestamps.

### 6. Unified reporting hub — Track C

| Category | Finding |
|----------|---------|
| Table stakes | One place for reports. Stessa/Landlord Studio/Rentec present a single Reports menu (income statement, cash flow, rent roll, Schedule E, owner statement). TenantFlow currently triplicates this across `/financials/*`, `/analytics/financial`, `/reports/*`. |
| Differentiator | A single hub that spans the *new actuals* — with the rent ledger live (feature #7), reports gain real collected-vs-expected and delinquency data, not just logged expenses. |
| Anti-feature | Building new report types during consolidation. This is a *consolidation* phase — unify the three surfaces first; new reports (owner digest #13, Schedule E #12) attach after. Scope creep here balloons the diff. |

- **Complexity:** MEDIUM (mostly IA/routing + de-duplication, not new computation).
- **Dependencies:** existing financial statements (balance sheet, cash flow, income statement, NOI, year-end PDF), expense tracking, dashboards. Consumes rent ledger (#7) and Schedule E mapping (#12) once those land.
- **Competitor grounding:** Stessa/Landlord Studio single Reports surface with a fixed report catalog.

### 7. Rent ledger — record-keeping only — Track D (DEEP DIVE)

This is the highest-nuance feature. Semantics, grounded in Stessa's Tenant Ledger and Landlord Studio:

**Charge generation from lease terms**
- Monthly rent charge auto-posts on the lease's due-day (Stessa auto-adds rent on the 1st of each month once lease dates + amount are configured). Derive `amount` and `due_day` from the existing lease record.
- Manual one-time charges for utilities, late fees, damage reimbursements, deposits — an "Add Charge" affordance (Stessa's exact pattern).

**Recording payments ("mark received")**
- Since there is **no payment processing**, "mark received" is a manual entry: date received, amount, and a free-text/enumerated **method** field (cash / check / Zelle / Venmo / money order / bank transfer). Method is a *label*, not a rail.
- Payment applies against the outstanding balance (oldest-charge-first is the common default; allow applying to a specific charge for clarity).

**Partial payments**
- Each partial payment is its own ledger entry; the running balance updates and stays visible. Worked example from the domain: March rent $1,500 → +$50 late fee = $1,550 → $1,000 partial payment = $550 remaining → final payment = $0. This exact behavior is table stakes.

**Late fees**
- Both Stessa and Landlord Studio record a late fee as a **charge line**, not a separate subsystem. Table stakes = manual "add late fee" charge. **Differentiator (optional, risky):** a per-lease auto-late-fee rule (amount + grace days). Flag as an anti-feature risk: auto-posting fees can create disputes and, in some states, fees exceeding statutory caps — keep it owner-initiated by default, opt-in per lease at most.

**Balance math**
- Running balance = Σ(charges) − Σ(payments + credits), scoped per **lease/tenancy** (and rollup per unit and per property). Overpayment becomes a **credit / prepaid rent**, not a negative charge.
- Adopt Stessa's **"Calculate Since date + starting balance"** pattern: let the owner set an opening balance and start-date so they need not backfill full history when adopting mid-lease. This is the single biggest onboarding-friction reducer.

**Feeds analytics with actuals**
- Charges = *expected* revenue; payments = *actual* collected. This finally makes **collection rate** and **delinquency** real metrics — which v2.0 correctly *refused to fabricate* when no payment data existed. Note for roadmap: the dashboard's dropped `collection_rate` KPI can be honestly reintroduced once the ledger provides actuals.

| Category | Finding |
|----------|---------|
| Table stakes | Auto-generated monthly charges, mark-received, partial payments, per-tenant running balance, late-fee-as-charge, opening-balance import. |
| Differentiator | Opening-balance "Calculate Since" onboarding; actuals feeding real collection-rate/delinquency analytics; per-property/unit/tenant rollups. |
| Anti-feature | ANY payment rail — "Pay Now" link, ACH, card, autopay, tenant-facing ledger view, payout events. Violates positioning. Also avoid a tenant-side balance notification (tenants aren't users). Auto-late-fees default-on (dispute/liability risk). |

- **Complexity:** HIGH (new tables: `rent_charges`, `rent_payments`/`ledger_entries`; charge-generation cron; balance RPC; per-scope rollups; opening-balance logic).
- **Dependencies:** leases (rent amount, due day, dates), tenants/lease_tenants (charge attribution), existing revenue analytics + financial statements (consumes actuals), dashboard KPIs. Charge-generation cron follows the established named-SECURITY-DEFINER + 3 AM UTC + `FOR UPDATE SKIP LOCKED` conventions. `amount` columns store dollars as `numeric(10,2)` per the money convention.
- **Competitor grounding:** Stessa Tenant Ledger (auto-rent-on-1st, add-charge, manual payment entry, running balance, calculate-since); Landlord Studio rent ledger (partial payments as discrete entries, late-fee line, live balance).

### 8. Digital rental application intake — Track D (DEEP DIVE)

**Flow without applicant accounts**
- Public token URL per vacant unit, reusing the existing `/sign/[token]` pattern (no login). Applicant fills a form → creates an **application record** → owner reviews → **convert-to-tenant**. No account is ever created for the applicant.

**Standard field set (from TurboTenant/Avail applications)**
- Personal: full name, contact email + phone, date of birth.
- Residence history: current + prior addresses, rent/own, move-in dates, reason for moving, landlord references (competitors ask ~3 years of history).
- Employment/income: employer, title, tenure, income, optional pay-stub upload.
- Household: occupants, pets, vehicles, smoking.
- References + emergency contact.

**SSN / screening handoff (critical positioning + liability boundary)**
- Competitors collect SSN *because they run screening*. **TenantFlow does not screen** — therefore **do not collect SSN** (collecting sensitive PII you have no use for is pure liability). This is a deliberate divergence from the competitor field set and should be stated as such.
- Disclaim clearly: TenantFlow organizes the application; it does **not** provide credit/criminal/eviction/background reports. Screening (and all FCRA duties — written consent, adverse-action notices, Summary of Rights, secure handling) is the **landlord's responsibility** via their own FCRA-compliant provider. The FTC and every screening vendor place these duties on the landlord regardless of tooling — so the safe pattern is an explicit "we don't screen; here's what you're responsible for" disclaimer plus a link-out, not a built-in report.

| Category | Finding |
|----------|---------|
| Table stakes | Public no-login application link, standard field set, document upload, owner review queue, convert-to-tenant. |
| Differentiator | Token-link reuse of the proven e-sign rails; direct application→tenant-record conversion (no re-keying); "no screening, no SSN" as a privacy stance. |
| Anti-feature | Built-in screening / background / credit reports (positioning — never re-add; was demolished). Applicant accounts/logins (positioning). Collecting SSN with no screening use (liability). Auto-adverse-action or accept/reject automation (FCRA landmine). |

- **Complexity:** HIGH (public form, token issuance per unit, application table + RLS, review UI, conversion mapper application→tenant).
- **Dependencies:** `/sign/[token]` token pattern (exists), units/vacancy state (exists), tenants records + conversion (exists), document vault for uploaded docs (exists), Resend for applicant confirmation email (exists). Turnover workflow (#14) re-lease step can hand off to this.
- **Competitor grounding:** TurboTenant/Avail online application field set and no-cost application flow; FTC "Using Consumer Reports" places FCRA duties on the landlord.

### 9. Tenant communication log — Track D

| Category | Finding |
|----------|---------|
| Table stakes | Log calls, notes, and emails tied to a tenant/lease/property profile with timestamps; a complete browsable history per contact. Buildium tracks emails in profile history; AppFolio keeps an audit log of all sent communications with timestamps. |
| Differentiator | **Email-from-app via Resend with auto-logging** — send an email to a tenant and the outbound message is automatically written to the log (no manual copy). Manual call/note entries fill the gaps. |
| Anti-feature | Two-way real-time chat / SMS threads / tenant-portal messaging. Tenants aren't users — there is no inbound channel to render. Keep it an **owner-side record** (outbound emails + manually logged calls/notes), not a conversation UI. Also avoid re-adding an SMS channel (honesty constraint). |

- **Complexity:** MEDIUM (communication_log table + RLS, timeline UI per tenant, Resend send + auto-log hook).
- **Dependencies:** tenants/lease records (exists), Resend (exists), document vault (attach correspondence, exists). Notices (#10) delivery events should also write to this log.
- **Competitor grounding:** Buildium profile-tied email history; AppFolio communication audit log.

### 10. State-aware notice library — Track D (DEEP DIVE)

| Category | Finding |
|----------|---------|
| Table stakes | A form library with the common landlord notices: **pay-or-quit**, **cure-or-quit**, **notice of entry**, **non-renewal / lease termination**, plus rent-increase. Avail and RentRedi both ship state-specific notice/forms libraries; Avail markets templates "reviewed by lawyers." |
| Table stakes | Delivery tracking — when a notice was generated/served, on which lease. |
| Differentiator | Building notices on the **existing lease-template rails** (merge lease/tenant/property fields into the notice), plus writing a delivery event into the communication log (#9) and notification center (#4). State-awareness = state-specific notice-period defaults surfaced as guidance. |
| Anti-feature | **Claiming legal validity / "attorney-reviewed"** unless you actually pay for and maintain that review per state — defective notices get eviction cases dismissed, so an overclaim here is real liability. Also: auto-serving notices, auto-filing evictions, or computing legally-binding cure periods you present as authoritative. |
| Anti-feature | Presenting the tool as legal advice. Every competitor and template source wraps these in a **"not legal advice — consult an attorney / your local housing agency"** disclaimer. Adopt the same disclaimer pattern verbatim in spirit. |

- **Complexity:** MEDIUM-HIGH (notice template set × states, merge-field engine reuse, PDF generation, delivery tracking, per-state notice-period data, disclaimer surfaces). State coverage is the cost driver — consider launching with a curated subset of states/notice types and expanding.
- **Dependencies:** lease-template rails + merge fields (exists), PDF generation (exists — year-end PDF/lease PDF via pdf-lib), document vault (store served notices, exists), communication log (#9) + notification center (#4) for delivery tracking. Governing-law/state data ties to the same jurisdiction gap noted in the ToS `[Your State]` placeholder (MEMORY: MKTUI-02) — the state model should be shared.
- **Competitor grounding:** Avail state-specific notices "reviewed by lawyers"; RentRedi state-specific leases/laws resources; template sources universally carry "not legal advice / consult an attorney" disclaimers and warn that defective notices dismiss eviction cases.

### 11. Compliance & key-date tracking — Track D

| Category | Finding |
|----------|---------|
| Table stakes | Track expiration/renewal dates for insurance, business license, property tax, inspections, LLC filings, HOA — with reminders at increasing urgency. PropertyTools/Remindax/Re-Leased all center on this: centralized dates + automated alerts replacing spreadsheets. |
| Differentiator | Reuse the **existing reminder queue** (same infra as renewal reminders #1) so compliance dates fire through one proven pipeline; attach the supporting document (policy PDF, license) from the vault to each date. |
| Anti-feature | Positioning yourself as a compliance *guarantor* (implying legal completeness of the checklist). Present it as a **date tracker**, not a regulatory-compliance certification. Avoid AI "extract dates from any PDF" as a v1 promise — it's a differentiator competitors tout but is high-effort and error-prone; manual date entry is the honest MVP. |

- **Complexity:** MEDIUM (compliance_dates table + RLS, reminder scheduling, per-property/portfolio dashboard).
- **Dependencies:** reminder queue + cron (exists, shared with #1), document vault (attach supporting docs, exists), notification center (#4) + digest (#13) for surfacing.
- **Competitor grounding:** PropertyTools (insurance renewals, property taxes, lease renewals, LLC filings, HOA); Remindax (leases, contracts, inspections, permits, insurance with automated alerts).

### 12. Schedule E expense mapping + receipt photos — Track D (DEEP DIVE)

**Category set (IRS Schedule E, Part I, lines 5–19 — this is the canonical mapping Stessa and Landlord Studio use):**

| Line | Category |
|------|----------|
| 5 | Advertising |
| 6 | Auto & Travel |
| 7 | Cleaning & Maintenance |
| 8 | Commissions |
| 9 | Insurance |
| 10 | Legal & Professional Fees |
| 11 | Management Fees |
| 12 | Mortgage Interest (paid to banks) |
| 13 | Other Interest |
| 14 | Repairs |
| 15 | Supplies |
| 16 | Taxes |
| 17 | Utilities |
| 18 | Depreciation / Depletion |
| 19 | Other |

| Category | Finding |
|----------|---------|
| Table stakes | Map each expense to a Schedule E line; generate a Schedule E-shaped report at year end. Stessa provides real-estate categories that "map directly to Schedule E"; Landlord Studio ships the same 15-line breakdown. |
| Table stakes | Receipt photo upload on an expense (document-of-record for the deduction). |
| Differentiator | Auto-suggest the Schedule E line from the existing expense category (a mapping table from TenantFlow categories → lines), so owners don't re-classify. Reuse the existing tax-doc / year-end PDF to emit the Schedule E summary. |
| Anti-feature | Claiming to *file* taxes or give tax advice. Stessa/LS explicitly frame it as "simplified prep," not filing. Also don't hard-code the "3 properties per Schedule E form" IRS limit as a blocker — it's a reporting/printing detail, not a data constraint. |

- **Complexity:** LOW-MEDIUM (add a `schedule_e_line` mapping to the expense-category taxonomy; receipt upload reuses the vault + storage-quota meter #3; Schedule E report reuses PDF infra).
- **Dependencies:** expense tracking + categories (exists), document vault + Storage (receipts — counts against storage meter #3), year-end/tax-doc PDF (exists), reporting hub (#6) to surface it.
- **Competitor grounding:** Stessa "Schedule E Report Mapping" + categories master list; Landlord Studio Schedule E category breakdown (identical 15 lines).

### 13. Scheduled monthly owner digest email — Track D

**Content norms (from property-management owner-statement conventions):**
- Financial: rent collected, pending/delinquent balances, expenses, **NOI**.
- Occupancy: occupied vs vacant units, new leases signed, renewals, vacancies.
- Operational: open maintenance requests, upcoming key dates (lease expirations, compliance).
- Delivery: PDF attached and/or link; institutional standard is delivery by ~the 20th of the following month, with **email as the notification and the app as the system of record**.

| Category | Finding |
|----------|---------|
| Table stakes | A scheduled monthly summary email with income/expense/NOI/occupancy. Owner statements are a universal PM deliverable. |
| Differentiator | Digest pulls **real actuals** from the rent ledger (#7) — collected vs expected, delinquency — plus upcoming compliance dates (#11) and open maintenance, in one branded PDF via existing infra. |
| Anti-feature | Fabricated metrics (the v1.0/v2.0 honesty rule). Do not ship a "collection rate" in the digest until the rent ledger provides actuals. Avoid over-frequency (weekly digests get muted); monthly is the norm. Make it opt-out-able. |

- **Complexity:** LOW-MEDIUM (monthly cron, aggregate RPC, PDF render, Resend send — all on existing rails).
- **Dependencies:** rent ledger (#7) for actuals, financial statements + PDF (exists), reminder/cron infra + Resend (exists), reporting hub (#6). Best sequenced *after* rent ledger so the numbers are real.
- **Competitor grounding:** Owner-statement/monthly-report conventions across DoorLoop/Rentec/Buildium (income, expenses, NOI, occupancy, delivered by the 20th).

### 14. Unit turnover workflow — Track D

| Category | Finding |
|----------|---------|
| Table stakes | A move-out → make-ready → re-lease chain. Buildium offers event-triggered turnover automation; the canonical turnover checklist is a 7-phase sequence (move-out inspection → deposit assessment → repairs → cleaning → cosmetic → safety → exterior). |
| Table stakes | **Security-deposit itemization worksheet**: each deduction needs a description, a cost, and supporting documentation; state laws require an itemized statement within 14–60 days of move-out. |
| Differentiator | Chain **existing subsystems** end-to-end: move-out inspection (existing inspections) → maintenance work orders (existing maintenance+vendors) → deposit worksheet → re-lease (existing lease creation, optionally fed by the rental application #8). No new silo — an orchestration layer over what's built. |
| Anti-feature | A rigid linear state machine that blocks progress if steps are skipped. Landlords do these out of order; make phases advisory/checklist-style, not gating. Also don't auto-compute legally-binding deposit-return deadlines as authoritative (state-variance/liability — surface as guidance). |

- **Complexity:** MEDIUM-HIGH (orchestration across inspections/maintenance/leases; deposit worksheet table; itemized statement PDF; status tracking).
- **Dependencies:** inspections (move-out inspection, exists), maintenance + vendors (repairs, exists), leases (re-lease, exists), rental application (#8) for the next tenant, document vault (statement + photos, exists), notification center (#4) for step nudges.
- **Competitor grounding:** Buildium tenant-turnover checklist + event-triggered automation; universal security-deposit itemized-deduction statement requirements (description + cost + documentation, 14–60 day statutory windows).

---

## Feature Dependencies

```
EXISTING RAILS (reused, not rebuilt):
  reminder queue + cron ──► #1 renewal reminders, #11 compliance dates, #13 digest cron
  Resend deliverability ──► #1, #9 comms log, #13 digest
  /sign/[token] pattern ──► #8 rental application
  lease-template + merge ──► #10 notice library
  lease-signature tier gate ──► #2 e-sign metering
  Supabase Storage + vault ──► #3 storage meter, #12 receipts, #10/#14 stored docs
  notifications/notification_logs ──► #4 notification center
  activity table + RPC ──► #5 activity feed
  financial statements + PDF ──► #6 hub, #12 Schedule E, #13 digest
  expense tracking ──► #12 Schedule E mapping
  inspections + maintenance + leases ──► #14 turnover

NEW INTERNAL DEPENDENCIES:
  #3 storage meter ──must precede──► #12 receipt photos (share the meter)
  #7 rent ledger ──feeds actuals──► #6 reporting hub, #13 owner digest, dashboard collection-rate KPI
  #4 notification center ──surfaces──► #10 notices, #11 compliance, #14 turnover steps
  #9 comms log ──receives delivery events──► #10 notices
  #8 rental application ──feeds re-lease──► #14 turnover
  #10 notices ──shares state model──► ToS governing-law (MKTUI-02 jurisdiction)

CONFLICTS / GUARDRAILS:
  #5 activity feed  ✗ do NOT merge with ✗  #4 notification center
      (feed = historical "what happened"; center = actionable read/unread)
  #7 rent ledger    ✗ never adds ✗  payment rails / autopay / tenant balance view
  #8 application    ✗ never adds ✗  screening / SSN collection / applicant accounts
  #9 comms log      ✗ never becomes ✗  two-way tenant chat / SMS
  #10 notices       ✗ never claims ✗  legal validity / legal advice
```

### Dependency Notes

- **#3 storage meter must precede #12 receipt photos:** receipts consume the same quota; shipping receipts first would let users blow past an unmetered cap.
- **#7 rent ledger unlocks honest analytics:** collection rate and delinquency (deliberately withheld since v2.0 for lack of data) become real once charges (expected) and payments (actual) exist. Sequence #7 before #13 owner digest and before reintroducing the collection-rate KPI.
- **#4 vs #5 must be disambiguated in the same design pass** or they will duplicate and confuse. Decide the boundary before building either.
- **#10 notice state model should be shared with the ToS governing-law fix** (the outstanding `[Your State]` MKTUI-02 placeholder) — one jurisdiction/state data source, not two.

## MVP Definition

### Launch With (v10.0 core — the sold-but-broken + orphaned-backend set)

- [ ] #1 Renewal reminder delivery — a sold claim is currently dead; highest-integrity fix.
- [ ] #2 E-sign metering — sold claim, low cost.
- [ ] #3 Storage meter + enforcement — sold claim; gates #12.
- [ ] #4 Notification center — backend already built and orphaned; high user value, low incremental cost.
- [ ] #5 Activity feed — backend already built and orphaned; ship alongside #4 with a clear boundary.
- [ ] #7 Rent ledger — the flagship canonical feature; unlocks honest analytics.

### Add After Validation (v10.x)

- [ ] #6 Reporting hub consolidation — trigger: rent-ledger actuals (#7) exist to unify around.
- [ ] #8 Rental application intake — trigger: after ledger proves the token-link + record-conversion pattern scales.
- [ ] #12 Schedule E mapping + receipts — trigger: after storage meter (#3) ships.
- [ ] #13 Owner digest — trigger: after rent ledger (#7) provides real numbers to report.
- [ ] #9 Tenant communication log — trigger: standalone; sequence with #10 (notices write to it).

### Future Consideration (v11+)

- [ ] #10 State-aware notice library — defer: state coverage + legal-disclaimer surface is the heaviest liability/effort item; launch a curated state/notice subset only when ready to maintain it.
- [ ] #11 Compliance & key-date tracking — defer: valuable but standalone; rides the reminder rails whenever scheduled.
- [ ] #14 Unit turnover workflow — defer: orchestration over five existing subsystems; highest integration surface, best done last when #8/#9/#10 exist to chain into.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| #1 Renewal reminder delivery | HIGH | LOW | P1 |
| #2 E-sign metering | MEDIUM | LOW | P1 |
| #3 Storage meter + enforcement | MEDIUM | MEDIUM | P1 |
| #4 Notification center | HIGH | MEDIUM | P1 |
| #5 Activity feed | MEDIUM | LOW | P1 |
| #7 Rent ledger | HIGH | HIGH | P1 |
| #6 Reporting hub consolidation | MEDIUM | MEDIUM | P2 |
| #8 Rental application intake | HIGH | HIGH | P2 |
| #12 Schedule E mapping + receipts | HIGH | LOW-MEDIUM | P2 |
| #13 Owner digest | MEDIUM | LOW-MEDIUM | P2 |
| #9 Tenant communication log | MEDIUM | MEDIUM | P2 |
| #10 State-aware notice library | HIGH | HIGH | P3 |
| #11 Compliance & key-date tracking | MEDIUM | MEDIUM | P3 |
| #14 Unit turnover workflow | MEDIUM | HIGH | P3 |

**Priority key:** P1 = must-have for v10.0 launch · P2 = should-have, add when possible · P3 = defer/curate.

## Competitor Feature Analysis

| Feature | Stessa | Landlord Studio | TurboTenant / Avail | Our Approach |
|---------|--------|-----------------|---------------------|--------------|
| Rent ledger | Tenant Ledger: auto-rent-on-1st, add-charge, manual payment entry, running balance, calculate-since starting balance | Charges/payments/balances per tenant; partial payments as discrete entries; late-fee line | (payment-processing centric) | Owner-logged charges + mark-received (no rails); partial payments; late-fee-as-charge; opening-balance import; actuals feed analytics |
| Late fees | Recorded as a charge line | Recorded as a charge line | — | Manual "add late fee" charge; optional opt-in per-lease auto-rule (not default) |
| Rental application | — | — | Full field set (personal/residence/employment/references), SSN for screening, consent | No-login token form; **no SSN, no screening**; convert-to-tenant; explicit FCRA hand-off disclaimer |
| Screening | via partner | via partner | Built-in background/credit | **Not offered** — disclaimed, landlord's own FCRA-compliant provider |
| Legal notices | — | — | Avail: state-specific notices "reviewed by lawyers"; RentRedi: state leases/laws | Merge-field notices on lease-template rails, curated state subset, "not legal advice" disclaimer, delivery tracking |
| Schedule E | Categories map to Schedule E; instant report | Same 15-line breakdown | — | Map expense categories → lines 5–19; receipts; reuse year-end PDF |
| Owner report | Reports surface | Reports surface | — | Monthly digest email (PDF) with ledger actuals + occupancy + key dates |
| Comms log | — | — | Buildium/AppFolio: profile-tied email/audit history | Owner-side log: manual calls/notes + email-from-app auto-logged (no two-way chat) |
| Turnover | — | — | Buildium: event-triggered turnover + checklist | Orchestrate existing inspections→maintenance→deposit worksheet→re-lease (advisory, non-gating) |
| Notification center | — | — | Standard B2B inbox pattern | Bell + unread + grouped inbox over existing tables; in-app only (no SMS/push) |

## Sources

**Rent ledger semantics**
- [Stessa — Tenant Ledger: Track Charges, Payments & Balances](https://support.stessa.com/en/articles/4806958-tenant-ledger-track-charges-payments-balances-by-tenancy) (HIGH — vendor help center)
- [Stessa — How to read a rent ledger](https://www.stessa.com/blog/how-to-read-rent-ledger/) (HIGH)
- [Landlord Studio — What Is A Rent Ledger?](https://www.landlordstudio.com/blog/about-rent-ledger) (HIGH)
- [TenantCloud — What Is a Rent Ledger?](https://www.tenantcloud.com/accounting/what-is-a-rent-ledger) (MEDIUM)

**Rental application + screening hand-off**
- [TurboTenant — What Does the Online Rental Application Look Like?](https://support.turbotenant.com/en/articles/4004061-what-does-the-online-rental-application-look-like) (HIGH — vendor help center)
- [TurboTenant — Free Online Rental Applications](https://www.turbotenant.com/rental-application/) (HIGH)
- [FTC — Using Consumer Reports: What Landlords Need to Know](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know) (HIGH — regulator, FCRA duties on landlord)

**Legal notices**
- [Avail — Free Rental Forms: Application, Leases & Notices](https://www.avail.com/forms) (HIGH — vendor)
- [RentRedi — State-Specific Leases and Laws](https://help.rentredi.com/en/articles/4413344-state-specific-leases-and-laws-resources) (HIGH — vendor help center)
- [Notice to Pay or Quit template + disclaimer patterns](https://ailawyer.pro/blog/notice-to-pay-or-quit-template-guide-(free-download-ai-generator)) (LOW — "not legal advice" disclaimer pattern confirmation only)

**Schedule E**
- [Landlord Studio — Breakdown of Schedule E Expense Categories](https://www.landlordstudio.com/blog/schedule-e-categories) (HIGH — exact line 5–19 mapping)
- [Stessa — Schedule E Report Mapping](https://support.stessa.com/en/articles/6809910-schedule-e-report-mapping) (HIGH — vendor help center)
- [Stessa — Categories Master List](https://support.stessa.com/en/articles/3131090-stessa-categories-master-list) (HIGH)

**Notification center UX**
- [Courier — Best Practices for Notification Centers](https://www.courier.com/guides/how-to-build-a-notification-center/chapter-3-best-practices-for-notification-centers) (MEDIUM)
- [Eleken — Notification UX: 8 Best Practices](https://www.eleken.co/blog-posts/notification-ux) (MEDIUM)
- [SuprSend — In-App Notification Center for SaaS](https://www.suprsend.com/post/in-app-notification-center) (MEDIUM — multi-tenant scoping requirement)

**Owner digest / reporting**
- [DoorLoop — Property Management Reports: What's Included](https://www.doorloop.com/blog/property-management-report) (MEDIUM)
- [Rentec Direct — What Is Included in a Property Management Report](https://www.rentecdirect.com/blog/property-management-report/) (MEDIUM)

**Turnover + security deposit**
- [Buildium — Tenant Turnover Checklist](https://www.buildium.com/blog/tenant-turnover-checklist/) (HIGH — vendor)
- [Leasey.AI — Security Deposit Deduction Letter / Itemized Statement Requirements](https://www.leasey.ai/resources/security-deposit-deduction-letter-templates-itemized-statement-requirements/) (MEDIUM — 14–60 day statutory windows)

**Compliance / key-date tracking**
- [PropertyTools — Property Tax & Lease Renewal Tracking](https://www.propertytools.ai/organization-compliance) (MEDIUM)
- [Re-Leased — Property Compliance Software](https://www.re-leased.com/product/property-compliance-software) (MEDIUM)

**Communication log**
- [AppFolio — Communication tools / audit log](https://www.appfolio.com/property-manager/communication-service) (MEDIUM)
- [Buildium — Managing Communication](https://www.buildium.com/blog/managing-communication/) (MEDIUM)

---
*Feature research for: landlord-only property-management SaaS (v10.0 canonical feature expansion)*
*Researched: 2026-07-19*
