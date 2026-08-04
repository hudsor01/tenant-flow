---
phase: 65-documents-landing
verified: 2026-08-03T21:45:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 11/11 must-haves verified
  gaps_closed:
    - "The reversed 308 does not stick in browser/intermediary caches (WR-05 / L-01)"
    - "Visual check of the three-band ladder at desktop and 375px"
  gaps_remaining: []
  regressions: []
---

# Phase 65: Documents Landing Verification Report

**Phase Goal:** `/documents` stops being a bare redirect and becomes a real landing page — a
navigation surface with entry points to the document vault, the lease template builder, and
the printable templates.

**Verified:** 2026-08-03T21:45:00Z
**Status:** passed
**Re-verification:** Yes — after both outstanding human-verification items were discharged
(see `65-HUMAN-UAT.md`). Re-checked all 11 must-haves against current source at HEAD
(`555f9e601`), not carried forward from the prior report — 11 commits landed between the
first verification pass and this one (8 perfect-PR fix cycles + 1 security-audit fix + 2
UAT-closure commits).

## What changed since the prior verification

Eight perfect-PR review cycles ran to two consecutive zero-finding cycles. Ten commits
touched product/test source after the first `human_needed` report:

| Commit | What it fixed |
|---|---|
| `46a0d176b` | UF-01 from `65-SECURITY.md` — `breadcrumbs.ts`'s `LABEL_MAP` had the same prototype-chain-read hazard as WR-02, unfixed at review time |
| `c22cb1f0e` | Recent-row title `truncate` was inert (flex/w-fit container defeats `text-overflow: ellipsis`) |
| `71acec57f` | Global `ul, ol` base rule indented the recent-documents list 24px |
| `120f81b68` | Category labels read the static seed map instead of the owner's mutable per-owner labels (contradicted the vault's own Phase 65 decision one file over); two regressions from the previous commit's own list fix (`[&>li]:mb-0` and `my-0` both lost to `:where()`-wrapped `space-y-*` at higher specificity) |
| `99de582f9` | Global `p { margin-bottom: 1rem }` leaked into the row meta line and the empty-state description |
| `68a679279` | Global transparent-underline `a` rule painted a stray hover underline across the vault CTA and every hub tile |
| `e99dca332` | Same base `p` margin leaked into `page.tsx`'s Band 3 description and the tile description (missed in the earlier panel-scoped sweep) |
| `f6a42b3ff` | Two of the executor's own test assertions were vacuous (substring-implied pass; negative-only assertion) |
| `3412b3095` / `555f9e601` | Closed the two `human_needed` UAT items (analysis + measurement, detailed below) |

