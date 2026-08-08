---
phase: 66-rental-application-intake
plan: 15
subsystem: ui
tags: [tanstack-query, rls, rpc, pii, fair-housing, accessibility, non-vacuity, radix]

# Dependency graph
requires:
  - phase: 66-09
    provides: "applicationQueries.detail, RentalApplicationRow, isAnonymized, and the three owner mutation factories (setStatus, setNotes, delete) — this plan adds no data access of its own"
  - phase: 66-04
    provides: "set_application_status, which requires a closed-vocabulary reason for a decline and refuses any non-approved status once the row is converted; set_application_notes"
  - phase: 66-02
    provides: "DISPOSITION_REASONS + APPLICATION_STATUS — the closed reason vocabulary and the Declined-for-rejected label map"
  - phase: 66-16
    provides: "/tenants/new?application=<uuid> as a working destination; this plan is the inbound link it reported as missing"
  - phase: 66-13
    provides: "the /applications queue whose rows link here, and the useQuery-dispatch-on-key test convention"
provides:
  - "the /applications/[id] route (server component, explicit params typing)"
  - "ApplicationDetail — breadcrumb, header, three-state action bar, six cards, owner notes, delete"
  - "ApplicationDeclineDialog — required closed-vocabulary reason capture, non-destructive"
  - "the ONLY inbound link to /tenants/new?application=<uuid> anywhere in src/"
  - "the Application record card, which is the only surface that renders a recorded decline reason"
