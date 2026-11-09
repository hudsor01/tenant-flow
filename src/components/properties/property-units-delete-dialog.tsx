"use client";

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
import type { Unit } from "#types/core";

interface UnitDeleteDialogProps {
	deletingUnit: Unit | null;
	isPending: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function UnitDeleteDialog({
	deletingUnit,
	isPending,
	onConfirm,
	onCancel,
}: UnitDeleteDialogProps) {
	return (
		<AlertDialog
			open={!!deletingUnit}
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{deletingUnit?.unit_number
							? `Delete unit ${deletingUnit.unit_number}?`
							: "Delete this unit?"}
					</AlertDialogTitle>
					{/* A soft delete (status 'inactive'), not a permanent one. */}
					<AlertDialogDescription className="mb-0">
						This marks the unit as inactive, so it leaves your unit lists. Its
						lease history is kept.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} variant="destructive">
						{isPending ? "Deleting..." : "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
