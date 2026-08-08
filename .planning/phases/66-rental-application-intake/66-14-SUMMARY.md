---
phase: 66-rental-application-intake
plan: 14
subsystem: ui
tags: [react, tanstack-query, clipboard, confirm-dialog, accessibility, tailwind-v4, non-vacuity]

# Dependency graph
requires:
  - phase: 66-04
    provides: "create_application_link, which refuses only while an ACTIVE link exists, and revoke_application_link, whose uniform 'link not found' is deliberate non-enumeration"
  - phase: 66-09
    provides: "applicationLinkQueries.byUnit, applicationLinkState, applicationLinkUrl and both link mutation-option factories — the panel adds no data access of its own"
  - phase: 66-13
    provides: "the /applications shell, its Band 2 insertion point, and the queue empty state whose CTA resolves this band by id"
provides:
  - "ApplicationLinkPanel — one row per unit, four link states, a persistent re-copyable URL, a gated revoke"
  - "the live application-links band inside /applications (id=\"application-links\", tabIndex={-1}, aria-labelledby)"
  - "the component-level half of E-19: the URL survives a copy, an unmount and a fresh render"
affects:
  - 66-17 (E-19 asserts the same re-copyability across a real second page load; the id and the field are what it targets)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pass dialog copy by object spread when a literal-string acceptance gate collides with a prop name (the ConfirmDialog heading prop shares its name with the HTML attribute banned on icon-only buttons)"
    - "An icon-only control announces its state change through its accessible name, not only through the glyph"
    - "A scroll-to affordance needs tabIndex={-1} on its target, or the keyboard half of it is a silent no-op"
    - "Prove test non-vacuity by mutation across BOTH files a plan touches — the page mutants are as cheap as the component ones and caught the same class of defect"

key-files:
  created:
    - src/components/applications/application-link-panel.tsx
    - src/components/applications/__tests__/application-link-panel.test.tsx
  modified:
    - src/app/(owner)/applications/page.tsx

key-decisions:
  - "The units come from propertyQueries.listWithDetails(), not unitQueries.list — it is the only existing read that carries the property NAME alongside its units, and calling it with no arguments shares one cache entry with /properties and the queue's unit filter"
  - "REVOKE_COPY is spread rather than written attribute-by-attribute, because the file's acceptance gate is a zero-occurrence grep for an attribute name the dialog's heading prop shares (plan 66-09 Pattern 1)"
  - "tabIndex={-1} and aria-labelledby added to the band: a <section> is not focusable, so the queue CTA's .focus() was a silent no-op for keyboard users (Rule 2)"
  - "The copy button is size-12 so it squares against the inputSize=\"lg\" field beside it rather than sitting 4px short"
  - "The create rejection renders at text-warning-text, not text-destructive — the server refusing a second active link means the panel is stale, not that the owner erred"

patterns-established:
  - "Pattern 1: a remount assertion is the only component-level test a reveal-once implementation fails. Assertions about the field's value on first render pass identically for both designs."
  - "Pattern 2: an anchor string used for a mutation campaign must be unique in the file INCLUDING its comments. Two of this plan's page mutants failed to apply on the first attempt because the prose explaining the construct also contained it."

requirements-completed: [APPLY-01]

# Metrics
duration: 38min
completed: 2026-08-08
---

# Phase 66 Plan 14: Owner Application-Link Panel Summary

**The band where an owner mints, re-copies and revokes the public listing URL — four link states per unit, a URL built only from `NEXT_PUBLIC_APP_URL` and readable on the tenth visit as well as the first, and a revoke that names what it does and does not destroy.**

## Performance

- **Duration:** ~38 min
- **Started:** 2026-08-08T17:00Z
- **Completed:** 2026-08-08T17:38Z
- **Tasks:** 2 of 2
- **Files created:** 2 · **modified:** 1

## Task Commits

1. **Task 1: The panel — rows, four states, copy and revoke** — `5d1f51ad6` (feat)
2. **Task 2: Insert the band into /applications and pin the panel's behaviour** — `ddaec3169` (test)

## The three properties this plan exists to hold

### 1. The copy control works repeatedly, not once

`rental_application_links.raw_token` is stored (D-03a), so the URL is a query result rather than a mutation result. The panel renders a persistent read-only `Input` populated from `applicationLinkUrl(link.raw_token)` on every render of the active state. There is no reveal step, no shown-once dialog and **no regenerate-to-retrieve affordance** — a test asserts the strings `Regenerate` and `Create a new link` are both absent while a link is active, because rotating an active token silently breaks every listing already posted.

