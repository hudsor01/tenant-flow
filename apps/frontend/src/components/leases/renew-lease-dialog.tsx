'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import { useRenewLease } from '#hooks/api/use-lease'
import { useModalStore } from '#stores/modal-store'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useState } from 'react'
import { toast } from 'sonner'

interface RenewLeaseDialogProps {
	lease_id: string
}

export function RenewLeaseDialog({ lease_id }: RenewLeaseDialogProps) {
	const { closeModal, isModalOpen } = useModalStore()
	const [newEndDate, setNewEndDate] = useState('')

	const renewLeaseMutation = useRenewLease()

	const modalId = `renew-lease-${lease_id}`

	const handleSubmit = async () => {
		if (!newEndDate) {
			toast.error('Please enter a new end date')
			return
		}

		try {
			await renewLeaseMutation.mutateAsync({
				id: lease_id,
				newEndDate
			})
			toast.success('Lease renewed successfully')
			closeModal(modalId)
			setNewEndDate('')
		} catch (error) {
			handleMutationError(error, 'Renew lease')
		}
	}

	const handleCancel = () => {
		closeModal(modalId)
		setNewEndDate('')
	}

	return (
		<>
			{isModalOpen(modalId) && (
				<Dialog open={true} onOpenChange={handleCancel}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Renew Lease</DialogTitle>
							<DialogDescription>
								Extend the lease by setting a new end date
							</DialogDescription>
						</DialogHeader>
						<Field>
							<FieldLabel htmlFor="newEndDate">New End Date</FieldLabel>
							<Input
								id="newEndDate"
								type="date"
								value={newEndDate}
								onChange={e => setNewEndDate(e.target.value)}
							/>
						</Field>
						<DialogFooter>
							<Button variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={renewLeaseMutation.isPending}
							>
								{renewLeaseMutation.isPending ? 'Renewing...' : 'Renew Lease'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}
