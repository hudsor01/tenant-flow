---
phase: 66-rental-application-intake
plan: 13
subsystem: ui
tags: [nextjs-app-router, react-19, tanstack-query, radix, tailwind-v4, shadcn, vitest, jsdom]

# Dependency graph
requires:
  - phase: 66-02
    provides: "APPLICATION_STATUS (label + badge variant per status), APPLICATION_STATUSES and ApplicationStatus in src/lib/applications/application-copy.ts"
  - phase: 66-03
    provides: "the /applications entry in PRIVATE_ROUTE_PREFIXES, added a wave before the page existed so the route was gated before it was reachable"
  - phase: 66-09
    provides: "applicationQueries.list, ApplicationSummaryRow, ApplicationListFilters, APPLICATIONS_PAGE_SIZE — the only data access this plan uses"
provides:
  - "/applications — the gated owner queue page (Server Component) with a marked Band 2 insertion point"
  - "ApplicationQueue — filter row, Item rows, pager and four row states"
  - "ApplicationStatusBadge — the status chip, reused by the detail header in 66-15"
affects:
  - 66-14 (inserts the application-links band at the marked point and owns id=\"application-links\", which this plan's empty-state CTA already scrolls to)
  - 66-15 (detail page and decline dialog reuse ApplicationStatusBadge)
  - 66-17 (E-17/E-18/E-20 assert the computed geometry this plan's tests deliberately do not)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A single TabsContent whose value tracks the active tab, so a filter-only Tabs keeps the selected trigger's aria-controls pointing at a real element"
    - "Pager bounds derived from the page index and the page size, clamped to the count-header total, so the loaded slice size is never read"
    - "Mock useQuery once and dispatch on the query key's root when a component issues more than one read"
    - "Prove test non-vacuity by mutation: 12 mutants against byte-identical copies, restore and diff-verify between runs"

key-files:
  created:
    - src/components/applications/application-status-badge.tsx
    - src/components/applications/application-queue.tsx
    - src/app/(owner)/applications/page.tsx
    - src/components/applications/__tests__/application-queue.test.tsx
  modified: []

key-decisions:
  - "The unit filter's options come from propertyQueries.listWithDetails() called with no arguments — the same cache entry /properties already warms — because the queue's meta line is a compound property+unit label and unitQueries.list carries no property name"
  - "The pager's upper bound is min(from + pageSize - 1, total), not the loaded slice size; the plan's expected string 'Showing 1-3 of 57' assumed a slice-derived bound that its own grep gate forbids"
  - "The filter row renders in every row state, including both empty states, so the band's control surface does not appear and disappear under the owner"
  - "ApplicationStatusBadge declares no className at all, per the plan's acceptance criterion, rather than the muted override UI-SPEC §B-4's token column sketches"

requirements-completed: [APPLY-03]

# Metrics
duration: 17min
completed: 2026-08-08
---

# Phase 66 Plan 13: Owner Application Queue Summary

**`/applications` now resolves instead of 404ing: a gated Server Component page whose single client island renders every application for the owner's units newest first, filterable by unit and status, paginated off the `{ count: 'exact' }` total, with a different empty state depending on whether the emptiness is the owner's situation or their filter.**

## Performance

- **Duration:** ~17 min (first commit 11:34 CDT, last 11:42 CDT, plus verification)
- **Tasks:** 3 of 3
- **Files created:** 4 · **modified:** 0

## Task Commits

1. **Task 1: The status badge and the queue rows** — `2a997a4e6` (feat)
2. **Task 2: The /applications page shell** — `95e040796` (feat)
3. **Task 3: Queue behaviour tests** — `d74658bf9` (test)

## The three things the objective asked to be stated explicitly

**(a) `/applications` resolves; it does not 404.** Verified from build output rather than
assumed, because Phase 65 shipped a genuine breadcrumb-to-404 and a curl against a gated
route cannot tell a missing page from a redirect (the proxy answers first either way):

- `.next/app-path-routes-manifest.json` contains `"/(owner)/applications/page": "/applications"`.
- `.next/server/app/(owner)/applications/page.js` was emitted, alongside
  `page_client-reference-manifest.js` — the second file is the proof that the
  Server-Component-plus-client-island boundary compiled, not just the module.
- Both artifacts come from the `✓ Compiled successfully` stage. The build then failed
  later at `/blog/[slug]` page-data collection, which is unrelated and pre-existing
  (logged as D1 in `deferred-items.md`, not fixed — scope boundary).
- The gate is still in place: `"/applications"` is present in `PRIVATE_ROUTE_PREFIXES`
  (`private-routes.ts:32`), which is the whole gate, since the `(owner)` group does not
  appear in the URL. Nothing was added to any other list and no allow-list was created.

**(b) `occupant_count` appears nowhere in the queue.** Zero occurrences of `occupant` across
all four files this plan created. It is not rendered, not selected, not passed and not
type-reachable: `ApplicationSummaryRow` is an eleven-key `Pick` that excludes it, so reading
it off a queue row is a compile error rather than a blank field. 66-09 excluded it on
fair-housing grounds (D-05, F-3b — household size is familial-status-adjacent data), and
this plan neither re-widened `LIST_SELECT_COLUMNS` nor reached past the data layer for it.

**(c) `isPending`, never `isLoading`.** `application-queue.tsx:375` destructures
`isPending`, and `isLoading` appears nowhere in the component. Reason: `isLoading` is
`isPending && isFetching`, so a query that is pending with nothing in flight reports
`isLoading: false` with `data: undefined` and falls straight through to the empty branch —
telling an owner they have no applications when we simply have not loaded them. Two triggers
are live in this app: `networkMode: "online"` parks an offline query at a paused fetch
status, and `PersistQueryClientProvider` mounts from an async effect so every cold load
passes through a restore window that forces an idle fetch status. Phase 65 shipped this on
two surfaces. The test fixtures carry BOTH flags with the real v5 relationship, and the
`pausedState()` test (`isPending: true, isLoading: false`) fails if the predicate is ever
changed back.

## Accomplishments

- **Zero data access added.** Both reads go through existing `queryOptions()` factories:
  `applicationQueries.list(filters)` for the rows and `propertyQueries.listWithDetails()`
  for the unit-filter options. No string-literal query keys, no `.from()`, no `createClient()`
  in any of the three source files.
- **The pager reports the corpus, not the page.** `total` is the count header; `from` and
  `to` are derived from the page index and `APPLICATIONS_PAGE_SIZE` and clamped to `total`.
  Zero occurrences of the loaded-slice length in the component (T-66-35).
- **Both Phase 65 row defects are closed by construction.** The row `<Link>` carries
  `no-underline` **and** `text-foreground`; `ItemTitle` carries `block w-full min-w-0
  truncate` and `ItemContent` carries `min-w-0`. All four have comments naming the exact
  base rule or primitive default they defeat.
- **All three `<ul>` neutralizers present** (`pl-0`, `mt-0`, `[&>li]:mb-0`), with `gap-2`
  rather than a margin-based rung, because the `[&>li]:mb-0` (0,1,1) would outrank a
  specificity-0 `:where()` margin rule and flatten the row rhythm to zero.
- **Zero `space-y-` in every file this plan wrote**, including prose (§D-2).
- **Every `mb-0` carries a comment naming its parent box** (§D-3): four of them, on the page
  subtitle, both `EmptyDescription`s, the row meta line, and the pager line.
- **The two empty states are genuinely different.** Truly-empty carries `EmptyMedia` and the
  `Create an application link` button that scrolls to `#application-links`; filtered-empty
  carries neither, compacted with `py-6 md:p-6` (the `md:` companion is required — Phase 65
  L-07).
- **Band 2 is a comment, not a stub**, so plan 66-14 owns that band with no merge conflict.
- **No error boundary on the page and none around the queue.** A queue-load failure
  degrades in place so the links band survives it.

## Non-vacuity: twelve mutants, twelve killed

Every prior plan in this phase proved its suite by mutation and this one was held to the same
standard. Each mutant was applied to a byte-identical copy, the suite was run, and the module
was restored and `diff`-verified before the next.

| # | Mutant | Result |
|---|---|---|
| 1 | Pager upper bound loses its clamp to `total` | 2 failed / 16 passed |
| 2 | Pager total sourced from the loaded slice bound | 2 failed / 16 passed |
| 3 | Loading branch never taken (`isPending` neutralized) | 2 failed / 16 passed |
| 4 | Row link drops `text-foreground` | 1 failed / 17 passed |
| 5 | `ItemContent` drops `min-w-0` | 1 failed / 17 passed |
| 6 | `<ul>` drops `[&>li]:mb-0` | 1 failed / 17 passed |
| 7 | Filtered-empty collapses into the CTA empty state | 1 failed / 17 passed |
| 8 | Row link loses its per-row id | 1 failed / 17 passed |
| 9 | Error branch renders a driver string | 1 failed / 17 passed |
| 10 | Status change keeps the stale page index | 1 failed / 17 passed |
| 11 | Status chip renders the column value instead of the label | 1 failed / 17 passed |
| 12 | Meta line keeps a dangling separator when `unit_label` is null | 1 failed / 17 passed |

Mutant 2 is the one the plan singled out, and it behaved as predicted: only the two
pagination tests went red, every other assertion stayed green, which is the definition of a
defect that survives review.

### Which assertions have positive controls

Every absence assertion is paired with a query that must find something first, in the same
test:

| Absence claim | Positive control in the same test |
|---|---|
| "of 25" does not appear (slice-derived total) | 25 `listitem`s asserted present before the pager is read |
| Filtered-empty renders no `Create an application link` button | the Approved tab is asserted `aria-selected="true"` and the filtered title is asserted present |
| A declined row never renders the word "Rejected" | the row is fetched by role and the applicant surname is asserted inside it, then "Declined" is asserted inside that same row |
| No `PGRST` substring reaches the DOM | the error copy is asserted present and Retry is asserted to call `refetch` once |
| No spinner while loading | five `data-slot="skeleton"` elements asserted present |
| The empty copy does not render while pending | five skeletons asserted present in the same paused-state render |
| The meta line has no `· ·` | the full meta string is asserted with `toBe`, not `toContain` |

The declined-row test in particular would have passed on an empty list without the surname
control, and the filtered-empty test would have passed on a render that threw.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The plan's expected pager string assumed a bound its own gate forbids**

- **Found during:** Task 3.
- **Issue:** the plan's assertion 1 says "with a mocked page of 3 rows and `total: 57`, the
  pager renders `Showing 1–3 of 57`". A `to` of 3 can only come from the loaded slice size,
  and the Task 1 gate is `grep -c 'data.length\|rows.length' == 0`, with the matching
  acceptance criterion "zero `data.length` / `rows.length` in the queue". The fixture is also
  impossible: `.range(0, 24)` against a corpus of 57 returns 25 rows, not 3.
- **Fix:** `to = Math.min(from + APPLICATIONS_PAGE_SIZE - 1, total)`, and the fixture is a
  full 25-row page against `total: 57` — so "of 57" and "of 25" are different strings and the
  assertion the plan actually cares about (the **57**, sourced from the mocked count) keeps
  its teeth. For every real server response the two formulas agree, including on a partial
  last page, which is covered by its own test: page 2 of 57 renders `Showing 51–57 of 57`,
  where an unclamped `from + size - 1` would claim `51–75` and invent eighteen applicants.
- **Commits:** `2a997a4e6`, `d74658bf9`

**2. [Rule 3 — Blocking] The unit filter had no data source named anywhere in the plan**

- **Found during:** Task 1.
- **Issue:** the plan and UI-SPEC §B-2 both require a unit `Select` whose first option is
  "All units", but neither names where the unit list comes from, and 66-09's contract (the
  only data layer this plan may use) exposes applications and links, not units.
- **Fix:** `propertyQueries.listWithDetails()` called with **no arguments** — byte-identical
  to `/properties`' own call at `properties/page.tsx:59`, so both surfaces share one cache
  entry rather than forking one. Rejected `unitQueries.list()`: it returns `property_id` and
  no property name, and the queue's meta line is `{property} · Unit {n}`, so an owner with
  "Unit 101" at two properties would get two indistinguishable filter options. Joining a
  second query to fix that would be two requests and a hand-rolled join for a control one
  existing factory already answers.
- **Commit:** `2a997a4e6`

**3. [Rule 3 — Blocking] The plan's own test command is malformed for this repo**

- **Found during:** Task 3.
- **Issue:** the plan's verify block runs `bun run test:unit -- --run <file>`. The
  `test:unit` script already injects `--run`, and CAC rejects the duplicate:
  `Expected a single value for option "--run", received [true, true]`.
- **Fix:** ran `bun run test:unit -- <file>`, which is the form CLAUDE.md and the project
  memory both prescribe. No source change; recorded so the next plan in the phase does not
  rediscover it.

### Implementation discretion inside the plan's contract

Not deviations — the plan left the mechanism open — but each is a judgement worth recording:

1. **A single `TabsContent` whose `value` tracks the active tab.** A `TabsList` with no
   content at all leaves the SELECTED trigger's `aria-controls` pointing at an element that
   does not exist, which axe treats differently from the inactive triggers (those are
   excused by `aria-selected="false"`). Five identical `TabsContent`s would be five chances
   to drift. One that follows the selection keeps the selected trigger honest and renders
   the list exactly once.
2. **Radix activates a tab on `mousedown`, not `click`** (`react-tabs/dist/index.mjs:121`).
   The test helper uses `fireEvent.mouseDown(..., { button: 0 })`; a `fireEvent.click` test
   would have passed while asserting nothing.
3. **The filter row renders in every row state**, including both empty states and the error
   state. Hiding it when the corpus is empty would make the band's control surface appear
   and disappear under the owner, and the tabs are how they get back out of a filter.
4. **The truly-empty CTA guards on the band existing.** Plan 66-14 renders
   `id="application-links"`; until it lands the element is absent, so the handler
   early-returns rather than throwing. It scrolls, then focuses with `preventScroll`.
5. **`ApplicationStatusBadge` declares no `className`,** per the plan's explicit acceptance
   criterion, rather than the `text-muted-foreground` override UI-SPEC §B-4's token column
   sketches for `rejected`. `outline` already resolves to `text-foreground`, which passes AA
   in both themes; the muted override is a weight preference, not a contrast requirement,
   and it can be added in 66-15 if the detail header wants it.
6. **No `useVirtualizer`.** UI-12 costed the queue at 10–60 rows for a live vacancy and the
   page is bounded at 25 per page; a virtualized rail over 25 `<li>`s buys nothing and costs
   the row-height flexibility §B-3 explicitly requires (no fixed height, meta line wraps).
7. **No return-type annotations** on the two components. The plan's `<interfaces>` block
   writes `: React.JSX.Element`; the repo has zero instances of that annotation anywhere in
   `src/`, so following the plan literally would have introduced a convention of one.
8. **The page header is `flex flex-col gap-1`,** not two direct flex items of the `gap-8`
   shell. As direct items the title and subtitle would sit 32px apart. The `mb-0` is still
   required and still non-inert, and its comment names the actual parent box rather than the
   one the plan's sketch implies.
9. **`toStatusTab` narrows radix's `string` through a lookup, not a cast.** An unknown value
   fails safe to "all" instead of being asserted into the union.
10. **`total === 0` is the empty predicate**, not an array length — which is both honest
    (the corpus is empty, or the filter matched nothing) and what keeps the file free of the
    construct the Task 1 gate scans for.

## Verification

| Gate | Result |
|---|---|
| Task 1 automated gate (typecheck, biome, `no-underline`, `text-foreground`, `min-w-0`, `pl-0`, `[&>li]:mb-0`, `space-y-` = 0, slice-length = 0, red-variant name = 0) | **PASS** |
| Task 2 automated gate (typecheck, biome, no client directive, `space-y-` = 0, `typography-h1`, `<ApplicationQueue`, `/applications` in the deny-list) | **PASS** |
| Task 3 gate (`bun run test:unit -- <file>`, typecheck) | **PASS** — 18 tests |
| `bun run typecheck` (app + integration + e2e projects) | **PASS** |
| `bun run lint` | **PASS** — 1367 files |
| Full suite + coverage via lefthook pre-commit on all three commits | **PASS** — no `--no-verify` |
| Exactly one `<h1>` on the page | **PASS** |
| `occupant` across all four files | **0 occurrences** |
| Route resolution from build artifacts | **PASS** — see (a) above |
| Mutation campaign | **12 / 12 killed** |

Rendered geometry (E-17, E-18, E-20) is plan 66-17's and is deliberately not asserted here.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-66-09 | mitigate | **Done.** Every applicant value renders as a React child. Zero `dangerouslySetInnerHTML` and zero HTML construction in any file this plan wrote, asserted by a test that renders an `<img src=x onerror=...>` payload as an applicant first name and requires no `<img>` element to exist. |
| T-66-36 | transfer | **Done as designed.** The component applies no owner filter of its own and sends no owner id; RLS on `rental_applications` is the gate, pinned by 66-10's dual-client tests. |
| T-66-35 | mitigate | **Done.** `total` comes from the count header; the pager bounds are derived from the page index and page size and clamped to it. Asserted with a mocked count that differs from the row-array length, and killed as mutant 2. |
| T-66-43 | mitigate | **Done.** The error branch renders a fixed string and nothing off the error object; a test asserts no `PGRST` substring reaches the DOM, and mutant 9 kills it. |
| T-66-34 | mitigate | **Done.** The queue renders name, property, unit, relative date and status only, off an eleven-column `Pick`. Income, employer, address, references, notes and household size are not type-reachable from a queue row. |
| T-66-SC | mitigate | **Done.** Zero packages installed. Every primitive used (`Item`, `Empty`, `Badge`, `Skeleton`, `Tabs`, `Select`, `Button`) already existed in `src/components/ui/`. |

### Threat flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change.
It renders a route that was already gated and reads through a data layer that already
existed.

## Issues Encountered

**`application-queue.tsx` is 478 lines, of which 288 are code.** CLAUDE.md's cap is 300 lines
per component; the file holds seven components, each well under 50 lines, and the excess is
comment weight the plan and §D-3 mandate (every `mb-0`, every neutralizer and every
inert-class trap has to carry the reasoning that makes it survive a future edit). The nearest
precedent is `recent-documents-panel.tsx` at 383 lines for the same reason. Flagged rather
than silently accepted; if the phase wants it split, the row and the pager are the natural
seams, but doing that here would have added a file the plan does not list.

**`next build` fails locally at `/blog/[slug]`** — unrelated to this plan and out of its
scope boundary. Logged to `deferred-items.md` (D1) with the reasoning, not fixed. Running the
build also rewrote the generated `next-env.d.ts` from the dev routes-types path to the
production one; that single generated file was reverted with `git checkout -- next-env.d.ts`
so the committed dev-mode reference is preserved. Nothing else in the working tree changed.

Three untracked paths (`.agents/`, `.github/instructions/`, `skills-lock.json`) were present
before this plan started and are unrelated. They were not staged, not modified and not
removed.

## Next Phase Readiness

- **66-14 (links band):** insert at the marked comment at the bottom of
  `src/app/(owner)/applications/page.tsx`. The band must carry `id="application-links"` —
  the queue's truly-empty CTA already calls `scrollIntoView` and `focus({ preventScroll:
  true })` on that id, and until the band exists the handler is a deliberate no-op. Give the
  band a `tabIndex={-1}` if the focus half is meant to land. The band is the page's second
  client island; the page itself must stay a Server Component.
- **66-15 (detail page):** import `ApplicationStatusBadge` from
  `#components/applications/application-status-badge` rather than rebuilding the chip. It
  takes `{ status }` and declares no CSS; if the detail header wants the §B-4 muted override
  on `rejected`, add it there rather than inside the shared component, or add a `className`
  to `APPLICATION_STATUS` so both surfaces read one source.
