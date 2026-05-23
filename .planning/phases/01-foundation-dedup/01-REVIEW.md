---
phase: 1 — v2.0 Dashboard Command Center Foundation & Dedup
reviewed: 2026-05-23T20:30:00Z
cycle: 4
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-types.ts
  - src/components/dashboard/dashboard.tsx
  - src/components/dashboard/components/portfolio-grid.tsx
  - src/components/dashboard/components/portfolio-table.tsx
  - src/components/dashboard/components/revenue-overview-chart.tsx
  - src/hooks/api/use-dashboard-hooks.ts
  - src/hooks/api/use-owner-dashboard.ts
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
perfect_pr_gate: previous_gate_invalidated_by_code_change — restart counting at cycle 4
consecutive_zero_finding_cycles: 0
new_regressions: 2
---

# Phase 1: Code Review Report — Cycle 4

**Reviewed:** 2026-05-23T20:30:00Z
**Depth:** deep
**Cycle:** 4 (cycle-3 verdict was rejected by user; cycle-3 dismissed two items as "borderline / advisory" instead of flagging them. Fix commit `85a69c5fb` closed both dismissed items. This cycle is fresh adversarial second-eyes per directive "fix everything no matter severity, do not dismiss anything".)
**Files Reviewed:** 9
**Status:** issues_found
**Perfect-PR gate:** previously satisfied by cycles 2+3, INVALIDATED by code change in `85a69c5fb`. Counter resets. This cycle does not satisfy the gate.

## Summary

Two cycle-3-dismissed items are correctly closed in `85a69c5fb`:

1. `dashboard-data.ts:35` JSDoc — line range updated from `227-244` to `232-265`. **CLOSED.** The current fetcher mapping region spans rows 232-249 (mapper) plus 251-265 (final return-shape composition); "232-265" covers the full post-validation transform boundary as the JSDoc claims.
2. `portfolio-table.tsx` sort indicator — Unicode `↑`/`↓` replaced with `lucide-react` `ArrowUp`/`ArrowDown`, rendered via `<Icon className="ml-1 inline-block size-3" aria-label="..." />`. **CLOSED at the glyph-replacement layer.**

However, the cycle-3 fix introduced one ARIA semantics regression and exposed one pre-existing keyboard-a11y gap that cycle 3 should have flagged. Additionally, a relentless re-grep of the full 9-file surface — per directive "do not dismiss anything" — surfaces three user-visible decorative Unicode glyphs that cycles 1-3 left in place and three accumulated minor defects (button `type` attribute, icon-sizing inconsistency, dead row-action button). All are flagged below at appropriate severities.

This cycle is **not zero-finding**. The perfect-PR counter resets to 0 consecutive zero-finding cycles. To re-satisfy the gate, a fix-pass closing all 8 findings plus two more clean cycles is required.

## Verification of Cycle-3 Dismissal Fixes (commit `85a69c5fb`)

| Item | Status | Evidence |
|------|--------|----------|
| `dashboard-data.ts:35` line range `227-244` → `232-265` | **CLOSED** | `grep -n "use-owner-dashboard.ts:" src/components/dashboard/dashboard-data.ts` returns line 35: `` `use-owner-dashboard.ts:232-265` ``. Cross-checked against `use-owner-dashboard.ts`: `fetchOwnerDashboardData` block spans 195-266; the row mapper is 232-249; the final return assembly is 251-265. "232-265" is the canonical fetcher-boundary line range. |
| `portfolio-table.tsx` Unicode `↑`/`↓` → Lucide `ArrowUp`/`ArrowDown` | **CLOSED at glyph layer** (but introduces WR-01 — see below) | `grep -nE "↑\|↓"` on the file returns empty. Imports at line 3: `import { ArrowDown, ArrowUp } from "lucide-react";`. `SortIndicator` at lines 22-41 renders `<Icon className="ml-1 inline-block size-3" aria-label="..." />`. |

## Findings

### Warnings

#### WR-01: Sort indicator uses `aria-label` on icon instead of `aria-sort` on the column header (NEW REGRESSION from cycle-3 fix)

