"use client";

import { AlertTriangle } from "lucide-react";
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
import { useTerminateLeaseMutation } from "#hooks/api/use-lease-lifecycle-mutations";
import { createLogger } from "#lib/frontend-logger";
import type { Lease } from "#types/core";

const logger = createLogger({ component: "TerminateLeaseDialog" });

interface TerminateLeaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lease: Lease;
	onSuccess?: () => void;
}

export function TerminateLeaseDialog({
	open,
	onOpenChange,
	lease,
	onSuccess,
}: TerminateLeaseDialogProps) {
	const terminateLease = useTerminateLeaseMutation();

	const handleConfirm = async () => {
		try {
			await terminateLease.mutateAsync(lease.id);
			// FORMFIX-08: useTerminateLeaseMutation's createMutationCallbacks fires the
			// single success toast; no form-level duplicate.
			onSuccess?.();
			onOpenChange(false);
		} catch (error) {
			// FORMFIX-08: the mutation's onError surfaces the single error toast; only log.
			logger.error("Terminate lease failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-125">
				<AlertDialogHeader>
					<AlertDialogTitle>Terminate Lease</AlertDialogTitle>
					<AlertDialogDescription>
						This action will terminate the lease early and mark it as
						TERMINATED. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-6">
					{/* Warning Banner with Icon */}
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<div className="flex gap-3">
							<AlertTriangle className="size-5 text-destructive shrink-0" />
							<div className="space-y-1">
								<p className="typography-small text-destructive-text">
									Early Termination Warning
								</p>
								<p className="text-muted-foreground">
									This lease will be marked as terminated immediately. Ensure
									all financial settlements are complete before proceeding.
								</p>
							</div>
						</div>
					</div>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={terminateLease.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={terminateLease.isPending}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{terminateLease.isPending ? "Terminating..." : "Terminate Lease"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
