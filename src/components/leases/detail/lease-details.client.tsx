"use client";

import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	CalendarDays,
	Clock,
	CreditCard,
	DollarSign,
} from "lucide-react";
import { DocumentsSection } from "#components/documents/documents-section";
import { LedgerTab } from "#components/ledger/ledger-tab";
import { Card, CardContent } from "#components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs";
import {
	type LeaseDetailRow,
	leaseQueries,
} from "#hooks/api/query-keys/lease-keys";
import { useCancelSignatureRequestMutation } from "#hooks/api/use-lease-signature-mutations";
import { formatCount } from "#lib/formatters/count";
import { getOrdinalSuffix } from "#lib/formatters/date";
import { createLogger } from "#lib/frontend-logger";
import { formatCurrency } from "#lib/utils/currency";
import { generateTimelineEvents } from "./lease-detail-utils";
import { LeaseDetailsSkeleton } from "./lease-details-skeleton";
import { LeaseDetailsTab } from "./lease-details-tab";
import { LeaseHeader } from "./lease-header";
import { LeaseSidebar } from "./lease-sidebar";
import { LeaseTermsTab } from "./lease-terms-tab";
import { LeaseTimelineTab } from "./lease-timeline-tab";

interface LeaseDetailsProps {
	id: string;
}

const logger = createLogger({ component: "LeaseDetails" });

/** The unit's property's street address, for the rent-increase notice. */
function propertyAddress(unit: LeaseDetailRow["unit"]): string | null {
	const property = unit?.property;
	if (!property) return null;
	const line1 = property.address_line1.trim();
	const cityState = [property.city.trim(), property.state.trim()]
		.filter(Boolean)
		.join(", ");
	const parts = [line1, cityState].filter(Boolean);
	return parts.length > 0 ? parts.join(", ") : null;
}