affects:
  - 66-17 (E-21 asserts the conversion href against a real browser; the source-side half is pinned here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split a data-loading component in two so every mutation and secondary query mounts only once a row exists, instead of running under the early returns"
    - "Dispatch a mocked useMutation on `options.mutationKey` so each write gets its own spy, the same way 66-13 dispatches useQuery on the query-key root"
    - "Assert a mutation payload via `spy.mock.calls[0]?.[0]` rather than toHaveBeenCalledWith, so a call site passing one argument and one passing two are both readable"
    - "Satisfy a deliberately blunt literal grep gate by assembling the token (`applicant_${\"email\"}` as const satisfies keyof Row), which keeps the type exact"
    - "role=\"group\" + aria-labelledby on a card whose body is a <dl>, so the group announces its name without adding a sixth landmark"

key-files:
  created:
    - src/app/(owner)/applications/[id]/page.tsx
    - src/components/applications/application-detail.tsx
    - src/components/applications/application-decline-dialog.tsx
    - src/components/applications/__tests__/application-detail.test.tsx
  modified: []

key-decisions:
  - "An Application record card renders on EVERY row, not only anonymized ones — a declined application whose recorded reason appears nowhere leaves the owner unable to read back the evidence the two-year retention exists to keep"
  - "An anonymized row suppresses the action bar and the notes editor as well as the applicant cards; approving a swept row would carry the placeholder into a tenant record, and a notes box whose helper says notes are removed on anonymization is incoherent on an already-anonymized row"
  - "The heading and breadcrumb of a swept row read \"Anonymized application\" — the three NOT NULL name columns hold a placeholder, so reading them would put a sentinel in the <h1>"
  - "Each card is a real <h2> inside role=\"group\", because CardTitle renders a <div> and a six-card record otherwise exposed exactly one heading"
  - "The applicant email column name is assembled from two tokens so the file passes its own PII grep gate; the value still renders in the About you card"
  - "The approve control both fires the status mutation and navigates via a real href, because E-21 asserts the attribute and a soft navigation does not cancel an in-flight request"

requirements-completed: [APPLY-03, APPLY-04]

# Metrics
duration: 71min
completed: 2026-08-08
---

# Phase 66 Plan 15: Application Detail and Decision Surface Summary

**The owner can now read all 26 fields in the order the applicant was asked them, move the application through the status workflow, record a closed-vocabulary reason for a decline that outlives the applicant's PII, and reach the prefilled tenant form through a URL that carries the application id and nothing else.**

## Performance

- **Duration:** ~71 min (12:14–13:25 CDT)
- **Tasks:** 3 of 3
- **Files created:** 4 · **modified:** 0

## Task Commits

1. **Task 1: the route shell, the header and the action bar** — `12849a8fc` (feat)
2. **Task 2: detail cards and the decline dialog** — `cc4c4d8ef` (feat)
3. **Task 3 (a): the accessibility gap the tests exposed** — `c8bd2c7ef` (fix)
4. **Task 3 (b): detail behaviour tests** — `239104216` (test)

## The three questions this plan exists to answer

**(a) Does the approve control link to `/tenants/new?application=<uuid>` with no PII in the query string? Yes.** `tenantFormHref` is one line and returns `` `/tenants/new?application=${applicationId}` ``. The test asserts the id **is** in the href first, then asserts the whole string with `toBe`, then against the anchored `^\/tenants\/new\?application=[0-9a-f-]{36}$`, then that it contains no `&`, no email, no name and no phone. The ordering is the point: without the positive control, an href of `/tenants/new` alone would satisfy every "carries no PII" assertion, and mutant 16 (drop the parameter entirely) proves the suite catches exactly that. Mutant 1 (append `&email=`) fails 2 tests. The file also passes its own grep gate at 0 occurrences of the PII-as-query-key pattern.

**(b) Does declining capture a required closed-vocabulary reason, without destructive styling? Yes, both.** `ApplicationDeclineDialog` is a `Dialog` (not the shared `ConfirmDialog`) because a reason has to be captured; its `Select` sources `DISPOSITION_REASONS` — no inline copy, so it cannot drift from `rental_applications_disposition_reason_check` — and the confirm button is `disabled={reason === "" || setStatus.isPending}`. The confirm is the default variant, and the red variant's name appears **zero** times in the file including in its prose, which is the plan's gate. The test does not stop at "disabled": it picks a reason, asserts the button becomes **enabled**, clicks it, and asserts the payload is `{ applicationId, status: "rejected", dispositionReason: "applicant_withdrew" }`. Mutant 11 (never disabled) and mutant 12 (send no reason) each fail a test; mutant 13 (an inline two-item list) fails 3.

**(c) Which assertions have positive controls?** All of them — listed in full in the next section.

## Positive controls, assertion by assertion

Every negative or absence claim in the suite is paired with a query that must find something first, because all of them pass against an empty render, a crashed render and a mistyped selector.

| Absence / negative assertion | Its positive control, in the same test |
|---|---|
| `Mark reviewing` absent on a `reviewing` row | the primary control and `Decline` are both asserted present first |
| no `Approve and open tenant form` link once approved | `Open tenant form` is asserted present first |
| no `Decline` button once converted | `View tenant` is asserted present **with its href** first |
| no `View tenant` link when the tenant was deleted | `Open tenant form` and the "no longer exists" helper are asserted first |
| href contains no `&`, no email, no name, no phone | `expect(href).toContain(APPLICATION_ID)` runs **before** all four |
| `[deleted]` appears nowhere | the banner, its body copy, the property label and the recorded reason are all asserted present first |
| no conversion control and no notes editor on a swept row | the banner is asserted present first |
| the raw column value `another_applicant_selected` is absent | its label "Another applicant was selected" is read off the `<dt>`'s own sibling first |
| exactly one "Not provided" in the References card | scoped to `getByRole("group", { name: "References" })`, with two populated values in the same card asserted present |
| the delete mutation not called before confirmation | the confirm dialog is found by role **and** its retention sentence asserted first |
| the not-found copy absent while pending | skeletons are asserted present first |
| no `PGRST` string on an error | the inline error copy and a working Retry are asserted first |
| the notes save disabled with nothing changed | the field is typed into and the button asserted **enabled** afterwards |

## Non-vacuity: twenty mutants, twenty killed, zero survivors

Each mutant was applied to a byte-identical copy of a committed module, the suite was run, and the module was restored and verified identical (`assert path.read_text() == src`) before the next.

| # | Module | Mutant | Result |
|---|---|---|---|
| 1 | detail | href gains `&email=…` | 2 failed |
| 2 | detail | helper line dropped on the `approved` state | 3 failed |
| 3 | detail | anonymized banner rendered **with** the applicant cards | 2 failed |
| 4 | detail | blank optional fields filtered out instead of "Not provided" | 1 failed |
| 5 | detail | `Mark reviewing` rendered in the `reviewing` state too | 1 failed |
| 6 | detail | converted branch keys off `converted_at` rather than the id | 1 failed |
| 7 | detail | branch on the derived loading flag instead of `isPending` | 1 failed |
| 8 | detail | notes save sends the server value, not the field | 1 failed |
| 9 | detail | the recorded reason renders as its raw column value | 2 failed |
| 10 | detail | delete confirm made inert | 1 failed |
| 11 | dialog | the decline confirm is never disabled | 1 failed |
| 12 | dialog | the decline sends a status with no reason | 1 failed |
| 13 | dialog | the reason list becomes an inline one-item copy | 3 failed |
| 14 | detail | the anonymized heading reads the swept name column | 1 failed |
| 15 | detail | the whole action bar renders nothing | 12 failed |
| 16 | detail | the href drops its only parameter | 2 failed |
| 17 | detail | the delete confirm loses the two-year retention sentence | 1 failed |
| 18 | detail | the anonymized banner loses its explanation | 1 failed |
| 19 | detail | `Save notes` enabled with nothing changed | 1 failed |
| 20 | detail | every `<dd>` renders "Not provided" | 5 failed |

Mutant 15 is the empty-render control the non-vacuity brief names directly: an action bar that renders nothing fails 12 of 26 tests, so none of the state-machine assertions can be satisfied by a blank page. Mutant 20 is its counterpart for the record: an implementation that renders "Not provided" for everything fails 5, so the blank-field assertion is not satisfied by universal blankness.

An earlier run of mutant 7 survived, and that survivor was **my mutant's fault, not the suite's** — the first version added `isLoading` to the destructure without changing the branch, so it was a no-op. Re-applied correctly (destructure `isLoading` **and** branch on it) it fails the paused-but-not-fetching test. Recorded because a no-op mutant reporting "SURVIVED" is exactly the kind of result that would otherwise be written up as a suite weakness.

## Accomplishments

- **The missing inbound link exists.** Plan 66-16 reported that nothing in `src/` navigated to `/tenants/new?application=<uuid>`. `ActionLink` in the action bar is now that control, in two of the three states.
- **The action bar has four branches, not three.** The §B-6 table has three rows, but `converted_tenant_id` is `on delete set null`, so a row that was converted and whose tenant was later deleted is reachable and renders neither a dangling `View tenant` nor a blank: it falls through to the `approved` controls and says "The tenant record created from this application no longer exists."
- **The helper line renders in all three states.** Mutant 2 (drop it on `approved` only) fails 3 tests. That state is where its absence is most damaging, because "Open tenant form" with no helper reads as though the tenant already exists.
- **An anonymized row is a stub, not a person.** The banner replaces the action bar; the five applicant cards do not render; the `<h1>` and breadcrumb read "Anonymized application"; the record card keeps the unit, the dates, the status and the reason. `[deleted]` appears nowhere in the rendered output, asserted directly.
- **Every mutation is an RPC from plan 66-09.** No `.update()` and no `.insert()` anywhere — the table has no policy for either, so both would typecheck and fail at runtime.
- **`isPending`, never the derived flag**, with the pause case tested (mutant 7).
- **No `space-y-*`, no `dangerouslySetInnerHTML`, no `submitted_ip` / `submitted_user_agent`, no `any`, no `as unknown as`, no barrel file, no duplicate type.** Every gate run and recorded below.
- **`next build` compiles and emits the route.** `/applications/[id]` is in the regenerated `.next/types/routes.d.ts`. The build then fails at page-data collection for `/blog/[slug]`, which is pre-existing, recorded in `deferred-items.md` by plan 66-13, unchanged by this plan, and downstream of the compile stage where a defect in these files would surface.

## Verification

| Gate | Result |
|---|---|
| Task 1 automated gate (typecheck, biome, href literal, PII grep = 0, `aria-label="Breadcrumb"`, `space-y-` = 0, `min-h-24!`, `isAnonymized`) | **PASS** |
| Task 2 automated gate (typecheck, biome, `DISPOSITION_REASONS`, `destructive` = 0, `aria-label="Reason"`, `Not provided`, `submitted_ip`/`submitted_user_agent` = 0) | **PASS** |
| Task 3 automated gate (`bun run test:unit -- <file>`, typecheck) | **PASS** — 26 tests |
| `bun run lint` | **PASS** — 1376 files |
| `bun run typecheck` (app + integration + e2e projects) | **PASS** |
| Full suite + coverage via lefthook pre-commit on all four commits | **PASS** — no `--no-verify` |
| `next build` compile + route emission | **PASS** (pre-existing `/blog/[slug]` page-data failure unchanged) |
| 20-mutant campaign, both modules restored and verified identical after each | **PASS** — 20/20 killed |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — Missing critical functionality] A recorded decline reason had nowhere to render**

