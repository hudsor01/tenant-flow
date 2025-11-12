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
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import { useUpdateMaintenanceRequest } from '#hooks/api/use-maintenance'
import { maintenanceRequestUpdateFormSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { Calendar, DollarSign, Edit, FileText } from 'lucide-react'
import { useModalStore } from '#stores/modal-store'
import { z } from 'zod'

interface EditMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
		description: string
		priority: string
		category: string | null
		estimatedCost?: number | null
		notes?: string | null
		preferredDate?: string | null
		allowEntry?: boolean | null
	}
}

export function EditMaintenanceButton({
	maintenance
}: EditMaintenanceButtonProps) {
	const { openModal } = useModalStore()
	const updateMaintenanceRequest = useUpdateMaintenanceRequest()

	const modalId = `edit-maintenance-${maintenance.id}`

	const form = useForm({
		defaultValues: {
			title: maintenance.title,
			description: maintenance.description,
			priority: maintenance.priority,
			category: maintenance.category || '',
			estimatedCost: maintenance.estimatedCost?.toString() || '',
			notes: maintenance.notes || '',
			preferredDate: maintenance.preferredDate || '',
			allowEntry: maintenance.allowEntry || false,
			status: '',
			actualCost: '',
			completedAt: ''
		},
		onSubmit: async ({ value }) => {
			const updateData: Record<string, unknown> = {}

			if (value.title) updateData.title = value.title
			if (value.description) updateData.description = value.description
			if (value.priority)
				updateData.priority = value.priority as
					| 'LOW'
					| 'MEDIUM'
					| 'HIGH'
					| 'URGENT'
			if (value.category) updateData.category = value.category
			if (value.estimatedCost)
				updateData.estimatedCost = Number(value.estimatedCost)
			if (value.notes) updateData.notes = value.notes
			if (value.preferredDate)
				updateData.preferredDate = new Date(value.preferredDate)
			if (value.status) updateData.status = value.status
			if (value.actualCost) updateData.actualCost = Number(value.actualCost)
			if (value.completedAt)
				updateData.completedAt = new Date(value.completedAt)

			updateMaintenanceRequest.mutate(
				{ id: maintenance.id, data: updateData },
				{
					onSuccess: () => {
						// Close modal will be handled by CrudDialog
						form.reset()
					}
				}
			)
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

	const categories = [
		'Plumbing',
		'Electrical',
		'HVAC',
		'Appliances',
		'Flooring',
		'Painting',
		'Cleaning',
		'Landscaping',
		'Security',
		'Other'
	]

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="flex items-center gap-2"
				onClick={() => openModal(modalId)}
			>
				<Edit className="size-4" />
				Edit
			</Button>

			<CrudDialog mode="edit" modalId={modalId}>
				<CrudDialogContent className="sm:max-w-lg">
					<CrudDialogHeader>
						<CrudDialogTitle>Edit Maintenance Request</CrudDialogTitle>
						<CrudDialogDescription>
							Update maintenance request details including priority, status, and
							cost estimates.
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
							<form.Field name="title">
								{field => (
									<Field>
										<FieldLabel htmlFor="title">Title</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<FileText className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="title"
												placeholder="Kitchen faucet leak"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

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

							<div className="grid grid-cols-2 gap-4">
								<form.Field name="category">
									{field => (
										<Field>
											<FieldLabel htmlFor="category">Category</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={(value: string) =>
													field.handleChange(value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select category" />
												</SelectTrigger>
												<SelectContent>
													{categories.map(category => (
														<SelectItem key={category} value={category}>
															{category}
														</SelectItem>
													))}
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

								<form.Field name="priority">
									{field => (
										<Field>
											<FieldLabel htmlFor="priority">Priority</FieldLabel>
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
													<SelectItem value="LOW">Low</SelectItem>
													<SelectItem value="MEDIUM">Medium</SelectItem>
													<SelectItem value="HIGH">High</SelectItem>
													<SelectItem value="URGENT">Emergency</SelectItem>
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
							</div>

							<form.Field name="estimatedCost">
								{field => (
									<Field>
										<FieldLabel htmlFor="estimatedCost">
											Estimated Cost (Optional)
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="estimatedCost"
												type="number"
												placeholder="250"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="preferredDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="preferredDate">
											Preferred Date (Optional)
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Calendar className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="preferredDate"
												type="date"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="notes">
								{field => (
									<Field>
										<FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
										<Textarea
											id="notes"
											placeholder="Additional notes..."
											rows={2}
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

							<form.Field name="allowEntry">
								{field => (
									<Field>
										<FieldLabel
											htmlFor="allowEntry"
											className="flex items-center gap-2"
										>
											<input
												id="allowEntry"
												type="checkbox"
												checked={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.checked)
												}
												className="rounded border border-input"
											/>
											Allow entry when tenant is not present
										</FieldLabel>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>
						</form>
					</CrudDialogBody>

					<CrudDialogFooter>
						<Button
							type="submit"
							disabled={updateMaintenanceRequest.isPending}
							onClick={() => document.querySelector('form')?.requestSubmit()}
						>
							{updateMaintenanceRequest.isPending
								? 'Updating...'
								: 'Update Request'}
						</Button>
					</CrudDialogFooter>
				</CrudDialogContent>
			</CrudDialog>
		</>
	)
}
