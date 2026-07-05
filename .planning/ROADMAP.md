# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Hardening & Hygiene** — Phases 1-8 (shipped 2026-06-07, 20/21 requirements; SEO-01 carried to v5.0) — see [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 AI Blog Content Engine** — Phases 9-14 (shipped 2026-06-10, 9/9 requirements) — see [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md)
- ✅ **v6.0 Final Canonical Cleanup** — Phases 15-19 (resolved/verified 2026-06-19, 24 requirements) — see [milestones/v6.0-ROADMAP.md](milestones/v6.0-ROADMAP.md)
- ⏸️ **v7.0 TanStack Form Composition Migration** — Phases 20-24 (paused mid-flight; phases 20-22 merged, 23-24 open) — archived plan in [milestones/v7.0-ROADMAP.md](milestones/v7.0-ROADMAP.md)
- 🔨 **v8.0 Correctness Restoration** — Phases 25-35 (active, started 2026-07-02, 56 requirements) — this file

---

## v8.0 Correctness Restoration (Bug Eradication)

**Goal:** Eradicate the full set of real bugs surfaced by the 2026-07-02 whole-codebase hunt — all severities (P0/P1/P2), every one verified against source and (where a DB constraint/RPC is involved) the live Supabase DB. Nothing new is built; every phase restores an existing feature to correct behavior.

**Sequencing rule:** critical data-corruption and fully-broken core operations first (Phase 25), then work domain-by-domain (leases → maintenance/inspections → tenants → billing → analytics/data-layer → forms → shared UI → security/config → marketing), finishing with a cross-cutting timezone sweep + bulk-import/scripts/repo-hygiene cleanup (Phase 35). Each phase is an independently shippable PR under the perfect-PR gate (two consecutive zero-finding review cycles). Every fix is verified by exercising the actual flow — not just typecheck — and DB-level fixes are confirmed against the live prod schema.

**Overlap note:** v7.0 (form-typing migration) is paused mid-flight. v8.0 fixes *behavior* bugs in some of the same files (CRIT-01 lease wizard, FORMFIX-05 maintenance form). The v7.0 typing work (FORM-09/10) is preserved in the archived v7.0 plan and can resume independently after v8.0 or be folded in opportunistically when those files are touched.

**11 phases** | **56 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 25 | Critical: Corruption & Broken Deletes | 5/5 | Complete   | 2026-07-02 |
| 26 | Lease Domain Correctness | 9/9 | Complete   | 2026-07-05 |
| 27 | Maintenance & Inspections | Kanban drag/search, list actions/delete/pagination, inspection photos + upload | MAINT-01..08, INSP-01, INSP-02 | 5 |
| 28 | Tenant Domain | Real deletes, correct lease navigation, status persistence, current-lease selection | TEN-01..06 | 4 |
| 29 | Billing, Stripe & Financial Reports | Correct period-end, period-scoped statements, invoice amounts, matching PDFs | BILL-01..05 | 5 |
| 30 | Analytics & Data-Layer Correctness | Occupancy analytics, soft-delete filtering, stale-cache invalidation, virtualizer | DATA-01..03, PROP-01..03 | 5 |
| 31 | Forms Behavior Correctness | Unsaved-guard, contact send, no render loop, saved fields, validators, single toast | FORMFIX-01..08 | 5 |
| 32 | Shared UI, Data-Table & Uploads | Working filters/pagination, single-upload, search sanitize, error messages, taxonomy | UIX-01..05, PROP-04, PROP-05 | 5 |
| 33 | Security & Delivery Config | Server-side MFA, CSP image allowance, remove public cache on auth routes | SEC-01..03 | 4 |
| 34 | Marketing, Blog & SEO Surface | OG images, blog pagination, 404 honesty, search contract, cross-links | MKT-01..05 | 4 |
| 35 | TZ Sweep, Bulk-Import, Scripts & Hygiene | Local-zone dates everywhere, currency/status import, script + migration hygiene | MISC-01..04, TZ-01..03 | 5 |

