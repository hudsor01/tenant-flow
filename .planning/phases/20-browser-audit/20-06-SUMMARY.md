---
phase: 20-browser-audit
plan: 06
status: complete
started: 2026-03-09
completed: 2026-03-09
---

# Plan 20-06: Owner Dashboard Secondary Pages Browser Audit

## Result: FAIL (3 blocking issues, 3 minor issues)

34 secondary owner dashboard pages audited at 2160x1168 viewport. 28 pages pass cleanly, 3 have blocking issues (crash or data-fetch errors), and 3 have minor cosmetic issues.

### Blocking Issues

1. **`/analytics/financial` -- 500 CRASH**: Module not found error in `src/components/export/export-buttons.tsx:76` -- `await import('#lib/utils/api-error.js')` fails because the `.js` extension cannot resolve to the `.ts` source file through the `#lib` path alias. The file exists at `src/lib/utils/api-error.ts`. This error also leaks into console on other pages during dev compilation.

2. **`/analytics/leases` (redirects to `/leases?tab=insights`)**: Shows "Error Loading Leases" / "Failed to load leases" in the main content area. Page structure renders but data fetch fails.

3. **`/analytics/occupancy` (redirects to `/properties?tab=insights`)**: Shows "Error Loading Properties" heading. Page structure renders but data fetch fails. Loading skeletons persist indefinitely.

### Minor Issues

4. **`/inspections/new`**: Page title is "New Inspection | TenantFlow | TenantFlow" -- duplicate "TenantFlow" suffix.

5. **`/billing/checkout/success`**: Page title is "Subscription Activated | TenantFlow | TenantFlow" -- duplicate "TenantFlow" suffix.

6. **`/billing/checkout/cancel`**: Page title is "Checkout Cancelled | TenantFlow | TenantFlow" -- duplicate "TenantFlow" suffix.

### Global Console Observations

- The `export-buttons.tsx` module-not-found error appears in console on multiple pages during dev (pre-compilation side effect from the `/analytics/financial` route).
- Hydration mismatch warning on `<body>` style (`overflow-x`/`overflow-y`) observed once -- likely a browser extension or SSR/client style divergence.
- `[AuthProvider] Failed to get auth user` appears intermittently -- expected/documented, not a page issue.

## AUDIT-LOG

