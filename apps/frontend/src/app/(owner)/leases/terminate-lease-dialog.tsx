'use client'

import { CrudDialog, CrudDialogContent, CrudDialogHeader, CrudDialogTitle, CrudDialogDescription, CrudDialogBody, CrudDialogFooter } from '#components/ui/crud-dialog'
import { Button } from '#components/ui/button'
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

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
		<CrudDialog mode="edit" open={open} onOpenChange={onOpenChange}>
			<CrudDialogContent className="sm:max-w-125">
				<form onSubmit={handleSubmit}>
					<CrudDialogHeader>
						<CrudDialogTitle>Terminate Lease</CrudDialogTitle>
						<CrudDialogDescription>
							This action will terminate the lease early and mark it as TERMINATED. This action cannot be undone.
						</CrudDialogDescription>
					</CrudDialogHeader>
					<CrudDialogBody>
						<div className="space-y-6">
							{/* Warning Banner with Icon */}
							<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
								<div className="flex gap-3">
									<AlertTriangle className="size-5 text-destructive shrink-0" />
									<div className="space-y-1">
										<p className="text-sm font-medium text-destructive">
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
					</CrudDialogBody>
					<CrudDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={terminateLease.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={terminateLease.isPending}>
							{terminateLease.isPending ? 'Terminating...' : 'Terminate Lease'}
						</Button>
					</CrudDialogFooter>
				</form>
			</CrudDialogContent>
		</CrudDialog>
	)
}