### Phase Details

### Phase 25: Critical — Corruption & Broken Deletes
**Goal:** Fix the three P0s (plus the sibling document-template money bug). Stop the lease-creation wizard writing rent 100× too high, fix the lease-template PDF's 100× money rendering, and restore unit-delete and lease-delete (both currently write a status value the live CHECK constraint rejects, so they fail every time).
Requirements: CRIT-01, CRIT-02, CRIT-03, CRIT-04
**Success Criteria**:
1. A lease created via `/leases/new` persists `rent_amount` (+ deposit/late-fee/pet) in dollars; the value shown in review equals the value stored, on the detail page, in dashboard MRR, and in the signed PDF
2. `/documents/lease-template` renders default + entered money at face value (e.g. $1,800 rent, $50 late fee), not 100× inflated
3. Deleting a unit and deleting a lease both succeed (verified against the live `units_status_check` / `leases_lease_status_check`) and the row disappears from its list
4. `tsc` + `lint` + unit suite green; two consecutive zero-finding review cycles

**Plans:** 5/5 plans complete
- [x] 25-01-PLAN.md — CRIT-01: lease wizard money → dollars end-to-end
- [x] 25-02-PLAN.md — CRIT-02: lease-template formatter → face value (keep cents)
- [x] 25-03-PLAN.md — CRIT-03: unit soft-delete migration + unit filter audit
- [x] 25-04-PLAN.md — CRIT-04: lease soft-delete migration + lease filter audit
- [x] 25-05-PLAN.md — Phase verification (all four flows end-to-end)

### Phase 26: Lease Domain Correctness
**Goal:** Make the leases surface trustworthy — the list table shows real tenant/property/unit and search works, UI-created leases write the `lease_tenants` join row, renew applies the rent change, terms lock after signing, the status select is complete, pagination reaches all leases, and the signed-PDF money format matches the app.
Requirements: LEASE-01, LEASE-02, LEASE-03, LEASE-04, LEASE-05, LEASE-06, LEASE-07, LEASE-08
**Success Criteria**:
1. The leases list shows each lease's tenant name, property, and unit, and search-by-tenant/property returns matches
2. Creating a lease (wizard or form) makes the tenant's detail page show that lease and blocks deleting a tenant with an active lease
3. Renewing with a rent adjustment updates `rent_amount`; a signed/pending lease cannot have its terms edited into the final PDF
4. All leases are reachable via pagination; the status select offers `pending_signature`; the signed PDF money matches the signing page
5. Two consecutive zero-finding review cycles

**Plans:** 9/9 plans complete
- [x] 26-01-PLAN.md — LEASE-01: expand leases list embed + align transformLease (real tenant/property/unit + search)
- [x] 26-02-PLAN.md — LEASE-03: renew dialog persists the rent adjustment
- [x] 26-03-PLAN.md — LEASE-05: add pending_signature to the edit-form status select
- [x] 26-04-PLAN.md — LEASE-07: signed-PDF money → 2 decimals (+ out-of-band Edge deploy)
- [x] 26-05-PLAN.md — LEASE-02: AFTER INSERT lease_tenants trigger + ON CONFLICT-safe bulk_import (migration)
- [x] 26-06-PLAN.md — LEASE-04 (server): BEFORE UPDATE term-lock trigger on signed/pending leases (migration)
- [x] 26-07-PLAN.md — LEASE-04 (UI) + LEASE-08: edit-gate on signed leases (header + edit-route) + property address on rent-increase notice
- [x] 26-08-PLAN.md — LEASE-06: raise fetch bound + count-based Total (client-side search retained; >1000 leases = documented limit)
- [x] 26-09-PLAN.md — Phase verification (all 8 flows + typecheck/lint/unit)