**File:** `src/components/dashboard/components/portfolio-table.tsx:32-40`
**Issue:** The cycle-3 fix replaced Unicode arrows with Lucide `<Icon>` components and added `aria-label="sorted ascending"|"sorted descending"` on the SVG. This is the wrong ARIA pattern for sortable table columns. The WAI-ARIA Authoring Practices for sortable tables require `aria-sort="ascending"|"descending"|"none"` on the `<th>` element (here, the `<TableHead>` component) so screen-reader table-navigation commands announce the column header's sort state. Putting the label on the icon means the icon becomes a separately-announced element (visited only when the SR reaches the icon node) rather than being part of the column-header semantics.

Additionally, the columns that *can* be sorted (`Property`, `Units`, `Lease Status`, `Monthly Rent`) and the columns that *cannot* (`Tenants`, `Maintenance`, `Actions`) have no programmatic distinction beyond `cursor-pointer` styling — screen readers cannot tell sortable headers apart from static ones.

**Fix:**
```tsx
// Drop the aria-label on the icon, mark it aria-hidden (it's decorative once
// the column header carries aria-sort), and lift sort state to the <TableHead>.

function SortIndicator({ field, sortField, sortDirection }: {
	field: string;
	sortField: string;
	sortDirection: "asc" | "desc";
}) {
	if (sortField !== field) return null;
	const Icon = sortDirection === "asc" ? ArrowUp : ArrowDown;
	return <Icon className="ml-1 inline-block size-3" aria-hidden="true" />;
}

// In the JSX, lift aria-sort to the TableHead and use it on every sortable column:
<TableHead
	className="cursor-pointer hover:bg-muted/50"
	aria-sort={
		sortField === "property"
			? (sortDirection === "asc" ? "ascending" : "descending")
			: "none"
	}
	onClick={() => onSort("property")}
>
	Property
	<SortIndicator field="property" sortField={sortField} sortDirection={sortDirection} />
</TableHead>
```

Apply to all four sortable headers (`property`, `units`, `status`, `rent`). The non-sortable headers (`Tenants`, `Maintenance`, `Actions`) need no change — absence of `aria-sort` is the correct default.

#### WR-02: Click-to-sort `<TableHead>` lacks keyboard support — keyboard users cannot sort

**File:** `src/components/dashboard/components/portfolio-table.tsx:53-97` (four `<TableHead onClick={...}>` blocks)
**Issue:** Each sortable `<TableHead>` has `className="cursor-pointer ..."` and `onClick={() => onSort(...)}` but no `tabIndex`, no `role="button"`, and no `onKeyDown` handler. The underlying `<th>` element is not focusable by Tab, and even if focused there is no Enter/Space activation path. Keyboard-only and switch-control users see "cursor-pointer" cues but cannot trigger sort. This is pre-existing (not introduced by `85a69c5fb`) but is *in the file the cycle-3 fix touched*, and cycle 3 should have flagged it. Per directive "do not dismiss anything as pre-existing or out of scope" — flagged here.

**Fix:** Either (a) make `<TableHead>` a button:
```tsx
<TableHead className="cursor-pointer hover:bg-muted/50">
	<button
		type="button"
		className="inline-flex items-center gap-1 font-inherit"
		onClick={() => onSort("property")}
		aria-label={`Sort by Property ${sortField === "property" && sortDirection === "asc" ? "descending" : "ascending"}`}
	>
		Property
		<SortIndicator field="property" sortField={sortField} sortDirection={sortDirection} />
	</button>
</TableHead>
```

or (b) add keyboard role plumbing:
```tsx
<TableHead
	className="cursor-pointer hover:bg-muted/50"
	role="button"
	tabIndex={0}
	onClick={() => onSort("property")}
	onKeyDown={(e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onSort("property");
		}
	}}
>
	...
</TableHead>
```

Option (a) is preferred — native `<button>` brings keyboard, focus ring, and screen-reader semantics for free.

#### WR-03: User-visible decorative em-dash glyphs (`—`, U+2014) as empty-cell fallbacks

**File:**
- `src/components/dashboard/components/portfolio-grid.tsx:53` — `<div>{row.tenant || "—"}</div>`
- `src/components/dashboard/components/portfolio-grid.tsx:64` — `{row.maintenanceOpen > 0 ? `${row.maintenanceOpen} open` : "—"}`
- `src/components/dashboard/components/portfolio-table.tsx:125` — `<span className="text-sm text-muted-foreground">—</span>` (Tenants empty)
- `src/components/dashboard/components/portfolio-table.tsx:155` — `<span className="text-sm text-muted-foreground">—</span>` (Maintenance empty)

