/**
 * Renew Lease Dialog
 * Phase 6.3: Lease Renewals
 *
 * Interface for renewing leases with optional rent increases
 */

"use client";

import { addMonths, addYears, format, isAfter, parseISO } from "date-fns";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { useRenewLeaseMutation } from "#hooks/api/use-lease-lifecycle-mutations";
import { createLogger } from "#lib/frontend-logger";
import type { Lease } from "#types/core";
import { isLeaseTermsLocked } from "../lease-terms-lock";
import {
	CurrentLeaseInfo,
	DateSelector,
	RentAdjustment,
} from "./renew-lease-form-fields";

const logger = createLogger({ component: "RenewLeaseDialog" });

interface RenewLeaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lease: Lease;
	onSuccess?: () => void;
}

export function RenewLeaseDialog({
	open,
	onOpenChange,
	lease,
	onSuccess,
}: RenewLeaseDialogProps) {
	const renewLease = useRenewLeaseMutation();
	const defaultNewEndDate = lease.end_date
		? format(addYears(parseISO(lease.end_date), 1), "yyyy-MM-dd")
		: format(addYears(new Date(), 1), "yyyy-MM-dd");

	const [newEndDate, setNewEndDate] = useState<string>(defaultNewEndDate);
	const [newRentAmount, setNewRentAmount] = useState<string>("");
	const [showRentIncrease, setShowRentIncrease] = useState(false);

	const currentRent = lease.rent_amount || 0;
	// Financial terms are locked once the lease is signed / pending signature —
	// the 26-06 server trigger rejects any rent change, so the UI never offers or
	// sends one. Extending end_date (the renew) still succeeds.
	const termsLocked = isLeaseTermsLocked(lease);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!newEndDate) {
			toast.error("Please select an end date");
			return;
		}
		if (
			lease.end_date &&
			!isAfter(parseISO(newEndDate), parseISO(lease.end_date))
		) {
			toast.error("New end date must be after current end date");
			return;
		}
		const adjustRent = showRentIncrease && !termsLocked;
		let rentAmount: number | undefined;
		if (adjustRent) {
			const rentValue = Number(newRentAmount);
			if (!rentValue || rentValue <= 0) {
				toast.error("Please enter a valid rent amount");
				return;
			}
			rentAmount = rentValue;
		}
		try {
			await renewLease.mutateAsync({
				id: lease.id,
				data: {
					end_date: newEndDate,
					...(rentAmount !== undefined ? { rent_amount: rentAmount } : {}),
				},
			});
			// FORMFIX-08: useRenewLeaseMutation's createMutationCallbacks fires the
			// single success toast; no form-level duplicate.
			onSuccess?.();
			onOpenChange(false);
			setNewEndDate(defaultNewEndDate);
			setNewRentAmount("");
			setShowRentIncrease(false);
		} catch (error) {
			// FORMFIX-08: the mutation's onError surfaces the single error toast; only log.
			logger.error("Renew lease failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	const handleQuickDate = (months: number) => {
		if (!lease.end_date) return;
		const newDate = addMonths(parseISO(lease.end_date), months);
		setNewEndDate(format(newDate, "yyyy-MM-dd"));
	};

	const handleDialogChange = (isOpen: boolean) => {
		if (!isOpen) {
			setNewEndDate(defaultNewEndDate);
			setNewRentAmount("");
			setShowRentIncrease(false);
		}
		onOpenChange(isOpen);
	};

	const handleRentToggle = () => {
		setShowRentIncrease(!showRentIncrease);
		if (showRentIncrease) setNewRentAmount("");
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent intent="edit" className="sm:max-w-125">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Renew Lease</DialogTitle>
						<DialogDescription>
							Create a new lease term with optional rent adjustment
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className="space-y-6 mt-4">
							<CurrentLeaseInfo
								currentRent={currentRent}
								endDate={lease.end_date}
							/>
							<DateSelector
								newEndDate={newEndDate}
								leaseEndDate={lease.end_date}
								onDateChange={setNewEndDate}
								onQuickDate={handleQuickDate}
							/>
							<RentAdjustment
								showRentIncrease={termsLocked ? false : showRentIncrease}
								currentRent={currentRent}
								newRentAmount={newRentAmount}
								onToggle={handleRentToggle}
								onRentChange={setNewRentAmount}
								disabled={termsLocked}
							/>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={renewLease.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={renewLease.isPending}>
							{renewLease.isPending ? "Renewing..." : "Renew Lease"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
