/**
 * The `/reports` hub directory — 7 entries in 2 groups (D-31).
 *
 * Route-colocated typed data module, mirroring the shape of
 * `generate/components/report-types.ts`. This is NOT a barrel file (ZT-2): it
 * declares its own data and re-exports nothing.
 *
 * D-29 FULL SEPARATION: `/reports` holds financial statements and exports
 * ONLY. There is no Analytics group and no Analytics tile — every chart lives
 * under `/analytics`, which is a peer section this phase does not touch.
 *
 * D-30: tiles carry NO figures. The only data on the hub index is the summary
 * strip, so no entry has a `value` or `trend` field.
 */

import type { LucideIcon } from "lucide-react";
import {
	Building2,
	CalendarRange,
	Download,
	FileSpreadsheet,
	FileText,
	Receipt,
	TrendingUp,
} from "lucide-react";
import { PREMIUM_REPORT_SLUGS } from "#lib/reports/premium-report-slugs";

export type ReportsHubGroupId = "statements" | "exports";

export interface ReportsHubEntry {
	id: string;
	group: ReportsHubGroupId;
	title: string;
	href: string;
	icon: LucideIcon;
	description: string;
	/**
	 * The `reportType` this entry's CTA sends to the export edge functions, or
	 * `null` when the CTA reaches no edge call at all. Drives the `Growth`
	 * badge via `hasGrowthBadge` — never a client-side gate.
	 */
	gatedReportType: string | null;
}

export interface ReportsHubGroup {
	id: ReportsHubGroupId;
	headingId: string;
	title: string;
	description: string;
}

/** Statements first, then Exports: what happened, then give me the file. */
export const REPORTS_HUB_GROUPS: readonly ReportsHubGroup[] = [
	{
		id: "statements",
		headingId: "reports-statements",
		title: "Statements",
		description: "Accounting views of your portfolio for a period you choose.",
	},
	{
		id: "exports",
		headingId: "reports-exports",
		title: "Exports",
		description:
			"Produce a file to hand to your accountant, lender, or partner.",
	},
];

export const REPORTS_HUB_ENTRIES: readonly ReportsHubEntry[] = [
	{
		id: "income-statement",
		group: "statements",
		title: "Income Statement",
		href: "/reports/income-statement",
		icon: FileText,
		description: "What came in, what went out, and what's left for a period.",
		gatedReportType: null,
	},
	{
		id: "cash-flow",
		group: "statements",
		title: "Cash Flow",
		href: "/reports/cash-flow",
		icon: TrendingUp,
		// Not "month over month, with running balances": the page renders ONE
		// period, and `beginningCash` is a hardcoded 0 in both branches of
		// `financialQueries.cashFlow`, so no balance is ever carried forward.
		description: "Where cash came from and where it went, for a period.",
		gatedReportType: null,
	},
	{
		id: "balance-sheet",
		group: "statements",
		title: "Balance Sheet",
		href: "/reports/balance-sheet",
		icon: Building2,
		description: "A point-in-time snapshot of assets, liabilities, and equity.",
		gatedReportType: null,
	},
	{
		id: "expenses",
		group: "statements",
		title: "Expenses",
		href: "/reports/expenses",
		icon: Receipt,
		description:
			"Every operating and maintenance cost, by category and property.",
		gatedReportType: null,
	},
	{
		id: "tax-documents",
		group: "statements",
		title: "Tax Documents",
		href: "/reports/tax-documents",
		icon: FileSpreadsheet,
		description: "Year-end forms and schedules ready for your accountant.",
		gatedReportType: "financial",
	},
	{
		id: "generate",
		group: "exports",
		title: "Generate Reports",
		href: "/reports/generate",
		icon: Download,
		description: "Build a PDF or Excel report from a date range.",
		gatedReportType: null,
	},
	{
		id: "year-end",
		group: "exports",
		title: "Year-End",
		href: "/reports/year-end",
		icon: CalendarRange,
		description: "Annual income, expenses, and 1099-NEC vendor data.",
		gatedReportType: "year-end",
	},
];

/**
 * DERIVED, never hardcoded: an entry is badged only when its CTA provably
 * reaches a gated `reportType` (56-UI-SPEC Tier Gate Contract). Deriving it
 * means a change to the edge functions' gated set cannot leave a stale badge
 * making a false claim about what Growth unlocks.
 */
export function hasGrowthBadge(entry: ReportsHubEntry): boolean {
	return (
		entry.gatedReportType !== null &&
		PREMIUM_REPORT_SLUGS.has(entry.gatedReportType)
	);
}
