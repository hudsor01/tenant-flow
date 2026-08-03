---
phase: 65
slug: documents-landing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-02
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `65-RESEARCH.md` §"Validation Architecture". Where this file and the research
> disagree, this file governs — it applies the L-02 resolution (flat nav) that post-dates the
> research's test map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.6 + jsdom, `unit` project |
| **Config file** | `vitest.config.ts` (projects: `unit`, component, integration) |
| **Include pattern** | `src/**/*.{test,spec}.{ts,tsx}` — **tests MUST live under `src/`** |
| **Quick run command** | `bun run test:unit -- <path>` |
| **Full suite command** | `bun run test:unit` |
| **Type gate** | `bun run typecheck` (3 tsconfigs) — authoritative over IDE diagnostics |
| **Estimated runtime** | ~2s for the touched subsets (measured: nav 41 tests / 1.12s, documents 89 tests / 2.29s) |

> **`--run` is already injected by the script.** Writing `bun run test:unit -- --run <file>`
> is a hard CAC duplicate-flag error. Three executors hit this in Phase 56; do not repeat it.

> **Never run `playwright test` locally.** `tests/e2e/playwright.config.ts`'s webServer command
> begins `rm -rf .next && rm -f .env.local` and will delete that file. `--list` is safe.

---

## Sampling Rate

- **After every task commit:** `bun run typecheck && bun run test:unit -- <touched test files>` — under 5s
- **After every plan wave:** `bun run validate:quick` (typecheck + biome + full unit suite)
- **Before `/gsd:verify-work`:** full unit suite green + `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile` green
- **Max feedback latency:** 5 seconds per task, ~40s per wave

> **A full `bun run build` fails on a PRE-EXISTING `/blog/[slug]` env issue** in any working
> copy without app vars. Use the compile-only form above for build artifacts, then
> `git checkout -- next-env.d.ts` since builds rewrite it.

---

## Per-Task Verification Map

Task IDs are assigned by the planner; the Requirement→Behavior rows below are the contract
the planner must cover. Every row maps to DOCS-01 or one of the three ROADMAP success criteria.