**Issue:** Per cycle-4 directive: "Em-dashes in JSDoc comments are typography and acceptable; emoji and decorative glyphs are not [acceptable in code]". These four sites are *rendered UI strings*, not JSDoc. They are decorative Unicode glyphs in user-facing markup. Screen readers announce em-dash as "em dash" or skip silently depending on punctuation-verbosity settings — neither is the intent. The semantically correct empty-cell pattern is an `aria-hidden` decorative span plus an SR-only "no value" label, or the empty string.

Cycles 1-3 left these in place. Per "do not dismiss anything", flagged here.

**Fix:**
```tsx
// portfolio-grid.tsx:53 — tenants empty
<div>
	{row.tenant ?? <span aria-label="No tenants" className="text-muted-foreground">--</span>}
</div>

// portfolio-grid.tsx:64 — maintenance empty
<div className={row.maintenanceOpen > 0 ? "text-red-600 dark:text-red-500" : ""}>
	{row.maintenanceOpen > 0
		? `${row.maintenanceOpen} open`
		: <span aria-label="No open requests" className="text-muted-foreground">--</span>}
</div>

// portfolio-table.tsx:125, 155 — same treatment
<span aria-label="No tenants" className="text-sm text-muted-foreground">--</span>
<span aria-label="No open requests" className="text-sm text-muted-foreground">--</span>
```

ASCII `--` paired with `aria-label` keeps the screen-reader announcement deterministic. Alternatively use ASCII `-` or empty string with the aria label.

#### WR-04: Decorative middle-dot glyph (`·`, U+00B7) as inline UI separator

**File:** `src/components/dashboard/dashboard.tsx:172`
**Issue:** Header summary text reads `{metrics.occupiedUnits} of {metrics.totalUnits} units occupied ·{" "} {formatCurrency(...)} this month`. The U+00B7 middle-dot is a decorative glyph in user-visible rendered text — same category as the em-dashes in WR-03. Not JSDoc.

**Fix:** Either use semantically-meaningful separation (two `<span>`s with margin), or replace with ASCII text:
```tsx
<p className="text-sm text-muted-foreground">
	{metrics.occupiedUnits} of {metrics.totalUnits} units occupied
	{" - "}
	{formatCurrency(metrics.totalRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
	{" this month"}
</p>
```
or:
```tsx
<p className="text-sm text-muted-foreground">
	<span>{metrics.occupiedUnits} of {metrics.totalUnits} units occupied</span>
	<span aria-hidden="true" className="mx-2">|</span>
	<span>{formatCurrency(metrics.totalRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} this month</span>
</p>
```

#### WR-05: `<button>` elements missing `type="button"` attribute

**File:**
- `src/components/dashboard/dashboard.tsx:191-205` — quick-action buttons inside `quickActions.map(...)`
- `src/components/dashboard/dashboard.tsx:250-255` — "Clear filters" empty-results button
- `src/components/dashboard/components/portfolio-table.tsx:160-162` — row-action Edit button

**Issue:** HTML `<button>` defaults to `type="submit"`. None of these are inside a `<form>` at present so the immediate runtime impact is nil, but `react/button-has-type` is part of the ESLint recommended ruleset and flagging this satisfies CLAUDE.md's "perfect by all measures" standard. Defensive correctness: if any of these get nested under a form (e.g., the dashboard search/filter row evolves into a `<form>`), they would all submit it.

**Fix:** Add `type="button"` to each:
```tsx
<button
	type="button"
	key={action.action}
	className="..."
	onClick={() => handleAction(action.action)}
>
	...
</button>
```

### Info

#### IN-01: Icon sizing `size-3` is the only `size-3` in the dashboard subtree (cycle-3 fix sizing inconsistency)

