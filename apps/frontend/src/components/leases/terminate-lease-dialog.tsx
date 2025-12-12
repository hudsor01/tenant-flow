'use client'

import { Button } from '#components/ui/button'
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { CrudDialog } from '#components/ui/crud-dialog'
import { useTerminateLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { useModalStore } from '#stores/modal-store'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

interface TerminateLeaseDialogProps {
	lease_id: string
}

export function TerminateLeaseDialog({ lease_id }: TerminateLeaseDialogProps) {
	const { closeModal } = useModalStore()

	const terminateLeaseMutation = useTerminateLeaseMutation()

	const modalId = `terminate-lease-${lease_id}`

	const handleSubmit = async () => {
		try {
			await terminateLeaseMutation.mutateAsync(lease_id)
			toast.success('Lease terminated successfully')
			closeModal(modalId)
		} catch (error) {
			handleMutationError(error, 'Terminate lease')
		}
	}

	const handleCancel = () => {
		closeModal(modalId)
	}

	return (
		<CrudDialog mode="delete" modalId={modalId}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Terminate Lease</DialogTitle>
					<DialogDescription>
						End this lease early. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={terminateLeaseMutation.isPending}
					>
						{terminateLeaseMutation.isPending
							? 'Terminating...'
							: 'Terminate Lease'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</CrudDialog>
	)
}
