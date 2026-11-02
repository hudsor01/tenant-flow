# 66.2-39 fix round 1, part F: reflow at 320px, the export controls, and dead code

Base `f48046894`. Scratch evidence: `scratchpad/exec/fix6/` (probe specs under `e2e/probe/`, logs under `e2e/`). Status colors and state labels (part F items 1 and 2) are in `status-colors.md` sections 7 and 8.

## 1. Reflow at 320 CSS px (WCAG 1.4.10; UI-SPEC VD-61)

### 1.1 Sweep

- Routes: every `page.tsx` in `src/app` (97). Covered: all public pages; every owner page owner A can reach; owner A's newest property, tenant, lease, unit, inspection and application with their edit pages (ids read over PostgREST as owner A); the `?tab=insights` tabs the analytics redirects land on; a blog post, a blog category and the four comparison pages (read from their index pages); an invalid `/sign/<token>` and `/apply/<token>`, and a live `/apply/<token>` from `tests/e2e/lib/application-fixtures.ts` (which reuses its links).
- Skipped, and why: `/admin/*` (owner A is not an admin; the proxy redirects to `/dashboard`); `/auth/signout` (an action, not a page); the `@modal/(.)…` intercepts (client overlays of the full-page twins covered here); a live `/sign/<token>` (no fixture mints one); `/maintenance/<id>` and its edit page (owner A has no maintenance request; the e2e skips them with that reason).
- Test: `document.documentElement.scrollWidth > clientWidth` at a 320x800 viewport, after hydration, `networkidle` and the entrance animations. An offender is an element whose box passes the viewport edge with no clipping or scrolling ancestor (content inside an `overflow-x` container, such as a data table, is excluded), reported outermost and, for the root cause, deepest.
- Command: `bun scratchpad/exec/fix6/e2e/run-probe.ts <log> reflow-320.spec.ts` against `next start -p 3062` (probe `e2e/probe/reflow-320.spec.ts`; deepest offenders `deep-320.spec.ts`; ancestor chains `chain-320.spec.ts`; header pieces `header-320.spec.ts`).

Result: **88 pages measured; 41 scrolled sideways on `f48046894`** (logs `e2e/reflow-before.log`, `e2e/reflow-dyn-before.log`); **0 after** (`e2e/reflow-after.log`).

### 1.2 Roots and fixes

| Root (pages) | Fix |
|--------------|-----|
| App header (37 of the 41): the left cluster (sidebar trigger and breadcrumb trail) had no `min-w-0`, so a two- or three-crumb trail pushed the sync status, bell and user menu past the viewport (the right cluster ended at 325-438px) | `app-shell-header.tsx`: the left cluster and the trail shrink (`min-w-0`), the right cluster does not (`shrink-0`); below sm only the current page's crumb shows, truncated (a parent crumb and the mobile "..." are hidden, as the middle crumbs already were); `GlobalSyncIndicator compactBelowSm` keeps the saved status's text for screen readers and shows its icon. At 320px the trail gets 84px ("Income Statement" fits; "Maintenance Request" truncates) and the controls end at 304px |
| An implicit grid track (lease template aside 336px in a 238px column; the unit edit form's property select, 285px): a `grid` with only responsive `*:grid-cols-N` sizes its one track to its widest unbreakable item | the class: every such grid in `src/`, found by `grep` for a `grid` class string with a responsive `grid-cols-` and no base one (73 `className` literals and one `cn()` string; the kanban board's `flex … sm:grid` is not one), takes `grid-cols-1` (`minmax(0, 1fr)`): 74 edits, `scratchpad/exec/fix6/implicit-grids-edits.txt`. Identical where the content fits |
| A chart with `aspect-video` and a fixed height (`/analytics/property-performance` 569px, `/properties?tab=insights` 533px): the aspect ratio set the width from the height, at any viewport | the class: the 7 `ChartContainer` uses with a height and no width (`lease-charts` x2, `property-charts`, `maintenance-charts` x2, property-performance `property-charts` x2) take the canonical `aspect-auto h-N w-full` the other five already use |
| A row of actions that could not wrap: the documents upload controls (property, tenant, lease and inspection detail, 425px), the units table header, the template form builder and preview headers, the vault results header, the clause rows' info button, the tenant quick actions (330px), the revenue chart header | `flex-wrap` (with a `gap`) on the row, or `min-w-0` on the label that should give way; the revenue chart's header stacks below sm (`flex-col`, its `sm:flex-row` intent) |
| The lease wizard stepper (386px): four titles beside four indicators | the titles are `max-sm:sr-only`, so they still name their steps |
| A blog post's comparison table (373px) | `markdown-content.tsx` renders a table inside a keyboard-focusable `overflow-x-auto` container (1.4.10 exempts the table, not the page) |

