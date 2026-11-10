import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";
import type { OwnerPaymentSummaryResponse } from "#types/api-contracts";

interface OwnerPaymentSummaryProps {
	/**
	 * `get_billing_insights`' figures: dollars from the rent ledger, and counts.
	 * Undefined while they load, which renders a skeleton per figure.
	 */
	summary: OwnerPaymentSummaryResponse | undefined;
	/**
	 * The read failed. With no summary to show, the cards say so instead of
	 * rendering zeros an owner would take for real figures.
	 */
	isError?: boolean;
}

export function OwnerPaymentSummary({
	summary,
	isError = false,
}: OwnerPaymentSummaryProps) {
	if (summary === undefined && isError) {
		return (
			<p className="text-sm text-muted-foreground">
				Couldn&apos;t load the payment summary.
			</p>
		);
	}

	const figures = [
		{
			label: "Late fees cumulative",
			value: summary && formatCurrency(summary.lateFeeTotal),
			className: "text-destructive-text",
		},
		{
			label: "Unpaid invoice total",
			value: summary && formatCurrency(summary.unpaidTotal),
		},
		{
			label: "Outstanding invoices",
			value: summary && String(summary.unpaidCount),
		},
		{
			label: "Tenants monitored",
			value: summary && String(summary.tenantCount),
		},
	];

	// The columns step on the row's own width, never the viewport's (66.2-39
	// fix round 4, Part 8c): one until two cards hold the longest label on one
	// line and $1,234,567.00, four from where four do. Four at lg with the rail
	// expanded wrapped "Late fees cumulative" beside one-line labels and put
	// its figure 20px below theirs (1024-1088px).
	return (
		<div className="@container/payment-summary">
			<div className="grid grid-cols-1 gap-4 @min-[24.5rem]/payment-summary:grid-cols-2 @min-[49.5rem]/payment-summary:grid-cols-4">
				{figures.map((figure) => (
					<Card key={figure.label}>
						<CardHeader>
							<CardDescription>{figure.label}</CardDescription>
							<CardTitle
								className={cn(
									"typography-h3 whitespace-nowrap",
									figure.className,
								)}
							>
								{figure.value ?? <Skeleton className="h-lh w-24" />}
							</CardTitle>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
