/**
 * The `/reports` hub index — a summary strip over a directory of 7 destinations
 * in 2 labelled groups (D-30, D-31).
 *
 * SERVER COMPONENT. No `"use client"`, no hooks, no `dynamic()` import. The one
 * and only client island is `<ReportsSummaryStrip />`, which is also the page's
 * one and only data dependency (D-30). The tile grid fetches nothing and does
 * not know the viewer's tier — the `Growth` badge is derived statically from
 * `hasGrowthBadge`, so no subscription state can leak into server-rendered HTML.
 *
 * D-34 ZERO CHARTS: no charting library or chart primitive may be imported
 * anywhere under `src/app/(owner)/reports/**`. The four chart-bearing sections
 * this page used to dynamic-import are deleted, not relocated — moving them
 * anywhere inside `/reports` would violate the same invariant. The exact banned
 * identifiers and the enforcement live in `__tests__/reports-hub-purity.test.ts`;
 * they are deliberately not spelled out here, so that a repo-wide grep for them
 * returns only real violations.
 *
 * No error boundary wraps the tile grid: the strip degrades in place, and an
 * outer boundary would let a strip failure remove the directory, which is this
 * page's fallback purpose.
 */

import { ReportHubTile } from "./report-hub-tile";
import { REPORTS_HUB_ENTRIES, REPORTS_HUB_GROUPS } from "./reports-hub-entries";
import { ReportsSummaryStrip } from "./reports-summary-strip";

export default function ReportsPage() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full space-y-8">
			<div>
				<h1 className="typography-h1">Reports</h1>
				<p className="text-sm text-muted-foreground">
					Every financial statement and export in one place.
				</p>
			</div>

			<ReportsSummaryStrip />

			{REPORTS_HUB_GROUPS.map((group) => (
				<section
					key={group.id}
					aria-labelledby={group.headingId}
					className="flex flex-col gap-4"
				>
					<div>
						<h2 id={group.headingId} className="font-semibold text-foreground">
							{group.title}
						</h2>
						<p className="text-sm text-muted-foreground">{group.description}</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{REPORTS_HUB_ENTRIES.filter(
							(entry) => entry.group === group.id,
						).map((entry) => (
							<ReportHubTile key={entry.id} entry={entry} />
						))}
					</div>
				</section>
			))}
		</div>
	);
}
