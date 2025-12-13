'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import { useRenewLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { handleMutationError } from '#lib/mutation-error-handler'
import type { Lease } from '@repo/shared/types/core'
import { useState } from 'react'
import { toast } from 'sonner'

interface RenewLeaseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	lease: Lease
	onSuccess?: () => void
}

export function RenewLeaseDialog({ open, onOpenChange, lease, onSuccess }: RenewLeaseDialogProps) {
	const [newEndDate, setNewEndDate] = useState('')

	const renewLeaseMutation = useRenewLeaseMutation()

	const handleSubmit = async () => {
		if (!newEndDate) {
			toast.error('Please enter a new end date')
			return
		}

		try {
			await renewLeaseMutation.mutateAsync({
				id: lease.id,
				data: { end_date: newEndDate }
			})
			toast.success('Lease renewed successfully')
			onSuccess?.()
			onOpenChange(false)
			setNewEndDate('')
		} catch (error) {
			handleMutationError(error, 'Renew lease')
		}
	}

	const handleCancel = () => {
		onOpenChange(false)
		setNewEndDate('')
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent intent="edit">
				<DialogHeader>
					<DialogTitle>Renew Lease</DialogTitle>
					<DialogDescription>
						Extend the lease by setting a new end date
					</DialogDescription>
				</DialogHeader>
				<DialogBody>
					<Field>
						<FieldLabel htmlFor="newEndDate">New End Date</FieldLabel>
						<Input
							id="newEndDate"
							type="date"
							value={newEndDate}
							onChange={e => setNewEndDate(e.target.value)}
						/>
					</Field>
				</DialogBody>
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
	)
}