### 1.3 Every page, before and after

Widths are `document.documentElement.scrollWidth` at a 320px client width; the cause is the outermost offender before.

| Page | Kind | Before | After | Cause before |
|------|------|--------|-------|--------------|
| / | public | 320 | 320 |  |
| /about | public | 320 | 320 |  |
| /analytics -> /analytics/overview | owner | 366 | 320 | app header controls; `flex` "Last 6 months" |
| /analytics/financial | owner | 365 | 320 | app header controls |
| /analytics/leases -> /leases | owner | 320 | 320 |  |
| /analytics/maintenance -> /maintenance | owner | 320 | 320 |  |
| /analytics/occupancy -> /properties | owner | 598 | 320 | `[&_.recharts-cartesian-axis-tick_text]:f` "[data-chart=chart-_r_12_] { "; `recharts-wrapper` "2026-012026-032026-052026-07" |
| /analytics/overview | owner | 366 | 320 | app header controls; `flex` "Last 6 months" |
| /analytics/property-performance | owner | 634 | 320 | app header controls; `[&_.recharts-cartesian-axis-tick_text]:f` "[data-chart=chart-_r_1u_] { "; `recharts-wrapper` "occupancyrevenueBulk-Import " |
| /applications | owner | 320 | 320 |  |
| /applications/<id> | owner | 408 | 320 | app header controls |
| /apply/<active token> | public | 320 | 320 |  |
| /apply/not-a-real-token | public | 320 | 320 |  |
| /auth/confirm-email | public | 320 | 320 |  |
| /auth/update-password | public | 320 | 320 |  |
| /billing/checkout/cancel | owner | 366 | 320 | app header controls |
| /billing/checkout/success | owner | 376 | 320 | app header controls |
| /billing/plans | owner | 325 | 320 | app header controls |
| /blog | public | 320 | 320 |  |
| /blog/category/software-vault | public | 320 | 320 |  |
| /blog/turbotenant-vs-apartments-com-complete-comparison-for-2025 | public | 373 | 320 | `` "FeatureTurboTenantApartments" |
| /compare | public | 320 | 320 |  |
| /compare/appfolio | public | 320 | 320 |  |
| /compare/buildium | public | 320 | 320 |  |
| /compare/rentredi | public | 320 | 320 |  |
| /contact | public | 320 | 320 |  |
| /dashboard | owner | 320 | 320 |  |
| /documents | owner | 320 | 320 |  |
| /documents/lease-template | owner | 382 | 320 | app header controls; `space-y-6` "Lease DetailsProvide base in"; `space-y-6` "Clause LibraryChoose the cla" |
| /documents/templates/maintenance-request | owner | 438 | 320 | app header controls; `flex items-center gap-2` "Add fieldSave"; `leading-none font-semibold flex items-ce` "Maintenance Request previewP" |
| /documents/templates/property-inspection | owner | 422 | 320 | app header controls; `flex items-center gap-2` "Add fieldSave"; `leading-none font-semibold flex items-ce` "Property Inspection previewP" |
| /documents/templates/rental-application | owner | 427 | 320 | app header controls; `flex items-center gap-2` "Add fieldSave"; `leading-none font-semibold flex items-ce` "Rental Application previewPr" |
| /documents/templates/tenant-notice | owner | 400 | 320 | app header controls; `flex items-center gap-2` "Add fieldSave"; `leading-none font-semibold flex items-ce` "Tenant Notice previewPreview" |
| /documents/vault | owner | 356 | 320 | app header controls; `flex items-center gap-3` "Showing 1-2 of 2Download all" |
| /faq | public | 320 | 320 |  |
| /features | public | 320 | 320 |  |
| /help | public | 320 | 320 |  |
| /inspections | owner | 320 | 320 |  |
| /inspections/<id> | owner | 425 | 320 | app header controls; `flex items-center gap-2` "OtherUpload" |
| /inspections/new | owner | 366 | 320 | app header controls |
| /leases | owner | 320 | 320 |  |
| /leases/<id> | owner | 425 | 320 | app header controls; `flex items-center gap-2` "OtherUpload" |
| /leases/<id>/edit | owner | 425 | 320 | app header controls; `flex items-center gap-2` "OtherUpload" |
| /leases/new | owner | 386 | 320 | app header controls; `relative flex not-last:flex-1 items-cent` "4ReviewConfirm & create" |
| /leases?tab=insights | owner | 320 | 320 |  |
| /login | public | 320 | 320 |  |
| /maintenance | owner | 320 | 320 |  |
| /maintenance/new | owner | 374 | 320 | app header controls |
| /maintenance/vendors | owner | 385 | 320 | app header controls |
| /maintenance?tab=insights | owner | 320 | 320 |  |
| /notifications | owner | 320 | 320 |  |
| /pricing | public | 320 | 320 |  |
| /pricing/cancel | public | 320 | 320 |  |
| /privacy | public | 320 | 320 |  |
| /profile | owner | 320 | 320 |  |
| /properties | owner | 320 | 320 |  |
| /properties/<id> | owner | 425 | 320 | app header controls; `flex items-center gap-2` "Import UnitsAdd Unit"; `flex items-center gap-2` "OtherUpload" |
| /properties/<id>/edit | owner | 374 | 320 | app header controls |
| /properties/new | owner | 358 | 320 | app header controls |
| /properties/units | owner | 349 | 320 | app header controls; `flex` "Last 6 months" |
| /properties?tab=insights | owner | 598 | 320 | `[&_.recharts-cartesian-axis-tick_text]:f` "[data-chart=chart-_r_17_] { "; `recharts-wrapper` "2026-012026-032026-052026-07" |
| /reports | owner | 320 | 320 |  |
| /reports/balance-sheet | owner | 351 | 320 | app header controls |
| /reports/cash-flow | owner | 333 | 320 | app header controls |
| /reports/expenses | owner | 361 | 320 | app header controls |
| /reports/generate | owner | 357 | 320 | app header controls |
| /reports/income-statement | owner | 366 | 320 | app header controls |
| /reports/tax-documents | owner | 373 | 320 | app header controls |
| /reports/year-end | owner | 333 | 320 | app header controls |
| /resources | public | 320 | 320 |  |
| /resources/landlord-tax-deduction-tracker | public | 320 | 320 |  |
| /resources/seasonal-maintenance-checklist | public | 320 | 320 |  |
| /resources/security-deposit-reference-card | public | 320 | 320 |  |
| /search | public | 320 | 320 |  |
| /security-policy | public | 320 | 320 |  |
| /settings | owner | 320 | 320 |  |
| /settings/billing -> /settings | owner | 320 | 320 |  |
| /sign/not-a-real-token | public | 320 | 320 |  |
| /stripe/cancel | public | 320 | 320 |  |
| /stripe/success | public | 320 | 320 |  |
| /tenants | owner | 330 | 320 | `text-left` "AnalyticsView insights" |
| /tenants/<id> | owner | 425 | 320 | app header controls; `flex items-center gap-2` "OtherUpload" |
| /tenants/<id>/edit | owner | 359 | 320 | app header controls |
| /tenants/new | owner | 343 | 320 | app header controls |
| /terms | public | 320 | 320 |  |
| /units | owner | 320 | 320 |  |
| /units/<id>/edit | owner | 341 | 320 | app header controls; `group/field flex w-full gap-3 data-[inva` "Property *rls-sign-test-1789"; `group/field flex w-full gap-3 data-[inva` "Unit Number *" |
| /units/new | owner | 325 | 320 | app header controls |

