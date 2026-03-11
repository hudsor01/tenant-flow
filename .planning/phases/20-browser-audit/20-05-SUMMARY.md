---
phase: 20-browser-audit
plan: 05
status: complete
started: 2026-03-09
completed: 2026-03-09
---

# Plan 20-05: Owner Dashboard Core Pages Browser Audit

## Result: FAIL

**Summary:** Audited 32 owner-facing routes at desktop viewport (1440px+). Mobile viewport testing was not possible due to Chrome MCP resize limitations (CSS media queries not triggered by window resize on Retina displays). Of the 32 pages tested, 19 loaded successfully, 10 showed data loading errors, 1 was completely broken by a build error, 1 returned a proper 404, and 1 showed a hydration mismatch. Two critical bugs were discovered that require code fixes.

### Critical Bugs Found

1. **`/analytics/financial` -- Blank page (build-breaking import error)**
   - `export-buttons.tsx:76` imports `#lib/utils/api-error.js` via dynamic import, but module resolution fails
   - The file `src/lib/utils/api-error.ts` exists, but the `.js` extension in the dynamic `import()` is not resolved correctly by Next.js/Turbopack
   - Page renders completely blank (no layout, no sidebar, nothing)
   - Console error: `Module not found: Can't resolve '#lib/utils/api-error.js'`

2. **`/leases/new` -- Inline query errors reveal DB schema issues**
   - "Failed to load properties: permission denied for table properties"
   - "Failed to load tenants: column tenants.first_name does not exist"
   - These are real PostgREST/RLS errors surfaced in the UI, not just empty states

### Minor Issues

3. **`/maintenance/vendors` -- Duplicate title suffix**: Page title renders as "Vendors | TenantFlow | TenantFlow"
4. **`/billing/plans` -- Hydration mismatch**: Body `style` attribute differs between server and client (`overflow-x`/`overflow-y`). React warning in console.
5. **`/tenants/{id}` and `/tenants/{id}/edit` -- Error boundary crash**: When ID not found, these pages hit the error boundary ("Something went wrong") instead of showing a graceful "Tenant not found" message like `/properties/{id}` does.
6. **`/maintenance/{id}` -- Error boundary crash**: Same pattern as tenants -- crashes to error boundary instead of graceful not-found.

### Data Loading Errors (Consistent Pattern)

Multiple list pages show "Error Loading [Entity]" / "Failed to load [entity]". This appears to be a systemic issue with the authenticated Supabase client in this session (AuthProvider logs "Failed to get auth user"). Pages affected:
- `/properties` -- "Error Loading Properties"
- `/tenants` -- "Error Loading Tenants"
- `/leases` -- "Error Loading Leases"
- `/units` -- "Error Loading Units"
- `/inspections` -- "Failed to load inspections"
- `/profile` -- "Failed to load profile"
- `/payments/methods` -- "Something went wrong" (full error boundary)
- `/properties/{id}/edit` -- "Error Loading Property"

Note: Some pages using similar data patterns load fine (e.g., `/maintenance`, `/rent-collection`, `/properties/units`, `/analytics/overview`), suggesting the error may be permission/RLS-related for specific tables rather than a blanket auth failure.

## AUDIT-LOG

