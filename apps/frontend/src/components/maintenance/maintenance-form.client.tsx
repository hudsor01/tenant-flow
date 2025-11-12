'use client'

import { useEffect, useMemo, useState } from 'react'
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
	useCreateMaintenanceRequest,
	useUpdateMaintenanceRequest
} from '#hooks/api/use-maintenance'
import { useMaintenanceForm } from '#hooks/use-maintenance-form'
import { clientFetch } from '#lib/api/client'
import { MAINTENANCE_CATEGORY_OPTIONS } from '#lib/constants/status-values'
import type {
	Database,
	MaintenanceRequest,
	Property,
	Unit
} from '@repo/shared/types/core'
import { NOTIFICATION_PRIORITY_OPTIONS } from '@repo/shared/types/notifications'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'MaintenanceForm' })

interface MaintenanceFormProps {
	mode: 'create' | 'edit'
	request?: MaintenanceRequest
}

type MaintenanceRequestWithExtras = MaintenanceRequest & {
	propertyId?: string | null
	preferredDate?: string | null
}

export function MaintenanceForm({ mode, request }: MaintenanceFormProps) {
	const router = useRouter()
	const createRequest = useCreateMaintenanceRequest()
	const updateRequest = useUpdateMaintenanceRequest()

	const extendedRequest = request as MaintenanceRequestWithExtras | undefined
	const [properties, setProperties] = useState<Property[]>([])
	const [units, setUnits] = useState<Unit[]>([])

	// Initialize form with mutations and success callback
	const form = useMaintenanceForm({
		mode,
		defaultValues: {
			title: extendedRequest?.title ?? '',
			description: extendedRequest?.description ?? '',
			priority:
				(extendedRequest?.priority as Database['public']['Enums']['Priority']) ??
				'LOW',
			category:
				(extendedRequest?.category as
					| 'GENERAL'
					| 'PLUMBING'
					| 'ELECTRICAL'
					| 'HVAC'
					| 'APPLIANCES'
					| 'SAFETY'
					| 'OTHER'
					| undefined) ?? undefined,
			unitId: extendedRequest?.unitId ?? '',
			propertyId: extendedRequest?.propertyId ?? '',
			estimatedCost: extendedRequest?.estimatedCost?.toString() ?? '',
			preferredDate: extendedRequest?.preferredDate ?? ''
		},
		createMutation: createRequest,
		updateMutation: updateRequest,
		...(request?.id && { requestId: request.id }),
		...(request?.version !== undefined && { version: request.version }),
		onSuccess: () => {
			router.back()
		}
	})

	// Get available units based on selected property
	const availableUnits = useMemo(() => {
		const propertyId = form.state.values.propertyId
		if (!propertyId) return units
		return units.filter(u => u.propertyId === propertyId)
	}, [form.state.values.propertyId, units])

	// Add loading state for form initialization
	const [isLoading, setIsLoading] = useState(true)

	// Load properties and units on mount
	useEffect(() => {
		const loadData = async () => {
			// Set loading state
			setIsLoading(true)

			// Load properties
			try {
				const propertiesData =
					await clientFetch<Property[]>('/api/v1/properties')
				setProperties(propertiesData)
			} catch (error) {
				logger.error('Failed to load properties', {
					error,
					endpoint: '/api/v1/properties'
				})
			}

			// Load units
			try {
				const unitsData = await clientFetch<Unit[]>('/api/v1/units')
				setUnits(unitsData)
			} catch (error) {
				logger.error('Failed to load units', {
					error,
					endpoint: '/api/v1/units'
				})
			} finally {
				// Set loading state to false after both API calls complete
				setIsLoading(false)
			}
		}
		loadData()
	}, [])

	const propertyLabelId = 'maintenance-property-label'
	const unitLabelId = 'maintenance-unit-label'

	return (
		<div className="max-w-3xl mx-auto">
			{isLoading ? (
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="inline-flex items-center justify-center mb-4">
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
							<div className="grid gap-4 md:grid-cols-2">
								{/* Property Selection */}
								<form.Field name="propertyId">
									{field => (
										<Field>
											<FieldLabel id={propertyLabelId} htmlFor="propertyId">
												Property *
											</FieldLabel>
											<Select
												value={field.state.value || ''}
												onValueChange={value => {
													field.handleChange(value)
													form.setFieldValue('unitId', '')
												}}
											>
												<SelectTrigger
													id="propertyId"
													aria-labelledby={propertyLabelId}
													className="w-full justify-between"
												>
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
											{(field.state.meta.errors?.length ?? 0) > 0 && (
												<FieldError>
													{String(field.state.meta.errors[0])}
												</FieldError>
											)}
										</Field>
									)}
								</form.Field>

								{/* Unit Selection */}
								<form.Field name="unitId">
									{field => (
										<Field>
											<FieldLabel id={unitLabelId} htmlFor="unitId">
												Unit (optional)
											</FieldLabel>
											<Select
												value={field.state.value || ''}
												onValueChange={field.handleChange}
												disabled={!form.state.values.propertyId}
											>
												<SelectTrigger
													id="unitId"
													aria-labelledby={unitLabelId}
													className="w-full justify-between"
												>
													<SelectValue placeholder="Select unit" />
												</SelectTrigger>
												<SelectContent>
													{availableUnits.map(unit => (
														<SelectItem key={unit.id} value={unit.id}>
															Unit {unit.unitNumber}
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
							</div>

							{/* Title Field */}
							<form.Field name="title">
								{field => (
									<Field>
										<FieldLabel htmlFor="title">Title *</FieldLabel>
										<Input
											id="title"
											name="title"
											placeholder="Kitchen faucet leak"
											value={field.state.value || ''}
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
											value={field.state.value || ''}
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
											value={field.state.value || ''}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id="priority">
												<SelectValue placeholder="Select priority level" />
											</SelectTrigger>
											<SelectContent>
												{NOTIFICATION_PRIORITY_OPTIONS.map(option => (
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

							{/* Category Field */}
							<form.Field name="category">
								{field => (
									<Field>
										<FieldLabel htmlFor="category">Category</FieldLabel>
										<Select
											value={field.state.value || ''}
											onValueChange={value =>
												field.handleChange(
													value as keyof typeof import('#lib/constants/status-values').MAINTENANCE_CATEGORY
												)
											}
										>
											<SelectTrigger id="category">
												<SelectValue placeholder="Select maintenance category" />
											</SelectTrigger>
											<SelectContent>
												{MAINTENANCE_CATEGORY_OPTIONS.map(option => (
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
							<form.Field name="estimatedCost">
								{field => (
									<Field>
										<FieldLabel htmlFor="estimatedCost">
											Estimated Cost (optional)
										</FieldLabel>
										<Input
											id="estimatedCost"
											name="estimatedCost"
											type="number"
											min="0"
											step="0.01"
											placeholder="0.00"
											value={field.state.value || ''}
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

							{/* Preferred Date Field */}
							<form.Field name="preferredDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="preferredDate">
											Preferred Date (optional)
										</FieldLabel>
										<Input
											id="preferredDate"
											name="preferredDate"
											type="date"
											value={field.state.value || ''}
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
