'use client'

import { CrudDialog, CrudDialogContent, CrudDialogHeader, CrudDialogTitle, CrudDialogDescription, CrudDialogBody, CrudDialogFooter } from '#components/ui/crud-dialog'
import { Button } from '#components/ui/button'
import { Label } from '#components/ui/label'
import { Textarea } from '#components/ui/textarea'
import { useTerminateLease } from '#hooks/api/use-lease'
import { handleMutationError } from '#lib/mutation-error-handler'
import type { Database } from '@repo/shared/types/supabase-generated'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Lease = Database['public']['Tables']['lease']['Row']

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
	const terminateLease = useTerminateLease()
	const [reason, setReason] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			const payload: { id: string; terminationDate: string; reason?: string } =
				{
					id: lease.id,
					terminationDate: new Date().toISOString().split('T')[0]! // Today's date in YYYY-MM-DD format
				}
			if (reason.trim()) {
				payload.reason = reason.trim()
			}

			await terminateLease.mutateAsync(payload)
			toast.success('Lease terminated successfully')
			onSuccess?.()
			onOpenChange(false)
			setReason('')
		} catch (error) {
			handleMutationError(error, 'Terminate lease')
		}
	}

	const handleDialogChange = (isOpen: boolean) => {
		if (!isOpen) {
			setReason('')
		}
		onOpenChange(isOpen)
	}

	return (
		<CrudDialog mode="edit" open={open} onOpenChange={handleDialogChange}>
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
										<p className="text-sm text-muted-foreground">
											This lease will be marked as terminated immediately. Ensure
											all financial settlements are complete before proceeding.
										</p>
									</div>
								</div>
							</div>

							{/* Termination Reason */}
							<div className="space-y-3">
								<Label htmlFor="reason">Termination Reason (Optional)</Label>
								<Textarea
									id="reason"
									placeholder="Reason for early termination (e.g., tenant request, violation, mutual agreement)..."
									rows={4}
									value={reason}
									onChange={e => setReason(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">
									Document the reason for termination for record-keeping purposes
								</p>
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
