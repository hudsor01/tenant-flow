/**
 * Renew Lease Dialog
 * Phase 6.3: Lease Renewals
 *
 * Interface for renewing leases with optional rent increases
 */

'use client'

import type { FormEvent } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogBody,
	DialogFooter
} from '#components/ui/dialog'
import { Button } from '#components/ui/button'
import { useRenewLeaseMutation } from '#hooks/api/use-lease-lifecycle-mutations'
import { handleMutationError } from '#lib/mutation-error-handler'
import type { Lease } from '#types/core'
import { addMonths, addYears, format, isAfter, parseISO } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { CurrentLeaseInfo, DateSelector, RentAdjustment } from './renew-lease-form-fields'

interface RenewLeaseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	lease: Lease
	onSuccess?: () => void
}

export function RenewLeaseDialog({
	open,
	onOpenChange,
	lease,
	onSuccess
}: RenewLeaseDialogProps) {
	const renewLease = useRenewLeaseMutation()
	const defaultNewEndDate = lease.end_date
		? format(addYears(parseISO(lease.end_date), 1), 'yyyy-MM-dd')
		: format(addYears(new Date(), 1), 'yyyy-MM-dd')

	const [newEndDate, setNewEndDate] = useState<string>(defaultNewEndDate)
	const [newRentAmount, setNewRentAmount] = useState<string>('')
	const [showRentIncrease, setShowRentIncrease] = useState(false)

	const currentRent = lease.rent_amount || 0

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (!newEndDate) {
			toast.error('Please select an end date')
			return
		}
		if (lease.end_date && !isAfter(parseISO(newEndDate), parseISO(lease.end_date))) {
			toast.error('New end date must be after current end date')
			return
		}
		if (showRentIncrease) {
			const rentValue = Number(newRentAmount)
			if (!rentValue || rentValue <= 0) {
				toast.error('Please enter a valid rent amount')
				return
			}
		}
		try {
			await renewLease.mutateAsync({ id: lease.id, data: { end_date: newEndDate } })
			toast.success('Lease renewed successfully')
			onSuccess?.()
			onOpenChange(false)
			setNewEndDate(defaultNewEndDate)
			setNewRentAmount('')
			setShowRentIncrease(false)
		} catch (error) {
			handleMutationError(error, 'Renew lease')
		}
	}

	const handleQuickDate = (months: number) => {
		if (!lease.end_date) return
		const newDate = addMonths(parseISO(lease.end_date), months)
		setNewEndDate(format(newDate, 'yyyy-MM-dd'))
	}

	const handleDialogChange = (isOpen: boolean) => {
		if (!isOpen) {
			setNewEndDate(defaultNewEndDate)
			setNewRentAmount('')
			setShowRentIncrease(false)
		}
		onOpenChange(isOpen)
	}

	const handleRentToggle = () => {
		setShowRentIncrease(!showRentIncrease)
		if (showRentIncrease) setNewRentAmount('')
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent intent="edit" className="sm:max-w-125">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Renew Lease</DialogTitle>
						<DialogDescription>
							Create a new lease term with optional rent adjustment
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className="space-y-6 mt-4">
							<CurrentLeaseInfo currentRent={currentRent} endDate={lease.end_date} />
							<DateSelector
								newEndDate={newEndDate}
								leaseEndDate={lease.end_date}
								onDateChange={setNewEndDate}
								onQuickDate={handleQuickDate}
							/>
							<RentAdjustment
								showRentIncrease={showRentIncrease}
								currentRent={currentRent}
								newRentAmount={newRentAmount}
								onToggle={handleRentToggle}
								onRentChange={setNewRentAmount}
							/>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={renewLease.isPending}>
							Cancel
						</Button>
						<Button type="submit" disabled={renewLease.isPending}>
							{renewLease.isPending ? 'Renewing...' : 'Renew Lease'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
