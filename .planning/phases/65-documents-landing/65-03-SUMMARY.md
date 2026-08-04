---
phase: 65-documents-landing
plan: 03
subsystem: navigation
tags: [nav, breadcrumbs, command-palette, DOCS-01]
requires: []
provides:
  - "Sidebar Documents entry pointing at /documents as a flat <Link>"
  - "Cmd+K Documents row pointing at /documents"
  - "Breadcrumb labels for the four printable template slugs + vault"
affects:
  - src/components/shell/main-nav.tsx
  - src/components/shell/app-shell.tsx
  - src/lib/breadcrumbs.ts
tech-stack:
  added: []
  patterns:
    - "Exhaustive-equality href-set pins on both route tables (toEqual, never toContain)"
    - "Source-level guard coupling a deliberate omission to existsSync on the route file"
key-files:
  created: []
  modified:
    - src/components/shell/main-nav.tsx
    - src/components/shell/__tests__/main-nav.test.tsx
    - src/components/shell/app-shell.tsx
    - src/components/shell/__tests__/app-shell-nav.test.tsx
    - src/lib/breadcrumbs.ts
    - src/lib/__tests__/breadcrumbs.test.ts
decisions:
  - "L-04: the Cmd+K Templates group is KEPT — under flat nav the sidebar no longer surfaces the lease builder at all"
  - "L-06: `templates` OMITTED from LABEL_MAP — a deliberate one-entry deviation from D-07, because /documents/templates is a live 404"
  - "A-1: the Documents nav entry stays FLAT — a parent renders as a <button> with no <Link>"
metrics:
  duration: ~13 min
  tasks: 3
  files: 6
  completed: 2026-08-03
---

# Phase 65 Plan 03: Nav & Breadcrumb Repoint Summary

Both `Documents` route tables now point at the `/documents` landing, the one-item sidebar `Templates` section is deleted whole, and the four hyphenated printable-template slugs render real breadcrumb labels.

## What Shipped

| Task | Change | Commit |
|------|--------|--------|
| 1 | Flatten sidebar `Documents` entry to `/documents`; delete the `Templates` section (interface, array, render block, `FileCheck` import) | `9d587b422` |
| 2 | Repoint the Cmd+K `Documents` row to `/documents`; record the L-04 keep decision in-source | `2f370f8b3` |
| 3 | Add five `LABEL_MAP` entries; omit `templates` behind a two-sided guard | `376bc411f` |

**Verification:** `bun run typecheck` green. All four touched suites green — 84 tests across `main-nav`, `app-shell-nav`, `app-shell` and `breadcrumbs`. `bunx biome check src/components/shell src/lib/breadcrumbs.ts` clean. `git diff --stat package.json bun.lock` empty (zero packages installed, T-65-SC satisfied). `grep -rn "DocumentItem\|documentItems" src/ tests/` returns zero hits.

## 1. Blast-radius correction: FOUR edited tests, not three

`65-VALIDATION.md` and `65-RESEARCH.md` both state that **3** tests in `main-nav.test.tsx` needed edits (`:74-77`, `:210-214`, `:357-368`). That count was measured against a parent+children nav shape in which `Lease Template` survived as a child of `Documents`. **A-1 reverted that shape to FLAT, and under flat nav `Lease Template` has no parent to become a child of — it is simply removed from the sidebar.** So a fourth test broke: `:224-235` "should render Lease Template link", whose `getByRole` throws once `documentItems` and its render block are gone.

**Four tests were edited — `:52-77`, `:210-214`, `:224-235`, `:357-368` — and one was added.** Test count 25 → 26.

**Both planning documents are now stale on that number.** `65-VALIDATION.md` and `65-RESEARCH.md` should not be cited as authority on the nav blast radius.

`main-nav.test.tsx:135-143` (the `toEqual(["Analytics", "Reports"])` tripwire) was **not** touched — verified byte-identical against the plan base, and the file's diff contains no line matching that assertion. `Documents` renders through `renderNavItem`'s non-children branch as a `<Link>`, so `button[aria-controls^="nav-section-"]` never matches it and the exhaustive list still holds at exactly two sections.

## 2. L-04 — the Cmd+K `Templates` group is KEPT

