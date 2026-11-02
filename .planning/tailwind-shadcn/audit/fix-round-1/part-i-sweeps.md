# Fix round 1, part I: class sweeps

Base `a04bdc464` (end of part H). Each section is one defect class: the command, the candidate count, and every hit with its resolution. Sweep scripts that are not one-liners ran from the session scratch directory (`scratchpad/i/`); their logic is stated here so the sweep can be rerun.

## 1. UI fed by an always-empty literal (item 1, `65f33489f`, `78e2944c3`)

Command: `empty-literal-sweep.cjs`, a `@babel/parser` walk of every non-test `src/**/*.{ts,tsx}` (902 files) for (A) `const|let x = []` (also `as T[]`, `satisfies`, `<T>[]`) never mutated (no `push`/`unshift`/`splice`/`sort`/`reverse`/`fill`/`copyWithin`/`pop`/`shift`/`set`/`add`/`delete`/`clear`, index write or reassignment), (B) an object whose every property is a literal and that is never mutated, (C) `useState(<empty or constant literal>)` whose setter is never called. 174 candidates.

| Kind | Count | Resolution |
|------|-------|-----------|
| A, local | 2 | **defects**. `/analytics/overview` `const properties = [] as PropertyPerformance[]`: the card always said "No property data available yet." The data was already on the page: `get_dashboard_data_v2`'s `property_performance` (units, occupancy, monthly revenue), selected by `usePropertyPerformance()` from the cache `useDashboardStats()` fills (no extra request). `/analytics/property-performance`'s `get_property_performance_analytics` query was checked and rejected: it carries no unit counts (its mapper writes `totalUnits: 0`). Wired (VD-65). The lease template builder's `const customClauses: CustomClause[] = []`: no editor and no stored template supplies a custom clause, so `renderCustomClauses` only returned `""` (and its markup never closed `<article>`): the type field, the renderer and the defaults are deleted, the rendered lease unchanged |
| A, module | 1 | `landing/features-data.ts` `testimonials`: the deliberate Phase 67 gate (no verified customer quotes); `TestimonialsSection` renders nothing while it is empty. Not a defect: deleting it is a product call |
| B, local | 16 | lookup tables (`messages`, `typeMap`, `variants`, `labels`, `colorMap`, `config` x4, `badgeColors`, `statusColors`, `colorClasses`, `colorVariants`, `variantStyles`, `map`) and nuqs options (`FILTER_HISTORY`): not data placeholders |
| B, module | 155 | Next `metadata` and `viewport` exports, labels, config, fallbacks (`ZERO_CUMULATIVE`, `PROPERTY_FALLBACK`, `TENANT_FALLBACK` are the reset state and the 42P01 fallbacks): not defects |
| C | 0 | — |

Not in the class, recorded: the lease template builder's editable sample inputs (`builderInputs`: "Property Management LLC", "John Doe; Jane Doe") are prefilled form values the owner edits before rendering.

Guard: `src/lib/__tests__/no-always-empty-local-list.test.ts` (a local list declared empty that nothing fills; the two hits on `a4c4ae0d6`). Render test: `overview-top-properties.test.tsx` (4 fail with the `a4c4ae0d6` page).

## 2. Interactive content inside interactive content (item 2, `5d964bb20`)

Command: `nested-interactive-sweep.cjs`, a `@babel/parser` walk of every non-test `src/**/*.tsx` (598 files, 853 containers): for each element that renders a control of its own (an anchor; a button, menu item, toggle or a Radix `*Trigger`/`*Close` without `asChild`; `summary`; `label`), every control among its JSX descendants (an `asChild` element renders its child, so it is not a container). 10 hits.

| Hit | Resolution |
|-----|-----------|
| `<Link><Button/></Link>` x8: year-end Reports, tenant Edit, units Add Unit, inspections New Inspection, `/pricing/cancel` x4 | `<Button asChild><Link/></Button>`: one `<a>` with the button's classes, one tab stop (VD-66) |
| `multi-select-chips.tsx` option row (`<button role="option">`) holding the Radix `Checkbox` (`<button role="checkbox">`) | a span with the checkbox's classes, `aria-hidden`, `data-state` (VD-67) |
| `portfolio-preset-menu.tsx` delete `<button>` inside each apply `DropdownMenuItem` (the arrow keys never reach it; the apply item's accessible name also absorbed "Delete preset …") | two menu items in one row; delete keeps the menu open; its `hover:text-destructive` never showed (the item's `[&_svg:not([class*='text-'])]` color outranks it), so the icon keeps the item colors (VD-68) |

