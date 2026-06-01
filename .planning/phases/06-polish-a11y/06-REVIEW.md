---
phase: 06-polish-a11y
reviewed: 2026-06-01T00:00:00Z
depth: deep
cycle: 2
files_reviewed: 14
files_reviewed_list:
  - .github/workflows/ci-cd.yml
  - package.json
  - src/app/(owner)/dashboard/__tests__/dashboard-page-branch.test.tsx
  - src/app/globals.css
  - src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx
  - src/components/dashboard/components/kpi-bento-row.tsx
  - src/components/dashboard/components/lease-status-badge.tsx
  - src/components/dashboard/components/portfolio-columns.tsx
  - src/components/dashboard/components/portfolio-grid.tsx
  - src/components/dashboard/expiring-leases-widget.tsx
  - src/components/ui/__tests__/number-ticker.test.tsx
  - src/components/ui/number-ticker.tsx
  - src/components/ui/stat.tsx
  - tests/e2e/playwright.config.ts
  - tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 6: Code Review Report (Cycle 2)

**Reviewed:** 2026-06-01
**Depth:** deep
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Cycle-2 of the perfect-PR gate: verify the two cycle-1 blockers + four warnings + two info items are genuinely resolved, and hunt for regressions the fix pass introduced.

**Both cycle-1 blockers are genuinely fixed.** CR-01 (CI a11y spec could not run) is resolved by a dedicated, dependency-free `owner-axe` Playwright project that self-authenticates via `loginAsOwner` (localStorage injection), with CI repointed to `--project=owner-axe` and the spec excluded from the broken storageState `owner`/`firefox` projects. CR-02 (light-mode contrast regression) is resolved by theme-aware `--color-{success,warning,destructive}-text` tokens; I independently re-derived the WCAG contrast (oklch → linear sRGB → relative luminance) and confirm every status-text usage clears AA 4.5:1 against BOTH the card surface AND the 10% badge tint, in BOTH themes — the worst case is `success-text` on the success tint in light mode at **4.73:1** (above the 4.5:1 floor). The four warnings and two info items are addressed or carry a defensible deferral.

The fix pass did NOT ship a new blocker. The full zero-tolerance scan (no `any`, no `as unknown as` in source, no `bg-white`, no bare `text-muted`, no emojis, no un-exempted inline styles) is clean on every changed file; biome passes; the 25 unit tests across the three touched test files pass.

Three NEW findings, all minor: a latent dead `setup-owner` → `owner` storageState path left in `playwright.config.ts` (no longer on any executed path, but a maintenance trap — WR-05); a reliance on `!important` cascade rather than tailwind-merge deduplication for the down-trend color override, which works but ships two competing `text-[…]` classes (WR-06); and a missing unit test pinning the `LeaseStatusBadge` chip-class mapping now that the badge gained `border` (IN-03).

---

## Cycle-1 Resolution Verification

