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

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{figures.map((figure) => (
				<Card key={figure.label}>
					<CardHeader>
						<CardDescription>{figure.label}</CardDescription>
						<CardTitle className={cn("typography-h3", figure.className)}>
							{figure.value ?? <Skeleton className="h-lh w-24" />}
						</CardTitle>
					</CardHeader>
				</Card>
			))}
		</div>
	);
}