### Phase 27: Maintenance & Inspections
**Goal:** Restore the maintenance board and list and the inspection photo flow — kanban drag changes status and reflects search, the list has one working actions column with a persistent delete and correct pagination, all valid statuses render, expense descriptions save, and inspection photos display and upload correctly.
Requirements: MAINT-01, MAINT-02, MAINT-03, MAINT-04, MAINT-05, MAINT-06, MAINT-07, MAINT-08, INSP-01, INSP-02
**Success Criteria**:
1. Dragging a maintenance card to another column changes its status and persists; the kanban reflects the search box
2. The list view shows one actions column; a deleted request stays deleted; the pagination footer is correct
3. `assigned`/`needs_reassignment` requests are visible with correct badges; the "Completed" stat matches its label
4. Inspection room photos display after upload, and photo upload tracks per-file status (success/error/retry) without duplicates
5. Two consecutive zero-finding review cycles

### Phase 28: Tenant Domain
**Goal:** Fix tenant management — delete actually deletes, "View lease" navigates to the lease, status dropdowns persist (or are removed), the current lease is chosen correctly, and the tenant-edit emergency-contact validator stops blocking legitimate edits.
Requirements: TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, TEN-06
**Success Criteria**:
1. Deleting a tenant (row / grid / bulk) removes it (subject to the active-lease guard), not a silent no-op
2. "View lease" opens the tenant's lease; the current-lease display prefers the active lease
3. Emergency-contact fields can be left empty or cleared, and name-only edits save
4. Two consecutive zero-finding review cycles

### Phase 29: Billing, Stripe & Financial Reports
**Goal:** Correct the billing and financial-reporting numbers — read Stripe's period-end from the right SDK location (fixing the null billing date and the cancel/reactivate crash), scope financial statements to their selected period, show real invoice amounts, surface RPC errors instead of zeroing expenses, and build the year-end/tax PDFs from the financial RPCs.
Requirements: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria**:
1. The billing UI shows the next-billing date, and cancel/reactivate completes without a RangeError
2. Income-statement / cash-flow / tax-documents show different, correct numbers per selected period/year
3. Open/unpaid invoices show their real amount; a failed expense/billing RPC surfaces an error rather than $0 expenses
4. The year-end and tax PDF exports contain the same financial data as their CSV counterparts
5. Two consecutive zero-finding review cycles

### Phase 30: Analytics & Data-Layer Correctness
**Goal:** Fix analytics and cross-cutting data-layer correctness — occupancy analytics consume the RPC's array shape, soft-deleted properties are excluded from the performance RPCs, the expired-lease stat counts `expired`, unit mutations invalidate the by-property cache, property updates refresh the dashboard, and the property/tenant table virtualizers position rows correctly.
Requirements: DATA-01, DATA-02, DATA-03, PROP-01, PROP-02, PROP-03
**Success Criteria**:
1. Occupancy analytics/report views render real numbers (not all-zero) for an owner with occupied units
2. A soft-deleted property no longer appears in or inflates the per-property performance RPCs; the "Expired" lease tile counts cron-expired leases
3. The property-detail units table refreshes after unit create/edit/delete, and a property rename refreshes the dashboard
4. Scrolling the property/tenant tables in virtualized mode shows the correct rows (no offset/blank)
5. Two consecutive zero-finding review cycles

### Phase 31: Forms Behavior Correctness
**Goal:** Fix form behaviors that silently drop data or misbehave — the unsaved-changes guard arms on typing, the contact form actually sends, `use-form-progress` stops render-looping, add-tenant persists the property assignment, maintenance edit saves unit/tenant + validates, general settings saves all fields, the notifications toggle covers all channels, and forms show a single toast.
Requirements: FORMFIX-01, FORMFIX-02, FORMFIX-03, FORMFIX-04, FORMFIX-05, FORMFIX-06, FORMFIX-07, FORMFIX-08
**Success Criteria**:
1. Editing a property/tenant form arms the beforeunload warning; the contact form transmits and only shows success on a real send
2. Typing in the contact form does not spin renders/localStorage; add-tenant persists the chosen property/unit
3. Maintenance edit saves unit/tenant changes and shows field errors on empty required inputs; general settings saves email/timezone/language; "Enable All" toggles all channels; one toast per create/update
4. `tsc` + `lint` + unit suite green
5. Two consecutive zero-finding review cycles

