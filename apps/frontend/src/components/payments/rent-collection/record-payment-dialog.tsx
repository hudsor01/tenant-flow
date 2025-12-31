'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { DollarSign, Plus, RefreshCw } from 'lucide-react'
import { Input } from '#components/ui/input'
import { Button } from '#components/ui/button'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { useRecordManualPayment } from '#hooks/api/use-rent-collection'
import { toast } from 'sonner'

export function RecordPaymentDialog() {
	const [open, setOpen] = React.useState(false)
	const [formData, setFormData] = React.useState({
		lease_id: '',
		tenant_id: '',
		amount: '',
		payment_method: 'cash' as 'cash' | 'check' | 'money_order' | 'other',
		paid_date: format(new Date(), 'yyyy-MM-dd'),
		notes: ''
	})

	const recordPayment = useRecordManualPayment()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			await recordPayment.mutateAsync({
				...formData,
				amount: parseFloat(formData.amount)
			})
			toast.success('Payment recorded successfully')
			setOpen(false)
			setFormData({
				lease_id: '',
				tenant_id: '',
				amount: '',
				payment_method: 'cash',
				paid_date: format(new Date(), 'yyyy-MM-dd'),
				notes: ''
			})
		} catch {
			toast.error('Failed to record payment')
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="default" className="gap-2">
					<Plus className="h-4 w-4" />
					Record Payment
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Record Manual Payment</DialogTitle>
					<DialogDescription>
						Record a payment received via cash, check, or money order.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="lease_id">Lease ID</Label>
							<Input
								id="lease_id"
								placeholder="Enter lease ID"
								value={formData.lease_id}
								onChange={e =>
									setFormData(prev => ({ ...prev, lease_id: e.target.value }))
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="tenant_id">Tenant ID</Label>
							<Input
								id="tenant_id"
								placeholder="Enter tenant ID"
								value={formData.tenant_id}
								onChange={e =>
									setFormData(prev => ({ ...prev, tenant_id: e.target.value }))
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="amount">Amount</Label>
							<div className="relative">
								<DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0"
									placeholder="0.00"
									value={formData.amount}
									onChange={e =>
										setFormData(prev => ({ ...prev, amount: e.target.value }))
									}
									className="pl-9"
									required
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="payment_method">Payment Method</Label>
							<Select
								value={formData.payment_method}
								onValueChange={value =>
									setFormData(prev => ({
										...prev,
										payment_method: value as typeof formData.payment_method
									}))
								}
							>
								<SelectTrigger id="payment_method">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Cash</SelectItem>
									<SelectItem value="check">Check</SelectItem>
									<SelectItem value="money_order">Money Order</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="paid_date">Payment Date</Label>
							<Input
								id="paid_date"
								type="date"
								value={formData.paid_date}
								onChange={e =>
									setFormData(prev => ({ ...prev, paid_date: e.target.value }))
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="notes">Notes (optional)</Label>
							<Input
								id="notes"
								placeholder="Add any notes..."
								value={formData.notes}
								onChange={e =>
									setFormData(prev => ({ ...prev, notes: e.target.value }))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={recordPayment.isPending}>
							{recordPayment.isPending ? (
								<>
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
									Recording...
								</>
							) : (
								'Record Payment'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