Radix triggers wrapping a Button without `asChild`: 0. `summary`: 0. `label` holding a button, a link or two controls: 0. Touching the preset menu brought it into the item 7 sweep: its `parseServerSide` type read became `inferParserType`.

Guards: `src/components/__tests__/no-nested-interactive.test.tsx` (the static shapes, 8 hits on `78e2944c3`; renders of the multi-select and the preset menu, both fail on `78e2944c3`). The dashboard-smoke E2E's preset lookups match the apply item by its exact name.

## 3. Raw error text shown to users (item 3, `2d39fc90a`)

Command: `raw-error-sweep.cjs`, a `@babel/parser` walk of every non-test `src/**/*.{ts,tsx}` (902 files) for every read of `.message`, `.error`, `.details`, `.hint`, `.statusText` or `.reason`, a `.text()` call, or an identifier initialized from one (traced through operators, templates and conditionals, never into a function), that reaches a toast call, a JSX expression, a `set*()` call or `new …Error(...)`. 109 hits (29 toast, 37 JSX, 5 state, 38 throw), plus a grep for messages pushed into arrays (3) and for `instanceof Error ? x.message` (54 lines).

| Hits | Resolution |
|------|-----------|
| toasts showing an error's text (26 of the 29 toast hits): billing plans x2, confirm-email, documents section, documents vault x2, rent-increase notice, send-for-signature preview, lease template builder, lease wizard, maintenance work order, photos card, owner subscribe dialog, pricing cards x2, account-data and GDPR deletion, categories x4, general settings x3, password, tenant move-out; and the per-file upload failures the documents section and photos card collect into a toast description (2) | **fixed**: `handleMutationError(err, context)`, or the title kept with `description: userFacingErrorMessage(err, fallback)` |
| the 12 query error states rendering `error.message` (lease edit, leases, maintenance edit, property edit, properties, balance sheet, cash flow, expenses, income statement, tax documents, tenants, units), the lease form's and the wizard's selection-step load errors (5), `LoadingTimeoutWrapper` | **fixed**: their own copy (a query error is never product copy; the now-unused `error` props are deleted) |
| `update-password-form`, login, `use-form-progress` submit, inspection photo upload, `use-supabase-upload`, bulk import (3) | **fixed**: `userFacingErrorMessage`; the bulk-import configs return the PostgrestError itself, so a row's message maps by SQLSTATE |
| `ErrorBoundary` printing the raw message under "Something went wrong" | **fixed**: development only (the Error ID is what support needs) |
| thrown errors built from a response: `PDF generation failed: ${errText}` (report keys, report mutations, lease template builder), the vault's and billing's status-line fallbacks, the lease-signature call's `statusText` fallback | **fixed**: `createApiErrorFromResponse` (new codes `PDF_GENERATION_FAILED`, `DOCUMENTS_DOWNLOAD_FAILED`), keeping an Edge Function's own JSON `error` copy (its 4xx explains itself; `errorResponse` sends "An error occurred" for anything else) |
| paywall toasts (`description: err.message` of a `PaywallError`) | the server's product copy; routed through `userFacingErrorMessage` (verbatim) so the guard's toast rule is absolute |
| the inspection dropzone's rejection toast (`${file.name} ${reason}`): the two mapped codes, else react-dropzone's own validation message | library validation copy, not an error's text |
| JSX false positives: `/sign/[token]` (`reasonMessage(context.reason)`), the application link panel (`createRejectionMessage`), the two-factor steps (fixed copy), the contact form's message field and validation errors, notification lines, the dropzone (sanitized upstream; react-dropzone's own validation copy, size mapped), bulk-import validation issues (zod copy), the sign form (`SIGN_ERROR_MESSAGE`), the wizard's zod step errors | not raw error text |
| throws in server code (blog, sitemap, feed, llms, search: Next shows a digest, never the message), mapper developer messages (now never rendered: the error states show their own copy), `validateMoveOutDate` (author copy) | not user-visible |
| the 54 `instanceof Error ? x.message` lines | logger / Sentry metadata, except the twelve error states and `use-form-progress` / `file-upload` / `property-form-upload` state that no component renders |

The one sanitizer is `userFacingErrorMessage` (`#lib/mutation-error-handler`): an `ApiError` shows `getUserMessage()`; the browser's own fetch failure ("Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed", "Network request failed") the network copy; a raw Postgres or PostgREST message (`RAW_DB_INTERNALS`, now including `permission denied for table|…`, `relation|column "…" does not exist` and `function …(…) does not exist`, or a `PGRST*` code) its SQLSTATE copy or the generic one; author copy verbatim. `handleMutationError` toasts through it.

