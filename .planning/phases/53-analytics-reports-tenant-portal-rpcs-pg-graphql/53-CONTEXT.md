# Phase 53: Analytics, Reports & Tenant Portal — RPCs + pg_graphql - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate frontend hooks (`use-owner-dashboard.ts`, `use-analytics.ts`, `use-reports.ts`, `use-financials.ts`, `use-tenant-portal.ts`) off NestJS to call Supabase directly via RPCs, pg_graphql, and PostgREST. Enable pg_graphql for complex owner dashboard aggregations. Deliver CSV/PDF/Excel export via a Supabase Edge Function. Build the tenant portal dashboard with PostgREST. Add kanban UI to the tenant portal maintenance view and add list/kanban toggle to the owner maintenance view.

New capabilities added beyond pure data migration: export modal, kanban maintenance views.

</domain>

<decisions>
## Implementation Decisions

### Export report UX
- Export triggered via a modal (not a single-click button)
- Modal offers three format options: CSV, PDF, and Excel (.xlsx)
- All report types are exportable, including tenant payment history
- PDF layout: branded header (TenantFlow logo, property name, date range, generated date) + cleanly structured financial tables with subtotals
- Column selection: Claude decides per report type (avoid over-engineering for first version)
- Download feedback: Claude decides appropriate UX based on expected file size (inline spinner for small, toast for large)
- Financial report exports use stale-while-revalidate (same as dashboard; no forced fresh fetch on export)

### pg_graphql query strategy
- Use pg_graphql only where N+1 queries are otherwise unavoidable — primarily the portfolio property list with per-property aggregated stats (occupancy, revenue per property)
- Keep time-series aggregations (occupancy trends, revenue charts) as dedicated RPCs — business logic is better expressed in SQL
- Simple lookups remain as direct PostgREST calls
- Cache policy: `staleTime: 2 minutes, gcTime: 10 minutes` for all dashboard/analytics queries (stale-while-revalidate pattern)
- Export/reports data follows the same stale-while-revalidate policy

### Error and loading behavior
- **Component-level isolation**: Each dashboard widget independently manages its own loading/error state. A failing widget shows skeleton or empty state; it does NOT crash other widgets.
- **Stale data preference**: If a background refetch fails, keep showing stale data silently — do NOT show error toasts or update the UI with error states
- **Sentry reporting**: All background refetch failures are reported to Sentry (error + context) so engineering is notified without interrupting the user
- **Chart loading**: Charts use animated entry (bars grow up, lines draw left-to-right, ~500ms) — loading feels like a designed interaction, not a wait
- **Empty states**: Charts and analytics sections with no data show an illustration + friendly contextual message (e.g., "Add your first property to see analytics here")
- **Initial load**: Each widget shows a skeleton while fetching; skeleton shape should approximate the loaded content

### Tenant portal content
- **Dashboard sections** (4 total):
  1. Lease summary card — unit address, lease start/end, monthly rent amount
  2. Next payment card — "Due [Date]: $[Amount]" with payment status (paid/pending/overdue)
  3. Payment history — last 12 months of payment records with status per payment
  4. Maintenance requests — kanban view (see below)
- **No active lease**: Claude decides the empty state behavior (likely: friendly message + contact info, no historical data shown without a lease)
- **Payment history range**: Claude decides — likely all-time for the current lease period, paginated
- **Maintenance detail level**: Tenants see full detail — notes, status updates, photos from landlord/vendor

### Maintenance kanban views
- **Tenant portal**: Read-only kanban board. Columns reflect the full status lifecycle from the `maintenance_requests.status` constraint (researcher should confirm exact values — likely: Open, In Progress, On Hold, Completed, Cancelled). Tenants cannot drag to change status.
- **Owner maintenance page**: List/kanban toggle. Owner can switch between a list view and a kanban view. Kanban columns same as tenant view. Owner CAN interact (drag to change status, as appropriate for their role).
- Both views show full request detail: title, description, notes, status updates, photos.

### Claude's Discretion
- Download feedback UX (spinner vs toast vs download manager) — decide based on expected report size
- Column selection in export modal — decide per report type for v1
- Empty state for tenant with no active lease
- Payment history range for tenant (recommend: current lease period, all-time if no active lease)
- Exact skeleton shapes per widget type
- pg_graphql query structure and field selection
- Error boundary placement within dashboard layout

</decisions>

<specifics>
## Specific Ideas

- Chart animations should feel like the chart is "building itself" — not a loading spinner. The moment data arrives, the chart draws in. User shouldn't perceive it as waiting.
- Tenant portal kanban: read-only, clean columns, no drag interaction. Owner maintenance page: list/kanban toggle with interactive kanban.
- Branded PDF reports: modern layout with TenantFlow header, not a strict accounting document format. Should feel polished enough to share with investors.
- Background refetch errors → Sentry only, never surface to user. Keep stale data visible.

</specifics>

<deferred>
## Deferred Ideas

- Kanban UI for owner maintenance module (standalone redesign beyond the toggle added here) — this phase adds list/kanban toggle; a full kanban redesign with drag-and-drop columns, filtering, and bulk actions would be its own phase
- Tenant portal: lease document downloads (PDF of lease agreement) — future phase
- Tenant portal: direct messaging / notices from landlord — future phase
- Scheduled/recurring report exports (email delivery, automated generation) — future phase

</deferred>

---

*Phase: 53-analytics-reports-tenant-portal-rpcs-pg-graphql*
*Context gathered: 2026-02-21*
