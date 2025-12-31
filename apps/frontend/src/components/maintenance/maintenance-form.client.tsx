'use client'

import { useMemo } from 'react'
import { Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import {
	useMaintenanceRequestCreateMutation,
	useMaintenanceRequestUpdateMutation
} from '#hooks/api/mutations/maintenance-mutations'
import { usePropertyList } from '#hooks/api/use-properties'
import { useUnitList } from '#hooks/api/use-unit'
import { useMaintenanceForm } from '#hooks/use-maintenance-form'
import type {
	MaintenancePriority,
	MaintenanceRequestWithExtras,
	Property,
	Unit
} from '@repo/shared/types/core'
import { MAINTENANCE_PRIORITY_OPTIONS } from '@repo/shared/constants/status-types'

interface MaintenanceFormProps {
	mode: 'create' | 'edit'
	request?: MaintenanceRequestWithExtras
}

export function MaintenanceForm({ mode, request }: MaintenanceFormProps) {
	const router = useRouter()
	const createRequest = useMaintenanceRequestCreateMutation()
	const updateRequest = useMaintenanceRequestUpdateMutation()

	// Use query hooks for eager loading of properties and units
	const { data: propertiesData, isLoading: propertiesLoading } =
		usePropertyList()
	const { data: unitsData, isLoading: unitsLoading } = useUnitList()

	const extendedRequest = request as MaintenanceRequestWithExtras | undefined

	// Initialize form with mutations and success callback
	const form = useMaintenanceForm({
		mode,
		defaultValues: {
			title: extendedRequest?.title ?? '',
			description: extendedRequest?.description ?? '',
			priority: (extendedRequest?.priority as MaintenancePriority) ?? 'low',
			unit_id: extendedRequest?.unit_id ?? '',
			tenant_id: extendedRequest?.tenant_id ?? '',
			estimated_cost: extendedRequest?.estimated_cost?.toString() ?? '',
			scheduled_date: extendedRequest?.scheduled_date ?? ''
		},
		createMutation: createRequest,
		updateMutation: updateRequest,
		...(request?.id && { requestId: request.id }),
		...(request?.version !== undefined && { version: request.version }),
		onSuccess: () => {
			router.back()
		}
	})

	// Group units by property for better UX
	const unitsByProperty = useMemo(() => {
		if (!unitsData || !propertiesData) return new Map<string, Unit[]>()
		const grouped = new Map<string, Unit[]>()
		for (const unit of unitsData) {
			const existing = grouped.get(unit.property_id) ?? []
			grouped.set(unit.property_id, [...existing, unit])
		}
		return grouped
	}, [unitsData, propertiesData])

	// Add loading state for form initialization
	const isLoading = propertiesLoading || unitsLoading

	const unitLabelId = 'maintenance-unit-label'

	return (
		<div className="max-w-3xl mx-auto">
			{isLoading ? (
				<div className="flex-center h-64">
					<div className="text-center">
						<div className="inline-flex-center mb-4">
							<Wrench className="size-8 animate-spin text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">Loading maintenance form...</p>
					</div>
				</div>
			) : (
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					noValidate
				>
					<Card>
						<CardHeader>
							<div className="flex items-start gap-3">
								<span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
									<Wrench className="size-5" aria-hidden="true" />
								</span>
								<div>
									<CardTitle>
										{mode === 'create'
											? 'New Maintenance Request'
											: 'Edit Maintenance Request'}
									</CardTitle>
									<CardDescription>
										{mode === 'create'
											? 'Log maintenance issues, assign priority, and track resolution details'
											: 'Update maintenance details and priority settings'}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="grid gap-6">
							{/* Unit Selection */}
							<form.Field name="unit_id">
								{field => (
									<Field>
										<FieldLabel id={unitLabelId} htmlFor="unit_id">
											Unit *
										</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={field.handleChange}
										>
											<SelectTrigger
												id="unit_id"
												aria-labelledby={unitLabelId}
												className="w-full justify-between"
											>
												<SelectValue placeholder="Select unit" />
											</SelectTrigger>
											<SelectContent>
												{propertiesData?.map((property: Property) => {
													const propertyUnits =
														unitsByProperty.get(property.id) ?? []
													if (propertyUnits.length === 0) return null
													return (
														<div key={property.id}>
															<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
																{property.name}
															</div>
															{propertyUnits.map((unit: Unit) => (
																<SelectItem key={unit.id} value={unit.id}>
																	Unit {unit.unit_number}
																</SelectItem>
															))}
														</div>
													)
												})}
											</SelectContent>
										</Select>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							{/* Tenant ID - Hidden for now, will be set from context or unit */}
							<form.Field name="tenant_id">
								{field => (
									<Field>
										<FieldLabel htmlFor="tenant_id">Tenant ID *</FieldLabel>
										<Input
											id="tenant_id"
											name="tenant_id"
											placeholder="Tenant ID"
											value={field.state.value ?? ''}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							{/* Title Field */}
							<form.Field name="title">
								{field => (
									<Field>
										<FieldLabel htmlFor="title">Title *</FieldLabel>
										<Input
											id="title"
											name="title"
											placeholder="Kitchen faucet leak"
											value={field.state.value ?? ''}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							{/* Description Field */}
							<form.Field name="description">
								{field => (
									<Field>
										<FieldLabel htmlFor="description">Description *</FieldLabel>
										<Textarea
											id="description"
											name="description"
											placeholder="Describe the issue in detail"
											rows={4}
											value={field.state.value ?? ''}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							{/* Priority Field */}
							<form.Field name="priority">
								{field => (
									<Field>
										<FieldLabel htmlFor="priority">Priority *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={(value: string) =>
												field.handleChange(value as MaintenancePriority)
											}
										>
											<SelectTrigger id="priority">
												<SelectValue placeholder="Select priority level" />
											</SelectTrigger>
											<SelectContent>
												{MAINTENANCE_PRIORITY_OPTIONS.map(option => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							{/* Estimated Cost Field */}
							<form.Field name="estimated_cost">
								{field => (
									<Field>
										<FieldLabel htmlFor="estimated_cost">
											Estimated Cost (optional)
										</FieldLabel>
										<Input
											id="estimated_cost"
											name="estimated_cost"
											type="number"
											min="0"
											step="0.01"
											placeholder="0.00"
											value={field.state.value ?? ''}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							{/* Scheduled Date Field */}
							<form.Field name="scheduled_date">
								{field => (
									<Field>
										<FieldLabel htmlFor="scheduled_date">
											Scheduled Date (optional)
										</FieldLabel>
										<Input
											id="scheduled_date"
											name="scheduled_date"
											type="date"
											value={field.state.value ?? ''}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{(field.state.meta.errors?.length ?? 0) > 0 && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>
						</CardContent>

						<CardFooter className="flex justify-end gap-3 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
								disabled={createRequest.isPending || updateRequest.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={createRequest.isPending || updateRequest.isPending}
							>
								{createRequest.isPending
									? 'Creating...'
									: updateRequest.isPending
										? 'Saving...'
										: mode === 'create'
											? 'Create Request'
											: 'Save Changes'}
							</Button>
						</CardFooter>
					</Card>
				</form>
			)}
		</div>
	)
}