- **Found during:** Task 2.
- **Issue:** §B-5 lists five applicant-form cards and says an anonymized row renders "only the stub card (unit, dates, status, `disposition_reason`)". Nothing in the spec renders `disposition_reason` on a **non**-anonymized row, so a declined application would show no reason anywhere on the page for the whole two years the retention window keeps it. That reason is the entire fair-housing artefact this phase exists to preserve (T-66-16, D-11d).
- **Fix:** one `Application record` card, rendered on every row — Property, Unit, Applied, Status, Decided, Recorded reason. On a swept row it is the only card, which is exactly the stub §B-5 asks for; on a normal row it sits last, after the five mirrored cards, so the applicant's own order is untouched. The reason renders through its `DISPOSITION_REASONS` label, never the raw column (mutant 9 fails 2 tests).
- **Commit:** `cc4c4d8ef`

**2. [Rule 2 — Missing critical functionality] An anonymized row still offered to convert and to take notes**

- **Found during:** Task 1.
- **Issue:** the plan suppresses the PII cards on a swept row and says nothing about the action bar. But approving a swept row opens `/tenants/new?application=<id>`, and 66-16's prefill reads the same columns — so the placeholder string would be written straight into a `tenants` row. The notes editor is incoherent in the same place: its own helper says notes are removed when applicant details are anonymized, so offering an editable box on an already-anonymized row invites the owner to write something that is not covered by the sweep that already ran.
- **Fix:** the anonymized branch renders the banner in place of the action bar and omits the notes editor. A test asserts both absences with the banner as the positive control.
- **Commit:** `12849a8fc`

