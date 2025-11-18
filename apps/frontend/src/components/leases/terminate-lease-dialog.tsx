'use client'

import { Button } from '#components/ui/button'
import {
	CrudDialog,
	CrudDialogContent,
	CrudDialogDescription,
	CrudDialogFooter,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogBody
} from '#components/ui/crud-dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { Textarea } from '#components/ui/textarea'
import { useTerminateLease } from '#hooks/api/use-lease'
import { useModalStore } from '#stores/modal-store'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useState } from 'react'
import { toast } from 'sonner'

interface TerminateLeaseDialogProps {
	lease_id: string
}

export function TerminateLeaseDialog({ lease_id }: TerminateLeaseDialogProps) {
	const { closeModal } = useModalStore()
	const [terminationReason, setTerminationReason] = useState('')

	const terminateLeaseMutation = useTerminateLease()

	const modalId = `terminate-lease-${lease_id}`

	const handleSubmit = async () => {
		try {
			const payload: { id: string; terminationDate: string; reason?: string } =
				{
					id: lease_id,
					terminationDate: new Date().toISOString().split('T')[0]!
				}
			if (terminationReason) {
				payload.reason = terminationReason
			}
			await terminateLeaseMutation.mutateAsync(payload)
			toast.success('Lease terminated successfully')
			closeModal(modalId)
			setTerminationReason('')
		} catch (error) {
			handleMutationError(error, 'Terminate lease')
		}
	}

	const handleCancel = () => {
		closeModal(modalId)
		setTerminationReason('')
	}

	return (
		<CrudDialog mode="delete" modalId={modalId}>
			<CrudDialogContent>
				<CrudDialogHeader>
					<CrudDialogTitle>Terminate Lease</CrudDialogTitle>
					<CrudDialogDescription>
						End this lease early. This action cannot be undone.
					</CrudDialogDescription>
				</CrudDialogHeader>
				<CrudDialogBody>
					<Field>
						<FieldLabel htmlFor="terminationReason">
							Reason (Optional)
						</FieldLabel>
						<Textarea
							id="terminationReason"
							placeholder="Reason for early termination..."
							value={terminationReason}
							onChange={e => setTerminationReason(e.target.value)}
							rows={3}
						/>
					</Field>
				</CrudDialogBody>
				<CrudDialogFooter>
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
				</CrudDialogFooter>
			</CrudDialogContent>
		</CrudDialog>
	)
}
