# Fix round 1, part H: class sweeps

Base `1792b8781` (end of part G). Each section is one defect class: the command, the candidate count, and every hit with its resolution. Sweep scripts that are not shell one-liners ran from the session scratch directory; their logic is stated here so the sweep can be rerun.

## 1. Credential literals (item 1, `7dc3b6ab7`)

| Command | Candidates | Hits |
|---------|-----------|------|
| `git grep -nE 'eyJ[A-Za-z0-9_-]{8,}\.eyJ'` | 1 | `tests/e2e/playwright.config.ts:35`, Supabase's local demo anon JWT (`iss: supabase-demo`) as the `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` fallback: removed |
| `git grep -nE '(^\|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}'` (any JWT segment) | 3 | the line above; `src/test/unit-setup.ts:29`, a JWT-headed mock key: now `sb_publishable_mock` (nothing reads a key's format); `66.2-02-SUMMARY.md:219` quoting that mock in a commit recipe: updated |
| vendor key shapes (`sk_`/`rk_` live/test, `whsec_`, `sbp_`, `sb_secret_`, `sb_publishable_` 6+, `AKIA`, `re_…_…`, `ghp_`, `xox[bp]-`) outside lockfiles and docs | 1 | `supabase/config.toml:178` `secure_password_change` (the `re_…_…` shape matching a word): not a credential |
| `git grep -nE 'process\.env\.[A-Z0-9_]+ *(\|\||\?\?)'` (fallbacks) | 76 lines | credential-shaped: the config key (fixed) and the unit-setup mock (fixed). The rest are URLs, model names, emails, `""` or a throw (`E2E_OWNER_PASSWORD` has no literal fallback anywhere). `scripts/seed-test-users.ts` `LOCAL_TEST_PASSWORD` is not a fallback: a documented repo constant that only authenticates against a disposable local stack and refuses any non-loopback host |

`.gitleaksignore` is deleted: its only entry fingerprinted the removed line. Importers of `playwright.config.ts`: Playwright itself and `tests/e2e/tsconfig.json` (typecheck); `e2e-support-exports-have-callers.test.ts` and `w6-assertions.mjs` only name the path. No unit test imported it; `playwright-config-publishable-key.test.ts` now does, with `dotenv` mocked so `.env.test` is never loaded into the unit process. Guard: `src/lib/__tests__/no-jwt-literals.test.ts` over `git ls-files` (ignored `.env*` files and saved sessions are never opened).

## 2. Grid and flex placement on a non-item (item 2, `1b93bc0e8`)

Command: an AST walk (`@babel/parser`, jsx + typescript) of every non-test `src/**/*.tsx`, for each JSX element whose `className` text holds `col-span-*`, `row-span-*`, `col-start-*`, `col-end-*`, `row-start-*`, `row-end-*` or `order-*` (any variant prefix), classifying its nearest JSX parent (through fragments, conditionals and `.map` callbacks): an intrinsic element with `grid`/`flex`/`contents`, an intrinsic element without, a component, or a component root. Cross-check: `git grep -nE "(^|[\s:\"'\`])-?(col-span|row-span|col-start|col-end|row-start|row-end|order)-[a-z0-9\[]" -- 'src/**/*.ts' 'src/**/*.tsx'` minus tests, 43 lines (the AST misses only cva strings, all in `ui/`).

| Hits | Resolution |
|------|-----------|
| 17 under a `grid` parent (`financial-analytics-skeleton`, `property-performance-skeleton`, `dashboard-loading-skeleton`, `form-builder-panel`, `profile/page`, `application-fields-address`, `lease-details-skeleton`, `lease-details.client`, `maintenance-details.client`, `onboarding-step-property`, `bento-pricing-section` x3, `profile-skeleton` x2, `hero-dashboard-mockup` x2) | direct grid items: not defects |
| `analytics/financial/page.tsx:121`, `analytics/property-performance/page.tsx:135` (`lg:col-span-2` inside BlurFade) | **defects**: the span moves to `<BlurFade className>` (VD-63) |
| `profiles/owner/profile-card.tsx:63` (`lg:col-span-1` inside BlurFade) | **defect** (inert only because one track is the default): moved to the BlurFade, no delta |
| `bento-features-section.tsx` x6 (BentoCard in BentoGrid) | BentoGrid renders children directly into its grid: not defects |
| `kpi-bento-row.tsx:314/33`, `kpi-sparkline.tsx:36` (in `Stat`) | `Stat` is the grid and renders children directly; `next/dynamic` adds no DOM: not defects |
| `occupancy-donut-chart(-skeleton)`, `revenue-area-chart(-skeleton)` (component roots) | rendered as direct children of `dashboard.tsx`'s `@4xl/dashboard:grid-cols-4` grid: not defects |
| `dynamic-form.tsx:106` (root of a `formApi.Field` render function) | `Field` renders no DOM; the grid is its parent: not a defect |
| `ui/alert.tsx`, `ui/card.tsx`, `ui/stat.tsx`, `ui/input-group.tsx` (vendored slot placement) | usage sweep of `AlertTitle`/`AlertDescription`/`CardAction`/`InputGroupAddon`: 16 uses, every one a direct child of its container (CardAction unused). Stat's `**:data-[slot=…]` descendant variants also reach StatLabel/StatValue inside the CP-4 `kpi-heading` flex row, where `col-span-1` is inert by design: not a defect |

Guard: `src/components/ui/__tests__/blur-fade-grid-placement.test.ts`; render test `src/app/(owner)/analytics/__tests__/analytics-layout-and-controls.test.tsx`.

## 3. Double assertions (item 3, `c67d8ec3c`, `805c0c2ad`)

Command: `git grep -n "as unknown as" -- src supabase/functions scripts tests`: 90 lines: 46 in code; 44 are comments (39) or string literals (5: the guard's own messages and `apply-token-contract.test.ts`'s assertion).

| Where | Sites | Resolution |
|-------|-------|-----------|
| `stripe-webhooks/index.ts:113` | 1 | the admin client is untyped, so `event.data` needs no assertion |
| `_shared/timing-safe.ts:69`, `resend-webhook/index.ts:151` | 2 | `SubtleCryptoWithTimingSafeEqual` (an intersection `SubtleCrypto` is assignable to) |
| fetch fakes (`use-report-mutations.test.tsx` x4, `use-billing-mutations.test.ts` x6, `gdpr-data-actions.test.tsx`, `rental-application-form.test.tsx`) | 12 | `vi.fn<typeof fetch>()` resolving a real `Response`; `vi.mocked(globalThis.fetch)` |
| QueryClient fakes (`get-cached-user.test.ts` x5, `optimistic-locking.test.ts`) | 6 | a real `QueryClient` with a spied method; `setQueryClientRef` takes `QueryClient \| null` |
| NextRequest fakes (`csp-header`, `middleware-routing`, `middleware` x3), `server.test.ts` | 6 | a real `NextRequest` (`vi.importActual` where `next/server` is mocked); a typed captured-handlers variable; a typed `vi.fn` |
| partial fixtures (`unit-form`, `properties`, `lease-sidebar`, `profile-page`, `subscription-cancel-section`, `number-ticker`, bulk-import x4, `maintenance-card` x2) | 13 | complete rows or the shared `DEFAULT_LEASE`; the inferred stub type; the class that already implements `IntersectionObserver`; the typed `parsed` field; a malformed row via `Reflect.deleteProperty` |
| Deno fake clients (`supabase/functions/tests/*` x5) | 5 | `fakeSupabaseClient`, a type guard on `from()` and `rpc()` |
| integration (`activity.rls`, `search-documents.rls`) | 2 | the clients are untyped `SupabaseClient`: `null` needs no assertion |
| `scripts/` | 0 | comments only |

Emitted JavaScript: `deno bundle` of all 17 functions before (`1792b8781`) and after `c67d8ec3c` is byte-identical. Guard: `src/lib/__tests__/rpc-boundary-cast-pins.test.ts`, widened from `src/hooks/api` to every code root, production and test (3 and 43 hits before).

## 4. Dead controls (item 4, `e3bf6786e`)

Command: an AST walk of every non-test `src/**/*.tsx`: each `button`, `Button`, `a`/`Link`/`NavigationMenuLink`, `DropdownMenuItem` (plain, checkbox, radio), `ContextMenuItem`, `MenubarItem`, `CommandItem`, `Toggle`, `ToggleGroupItem` and `AlertDialogAction` (560 controls), plus every other element with a handler, a control role or a `tabIndex` (224). A control is a candidate with no `onClick`/`onSelect`/`onPointerDown`/`onMouseDown`/`onKeyDown`/`onCheckedChange`/`onPressedChange`/`onValueChange` and no `asChild`, `type="submit"`/`"reset"`, `form`, `href`, props spread or `…Trigger`/`…Close`/`…Cancel`/`…Action` parent; or with a handler (inline or a same-file function) whose body is empty, only logs, only toasts "soon/not available/coming", or only clears state. Greps: `href="#"` and `href: "#"` (0), no-op handler props `on…={() => {}}`/`noop` (0), console-only handlers (0), no-op object-literal handlers (0), "coming soon"/"not available" toasts (2: `billing/plans` "This plan is not available for purchase" and `download-signed-lease-button` "Signed document not available", both real error states).

| Candidate kind | Count | Resolution |
|----------------|-------|-----------|
| no handler | 16 | **3 dead**: `/analytics/overview` "This Month" (no period feature: deleted), and the marketing mockup's "View all" and quick actions (now plain elements). 13 are not: 8 Buttons inside a `Link` (`year-end` Reports, tenant Edit, units Add Unit, inspections New Inspection, `/pricing/cancel` x4), 5 `ToggleGroupItem`s whose `ToggleGroup` owns `onValueChange` |
| no handler, `type="button"` in a form | 1 | **dead**: the Add Unit dialog's Cancel, with no DialogClose; it is a `DialogClose` now, which the post-create `closeButtonRef.click()` reaches too |
| clear-only | 10 | each closes or resets what its label says (Cancel x4, Done, No thanks, Close navigation menu, Send Another Message, the two delete-confirm Cancels): not defects |
| always disabled | 5 | state displays (locked Edit Lease and Adjust Rent with their reason, Loading..., the signed state, LoadingSpinner): not defects |
| role or `tabIndex` without a handler | 6 | focus targets (`tabIndex={-1}` section and heading), a scrollable region (`tabIndex={0}`), the honeypot input, a decorative checkbox, the file input: not defects |

`/pricing/cancel` and the four `Link`-wrapped Buttons nest a `<button>` in an `<a>` (interactive content inside interactive content); they work, so they are outside this class and are listed in the part H report.

## 5. PDFs that do not match their page (item 5, `10575cd81`)

| Function, type | Before | After |
|----------------|--------|-------|
| generate-pdf Mode 1 `year-end` (the year-end page's Download PDF) | `get_financial_overview` for the year, flattened to `overview`/`highlights` JSON rows | `_shared/tax-year-reports.ts`: the summary cards, By Property, the Expense Breakdown (largest first) and the 1099-NEC table, for the year asked for |
| generate-pdf Mode 1 `financial` (the tax-documents page's Download PDF) | the same flattened overview | the summary cards and the Schedule E deductible expenses with their shares |
| export-report `year-end`, `financial` | the same flattened overview | the same tables, as CSV, XLSX and PDF |
| export-report `1099` (and generate-pdf `1099`) | `get_billing_insights` (lease revenue) flattened | the year-end page's 1099-NEC section |
| `maintenance`, the default revenue type | flattened RPC rows | unchanged: no page prints them and no caller requests them |

The premium gate is unchanged. Proof: `supabase/functions/__tests__/tax-year-reports.test.ts` (the page queries and the leaf on the same RPC answers) and the Deno handler tests (fail on `1792b8781`'s handlers). `deno bundle`: only export-report and generate-pdf change.

## 6. `formatCents` on dollars (item 6, `b25c1787b`)

Command: `git grep -c "formatCents(" -- src` minus tests and the definition: 36 calls. 6 in `lease-template.ts` format `*Cents` fields built with `dollarsToCents`: correct. 2 in `owner-payment-summary.tsx` divided dollar totals by 100: **fixed** (`formatCurrency`). 28 on the balance-sheet, cash-flow and income-statement pages wrote `formatCents(dollars * 100)`: same output, a round trip through a unit nothing stores: **changed** to `formatCurrency`. Guard: `src/lib/utils/__tests__/format-cents-callers.test.ts`.

## 7. Hand-rolled downloads and dead header reads (item 7, `5da309864`)

Commands: `git grep -n "createObjectURL" -- src` minus tests (14) and `git grep -nE "\.headers\b" -- src` (response reads).

- Downloads (an anchor named with `download`): `gdpr-data-actions`, `account-data-section`, `maintenance-details`, `documents-vault` and bulk-import's `triggerCsvDownload` revoked on the line after `click()`: **all five** now call `downloadBlob`; the two settings copies share `downloadAccountData`.
- Not downloads: `use-template-pdf`, `lease-template-builder` (previews in the page), `send-for-signature-button`, `sign-lease-form` (a new tab, revoked after 60s), `inspection-photo-upload`, `use-property-image-dropzone`, `use-supabase-upload` (image previews).
- Response header reads: 2 (`Content-Disposition` in the two settings files), always null cross-origin: **deleted**. The other 5 `headers.get` calls in `src/` read the incoming request in `lib/supabase/middleware.ts`.

Guard: `src/lib/reports/__tests__/download-blob-is-the-only-download.test.ts`.

## 8. Stale evidence (item 8)

Commands: `git grep -n "deno check" -- '.planning/phases/66.2-*' '.planning/tailwind-shadcn'` (2 lines, both in `part-f-sweeps.md` §3.3) and `git grep -niE "decision pending|pending (owner|user|decision)|owner decision|awaiting|needs owner|owner review|not yet decided|to be decided"` over the same paths (PR body and FINAL-RECORD excluded).

- `part-f-sweeps.md` row 144 "owner decision pending": the decision and part G's commits recorded.
- `part-f-sweeps.md` §3.3: the `--cached-only` command fails on export-report since the SheetJS import; the `--allow-import` command is recorded, and all 17 functions check clean with it (0 diagnostics at `805c0c2ad`).
- `66.2-CLAIMS-LEDGER.md` C12a "needs owner review": CP-1's decision recorded.
- Not stale: D-A (variable Roboto) "needs owner sign-off" in CONTEXT, RESEARCH and the discussion log is deferred out of the phase, not decided; every other hit records a decision already made.
