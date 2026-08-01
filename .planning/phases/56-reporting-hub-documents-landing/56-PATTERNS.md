# Phase 56: Reporting Hub - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 47 (9 created · 38 moved · 15 deleted · 14 modified — a file can appear in two columns)
**Analogs found:** 9 / 9 created files have a concrete in-repo analog (100%)

> **Phase shape.** This is a DELETION + MOVE + REDIRECT phase. Only 9 files are genuinely new,
> and every one of them has an exact-role analog already shipped in this repo. The bulk of the
> work is `git mv` + import-path rewriting, which needs *conventions* (route colocation, layout
> metadata, tile anatomy) rather than new code patterns. Analog hunting is weighted accordingly:
> deep excerpts for the 9 new files, convention excerpts for the moves, precise line coordinates
> for the deletions.

---

## File Classification

### Created (9)

| New file | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(owner)/reports/page.tsx` (REWRITE) | page / RSC shell | static + 1 client island | `src/app/(owner)/documents/vault/page.tsx` | exact |
| `src/app/(owner)/reports/reports-hub-entries.ts` | data module (typed array) | static config | `src/app/(owner)/reports/generate/components/report-types.ts` | exact |
| `src/app/(owner)/reports/report-hub-tile.tsx` | presentational component | none (props only) | `financials-quick-links.tsx` `QuickLinkCard` (:24-58) | exact |
| `src/app/(owner)/reports/reports-summary-strip.tsx` | client island | request-response (1 RPC) | `src/components/ledger/ledger-balance-strip.tsx` + `collection-rate-kpi.tsx` | exact (two-part) |
| `src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx` | unit test | — | `src/components/ledger/__tests__/collection-rate-kpi.test.tsx` | exact |
| `src/lib/seo/reporting-redirects.ts` | pure config module | build-time | `src/lib/seo/blog-redirects.ts` | exact |
| `src/lib/seo/__tests__/reporting-redirects.test.ts` | unit test | — | `src/lib/seo/__tests__/blog-redirects.test.ts` | exact |
| `tests/e2e/tests/public/reporting-redirects.spec.ts` | E2E (request-only) | request-response | `tests/e2e/tests/public/routing-aliases.spec.ts` | exact |
| `tests/e2e/tests/reports-hub.spec.ts` | E2E (owner-axe, self-auth) | request-response | `tests/e2e/tests/notifications.spec.ts` | exact |
| *(optional, recommended)* `src/app/(owner)/reports/__tests__/zero-charts.test.ts` | static source-scan guard | file-I/O | `src/hooks/api/__tests__/rent-ledger-money.test.ts` | exact |

### Moved (38 files, 5 routes + 6 shared components)

| Move | Role | Data Flow | Convention analog | Match |
|---|---|---|---|---|
| `financials/balance-sheet/**` (7) → `reports/balance-sheet/**` | route + colocated components | CRUD read | `reports/generate/` colocation | exact |
| `financials/cash-flow/**` (9) → `reports/cash-flow/**` | route + colocated components | CRUD read | same | exact |
| `financials/expenses/**` (8, incl. `__tests__` + `_components`) → `reports/expenses/**` | route + colocated components + test | CRUD read | `analytics/financial/_components/` | exact |
| `financials/income-statement/**` (10, incl. `__tests__`) → `reports/income-statement/**` | route + colocated components + test | CRUD read | same | exact |
| `financials/tax-documents/**` (2) → `reports/tax-documents/**` | route | request-response | same | exact |
| `financials-header.tsx` → `reports-header.tsx` | presentational | none | (self — move verbatim) | n/a |
| `financials-highlights.tsx` → `reports-highlights.tsx` | presentational | none | (self) | n/a |
| `financials-summary-stats.tsx` → `reports-summary-stats.tsx` | presentational | none | (self, minus A/R — D-35) | n/a |
| `financials-quick-links.tsx` → `reports-quick-links.tsx` | presentational | none | (self — but see CONFLICT-1) | n/a |
| `financials-loading.tsx` → `reports-loading.tsx` | loading boundary | none | (self) | n/a |
| `financials-error.tsx` → `reports-error.tsx` | error boundary | none | (self) | n/a |

### Deleted (15 files + 5 in-file excisions)

| Deleted | Role | Reason |
|---|---|---|
| `src/app/(owner)/financials/page.tsx` | page | D-32 entry 1 → `/reports` |
| `src/app/(owner)/financials/layout.tsx` | layout | `/reports/layout.tsx` already exists |
| `src/app/(owner)/reports/analytics/page.tsx` | page | D-29 / D-36 |
| `.../analytics-stats-row.tsx` | component | D-33 (permanently-zero + D-39 no loss) |
| `.../analytics-payment-methods-chart.tsx` | component | D-33 (unclaimable card-vs-ACH) |
| `.../analytics-revenue-chart.tsx` | component (recharts) | D-34 / D-36 |
| `.../analytics-occupancy-chart.tsx` | component (recharts) | D-34 / D-36 |
| `.../analytics-property-table.tsx` | component | D-36 (provably dead — `byProperty: []`) |
| `src/components/reports/sections/financial-report-section.tsx` | section (recharts `AreaChart`) | D-34, orphaned by index rewrite |
| `src/components/reports/sections/property-report-section.tsx` | section (`BarChart`) | D-34, orphaned |
| `src/components/reports/sections/tenant-report-section.tsx` | section (`LineChart`) | D-34, orphaned |
| `src/components/reports/sections/maintenance-report-section.tsx` | section (`BarChart`+`LineChart`) | D-34, orphaned |
| **in-file:** `financials-summary-stats.tsx` A/R prop + `Stat` | — | D-35 |
| **in-file:** `financial-keys.ts:153` | — | D-35 |
| **in-file:** `report-data.ts` 2 rows + fetch + fallback + import | — | D-37 |

**Orphan verification (executed this session):** the four chart sections are imported by
`src/app/(owner)/reports/page.tsx` lines 21/29/37/45 and by **nothing else** in `src/` or `tests/`.
`year-end-report-section.tsx` is chart-free and has a live test
(`sections/__tests__/year-end-report-section-utils.test.ts`) — it STAYS.

### Modified (14)

| File | Role | Change |
|---|---|---|
| `next.config.ts` | config | spread the 7-entry map into `redirects()` |
| `src/components/shell/main-nav.tsx` | nav | delete `Financials` section (:74-86), re-home children under `Reports` (:70-73). `Analytics` (:54-67) untouched. |
| `src/components/shell/app-shell.tsx` | command palette | 5 `/financials*` hrefs; the whole `Financials` heading group collapses into `Analytics & Reports` |
| `src/lib/breadcrumbs.ts` | pure util | `LABEL_MAP`: drop `financials`, add `expenses` + `year-end`; KEEP `analytics`, `financial` |
| `src/lib/routes/private-routes.ts` | security config | remove exactly one line: `"/financials"` (:12). **KEEP `"/analytics"` (:8).** |
| `src/hooks/api/query-keys/financial-keys.ts` | query factory | drop `accounts_receivable: monthlyRevenue` (:153) |
| `src/lib/reports/report-data.ts` | export builder | D-37 excisions |
| `src/lib/__tests__/breadcrumbs.test.ts` | test | 4 `/financials/*` blocks at :63-92 |
| `src/components/shell/__tests__/main-nav.test.tsx` | test | `/financials/i` matcher at :134, :161, :317 |
| `tests/e2e/tests/constants/routes.ts` | test constants | 4 `FINANCIALS_*` (:63-66) → `REPORTS_*`; drop `REPORTS_ANALYTICS` (:70); keep all 7 `ANALYTICS_*` (:54-60) |
| `tests/e2e/tests/owner/owner-financials.e2e.spec.ts` | E2E | retarget to `/reports/*` (rename the file) |
| `tests/e2e/playwright.config.ts` | test config | add the hub spec to the `owner-axe` `testMatch` array (:174-182) |
| `src/lib/__tests__/auth-redirect.test.ts` | test | `/financials` sample target → `/reports` |
| `src/components/maintenance/maintenance-view.client.tsx` | component | `router.push("/reports/analytics")` (:119) — **see CONFLICT-2** |

---

## Pattern Assignments

### 1. `src/app/(owner)/reports/page.tsx` — RSC shell + one client island

**Analog:** `src/app/(owner)/documents/vault/page.tsx` (whole file, 12 lines) — the repo's canonical
"Server Component page that renders exactly one `'use client'` island."

```tsx
import type { Metadata } from "next";
import { DocumentsVaultClient } from "#components/documents/documents-vault.client";

export const metadata: Metadata = {
	title: "Document Vault",
	description: "Search and filter every document attached to ...",
};

export default function DocumentsVaultPage() {
	return <DocumentsVaultClient />;
}
```

**Metadata pattern — use `ownerPageMetadata`, not a bare `Metadata` literal.** Every route under
`(owner)` uses the helper. `src/app/(owner)/reports/layout.tsx` (whole file) already carries it, so
`page.tsx` exports NO metadata:

```tsx
import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata(
	"Reports",
	"Generate financial, property, tenant, and maintenance reports",
);

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
```
The description string must be rewritten for the hub ("Every financial statement and export in one
place." per UI-SPEC §Copywriting). The `layout.tsx` file itself is NOT deleted or moved.

**Page-shell wrapper class — copy verbatim from the current index** (`reports/page.tsx:147`):
```tsx
<div className="p-6 lg:p-8 bg-background min-h-full">
```
Identical on `financials/page.tsx:64`, `financials-loading.tsx:5`, `financials-error.tsx:9`. This
is the owner-page canvas convention; do not invent a new one.

**Grep contract the planner must preserve (D-34 + UI-SPEC §Composition):** the new `page.tsx` has
NO `"use client"` on line 1, NO `useState`, NO `dynamic()` import of a chart section, and no
`recharts` / `ChartContainer` / `ResponsiveContainer` anywhere under `src/app/(owner)/reports/**`.

---

### 2. `src/app/(owner)/reports/reports-hub-entries.ts` — the 7-tile data array

**Analog:** `src/app/(owner)/reports/generate/components/report-types.ts` — a typed, colocated,
route-local data array. Not an `index.ts`, so it satisfies ZT-2 (no barrel files).

**Imports + interface + array pattern** (`report-types.ts:1-42`):
```ts
import type { LucideIcon } from "lucide-react";
import { Building2, FileSpreadsheet, FileText, TrendingUp, Wrench } from "lucide-react";

export interface ReportCard {
	id: ReportType;
	title: string;
	description: string;
	icon: LucideIcon;
	formats: ReportFormat[];
	category: "executive" | "financial" | "operations";
}

export const reportCards: ReportCard[] = [
	{
		id: "executive-monthly",
		title: "Executive Monthly Report",
		description: "Comprehensive monthly summary for leadership ...",
		icon: FileText,
		formats: ["pdf", "excel"],
		category: "executive",
	},
	// ...
];
```

Copy: `LucideIcon` as the icon type (NOT `ElementType` — `financials-quick-links.tsx:11` uses
`ElementType`, which is the weaker of the two patterns in the repo; `LucideIcon` is correct and
matches ZT-10), a discriminating `category`-style field for the Statements/Exports grouping, and
`readonly`/`as const` where the array is never mutated.

The 7 entries, their icons, hrefs, descriptions and the two `Growth` badges are fully specified in
56-UI-SPEC.md §"The 7 entries" — transcribe, do not re-derive.

---

### 3. `src/app/(owner)/reports/report-hub-tile.tsx` — the uniform tile

**Analog:** `QuickLinkCard` inside `src/app/(owner)/financials/financials-quick-links.tsx:24-58`.

**Core pattern** (`financials-quick-links.tsx:32-57`):
```tsx
<Link
	href={href}
	className="group bg-card border border-border rounded-lg p-5 hover:bg-muted/50 transition-colors"
>
	<div className="flex items-start justify-between mb-4">
		<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
			<Icon className="w-5 h-5 text-primary" />
		</div>
		<ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
	</div>
	<h3 className="font-medium text-foreground mb-1">{title}</h3>
	<p className="text-sm text-muted-foreground mb-3">{description}</p>
	{value && (
		<div className="flex items-center gap-2">
			<span className="text-lg font-semibold tabular-nums">{value}</span>
			{trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-600" />}
			{trend === "down" && <TrendingDown className="w-4 h-4 text-red-600" />}
		</div>
	)}
</Link>
```

**Four UI-SPEC-mandated deltas from the analog — all of them are real defects in the analog:**

| # | Analog line | Analog value | Required in the new tile | Why |
|---|---|---|---|---|
| 1 | :20-21, :45-55 | `value` / `trend` props + `TrendingUp`/`TrendingDown` block | **DELETE the props and the whole block** | D-30 confines data to the summary strip; the tiles carry no figures |
| 2 | :38-39 | `bg-primary/10` medallion + `text-primary` glyph | `bg-muted` + `text-foreground`, and add `aria-hidden="true"` on the icon | UI-SPEC §Color: accent budget is spent on hover + focus ring only |
| 3 | :43 | `font-medium` | `font-semibold` | UI-SPEC §Typography two-weight discipline |
| 4 | :49-52 | `text-emerald-600` / `text-red-600` raw Tailwind palette | n/a (block deleted) | bare palette colors bypass the oklch token system |

**Also add** `hover:border-primary/30` to the `Link` className (UI-SPEC §Color item 4) and the
conditional `Badge variant="outline"` + `Sparkles size-3` + `Growth` label in the top-right slot,
replacing the `ArrowRight` on badged tiles (never stack both).

**Group-heading pattern for the two sections** — analog
`src/app/(owner)/reports/generate/components/report-card-grid.tsx:30-35`:
```tsx
<div className="flex flex-col gap-4">
	<div>
		<h2 className="font-medium text-foreground">{title}</h2>
		<p className="text-sm text-muted-foreground">{description}</p>
	</div>
	<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
```
Same two deltas apply: `font-medium` → `font-semibold` (:32), and the UI-SPEC pins the grid to
`grid gap-4 sm:grid-cols-2 xl:grid-cols-3`. Add `id` + `aria-labelledby` on the `<section>`.

---

### 4. `src/app/(owner)/reports/reports-summary-strip.tsx` — the D-30 client island

This one has **two** analogs and needs both: `ledger-balance-strip.tsx` for the *shape*,
`collection-rate-kpi.tsx` for the *data wiring and states*.

**Analog A — shape.** `src/components/ledger/ledger-balance-strip.tsx` (whole file, 97 lines).
This is the exact metric-tile treatment the UI-SPEC pins.

Header comment pattern (:1-13) — copy the structure, restate for D-30/D-18:
```tsx
"use client";

/**
 * Per-lease balance summary strip (LEDGER-03).
 * ...
 * MONEY (D-00): dollars straight from the RPC through `formatCurrency`, with
 * `tabular-nums` so the three cards line up. No scaling anywhere.
 */
