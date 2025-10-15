'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
	useCancelMaintenance,
	useCompleteMaintenance
} from '@/hooks/api/use-maintenance'
import { maintenanceRequestUpdateFormSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

interface StatusUpdateButtonProps {
	maintenance: {
		id: string
		title: string
		status: string
	}
}

export function StatusUpdateButton({ maintenance }: StatusUpdateButtonProps) {
	const [open, setOpen] = useState(false)

	// Use modern TanStack Query hooks with optimistic updates
	const completeMutation = useCompleteMaintenance()
	const cancelMutation = useCancelMaintenance()

	const form = useForm({
		defaultValues: {
			status: maintenance.status,
			actualCost: '',
			notes: '',
			completedAt: ''
		},
		onSubmit: async ({ value }) => {
			try {
				if (value.status === 'COMPLETED') {
					const payload: { id: string; actualCost?: number; notes?: string } = {
						id: maintenance.id
					}
					if (value.actualCost) payload.actualCost = Number(value.actualCost)
					if (value.notes) payload.notes = value.notes

					await completeMutation.mutateAsync(payload)
				} else if (value.status === 'CANCELED') {
					const payload: { id: string; reason?: string } = {
						id: maintenance.id
					}
					if (value.notes) payload.reason = value.notes

					await cancelMutation.mutateAsync(payload)
				}
				// For other statuses (OPEN, IN_PROGRESS, ON_HOLD), use regular update
				toast.success('Status updated successfully')
				setOpen(false)
				form.reset()
			} catch (error) {
				toast.error(
					`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = maintenanceRequestUpdateFormSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const isPending = completeMutation.isPending || cancelMutation.isPending

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<Settings className="size-4" />
					Update Status
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Update Status</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<form.Field name="status">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="status">Status</Label>
								<Select
									value={field.state.value}
									onValueChange={value => field.handleChange(value)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="OPEN">Open</SelectItem>
										<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
										<SelectItem value="COMPLETED">Completed</SelectItem>
										<SelectItem value="CANCELED">Canceled</SelectItem>
										<SelectItem value="ON_HOLD">On Hold</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>

					{(form.state.values.status === 'COMPLETED' ||
						form.state.values.status === 'IN_PROGRESS') && (
						<form.Field name="actualCost">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="actualCost">Actual Cost (Optional)</Label>
									<Input
										id="actualCost"
										type="number"
										placeholder="Enter actual cost"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>
					)}

					<form.Field name="notes">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="notes">
									{form.state.values.status === 'COMPLETED'
										? 'Completion Notes'
										: form.state.values.status === 'CANCELED'
											? 'Cancellation Reason'
											: 'Notes'}{' '}
									(Optional)
								</Label>
								<Textarea
									id="notes"
									placeholder={
										form.state.values.status === 'COMPLETED'
											? 'Work completed details...'
											: form.state.values.status === 'CANCELED'
												? 'Reason for cancellation...'
												: 'Additional notes...'
									}
									rows={3}
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
								/>
							</div>
						)}
					</form.Field>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? 'Updating...' : 'Update Status'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
