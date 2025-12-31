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
import { useTerminateLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { handleMutationError } from '#lib/mutation-error-handler'
import type { Lease } from '@repo/shared/types/core'
import { toast } from 'sonner'

interface TerminateLeaseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	lease: Lease
	onSuccess?: () => void
}

export function TerminateLeaseDialog({
	open,
	onOpenChange,
	lease,
	onSuccess
}: TerminateLeaseDialogProps) {
	const terminateLeaseMutation = useTerminateLeaseMutation()

	const handleConfirm = async () => {
		try {
			await terminateLeaseMutation.mutateAsync(lease.id)
			toast.success('Lease terminated successfully')
			onSuccess?.()
			onOpenChange(false)
		} catch (error) {
			handleMutationError(error, 'Terminate lease')
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Terminate Lease</AlertDialogTitle>
					<AlertDialogDescription>
						End this lease early. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={terminateLeaseMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={terminateLeaseMutation.isPending}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{terminateLeaseMutation.isPending
							? 'Terminating...'
							: 'Terminate Lease'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