### Phase 32: Shared UI, Data-Table & Uploads
**Goal:** Fix shared infrastructure that many pages depend on — data-table filters and pagination actually work, image upload uploads once and reports success accurately, search sanitize stops corrupting dotted queries, unclassified errors show friendly messages, avatar re-upload busts the cache, the Duplex taxonomy round-trips, and clearing optional edit fields nulls the column.
Requirements: UIX-01, UIX-02, UIX-03, UIX-04, UIX-05, PROP-04, PROP-05
**Success Criteria**:
1. Typing in a data-table column filter filters rows and the pagination footer/controls work on every consumer
2. Uploading images stores each file once and signals success only when the batch completed; avatar replacement shows the new image
3. Email/dotted searches match; unclassified mutation errors show a friendly message
4. Bulk-editing type to Duplex round-trips (or Duplex is removed); clearing an optional field in an edit form nulls the DB column
5. Two consecutive zero-finding review cycles

### Phase 33: Security & Delivery Config
**Goal:** Close the security/config gaps — enforce MFA server-side, allow Supabase storage images through the CSP on private routes, and remove the public shared-cache header from the auth-walled `/properties` route.
Requirements: SEC-01, SEC-02, SEC-03
**Success Criteria**:
1. A password-only (aal1) session for an MFA-enrolled user cannot reach private routes; dismissing the OTP dialog signs the session out
2. Maintenance photos, document-vault previews, and inspection photos render on private routes (no CSP block)
3. `/properties/*` responses no longer carry a `public, s-maxage` header; the dead `/manage` and `/tenant` cache rules are removed
4. Two consecutive zero-finding review cycles

### Phase 34: Marketing, Blog & SEO Surface
**Goal:** Fix the public surface — OG images render real content (hsl, not oklch), blog/category pagination changes the posts, out-of-range pages 404 honestly, the SearchAction/`/search` contract is consistent, and the compare/resource cross-links point at real posts.
Requirements: MKT-01, MKT-02, MKT-03, MKT-04, MKT-05
**Success Criteria**:
1. `/pricing`, `/features`, `/compare/*` OG images render real (non-black) cards
2. Clicking Next/Prev on `/blog` and category pages changes the rendered posts; out-of-range pages return 404 (or an honest empty state) with a correct count
3. The homepage SearchAction and `/search` agree; compare/resource cross-link blocks point at existing posts or degrade cleanly
4. Two consecutive zero-finding review cycles

### Phase 35: TZ Sweep, Bulk-Import, Scripts & Hygiene
**Goal:** Clean up the cross-cutting remainder — eliminate the whole timezone "one day early" class with local-zone date handling, fix the default-report-range month math and the revenue-vs-expenses chart, preserve import currency/status, and fix the script + repo-migration hygiene issues.
Requirements: MISC-01, MISC-02, MISC-03, MISC-04, TZ-01, TZ-02, TZ-03
**Success Criteria**:
1. Date-only values render/store on the correct local day across reports, the expiring-leases widget, the revenue chart, lease terminate, and the lease-expiry badge; the default report range spans the intended months; the revenue-vs-expenses chart shows real expenses and honors the range
2. Lease bulk-import preserves `rent_currency` and fails invalid status cells instead of coercing them
3. The continuous blog runner honors the kill-switch; `db-types.sh` doesn't merge stderr into the types file; `verify-seeds.sh` uses current columns (or is retired); the repo `request_account_deletion` migration matches live
4. `tsc` + `lint` + unit suite green
5. Two consecutive zero-finding review cycles

---

**Coverage:** 56 requirements → 11 phases, each requirement mapped to exactly one phase. Phase numbering continues the integer sequence across milestones (v7.0 ended at 24; v8.0 is 25-35).