Guard: `src/lib/__tests__/no-raw-error-text.test.ts` (a toast reading an error's text; JSX rendering `x instanceof Error ? x.message`; an error built from a response's text or status line: 44 hits on `5d964bb20`); `mutation-error-handler.test.ts` (the sanitizer); `documents-vault.test.tsx` (a non-JSON error body toasts the download copy, never "Bad Gateway").

## 4. Hover affordances on elements that are not controls (item 4, `ed7db2d48`)

Command: `hover-sweep.cjs`, a `@babel/parser` walk of every non-test `src/**/*.tsx` (598 files): each element whose className (literals, templates, `cn()` arguments) holds `hover:` bg, shadow, translate, border, scale, ring, text, opacity, underline, brightness or rotate (any variant prefix), or `cursor-pointer`, classified as a control (tag, handler, `href`, `htmlFor`, `asChild`, a control role, a tabIndex), inside a control, or neither. `group-hover`/`peer-hover` are driven by their parent's state and not counted. 296 elements: 247 controls, 3 inside a control, 46 neither. The `@utility` blocks in `globals.css` with a hover: `testimonial-card`, `showcase-card` (both on non-controls: removed), `accordion-item` (no element carries the class).

| Hits (46) | Resolution |
|-----------|-----------|
| 33 with nothing to click: lease and property stat cards (5), the unit status badge, the equity rows, the update-password card, bulk import's template card and preview rows, the portfolio grid cards, the profile security tiles (2), the property select card (and its image's group-hover zoom), the notification-settings rows (3), active sessions and billing history rows, tenant grid cards, the FAQ card (its button keeps its own hover), feature callouts, `/about` stats, the comparison table rows, the pricing card and comparison rows, the marketing feature cards (with 8 group-hover effects and 4 hover-only layers), how-it-works cards (and 2 group-hover effects), testimonials cards, premium CTA tiles (2, and their icons' group-hover), the logo cloud, the stats showcase (its border beam, glow, gradient and particles, all invisible at rest), the dashboard mockup's MetricCard and ActivityItem | **removed** with the transitions they alone used (VD-69) |
| 13 that keep it | rows holding their actions (`ui/table` `TableRow`, lease, property and tenant rows), the expense header row (`hover:bg-transparent` cancels the tint), dropzones (bulk import, inspection photos, property images: their root props carry the click), BreadcrumbLink and SidebarMenuSubButton (`Comp`: an `<a>` or its asChild child), the slider thumb, the maintenance card body (rendered inside its button or Link), the bento card (its hover reveals its link, as focus-within does) |

After: 262 elements, 246 controls, 3 inside a control, 13 neither (the reviewed 13). At rest nothing changes: only `hover:`, `group-hover:`, `transition-*`/`duration-*`/`ease-*` utilities and hover-only `opacity-0` layers are removed.

Guard: `src/components/__tests__/no-hover-on-static-elements.test.ts` (an element with a hover or pointer utility must be a control or a reviewed entry; every reviewed entry must stay live; 33 hits on `2d39fc90a`).

## 5. Report PDFs and XLSX printing bare numbers (item 5, `a4c4ae0d6`)

Before: `sectionedReportHtml` printed `String(value)` for every cell (61200, -250.5, 49.1) and `reportTableToXlsx` wrote money in General. Also found: both leaves rounded with `Math.round(v * k) / k`, which is not how the pages' formatter rounds (`Intl.NumberFormat`: the shortest decimal, a tie away from zero). Over owner-realistic inputs (revenue 100-5000 by 100, net -500..revenue by 1) the export's Portfolio ROI differed from the ROI card in 990 cases (-124.75: file -124.7, card -124.8); `toFixed(1)` differs in 677 (0.15: 0.1 against the card's 0.2).

| Change | Where |
|--------|-------|
| every table cell carries a format (`ReportCellFormat`: money, percent, plain), parallel to its rows | `financial-analytics-report.ts` (the Value column per item: ROI percent, counts plain, the rest money; the months' three amounts money), `tax-year-reports.ts` (`YEAR_END_FORMATS`, `TAX_DOCUMENTS_FORMATS`: Amount, Income, Expenses, Net Income money; the share percent) |
| the PDF prints money as `formatCurrency` (`$61,200.00`, `-$250.00`) and a percentage to one decimal with `%`, right-aligned with their headers | `_shared/report-format.ts` (`formatReportCell`), `report-html.ts` |
| an XLSX money cell stays a number with `z: '"$"#,##0.00'` (Excel and SheetJS show `$61,200.00`, `-$250.50`) | `report-xlsx.ts` |
| both leaves round with `Intl.NumberFormat` (money to cents, ROI to tenths); the tax-documents share keeps the page's `toFixed(1)` | the two leaves |
| the year-end section prints through `formatCurrency` (its `formatMoney` was a copy) | `year-end-report-section.tsx` |
| CSV unchanged: raw numbers | `report-csv.ts` |

The pages print: year-end, 1099-NEC and tax documents every amount with `formatCurrency`; the financial analytics page its payment summary and expense breakdown with `formatCurrency`, its ROI card with `NumberTicker` (one decimal) and `%`. The five overview cards animate whole dollars in `NumberTicker`, and the charts print no figures; the PDF prints those amounts to the cent, as the CSV holds them.

Proof: `report-format.test.ts` (money equals `formatCurrency` for ten amounts; shares equal the page's `${toFixed(1)}%` for 0-100 by 0.5; ROI equals the rendered `NumberTicker`; `XLSX.SSF.format` of the money format equals `formatCurrency`, negatives included); `financial-analytics-report.test.ts` and `tax-year-reports.test.ts` (the screen-side `cents` now reads `formatCurrency` back and the ROI side the rendered ticker; ROI -124.75, 0.15 and -24.95 and amounts -199.995 and 9000.505 match; the formats; red on `020129e78`: `expected -124.7 to be -124.8`); the Deno handler tests (every money cell of all four PDFs is `<td class="td num">$…</td>`, never bare; every XLSX cell read back with `cellNF`: money `z` and `w`, others General; red on `020129e78`: `61200` where `$61,200.00` was expected).

## 6. Dead report branches (item 6, `020129e78`, `65ab8eb4a`)

Callers (`git grep -nE "export-report|generate-pdf|functions/v1"` over `src`, `tests`, `scripts`, `.github`):

| Function | Caller | Sends |
|----------|--------|-------|
| export-report | `callExportEdgeFunction` (`report-keys.ts`, the `/analytics/financial` export buttons) | `type=financial-analytics` |
| export-report | `tests/e2e/tests/owner/reports-gate.spec.ts` | `type=year-end` |
| generate-pdf Mode 1 | `callGeneratePdfEdgeFunction` (the year-end and tax-documents Download PDF) | `year-end`, `financial` |
| generate-pdf Mode 2 | `callGeneratePdfFromHtml` (rent-increase notice, maintenance work order), `use-template-pdf.ts`, `lease-template-builder.client.tsx`, export-report's pdf format | `{ html }` |
| generate-pdf Mode 3 | none (the e-sign preview posts `{ action: "preview", leaseId }` to lease-signature) | — |

No caller sends `maintenance`, any other type for the default revenue dump, `income-statement`, `cash-flow`, or omits `type`. Deleted: export-report's and generate-pdf's flattened row reports (`flattenToRows`, `fetchReportRows`, `buildReportHtml`, the leaf's `reportColumns`, `rowsToTable`, `rowsToCsv`, `EMPTY_REPORT_CSV`), export-report's silent `type=financial` default, generate-pdf's Mode 3 (`buildLeasePreviewHtml`). Both functions now build `REPORT_TYPES` (`financial-analytics` and `TAX_YEAR_REPORT_TYPES`) and answer any other type with a 400 before the gate and any RPC. `income-statement` and `cash-flow` leave the three gated sets (neither function builds them; their hub tiles carry no badge either way). `premium-report-gate.test.ts` gains "every gated type is a type both functions build" (red on `1e0296076`: `expected [ 'income-statement', 'cash-flow' ] to deeply equal []`).

`deno bundle` of all 17 functions (`bundle-diff.sh`, the part H script): `020129e78` against `1e0296076`, `a4c4ae0d6` against `020129e78`, and the part's head against `a04bdc464` (which also covers `65ab8eb4a`) change only export-report (1,087,790 -> 1,086,947 bytes overall) and generate-pdf (440,609 -> 436,360); the other 15 are byte-identical each time. `deno check` (the `--allow-import` command of `part-f-sweeps.md` §3.3): all 17 clean. Deploy after merge: `export-report`, `generate-pdf` (both import the changed `_shared` report modules; no other function imports them).

## 7. Deprecated library APIs (item 7, `1e0296076`)

TanStack Query 5.105.0 (`node_modules/@tanstack/query-core`) deprecates `fetchQuery`, `prefetchQuery`, `ensureQueryData`, `fetchInfiniteQuery`, `prefetchInfiniteQuery`, `ensureInfiniteQueryData` and their option types for `queryClient.query(options)` (`infiniteQuery`), with `{ staleTime: "static" }` for `ensureQueryData` (`query.isStaleByTime("static")` is false once data exists, true before, so the read is the same). @types/react 19.3.0 deprecates `FormEvent` and `FormEventHandler` ("doesn't actually exist": a submit handler takes `SubmitEvent`), `MutableRefObject` (`RefObject` is mutable in 19) and eleven legacy element types.

Command: `lsp-deprecated.mjs`, an LSP client that opens every file and keeps the diagnostics tagged Deprecated or coded TS6385/TS6387: TypeScript 7's `tsc --lsp --stdio` over every tracked Node TS file (1485), and `deno lsp` over the 58 edge-function files (positive control: `"abc".substr(1)` in a scratch Deno workspace reports TS6385).

| Before | Hits | Resolution |
|--------|------|-----------|
| TanStack: `fetchQuery` (5 test calls, `report-data.ts`), `ensureQueryData` x3, `FetchQueryOptions` x2 | 11 | **fixed** (`query()`, `QueryExecuteOptions`); two comments updated |
| `FormEvent` in 17 form submit handlers (8 files this PR changed, 9 it had not) | 31 | **fixed**: `SubmitEvent` |
| `MutableRefObject` (`use-bulk-import-mutation.ts`) | 1 | **fixed**: `RefObject` |
| `tests/e2e/global.d.ts` (a hand-typed `QueryClient` with `fetchQuery` among five `Window` members) | — | **deleted**: no reader of any member |
| `parseServerSide` (`portfolio-preset-menu.tsx`, a PR file since item 2) | 1 | **fixed**: `inferParserType` |
| files this PR does not change: zod 4 string-format methods (`template-schemas.ts` x2, `env.ts` x2, `lib/validation/inspections.ts` x6), `@tanstack/react-form` `useStore` (3 files, 7; CLAUDE.md prescribes it), recharts `Cell` (`funnel-renderer.tsx` x2), `String.prototype.substr` (`error-boundary-store.ts`) | 20 | out of the brief's scope (the files this PR changes), recorded |
| Deno (58 files) | 0 | — |

After: 20 Node hits, all in files the PR does not change; 0 Deno. Guard: `src/lib/__tests__/no-deprecated-library-api.test.ts` (reads the deprecations from the installed `.d.ts` files; 44 hits on `a04bdc464`).

## Follow-up found while measuring (`b141f9842`)

The first build of the wired Top Performing Properties card showed rows 103.19px tall at 1280 (143.19 at 390): each row's two `<p>`s took the base layer's `p { margin-bottom: 1rem }`. A property with no units showed "0/0 units occupied" beside a red 0.0% badge. Both lines take `mb-0`; a property with no units reads "No units" with no occupancy badge (rows 71.19px at 1280). The same commit carries the dashboard-smoke E2E's exact-name preset lookup (item 2: each preset row is now two menu items, so `getByRole("menuitem", { name })` matched both).

## Verification (head `b141f9842`)

- `bun run validate:quick`: exit 0; 416 files, 112,582 tests, 0 failed.
- `CI=true bun run test:unit -- --coverage`: exit 0; statements 69.71, branches 61, functions 68.03, lines 71.69 (ratchet 64 / 56 / 63 / 66).
- Deno, in process (`deno test --no-lock --allow-all --no-check --import-map=supabase/functions/deno.json`): export-report 15, generate-pdf 9, lease-signature-metering 5, lease-signing 12, send-lease-reminders 25, rate-limit-sentry 2; all pass. `deno check` (all 17, the §3.3 command): 0 diagnostics.
- E2E against `next start -p 3062` on the head build (`run-both.ts`, the owner-axe and public projects): 238 passed, 5 skipped, 0 failed (skips: owner A has no maintenance request; no unread notification to mark read; three blog SEO smokes skip on their data conditions). The first run, on the build before `b141f9842`, failed only the dashboard-smoke preset test (the lookup above); that spec alone then passed 7 of 7.
- Chrome measurements (a scratch probe on the build, light and dark at 1280 and 390, the pre-fix markup rebuilt in the same page for the before values): VD-65 to VD-69. Text contrast is canvas-composited over every ancestor background.
- Deprecations (`lsp-deprecated.mjs`, TypeScript 7 LSP over all 1491 tracked Node TS files): 20, none in a file this PR changes; Deno 0.