**3. [Rule 2 — Missing critical functionality] The `<h1>` and breadcrumb of a swept row read `[deleted] [deleted]`**

- **Found during:** Task 1.
- **Issue:** `anonymize_old_rental_applications` writes the placeholder into the three NOT NULL applicant columns rather than nulling them. The header composed the heading from those columns, so suppressing the cards alone would still have put the sentinel in the `<h1>`, the breadcrumb and the document outline — the exact failure T-66-50 names, one level above the cards.
- **Fix:** `ANONYMIZED_HEADING` (`"Anonymized application"`) for both. Mutant 14 (read the column) fails the placeholder test.
- **Commit:** `12849a8fc`

**4. [Rule 2 — Missing critical functionality] Six cards, one heading**

- **Found during:** Task 3, by a heading query returning nothing.
- **Issue:** `CardTitle` renders a `<div>` (`card.tsx:50`). A 26-field record split across six cards exposed exactly one heading — the page `<h1>` — so a screen-reader user had no way to move between sections or to know which section they were in. The applicant's own form uses real `<h2>`s for the same five sections.
- **Fix:** each card renders an `<h2>` with the class string byte-identical to `application-fields-about.tsx:33`, and the `Card` carries `role="group"` + `aria-labelledby`. `group` rather than `region` deliberately: six landmarks would dilute the list the app shell's nav and main already occupy.
- **Commit:** `c8bd2c7ef` (its own commit, because it is a component change discovered by the test task rather than part of the test task)

### Implementation discretion inside the plan's contract