| # | Page | Route | Status | Key Elements Verified | Issues Found |
|---|------|-------|--------|----------------------|--------------|
| 1 | Dashboard | `/dashboard` | PASS | Welcome/onboarding state, quick action links, breadcrumb, sidebar nav, skip-to-content | Empty state shown (no properties); Getting Started dialog appeared |
| 2 | Profile | `/profile` | FAIL | Page title correct | "Failed to load profile" with "Try Again" button |
| 3 | Payment Methods | `/payments/methods` | FAIL | None | Full error boundary: "Something went wrong" |
| 4 | Rent Collection | `/rent-collection` | PASS | Stats cards (Collected, Pending, Overdue, On-Time Rate), tabs (Autopay, Upcoming, History), table, Export/Record Payment buttons | Empty data state, all UI elements present |
| 5 | Vendors | `/maintenance/vendors` | PASS | "No vendors yet" empty state, "Add Vendor" button, trade filter | Title bug: "Vendors \| TenantFlow \| TenantFlow" |
| 6 | Properties List | `/properties` | FAIL | Breadcrumb, sidebar | "Error Loading Properties" / "Failed to load properties" |
| 7 | Properties New | `/properties/new` | PASS | Full form: name, type (6 options), address fields, city/state/zip/country, purchase price/date, image upload | All inputs present and interactive |
| 8 | Property Detail | `/properties/{id}` | PASS | "Property not found" with "Back to Properties" link | Proper not-found handling for missing ID |
| 9 | Property Edit | `/properties/{id}/edit` | FAIL | Breadcrumb, sidebar | "Error Loading Property" / "Failed to load property" |
| 10 | Properties Units | `/properties/units` | PASS | Stats cards (Total Units, Occupied, Vacant, Maintenance), Revenue vs Expenses chart, time range selector (7D/30D/6M/1Y), "Add Unit" button | Empty data state, all UI elements present |
| 11 | Units List | `/units` | FAIL | Title correct | "Error Loading Units" / "Failed to load units" |
| 12 | Units Page | `/units/page` | 404 | "Page not found" with "Back to Dashboard" link | Route does not exist (despite page.tsx file in app dir) |
| 13 | Units New | `/units/new` | PASS | Full form: property select, unit number, bedrooms, bathrooms, sq ft, rent, status (Vacant/Occupied/Maintenance/Reserved), Cancel/Create buttons | All inputs present |
| 14 | Unit Edit | `/units/{id}/edit` | PASS | Edit form with same fields as new, "Save Changes" button | Empty fields for missing ID, no crash |
| 15 | Tenants List | `/tenants` | FAIL | Breadcrumb, sidebar | "Error Loading Tenants" / "Failed to load tenants" |
| 16 | Tenants New | `/tenants/new` | PASS | Invitation form: first name, last name, email, phone, "No properties configured" note, Cancel/Send Invitation buttons | All inputs present |
| 17 | Tenant Detail | `/tenants/{id}` | FAIL | None | Error boundary crash: "Something went wrong" (not graceful not-found) |
| 18 | Tenant Edit | `/tenants/{id}/edit` | FAIL | None | Error boundary crash: "Something went wrong" (not graceful not-found) |
| 19 | Leases List | `/leases` | FAIL | Breadcrumb, sidebar | "Error Loading Leases" / "Failed to load leases" |
| 20 | Leases New | `/leases/new` | PARTIAL | Multi-step wizard (Selection, Terms, Details, Review), property/unit/tenant selects | Inline errors: "permission denied for table properties", "column tenants.first_name does not exist" |
| 21 | Lease Detail | `/leases/{id}` | PASS | "Lease overview" heading, descriptive subtitle | Graceful inline error: "Unable to load lease" |
| 22 | Lease Edit | `/leases/{id}/edit` | FAIL | Breadcrumb, sidebar | "Error Loading Lease" / "Failed to load lease" |
| 23 | Maintenance List | `/maintenance` | PASS | "No maintenance requests" empty state, "Create Request" button | Proper empty state |
| 24 | Maintenance New | `/maintenance/new` | PASS | Full form: unit select, tenant ID, title, description, priority (4 levels), estimated cost, scheduled date, Cancel/Create buttons | All inputs present |
| 25 | Maintenance Detail | `/maintenance/{id}` | FAIL | "Maintenance request" heading (partial render) | Error boundary crash: "Something went wrong" |
| 26 | Maintenance Edit | `/maintenance/{id}/edit` | FAIL | Breadcrumb, sidebar | "Error Loading Request" / "Failed to load maintenance request" (graceful) |
| 27 | Analytics Overview | `/analytics/overview` | PASS | Stats cards (Occupancy, Active Tenants, Monthly Revenue, Open Maintenance), Revenue & Expenses Trend chart, time period selector | All UI elements present, empty data |
| 28 | Analytics Financial | `/analytics/financial` | FAIL | None -- completely blank page | Build error: `Module not found: Can't resolve '#lib/utils/api-error.js'` in export-buttons.tsx |
| 29 | Analytics Property Perf | `/analytics/property-performance` | PASS | "Property Performance" heading, "No property performance data yet" empty state | Proper empty state |
| 30 | Reports Generate | `/reports/generate` | PASS | Period selector, Executive Reports section, Financial Reports section, PDF/EXCEL export buttons | All UI elements present |
| 31 | Settings | `/settings` | PASS | Tabs (General, Notifications, Security, Billing, My Data), Business Profile form, Theme/Data Density/Timezone/Language preferences | Full settings UI present |
| 32 | Documents | `/documents` | PASS | Template cards (Lease Agreement, Property Inspection Report), "View Details"/"Access Template" links | Full template listing |
| 33 | Lease Template | `/documents/lease-template` | PASS | "Lease Agreement Builder" heading, workflow steps (Select clauses, Apply state rules, Preview) | Full builder UI |
| 34 | Income Statement | `/financials/income-statement` | PASS | Year/month selectors, Revenue Breakdown (Rental Income, Late Fees, Other), Expense Breakdown, Net Income Summary, Export button | All sections present with $0 data |
| 35 | Cash Flow | `/financials/cash-flow` | PASS | Opening/Closing Balance, Inflows/Outflows, Net Cash Flow, Cash Flow by Activity (Operating/Investing/Financing) | All sections present |
| 36 | Balance Sheet | `/financials/balance-sheet` | PASS | Assets/Liabilities/Equity sections, Current vs Fixed Assets, "Balanced" indicator | Full accounting layout |
| 37 | Tax Documents | `/financials/tax-documents` | PASS | Year selector, "Download PDF" button, "No data for 2026" empty state | Proper empty state |
| 38 | Billing Plans | `/billing/plans` | PASS | Plan cards (Free, Starter $29/mo, Professional $79/mo), feature lists, "Get Started" buttons | Hydration mismatch warning in console |
| 39 | Inspections | `/inspections` | FAIL | "Inspections" heading, "New Inspection" button | "Failed to load inspections" inline error |