**File:** `src/components/dashboard/components/portfolio-table.tsx:35`
**Issue:** The cycle-3 fix chose `size-3` (12px) for the `SortIndicator` arrow. The rest of the dashboard subtree uses `size-4` (16px) for inline status/trend icons: `chart-area-interactive.tsx:181,183` (`TrendingUp`/`TrendingDown`), `expiring-leases-widget.tsx:96,116,167` (`Clock`/`ChevronRight`), and `dashboard.tsx:197` (quick-action `<action.icon className="h-4 w-4" />` — legacy syntax, see IN-02). `size-3` is plausible for a tight inline sort marker but is the lone outlier within the 9-file scope.

**Fix:** Bump to `size-4` for visual consistency:
```tsx
<Icon className="ml-1 inline-block size-4" aria-hidden="true" />
```

Or, if the smaller size is intentional, leave as-is — flagged at Info per directive "do not dismiss anything".

#### IN-02: `dashboard.tsx:197` uses legacy `h-4 w-4` while peer files use modern `size-N`

**File:** `src/components/dashboard/dashboard.tsx:197`
**Issue:** `<action.icon className="h-4 w-4" />` uses the legacy Tailwind two-utility syntax. Peer dashboard files (`chart-area-interactive`, `expiring-leases-widget`, `portfolio-toolbar`, post-cycle-3 `portfolio-table`) use the consolidated `size-N` utility. CLAUDE.md doesn't ban `h-N w-N`, but the inconsistency within the same subtree degrades scan-readability.

**Fix:**
```tsx
<action.icon className="size-4" />
```

#### IN-03: `dashboard.tsx:77-85` `TODO(phase-3):` marker (pre-existing — flagged per "do not dismiss")

**File:** `src/components/dashboard/dashboard.tsx:77-85`
**Issue:** Multi-line `TODO(phase-3): replace this inline portfolioData transform with transformDashboardData ...`. This is the only `TODO` in the 9-file scope. Cycle-1 accepted it; cycles 2-3 carried it forward as intentional architectural anchor. Per directive "do not dismiss anything no matter severity", flagged at Info level. Not actionable in Phase 1 — the dedup it points at is Phase 3 work (`dashboard-view.tsx` migration) — but acknowledged as a known carry-over rather than silently waved past.

**Fix:** No action required in Phase 1. Confirmed as intentional carry-over to Phase 3. This finding exists for audit-trail completeness, not for code change.

#### IN-04: `portfolio-table.tsx:160` dead row-action `<button>Edit</button>` (no `onClick`, no `aria-label`, no route)

**File:** `src/components/dashboard/components/portfolio-table.tsx:158-164`
**Issue:**
```tsx
<TableCell>
	<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
		<button className="p-1.5 text-muted-foreground hover:text-foreground rounded">
			Edit
		</button>
	</div>
</TableCell>
```
The row hover reveals an "Edit" button that has no `onClick`, no link wrapper, no `type="button"`, and no router action. Clicking it does nothing. This is dead UI — either wire to `/properties/[id]/edit` or hide until Phase 3. Pre-existing but in cycle-3-touched component, flagged per "do not dismiss anything".

**Fix:** Two options:

(a) Wire it to the property edit route:
```tsx
import Link from "next/link";

// inside the TableRow:
<TableCell>
	<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
		<Link
			href={`/properties/${row.id}/edit`}
			className="p-1.5 text-muted-foreground hover:text-foreground rounded"
			aria-label={`Edit ${row.property}`}
		>
			Edit
		</Link>
	</div>
</TableCell>
```

(b) Remove until Phase 3:
```tsx
{/* Actions column removed pending phase-3 row-level actions */}
<TableCell />
```

## Independent Re-Verification of Cycle-3 Gates (status only)