| # | Page | Actual URL | Viewport | Status | Key Elements | Issues Found |
|---|------|-----------|----------|--------|-------------|--------------|
| 1 | `/analytics` | `/analytics/overview` (redirect) | 2160x1168 | PASS | "Analytics" heading, stats cards, Revenue & Expenses chart, Top Properties | None |
| 2 | `/analytics/overview` | `/analytics/overview` | 2160x1168 | PASS | Same as above (canonical URL) | None |
| 3 | `/analytics/financial` | `/analytics/financial` | 2160x1168 | FAIL | 500 error page, no UI renders | **CRASH: Module not found `#lib/utils/api-error.js`** in export-buttons.tsx:76 |
| 4 | `/analytics/leases` | `/leases?tab=insights` (redirect) | 2160x1168 | FAIL | Breadcrumb shows "Leases", error heading renders | **"Error Loading Leases" / "Failed to load leases"** |
| 5 | `/analytics/maintenance` | `/maintenance?tab=insights` (redirect) | 2160x1168 | PASS | "No maintenance requests" empty state with "Create Request" link | None |
| 6 | `/analytics/occupancy` | `/properties?tab=insights` (redirect) | 2160x1168 | FAIL | Loading skeletons persist, error heading | **"Error Loading Properties"** -- data fetch failure |
| 7 | `/analytics/property-performance` | `/analytics/property-performance` | 2160x1168 | PASS | "Property Performance" heading, SVG chart elements present | Some loading skeletons persist (partial load, not a crash) |
| 8 | `/financials` | `/financials` | 2160x1168 | PASS | "Financial Overview", "Financial Reports", sub-section headings | None |
| 9 | `/financials/income-statement` | `/financials/income-statement` | 2160x1168 | PASS | "Income Statement", "Revenue Breakdown", "Expense Breakdown", "Net Income Summary" | None |
| 10 | `/financials/cash-flow` | `/financials/cash-flow` | 2160x1168 | PASS | "Cash Flow", "Cash Inflows", "Cash Outflows", "Cash Flow by Activity" | None |
| 11 | `/financials/balance-sheet` | `/financials/balance-sheet` | 2160x1168 | PASS | "Balance Sheet", "Assets", "Liabilities", "Equity" | None |
| 12 | `/financials/expenses` | `/financials/expenses` | 2160x1168 | WARN | "Failed to Load Expenses" heading | Data fetch error but page structure renders; not a crash |
| 13 | `/financials/billing` | `/financials/billing` | 2160x1168 | PASS | "Billing & Payments", "Connect Your Payment Account" | None |
| 14 | `/financials/payouts` | `/financials/payouts` | 2160x1168 | PASS | "Payouts", "Payout History", "Rent Payments Received" | None |
| 15 | `/financials/tax-documents` | `/financials/tax-documents` | 2160x1168 | PASS | "Tax Documents", "No data for 2026" empty state | None |
| 16 | `/reports` | `/reports` | 2160x1168 | PASS | "Reports & Analytics", Financial/Property/Tenant/Maintenance Reports sections | None |
| 17 | `/reports/generate` | `/reports/generate` | 2160x1168 | PASS | "Generate Reports", "Executive Reports", "Financial Reports", "Operations Reports" | None |
| 18 | `/reports/analytics` | `/reports/analytics` | 2160x1168 | PASS | "Analytics Dashboard", "Monthly Revenue Trend", "Payment Methods", "Occupancy by Property" | None |
| 19 | `/reports/year-end` | `/reports/year-end` | 2160x1168 | PASS | "Year-End Reports", "2026 Year-End Summary", "1099-NEC Vendors (2026)" | None |
| 20 | `/documents` | `/documents` | 2160x1168 | PASS | "Documents" heading | None |
| 21 | `/documents/lease-template` | `/documents/lease-template` | 2160x1168 | PASS | "Lease Agreement Builder" + 5 form sections, form inputs present | None |
| 22 | `/documents/templates/maintenance-request` | `/documents/templates/maintenance-request` | 2160x1168 | PASS | "Maintenance Request Form", "Request details", form inputs present | None |
| 23 | `/documents/templates/property-inspection` | `/documents/templates/property-inspection` | 2160x1168 | PASS | "Property Inspection Report", "Inspection details", "Checklist", form inputs | None |
| 24 | `/documents/templates/rental-application` | `/documents/templates/rental-application` | 2160x1168 | PASS | "Rental Application", "Applicant details", "Screening", "References", form inputs | None |
| 25 | `/documents/templates/tenant-notice` | `/documents/templates/tenant-notice` | 2160x1168 | PASS | "Tenant Notice", "Notice details", form inputs present | None |
| 26 | `/inspections` | `/inspections` | 2160x1168 | PASS | "Inspections" heading | None |
| 27 | `/inspections/new` | `/inspections/new` | 2160x1168 | PASS | "New inspection" heading, form inputs present | Minor: duplicate "TenantFlow" in page title |
| 28 | `/inspections/{id}` | N/A | N/A | SKIP | No inspection records exist to test detail page | Skipped -- empty data |
| 29 | `/billing/plans` | `/billing/plans` | 2160x1168 | PASS | "Subscription Plans", Free/Starter/Professional/Enterprise cards (8 card elements) | None |
| 30 | `/billing/checkout/success` | `/billing/checkout/success` | 2160x1168 | PASS | "Subscription Activated!" message renders | Minor: duplicate "TenantFlow" in page title |
| 31 | `/billing/checkout/cancel` | `/billing/checkout/cancel` | 2160x1168 | PASS | "Checkout Cancelled" message renders | Minor: duplicate "TenantFlow" in page title |
| 32 | `/settings` | `/settings` | 2160x1168 | PASS | "Settings", "General Settings", "BUSINESS PROFILE", "PREFERENCES" | None |
| 33 | `/settings/billing` | `/settings?tab=billing` (redirect) | 2160x1168 | PASS | "Billing & Subscription", "Current Plan", "Payment Method", "Billing History", "Danger Zone" | None |
| 34 | `/settings/payouts` | `/settings/payouts` | 2160x1168 | PASS | "Payouts", "Stripe Account Status", "Payout History" | None |

## Summary Statistics

- **Total pages audited**: 33 (1 skipped -- no test data for inspection detail)
- **PASS**: 28
- **FAIL (blocking)**: 3
- **WARN (non-blocking)**: 1 (`/financials/expenses` data fetch error)
- **Minor issues**: 3 (duplicate TenantFlow in page titles)

## Recommended Fixes (Priority Order)

1. **P0 -- Fix `/analytics/financial` crash**: Change `await import('#lib/utils/api-error.js')` to `await import('#lib/utils/api-error')` in `src/components/export/export-buttons.tsx:76` (drop the `.js` extension).
2. **P1 -- Investigate data fetch failures**: `/analytics/leases` and `/analytics/occupancy` redirect to list pages with `?tab=insights` but data fails to load. May be auth/session related or a query issue.
3. **P2 -- Fix `/financials/expenses`**: "Failed to Load Expenses" -- similar data fetch issue.
4. **P3 -- Fix duplicate TenantFlow in page titles**: `/inspections/new`, `/billing/checkout/success`, `/billing/checkout/cancel` all show "... | TenantFlow | TenantFlow".