- **66-17 (Playwright):** E-18 and E-20 are the assertions this plan's jsdom suite
  explicitly does not make. The classes they should find are `no-underline` +
  `text-foreground` on the row `<a>`, and `pl-0` + `[&>li]:mb-0` on the queue `<ul>`. E-17's
  ~72px row comes from `Item size="default"`'s `p-4` plus two text lines, with no fixed
  height set anywhere.
- **Anyone adding a column to the queue row:** `ApplicationSummaryRow` is an eleven-key
  `Pick`. Add it to `LIST_SELECT_COLUMNS` **and** to the `Pick` in `application-keys.ts`; do
  not cast and do not add a second fetch. `occupant_count` is excluded on fair-housing
  grounds and must stay excluded.

No blockers.

## Self-Check: PASSED

**Files verified present on disk:**

- `src/components/applications/application-status-badge.tsx` — FOUND, 46 lines
- `src/components/applications/application-queue.tsx` — FOUND, 478 lines (288 code)
- `src/app/(owner)/applications/page.tsx` — FOUND, 68 lines
- `src/components/applications/__tests__/application-queue.test.tsx` — FOUND, 533 lines, 18 tests
- `.planning/phases/66-rental-application-intake/deferred-items.md` — FOUND
- `.planning/phases/66-rental-application-intake/66-13-SUMMARY.md` — FOUND

**Commits verified in `git log`:** `2a997a4e6`, `95e040796`, `d74658bf9`

**Branch:** `gsd/phase-66-rental-application-intake` — verified with `git branch --show-current`
before the first commit; never `main`. No worktree created, no `git reset`, no `git clean`, no
`git stash`, no `--no-verify`, no push.

## Known Stubs

None. Every branch of the queue renders real content from a real query. The one deliberately
inert affordance is the truly-empty state's `Create an application link` button, whose scroll
target is the band plan 66-14 owns — that is a documented wave-5-to-wave-5 seam recorded in
the plan itself (`#application-links`), not an unwired stub, and the button is guarded so its
absence is a no-op rather than an error.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-08*
