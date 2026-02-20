'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/dialog'
import type { Unit } from '@repo/shared/types/core'

interface UnitDeleteDialogProps {
	deletingUnit: Unit | null
	isPending: boolean
	onConfirm: () => void
	onCancel: () => void
}

export function UnitDeleteDialog({
	deletingUnit,
	isPending,
	onConfirm,
	onCancel
}: UnitDeleteDialogProps) {
	return (
		<AlertDialog
			open={!!deletingUnit}
			onOpenChange={open => {
				if (!open) onCancel()
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Unit?</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete unit{' '}
						<strong>{deletingUnit?.unit_number}</strong>? This action cannot
						be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
