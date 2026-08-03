/**
 * The `/documents` hub tile — one shape at two size rungs (65-UI-SPEC §I-7).
 *
 * This varies `../reports/report-hub-tile.tsx` by exactly two rungs — the
 * medallion size and the card padding — and drops the badge, because there is
 * no tier gate on this surface to badge. Everything else is deliberately
 * identical, so the two hubs read as one system.
 *
 * Presentational and Server-Component-safe: no client directive, no hooks, no
 * data dependency.
 *
 * Whole-card `<Link>`, no nested interactive element (§I-4): the medallion icon
 * and the `ArrowRight` are decorative and `aria-hidden`, so the card is a
 * single tab stop announcing the title and description.
 *
 * Accent budget (§I-9): this medallion is NEUTRAL `bg-muted` with a
 * `text-foreground` glyph. `bg-primary/10` appears on `/documents` exactly once
 * — on the Band 1 vault medallion, which lives in `page.tsx`, not here.
 */

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "#lib/utils";
import type { DocumentsHubEntry } from "./documents-hub-entries";

export function DocumentHubTile({
	entry,
	size,
}: {
	entry: DocumentsHubEntry;
	/** "md" = Band 2 rung (p-5 / size-10 medallion); "sm" = Band 3 rung (p-4 / size-8). */
	size: "md" | "sm";
}) {
	const Icon = entry.icon;
	const isMedium = size === "md";

	return (
		<Link
			href={entry.href}
			className={cn(
				"group bg-card border border-border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-colors",
				isMedium ? "p-5" : "p-4",
			)}
		>
			<div className="flex items-start justify-between mb-4">
				<div
					className={cn(
						"rounded-lg bg-muted flex items-center justify-center",
						isMedium ? "size-10" : "size-8",
					)}
				>
					<Icon
						className={cn("text-foreground", isMedium ? "size-5" : "size-4")}
						aria-hidden="true"
					/>
				</div>
				<ArrowRight
					className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
					aria-hidden="true"
				/>
			</div>
			<h3 className="text-base font-semibold text-foreground mb-1">
				{entry.title}
			</h3>
			<p className="text-sm text-muted-foreground">{entry.description}</p>
		</Link>
	);
}
