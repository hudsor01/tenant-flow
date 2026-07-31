/**
 * The uniform `/reports` hub tile — one shape for all 7 entries (D-31).
 *
 * Presentational and Server-Component-safe: no client directive, no hooks, no
 * data dependency. Uniformity IS the design; the summary strip is the page's
 * only visual anchor and its only data dependency (D-30), so nothing here
 * renders a figure.
 *
 * Accent budget (56-UI-SPEC Color): the medallion is neutral. Primary is spent
 * on hover and the global focus ring only.
 */

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "#components/ui/badge";
import { hasGrowthBadge, type ReportsHubEntry } from "./reports-hub-entries";

export function ReportHubTile({ entry }: { entry: ReportsHubEntry }) {
	const Icon = entry.icon;
	const isGated = hasGrowthBadge(entry);

	return (
		<Link
			href={entry.href}
			className="group bg-card border border-border rounded-lg p-5 hover:bg-muted/50 hover:border-primary/30 transition-colors"
		>
			<div className="flex items-start justify-between mb-4">
				<div className="size-10 rounded-lg bg-muted flex items-center justify-center">
					<Icon className="size-5 text-foreground" aria-hidden="true" />
				</div>
				{isGated ? (
					<Badge variant="outline">
						<Sparkles className="size-3" aria-hidden="true" />
						Growth
					</Badge>
				) : (
					<ArrowRight
						className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
						aria-hidden="true"
					/>
				)}
			</div>
			<h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
			<p className="text-sm text-muted-foreground">{entry.description}</p>
		</Link>
	);
}
