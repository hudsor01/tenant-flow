"use client";

import { Eye, MoreVertical, PenLine, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RenewLeaseDialog } from "#components/leases/dialogs/renew-lease-dialog";
import { TerminateLeaseDialog } from "#components/leases/dialogs/terminate-lease-dialog";
import { SendForSignatureButton } from "#components/leases/send-for-signature-button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { useDeleteLeaseOptimisticMutation } from "#hooks/api/use-lease-mutations";
import { useSignLeaseAsOwnerMutation } from "#hooks/api/use-lease-signature-mutations";
import { createLogger } from "#lib/frontend-logger";
import type { Lease } from "#types/core";

const logger = createLogger({ component: "LeaseActionButtons" });

interface LeaseActionButtonsProps {
	lease: Lease;
}

export function LeaseActionButtons({ lease }: LeaseActionButtonsProps) {
	const signAsOwner = useSignLeaseAsOwnerMutation();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showViewDialog, setShowViewDialog] = useState(false);
	const [showRenewDialog, setShowRenewDialog] = useState(false);
	const [showTerminateDialog, setShowTerminateDialog] = useState(false);
	const deleteLease = useDeleteLeaseOptimisticMutation({
		onSuccess: () => {
			// This mutation sets no successMessage, so the component owns the sole
			// success toast here.
			toast.success("Lease deleted successfully");
			setShowDeleteDialog(false);
		},
		// FORMFIX-08: no component onError — useDeleteLeaseOptimisticMutation's factory
		// wrapper already calls handleMutationError (errorContext "Delete lease"), so a
		// second handler here would double-toast + double-Sentry the same failure.
	});

	const isDraft = lease.lease_status === "draft";
	const isPendingSignature = lease.lease_status === "pending_signature";
	const ownerHasSigned = !!lease.owner_signed_at;

	const handleSignAsOwner = async () => {
		try {
			await signAsOwner.mutateAsync(lease.id);
			// This mutation has no successMessage, so the component owns the sole
			// success toast here.
			toast.success("Lease signed successfully");
		} catch (error) {
			// FORMFIX-08: useSignLeaseAsOwnerMutation's built-in onError already fires
			// the single error toast; only log here to avoid a duplicate.
			logger.error("Sign lease failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			"default" | "secondary" | "destructive" | "outline"
		> = {
			active: "default",
			EXPIRED: "destructive",
			TERMINATED: "secondary",
			DRAFT: "outline",
			pending_signature: "secondary",
		};

		const labels: Record<string, string> = {
			pending_signature: "Pending Signature",
		};

		return (
			<Badge variant={variants[status] || "outline"}>
				{labels[status] || status}
			</Badge>
		);
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setShowViewDialog(true)}
				className="gap-2"
			>
				<Eye className="size-4" />
				View
			</Button>

			{isDraft && (
				<SendForSignatureButton
					leaseId={lease.id}
					variant="outline"
					size="sm"
				/>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" aria-label="Lease actions">
						<MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{isPendingSignature && !ownerHasSigned && (
						<>
							<DropdownMenuItem
								onClick={handleSignAsOwner}
								disabled={signAsOwner.isPending}
								className="gap-2"
							>
								<PenLine className="size-4" />
								{signAsOwner.isPending ? "Signing..." : "Sign as Owner"}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}

					{lease.lease_status === "active" && (
						<>
							<DropdownMenuItem
								onClick={() => setShowRenewDialog(true)}
								className="gap-2"
							>
								<RotateCcw className="size-4" />
								Renew Lease
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() => setShowTerminateDialog(true)}
								className="gap-2 text-destructive-text focus:text-destructive-text"
							>
								<X className="size-4" />
								Terminate Lease
							</DropdownMenuItem>
						</>
					)}

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => setShowDeleteDialog(true)}
						className="gap-2 text-destructive-text focus:text-destructive-text"
					>
						<Trash2 className="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Lease</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this lease? This action cannot be
							undone and will remove all associated payment records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteLease.mutate(lease.id)}
							disabled={deleteLease.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteLease.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{getStatusBadge(lease.lease_status)}

			<Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
				<DialogContent intent="read">
					<DialogHeader>
						<DialogTitle>Lease Details</DialogTitle>
						<DialogDescription>View lease information</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div>
							<Label>Start Date</Label>
							<Input type="date" value={lease.start_date} disabled />
						</div>
						<div>
							<Label>End Date</Label>
							<Input type="date" value={lease.end_date || ""} disabled />
						</div>
						<div>
							<Label>Rent Amount</Label>
							<Input type="number" value={lease.rent_amount} disabled />
						</div>
						<div>
							<Label>Security Deposit</Label>
							<Input type="number" value={lease.security_deposit} disabled />
						</div>
						<div>
							<Label>Status</Label>
							{getStatusBadge(lease.lease_status)}
						</div>
					</DialogBody>
				</DialogContent>
			</Dialog>

			{/* Renew Lease Dialog */}
			{showRenewDialog && lease.lease_status === "active" && (
				<RenewLeaseDialog
					open={showRenewDialog}
					onOpenChange={setShowRenewDialog}
					lease={lease}
					onSuccess={() => setShowRenewDialog(false)}
				/>
			)}

			{/* Terminate Lease Dialog */}
			{showTerminateDialog && lease.lease_status === "active" && (
				<TerminateLeaseDialog
					open={showTerminateDialog}
					onOpenChange={setShowTerminateDialog}
					lease={lease}
					onSuccess={() => setShowTerminateDialog(false)}
				/>
			)}
		</div>
	);
}
