'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { useUpdateLease } from '@/hooks/api/use-lease'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Lease } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

interface LeaseEditDialogProps {
	lease: Lease
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function LeaseEditDialog({
	lease,
	open,
	onOpenChange
}: LeaseEditDialogProps) {
	const updateLease = useUpdateLease()
	const logger = createLogger({ component: 'LeaseEditDialog' })

	const form = useForm({
		defaultValues: {
			startDate: lease.startDate,
			endDate: lease.endDate,
			rentAmount: lease.rentAmount.toString(),
			securityDeposit: lease.securityDeposit.toString(),
			status: lease.status
		},
		onSubmit: async ({ value }) => {
			try {
				await updateLease.mutateAsync({
					id: lease.id,
					data: {
						startDate: value.startDate,
						endDate: value.endDate,
						rentAmount: Number(value.rentAmount),
						securityDeposit: Number(value.securityDeposit),
						status: (value.status ?? lease.status) as Lease['status']
					}
				})
				toast.success('Lease updated successfully')
				onOpenChange(false)
			} catch (error) {
				logger.error('Failed to update lease', { leaseId: lease.id }, error)
				toast.error('Failed to update lease')
			}
		}
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Lease</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="startDate">
							{field => (
								<Field>
									<FieldLabel>Start Date</FieldLabel>
									<Input
										type="date"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="endDate">
							{field => (
								<Field>
									<FieldLabel>End Date</FieldLabel>
									<Input
										type="date"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="rentAmount">
							{field => (
								<Field>
									<FieldLabel>Monthly Rent</FieldLabel>
									<Input
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="1500"
										min="0"
										step="0.01"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="securityDeposit">
							{field => (
								<Field>
									<FieldLabel>Security Deposit</FieldLabel>
									<Input
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="3000"
										min="0"
										step="0.01"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="status">
						{field => (
							<Field>
								<FieldLabel>Status</FieldLabel>
								<Select
									value={field.state.value ?? ''}
									onValueChange={value =>
										field.handleChange(value as Lease['status'])
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="DRAFT">Draft</SelectItem>
										<SelectItem value="ACTIVE">Active</SelectItem>
										<SelectItem value="EXPIRED">Expired</SelectItem>
										<SelectItem value="TERMINATED">Terminated</SelectItem>
									</SelectContent>
								</Select>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateLease.isPending}>
							{updateLease.isPending ? 'Updating...' : 'Update Lease'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