None of these are new functional gaps against the three roadmap Success Criteria — they are
CSS-specificity leaks from the app's unscoped `@layer base` rules and one data-source
correction (category labels), all caught by perfect-PR review cycles and fixed with
regression tests. I re-ran the full suite and the production build at HEAD rather than
trusting the commit messages.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 (SC-1) | `/documents` renders a real landing page with entry points to the vault, the lease template builder and the printable templates; the `permanentRedirect` is reversed and the reversal is recorded in-code as superseding the earlier decision | VERIFIED | Direct read of `src/app/(owner)/documents/page.tsx` at HEAD: still a Server Component, no `"use client"`, no `next/navigation` import. Header doc block still states "DOCS-01 SUPERSEDES what this file used to be (D-06)". `bunx next build --experimental-build-mode compile` run fresh in this pass lists `/documents` as its own route (`ƒ /documents`), not a redirect target. |
| 2 (SC-2) | `/documents/vault` stays the canonical vault URL — the landing links to it; no sidebar, marketing or deep-link target outside this phase changes | VERIFIED | Re-ran `grep -rln "/documents/vault" src/` at HEAD: only phase files, their tests, `document-search-keys.ts`, and `breadcrumbs.ts`/its test. `main-nav.tsx`/`app-shell.tsx` unmodified since the original phase commits (`git log e29128270^..HEAD -- main-nav.tsx app-shell.tsx` is empty) — directly re-read both, `Documents` entries still flat `/documents`. |
| 3 (SC-3) | The landing's recent-documents panel reuses the vault's existing query/mapper rather than a second data source, so the two surfaces can never disagree | VERIFIED | `recent-documents-panel.tsx` at HEAD still has exactly one `useQuery(documentSearchQueries.list({ page: 0 }))` for document data — the same factory/params the vault uses. A second hook, `useDocumentCategories()`, was added in `120f81b68` for category-LABEL enrichment only (not document rows); it reads the same `documentCategoryQueries.list()` entry the vault already warms, so it does not fork the document cache SC-3 is about. The test file mocks `useDocumentCategories` separately from `useQuery` specifically to keep the `toEqual({ page: 0 })` document-params pin exact — confirmed by reading the test's own header comment and running it (passes). |
| 4 | Every one of the six hub hrefs resolves to a route directory that has a `page.tsx` on disk | VERIFIED | Unchanged since first pass; independently re-confirmed via the fresh build manifest (all 6 destinations listed as real routes). |
| 5 | `page.tsx` is a genuine Server Component; WR-01's correction (dropped `Separator`, restated error-boundary claim) is real | VERIFIED | Direct read at HEAD: no `"use client"`, no hook, no Supabase import, band rule is `<div role="none">` not `Separator`. Doc block states the panel is the only client island and correctly describes inheriting `(owner)/error.tsx`. |
| 6 | The recent-documents panel's 4-state machine does not falsely claim "No documents yet" while pending-but-not-fetching (CR-01); does not leak a non-string category value from a prototype-polluted slug (WR-02) | VERIFIED | `recent-documents-panel.tsx:346` still destructures `isPending` and branches on it. `categoryLabel()` still gates on `Object.hasOwn`. New in this window: `ownerCategoryLabel()` reads a `Map#get` (no prototype hazard by construction) before falling back to `categoryLabel()`. Full test file re-run: passes (part of the 231/231 phase-scoped run below). |
| 7 | The breadcrumb for the four hyphenated printable-template slugs renders a real label; `/documents/templates` is not reachable via a live link (CR-02) | VERIFIED | `breadcrumbs.ts` unchanged on this point since first pass; `NON_ROUTABLE_SEGMENTS = new Set(["templates"])` confirmed present at HEAD. Additionally hardened in this window (`46a0d176b`): `LABEL_MAP` lookups now use `Object.hasOwn` too, closing the sibling prototype-chain hazard the security audit caught (UF-01) after the first verification pass. |
| 8 | Uploading or deleting a document on any of the five detail routes marks the vault-search cache entry stale (D-11) | VERIFIED | `documents-section.tsx` untouched since the original phase commits; re-confirmed 3 `invalidateQueries` calls in `invalidateListAndDashboard`. |
| 9 | The sidebar `Documents` entry is a flat `<Link>` at `/documents`; the one-item `Templates` section is gone | VERIFIED | `main-nav.tsx` unmodified since `e29128270`; re-read directly, confirmed flat entry, no `DocumentItem`/`documentItems`/`FileCheck` remnants. |
| 10 | The Cmd+K palette `Documents` row points at `/documents`; the `Templates` group is kept with rationale recorded in-source (L-04) | VERIFIED | `app-shell.tsx` unmodified since `e29128270`; re-read directly, confirmed. |
| 11 | The sidebar still has exactly two collapsible sections, Analytics and Reports | VERIFIED | Unchanged; `main-nav.test.tsx` re-run, passes. |

**Score:** 11/11 truths verified

### Human Verification — Both Items Resolved

Both items the prior report left open were closed in `65-HUMAN-UAT.md` (status: complete,
2/2 passed). I re-derived each conclusion independently against current source rather than
accepting the resolution's prose — see the audit trail below.

#### 1. The reversed 308 does not stick in browser/intermediary caches (WR-05 / L-01)

**Resolution's claim:** the old `permanentRedirect` was never a cacheable 308 in the first
place — closed by root-cause analysis, not live observation.

**Independent re-verification of the five evidence lines:**

1. **Streaming context.** `src/app/(owner)/loading.tsx` exists and is inherited by
   `/documents` — confirmed by direct read. Next 16.2.12 does document a client-side
   meta-tag fallback for redirects thrown after a stream has already started. I could not
   fully confirm this specific old page (a synchronous, zero-`await` component) actually hit
   that fallback path rather than the standard synchronous-redirect path in
   `app-render.js` — reading the source myself (lines 1979-1991 and 4292-4297, both
   confirmed present at those line numbers) shows a catch handler that sets `res.statusCode`
   + `location` directly, which is consistent with either a genuine 308 OR the error-path
   fallback for a meta-tag case; the exact trigger condition for which path Next takes isn't
   fully resolved by static reading alone. **This one sub-claim is therefore treated as
   unverified, not confirmed.**