The assertion that actually distinguishes this from a `/sign`-style port is the remount: render → assert the value → click copy → **unmount** → render again against byte-identical mocked data → the field still holds the same URL and the copy button is back at its idle accessible name. Mutant 5 (a module-level `REVEALED` set that blanks the field on a second mount) is killed by that test and by nothing else in the first two describes. Plan 66-17's E-19 asserts the same property across a real second page load.

### 2. Expired and revoked links offer a new link; an active one blocks creation

`create_application_link` refuses only while `revoked_at is null AND expires_at > now()`. Expired and revoked links deliberately do not block, which is what makes a lapsed listing re-listable — an "any link exists" guard would leave every expired unit permanently un-relistable, a bug that only surfaces weeks later.

The panel mirrors that exactly, because it derives state from `applicationLinkState` rather than re-comparing inline:

| Link state | Chip | Control block |
|---|---|---|
| none | — | **Create link** |
| active | `Badge variant="success"` **Active** | URL field + copy + **Revoke**. No create button at all. |
| expired | `Badge variant="outline"` **Expired** | **Create a new link** |
| revoked | `Badge variant="outline"` **Revoked** | **Create a new link** |

Both the expired and the revoked tests assert `Create a new link` is present. Mutant 12 (collapsing the label so the expired state offers only `Create link`) kills two tests. The revoked-and-lapsed test additionally asserts the chip reads **Revoked** and that the whole panel text does not contain `Expired`, with the **active** state rendered first in the same test as a positive control — so a panel that renders nothing cannot reach the assertion.

### 3. Revoking is confirmed and states its true consequence

The trigger is the short `Revoke` (a recorded §B-8 decision, commented at the call site so a reviewer does not "fix" it); the button that commits is the explicit `Revoke link`. The dialog carries `confirmVariant="destructive"` and the description including *"Applications you have already received are not affected."* Three tests cover it: the mutation is **not** called on the trigger click, it **is** called with the right `linkId` on the confirm click, and Cancel closes without calling it. `revoke_application_link`'s uniform `link not found` is left uniform — no attempt is made to distinguish missing / another owner's / already-revoked.

## Non-vacuity: 15 mutants, 15 killed, 0 survivors

Every mutant was applied to a byte-identical copy of the committed file, the suite was run, and the file was restored and verified identical before the next.

| # | Mutant | Result |
|---|---|---|
| 1 | URL built from the browser origin | **5 failed** / 12 passed |
| 2 | Accessible name never changes on copy | 1 failed / 16 passed |
| 3 | State derived inline, expiry checked before revocation | **1 failed** / 16 passed |
| 4 | Revoke fires on the trigger instead of the confirm | 3 failed / 14 passed |
| 5 | Reveal-once: the field is blank on a second mount | **3 failed** / 14 passed |
| 6 | Copy button is inert (`onClick` no-ops) | 3 failed / 14 passed |
| 7 | Branches on the derived loading flag instead of `isPending` | 1 failed / 16 passed |
| 8 | Revoke description drops the untouched-applications clause | 1 failed / 16 passed |
| 9 | Revoked line dated from the expiry instead of the revocation | 1 failed / 16 passed |
| 10 | The field no longer selects on focus | 1 failed / 16 passed |
| 11 | Create always mints for the first row's unit | 1 failed / 16 passed |
| 12 | Expired state offers no way to relist | 2 failed / 15 passed |
| 13 | Clipboard failure claims success anyway | 1 failed / 16 passed |
| 14 | `page.tsx`: band id renamed to `application-link` | 1 failed / 17 passed |
| 15 | `page.tsx`: `tabIndex={-1}` removed from the band | 1 failed / 17 passed |

Mutants 1, 3 and 5 are the load-bearing ones. Mutant 6 is the trap the plan named explicitly — a test that asserts the copy button "is present" is satisfied by an inert button, so the copy test clicks it and asserts `navigator.clipboard.writeText` received the exact URL, and mutant 6 kills three tests rather than none.

### Assertions that carry positive controls

Every absence assertion in the file is paired with a query that must find something first, in the same test:

| Absence claim | Its positive control |
|---|---|
| No URL field / copy button / Revoke in the `none` state | The unit label and the `Create link` button are found first |
| The revoked chip is not `Expired` | The **active** state renders first in the same test and asserts the `Active` chip and the `Expires Oct 6, 2126 (n days)` line |
| The expired chip is not `Revoked` | `Expired` and `Expired Jan 5, 2026` are both asserted present first |
| No confirm button before the trigger click | The `Revoke` trigger itself is found, and the dialog is asserted present after the click |
| No `Create link` in the no-units state | `No units yet` and its full description are asserted present first |
| Never the empty copy while pending-not-fetching | Three skeletons are asserted present first |
| The band exists and is the focus target | `band.tagName === "SECTION"`, its text contains both the heading and the unit label, before the focus assertion |
| No `Regenerate` / `Create a new link` while active | The field value is asserted first |

The two `isPending` fixtures carry **both** `isPending` and `isLoading` with the real TanStack v5 relationship, and the paused fixture (`isPending: true, isLoading: false`) is the one that fails mutant 7.

## The URL origin (T-66-44)

`applicationLinkUrl` is the only source of the copied string; the browser-origin global has **zero occurrences** in the panel, prose included. The test forces `NEXT_PUBLIC_APP_URL` to `https://tenantflow.app` — a host jsdom does not serve — and asserts the field against the written-out literal `https://tenantflow.app/apply/abc123`, never a template that rebuilds the URL the component's way. It then asserts `window.location.origin !== APP_URL` so the control is explicit rather than assumed. Mutant 1 kills five tests.

This matters because the failure is asymmetric: the submit Edge Function's CORS check is an exact string comparison against `NEXT_PUBLIC_APP_URL`, so an origin-derived link works perfectly when the owner tests it and fails for every applicant with no server-side error to find, because the fetch never completes.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — Missing critical functionality] The queue's empty-state CTA could not move focus**

- **Found during:** Task 2.
- **Issue:** `application-queue.tsx` resolves the band by id, calls `scrollIntoView` and then `band.focus({ preventScroll: true })`. UI-SPEC §C specifies the band's `className` only, and a `<section>` is not focusable by default — so `.focus()` on it is a silent no-op. A sighted mouse user sees the smooth scroll while a keyboard or screen-reader user is left at the top of the page with focus unmoved, which is the classic failure mode of scroll-to affordances. Nothing fails, nothing logs.
- **Fix:** `tabIndex={-1}` on the band, plus `aria-labelledby` pointing at the `<h2>` so the landed-on region announces "Application links" rather than an anonymous group. Both are attributes, so neither conflicts with the spec's binding `className`.
- **Verification:** mutant 15 removes `tabIndex={-1}` and kills the page-level bridge test.
- **Commit:** `ddaec3169`

**2. [Rule 3 — Blocking] The acceptance gate collides with the `ConfirmDialog` heading prop**

- **Found during:** Task 1.
- **Issue:** Task 1's gate is `test "$(grep -c 'title=' "$P")" -eq 0` — a whole-file literal count guarding the CLAUDE.md rule that icon-only buttons carry `aria-label` and never the HTML attribute of that name. `ConfirmDialog`'s heading prop shares that name, so writing it as a JSX attribute would fail a gate on a file whose executable code is already compliant. This is plan 66-09's Pattern 1 recurring exactly as predicted.
- **Fix:** the heading, description and confirm label live in a `REVOKE_COPY` object spread onto the dialog; `confirmVariant="destructive"` stays a literal JSX attribute because its own gate requires that spelling. Commented at the declaration so a future editor does not "simplify" it back.
- **Commit:** `5d1f51ad6`

### Implementation discretion inside the plan's contract

Not deviations — the plan left the mechanism open — but each is a judgement worth recording:

1. **The units come from `propertyQueries.listWithDetails()` called with no arguments.** It is the only existing read carrying the property NAME alongside its units, which the row header `{Property} · Unit {n}` needs; `unitQueries.list` returns `property_id` and no name. The no-argument call is byte-identical to `/properties`' own and to the queue's unit filter, so all three share one cache entry.
2. **One row per unit shows that unit's MOST RECENT link.** The query orders newest first, so the first link seen per `unit_id` wins and the rest are history.
3. **`inputSize="lg"` on the URL field, and `size-12` on the copy button.** §D-1 forces `padding: clamp(.75rem, 2vw, 1rem)` onto every input from an unlayered media query at ≤768px; `size-12` squares the 48px button against the 48px field rather than leaving it 4px short at the repo's universal `min-h-11` button floor.
4. **The create rejection renders at `text-warning-text`, not `text-destructive`.** The server refusing a second active link means the panel's data is stale, so the message is informational and the caller refetches behind it. The driver's string is read to branch on and never rendered.
5. **`role="status"` on that message,** so the line that appears after a failed create is announced rather than only drawn.
6. **The copy failure path has its own copy and its own test.** A denied clipboard permission or a non-secure context must not leave the button claiming a copy that did not happen; the field beside it still selects on focus, so "select the field and copy it" is real advice.
7. **`revokeLink.mutate` uses a per-call `onSuccess` to close the dialog,** which runs alongside the factory's own `onSuccess` rather than replacing it, so plan 66-09's invalidation still fires.
8. **A page-level bridge test was added** beyond the plan's seven, because the plan's acceptance criterion "the queue's empty-state CTA still resolves to `#application-links`" is only mechanically checkable by exercising it. Two page mutants prove it bites.
9. **The `UnitFixture` shape in the test is local and minimal.** The panel reads three fields, the mocked `useQuery` erases the type on the way through, and a thirty-field `Property & { units: Unit[] }` literal would be noise; `ApplicationLinkRow` is imported rather than redeclared, because that one is a seven-field `Pick` and is the real contract.