| Cycle-1 ID | Severity | Status | Evidence |
|---|---|---|---|
| CR-01 | Blocker | **RESOLVED** | CI line 162 runs `--project=owner-axe`. `owner-axe` (config 157-163) has NO `storageState` and NO `dependencies` — it cannot trigger the dead `setup-owner` project. Spec authenticates in-test via `loginAsOwner` (localStorage injection, the `@supabase/ssr`-correct path). Spec excluded from `owner` (148) + `firefox` (215) via `testIgnore`. No stale `--project=owner` refs remain in `.github/`. |
| CR-02 | Blocker | **RESOLVED** | New `--color-success-text / -warning-text / -destructive-text` in `:root` (globals.css 180-182) + `.dark` (648-650). Re-verified contrast independently: text-on-card light 5.41 / 5.51 / 6.52; dark 11.07 / 11.74 / 6.93. Text-on-10%-tint light 4.73 / 5.08 / 5.35; dark 9.84 / 10.41 / 6.64. All ≥ 4.5:1. `status-*` utilities + `StatTrend` + expiring-leases + portfolio cells + kpi down-trend override all repointed at `-text` tokens. No raw fill-token-as-text remains in the dashboard subtree. |
| WR-01 | Warning | **RESOLVED** | `LeaseStatusBadge` className now includes `border` (lease-status-badge.tsx:27), so the `status-*` `border-color` renders. |
| WR-02 | Warning | **DEFERRED (accepted)** | `statIndicatorVariants` color variants (stat.tsx:48-52) intentionally left on raw palette with `dark:` contrast variants; not rendered on the dashboard sweep; Phase-7 deferral. Diff confirms no NEW raw-palette was added. Justification holds. |
| WR-03 | Warning | **RESOLVED** | Heading wait pinned to `{ level: 1, name: "Dashboard", exact: true }` (dashboard-a11y.e2e.spec.ts:50). Confirmed the real `<h1>` is exactly `Dashboard` (dashboard.tsx:140). |
| WR-04 | Warning | **DEFERRED (accepted)** | Full-page axe sweep retained per locked decision D-03. Documented in the spec header. |
| IN-01 | Info | **DEFERRED (accepted)** | expiring-leases PostgREST mapper untyped-boundary noted as out-of-scope, next-touch deferral. |
| IN-02 | Info | **RESOLVED** | number-ticker test now spies on `requestAnimationFrame` and asserts `not.toHaveBeenCalled()` (number-ticker.test.tsx:92,99). Traced the render: on first render `reducedMotion=false`/`hasIntersected=false` → early-return before rAF; after effects commit `reducedMotion=true` → snap, no rAF. The assertion is genuinely meaningful, not a false pass. |

---

## Critical Issues

None. Both cycle-1 blockers are genuinely resolved and the fix pass introduced no new blocker.

## Warnings

### WR-05: Dead `setup-owner` → `owner` storageState path left latent in `playwright.config.ts` — a maintenance trap the next E2E author will trip on

**File:** `tests/e2e/playwright.config.ts:130-149` (also `chromium` 174, `firefox` 212, `mobile-chrome` 227)

**Issue:** The CR-01 fix correctly routed CI around the broken auth setup by adding the dependency-free `owner-axe` project, but it left the broken machinery in place. The `setup-owner` project still declares `testMatch: /auth-api\.setup\.ts/` (line 132) pointing at a file deleted two commits back — `find tests/e2e -name "*.setup.ts"` returns nothing, so this regex matches zero files and produces no `owner.json` storageState. Five projects still wire `dependencies: ["setup-owner"]` + `storageState: OWNER_AUTH_FILE` (`owner`, `chromium`, `firefox`, `mobile-chrome`, and the `setup-owner` self). This is correctly OFF the executed path today (CI runs only `smoke`/`public`/`owner-axe`), so it is not a blocker. But it is a live landmine: the moment anyone runs `--project=owner` (or `firefox`/`mobile-chrome`) locally or adds it to CI, all 12+ owner specs fail at the gate for a reason unrelated to their change, exactly as in cycle-1 CR-01. The config now contains two parallel auth strategies (dead storageState vs. live in-test `loginAsOwner`) with no comment on `setup-owner` marking it dead.

**Fix:** Either delete the dead path entirely, or convert the storageState projects to the proven in-test pattern. Minimal safe option — delete `setup-owner` and drop the `dependencies`/`storageState` from `owner`/`chromium`/`firefox`/`mobile-chrome`, letting those specs authenticate via their own `beforeAll`/`loginAsOwner` (the pattern `owner-axe` already proves). If a future reviewer prefers to keep storageState, restore the setup file and fix the regex to match its real name. At minimum, annotate `setup-owner` as KNOWN-BROKEN so the next author does not re-enable `--project=owner` expecting it to work:
```ts
// setup-owner: DEAD — testMatch points at auth-api.setup.ts (deleted in c446cfedc).
// owner/chromium/firefox/mobile-chrome still depend on this and will fail until
// migrated to in-test loginAsOwner (see owner-axe). Do NOT run --project=owner.
```