2. **No historical window.** Independently re-derived with a *different* and more complete
   history than the resolution cites (its `80fea490c` citation is a pure monorepo-flatten
   rename, not the commit that introduced either file). Actual timeline: `(owner)/loading.tsx`
   was added 2025-12-04 (`e6a89fc26`); `(owner)/layout.tsx` gained
   `export const dynamic = "force-dynamic"` on 2026-03-06 (`6e036280a`); `permanentRedirect`
   was only introduced on 2026-05-15 (`acd33dcc6`, upgrading a prior plain 307 `redirect()`).
   So for the **entire lifetime** of `permanentRedirect` on this route, both `loading.tsx`
   and `force-dynamic` already governed it — confirmed by `git log`, not asserted.
3. **Never a config redirect.** Re-ran `git log -S'"/documents"' -- next.config.ts`: empty.
4. **Next never attaches a long-lived Cache-Control on this path.** Confirmed by direct read
   of `app-render.js` at the cited line numbers: only `res.statusCode` and `location` are
   set, no `Cache-Control` header.
5. **Force-dynamic, confirmed live — I reproduced this independently.** `curl -sSI
   https://tenantflow.app/documents` (production still runs the pre-65 code; this branch is
   unmerged) returned, in this verification pass: `HTTP/2 307` to `/login?redirect=%2Fdocuments`
   with `cache-control: public, max-age=0, must-revalidate` — byte-for-byte the header the
   resolution reports. (This is the proxy's unauthenticated redirect, not the page's former
   308, as the resolution itself notes — it exercises the same `force-dynamic` layout,
   which is the relevant fact.)

**Verdict: the failure mode is closed, on narrower grounds than claimed.** Evidence line 1's
"never a real 308, always a meta-tag" claim is not something I can fully stand behind from
static analysis alone. But the practical risk WR-05 named — a cached redirect that keeps
bouncing users to `/documents/vault` forever — does not depend on that claim being true.
Whether the old page emitted a genuine 308 or a 200-with-meta-tag, evidence lines 2-5
establish that (a) `force-dynamic` governed every response this route ever served during
`permanentRedirect`'s entire life, (b) Next's redirect-handling code path never attaches its
own cache directive, and (c) the resulting `max-age=0, must-revalidate` header — independently
reproduced live just now — obligates every compliant cache to revalidate with the origin
before reuse, for either a 308 or a 200. That forecloses the "stuck redirect" risk regardless
of which code path fired. Closed.

#### 2. Visual check of the three-band ladder at desktop and 375px

**Resolution's claim:** measured (not eyeballed) — real components rendered to markup,
served against the real compiled stylesheet, measured with Playwright at 1280/900/375;
medallions 48/40/32px, Band 3 grid 4/2/1 columns, Empty 24px padding top+bottom at 1280.

**Independent cross-check against static source (no committed script/artifact exists to
re-run — the measurement was ephemeral, which is itself worth flagging as a reproducibility
gap, though not one that changes the verdict):**

- Medallion rungs: `page.tsx` VaultBand uses `size-12` (confirmed by direct read);
  `document-hub-tile.tsx` uses `size-10`/`size-8` for `isMedium` true/false (confirmed).
  Tailwind's default spacing scale (unmodified — `grep` of `globals.css`'s `@theme` block
  found no `--breakpoint-*` or spacing overrides) puts `size-12/10/8` at exactly 48/40/32px.
  Matches the reported measurement deterministically, independent of viewport.
- Band 3 grid: `page.tsx` PrintablesBand renders
  `className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"` (confirmed). Default Tailwind
  breakpoints (sm=640px, lg=1024px, unmodified per the same `@theme` check) resolve to 4
  columns at 1280px, 2 at 900px, 1 at 375px — matches the reported table exactly.