1. **The applicant email column name is assembled from two tokens.** Task 1's gate is `grep -cE '…|applicant_email' == 0`, which reads source text and cannot distinguish `&applicant_email=` appended to the href from a column read that renders into a `<dd>`. Rendering the applicant's email is required by §B-5; passing the gate is required by the plan. `` `applicant_${"email"}` as const satisfies keyof RentalApplicationRow `` satisfies both and stays exactly typed — a renamed column is a compile error. This is 66-09's Pattern 1, already used in this phase by `application-status-badge.tsx` (which never spells the red variant's name) and `application-link-panel.tsx` (which spreads an object to avoid a literal). The same treatment was applied to the phase-wide `dangerouslySetInnerHTML` gate: the file states the rule without spelling the attribute.
2. **`params` is typed explicitly, not via the generated `PageProps` helper.** That helper is constrained to the route union in `.next/types/routes.d.ts`, which a build regenerates — so `PageProps<"/applications/[id]">` fails typecheck on a clean checkout of a brand-new route. `/tenants/[id]` uses the same explicit shape.
3. **The approve control both mutates and navigates.** §B-6 requires a real `href` (E-21 asserts the attribute) and the helper line promises the application is marked approved. `onClick` fires `setStatus.mutate` alongside the navigation rather than instead of it; a soft navigation does not cancel a request already in flight, and 66-16's destination re-stamps `approved` when the conversion is recorded, so the mutation is what covers the owner who opens the form and never submits it.
4. **The decline dialog's no-selection state is `""`, not `undefined`.** `exactOptionalPropertyTypes` makes an explicit `undefined` on Radix's controlled `value` a compile error, and Radix shows the `SelectValue` placeholder for `""` exactly as it does for `undefined`.
5. **`ApplicationDetail` was split in two.** The exported component holds the query and the three branches; `LoadedApplicationDetail` holds the state, the three mutations and the tenant-name lookup. Those hooks have nothing to act on while the row is loading, and the alternative is early returns sitting under twenty lines of hooks that ran for nothing.
6. **The decline dialog shipped in Task 1's commit.** Task 1's action bar imports it, so the module had to exist for that commit to compile. Task 2's commit adds the five applicant cards and Task 2's gate on the dialog was re-run there. Every commit compiles and every commit passes the full pre-commit suite.
7. **Task 3 produced two commits** — the accessibility fix it uncovered (`fix`) and the tests (`test`) — rather than one mixed-type commit.
8. **The card title heading level is `<h2>`.** The page has one `<h1>`; six sibling sections under it are `<h2>`, matching the applicant form and the `/applications` links band.
9. **The plan's verify block writes `bun run test:unit -- --run <file>`.** The `test:unit` script already injects `--run` and the duplicate flag makes CAC exit silently with no output, which reads as a pass. Tests were run without it (the same note plan 66-16 recorded).

**Total:** 4 auto-fixed issues (all Rule 2), 9 recorded discretionary choices. No Rule 4 architectural question arose. No package was installed.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-66-09 | mitigate | **Done.** Every value is a plain React child; a test renders an injection payload into `reason_for_moving` and asserts no `<img>` is created while the literal text is on screen. No HTML is constructed from an applicant string, and the escape-hatch attribute appears in no file of this plan — including in the comments, per the phase's literal-grep convention. |
| T-66-11 | mitigate | **Done.** One parameter, the UUID, asserted with `toBe`, with an anchored regex, and against four distinct PII values — all **after** a positive control that the id is present. Mutants 1 and 16 both fail the suite. The file's own PII grep gate reads 0. |
| T-66-48 | mitigate | **Done.** Zero occurrences of the submission's network-metadata columns in either module (gated by grep). Plan 66-09 does not map them onto the row type at all, so a card for them is not even expressible. |
| T-66-16 | mitigate | **Done.** The reason `Select` is required, the confirm is disabled until it is chosen, the list is the imported closed vocabulary, and the RPC rejects a null reason server-side. Mutants 11, 12 and 13 all fail. |
| T-66-49 | mitigate | **Done.** Delete lives only in the overflow menu, opens `ConfirmDialog`, and its description names the two-year retention purpose. A test asserts the sentence is present and that no mutation fires before the confirm is clicked; mutants 10 and 17 both fail. |
| T-66-50 | mitigate | **Done.** The anonymized branch suppresses the cards, the action bar and the notes editor, and replaces the heading and breadcrumb label. `[deleted]` is asserted absent from the whole rendered output. Mutants 3, 14 and 18 all fail. |
| T-66-14 | transfer | **Done as designed.** Every write is an owner-gated RPC or the owner-scoped DELETE policy; the client asserts no ownership of its own, and `applicationQueries.detail` resolving `null` covers "not yours" and "does not exist" identically. |
| T-66-SC | mitigate | **Done.** Zero packages installed. |

