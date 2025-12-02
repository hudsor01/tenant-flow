'use client'

import { Button } from '#components/ui/button'
import {
	CrudDialog,
	CrudDialogBody,
	CrudDialogContent,
	CrudDialogDescription,
	CrudDialogFooter,
	CrudDialogHeader,
	CrudDialogTitle
} from '#components/ui/crud-dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import { useRenewLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { useModalStore } from '#stores/modal-store'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useState } from 'react'
import { toast } from 'sonner'

interface RenewLeaseDialogProps {
	lease_id: string
}

export function RenewLeaseDialog({ lease_id }: RenewLeaseDialogProps) {
	const { closeModal } = useModalStore()
	const [newEndDate, setNewEndDate] = useState('')

	const renewLeaseMutation = useRenewLeaseMutation()

	const modalId = `renew-lease-${lease_id}`

	const handleSubmit = async () => {
		if (!newEndDate) {
			toast.error('Please enter a new end date')
			return
		}

		try {
			await renewLeaseMutation.mutateAsync({
				id: lease_id,
				data: { end_date: newEndDate }
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
		<CrudDialog mode="edit" modalId={modalId}>
			<CrudDialogContent>
				<CrudDialogHeader>
					<CrudDialogTitle>Renew Lease</CrudDialogTitle>
					<CrudDialogDescription>
						Extend the lease by setting a new end date
					</CrudDialogDescription>
				</CrudDialogHeader>
				<CrudDialogBody>
					<Field>
						<FieldLabel htmlFor="newEndDate">New End Date</FieldLabel>
						<Input
							id="newEndDate"
							type="date"
							value={newEndDate}
							onChange={e => setNewEndDate(e.target.value)}
						/>
					</Field>
				</CrudDialogBody>
				<CrudDialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={renewLeaseMutation.isPending}
					>
						{renewLeaseMutation.isPending ? 'Renewing...' : 'Renew Lease'}
					</Button>
				</CrudDialogFooter>
			</CrudDialogContent>
		</CrudDialog>
	)
}
