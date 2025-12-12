'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '#components/ui/dialog'
import { useTerminateLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { handleMutationError } from '#lib/mutation-error-handler'
import type { Lease } from '@repo/shared/types/core'
import { AlertTriangle } from 'lucide-react'
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
	const terminateLease = useTerminateLeaseMutation()

	const handleConfirm = async () => {
		try {
			await terminateLease.mutateAsync(lease.id)
			toast.success('Lease terminated successfully')
			onSuccess?.()
			onOpenChange(false)
		} catch (error) {
			handleMutationError(error, 'Terminate lease')
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-125">
				<AlertDialogHeader>
					<AlertDialogTitle>Terminate Lease</AlertDialogTitle>
					<AlertDialogDescription>
						This action will terminate the lease early and mark it as TERMINATED. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-6">
					{/* Warning Banner with Icon */}
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<div className="flex gap-3">
							<AlertTriangle className="size-5 text-destructive shrink-0" />
							<div className="space-y-1">
								<p className="typography-small text-destructive">
									Early Termination Warning
								</p>
								<p className="text-muted">
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
						{terminateLease.isPending ? 'Terminating...' : 'Terminate Lease'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