## Viewport Testing Note

Mobile viewport testing (375px width) could not be completed. The Chrome MCP `resize_window` tool resizes the OS window, but `window.innerWidth` remains at the full resolution (2880px on Retina). CSS media queries are not triggered by this approach. Mobile responsiveness should be verified via Chrome DevTools device emulation or Playwright tests.

## Console Errors Summary

| Error | Pages Affected | Severity |
|-------|---------------|----------|
| `Module not found: #lib/utils/api-error.js` | `/analytics/financial` | CRITICAL -- page completely blank |
| `[AuthProvider] Failed to get auth user` | All pages | IGNORED per instructions |
| Hydration mismatch (body style) | `/billing/plans` | LOW -- cosmetic, React warning only |

## Recommendations

1. **Fix `export-buttons.tsx` import** -- Change `await import('#lib/utils/api-error.js')` to `await import('#lib/utils/api-error')` (drop `.js` extension) or verify the path alias configuration in `tsconfig.json`
2. **Fix `/leases/new` query errors** -- Investigate "permission denied for table properties" RLS policy and "column tenants.first_name does not exist" schema mismatch
3. **Add graceful not-found handling** to `/tenants/{id}`, `/tenants/{id}/edit`, and `/maintenance/{id}` (currently crash to error boundary instead of showing "not found" like properties does)
4. **Fix duplicate title** on `/maintenance/vendors` ("Vendors | TenantFlow | TenantFlow")
5. **Investigate systematic data loading failures** on list pages -- may be RLS policy issue or auth token expiration affecting this specific user session
6. **Fix hydration mismatch** on `/billing/plans` (body overflow style SSR/client mismatch)