### 1.4 E2E

`tests/e2e/lib/reflow.ts` holds the route lists and `expectNoPageOverflow`: navigate, poll `main` until react-dom has hydrated it, then read `scrollWidth`, `clientWidth` and a layout gate through `polledRead` (the main landmark has a box, no loading skeleton, no running entrance animation, and an app-shell header has its user menu), and assert the width outside the poll. `tests/e2e/tests/owner-reflow-320.spec.ts` (listed in the `owner-axe` testMatch, ignored by `chromium`) covers the owner pages and the detail pages; `tests/e2e/tests/public/reflow-320.spec.ts` (the `public` project) the public pages, the index-linked pages and the live apply link.

Runs against `next start -p 3062`: on the `f48046894` build 36 failed, 1 skipped, 40 passed (`e2e/red-reflow.log`); on the fixed build three consecutive runs of 76 passed, 1 skipped (owner A has no maintenance request; `e2e/green-reflow-2.log`, `-3.log`, `-4.log`).

## 2. Export, Download and Print controls (UI-SPEC VD-58, VD-62)

Command: `rg -n` over `src/**/*.tsx` minus tests for the labels (`>\s*(Export|Download|Print)…<`, a bare label line, a quoted label: 51 hits) and for the icons (`<Download`, `<Printer`, `<FileDown`, `<FileSpreadsheet`, `<DownloadCloud`, `<ArrowDownToLine`: 27 sites); each control's handler was read.

