/**
 * Lease Creation Wizard - Step 4: Review
 * Summary of all entered data before submission
 */

import {
	Calendar,
	CheckCircle2,
	DollarSign,
	FileText,
	Home,
	PawPrint,
	User,
	Zap,
} from "lucide-react";
import { Badge } from "#components/ui/badge";
import { Separator } from "#components/ui/separator";
import { formatCount } from "#lib/formatters/count";
import { formatDate, getOrdinalSuffix } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";
import type { LeaseWizardData } from "#lib/validation/lease-wizard.schemas";
import { utilityLabel } from "./utility-options";

// Format a dollar amount to currency, returning '-' for null/undefined
const formatAmountOrDash = (amount?: number | null) =>
	typeof amount === "number" ? formatCurrency(amount) : "-";

// The term grids step on the step's own width, never the viewport's: at 320px
// a fixed three-column grid left 44.66px a term, so $1,500.00 (80.66px) ran
// into the next term. One column until two terms of 9rem fit beside the
// 1.5rem indent, three for the financial terms once three do; a value wraps
// inside its term (a long property name is one unbroken word) (66.2-39 fix
// round 4, Part 8e).
const TERMS =
	"grid grid-cols-1 gap-4 pl-6 @min-[20rem]/review-step:grid-cols-2";
const TERMS_3 = `${TERMS} @min-[30rem]/review-step:grid-cols-3`;

interface ReviewStepProps {
	data: Partial<LeaseWizardData>;
	propertyName?: string | undefined;
	unitNumber?: string | undefined;
	tenantName?: string | undefined;
}

export function ReviewStep({
	data,
	propertyName,
	unitNumber,
	tenantName,
}: ReviewStepProps) {
	const formatLeaseDate = (dateStr: string | undefined) =>
		dateStr ? formatDate(dateStr, { style: "long" }) || "-" : "-";

	return (
		<div className="@container/review-step space-y-6">
			<div>
				<h3 className="text-lg font-medium mb-4">Review Lease Details</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Please review all information before creating the draft lease.
				</p>
			</div>

			{/* Property & Tenant */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Home className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Property & Tenant</h4>
				</div>
				<div className={TERMS}>
					<div>
						<p className="text-sm text-muted-foreground">Property</p>
						<p className="mb-0 font-medium wrap-break-word">
							{propertyName || "Not selected"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Unit</p>
						<p className="mb-0 font-medium wrap-break-word">
							{unitNumber || "Not selected"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Tenant</p>
						<p className="mb-0 font-medium wrap-break-word">
							{tenantName || "Not selected"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Governing State</p>
						<p className="mb-0 font-medium wrap-break-word">
							{data.governing_state || "TX"}
						</p>
					</div>
				</div>
			</div>

			<Separator />

			{/* Lease Duration */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Lease Duration</h4>
				</div>
				<div className={TERMS}>
					<div>
						<p className="text-sm text-muted-foreground">Start Date</p>
						<p className="mb-0 font-medium wrap-break-word">
							{formatLeaseDate(data.start_date)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">End Date</p>
						<p className="mb-0 font-medium wrap-break-word">
							{formatLeaseDate(data.end_date)}
						</p>
					</div>
				</div>
			</div>

			<Separator />

			{/* Financial Terms */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<DollarSign className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Financial Terms</h4>
				</div>
				<div className={TERMS_3}>
					<div>
						<p className="text-sm text-muted-foreground">Monthly Rent</p>
						<p className="mb-0 font-medium text-lg wrap-break-word">
							{formatAmountOrDash(data.rent_amount)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Security Deposit</p>
						<p className="mb-0 font-medium wrap-break-word">
							{formatAmountOrDash(data.security_deposit)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Rent Due Day</p>
						<p className="mb-0 font-medium wrap-break-word">
							{data.payment_day
								? `${data.payment_day}${getOrdinalSuffix(data.payment_day)} of month`
								: "-"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Grace Period</p>
						<p className="mb-0 font-medium wrap-break-word">
							{data.grace_period_days !== undefined
								? formatCount(data.grace_period_days, "day")
								: "-"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Late Fee</p>
						<p className="mb-0 font-medium wrap-break-word">
							{formatAmountOrDash(data.late_fee_amount)}
						</p>
					</div>
				</div>
			</div>

			<Separator />

			{/* Occupancy & Pets */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<User className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Occupancy & Pets</h4>
				</div>
				<div className={TERMS}>
					<div>
						<p className="text-sm text-muted-foreground">Max Occupants</p>
						<p className="mb-0 font-medium wrap-break-word">
							{data.max_occupants || "Not specified"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Pets</p>
						<div className="flex flex-wrap items-center gap-2">
							{data.pets_allowed ? (
								<>
									<Badge variant="outline" className="gap-1">
										<PawPrint className="h-3 w-3" />
										Allowed
									</Badge>
									{data.pet_deposit && (
										<span className="text-sm">
											Deposit: {formatAmountOrDash(data.pet_deposit)}
										</span>
									)}
									{data.pet_rent && (
										<span className="text-sm">
											Rent: {formatAmountOrDash(data.pet_rent)}/mo
										</span>
									)}
								</>
							) : (
								<Badge variant="secondary">Not Allowed</Badge>
							)}
						</div>
					</div>
				</div>
			</div>

			<Separator />

			{/* Utilities */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Zap className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Utilities</h4>
				</div>
				<div className={TERMS}>
					<div>
						<p className="text-sm text-muted-foreground mb-2">
							Included in Rent
						</p>
						<div className="flex flex-wrap gap-1">
							{data.utilities_included?.length ? (
								data.utilities_included.map((u) => (
									<Badge key={u} variant="outline">
										{utilityLabel(u)}
									</Badge>
								))
							) : (
								<span className="text-sm text-muted-foreground">None</span>
							)}
						</div>
					</div>
					<div>
						<p className="text-sm text-muted-foreground mb-2">
							Tenant Responsible
						</p>
						<div className="flex flex-wrap gap-1">
							{data.tenant_responsible_utilities?.length ? (
								data.tenant_responsible_utilities.map((u) => (
									<Badge key={u} variant="secondary">
										{utilityLabel(u)}
									</Badge>
								))
							) : (
								<span className="text-sm text-muted-foreground">None</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Property Rules */}
			{data.property_rules && (
				<>
					<Separator />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<h4 className="font-medium">Property Rules</h4>
						</div>
						<p className="mb-0 text-sm pl-6 whitespace-pre-wrap">
							{data.property_rules}
						</p>
					</div>
				</>
			)}

			{/* Lead Paint Disclosure */}
			{data.property_built_before_1978 && (
				<>
					<Separator />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<CheckCircle2
								className={`h-4 w-4 ${
									data.lead_paint_disclosure_acknowledged
										? "text-success-text"
										: "text-warning-text"
								}`}
							/>
							<h4 className="font-medium">Lead Paint Disclosure</h4>
						</div>
						<div className="pl-6">
							{data.lead_paint_disclosure_acknowledged ? (
								<Badge variant="success">Disclosure Acknowledged</Badge>
							) : (
								<Badge variant="destructive">Acknowledgment Required</Badge>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
