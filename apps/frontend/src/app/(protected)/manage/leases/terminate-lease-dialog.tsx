'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTerminateLease } from '@/hooks/api/use-lease'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { AlertTriangle, X } from 'lucide-react'
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
	const logger = createLogger({ component: 'TerminateLeaseDialog' })

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
			logger.error('Failed to terminate lease', { leaseId: lease.id }, error)
			toast.error('Failed to terminate lease')
		}
	}

	const handleCancel = () => {
		onOpenChange(false)
		setReason('')
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Terminate Lease
					</DialogTitle>
					<DialogDescription>
						This action will terminate the lease early and mark it as
						TERMINATED. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 mt-4">
					{/* Warning Banner */}
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<div className="flex gap-3">
							<X className="h-5 w-5 text-destructive flex-shrink-0" />
							<div className="space-y-1">
								<p className="text-sm font-medium text-destructive">
									Early Termination
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

					{/* Action Buttons */}
					<div className="flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={terminateLease.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={terminateLease.isPending}
						>
							{terminateLease.isPending ? 'Terminating...' : 'Terminate Lease'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