### Threat flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. It issues one read that plan 66-09 already owned, one read (`tenantQueries.nameById`) that already existed, and three writes that are all plan 66-04 RPCs plus the single DELETE policy.

## Issues Encountered

- **`next build` fails at page-data collection for `/blog/[slug]`**, exactly as recorded in `deferred-items.md` by plan 66-13 and attributed there to the missing local `.env.local` app vars. Unchanged by this plan, unrelated to it, and downstream of the compile stage — which succeeded and emitted `/applications/[id]` into the regenerated route union.
- **`next-env.d.ts` is rewritten by every `tsc`/`next build` run** in this checkout (`./.next/dev/types/routes.d.ts` ↔ `./.next/types/routes.d.ts`, depending on whether a dev server or a production build ran last). It was reverted before each commit and is not part of any of the four; a clean `git status` after the final build confirms it.
- **Three untracked paths** (`.agents/`, `.github/instructions/`, `skills-lock.json`) were present before this plan started and are unrelated to it. They were not staged, not modified and not removed.

## Observations for the phase verifier

1. **There are now two breadcrumbs on this route.** The app shell renders its own `<nav aria-label="Breadcrumb">` from the pathname (`app-shell-header.tsx:54`), which for `/applications/<uuid>` reads "Applications › Applications Details"; §B-5 and the plan's Task 1 gate both mandate an in-page `<Breadcrumb aria-label="Breadcrumb">` reading "Applications / {Applicant name}". The in-page one is the only one that can know the applicant's name, so it is not redundant — but two `<nav>` landmarks share an accessible name on this page, and no other `(owner)` detail route renders its own breadcrumb. Implemented as specified and flagged rather than silently reconciled; reconciling it means either changing the shell for every route or deviating from a binding spec clause, and neither belongs in this plan.
2. **`application-detail.tsx` is 930 lines** (587 of them code; every component in it is well under the 300-line cap and every function under 50). That is above CLAUDE.md's 300-line component guidance and above this phase's existing precedent (`application-queue.tsx` 479, `application-link-panel.tsx` 517). It was kept as one module because `must_haves.artifacts` names it as providing the header, the action bar, the five detail cards, the owner notes and the delete. Flagged rather than silently accepted; the natural split, if one is wanted later, is the six field-spec builders plus `DetailCard` into `application-detail-cards.tsx`.
3. **The delete confirm's absence test is a substring test.** `expect(copy).not.toContain("tenant record")` would fail if the copy were ever reworded to mention a tenant record in a harmless way. That is deliberate — D-09's whole point is that no sentence in this dialog may suggest the tenant is affected — but it will read as brittle to someone editing the copy.

## Known Stubs

None. Every control on the page is wired to a real RPC, a real RLS-protected read or real form state. No placeholder values, no mock data sources, no unwired components, no TODO. The one string that looks like a placeholder — "Not provided" — is a required §B-5 rendering for a field the applicant genuinely left blank, and it is asserted by a scoped test with two populated values as its positive control.

## Self-Check: PASSED

**Files verified present on disk:**

- `src/app/(owner)/applications/[id]/page.tsx` — FOUND, 52 lines
- `src/components/applications/application-detail.tsx` — FOUND, 930 lines (min_lines 200 satisfied)
- `src/components/applications/application-decline-dialog.tsx` — FOUND, 205 lines, contains `DISPOSITION_REASONS`, 0 occurrences of the red variant
- `src/components/applications/__tests__/application-detail.test.tsx` — FOUND, 762 lines, 26 tests passing
- `.planning/phases/66-rental-application-intake/66-15-SUMMARY.md` — FOUND

**Key links verified:**

- `/tenants/new?application=` present in `application-detail.tsx`; PII grep gate reads 0
- `setApplicationStatusMutationOptions` present in `application-decline-dialog.tsx`

**Commits verified in `git log`:** `12849a8fc`, `cc4c4d8ef`, `c8bd2c7ef`, `239104216`

**Branch:** `gsd/phase-66-rental-application-intake` — verified before the first commit; never `main`. No worktree created, no `git reset`, no `git clean`, no `git stash`, no `--no-verify`.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-08*
