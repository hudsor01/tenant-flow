# Requirements: TenantFlow v8.0 — Correctness Restoration (Bug Eradication)

**Defined:** 2026-07-02
**Core Value:** Every core operation an owner performs — create a lease, delete a unit, view the leases list, sign a document, pay an invoice, upload a photo, run a report — produces correct data and correct behavior. This milestone eradicates the full set of real bugs surfaced by the 2026-07-02 whole-codebase hunt (12 parallel domain agents; every P0 and every cross-owner/DB claim verified against source + the live Supabase DB). Nothing new is built; every requirement restores an existing feature to correct behavior.

**Grounded in:** the 2026-07-02 bug hunt. Each requirement cites the confirmed defect and its file:line. Findings refuted by ground truth (e.g. GDPR `request_account_deletion` — live function is fine, repo migration is stale) are excluded from fixes except the repo-hygiene reconciliation (MISC-04). Dead code (`lease-action-buttons.tsx`, the `@modal` parallel-route trees) is out of scope.

**Constraint (applies to every requirement):** each fix is verified by exercising the actual flow (not just typecheck) and, where a DB constraint/RPC is involved, confirmed against the live prod schema. Amount columns store **dollars** (`numeric(10,2)`); date-only columns are `YYYY-MM-DD` and must be parsed/formatted in the local zone via `parseLocalYmd`/`formatLocalYmd`. Each phase ships under the perfect-PR gate (two consecutive zero-finding review cycles); `bun run typecheck` + `bun run lint` + the full unit suite stay green; no new `any` / `as unknown as`.

## v1 Requirements

### CRIT — P0: silent data corruption + fully-broken core operations

- [ ] **CRIT-01**: The lease-creation wizard persists rent/deposit/late-fee/pet amounts as **dollars**, not cents. `terms-step.tsx:72` / `details-step.tsx` stop multiplying by 100 and the wizard inserts dollar values into `leases`; review step, unit auto-fill, PDF, dashboard MRR, and `RENT_MAXIMUM_VALUE` validation all agree in dollars. (100× corruption on the sole create path.)
- [ ] **CRIT-02**: The `/documents/lease-template` builder renders money at face value — `lease-template.ts:604-624` `createDefaultContext` uses `formatCents` (not `formatCurrency`) for the cents-valued fields, and the DEFAULT_CONTEXT figures render as intended (e.g. $1,800 / $50, not $180,000 / $5,000).
- [ ] **CRIT-03**: Deleting a unit succeeds. `unit-keys.ts:260` stops writing the invalid `status:'inactive'` (rejected by live `units_status_check`); it uses a hard delete or a valid soft-delete value, and any `.neq('status','inactive')` filters are corrected to match.
- [ ] **CRIT-04**: Deleting a lease succeeds. `lease-mutation-options.ts:118,133` (delete + optimistic) stop writing the invalid `lease_status:'inactive'` (rejected by live `leases_lease_status_check`); they use a valid soft-delete/hard-delete, and the list `.neq('lease_status','inactive')` filter is corrected.

### LEASE — lease domain correctness

- [ ] **LEASE-01**: The leases list table shows real tenant / property / unit values and search matches them. Reconcile `transformLease` (`table/lease-utils.ts:92`) with the `leaseQueries.list` select (`lease-keys.ts:66`) so tenant name, property name, and unit number populate instead of "Unassigned / No Property / N/A".
- [ ] **LEASE-02**: Creating a lease through the UI (wizard or form) writes the `lease_tenants` join row, so tenant→lease/unit/property reads resolve and the active-lease tenant-delete guard sees the lease.
- [ ] **LEASE-03**: The renew-lease dialog applies the rent adjustment it collects — `renew-lease-dialog.tsx:77` sends the new `rent_amount` (when adjusted) alongside `end_date`.
- [ ] **LEASE-04**: Lease terms are locked once the tenant has signed (or the lease is `pending_signature`), so the finalized signed PDF cannot carry terms the tenant never agreed to. Edit is gated in UI and rejected server-side.
- [ ] **LEASE-05**: The edit-form lease status select includes `pending_signature` and cannot silently drop a lease out of that state on save.
- [ ] **LEASE-06**: The leases page paginates server-side (uses the PostgREST `count`, not a hardcoded `limit:50` client slice) so leases beyond the first 50 are reachable and the "Total Leases" stat is accurate.
- [ ] **LEASE-07**: The lease-signing PDF (`_shared/lease-signing.ts:104`) formats money with 2-decimal currency consistent with the signing page.
- [ ] **LEASE-08**: The rent-increase-notice dialog receives the property address (not the unit number) for its "Property:" line (`lease-header.tsx:170`).

