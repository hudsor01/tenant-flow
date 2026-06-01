---
phase: 06-polish-a11y
reviewed: 2026-06-01T00:00:00Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - .github/workflows/ci-cd.yml
  - package.json
  - src/app/(owner)/dashboard/__tests__/dashboard-page-branch.test.tsx
  - src/components/dashboard/components/lease-status-badge.tsx
  - src/components/dashboard/components/portfolio-columns.tsx
  - src/components/dashboard/components/portfolio-grid.tsx
  - src/components/dashboard/expiring-leases-widget.tsx
  - src/components/ui/__tests__/number-ticker.test.tsx
  - src/components/ui/number-ticker.tsx
  - src/components/ui/stat.tsx
  - tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-01
**Depth:** deep
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 6 has four moving parts: (1) a raw-Tailwind-palette → `status-*` / `--color-*` token migration on the dashboard subtree, sold as a dark-mode-contrast fix; (2) a JS `prefers-reduced-motion` guard on `NumberTicker`; (3) an `@axe-core/playwright` install plus `--project=owner` wired into the CI E2E step; (4) a new authed axe E2E spec and a dashboard branch-exclusivity unit test.

The `NumberTicker` reduced-motion guard, the branch-exclusivity unit test, and the `@axe-core/playwright` dependency pin are all correct and well-built. The zero-tolerance scan (no `any`, no `bg-white`, no bare `text-muted`, no inline styles, no emojis) is clean on every in-scope file.

Two blockers undercut the phase's two headline goals, however. **First, the token migration is a light-mode contrast *regression*, not a fix.** `--color-warning` (2.24:1) and `--color-success` (2.70:1) are fill/background tokens; used as foreground text on the light-mode card surface (the app defaults to `light`) they fail WCAG AA 4.5:1 — where the old `amber-700` / `green-600` classes passed at ~5:1. **Second, the new a11y E2E that should have caught this cannot run.** Wiring `--project=owner` into CI activates the `owner` Playwright project, which `dependencies: ["setup-owner"]`, whose `testMatch: /auth-api\.setup\.ts/` points at a file deleted two commits back. Zero setup files match, no `owner.json` storageState is produced, and all 13 owner specs (the 1 new + 12 pre-existing, none of which ran in CI before) fail at the gate. The contrast bug ships behind a green check that is actually red.

## Critical Issues

### CR-01: CI `--project=owner` depends on a setup project that matches no file — owner E2E (incl. the new a11y spec) cannot run

**File:** `.github/workflows/ci-cd.yml:162`, `tests/e2e/playwright.config.ts:132`

**Issue:** The diff adds `--project=owner` to the `Run E2E smoke tests` step. The `owner` project (`playwright.config.ts:140-147`) declares `dependencies: ["setup-owner"]`. The `setup-owner` project (`playwright.config.ts:131-134`) has `testMatch: /auth-api\.setup\.ts/`. That file no longer exists:

- `c446cfedc` deleted `tests/e2e/tests/auth-api.setup.ts` and added `auth-ui.setup.ts`.
- `e760cd1aa` then deleted `auth-ui.setup.ts` ("use beforeAll + serial pattern instead of storageState") and "restored playwright.config.ts to main" — re-introducing the stale `/auth-api\.setup\.ts/` regex.

Verified at HEAD: `find tests/e2e -name "*.setup.ts"` returns nothing; the regex matches `0` files. `owner.json` is gitignored, so in a fresh CI checkout `OWNER_AUTH_FILE` does not exist and nothing creates it. The `owner` project will error (missing storageState) or run unauthenticated and land on `/login`. Either way every owner spec fails. This is a green-check-over-red-reality failure: the phase's stated goal ("Plan 01 wired `--project=owner` into CI so the a11y spec executes on every PR") does not hold.

Compounding blast radius: `owner` matches `**/owner/**/*.spec.ts` = **13 spec files**, only 1 of which is new. The other 12 (owner-properties, owner-leases, owner-financials, owner-tenants, owner-maintenance, owner-navigation, owner-settings, owner-authentication, owner-dashboard, reports-gate, esign-gate, cancellation) have **never run in CI** (CI previously ran only `--project=smoke --project=public`). This change silently gates every PR on a 13-spec authed suite with no working auth setup.

**Fix:** Restore a setup file the `setup-owner` regex matches, and point CI at it. Either re-add the auth setup and fix the regex to match its real name:
```ts
// playwright.config.ts — setup-owner project
testMatch: /auth-ui\.setup\.ts/,   // and re-add tests/e2e/tests/auth-ui.setup.ts
```
or, if the current owner specs authenticate via their own `beforeAll`/serial pattern (per `e760cd1aa`) and do not consume `owner.json`, drop the dead `setup-owner` project and the `dependencies`/`storageState` wiring, then confirm the new `dashboard-a11y.e2e.spec.ts` (which assumes `storageState = owner.json`, file header line 9) actually authenticates. Before merging, run `bunx playwright test --config tests/e2e/playwright.config.ts --project=owner` locally against the CI build path and confirm the dashboard heading resolves authenticated — do not rely on the gate, which is currently incapable of failing for the right reason.