export function LeaseDetails({ id }: LeaseDetailsProps) {
	const {
		data: lease,
		isLoading,
		isError,
		error,
	} = useQuery(leaseQueries.detail(id));
	const cancelSignature = useCancelSignatureRequestMutation();

	if (isLoading) {
		return <LeaseDetailsSkeleton />;
	}

	if (isError || !lease) {
		logger.error("Failed to load lease details", {
			action: "loadLeaseDetails",
			error,
		});

		// Determine error message based on error type
		const is404 = error && "status" in error && error.status === 404;
		const errorMessage = is404
			? "This lease does not exist or you do not have permission to view it."
			: "Something went wrong while loading this lease. Please refresh and try again.";

		return (
			// The Card pads itself (py-6, CardContent px-6): a v3 p-6 here doubled
			// the top and bottom. mb-0: the message is the last child.
			<Card className="border-destructive/50 bg-destructive/10">
				<CardContent className="text-center">
					<AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
					<h3 className="text-lg font-semibold text-destructive-text mb-2">
						Unable to load lease
					</h3>
					<p className="mb-0 text-muted-foreground">{errorMessage}</p>
				</CardContent>
			</Card>
		);
	}

	const handleCancelSignature = async () => {
		await cancelSignature.mutateAsync(lease.id);
	};

	const timelineEvents = generateTimelineEvents(lease);
	// The tenant and the unit come from the lease's own embeds. The tenant and
	// unit lists hold only the 50 newest non-inactive rows, so a lease on an
	// owner's 51st tenant or unit, or a deleted one, found neither there: no
	// tenant, unit card or View Unit link, no Send for Signature on a draft.
	const { tenant, unit } = lease;

	return (
		<div className="@container/lease-detail space-y-6">
			{/* Header with status and actions */}
			<LeaseHeader
				lease={lease}
				tenant={tenant}
				unitName={unit?.unit_number ?? null}
				propertyName={unit?.property?.name ?? null}
				propertyAddress={propertyAddress(unit)}
				onCancelSignature={handleCancelSignature}
				isCancelling={cancelSignature.isPending}
			/>

			{/* Main content grid. Its columns step on the page's own width, not
			    the viewport's: at lg with the rail expanded the sidebar column
			    was 210px, and its Maintenance Requests button's label ran
			    8.69px past the button (66.2-39 fix round 4, Part 8e). Three
			    columns from 56rem, where the sidebar is 282.67px (at 1280 with
			    the rail expanded, 320px; at 1024, one column). */}
			<div className="grid grid-cols-1 gap-6 @min-[56rem]/lease-detail:grid-cols-3">
				{/* Left column - Main details */}
				<div className="@min-[56rem]/lease-detail:col-span-2 space-y-6">
					{/* Key metrics: 16px tiles, py-4 on the Card and px-4 on its
					    content (the v4 Card pads itself; a v3 p-4 here added to
					    it). mb-0: each figure is its tile's last child. The columns
					    step on this column's own width, which the rail and the
					    sidebar beside it set (66.2-39 fix round 4, Part 8c): two
					    once a tile holds Security Deposit's label on one line and
					    $1,234,567.00 (130.44px), four once four do. At lg the grid
					    put four in two-thirds of the page: at 1024 with the rail
					    expanded a tile held 109px, owner A's $1,500.00 overflowed
					    it, and Security Deposit wrapped, shrinking its icon to 11px
					    and dropping its figure 20px below the others'. */}
					<div className="@container/lease-metrics">
						<div className="grid grid-cols-1 gap-4 @min-[22.5rem]/lease-metrics:grid-cols-2 @min-[45.5rem]/lease-metrics:grid-cols-4">
							<Card className="py-4">
								<CardContent className="px-4">
									<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
										<DollarSign className="w-4 h-4 shrink-0" />
										Monthly Rent
									</div>
									<p className="mb-0 whitespace-nowrap text-xl font-semibold tabular-nums">
										{formatCurrency(lease.rent_amount)}
									</p>
								</CardContent>
							</Card>
							<Card className="py-4">
								<CardContent className="px-4">
									<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
										<CreditCard className="w-4 h-4 shrink-0" />
										Security Deposit
									</div>
									<p className="mb-0 whitespace-nowrap text-xl font-semibold tabular-nums">
										{formatCurrency(lease.security_deposit)}
									</p>
								</CardContent>
							</Card>
							<Card className="py-4">
								<CardContent className="px-4">
									<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
										<CalendarDays className="w-4 h-4 shrink-0" />
										Payment Day
									</div>
									<p className="mb-0 whitespace-nowrap text-xl font-semibold">
										{lease.payment_day
											? `${lease.payment_day}${getOrdinalSuffix(lease.payment_day)} of month`
											: "N/A"}
									</p>
								</CardContent>
							</Card>
							<Card className="py-4">
								<CardContent className="px-4">
									<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
										<Clock className="w-4 h-4 shrink-0" />
										Grace Period
									</div>
									<p className="mb-0 whitespace-nowrap text-xl font-semibold">
										{lease.grace_period_days
											? formatCount(lease.grace_period_days, "day")
											: "None"}
									</p>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Tabbed content */}
					<Tabs defaultValue="details" className="w-full">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="ledger">Ledger</TabsTrigger>
							<TabsTrigger value="timeline">Timeline</TabsTrigger>
							<TabsTrigger value="terms">Terms</TabsTrigger>
						</TabsList>

						<TabsContent value="details" className="mt-4">
							<LeaseDetailsTab lease={lease} tenant={tenant} unit={unit} />
						</TabsContent>

						<TabsContent value="ledger" className="mt-4">
							{/* No ledger_start_date means the owner has not started tracking
							    this lease, so the tab shows its empty state instead of an
							    all-zero ledger (D-04). */}
							<LedgerTab
								leaseId={lease.id}
								isTracked={lease.ledger_start_date != null}
							/>
						</TabsContent>

						<TabsContent value="timeline" className="mt-4">
							<LeaseTimelineTab events={timelineEvents} />
						</TabsContent>

						<TabsContent value="terms" className="mt-4">
							<LeaseTermsTab lease={lease} />
						</TabsContent>
					</Tabs>
				</div>

				{/* Right column - Sidebar */}
				<LeaseSidebar lease={lease} unit={unit} />
			</div>

			<DocumentsSection entityType="lease" entityId={lease.id} />
		</div>
	);
}