| Gate | Status | Notes |
|------|--------|-------|
| Zero-Tolerance Rule 1 (no `any`) | PASS | grep across 9 files returns zero. |
| Zero-Tolerance Rule 2 (no barrel `index.ts`) | PASS | No `from "./index"` or `from "../index"` patterns. Type re-export at `use-dashboard-hooks.ts:117-121` is canonical hook-file split partner, not a barrel. |
| Zero-Tolerance Rule 3 (no duplicate types) | PASS | `OwnerDashboardData` declared once at `use-owner-dashboard.ts:178`; `dashboard-data.ts` imports it as type. |
| Zero-Tolerance Rule 4 (no commented-out code) | PASS | Only JSDoc and explanatory comments. No `// const x =` style dead lines. (TODO at `dashboard.tsx:77` is a marker, not commented-out code — separately flagged IN-03.) |
| Zero-Tolerance Rule 5 (no inline styles) | PASS | `grep "style={"` returns zero in scope. |
| Zero-Tolerance Rule 6 (no PG ENUMs) | N/A | No schema work in Phase 1. |
| Zero-Tolerance Rule 7 (no emojis / no decorative glyphs in UI) | **FAIL** — see WR-03 (em-dashes) + WR-04 (middle-dot). Cycles 1-3 missed these. |
| Zero-Tolerance Rule 8 (no `as unknown as`) | PASS | Zero hits. |
| Zero-Tolerance Rule 9 (no string-literal queryKeys) | PASS | All keys route through `ownerDashboardKeys.*`. |
| Zero-Tolerance Rule 10 (no `@radix-ui/react-icons`) | PASS | `dashboard-types.ts:1` + `portfolio-table.tsx:3` import from `lucide-react` only. |
| D-03 invariant (no `*100` / `/100` cents drift) | PASS | Empty result. |
| D-09a (`formatCurrency` with 0-fraction-digits options) | PASS | All three callsites: `dashboard.tsx:173-176`, `portfolio-grid.tsx:45-48`, `portfolio-table.tsx:144-147` — each passes `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`. |
| D-12a interpretation #2 (no `select:` in `DASHBOARD_BASE_QUERY_OPTIONS`) | PASS | Lines 268-275 declare only `queryKey`, `queryFn`, `staleTime`, `gcTime`, `refetchIntervalInBackground`, `structuralSharing`. |
| Type-import discipline | PASS | All four imports in `dashboard-data.ts:1-4` use `import type`. |
| No `@ts-expect-error` / `@ts-ignore` | PASS | Zero hits across 9 files. |
| No debug artifacts (`console.log`, `debugger`) | PASS | Zero hits. |
| Unicode-glyph sweep (non-JSDoc) | **FAIL** — WR-03 em-dashes (4 sites) + WR-04 middle-dot (1 site). All JSDoc/comment glyphs (em-dash in JSDoc, `→`, `↔`, `§`) are acceptable typography per directive. |
| Cycle-3 dismissed item #1 (line range drift) | **CLOSED** by `85a69c5fb`. |
| Cycle-3 dismissed item #2 (Unicode arrows) | **CLOSED at glyph layer** by `85a69c5fb`; introduces WR-01. |

## Cycle Audit Trail

| Cycle | Date | Findings | Status |
|-------|------|----------|--------|
| Cycle 1 | 2026-05-23 (pre-fix) | 1 CR + 4 WR + 3 IN = 8 | issues_found |
| Fix commit | `a1922e3df` | — | All 8 closed |
| Cycle 2 | 2026-05-23T16:15:00Z | 0 | clean |
| Cycle 3 | 2026-05-23T18:42:00Z | 0 (with 2 dismissals: stale line-range + Unicode arrows) | clean — but user rejected verdict; dismissals violated "fix everything" directive |
| Fix commit | `85a69c5fb` | — | Both dismissed items closed |
| **Cycle 4** | **2026-05-23T20:30:00Z** | **0 CR + 5 WR + 3 IN = 8** | **issues_found** — perfect-PR counter reset to 0 |

## Final Verdict

**8 findings.** Perfect-PR merge gate is NOT satisfied. Two consecutive zero-finding cycles are required to merge.

Key insight from cycle 4: the cycle-3 review's dismissal pattern hid two real defects (WR-01 ARIA semantics regression triggered by the cycle-3 fix itself, WR-02 keyboard-a11y gap in the cycle-3-touched component) plus revealed five additional defects that should have been caught in cycles 1-3 (WR-03 em-dash glyphs, WR-04 middle-dot glyph, WR-05 button type attribute, IN-02 icon sizing inconsistency, IN-04 dead row-action button). The "borderline / advisory only" labeling was rationalization, not analysis.

Per user directive: any deviation from "perfect by all measures" is a finding. This cycle holds that line.

---

_Reviewed: 2026-05-23T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 4 — perfect-PR gate counter reset by code change in `85a69c5fb`. 0/2 consecutive zero-finding cycles achieved._