### CR-02: Token migration introduces a WCAG AA light-mode contrast failure (regression from the classes it replaced)

**File:** `src/components/dashboard/components/lease-status-badge.tsx:13-15`, `src/components/dashboard/expiring-leases-widget.tsx:86,109,157`, `src/components/ui/stat.tsx:108`

**Issue:** The migration swaps text-tuned palette classes for fill-tuned design tokens used as **foreground text**. The app defaults to light mode (`DEFAULT_THEME_MODE = "light"` in `src/lib/theme-utils.ts:20`), so the light-mode surface is what most users see. Measured contrast of each token as text on the light card surface (`#fff`-equivalent; the badge background is only a 10% token tint, so the card shows through):

| Token (as text) | New contrast | Old class | Old contrast | AA 4.5:1 |
|---|---|---|---|---|
| `--color-warning` `oklch(0.75 0.18 85)` | **2.24:1** | `amber-700` | 5.02:1 | new FAILS |
| `--color-success` `oklch(0.66 0.2 160)` | **2.70:1** | `green-600` | ~4.5:1 | new FAILS |
| `--color-destructive` `oklch(0.577 0.245 25)` | 4.75:1 | `red-600` | ~5:1 | passes (barely) |

Affected, all rendered on the audited dashboard subtree:
- `LeaseStatusBadge` `status-pending` (warning text, `text-xs`) and `status-active` (success text) — `lease-status-badge.tsx:13-14`, rendered in both the portfolio table cell (`portfolio-columns.tsx:151`) and grid card (`portfolio-grid.tsx:22`).
- `ExpiringLeasesWidget` Clock icon (`text-[var(--color-warning)]`, lines 86/109) and the non-urgent "N days" chip (`text-[var(--color-warning)]`, `text-xs font-semibold`, line 157) — was `text-amber-700 dark:text-amber-400`.
- `StatTrend` `trend === "up"` → `text-[var(--color-success)]` (`stat.tsx:108`), rendered by `kpi-bento-row.tsx:284` on the dashboard.

This is the inverse of the migration's stated purpose: it claims to fix dark-mode contrast but instead breaks light-mode contrast that previously passed. (Dark mode also dropped — warning went 9.90:1 → 6.56:1 — but stays above AA.) The warning token at 2.24:1 fails even the 3:1 large-text floor. This is exactly the violation the new axe spec asserts against (`color-contrast` is a WCAG 2.1 AA rule), and it would fail that spec — except CR-01 means the spec never runs.

**Fix:** Do not use `--color-warning` / `--color-success` (fill tokens) as foreground text on light surfaces. Introduce/usable text-grade tokens, or keep the `status-*` utilities for the chip *fill* (they set `background-color` + `border-color`) and let the chip text use a contrast-safe color. For the bare text usages (`StatTrend` up, expiring-leases "N days", Clock icon), use a darker on-surface token, e.g. a `--color-success-text` / `--color-warning-text` pegged below `oklch(~0.55 L)`:
```css
/* globals.css — text-grade variants meeting 4.5:1 on light surfaces */
--color-success-text: oklch(0.52 0.16 160);   /* verify ≥4.5:1 vs --color-card */
--color-warning-text: oklch(0.50 0.13 70);     /* verify ≥4.5:1 vs --color-card */
```
```tsx
// stat.tsx
"text-[var(--color-success-text)]": trend === "up",
```
Re-derive every value against the actual `--color-card` in both `:root` and `.dark` and re-run the axe sweep (after CR-01 is fixed) to confirm zero `color-contrast` violations.

## Warnings

### WR-01: `status-*` chip utilities set `border-color` but the badge has no border width — half the visual spec is inert

**File:** `src/components/dashboard/components/lease-status-badge.tsx:25-32`

**Issue:** `status-active` / `status-pending` / `status-inactive` (globals.css:661-677) each set `color`, `background-color`, AND `border-color`. The badge span applies only `inline-flex items-center rounded px-2 py-0.5 font-medium text-xs` plus the chip class — there is no `border` width utility, so `border-color` paints nothing. The old chip classes (`bg-emerald-100 text-emerald-700 …`) had no border either, so this is not a regression, but the migration silently dropped a third of each token's intended treatment, and the inert `border-color` is dead style. If the bordered look is intended (it is, for `status-inactive` which leans on the border to separate from `bg-muted`), the badge needs `border`.

**Fix:** Add a border width so the token's `border-color` is honored:
```tsx
className={cn(
  "inline-flex items-center rounded border px-2 py-0.5 font-medium text-xs",
  CHIP[status],
)}
```
Re-check contrast after adding the border (CR-02) since the border changes the chip's effective edge.

### WR-02: `stat.tsx` color variants left on raw palette — migration is half-applied within the same file it edited

**File:** `src/components/ui/stat.tsx:48-52`