### MAINT — maintenance + inspections

- [ ] **MAINT-01**: Maintenance kanban drag-and-drop changes status. Columns register as droppables and `handleDragEnd` resolves the target column status (not a card UUID) — `maintenance-kanban.client.tsx:202`.
- [ ] **MAINT-02**: The maintenance kanban board reflects the search box — it syncs to the filtered `initialRequests` prop instead of copying it into state once (`maintenance-kanban.client.tsx:165`).
- [ ] **MAINT-03**: The maintenance list view renders exactly one actions column — remove the duplicate `{id:'actions'}` appended in `maintenance-table.client.tsx:78` (keep the one in `columns.tsx`).
- [ ] **MAINT-04**: Deleting a maintenance request in list view persists in the UI — the optimistic delete invalidates/refetches the source query so the row does not reappear (`maintenance-table.client.tsx:47`).
- [ ] **MAINT-05**: The maintenance list pagination footer is correct — pass a real `pageCount` (not `-1`) so "Page X of N" and the next/last controls work (`maintenance-table.client.tsx:137`).
- [ ] **MAINT-06**: Kanban + detail handle every valid status, including `assigned` / `needs_reassignment`, so those rows are visible on the board and render the correct badge/StatusSelect.
- [ ] **MAINT-07**: The maintenance "Completed" stat is either labeled correctly or scoped to the period it claims ("this month") — `maintenance-view.client.tsx:67`.
- [ ] **MAINT-08**: The add-expense dialog persists the Description the user enters (add the column + payload field, or remove the input) — `add-expense-dialog.tsx:57`.
- [ ] **INSP-01**: Inspection room photos display. The card renders the resolved image URL instead of the nonexistent `/api/v1/inspections/photos/{id}/url` route (`inspection-room-card.tsx:209`), and the query resolves photos on the private `inspection-photos` bucket via signed URLs (not `getPublicUrl`) — `inspection-keys.ts:126`.
- [ ] **INSP-02**: Inspection photo upload tracks per-file status correctly — no wrong-index status writes, failed uploads land in an `error` state with retry, and an already-uploaded file cannot be re-uploaded (`inspection-photo-upload.tsx:68`).

### TEN — tenant domain

- [ ] **TEN-01**: Tenant delete works from every control (row, grid card, bulk action bar) — wire the real delete mutation + confirm dialog; no control is a `logger.info`-only no-op (`tenants.tsx:93-213`).
- [ ] **TEN-02**: The tenant "View lease" action navigates to the tenant's lease (uses `leaseId`, not `tenant.id`) — `tenant-table-row.tsx:92`.
- [ ] **TEN-03**: The per-tenant lease-status dropdowns either persist the change or are removed (no onChange-logs-only controls that snap back) — `tenant-grid.tsx:130`, `tenant-table-helpers`.
- [ ] **TEN-04**: `mapTenantRow.currentLease` selects the active lease (prefer `lease_status='active'`, deterministic ordering), not whichever `lease_tenants` row PostgREST emits first — `tenant-mappers.ts:179`.
- [ ] **TEN-05**: The tenant-edit emergency-contact fields can be left empty / cleared — the whole-form validator does not make phone effectively mandatory or block name-only edits (`tenant-edit-form.client.tsx:30`).
- [ ] **TEN-06**: `useMarkTenantAsMovedOutMutation` optimistic update targets the real list query key + shape (or drops the optimistic step) so it doesn't silently no-op / throw (`use-tenant-mutations.ts:125`).

### PROP — property + unit domain

- [ ] **PROP-01**: The property-detail units table refreshes after unit create/edit/delete — the three unit mutations invalidate `unitQueries.byProperty()` (not just `.lists()`) — `use-unit.ts:80-130`.
- [ ] **PROP-02**: Renaming/updating a property refreshes the dashboard — `useUpdatePropertyMutation` invalidates the dashboard's real key (`ownerDashboardKeys.all` / `analytics.pageData()`), not the non-matching `analytics.stats()` — `use-property-mutations.ts:109`.
- [ ] **PROP-03**: The property table (and tenant table) virtualizer positions rows correctly (absolute/`translateY(virtualRow.start)`) so scrolling shows the right rows, not offset/blank — `property-table.tsx:192`, `tenant-table.tsx:190`.
- [ ] **PROP-04**: The "Duplex" property type round-trips — either it maps to a real stored value that displays as Duplex and is filterable, or it is removed from the taxonomy (`properties.tsx:25`, `property-transforms.ts`).
- [ ] **PROP-05**: Clearing an optional field in an edit form nulls the column (property `address_line2`, unit `square_feet`, vendor email/phone/notes, maintenance cost/date) — replace conditional-spread/`?? undefined` + `omitUndefined` with explicit `null` on clear.