D-09 scopes to the sidebar nav section; D-10 enumerates exactly two changed entries and this is not one of them. Three reasons, now written into `app-shell.tsx` itself rather than only into planning docs (the adjacent comment records a prior review that cut the other way, so a reviewer citing it gets an answer in the source):

1. The palette is a **search surface**, where duplication is a feature rather than a nav hierarchy.
2. Deleting it would break `app-shell.test.tsx:414` (`getAllByText("Templates").length >= 1`).
3. Under **flat** nav the sidebar no longer surfaces the lease builder at all, so deleting the palette row too would leave `/documents/lease-template` reachable only from the new landing — a discoverability regression shipped alongside a discoverability feature. This reason is stronger under flat nav than the research (written against parent+children) could state.

The keep is **executable, not merely asserted**: the palette's `/documents*` href set is pinned to exactly `["/documents", "/documents/lease-template"]`. Non-vacuity was verified in both directions — the test fails when the href is reverted to `/documents/vault`, and fails when the Templates row is removed.

## 3. L-06 — `templates` OMITTED from LABEL_MAP

A deliberate one-entry deviation from D-07's literal six. `src/app/(owner)/documents/templates/` has **no `page.tsx`** (verified), so `/documents/templates` is a live 404, and `app-shell-header.tsx` renders that middle crumb as a real `<Link>`. Adding the entry is a rendering no-op — the capitalize-fallback already yields "Templates" — so the only effect of shipping it would be to make an intentional-looking map entry point at a 404, on a Claims Integrity milestone.

**The dead crumb is pre-existing and out of DOCS-01's scope.** This plan declines to bless it and pins the decision with a two-sided guard:
- `/^\s*templates:\s*"/m` must not match the source (anchored, so it does not false-match the four `…-template…`-shaped keys).
- The five keys that *were* added must each be present — the paired positive, without which the first assertion would pass against an emptied file.
- `existsSync(".../documents/templates/page.tsx")` must be `false`, **which is the condition for the omission**: if that route ever ships, this fails and forces the label decision to be revisited rather than silently inherited.

`vault` **is** added. It is also a fallback no-op, but `/documents/vault` is a real route, so the entry is honest and keeps D-07 compliance at five of six. The in-file comment says so, to stop a later "cleanup" of an apparently redundant line.

## 4. D-08b — carried forward unfixed, out of scope

`renderNavItem`'s `hasChildren` branch renders a parent as a `<button onClick={toggleExpanded}>` with **no `<Link>` at all**; the parent's `href` feeds only a dead `isActive()` call. Consequence: **Phase 56's `/reports` hub index is still unreachable from the sidebar.** Fixing it (link + separate chevron toggle) changes shared behaviour for both `Reports` and `Analytics` and needs its own phase per `65-CONTEXT.md` D-08b.

This is precisely why the `Documents` entry was kept FLAT (T-65-14, mitigate-by-avoidance) and why the new test pins that structurally — `queryByRole("button", {name: /^documents$/i})` absent **and** `getByRole("link", …)` present with the right href. Both halves are required; the absence alone would pass against a sidebar rendering no `Documents` entry at all.

## Deviations from Plan

No source behaviour deviated. Three measurement corrections and one process note:

**1. [Measurement] The dead-symbol baseline is 5, not 6.**
`grep -c 'DocumentItem\|documentItems\|FileCheck' src/components/shell/main-nav.tsx` returned **5** before the change and **0** after. The plan's `<success_criteria>` says "baselines: 6 and 2"; its `<done>` block correctly says 5 and explicitly instructs not to "fix" a measured 5 to a remembered 6. `grep -c` counts matching **lines**, and `:93` (`const documentItems: DocumentItem[] = [`) matches both symbols on one line. The five lines were `:9`, `:31`, `:93`, `:97`, `:307`. **Measured, not adjusted.** `grep -cF 'Templates'` was **2** before, **0** after, as documented.

