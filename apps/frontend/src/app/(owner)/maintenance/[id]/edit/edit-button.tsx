'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter
} from '#components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import { useMaintenanceRequestUpdate } from '#hooks/api/use-maintenance'
import { maintenanceRequestUpdateSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { Edit } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

interface EditMaintenanceButtonProps {
	maintenance: {
		id: string
		description: string
		status: string
	}
}

export function EditMaintenanceButton({
	maintenance
}: EditMaintenanceButtonProps) {
	const [open, setOpen] = useState(false)
	const updateMaintenanceRequest = useMaintenanceRequestUpdate()

	const form = useForm({
		defaultValues: {
			description: maintenance.description,
			status: maintenance.status
		},
		onSubmit: async ({ value }) => {
			const updated_data: Record<string, unknown> = {}

			if (value.description) updated_data.description = value.description
			if (value.status) updated_data.status = value.status

			updateMaintenanceRequest.mutate(
				{ id: maintenance.id, data: updated_data },
				{
					onSuccess: () => {
						setOpen(false)
						form.reset()
					}
				}
			)
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

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="flex items-center gap-2"
				onClick={() => setOpen(true)}
			>
				<Edit className="size-4" />
				Edit
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent intent="edit" className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Maintenance Request</DialogTitle>
						<DialogDescription>
							Update maintenance request details including priority, status, and
							cost estimates.
						</DialogDescription>
					</DialogHeader>

					<DialogBody>
						<form
							onSubmit={e => {
								e.preventDefault()
								form.handleSubmit()
							}}
							className="space-y-4"
						>
							<form.Field name="description">
								{field => (
									<Field>
										<FieldLabel htmlFor="description">Description</FieldLabel>
										<Textarea
											id="description"
											placeholder="Detailed description of the maintenance issue..."
											rows={3}
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="status">
								{field => (
									<Field>
										<FieldLabel htmlFor="status">Status</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={(value: string) =>
												field.handleChange(value)
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="OPEN">Open</SelectItem>
												<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
												<SelectItem value="COMPLETED">Completed</SelectItem>
												<SelectItem value="CANCELED">Canceled</SelectItem>
											</SelectContent>
										</Select>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>
						</form>
					</DialogBody>

					<DialogFooter>
						<Button
							type="submit"
							disabled={updateMaintenanceRequest.isPending}
							onClick={() => document.querySelector('form')?.requestSubmit()}
						>
							{updateMaintenanceRequest.isPending
								? 'Updating...'
								: 'Update Request'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