### BILL — billing, Stripe & financial reports

- [ ] **BILL-01**: The subscription current-period-end is read from the correct SDK location (`subscription.items.data[].current_period_end` for the pinned stripe@20 / `2026-03-25.dahlia`), so `public.users.subscription_current_period_end` is populated, the billing UI shows the next-billing date, and cancel/reactivate no longer crashes with `RangeError` from `new Date(undefined*1000)` (webhook handlers + `stripe-cancel-subscription` + `use-billing-mutations.ts:75`).
- [ ] **BILL-02**: The income-statement, cash-flow, and tax-documents views return period-specific numbers — the queryFns pass their `start_date`/`end_date`/`year` to date-aware RPCs instead of calling `get_dashboard_stats` with only `p_user_id` (`financial-keys.ts:243,327`, `expense-keys.ts:47`).
- [ ] **BILL-03**: Unpaid/open invoices show their real amount, not $0.00 — `billing-keys.ts:35` stops letting `amount_paid = 0` win over `amount_due`.
- [ ] **BILL-04**: Financial views surface an error (or fall back honestly) when `get_expense_summary`/billing RPCs fail, instead of silently defaulting expenses to 0 and overstating net income (`financial-keys.ts`, `expense-keys.ts`).
- [ ] **BILL-05**: The year-end and tax-document **PDF** exports build from the same financial RPCs as their CSV counterparts (`get_financial_overview`/`get_billing_insights`), not `get_dashboard_stats`, so PDF content matches the report title (`generate-pdf/index.ts:92`).

### DATA — analytics + data-layer correctness

- [ ] **DATA-01**: Occupancy analytics render real data. The mappers consume `get_occupancy_trends_optimized`'s JSONB **array** shape correctly (not a `z.object` that always fails → empty defaults) across `use-analytics.ts` and `report-analytics-keys.ts`.
- [ ] **DATA-02**: Soft-deleted properties are excluded from the per-property performance RPCs — restore the `p.status <> 'inactive'` predicate to `get_property_performance_analytics` / `_trends` / `_with_trends` (verified missing on the live definitions) so deleted properties don't emit rows or inflate portfolio totals.
- [ ] **DATA-03**: The `get_lease_stats` "Expired" tile counts naturally-lapsed leases (`lease_status='expired'`, set by the expire-leases cron), and the frontend `LeaseStatus` union includes `'expired'`.

### FORMFIX — form behavior correctness

- [ ] **FORMFIX-01**: The unsaved-changes warning arms while the user types — `useUnsavedChangesWarning` reads TanStack Form dirty state reactively (via `useStore`/`form.Subscribe`), not a non-reactive `form.state.isDirty` snapshot (`property-form.client.tsx:134`, `add-tenant-form.tsx:83`).
- [ ] **FORMFIX-02**: The contact form transmits the message (to an Edge Function / Resend), returns real success/failure, and only shows the thank-you on a successful send — `contact-form.tsx:69` (currently sends nowhere).
- [ ] **FORMFIX-03**: `use-form-progress` no longer render-loops — the auto-save effect depends on stable identities and guards on value change, so typing in the contact form doesn't spin renders + localStorage writes (`use-form-progress.ts:153`).
- [ ] **FORMFIX-04**: The add-tenant "Property Assignment (Optional)" selection is persisted — the chosen property/unit creates the association (lease/`lease_tenants` or the intended link), instead of being dropped from the payload (`add-tenant-form.tsx:57`).
- [ ] **FORMFIX-05**: The maintenance edit form saves unit/tenant changes and validates input — the edit payload includes `unit_id`/`tenant_id`, and `maintenanceRequestCreateSchema` is wired so empty title/description/unit surface field errors instead of a raw PostgREST uuid error (`use-maintenance-form.ts:56,114`).
- [ ] **FORMFIX-06**: General settings persists every editable field — Contact Email, Timezone, and Language are included in the update, not just `phone` (`general-settings.tsx:76`).
- [ ] **FORMFIX-07**: The notification-settings "Enable All Notifications" toggle reads and writes all channels it claims (email/sms/push/in-app), not just `email` (`notification-settings.tsx:63`).
- [ ] **FORMFIX-08**: Create/update forms show a single success/error toast — remove the duplicate toast between the form's onSubmit and the mutation's `createMutationCallbacks` (lease + property) (`lease-form.tsx:88`, `property-form.client.tsx:221`).

### UIX — shared UI, data-table, uploads, error handling

