"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DownloadSignedLeaseButton } from "#components/leases/download-signed-lease-button";
import { RentIncreaseNoticeDialog } from "#components/leases/rent-increase-notice-dialog";
import { SendForSignatureButton } from "#components/leases/send-for-signature-button";
import { SignLeaseButton } from "#components/leases/sign-lease-button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#components/ui/alert-dialog";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { formatCount } from "#lib/formatters/count";
import { createLogger } from "#lib/frontend-logger";
import { cn } from "#lib/utils";
import type { Lease } from "#types/core";
import { isLeaseTermsLocked } from "../lease-terms-lock";
import { getDaysUntilExpiry, getStatusConfig } from "./lease-detail-utils";

const logger = createLogger({ component: "LeaseHeader" });

interface TenantInfo {
	first_name?: string | null | undefined;
	last_name?: string | null | undefined;
	name?: string | null | undefined;
}

interface LeaseHeaderProps {
	lease: Lease;
	tenant: TenantInfo | null | undefined;
	unitName?: string | null;
	/** The unit's property by name, for the heading. */
	propertyName?: string | null;
	/** The unit's property street address, for the rent-increase notice. */
	propertyAddress?: string | null;
	onCancelSignature: () => Promise<void>;
	isCancelling: boolean;
}

/**
 * The lease's heading: its property and unit, as the leases table names a
 * lease ("Maple Apartments · Unit 4B"); "Lease" with neither. It printed
 * "Lease #" and the first eight characters of the lease's id.
 */
export function leaseHeading(
	propertyName: string | null | undefined,
	unitName: string | null | undefined,
): string {
	const property = propertyName?.trim();
	const unit = unitName?.trim();
	if (property && unit) return `${property} · Unit ${unit}`;
	if (property) return property;
	if (unit) return `Unit ${unit}`;
	return "Lease";
}

export function LeaseHeader({
	lease,
	tenant,
	unitName,
	propertyName,
	propertyAddress,
	onCancelSignature,
	isCancelling,
}: LeaseHeaderProps) {
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

	const isDraft = lease.lease_status === "draft";
	const isPendingSignature = lease.lease_status === "pending_signature";
	const isActive = lease.lease_status === "active";
	// Terms are locked (edit disabled) once the lease is pending_signature or
	// tenant_signed_at is set — the exact 26-06 server-trigger condition, via the
	// shared isLeaseTermsLocked helper so header, edit route, and renew stay in sync.
	const termsLocked = isLeaseTermsLocked(lease);

	const daysUntilExpiry = getDaysUntilExpiry(lease.end_date);
	const isExpiringSoon =
		daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

	const statusConfig = getStatusConfig(lease.lease_status);

	const tenantFullName =
		tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ""} ${tenant?.last_name ?? ""}`.trim()
			: tenant?.name;

	// Build props conditionally to satisfy exactOptionalPropertyTypes
	const signatureButtonProps: {
		leaseId: string;
		size: "sm";
		tenantName?: string;
	} = {
		leaseId: lease.id,
		size: "sm",
	};
	if (tenantFullName) {
		signatureButtonProps.tenantName = tenantFullName;
	}

	const handleCancelSignature = async () => {
		try {
			await onCancelSignature();
			toast.success("Signature request cancelled", {
				description: "The lease has been reverted to draft status.",
			});
			setCancelDialogOpen(false);
		} catch (error) {
			// FORMFIX-08: useCancelSignatureRequestMutation's built-in onError already
			// fires the single error toast; only log here to avoid a duplicate.
			logger.error("Cancel signature request failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div className="flex items-center gap-3">
				<h2 className="text-lg font-semibold">
					{leaseHeading(propertyName, unitName)}
				</h2>
				<span
					className={cn(
						"inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium",
						statusConfig.className,
					)}
				>
					{statusConfig.label}
				</span>
				{isExpiringSoon && (
					<Badge variant="warning">
						<AlertTriangle className="w-3 h-3 mr-1" />
						Expires in {formatCount(daysUntilExpiry, "day")}
					</Badge>
				)}
			</div>
			<div className="flex flex-wrap gap-2">
				{isDraft && tenant && (
					<SendForSignatureButton {...signatureButtonProps} />
				)}
				{isPendingSignature && (
					<>
						<SignLeaseButton
							leaseId={lease.id}
							alreadySigned={!!lease.owner_signed_at}
							size="sm"
						/>
						<SendForSignatureButton
							{...signatureButtonProps}
							action="resend"
							variant="outline"
						/>
						<AlertDialog
							open={cancelDialogOpen}
							onOpenChange={setCancelDialogOpen}
						>
							<AlertDialogTrigger asChild>
								<Button variant="outline" size="sm">
									Cancel Request
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Cancel Signature Request?</AlertDialogTitle>
									<AlertDialogDescription>
										This will revert the lease to draft status. Any pending
										signatures will be lost and you will need to send a new
										signature request.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel disabled={isCancelling}>
										Keep Request
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={(e) => {
											e.preventDefault();
											handleCancelSignature();
										}}
										disabled={isCancelling}
										variant="destructive"
									>
										{isCancelling ? "Cancelling..." : "Cancel Request"}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</>
				)}
				{isActive && <DownloadSignedLeaseButton leaseId={lease.id} size="sm" />}
				{isActive && (
					<RentIncreaseNoticeDialog
						lease={lease}
						tenantName={tenantFullName ?? null}
						propertyAddress={propertyAddress ?? null}
					/>
				)}
				{termsLocked ? (
					<Button
						variant="outline"
						size="sm"
						disabled
						aria-label="Edit Lease: locked because this lease has been sent for signature or signed"
						title="Editing is locked because this lease has been sent for signature or signed"
					>
						Edit Lease
					</Button>
				) : (
					<Button asChild variant="outline" size="sm">
						<Link href={`/leases/${lease.id}/edit`}>Edit Lease</Link>
					</Button>
				)}
			</div>
		</div>
	);
}
