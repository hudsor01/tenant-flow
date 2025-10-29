'use client'

import { CreateDialog } from '#components/ui/base-dialogs'
import { Field, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import { useCreateMaintenanceRequest } from '#hooks/api/use-maintenance'
import { propertiesApi, unitsApi } from '#lib/api-client'
import { maintenanceRequestFormSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

const MAINTENANCE_STEPS = [
	{
		id: 1,
		title: 'Request Details',
		description: 'Select property, unit, and priority'
	},
	{
		id: 2,
		title: 'Description & Scheduling',
		description: 'Provide description and optional scheduling details'
	}
]

export function CreateMaintenanceDialog() {
	const [open, setOpen] = useState(false)
	const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
	const createMaintenanceRequest = useCreateMaintenanceRequest()

	const { data: properties = [] } = useQuery({
		queryKey: ['properties'],
		queryFn: () => propertiesApi.list()
	})

	const { data: units = [] } = useQuery({
		queryKey: ['units', selectedPropertyId],
		queryFn: () => unitsApi.list(),
		enabled: !!selectedPropertyId
	})

	const form = useForm({
		defaultValues: {
			title: '',
			description: '',
			priority: 'MEDIUM',
			category: '',
			unitId: '',
			estimatedCost: '',
			preferredDate: '',
			allowEntry: false
		},
		onSubmit: async ({ value }) => {
			const payload = {
				title: value.title,
				description: value.description,
				unitId: value.unitId,
				priority: value.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
				...(value.category && {
					category: value.category as
						| 'HVAC'
						| 'GENERAL'
						| 'PLUMBING'
						| 'ELECTRICAL'
						| 'APPLIANCES'
						| 'SAFETY'
						| 'OTHER'
				}),
				...(value.estimatedCost && {
					estimatedCost: Number(value.estimatedCost)
				}),
				...(value.preferredDate && { scheduledDate: value.preferredDate }),
				allowEntry: value.allowEntry
			}

			createMaintenanceRequest.mutate(payload, {
				onSuccess: () => {
					setOpen(false)
					form.reset()
					setSelectedPropertyId('')
				}
			})
		},
		validators: {
			onChange: ({ value }) => {
				const result = maintenanceRequestFormSchema.safeParse({
					...value,
					priority: value.priority || 'MEDIUM'
				})
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

	const validateStep = (step: number): boolean => {
		const values = form.state.values
		switch (step) {
			case 1:
				return Boolean(
					selectedPropertyId &&
						values.title &&
						values.priority &&
						values.category
				)
			case 2:
				return Boolean(values.description)
			default:
				return true
		}
	}

	return (
		<CreateDialog
			open={open}
			onOpenChange={value => {
				setOpen(value)
				if (!value) {
					form.reset()
					setSelectedPropertyId('')
				}
			}}
			triggerText="New Request"
			triggerIcon={<Plus className="size-4" />}
			title="Create Maintenance Request"
			description="Log a new maintenance issue for your properties"
			steps={MAINTENANCE_STEPS}
			formType="MAINTENANCE"
			isPending={createMaintenanceRequest.isPending}
			submitText="Create Request"
			submitPendingText="Creating..."
			onValidateStep={validateStep}
			onSubmit={async e => {
				e.preventDefault()
				await form.handleSubmit()
			}}
		>
			{currentStep => (
				<div className="space-y-4">
					{currentStep === 1 && (
						<>
							<Field>
								<FieldLabel htmlFor="propertyId">Property</FieldLabel>
								<Select
									value={selectedPropertyId}
									onValueChange={setSelectedPropertyId}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select property" />
									</SelectTrigger>
									<SelectContent>
										{properties.map(property => (
											<SelectItem key={property.id} value={property.id}>
												{property.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							{selectedPropertyId && units.length > 0 && (
								<form.Field name="unitId">
									{field => (
										<Field>
											<FieldLabel htmlFor="unitId">Unit (Optional)</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={value => field.handleChange(value)}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select unit (optional)" />
												</SelectTrigger>
												<SelectContent>
													{units.map(unit => (
														<SelectItem key={unit.id} value={unit.id}>
															Unit {unit.unitNumber}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
									)}
								</form.Field>
							)}

							<form.Field name="title">
								{field => (
									<Field>
										<FieldLabel htmlFor="title">Title</FieldLabel>
										<Input
											id="title"
											placeholder="Kitchen faucet leak"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
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
												onValueChange={value => field.handleChange(value)}
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
										</Field>
									)}
								</form.Field>

								<form.Field name="priority">
									{field => (
										<Field>
											<FieldLabel htmlFor="priority">Priority</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={value => field.handleChange(value)}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="LOW">Low</SelectItem>
													<SelectItem value="MEDIUM">Medium</SelectItem>
													<SelectItem value="HIGH">High</SelectItem>
													<SelectItem value="EMERGENCY">Emergency</SelectItem>
												</SelectContent>
											</Select>
										</Field>
									)}
								</form.Field>
							</div>
						</>
					)}

					{currentStep === 2 && (
						<>
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
									</Field>
								)}
							</form.Field>

							<form.Field name="estimatedCost">
								{field => (
									<Field>
										<FieldLabel htmlFor="estimatedCost">
											Estimated Cost (Optional)
										</FieldLabel>
										<Input
											id="estimatedCost"
											type="number"
											placeholder="250"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="preferredDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="preferredDate">
											Preferred Date (Optional)
										</FieldLabel>
										<Input
											id="preferredDate"
											type="date"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="allowEntry">
								{field => (
									<div className="space-y-2">
										<FieldLabel
											htmlFor="allowEntry"
											className="flex items-center gap-2"
										>
											<input
												id="allowEntry"
												type="checkbox"
												checked={field.state.value}
												onChange={e => field.handleChange(e.target.checked)}
												className="rounded border border-input"
											/>
											Allow entry when tenant is not present
										</FieldLabel>
									</div>
								)}
							</form.Field>
						</>
					)}
				</div>
			)}
		</CreateDialog>
	)
}