- [ ] **UIX-01**: Data-table column filters and pagination work on every consumer — `use-data-table.ts:211` no longer no-ops `onColumnFiltersChange` under `enableAdvancedFilter`, or the toolbar stops rendering inert filter widgets and `-1` page counts (units, financial-lease, top-properties, active-units, insights tables).
- [ ] **UIX-02**: Image upload uploads each file exactly once and reports success only when the current batch actually completed — fix `use-supabase-upload.ts:84` retry-list double-inclusion, re-upload of succeeded files, and the `isSuccess` length comparison.
- [ ] **UIX-03**: `sanitizeSearchInput` stops stripping `.` so email / dotted searches match (only escape the PostgREST `.or()` metacharacters, don't corrupt ilike values) — `sanitize-search.ts:15`.
- [ ] **UIX-04**: The mutation error handler shows friendly messages for unclassified errors instead of raw Postgres/PostgREST internals (e.g. unique/check-constraint violations) — `mutation-error-handler.ts:114`.
- [ ] **UIX-05**: Avatar re-upload reflects the new image — bust the cache (versioned path or query param) so a replaced avatar doesn't serve the stale cached object — `use-profile-avatar-mutations.ts:33`.

### SEC — security + delivery config

- [ ] **SEC-01**: MFA (TOTP aal2) is enforced server-side. The proxy and/or the `(owner)`/`(admin)` layouts require aal2 for users with a verified factor (via `getAuthenticatorAssuranceLevel` or a JWT `aal` claim / RLS), so a password-only session cannot reach private routes; dismissing the OTP dialog signs the aal1 session out (`proxy.ts`, login MFA dialog).
- [ ] **SEC-02**: Storage-backed images render on private routes — the per-request CSP `img-src` (and `media-src`) in `proxy.ts:129` (and the static CSP in `vercel.json`) allow the Supabase storage origin so maintenance photos, document-vault previews, and inspection photos are not blocked.
- [ ] **SEC-03**: The auth-walled `/properties/(.*)` route no longer carries a `public, s-maxage` shared-cache header (cross-user cache risk); the stale `/manage` and `/tenant` cache rules for non-existent routes are removed (`vercel.json:129-160`).
- [ ] **SEC-04**: Lease FK re-pointing is owner-validated. A `leases` UPDATE that changes `unit_id` or `primary_tenant_id` must reject a target row not owned by the caller — the current `leases_update_owner` RLS policy pins only `owner_user_id`, so an owner can attach their lease to another owner's unit/tenant. Add a trigger/RLS check validating the NEW `unit_id`/`primary_tenant_id` belongs to the owner. (Discovered in Phase 26 review; the signed-PDF tamper via these FKs during signature is already closed by the Phase-26 term-lock — this is the broader all-status cross-owner-integrity gap.)
- [ ] **SEC-05**: The e-signature audit trail is tamper-proof. Once a signature-audit column is set (`tenant_signed_at`, `tenant_signature_name`, `tenant_signature_ip/user_agent/method`, and the owner equivalents), it cannot be silently changed to a *different* non-null value (an asymmetric null-transition guard: allow null→value on sign and value→null on cancel, reject value→different-value), so an owner cannot forge the tenant's rendered signature name / audit metadata on the signed PDF between tenant-sign and finalize. (Discovered in Phase 26 review; distinct from lease-term locking.)

### MKT — marketing, blog & SEO surface

- [ ] **MKT-01**: The `/pricing`, `/features`, and `/compare/[competitor]` OG images render real content — replace `oklch()` with `hsl()` (satori renders oklch black) in all three `api/og/*` routes; verify the PNGs are not solid black.
- [ ] **MKT-02**: Blog and category pagination re-renders the server-rendered post grid — the pagination control uses real navigation / nuqs `shallow:false` so Next/Prev change the posts, not just the URL + page label (`blog-pagination.tsx`).
- [ ] **MKT-03**: Out-of-range blog/category pages return a real 404 (or the intended empty state honestly), and the category page handles the query error + shows the correct post count (`blog/page.tsx:112`, `blog/category/[category]/page.tsx:114`).
- [ ] **MKT-04**: The homepage `SearchAction` structured data and `/search` agree — either `/search` honors the `q` param and renders results, or the SearchAction/`/search` contract is removed (`page.tsx:50`, `search/page.tsx`).
- [ ] **MKT-05**: The compare/resource cross-link blocks either point at blog slugs that exist or degrade correctly — fix or remove the six dead slugs in `compare-data.ts` / `content-links.ts` so the "Read the Full Comparison" / "Related Blog Posts" sections aren't silently empty.

### MISC — bulk-import, scripts & repo hygiene

- [ ] **MISC-01**: Lease bulk-import preserves the CSV `rent_currency` — remove the `.omit({rent_currency:true})` (or explicitly pass it through) so imported leases aren't silently forced to USD; invalid CSV `status` cells fail the row instead of silently coercing to the default (leases/tenants/units bulk-import).
- [ ] **MISC-02**: The continuous blog runner honors the kill-switch — `run-continuous-blog.ts` calls `isFactoryStopped()` before acquiring the lock, and the factory lock reclaim is race-safe (fence the stale-lock delete); the slug-brand gate evaluates the published (post-override) slug.
- [ ] **MISC-03**: `db-types.sh` no longer merges CLI stderr into the generated types file (separate stderr capture), and `verify-seeds.sh` queries the current schema (`owner_user_id`, not the dropped `property_owners`/`property_owner_id`/`seed_versions`) or is retired.
- [ ] **MISC-04**: Repo↔prod migration drift is reconciled — a migration in `supabase/migrations/` reflects the live `request_account_deletion` definition (live is correct; the repo copy references dropped `user_type`/`rent_due`), so the repo is a faithful source of truth.

### TZ — timezone correctness sweep

- [ ] **TZ-01**: Every date-only (`YYYY-MM-DD`) value is parsed and formatted in the local zone (via `parseLocalYmd`/`formatLocalYmd`/`expandDateBoundary`), eliminating the "one day early" class across: report subtitles + lease-expiration table + tax-year derivation (`report-data.ts:217,819`), the expiring-leases widget (`expiring-leases-widget.tsx:60`), the 30-day revenue chart ticks (`revenue-area-chart.tsx:92`), lease terminate `end_date` (`lease-mutation-options.ts:150`), and the lease-expiry badge / days-remaining (`lease-detail-utils.ts:220`).
- [ ] **TZ-02**: `getDefaultDateRange` (`reports-utils.ts:17`) computes a correct start-of-month N months back (set the day before the month, overflow-safe), so the default report window isn't a month short on month-end days.
- [ ] **TZ-03**: The dashboard "Revenue vs Expenses" chart shows real expenses and honors the selected 7d/30d range — remove the hardcoded `expenses:0` / 100% margin and the 7d→monthly-bucket collapse (`use-owner-dashboard-financial.ts:44`, `chart-area-interactive.tsx`).

## v2 Requirements

None scoped. This milestone is exhaustive over the 2026-07-02 hunt; any bug found after this milestone opens a new cycle.

## Out of Scope

| Item | Reason |
|------|--------|
| GDPR `request_account_deletion` "broken" finding | Refuted against the live DB — the live function does not reference the dropped `user_type`/`rent_due`; only the repo migration is stale. Covered as repo hygiene by MISC-04, not a live bug fix. |
| `lease-action-buttons.tsx` one-click "Sign as Owner" (no consent UI) | Dead code — zero non-test imports. |
| The four `@modal` parallel-route trees (leases/maintenance/properties/units) | Dead — segment layouts never render the slot and interceptor paths don't match the app's links; not a user-facing regression. |
| Completing v7.0 FORM-09/FORM-10 typing migration (wizard + standalone forms) | Separate in-flight milestone (typing refactor). v8.0 fixes the *behavior* bugs in those files (CRIT-01, FORMFIX-05); the typing migration is tracked in the archived v7.0 plan and can resume independently. |
| Adding new features, redesigns, or perf work | This milestone is strictly bug eradication — restore correct behavior of existing features. |

## Traceability

| REQ-ID | Phase |
|--------|-------|
| CRIT-01, CRIT-02, CRIT-03, CRIT-04 | 25 — Critical: Corruption & Broken Deletes |
| LEASE-01..08 | 26 — Lease Domain Correctness |
| MAINT-01..08, INSP-01, INSP-02 | 27 — Maintenance & Inspections |
| TEN-01..06 | 28 — Tenant Domain |
| BILL-01..05 | 29 — Billing, Stripe & Financial Reports |
| DATA-01..03, PROP-01..03 | 30 — Analytics & Data-Layer Correctness |
| FORMFIX-01..08 | 31 — Forms Behavior Correctness |
| UIX-01..05, PROP-04, PROP-05 | 32 — Shared UI, Data-Table & Uploads |
| SEC-01..05 | 33 — Security & Delivery Config |
| MKT-01..05 | 34 — Marketing, Blog & SEO Surface |
| MISC-01..04, TZ-01..03 | 35 — Timezone Sweep, Bulk-Import, Scripts & Hygiene |

All 56 requirements mapped to exactly one phase ✓