**Issue:** The diff migrated `StatTrend` (lines 108-109) to `--color-*` tokens but left `statIndicatorVariants` `color.success` / `color.info` / `color.warning` on raw `green-500` / `blue-500` / `orange-500` palette (lines 48-52, unchanged). Same file, same migration, inconsistent application. These variants are not currently rendered on the dashboard subtree (`grep` for `color="success"|"info"|"warning"` in the dashboard tree returns nothing), so they are not an active contrast bug on the audited surface — but they are exactly the kind of raw-palette dark-mode-contrast liability the phase set out to eliminate, sitting in the file the phase touched.

**Fix:** Migrate the indicator `color` variants to the same token system in this pass (or explicitly scope them out with a note). Verify any chosen token meets contrast as *fill* (background tint), which is the indicator's usage, distinct from CR-02's text usage.

### WR-03: `dashboard-a11y` spec waits on `getByRole("heading", { name: /dashboard/i })` — non-unique and order-fragile

**File:** `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts:41`

**Issue:** `gotoAuthedDashboard` gates readiness on `getByRole("heading", { name: /dashboard/i })`. `/dashboard/i` is a loose substring match; any heading containing "dashboard" (a section sub-heading, a card title, a nav label promoted to a heading) satisfies it, so the wait can resolve before the page is actually past the loading skeleton — defeating the comment's stated intent ("confirm the client-fetched content has resolved past the loading skeleton"). The real `<h1>` is the exact string `Dashboard` (`dashboard.tsx:140`). A loose match that resolves early lets axe sweep a partially-rendered tree, producing either false passes or flaky violations.

**Fix:** Pin the heading exactly and to level 1:
```ts
await expect(
  page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }),
).toBeVisible({ timeout: 10000 });
```

### WR-04: a11y axe spec asserts the *entire page* including app-shell chrome — broad, undeterministic surface with no exclusions

**File:** `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts:55-60`

**Issue:** The sweep runs `new AxeBuilder({ page }).withTags(WCAG_2_1_AA_TAGS).analyze()` over the whole document (the comment explicitly says "none are excluded here"). That is a defensible policy, but it means any pre-existing violation anywhere in the app-shell (sidebar, top-bar, footer, toasts, onboarding remnants) hard-fails this dashboard-scoped spec, and third-party widget DOM (analytics, speed-insights) can introduce nondeterministic nodes. With CR-01 unresolved this never executes, but once it does, an unscoped full-page assertion on a shared shell is a flake/maintenance magnet that will block PRs for issues unrelated to the dashboard work.

**Fix:** Either scope the sweep to the dashboard main region (`.include('main')` / a dashboard root testid) for the dashboard-owned assertion, or keep the full-page sweep but first prove the app-shell is already axe-clean in a separate, shell-owned spec so a failure here unambiguously points at dashboard code. Document which violations, if any, are knowingly accepted via `.disableRules([...])` rather than leaving an implicit "must be globally perfect" contract.

## Info

### IN-01: `expiring-leases-widget` PostgREST nested-join mapper accesses to-one relations as objects without a typed boundary mapper

**File:** `src/components/dashboard/expiring-leases-widget.tsx:60-67`

**Issue:** Out of scope for this phase's diff (only the icon/text colors changed here), noted for the record. The mapper reads `row.tenants?.name`, `row.units?.unit_number`, `row.units?.properties?.name` — treating embedded FK joins as objects. PostgREST returns to-one embeds as objects and to-many as arrays; the access assumes to-one for all three. The callback param `row` is implicitly typed off the PostgREST builder rather than run through a `mapXRow(raw: Record<string, unknown>)` validator as CLAUDE.md mandates at RPC/PostgREST boundaries. No `as unknown as` is present (good), but the shape is unvalidated. If a future schema change makes any embed to-many, `.name` silently becomes `undefined`.

**Fix:** When this file is next touched for logic, route the rows through a typed mapper (`mapExpiringLeaseRow`) per the `mapDocumentRow` reference pattern, validating the embed shape.

### IN-02: Reduced-motion `NumberTicker` snap and the matchMedia test rely on effect-commit timing — pin the no-rAF behavior more explicitly

**File:** `src/components/ui/number-ticker.tsx:48-53`, `src/components/ui/__tests__/number-ticker.test.tsx:77-100`

**Issue:** Logic is correct: `useReducedMotion()` returns `false` on first render then `true` after its effect commits, so the ticker first renders `startValue` then snaps to `to` on the second render — the test asserts `42` with no timer advance and passes because RTL's `render` flushes effects under `act`. This is sound but implicit: the test proves the *final* value, not that the rAF loop was never scheduled. A future change that schedules an rAF before checking `reducedMotion` would still pass this test (the snap would just overwrite). Consider spying on `requestAnimationFrame` and asserting it was not called in the reduced-motion path, to lock the "no animation scheduled" contract the comment claims.

**Fix:** Optional hardening:
```ts
const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame");
render(<NumberTicker value={42} duration={2000} />);
expect(screen.getByText("42")).toBeInTheDocument();
expect(rafSpy).not.toHaveBeenCalled();
```

---

_Reviewed: 2026-06-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