- Empty padding: `components/ui/empty.tsx`'s base classes are `p-6 ... md:p-12` (confirmed);
  `RecentEmpty` passes `className="py-6 md:py-6"`. Tailwind-merge resolves `py-*` as
  conflicting with the y-component of `p-*` at each modifier tier independently, so the
  explicit `md:py-6` overrides `md:p-12`'s y-contribution specifically, leaving computed
  padding-top/bottom at 24px at md+ (1280px is well above the 768px `md` default) while
  padding-left/right stays governed by `md:p-12` (48px, unaffected). This matches the
  reported "24px top and bottom at 1280" and independently explains why `py-6` alone
  (without the `md:` companion) would NOT have compacted it, which is exactly what L-07
  warned and what the fix commit (`120f81b68`'s antecedent list) added.
- The six "confirmed in a real browser" specificity fixes (list indent, `mt-0`/`my-0`, `li`
  margin, row gap, meta-line margin, printables description-to-grid gap) all correspond
  1:1 to commits `71acec57f`, `120f81b68`, `99de582f9`, `e99dca332` — each commit message
  independently documents the exact same CSS-specificity mechanism (unscoped `@layer base`
  rules losing to/beating `:where()`-wrapped Tailwind v4 space utilities) that the
  measurement's resolution narrative describes. The two accounts are consistent with each
  other and with the source, not merely restating one another.

**Verdict: closed.** Every specific numeric claim in the measurement is independently
derivable from the current compiled-CSS-affecting source and matches exactly; the underlying
mechanism (Tailwind v4 `:where()` specificity zero for `space-y-*`/`gap` utilities vs. plain
utility classes) was independently re-derived by reading the six fix commits' own diffs and
messages, not merely trusted from the resolution's prose. The one caveat: no committed
Playwright script exists to literally re-run the measurement — it was ephemeral. That is a
process gap (repeatability), not a substance gap; the numbers it reported are the numbers the
current source deterministically produces.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(owner)/documents/documents-hub-entries.ts` | 6 entries / 3 bands, `DOCUMENTS_VAULT_ENTRY` exported, no barrel re-export | VERIFIED | Re-read at HEAD: unchanged in structure since first pass. |
| `src/app/(owner)/documents/document-hub-tile.tsx` | Whole-card `<Link>` tile, 2 size rungs, no client directive | VERIFIED | Re-read at HEAD: gained `no-underline` (`68a679279`) and `mb-0` (`e99dca332`) fixes; still no client directive, no hooks. |
| `src/app/(owner)/documents/page.tsx` | RSC landing shell, 3 bands, single primary CTA, D-06 supersession recorded | VERIFIED | Re-read at HEAD: gained `no-underline` on the CTA link and `mb-0` on the Band 3 description; supersession doc block intact. |
| `src/app/(owner)/documents/recent-documents-panel.tsx` | Single client island, 4-state, shared cache entry | VERIFIED | Re-read at HEAD: substantially expanded (145→383 lines) with CSS-specificity fixes and the owner-category-label read, but still one `useQuery` for documents, still 4-state on `isPending`/`isError`/empty/list. |
| `src/app/(owner)/documents/__tests__/documents-hub.test.ts` | Composition/purity/SC-2 pins | VERIFIED | Re-run: passes, now also covers the anchor-underline source-scan. |
| `src/components/documents/documents-section.tsx` | D-11 additional invalidation | VERIFIED | Unmodified since original phase commits; unchanged evidence. |
| `src/components/shell/main-nav.tsx` | Flat Documents entry, no Templates section | VERIFIED | Unmodified since `e29128270`; re-confirmed by direct read. |
| `src/components/shell/app-shell.tsx` | Cmd+K Documents row repointed, Templates kept w/ rationale | VERIFIED | Unmodified since `e29128270`; re-confirmed by direct read. |
| `src/lib/breadcrumbs.ts` | 5 new LABEL_MAP entries, `templates` omitted, `NON_ROUTABLE_SEGMENTS` guard | VERIFIED | Re-read at HEAD: gained the `Object.hasOwn` guard (`46a0d176b`, UF-01 fix) on top of the state verified in the first pass. |

### Key Link Verification

All 8 links from the prior report re-checked at HEAD by direct read; all remain WIRED. No
new links introduced except `RecentDocumentsPanel` → `useDocumentCategories()` →
`documentCategoryQueries.list()`, confirmed WIRED and confirmed to share the vault's existing
category-query cache entry (not a new/second data source for SC-3 purposes, which is scoped
to document rows).

### Anti-Patterns Found

None. Re-scanned all 16 phase-modified files at HEAD (the original 8 plus
`documents-vault.client.tsx`, `documents-section.test.tsx`, `documents-vault.test.tsx`, and
the four test files touched by the fix cycles) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/
`PLACEHOLDER` and "coming soon"/"not yet implemented" phrasing — zero hits. Confirmed the
gate files (`proxy.ts`, `src/lib/routes/`, `next.config.ts`, `vercel.json`, `package.json`,
`bun.lock`) are still untouched across the full `90526195a..HEAD` diff.

### Behavioral Spot-Checks (re-run fresh in this pass, not reused from the prior report)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `/documents` and its 5 siblings are real routes in the production build manifest | `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile` then grep manifest | All 6 destinations listed as `ƒ` (dynamic) routes, no redirect | PASS |
| Typecheck across all 3 tsconfigs | `bun run typecheck` | exit 0, no output | PASS |
| Lint across all touched dirs | `bunx biome check "src/app/(owner)/documents" src/components/shell src/lib/breadcrumbs.ts src/components/documents` | "Checked 50 files in 15ms. No fixes applied." | PASS |
| Phase-scoped unit suites | `bun run test:unit -- documents-hub.test.ts recent-documents-panel.test.tsx main-nav.test.tsx app-shell-nav.test.tsx app-shell.test.tsx breadcrumbs.test.ts src/components/documents` | 10 files, 231 tests, all passed | PASS |
| Full unit suite + coverage (repo-wide gate) | `bun run test:unit -- --coverage` | 310 files / 106,435 tests passed | PASS |
| Working tree clean after build | `git checkout -- next-env.d.ts; git status --short` | Only pre-existing untracked `.agents/`, `.github/instructions/`, `skills-lock.json` remain | PASS |
| Live Cache-Control header on the pre-65 code path | `curl -sSI https://tenantflow.app/documents` | `307` to `/login`, `cache-control: public, max-age=0, must-revalidate` | PASS — corroborates WR-05 closure |

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes exist for this phase and none are declared in the
PLAN/SUMMARY files. Step 7c: SKIPPED (no probes declared or discovered).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DOCS-01 | 65-01, 65-02, 65-03 (all three declare it) | `/documents` renders a real landing page (vault + lease template builder + printable templates entry points) instead of a bare redirect | SATISFIED | All 3 roadmap Success Criteria verified TRUE (Truths 1-3). `REQUIREMENTS.md` line 189 still shows DOCS-01 as "Pending" — consistent with this repo's established pattern (RPTHUB-01..04 precedent) of marking requirements Complete only after production/live verification, not at phase-completion. Not a gap. |

No orphaned requirements: `grep -n "Phase 65" REQUIREMENTS.md` shows only DOCS-01 mapped to
this phase, and all 3 plans declare it (re-confirmed this pass).

### Security (carried forward from 65-SECURITY.md, independently spot-checked)

`65-SECURITY.md` reports 15/15 threats CLOSED at commit `3412b3095`, with one item (UF-01,
the `breadcrumbs.ts` prototype-chain hazard) explicitly flagged unfixed at audit time. I
directly confirmed UF-01 was fixed one commit later (`46a0d176b`, same day) with the
`Object.hasOwn` guard now present in `breadcrumbs.ts` at HEAD. The two remaining accepted
risks (AR-01 signed-URL persistence surface, WR-03/WR-04 nav-table duplication) are
deliberate owner-decision deferrals, not phase-65 blockers, and do not affect any of the
three roadmap Success Criteria — same disposition as the prior verification pass.

### Gaps Summary

None. All three roadmap Success Criteria and all eleven plan-level must-have truths were
re-verified against current source at HEAD (`555f9e601`), not carried forward from the
earlier report or accepted from SUMMARY/UAT prose. Eleven commits landed between the two
verification passes — eight perfect-PR fix cycles (all CSS-specificity leaks from unscoped
`@layer base` rules, plus one data-source correction that made category labels agree with the
vault's own decision), one security-audit fix (UF-01, closed same day), and two UAT-closure
commits. Nothing regressed: the full 310-file / 106,435-test suite passes, typecheck and lint
are clean, the production build manifest lists all 6 destinations as real routes, and the
gate files (proxy, route tables, next.config, vercel.json, lockfile) remain untouched across
the entire phase diff.

Both previously-outstanding human-verification items are discharged. WR-05 (cache-stickiness)
is closed on narrower grounds than its own resolution claims — I could not independently
confirm the "meta-tag, never a real 308" sub-claim from static analysis — but the practical
risk it was written to catch is foreclosed regardless, by evidence I independently reproduced
live in this pass (`curl` against the still-pre-65 production route returns
`max-age=0, must-revalidate`, and that header derives from a `force-dynamic` layout setting
that predates `permanentRedirect`'s introduction by two months, so no window ever existed
where the route was both a 308 and genuinely cacheable). The visual-breakpoint item is closed
by measurement whose every specific numeric claim I independently re-derived from current
Tailwind-affecting source and found to match exactly; the one gap is process, not substance —
no script was committed to make the measurement re-runnable.

Status is `passed`: 11/11 must-haves verified, zero gaps, zero pending human-verification
items, no regressions found across the eleven-commit window.

---

_Verified: 2026-08-03T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification of: 2026-08-03T18:00:00Z pass (status was human_needed, 11/11 must-haves, 2 pending human items)_
