'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Textarea } from '#components/ui/textarea'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'
import { DollarSign, Plus } from 'lucide-react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'AddExpenseDialog' })

interface AddExpenseDialogProps {
	maintenanceId: string
	onSuccess: () => void
}

export function AddExpenseDialog({
	maintenanceId,
	onSuccess
}: AddExpenseDialogProps) {
	const [open, setOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [vendorName, setVendorName] = useState('')
	const [amount, setAmount] = useState('')
	const [expenseDate, setExpenseDate] = useState(
		new Date().toISOString().split('T')[0]
	)
	const [description, setDescription] = useState('')

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (!amount || parseFloat(amount) <= 0) {
			toast.error('Please enter a valid amount')
			return
		}

		setIsSubmitting(true)
		try {
			await apiRequest('/api/v1/maintenance/expenses', {
				method: 'POST',
				body: JSON.stringify({
					maintenance_request_id: maintenanceId,
					vendor_name: vendorName || null,
					amount: parseFloat(amount),
					expense_date: expenseDate,
					description: description || null
				})
			})
			toast.success('Expense added successfully')
			setOpen(false)
			setVendorName('')
			setAmount('')
			setDescription('')
			onSuccess()
		} catch (error) {
			logger.error('Failed to add expense', { error })
			toast.error('Failed to add expense')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Plus className="size-4" />
					Add Expense
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Expense</DialogTitle>
					<DialogDescription>
						Record an expense for this maintenance request.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor="vendor">Vendor Name</FieldLabel>
						<Input
							id="vendor"
							placeholder="e.g., ABC Plumbing"
							value={vendorName}
							onChange={e => setVendorName(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="amount">Amount *</FieldLabel>
						<div className="relative">
							<DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								id="amount"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								className="pl-9"
								value={amount}
								onChange={e => setAmount(e.target.value)}
								required
							/>
						</div>
					</Field>
					<Field>
						<FieldLabel htmlFor="expense_date">Date *</FieldLabel>
						<Input
							id="expense_date"
							type="date"
							value={expenseDate}
							onChange={e => setExpenseDate(e.target.value)}
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="description">Description</FieldLabel>
						<Textarea
							id="description"
							placeholder="Brief description of the expense"
							rows={2}
							value={description}
							onChange={e => setDescription(e.target.value)}
						/>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Adding...' : 'Add Expense'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