| Requirement | Behavior to verify | Threat Ref | Test Type | Automated Command | File Exists |
|-------------|--------------------|------------|-----------|-------------------|-------------|
| DOCS-01 / SC-1 | The 6 hub entries exist, are correctly banded, and every `href` points at a real route | — | unit | `bun run test:unit -- "src/app/(owner)/documents/__tests__/documents-hub.test.ts"` | ❌ Wave 0 |
| DOCS-01 / SC-1 | `/documents/page.tsx` no longer calls `permanentRedirect`, is an RSC (no `"use client"`, no hooks, no db client) | — | unit (source-read guard) | same file — read from disk, mirroring `reports-hub-purity.test.ts` | ❌ Wave 0 |
| SC-2 | No redirect is added for `/documents/vault`; no marketing surface changed | — | unit (source-read guard) | assert no `/documents` entry enters `reporting-redirects.ts` | ❌ Wave 0 |
| SC-3 | The recent panel calls `documentSearchQueries.list` with **exactly** `{ page: 0 }` — the shared-cache-entry contract | T-65-02 | unit | `bun run test:unit -- "src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx"` — `vi.spyOn(documentSearchQueries, "list")` | ❌ Wave 0 |
| SC-3 | All four panel states render: loading → 5 Skeletons, empty → D-12 copy, error → inline + `Retry`, success → max 5 rows | — | unit | same file, mock `useQuery` per state | ❌ Wave 0 |
| D-03 | Recent rows contain **no** `<a>` and **no** `<button>` — preview, not a control surface | T-65-03 | unit | same file — `container.querySelectorAll("li a, li button")` length 0 | ❌ Wave 0 |
| D-08 / D-09 | **FLAT nav (L-02 resolved):** `Documents` renders as a `<Link>` with href `/documents`; collapsible sections stay exactly `["Analytics","Reports"]`; no `Templates` section header; `Documents` has no children | — | unit | `bun run test:unit -- src/components/shell/__tests__/main-nav.test.tsx` | ✅ EXISTS — **4** tests need edits (see the corrected blast radius below) |
| D-10 | Cmd+K `Documents` entry href is `/documents`, and the Cmd+K `Templates` group is handled consistently with the sidebar deletion | — | unit | `bun run test:unit -- src/components/shell/__tests__/app-shell-nav.test.tsx` | ✅ EXISTS — add explicit assertions |
| D-07 | The four hyphenated template slugs resolve to proper breadcrumb labels | — | unit | `bun run test:unit -- src/lib/__tests__/breadcrumbs.test.ts` | ✅ EXISTS — add cases |
| D-11 | Upload **and** delete invalidate `["documents","search"]` | T-65-01 | unit | `bun run test:unit -- "src/components/documents/__tests__/documents-section.test.tsx"` | ✅ EXISTS — add the case |
| D-12 | The empty-state body contains **no entity enumeration** (guards the defect that motivated the amendment) | — | unit | recent-documents-panel test — assert the body matches the D-12 string exactly | ❌ Wave 0 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(owner)/documents/__tests__/documents-hub.test.ts` — DOCS-01 / SC-1 / SC-2
      (entry-data pins + RSC purity guard + no-redirect guard)
- [ ] `src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx` — SC-3, D-03, D-12
- [ ] Existing-file edits, planned as deliberate work rather than incidental:
      `main-nav.test.tsx` (**4** tests — see the corrected blast radius below), `app-shell-nav.test.tsx` (+assertions),
      `breadcrumbs.test.ts` (+4 cases), `__tests__/documents-section.test.tsx` (+1 case)
- [ ] Framework install: **none needed**

> **Blast radius under FLAT nav — 4 tests in `main-nav.test.tsx`** (corrected 2026-08-02 by
> the planner; my earlier count of 3 was wrong):
> `:76` (asserts `href="/documents/vault"` → becomes `/documents`), `:210-213`
> ("should render Templates section header" → section deleted), `:224-235`
> ("should render Lease Template link" → **the link is deleted outright**), and `:357`
> ("onNavigate when a Templates link is clicked" → that link is gone).
>
> **Why I missed `:224-235`:** I grepped for `Templates` (plural — the section header) and
> the test names the item singular, `Lease Template`. One character. It matters because the
> two nav shapes differ on exactly this test: under parent+children the link would have
> SURVIVED as a child and the test would still pass; under flat it has no parent, so
> deleting `documentItems` removes it. The research's "6" was for the parent+children shape.
>
> **`main-nav.test.tsx:135-143` is a designed tripwire and needs NO edit.** It asserts
> `toEqual(["Analytics","Reports"])` with a comment stating it was written so "a third
> section reappearing under any name fails here." Parent+children would have made
> `Documents` a third collapsible section and broken it; flat does not. **Do not touch it,
> and never loosen it to `toContain`** — if a change appears to require that, the change is
> wrong.
>
> `app-shell-nav.test.tsx` does NOT break either: its `:103-118` check is an allowlist of
> live route ROOTS, and `/documents` is already on it. D-10 still requires ADDING an explicit
> assertion pinning the palette's `Documents` href to `/documents`, because a root allowlist
> would equally accept the old `/documents/vault`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The reversed 308 does not stick in browser caches | DOCS-01 | Requires a real authenticated session cookie; the unauthenticated path returns the proxy's 307, not the page's 308 | Pre-deploy: `curl -sSI` authenticated `/documents`, read `Cache-Control`. Post-deploy: hard-refresh from a browser that previously followed the 308 to `/documents/vault` |
| Rendered appearance of the three-band ladder at desktop and 375px | DOCS-01 / UI hint | No visual-regression or axe sweep is registered for `/documents` | Open `/documents` signed in; check band weighting, medallion rungs (`size-12` → `size-10` → `size-8`), and that Band 3 collapses cleanly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all ❌ references above
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s per task
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