```

Metric card (:26-60) — the load-bearing excerpt:
```tsx
function MetricCard({ icon: Icon, label, value, valueClassName, children }: {
	icon: typeof DollarSign;
	label: string;
	/** null while the summary is loading, which renders a skeleton instead. */
	value: string | null;
	valueClassName?: string;
	children?: ReactNode;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
					<Icon className="h-4 w-4" aria-hidden="true" />
					{label}
					{children}
				</div>
				{value === null ? (
					<Skeleton className="h-7 w-24" />
				) : (
					<p className={cn("text-xl font-semibold tabular-nums", valueClassName)}>
						{value}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
```

Container + tolerance + token usage (:23-24, :69-95):
```tsx
/** numeric(10,2) dust threshold: below half a cent nothing is still owed. */
const CENT_TOLERANCE = 0.005;
...
const isOwed = (summary?.balance ?? 0) > CENT_TOLERANCE;

<div className="grid gap-4 sm:grid-cols-3">
	<MetricCard
		icon={Scale}
		label="Balance"
		value={summary ? formatCurrency(summary.balance) : null}
		valueClassName={isOwed ? "text-destructive-text" : "text-success-text"}
	/>
```

**Copy exactly:** `text-xl font-semibold tabular-nums`, `grid gap-4 sm:grid-cols-3`,
`CardContent className="p-4"`, `formatCurrency` straight on the dollar value (no `* 100`),
`CENT_TOLERANCE = 0.005` for the Outstanding threshold, `-text` companion tokens on text runs.
**Add** `leading-snug` to the value `<p>` — UI-SPEC §Typography requires an explicit line-height
because `globals.css` defines `--text-xl` with no paired line-height token. That is a documented
improvement over the analog, not a deviation.

**`ledger-balance-strip.tsx` itself must NOT be modified** (UI-SPEC: Phase 55 shipped code, and the
two strips never co-render).

**Analog B — data wiring + states.** `src/components/ledger/collection-rate-kpi.tsx` and its hook.

The hook and the typed mapper already exist and are exactly the D-30 payload — **do not write a new
query key**. `src/hooks/api/use-owner-dashboard-financial.ts`:
```ts
// :46-50
export interface CollectionRateSummary {
	scheduled: number;
	collected: number;
	rate: number;
}

// :205-224 — queryOptions() factory, ZT-9 compliant
collectionRate: () =>
	queryOptions({
		queryKey: ownerDashboardKeys.financial.collectionRate(currentMonthKey()),
		queryFn: async (): Promise<CollectionRateSummary> => {
			const supabase = createClient();
			const user = await getCachedUser();
			if (!user) throw new Error("Not authenticated");
			const { data, error } = await supabase.rpc("get_collection_rate", { p_user_id: user.id });
			if (error) handlePostgrestError(error, "collection rate");
			const row = data?.[0];
			return row
				? mapCollectionRateRow(jsonObject<Record<string, unknown>>(row))
				: { ...EMPTY_COLLECTION_RATE };
		},
		...QUERY_CACHE_TIMES.STATS,
	}),

// :241-243
export function useCollectionRate() {
	return useQuery(dashboardFinancialQueries.collectionRate());
}
```
`scheduled` and `collected` are the D-30 tiles 1 and 2 verbatim; Outstanding is
`data.scheduled - data.collected` **from this same object** (D-30 single-source rule). `rate` is
unused by the strip.

Typed-boundary mapper (`use-owner-dashboard-financial.ts:59-80`) — already exists, reuse:
```ts
function toFiniteNumber(raw: Record<string, unknown>, field: string): number {
	const value = raw[field];
	// PostgREST can serialise `numeric` as a JSON string to preserve precision.
	const parsed = typeof value === "string" ? Number(value) : value;
	if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
		throw new Error(`mapCollectionRateRow: field '${field}' is missing or not a finite number`);
	}
	return parsed;
}
```

Three-state handling (`collection-rate-kpi.tsx:99-129`):
```tsx
const { data, isPending, isError } = useCollectionRate();

if (isPending) return <CollectionRateSkeleton />;

if (isError || !data) {
	return (
		<Stat className="h-full" data-testid="collection-rate-kpi">
			<StatLabel>Collection rate</StatLabel>
			<StatValue className="text-base text-muted-foreground">Unavailable</StatValue>
			<StatDescription>Couldn&apos;t load the collection rate.</StatDescription>
		</Stat>
	);
}

// D-08: nothing scheduled means an honest 0%, not a hidden or invented tile.
const hasLedgerData = data.scheduled > 0;
```
Copy the shape, but per UI-SPEC §"Strip states": loading = 3 `Skeleton` tiles at the strip's own
height (the `value === null` branch of `MetricCard` already does this — pass `null`), error =
inline muted copy, and **the strip's failure must never remove the tile grid below it**. Since the
tile grid is a sibling in the RSC shell with zero data dependency, this is structural, but do NOT
wrap the whole page in an error boundary.

---

### 5. `src/lib/seo/reporting-redirects.ts` — the 7-entry map

**Analog:** `src/lib/seo/blog-redirects.ts` (:1-35) — the established "pure, unit-testable module
spread into `next.config.ts`" precedent.

**Structure to copy** (`blog-redirects.ts:19-37`):
```ts
export interface BlogRedirect {
	readonly source: string;
	readonly destination: string;
}

export const DELETED_BLOG_REDIRECTS: readonly BlogRedirect[] = [
	{ source: "/blog/...", destination: "/compare/rentredi" },
	// ...
];
```
Also copy the **header-comment discipline** (:1-17): what the map is for, why each target was
chosen, and a maintenance note. The reporting map's comment must state D-32 entry 7's inversion
explicitly ("`/reports/analytics -> /analytics/overview` is the ONE redirect pointing away from
the hub — it is not a typo") and why the target is `/analytics/overview` and not `/analytics`
(`analytics/page.tsx` is a 4-line `redirect("/analytics/overview")`, so `/analytics` would chain
308 → 307).

**No `filterActiveRedirects` equivalent is needed** — that function exists only because the blog
map is build-time-filtered against a live Supabase slug set. The reporting map is static.

**`next.config.ts` wiring** — import at the top (`next.config.ts:13-17`) and spread inside
`redirects()` (:151-158):
```ts
// 301 map for the deleted Phase-1 blog catalogue (SEO ranking-equity recovery).
import {
	DELETED_BLOG_REDIRECTS,
	filterActiveRedirects,
} from "./src/lib/seo/blog-redirects";
...
	async redirects() {
		return [
			...
			...filterActiveRedirects(DELETED_BLOG_REDIRECTS, ...).map((r) => ({
				source: r.source,
				destination: r.destination,
				permanent: true,
			})),
		];
	},
```
The reporting spread is simpler (no filter):
`...REPORTING_REDIRECTS.map((r) => ({ source: r.source, destination: r.destination, permanent: true }))`.
The existing 5 literal entries (:87-143) are the `permanent: true` → 308 precedent the CONTEXT
cites; leave all 5 untouched. Note the relative `./src/lib/...` specifier — `next.config.ts` cannot
use the `#lib/*` subpath alias.

---

### 6. `src/lib/seo/__tests__/reporting-redirects.test.ts`

**Analog:** `src/lib/seo/__tests__/blog-redirects.test.ts` (whole file, 107 lines).

**Invariant-per-`it` structure** (:35-70):
```ts
describe("DELETED_BLOG_REDIRECTS", () => {
	it("every source is a /blog/<slug> path", () => {
		for (const { source } of DELETED_BLOG_REDIRECTS) {
			expect(source).toMatch(/^\/blog\/[a-z0-9][a-z0-9-]*$/);
		}
	});

	it("sources are unique (no duplicate redirect rules)", () => {
		const sources = DELETED_BLOG_REDIRECTS.map((r) => r.source);
		expect(new Set(sources).size).toBe(sources.length);
	});

	it("never redirects a path to itself", () => {
		for (const { source, destination } of DELETED_BLOG_REDIRECTS) {
			expect(source).not.toBe(destination);
		}
	});

	it("no source shadows a live published post", () => {
		const collisions = DELETED_BLOG_REDIRECTS.filter((r) =>
			LIVE_PUBLISHED_SLUGS.has(r.source.replace("/blog/", "")),
		);
		expect(collisions).toEqual([]);
	});
});
```
Note `expect(collisions).toEqual([])` rather than `.toHaveLength(0)` — a failure prints the
offending entries. Copy that idiom for both guard sets.

**The critical delta the planner MUST honor (D-32 / CONTEXT Landmines):** the guard assertions are
an **equality** check on the source array, not a subset check. A `.not.toContain()` per guard path
passes even with a stale `/analytics/financial → /reports/analytics` entry present, because that
entry's *source* is in Guard B but a subset check would only catch it if written per-path — and the
CONTEXT is explicit that equality is the only structural defence. Write:
```ts
expect(REPORTING_REDIRECTS.map((r) => r.source)).toEqual([
	"/financials", "/financials/balance-sheet", "/financials/cash-flow",
	"/financials/expenses", "/financials/income-statement", "/financials/tax-documents",
	"/reports/analytics",
]);
```
plus the 3 Guard A and 7 Guard B `.not.toContain()` assertions on top (17 total per D-32), plus a
no-wildcard assertion (`expect(source).not.toMatch(/[:*(]/)`) — the ordering-shadow hazard exists
only under wildcards.

---

### 7. `tests/e2e/tests/public/reporting-redirects.spec.ts`

**Analog:** `tests/e2e/tests/public/routing-aliases.spec.ts` (whole file, 78 lines). Lands in the
`public` project, which CI **does** run (`--project=public`), and needs no auth because config
redirects fire at step 2 before proxy auth at step 3.

**Positive-assertion pattern** (:13-17) + the comment block that explains it (:4-11):
```ts
// Each redirect rule is asserted with two checks:
//  1. status code is 301 or 308 (Next.js permanent: true emits 308; we
//     accept either to avoid lock-in ...)
//  2. Location header matches the canonical destination exactly
// maxRedirects: 0 stops Playwright from auto-following.

test("CRIT-05: /signup 301/308s to /pricing", async ({ page }) => {
	const response = await page.request.get("/signup", { maxRedirects: 0 });
	expect([301, 308]).toContain(response.status());
	expect(response.headers().location).toBe("/pricing");
});
```

**Negative-assertion pattern** — the file already has the exact "this must NOT redirect" idiom the
10 guard paths need (:40-62):
```ts
// PUBUX-08: ... These assertions now guard against re-adding the speculative redirects.
test("PUBUX-08: /help-center 404s (speculative alias removed)", async ({ page }) => {
	const response = await page.request.get("/help-center", { maxRedirects: 0 });
	expect(response.status()).toBe(404);
});
```
For Guard A/B the assertion differs — those routes exist and are auth-gated, so an unauthenticated
request 307s to `/login`, it does not 404 and it does not 200. Assert
`expect([301, 308]).not.toContain(response.status())` (i.e. "no *permanent* redirect matched"), and
**document in the spec** the D-40 caveat: this proves "no config redirect matched", NOT "these are
live pages" — 4 of the 7 Guard B paths are themselves in-app redirect shims.

**Trailing-slash gotcha (RESEARCH, verified from `.next/routes-manifest.json`):** Next auto-injects
a `/:path+/ → /:path+` 308 as the FIRST redirect, so `/financials/cash-flow/` takes two hops.
Assert on the slash-less form only.

---

### 8. `tests/e2e/tests/reports-hub.spec.ts` (owner-axe)

**Analog:** `tests/e2e/tests/notifications.spec.ts` — the Phase 52 precedent, and the ONLY pattern
that actually gates a PR for an authenticated owner route (D-25).

**Location + auth pattern** (`notifications.spec.ts:1-2, 34-45`):
```ts
import { expect, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
...
/** Authenticate in-test and wait for the header bell island to mount. */
async function gotoAuthedDashboard(page: Page): Promise<void> {
	await loginAsOwner(page);
	await expect(bell(page)).toBeVisible({ timeout: 15000 });
}

test.describe("Notification center smoke (Phase 52)", () => {
	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});
```
Note the file sits at `tests/e2e/tests/` **root**, not under `tests/`+`owner/` — that is deliberate
(`**/owner/**` matches the non-CI `owner` project). Put the hub spec at the same level.

The file's own header comment records exactly why (`notifications.spec.ts:6-15`):
> "Runs under the `owner-axe` Playwright project (registered via that project's `testMatch` in
> playwright.config.ts), which CI invokes with `--project=owner-axe` in the `e2e-smoke` job.
> Authentication is performed in-test by `loginAsOwner` (NO storageState) ... A smoke that only
> matched the storageState `chromium` project would pass locally but never gate the PR."

**Registration — adding the file is NOT enough.** `tests/e2e/playwright.config.ts:170-182`:
```ts
{
	name: "owner-axe",
	use: { ...devices["Desktop Chrome"] },
	testMatch: [
		"**/owner/dashboard-a11y.e2e.spec.ts",
		"**/owner/dashboard-smoke.e2e.spec.ts",
		// Phase 52 notification-stack smoke — self-authenticates via
		// loginAsOwner (no storageState), so it gates the PR under CI's
		// `--project=owner-axe` e2e-smoke run rather than only matching the
		// non-CI `chromium` project.
		"**/notifications.spec.ts",
	],
},
```
Append `"**/reports-hub.spec.ts"` with a Phase 56 comment in the same style. Also check the
`chromium` project's `testIgnore` (:196-201) — the notifications spec is excluded there so it does
not double-execute; the hub spec needs the same exclusion.

**Per-route assertion pattern:** `tests/e2e/tests/owner/owner-financials.e2e.spec.ts:17-31` is the
existing route-loop for exactly these pages and is what gets retargeted:
```ts
const financialPages = [
	{ path: ROUTES.FINANCIALS_INCOME_STATEMENT, heading: "Income Statement" },
	{ path: ROUTES.FINANCIALS_CASH_FLOW, heading: "Cash Flow" },
	{ path: ROUTES.FINANCIALS_BALANCE_SHEET, heading: "Balance Sheet" },
	{ path: ROUTES.FINANCIALS_TAX_DOCUMENTS, heading: "Tax Documents" },
];

for (const page of financialPages) {
	test(`should render ${page.heading} page`, async ({ page: p }) => {
		await p.goto(page.path);
		await verifyPageLoaded(p, page.path, page.heading);
	});
```
**Budget warning (RESEARCH §CI budget):** `maxFailures: 1`, `retries: 2`, `workers: 2`,
`timeout: 30_000`, job `timeout-minutes: 15`. Keep the hub spec to one `describe` with a single
shared `loginAsOwner` and assert on `<h1>` presence only — 8 routes (index + 5 statements +
generate + year-end), not the 3-tests-per-page shape of the analog.

---

### 9. Static-invariant guard (recommended for D-34's "must be asserted as a test")

**Analog:** `src/hooks/api/__tests__/rent-ledger-money.test.ts` (:1-55) — the exact "recursively
scan source paths, fail on forbidden tokens" pattern, authored in Phase 55 for the identical
purpose (a grep-checkable invariant that must survive future edits).

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const LEDGER_PATHS: readonly string[] = [
	"src/lib/ledger",
	"src/components/ledger",
	// ...
];

const FORBIDDEN_MONEY_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
	{ name: "cents formatter (formatCents)", pattern: /formatCents\s*\(/ },
	{ name: "hundredfold multiply (* 100)", pattern: /\*\s*100/ },
	{ name: "hundredfold divide (/ 100)", pattern: /\/\s*100/ },
];
```
Two of its documented behaviours are load-bearing and must be carried over: **comments are stripped
before matching** (so a source comment restating the rule does not self-trigger), and **test files
are skipped** (so the guard's own fixture strings do not self-trigger).

For Phase 56, `SCAN_PATHS = ["src/app/(owner)/reports"]` and
`FORBIDDEN = [/from\s+["']recharts["']/, /ChartContainer/, /ResponsiveContainer/]` (D-34), plus the
money patterns if the summary strip lives under that tree. The same file can carry a "no bare
`Revenue` label under `/reports/**`" assertion for D-18.

---

## Move Conventions (the 38 relocated files)

### Route colocation

The repo colocates route-specific components **inside the route directory**, in two shapes that
both appear in the moving trees:

| Shape | Example | Count in the move |
|---|---|---|
| Flat siblings of `page.tsx` | `financials/cash-flow/cash-flow-header.tsx` | balance-sheet (5), cash-flow (7), income-statement (7) |
| `_components/` subdir | `financials/expenses/_components/expense-table.tsx` | expenses (4) |

Both survive the move unchanged — this phase does not normalize them. `analytics/financial/_components/`
is the parallel precedent for the `_components/` shape. Colocated tests keep their `__tests__/`
subdir (`financials/expenses/__tests__/expenses-csv.test.ts`,
`financials/income-statement/__tests__/income-statement-date-range.test.ts`).

### Layout metadata boundary

**Every moving route has its own `layout.tsx` and each exists solely to export metadata**, because
its `page.tsx` is `"use client"` and a client component cannot export `metadata`.
`financials/balance-sheet/layout.tsx` is the whole pattern:
```tsx
import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata("Balance Sheet");

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
```
All 5 statement layouts move verbatim. `financials/layout.tsx` is **deleted** (not moved) —
`reports/layout.tsx` already occupies that slot. `/reports/generate` and `/reports/year-end` have
no `layout.tsx` today and gain none.

### Loading / error boundary convention

These are **NOT** Next.js `loading.tsx` / `error.tsx` file-convention boundaries. Verified: there is
no `loading.tsx` or `error.tsx` anywhere in the `financials` or `reports` trees. They are plain
components branched on inside the client page:

`financials/page.tsx:50-61`:
```tsx
if (isLoading) {
	return <FinancialsLoading />;
}

if (error) {
	return (
		<FinancialsError
			error={error instanceof Error ? error : null}
			onRetry={() => void refetch()}
		/>
	);
}
```
Each moving statement route already has its own pair in the same shape
(`balance-sheet-skeleton.tsx` / `balance-sheet-error.tsx`, `cash-flow-loading.tsx` /
`cash-flow-error.tsx`, `income-statement-page-loading.tsx` / `income-statement-page-error.tsx`).
The move must not convert them to file-convention boundaries — that is unrequested new behaviour.

### Import-path rewrite scope after the move

Executed grep: the six `financials-*` components are imported by **`financials/page.tsx` and
nothing else**, and `#app/(owner)/financials` is imported from outside the tree **zero** times. All
intra-tree imports are relative (`./financials-error`, `./_components/expense-table`), so a
directory move needs **no import edits inside the moved trees**. The only import changes are the
non-route reference map (nav, palette, breadcrumbs, private-routes, tests).

---

## Deletion Coordinates (exact, verified this session)

### D-35 — the fabricated A/R tile

`src/app/(owner)/financials/financials-summary-stats.tsx` — remove **three** things:
- `:34` the prop declaration `accountsReceivable: number;`
- `:43` the destructured `accountsReceivable,`
- `:115-134` the whole fourth `<BlurFade delay={0.3} inView>` block:
```tsx
<BlurFade delay={0.3} inView>
	<Stat className="relative overflow-hidden">
		{accountsReceivable > 0 && (
			<BorderBeam size={100} duration={8} colorFrom="var(--color-warning)" ... />
		)}
		<StatLabel>Outstanding</StatLabel>
		<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
			${formatUsd(accountsReceivable)}
		</StatValue>
		<StatIndicator variant="icon" color="warning"><Clock /></StatIndicator>
		<StatDescription>accounts receivable</StatDescription>
	</Stat>
</BlurFade>
```
**Cascades:** `Clock` becomes an unused import (`:1`) → `noUnusedLocals` failure. The grid at `:48`
is `grid-cols-2 lg:grid-cols-4` for four tiles → becomes 3, so the class needs updating. The caller
`financials/page.tsx:45` (`const accountsReceivable = ...`) and `:71` (the prop pass) go with it.

`src/hooks/api/query-keys/financial-keys.ts:148-155` — remove one line:
```ts
return {
	overview: {
		total_revenue: totalRevenue,
		total_expenses: totalExpenses,
		net_income: totalRevenue - totalExpenses,
		accounts_receivable: monthlyRevenue,   // ← :153 DELETE (D-35)
		accounts_payable: 0,                   // ← :154 hardcoded 0, deferred not deleted
	},
```
**Cascade:** `accounts_receivable` also appears in the `!user?.id` early-return literal at `:126`
and in the `FinancialOverviewData` type. `monthlyRevenue` (`:143`) is still used by the
`highlights` array at `:157`, so it stays. `accounts_payable` is explicitly **deferred**, not part
of this phase.

### D-37 — the two broken export rows

**CONTEXT D-37's line numbers are off by one indirection — correct coordinates:**

`src/lib/reports/report-data.ts:250-274` is `executiveKeyMetricsRows`; the two rows are at
**:268-272** (CONTEXT says 412-416, which is the *call site*, not the rows):
```ts
		{ label: "Occupied Units", value: `${fmtNumber(occupancy.occupiedUnits)} of ${fmtNumber(occupancy.totalUnits)}` },
		{ label: "Total Payments", value: fmtNumber(payments.totalPayments) },        // :268 DELETE
		{                                                                             // :269-272 DELETE
			label: "Successful Payments",
			value: fmtNumber(payments.successfulPayments),
		},
	];
```

`report-data.ts:379-383` — the fetch (CONTEXT's line numbers are correct here):
```ts
		safeFetch(
			qc,
			reportAnalyticsQueries.paymentAnalytics(start, end),
			PAYMENTS_FALLBACK,
		),
```

**Four cascades the planner must handle, or `noUnusedLocals`/`noUnusedParameters` fails the build:**
1. `:253` the `payments: ReportPaymentAnalytics,` parameter of `executiveKeyMetricsRows` becomes
   unused → remove the param (and the `payments.data` arg at `:415`).
2. `:145-153` `const PAYMENTS_FALLBACK: ReportPaymentAnalytics = {...}` becomes dead → delete.
3. `:25` the `ReportPaymentAnalytics` type import becomes unused → remove from the import list.
4. `:393` destructures `const [financial, occupancy, payments, monthly] = ...` and `:405` uses
   `payments.available` in the `allAvailable` conjunction → both must drop the `payments` element.
   `fetchExecutiveMonthly` returns a positional `Promise.all` tuple, so removing element 3 shifts
   `monthly` from index 3 to index 2.

**Note `reportAnalyticsQueries.paymentAnalytics` itself is NOT deleted** — the factory in
`report-analytics-keys.ts` stays; this phase removes its last three consumers
(`analytics-stats-row.tsx`, `analytics-payment-methods-chart.tsx`, `report-data.ts`), leaving the
factory orphaned. Flag that for a follow-up rather than expanding scope.

### D-36 — `/reports/analytics/` (6 files)

Whole directory `src/app/(owner)/reports/analytics/`. No `layout.tsx` exists there (it inherits
`reports/layout.tsx`), so it is exactly 6 deletions. No external importer of any of the 5 children.

---

## Shared Patterns

### Query keys (ZT-9) — no new key needed

**Source:** `src/hooks/api/use-owner-dashboard-financial.ts:205-224` + `:241-243`
**Apply to:** the summary strip only.

The `get_collection_rate` payload already has a `queryOptions()` factory and a `useCollectionRate()`
hook. **This phase creates no query key.** The hub index tile grid has zero data dependencies
(UI-SPEC: "the tile grid has no hooks, no `useQuery`, no `supabase` import"), and there are no
mutations, so the `ownerDashboardKeys.all` invalidation rule does not bite.

### Money boundary

**Source:** `src/components/ledger/ledger-balance-strip.tsx:10-12` + `:76`
**Apply to:** every figure on the new hub index.
```
 * MONEY (D-00): dollars straight from the RPC through `formatCurrency`, with
 * `tabular-nums` so the three cards line up. No scaling anywhere.
...
	value={summary ? formatCurrency(summary.balance) : null}
```
`formatCurrency` from `#lib/utils/currency`. Any `* 100`, `/ 100` or `formatCents` on these values
is the v8.0 MONEY-01/02 100× bug class. `financials-summary-stats.tsx:12-23` carries a comment
documenting a previous instance of exactly this bug on this exact surface — worth reading before
touching the moved file.

### Semantic color tokens (WCAG companion rule)

**Source:** `ledger-balance-strip.tsx:77` and `collection-rate-kpi.tsx:128-129`
```tsx
valueClassName={isOwed ? "text-destructive-text" : "text-success-text"}
...
// Vivid token on an ICON glyph only — text keeps AA-safe tokens.
const iconColor = status?.color ?? "text-muted-foreground";
```
**Apply to:** Collected (`text-success-text` when > 0) and Outstanding (`text-warning-text` when
> `CENT_TOLERANCE`). Never bare `text-success` / `text-warning` on a text run.
**Counter-example — do NOT copy from the moving files:** `financials-summary-stats.tsx:60`
(`text-emerald-600 dark:text-emerald-400`), `:77` (`text-red-600 dark:text-red-400`), `:126`
(`text-amber-600`), and `financials-quick-links.tsx:49,52` all use raw Tailwind palette classes that
bypass the oklch token system. Those move as-is (the phase moves, it does not repair), but the
**new** hub components must not replicate them.

### Icons

`lucide-react` only, `aria-hidden="true"` on decorative glyphs
(`ledger-balance-strip.tsx:44`, `collection-rate-kpi.tsx:146`), sized with `h-4 w-4` / `size-4`
inline or `size-5` in a `size-10` medallion.

### Test idioms

- `vi.hoisted()` for any mock variable referenced in `vi.mock()` —
  `collection-rate-kpi.test.tsx:16-25` is the working example on the exact hook the strip uses:
  ```ts
  const useCollectionRateMock = vi.hoisted(() => vi.fn());
  vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
      useCollectionRate: useCollectionRateMock,
  }));
  import { CollectionRateKpi } from "#components/ledger/collection-rate-kpi";
  ```
  Note the import of the component under test comes AFTER the `vi.mock` call.
- A `mockResult(overrides)` helper with sane defaults (`collection-rate-kpi.test.tsx:29-42`) so each
  `it` states only the delta it cares about.
- Header comment enumerating the pinned contract as a bullet list
  (`collection-rate-kpi.test.tsx:1-11`) — the house style for invariant tests.
- Assert the anti-value too: `expect(screen.queryByText("9500%")).not.toBeInTheDocument()` (:58) is
  the 100×-scaling pin. The strip's test should carry the same shape for Scheduled/Collected.

### Non-route reference map (the "second route table" trap)

Three files carry route tables that must move in lockstep with the nav, and `app-shell.tsx` carries
its own comment (`:167-171`) recording that a prior review already caught this class of miss once:

| File | Coordinates | Change |
|---|---|---|
| `src/components/shell/main-nav.tsx` | `:74-86` `Financials` section | delete; children re-home under `Reports` `:70-73`. **`:54-67` `Analytics` untouched, including `{ label: "Financial", href: "/analytics/financial" }` at `:58`.** |
| `src/components/shell/main-nav.tsx` | `:188-191` `isActive` | **DO NOT TOUCH.** `pathname.startsWith(href)` is already correct — `/reports` and `/analytics` share no prefix (D-07 REVISED). |
| `src/components/shell/app-shell.tsx` | `:140-160` the whole `Financials` heading group (5 items) | repoint to `/reports/*` and fold into the `Analytics & Reports` group. **All six `/analytics/*` rows at `:107-136` stay.** No `/financials/expenses` row exists — that is why 6 redirect sources map to 5 palette rows. |
| `src/lib/breadcrumbs.ts` | `:23-28` Financials block | drop `financials: "Financials"`; add `expenses` + `"year-end": "Year-End"`. Keep `analytics` (:11), `financial` (:12), `reports` (:13) — all three stay live. |
| `src/lib/routes/private-routes.ts` | `:12` | remove `"/financials"`. **KEEP `"/analytics"` (:8)** — removing it un-gates 7 owner routes in BOTH `proxy.ts` and `robots.ts`. Highest-consequence line in the diff. `src/app/robots.test.ts` imports the array rather than duplicating it, so it auto-follows with no edit. |

---

## Conflicts and Corrections for the Planner

**CONFLICT-1 — two competing specs for the `/reports` index strip.** D-35 says
`financials-summary-stats.tsx` "moves and becomes the `/reports` index strip … DROP the
`accountsReceivable` prop and its `Stat`." D-30 + UI-SPEC say the index strip is a NEW three-tile
Scheduled / Collected / Outstanding component built on the `ledger-balance-strip.tsx` shape from a
single `get_collection_rate` payload. These are different components with different data sources
(`get_financial_overview` vs `get_collection_rate`) and different labels. They cannot both be "the
index strip." The UI-SPEC is the later and more specific artifact and its strip is what D-30
selected by name; the D-35 excision is still required regardless (it is a claims fix on a file
being moved). **The planner must resolve which of the two renders on `/reports`, and where — if
anywhere — the moved `reports-summary-stats.tsx` is mounted at all.** Note that after `financials/page.tsx`
is deleted, all six moved `financials-*` components have **zero** importers (verified grep), so
"move and rename" without a mount point ships six dead files, which violates ZT-4's spirit.

**CONFLICT-2 — a stale in-app link to the deleted route.**
`src/components/maintenance/maintenance-view.client.tsx:119` does
`router.push("/reports/analytics")`. RESEARCH lists this under "VERIFIED SAFE — target path
unchanged by this phase," which was true pre-full-separation and is now **false**: D-29 deletes
that route. Post-phase this client push would 308 to `/analytics/overview` (functional, but a
wasted hop from an in-app navigation, which config redirects exist to fix for *external* links, not
internal ones). Retarget it to `/analytics/overview`. This is one line and it is inside the phase's
own deletion blast radius, not scope creep.

**CORRECTION-3 — D-37's line numbers.** CONTEXT D-37 cites `report-data.ts:412-416` for the two
broken rows. `:412-416` is the *call site*; the rows are at `:268-272` inside
`executiveKeyMetricsRows` (`:250-274`). The `paymentAnalytics` fetch citation (`:379-383`) is
correct.

**CORRECTION-4 — RESEARCH's E2E counts are pre-full-separation.** RESEARCH §"What RPTHUB-04
concretely requires" says "7 positive + 10 negative — 4 identity paths (Guard A) and 6 unmoved
`/analytics/*` (Guard B)" and "9 hub routes." Under D-32 it is **3** Guard A + **7** Guard B
(still 10 total, different membership) and **8** hub routes (index + 5 statements + generate +
year-end — `/reports/analytics` is gone). RESEARCH's own correction table (S2-4, S2-5) has the right
numbers; the E2E section was not updated to match.

**CORRECTION-5 — `PREMIUM_REPORT_TYPES` re-verified this session, no drift.** Both sets are
byte-identical 5-member sets: `export-report/index.ts:24-30` (gate at `:72`) and
`generate-pdf/index.ts:31-37` (gate at `:322`). `generate-pdf:26-30` carries the comment explaining
why the mirror exists. The drift-guard unit test must read these from disk with `node:fs` (Deno
sources are not importable from Vitest); `src/app/robots.test.ts` is the in-repo precedent for a
source-of-truth-importing drift guard.

---

## No Analog Found

None. Every created file has an exact-role in-repo analog. The only genuinely novel piece of
composition is the **two-group tile grid on an RSC shell with a single client island**, and both
halves exist separately (`documents/vault/page.tsx` for the shell/island split,
`report-card-grid.tsx` + `financials-quick-links.tsx` for the grouped tile grid) — the planner
composes them rather than inventing anything.

---

## Metadata

**Analog search scope:** `src/app/(owner)/{financials,reports,analytics,documents,notifications}/`,
`src/components/{ledger,shell,reports,ui}/`, `src/lib/{seo,reports,routes,breadcrumbs}`,
`src/hooks/api/{query-keys,use-owner-dashboard-financial}`, `tests/e2e/{tests/public,tests/owner,tests}`,
`supabase/functions/{export-report,generate-pdf}`, `next.config.ts`, `tests/e2e/playwright.config.ts`
**Files scanned:** 41 read, ~180 enumerated
**Project skills checked:** `.claude/skills/` and `.agents/skills/` → `migrate-radix-to-base`,
`shadcn` — neither applies (this phase fetches no registry blocks and touches no radix primitive)
**Pattern extraction date:** 2026-07-30