| Control | Handler |
|---------|---------|
| Income statement Export, Balance sheet Export | none: fixed (`a9e06d461`, VD-58) |
| Tenants quick action "Export / Download data" | none: fixed, downloads the tenants the list shows (`604dd7088`) |
| Tenant selection bar Export | logged and cleared the selection: fixed, downloads the selected tenants and keeps them selected |
| Leases selection bar Export | none: fixed, downloads the selected leases |
| Tenants quick actions "Message All" (same row, not a label in the sweep) | none, and no bulk email feature exists: deleted; "Analytics" (same row, none) now links to `/analytics/overview` |
| Cash flow Export | wired in part D (`973fec763`) |
| Expenses Export CSV, bulk import "Download failed rows" | wired in part E |
| Settings "Download My Data" (account data, GDPR) | `exportData.mutate()` |
| Billing history "Download" | `<a href={downloadHref}>` |
| Tax documents and Year-end "Download PDF" | `downloadPdfMutation.mutate(…)` |
| Year-end "Download CSV" x2, `export-buttons.tsx`, the `/analytics/financial` export | wired; out of this part (owner decision pending) |
| Download Signed Lease | `handleDownload` |
| Print / Save as PDF (`print-button.tsx`) | `window.print()` |
| Maintenance "Print work order", maintenance header "Export request" | `handleDownloadWorkOrder`, `handleExport` |
| Bulk import template "Download" | inline handler |
| Lead magnet "Download resource" | `<a href={downloadUrl}>` |
| Template preview "Export PDF", lease template "Render PDF" | `onExport`, `onGenerate` |
| Documents vault "Download all", document row download | `handleBulkDownload`, `<a href={doc.signed_url}>` |
| Generate reports format buttons | `onGenerate(report.id, format)` |
| Resources "View & Print" | the card is a `<Link>` |
| Landing feature illustration Download icon, blog "Download our free related resource" | not controls (an illustration; text beside a `<Link>`) |

