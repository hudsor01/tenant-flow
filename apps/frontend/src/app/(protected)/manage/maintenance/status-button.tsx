'use client'

import { Button } from '#components/ui/button'
import {
	CrudDialog,
	CrudDialogContent,
	CrudDialogDescription,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogBody,
	CrudDialogFooter
} from '#components/ui/crud-dialog'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import {
	useCancelMaintenance,
	useCompleteMaintenance
} from '#hooks/api/use-maintenance'
import { handleMutationError } from '#lib/mutation-error-handler'
import { maintenanceRequestUpdateSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { Settings } from 'lucide-react'
import { useModalStore } from '#stores/modal-store'
import { z } from 'zod'
import { toast } from 'sonner'

interface StatusUpdateButtonProps {
	maintenance: {
		id: string
		status: string
	}
}

export function StatusUpdateButton({ maintenance }: StatusUpdateButtonProps) {
	const { openModal } = useModalStore()

	// Use modern TanStack Query hooks with optimistic updates
	const completeMutation = useCompleteMaintenance()
	const cancelMutation = useCancelMaintenance()

	const modalId = `update-status-maintenance-${maintenance.id}`

	const form = useForm({
		defaultValues: {
			status: maintenance.status,
			actualCost: '',
			notes: '',
			completed_at: ''
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
				form.reset()
			} catch (error) {
				handleMutationError(error, 'Update status')
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = maintenanceRequestUpdateSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const isPending = completeMutation.isPending || cancelMutation.isPending

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="flex items-center gap-2"
				onClick={() => openModal(modalId)}
			>
				<Settings className="size-4" />
				Update Status
			</Button>

			<CrudDialog mode="edit" modalId={modalId}>
				<CrudDialogContent className="sm:max-w-md">
					<CrudDialogHeader>
						<CrudDialogTitle>Update Status</CrudDialogTitle>
						<CrudDialogDescription>
							Update the status of this maintenance request.
						</CrudDialogDescription>
					</CrudDialogHeader>

					<CrudDialogBody>
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
						</form>
					</CrudDialogBody>

					<CrudDialogFooter>
						<Button
							type="submit"
							disabled={isPending}
							onClick={() => document.querySelector('form')?.requestSubmit()}
						>
							{isPending ? 'Updating...' : 'Update Status'}
						</Button>
					</CrudDialogFooter>
				</CrudDialogContent>
			</CrudDialog>
		</>
	)
}