**Total:** 2 auto-fixed issues (1× Rule 2, 1× Rule 3), 9 recorded discretionary choices. No Rule 4 architectural question arose. No package was installed.

## Verification

| Gate | Result |
|---|---|
| Task 1 automated gate (typecheck, biome, `applicationLinkUrl` present, browser-origin global = 0, `aria-label` present, the banned attribute = 0, `applicationLinkState` present, the banned spacing utility = 0, `confirmVariant="destructive"`, "are not affected") | **PASS** — 0 / 0 / 0 on all three zero-counts |
| Task 2 automated gate (tests, typecheck, biome on `page.tsx`, `id="application-links"`, `<ApplicationLinkPanel`) | **PASS** |
| `bun run test:unit -- src/components/applications/__tests__/application-link-panel.test.tsx` | **PASS** — 18 tests |
| `bun run typecheck` (app + integration + e2e projects) | **PASS** |
| `bun run lint` | **PASS** — 1372 files |
| Full suite + coverage via lefthook pre-commit on both commits | **PASS** — no `--no-verify` |
| Mutation campaign (13 panel + 2 page) | **15 killed, 0 survivors**; both files restored byte-identical |
| Band 2 placeholder comment removed from `page.tsx` | **PASS** — 0 occurrences |

## Threat Model Coverage

| Threat ID | Disposition | How this plan discharged it |
|---|---|---|
| T-66-15 | accept | D-03a stands. The raw token is rendered to its owner only, behind the owner-scoped SELECT policy from 66-01. Unguessability (256 bits) is the security property and is unaffected by the value being at rest. |
| T-66-44 | mitigate | `applicationLinkUrl` only; zero browser-origin occurrences; the full URL asserted against a literal at an origin jsdom does not share. Mutant 1 kills 5 tests. |
| T-66-45 | mitigate | `ConfirmDialog` with `confirmVariant="destructive"`; the mutation is asserted NOT called on the trigger click and asserted called with the right id on the confirm click; Cancel is covered too. Mutant 4 kills 3 tests. |
| T-66-46 | mitigate | The "are not affected" clause is gated by grep and asserted in the rendered dialog. Mutant 8 kills 1 test. |
| T-66-47 | mitigate | `applicationLinkState` is the single derivation; the revoked-and-lapsed row is asserted to read Revoked, dated from `revoked_at`, with the active state as an in-test positive control. Mutants 3 and 9 each kill 1 test. |
| T-66-SC | mitigate | Zero packages installed. `sonner`, `ConfirmDialog`, `Empty`, `Badge`, `Input` and `Skeleton` all already existed. |

## Known Stubs

None. Every state the panel renders is wired to real data through plan 66-09's factories, and both mutations call real RPCs.

## Deferred

- **E-19** (URL field visible with a non-empty value on a real second page load, 1280px) is plan 66-17's Playwright spec. jsdom computes no layout and loads no stylesheet, so the geometric and cascade half of §C — the 48px field height at ≤768px under §D-1, the `<ul>`'s computed `padding-left`, the row's `<li>` margin — cannot be decided here.
- Nothing else. No item was logged to `deferred-items.md`.

## Self-Check: PASSED

- `src/components/applications/application-link-panel.tsx` — FOUND (516 lines)
- `src/components/applications/__tests__/application-link-panel.test.tsx` — FOUND (640 lines)
- `src/app/(owner)/applications/page.tsx` — FOUND (114 lines)
- Commit `5d1f51ad6` — FOUND
- Commit `ddaec3169` — FOUND