## 3. Dead code

### 3.1 Uncalled exports in the Playwright support modules

Command: `node scratchpad/exec/fix6/import-callers.mjs` (an import-graph check: which tracked file imports which name from which module), with `dead-exports.sh` (`git grep -w` over code files) as the cross-check. git grep alone cannot prove a generic name (`createTenant`, `batch`) live, because unrelated files use the word. Scope: every non-spec module under `tests/e2e` (19 files; the brief's `helpers/` and `lib/` plus `fixtures/`, `utils/`, `constants/`, `test-data/` and the top-level helpers).

Result on `f48046894`: 140 exports, **97 with no importer**. Pruned to a fixpoint (`prune-dead.mjs`): 87 declarations deleted, 4 files emptied and deleted (`tests/utils/tanstack-helpers.ts`, `test-data/stripe-test-data.ts`, `tests/fixtures/property-data.ts`, `tests/fixtures/auth.fixture.ts`), 10 names un-exported (used only in their own module), plus the README of the deleted TanStack suite and the two tsconfig globs that matched nothing. After: 43 exports, 0 without an importer. The per-name `git grep -w` record: `scratchpad/exec/fix6/dead-exports-proof.txt`. Guard: `tests/e2e/lib/__tests__/e2e-support-exports-have-callers.test.ts` (`expected [ …(97) ] to deeply equal []` on `f48046894`).

### 3.2 The onboarding step indicator

`StepIndicator` returns null on the welcome and complete steps and maps over `STEPS` minus those two, the constant `["property"]`, so it only renders on the property step, as that step's current bar: the completed (`bg-primary/50`) and upcoming (`bg-muted`) branches could not render. Deleted; the DOM is unchanged. Test: `onboarding-step-indicator.test.tsx`.

### 3.3 deno check

Command: `deno check --no-lock --cached-only --node-modules-dir=none --import-map=supabase/functions/deno.json supabase/functions/<fn>/index.ts` for all 17 functions.

| Function | Diagnostics on `f48046894` | Here |
|----------|---------------------------|------|
| export-report, generate-pdf, send-lease-reminders | 1 each (tier-gate.ts:118) | 0 |
| lease-signature | 3 (tier-gate.ts:118, lease-signing.ts:54, index.ts:186) | 0 |
| apply-token | 1 (lease-signing.ts:54) | 0 |
| sign-lease-token | 2 (lease-signing.ts:54, index.ts:222) | 0 |
| resend-webhook | 1 (index.ts:125) | 0 |
| export-user-data | 1 (index.ts:103) | 0 |
| stripe-webhooks | 20 (5 handler calls, 15 rows typed never) | 0 |
| the other 8 | 0 | 0 |

Roots: the gate_events insert passed a PromiseLike (the query builder's `.then()`) where `EdgeRuntime.waitUntil` takes a Promise (now an async function); `Uint8Array<ArrayBufferLike>` where a BufferSource or BodyInit is required (`renderLeasePdf` returns the ArrayBuffer-backed bytes pdf-lib allocates, `sha256Hex` and the Svix secret keep that type); `ReturnType<typeof createClient>` read the generic factory unresolved (now `SupabaseClient`, what `createAdminClient()` returns).

Emitted JavaScript: `deno bundle` of every function before and after (`bundle-diff.sh`): identical for 14; **different for export-report, generate-pdf and lease-signature** (the tier-gate change; they call `checkTierEntitlement`). send-lease-reminders imports only `GROWTH_AND_MAX_PLANS` from tier-gate.ts, so its bundle is identical, but its deployed source graph includes the changed module. The type-only files print identical JavaScript (`emit-diff.mjs`). The 402 path behaves the same before and after (`deno/tier-gate-parity.ts`: same row, same capture, a native Promise to waitUntil, same response), and the in-process deno tests pass (lease-signature-metering 5, lease-signing 12, send-lease-reminders 25, rate-limit-sentry 2).