### WR-06: Down-trend color override relies on `!important` cascade, not tailwind-merge dedup — two competing `text-[…]` classes ship on the same element

**File:** `src/components/dashboard/components/kpi-bento-row.tsx:286-289`, `src/components/ui/stat.tsx:108-109`

**Issue:** For the open-maintenance tile, `StatTrend` is rendered with `trend="down"`, which the base `StatTrend` maps to `text-[var(--color-destructive-text)]` (stat.tsx:109). The kpi-bento override then layers `!text-[var(--color-warning-text)] dark:!text-[var(--color-warning-text)]` to recolor "fewer requests" as amber-good rather than red-bad. I verified via the project's `tailwind-merge` that these two arbitrary-value color classes are NOT deduplicated — `twMerge` emits BOTH (`text-[var(--color-destructive-text)] !text-[var(--color-warning-text)] …`). The override wins ONLY because of the `!important` flag overriding the cascade, not because the base class was stripped. This renders the correct color today and both colors are AA-safe (destructive-text 6.52:1, warning-text 5.51:1 on card), so it is not a contrast or correctness defect — it is a fragility/clarity smell: the element carries a contradictory declaration, and the kpi-bento test (line 281) only asserts the override class is PRESENT, not that the base is absent or that the override wins. A future refactor that drops the `!` (e.g., to satisfy a lint rule against `!important`) would silently flip the color back to destructive-red with no failing test.

**Fix:** Move the semantic decision into `StatTrend` so a single source picks the color, eliminating the competing class. E.g., pass an explicit intent and let `stat.tsx` choose one token:
```tsx
// stat.tsx — accept an optional override so only one text-[…] class is emitted
function StatTrend({ trend, tone, ... }: ... & { tone?: "good" | "bad" | "neutral" }) {
  // resolve a single color token from (tone ?? trend) — never emit two
}
```
or, if keeping the call-site override, add a test asserting the rendered `color` (e.g., via `getComputedStyle` in a jsdom-with-CSS harness, or assert the base class is absent) so the `!important` dependency is pinned. Lower-effort acceptable alternative: a code comment at kpi-bento-row.tsx:287 documenting that the override depends on `!important` order and must not be de-`!`-ed.

## Info

### IN-03: `LeaseStatusBadge` has no unit test pinning the status → chip-class mapping after gaining `border`

**File:** `src/components/dashboard/components/lease-status-badge.tsx` (no sibling `__tests__`)

**Issue:** WR-01's fix added `border` so the `status-*` `border-color` renders, and the badge is the shared single-source-of-truth for the pill in both the portfolio table cell (portfolio-columns.tsx:151) and the grid card (portfolio-grid.tsx:22). There is no test asserting `active → status-active`, `expiring → status-pending`, `vacant → status-inactive`, nor that `border` is present. The kpi-bento and dashboard-branch tests do not render this component; the contrast guarantee for the pill rides entirely on the (correct) globals.css tokens plus the e2e axe sweep — but the axe sweep only runs the three lease statuses that happen to be present in the seeded e2e data, and a future status-label/className typo (e.g. `expiring → status-overdue`) would not be caught by any unit test. This is a test-coverage gap, not a behavior defect.

**Fix:** Add a small render test pinning the mapping and the border:
```tsx
it.each([
  ["active", "status-active"],
  ["expiring", "status-pending"],
  ["vacant", "status-inactive"],
])("maps %s to %s and includes border", (status, chip) => {
  render(<LeaseStatusBadge status={status as PortfolioRow["leaseStatus"]} />);
  const el = screen.getByText(/Active|Expiring|Vacant/);
  expect(el.className).toContain(chip);
  expect(el.className).toContain("border");
});
```

---

_Reviewed: 2026-06-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 2_