**2. [Measurement] `grep -c 'toContain('` is 4, not 0.**
The plan's `<done>` predicts **0**. Measured **4** at the plan base and **4** now — unchanged. All four are pre-existing `expect(link.className).toContain("text-primary-text")` active-state assertions (`:103`, `:111`, `:119`, `:127`), unrelated to route assertions. The criterion's *intent* — no exhaustive assertion weakened to `toContain` — is satisfied: the count did not move, and the `toEqual` tripwire is byte-identical. Reported rather than "fixed", consistent with the plan's own guidance on the 5-vs-6 case.

**3. [Flagged, not fixed] Two stale comments in `app-shell.test.tsx`.**
`:411-413` states "the new top-level `Documents` core nav item points at `/documents/vault`" and `:415` states "`/documents/vault` must be reachable from cmd+K Navigation group". Both are now factually wrong. The plan's success criteria require `app-shell.test.tsx` to pass **unmodified**, and it does (32 tests green, including `:414` and `:422`), so the file was deliberately left byte-identical. **Recommended follow-up:** refresh those two comments to name `/documents`. Flagged here so a reviewer gets an answer instead of raising a finding.

**4. [Process] Worktree base correction.**
The worktree spawned at `b3e3305f1`, an ancestor of the required base `90526195a`. `git reset --hard` was denied by the permission system; since the tree was clean and HEAD was a strict ancestor, `git merge --ff-only 90526195a` performed the identical, non-destructive correction. No `git clean`, `git stash` or blanket reset was used at any point.

**5. [Process] First commit attempt failed on a contended full-suite hook.**
The pre-commit hook's `vitest --run --project unit --coverage` reported widespread failures in files untouched by this plan (`table.test.tsx` 14/14, `animated-trend-indicator` 31/31, `settings-page` with 5000 ms timeouts). `table.test.tsx` passed 14/14 in isolation, and the timeout signature indicates CPU starvation from the concurrent wave agent running its own full suite. The retry passed with no code change. **No hook was bypassed — `--no-verify` was never used.**

## Scope Boundary Held

Nothing under `src/app/(owner)/documents/` was created, edited or deleted — that directory belongs to the concurrently-executing plan 65-01. The diffstat against the plan base contains exactly the six files in `files_modified` and no others.

This constrained one verification: the plan's `<done>` asks that the L-06 guard "fails if `.../documents/templates/page.tsx` is created". Creating that file would have violated the boundary, so the guard's mechanism was verified instead by a scratch script confirming `existsSync` resolves the `(owner)` route-group parens correctly — returning `false` for the guarded path and `true` for two real sibling `page.tsx` files. The guard is genuinely coupled and would flip the moment that route ships.

The two remaining `/documents/vault` references in `src/app/(owner)/documents/page.tsx` are 65-01's to resolve.

## Threat Model Outcomes

| Threat | Disposition | Outcome |
|--------|-------------|---------|
| T-65-07 (stale/dead nav row) | mitigate | Both route tables pinned by exhaustive equality: sidebar `["/documents"]`, palette `["/documents", "/documents/lease-template"]`. Neither can pass vacuously. |
| T-65-08 (crumb dressing a 404) | mitigate | `templates` omitted; omission coupled to `existsSync` on the route file. |
| T-65-13 (access widening) | accept (inherited) | No proxy, middleware or `PUBLIC_ROUTES` file touched; `/documents` already sits under the private prefixes. |
| T-65-14 (landing unreachable) | mitigate by avoidance | Entry kept FLAT; pinned structurally by the button-absent + link-present pair. |
| T-65-SC (supply chain) | mitigate | `git diff --stat package.json bun.lock` empty. Zero packages installed. |

## Known Stubs

None. No placeholder values, empty data sources or TODO markers were introduced.

## Self-Check: PASSED

- `src/components/shell/main-nav.tsx` — FOUND, `href: "/documents"` present, zero `DocumentItem`/`documentItems`/`FileCheck`/`Templates`
- `src/components/shell/app-shell.tsx` — FOUND, `"/documents/vault"` count 0, `"/documents/lease-template"` count 1
- `src/lib/breadcrumbs.ts` — FOUND, five added keys present, `templates` key absent
- `.planning/phases/65-documents-landing/65-03-SUMMARY.md` — FOUND
- Commits `9d587b422`, `2f370f8b3`, `376bc411f` — all FOUND in `git log`
- 84/84 tests green across the four touched suites; typecheck green; lint clean
