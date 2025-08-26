/**
 * Unit Form Component
 *
 * Consolidated React 19 form component using React Hook Form directly.
 * Removed unnecessary abstractions and component splits.
 */

'use client'

import React, { useTransition, useEffect } from 'react'
import { logger } from '@/lib/logger/logger'
import {
	useForm,
	useController,
	type Control,
	type FieldPath
} from 'react-hook-form'
import type { CreateUnitInput, UpdateUnitInput, Property } from '@repo/shared'
import type { UnitFormProps } from '@/types'
import { useCreateUnit, useUpdateUnit } from '@/hooks/api/use-units'
import { useProperties } from '@/hooks/api/use-properties'
import { usePostHog } from '@/hooks/use-posthog'
import {
	useBusinessEvents,
	useInteractionTracking
} from '@/lib/analytics/business-events'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Save, X, Home, AlertCircle } from 'lucide-react'

// Form Field Component using direct RHF
function FormField({
	name,
	control,
	label,
	type = 'text',
	placeholder,
	required = false,
	multiline = false,
	rows = 3,
	description
}: {
	name: FieldPath<CreateUnitInput | UpdateUnitInput>
	control: Control<CreateUnitInput | UpdateUnitInput>
	label: string
	type?: string
	placeholder?: string
	required?: boolean
	multiline?: boolean
	rows?: number
	description?: string
}) {
	const {
		field,
		fieldState: { error }
	} = useController({
		name,
		control,
		rules: {
			required: required ? `${label} is required` : false,
			...(type === 'number'
				? {
						valueAsNumber: true,
						min: { value: 0, message: `${label} must be positive` }
					}
				: {})
		}
	})

	const fieldId = `field-${name}`

	return (
		<div className="space-y-2">
			<Label htmlFor={fieldId}>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			{multiline ? (
				<Textarea
					{...field}
					id={fieldId}
					placeholder={placeholder}
					rows={rows}
					value={String(field.value ?? '')}
					className={cn(
						error &&
							'border-destructive focus-visible:ring-destructive'
					)}
				/>
			) : (
				<Input
					{...field}
					id={fieldId}
					type={type}
					placeholder={placeholder}
					value={
						type === 'number'
							? field.value === undefined
								? ''
								: String(field.value)
							: String(field.value ?? '')
					}
					onChange={e => {
						if (type === 'number') {
							const value =
								e.target.value === ''
									? undefined
									: Number(e.target.value)
							field.onChange(value)
						} else {
							field.onChange(e.target.value)
						}
					}}
					className={cn(
						error &&
							'border-destructive focus-visible:ring-destructive'
					)}
				/>
			)}
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			{error && (
				<p className="text-destructive text-sm">{error.message}</p>
			)}
		</div>
	)
}

// Property Select Field Component
function PropertySelectField({
	name,
	control,
	label,
	required = false,
	properties
}: {
	name: FieldPath<CreateUnitInput | UpdateUnitInput>
	control: Control<CreateUnitInput | UpdateUnitInput>
	label: string
	required?: boolean
	properties: Property[]
}) {
	const {
		field,
		fieldState: { error }
	} = useController({
		name,
		control,
		rules: { required: required ? `${label} is required` : false }
	})

	const fieldId = `field-${name}`

	return (
		<div className="space-y-2">
			<Label htmlFor={fieldId}>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			<Select
				value={typeof field.value === 'string' ? field.value : ''}
				onValueChange={field.onChange}
			>
				<SelectTrigger
					className={cn(
						error &&
							'border-destructive focus-visible:ring-destructive'
					)}
				>
					<SelectValue placeholder="Select a property" />
				</SelectTrigger>
				<SelectContent>
					{properties.map(property => (
						<SelectItem key={property.id} value={property.id}>
							{property.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && (
				<p className="text-destructive text-sm">{error.message}</p>
			)}
		</div>
	)
}

// Unit Status Select Field
function StatusSelectField({
	name,
	control,
	label,
	required = false
}: {
	name: FieldPath<CreateUnitInput | UpdateUnitInput>
	control: Control<CreateUnitInput | UpdateUnitInput>
	label: string
	required?: boolean
}) {
	const {
		field,
		fieldState: { error }
	} = useController({
		name,
		control,
		rules: { required: required ? `${label} is required` : false }
	})

	const fieldId = `field-${name}`

	const statusOptions = [
		{ value: 'AVAILABLE', label: 'Available' },
		{ value: 'OCCUPIED', label: 'Occupied' },
		{ value: 'MAINTENANCE', label: 'Under Maintenance' },
		{ value: 'UNAVAILABLE', label: 'Unavailable' }
	]

	return (
		<div className="space-y-2">
			<Label htmlFor={fieldId}>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			<Select
				value={typeof field.value === 'string' ? field.value : ''}
				onValueChange={field.onChange}
			>
				<SelectTrigger
					className={cn(
						error &&
							'border-destructive focus-visible:ring-destructive'
					)}
				>
					<SelectValue placeholder="Select unit status" />
				</SelectTrigger>
				<SelectContent>
					{statusOptions.map(status => (
						<SelectItem key={status.value} value={status.value}>
							{status.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && (
				<p className="text-destructive text-sm">{error.message}</p>
			)}
		</div>
	)
}

// Section Component
function FormSection({
	title,
	description,
	children
}: {
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">{title}</h3>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{children}
		</div>
	)
}

export function UnitForm({
	unit,
	mode = 'create',
	onSuccess,
	onClose,
	className
}: UnitFormProps) {
	const [isPending, startTransition] = useTransition()
	const isEditing = mode === 'edit' && Boolean(unit)
	const { trackEvent } = usePostHog()
	const { trackUserError } = useBusinessEvents()
	const { trackFormSubmission } = useInteractionTracking()

	const title = isEditing ? 'Edit Unit' : 'Add New Unit'
	const description = isEditing
		? 'Update unit information and details'
		: 'Add a new unit to your property management system'

	// Fetch properties for dropdown
	const { data: properties } = useProperties()

	// React Query mutations with optimistic updates
	const createMutation = useCreateUnit()
	const updateMutation = useUpdateUnit()

	// React Hook Form setup - simplified to match API interface
	const form = useForm<CreateUnitInput | UpdateUnitInput>({
		defaultValues:
			isEditing && unit
				? {
						propertyId: unit.propertyId ?? '',
						unitNumber: unit.unitNumber ?? '',
						bedrooms: unit.bedrooms ?? 1,
						bathrooms: unit.bathrooms ?? 1,
						squareFeet: unit.squareFeet ?? undefined,
						monthlyRent: unit.monthlyRent ?? unit.rent ?? undefined,
						securityDeposit: unit.securityDeposit ?? undefined,
						status: unit.status ?? 'AVAILABLE',
						description: unit.description ?? '',
						amenities: unit.amenities?.join(', ') ?? ''
					}
				: {
						propertyId: '',
						unitNumber: '',
						bedrooms: 1,
						bathrooms: 1,
						squareFeet: undefined,
						monthlyRent: undefined,
						securityDeposit: undefined,
						status: 'AVAILABLE',
						description: '',
						amenities: ''
					},
		mode: 'onChange'
	})

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
		reset
	} = form

	useEffect(() => {
		// Track form view
		trackEvent('form_viewed', {
			form_type: 'unit',
			form_mode: mode,
			has_existing_data: !!unit
		})
	}, [trackEvent, mode, unit])

	// Form submission handler using React Hook Form
	const onSubmit = (formData: CreateUnitInput | UpdateUnitInput) => {
		// Track form submission attempt
		trackEvent('form_submitted', {
			form_type: 'unit',
			form_mode: mode,
			has_existing_data: !!unit,
			unit_id: unit?.id
		})

		startTransition(async () => {
			try {
				if (isEditing) {
					// Update existing unit
					if (!unit) {
						throw new Error('Unit missing for update')
					}

					const fd = formData as UpdateUnitInput
					const unitData: UpdateUnitInput = {
						propertyId: fd.propertyId,
						unitNumber: fd.unitNumber,
						bedrooms: fd.bedrooms,
						bathrooms: fd.bathrooms,
						squareFeet: fd.squareFeet ?? undefined,
						monthlyRent: fd.monthlyRent,
						securityDeposit: fd.securityDeposit,
						status: fd.status,
						description: fd.description ?? undefined,
						amenities: fd.amenities
							? (fd.amenities as string)
									.split(',')
									.map(a => a.trim())
									.filter(Boolean)
							: undefined
					}

					const updatedUnit = await updateMutation.mutateAsync({
						id: unit.id,
						data: unitData
					})

					trackEvent('unit_updated', {
						unit_id: updatedUnit.id,
						form_type: 'unit'
					})

					onSuccess?.(updatedUnit)
				} else {
					// Create new unit
					const fd = formData as CreateUnitInput
					const unitData: CreateUnitInput = {
						propertyId: fd.propertyId,
						unitNumber: fd.unitNumber,
						bedrooms: fd.bedrooms,
						bathrooms: fd.bathrooms,
						squareFeet: fd.squareFeet ?? undefined,
						monthlyRent: fd.monthlyRent,
						securityDeposit: fd.securityDeposit,
						status: fd.status,
						description: fd.description ?? undefined,
						amenities: fd.amenities
							? (fd.amenities as string)
									.split(',')
									.map(a => a.trim())
									.filter(Boolean)
							: undefined
					}

					const newUnit = await createMutation.mutateAsync(unitData)

					trackEvent('unit_created', {
						unit_id: newUnit.id,
						form_type: 'unit'
					})

					trackFormSubmission('unit_form', true)
					onSuccess?.(newUnit)

					// Reset form for create mode
					reset()
				}
			} catch (error) {
				logger.error(
					'Form submission error:',
					error instanceof Error ? error : new Error(String(error)),
					{ component: 'unitform' }
				)

				// Track form submission error
				trackEvent('form_submission_failed', {
					form_type: 'unit',
					form_mode: mode,
					error_message:
						error instanceof Error
							? error.message
							: 'Unknown error',
					unit_id: unit?.id
				})

				// Track enhanced error event
				trackFormSubmission('unit_form', false, [
					error instanceof Error ? error.message : 'Unknown error'
				])
				trackUserError({
					error_type: 'unit_form_submission_failed',
					error_message:
						error instanceof Error
							? error.message
							: 'Unknown error',
					page_url: window.location.href,
					user_action: mode === 'edit' ? 'update_unit' : 'create_unit'
				})
			}
		})
	}

	const handleCancel = () => {
		reset()
		onClose?.({} as React.MouseEvent)
	}

	const isLoading =
		isSubmitting ||
		createMutation.isPending ||
		updateMutation.isPending ||
		isPending
	const mutation = isEditing ? updateMutation : createMutation

	return (
		<div className={cn('mx-auto w-full max-w-2xl', className)}>
			<Card>
				<CardContent className="p-6">
					<form
						onSubmit={e => {
							void handleSubmit(onSubmit)(e)
						}}
						className="space-y-6"
					>
						{/* Form Header */}
						<div>
							<div className="mb-2 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
									<Home className="text-primary h-4 w-4 dark:text-blue-400" />
								</div>
								<div>
									<h2 className="text-xl font-semibold">
										{title}
									</h2>
									<p className="text-muted-foreground text-sm">
										{description}
									</p>
								</div>
							</div>
						</div>

						{/* Global Error */}
						{mutation.error && (
							<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
								<AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
								<p className="text-sm text-red-700 dark:text-red-300">
									{mutation.error.message ||
										'An error occurred. Please try again.'}
								</p>
							</div>
						)}

						{/* Basic Information Section */}
						<FormSection
							title="Unit Information"
							description="Basic unit details and property assignment"
						>
							<div className="grid grid-cols-1 gap-6">
								{properties && (
									<PropertySelectField
										name="propertyId"
										control={control}
										label="Property"
										required
										properties={properties}
									/>
								)}

								<div className="grid grid-cols-2 gap-4">
									<FormField
										name="unitNumber"
										control={control}
										label="Unit Number"
										placeholder="e.g., 101, A1, Studio-5"
										required
									/>

									<StatusSelectField
										name="status"
										control={control}
										label="Status"
										required
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<FormField
										name="bedrooms"
										control={control}
										label="Bedrooms"
										type="number"
										placeholder="1"
										required
									/>

									<FormField
										name="bathrooms"
										control={control}
										label="Bathrooms"
										type="number"
										placeholder="1"
										required
									/>
								</div>
							</div>
						</FormSection>

						{/* Property Details Section */}
						<FormSection
							title="Property Details"
							description="Unit specifications and layout information"
						>
							<div className="grid grid-cols-1 gap-6">
								<FormField
									name="squareFeet"
									control={control}
									label="Square Feet"
									type="number"
									placeholder="750"
									description="Total square footage of the unit"
								/>

								<div className="grid grid-cols-2 gap-4">
									<FormField
										name="monthlyRent"
										control={control}
										label="Monthly Rent"
										type="number"
										placeholder="1200"
										description="Monthly rental amount in USD"
									/>

									<FormField
										name="securityDeposit"
										control={control}
										label="Security Deposit"
										type="number"
										placeholder="1200"
										description="Security deposit amount"
									/>
								</div>

								<FormField
									name="amenities"
									control={control}
									label="Amenities"
									placeholder="Dishwasher, In-unit laundry, Balcony, Parking"
									description="Comma-separated list of amenities"
								/>

								<FormField
									name="description"
									control={control}
									label="Description"
									placeholder="Additional details about the unit..."
									multiline
									rows={4}
									description="Optional: Additional notes, special features, or important information"
								/>
							</div>
						</FormSection>

						{/* Form Actions */}
						<div className="flex items-center justify-end gap-3 border-t pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={isLoading}
							>
								<X className="mr-2 h-4 w-4" />
								Cancel
							</Button>

							<Button
								type="submit"
								disabled={isLoading}
								className="min-w-[120px]"
							>
								{isLoading ? (
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										{isEditing
											? 'Updating...'
											: 'Creating...'}
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-4 w-4" />
										{isEditing
											? 'Update Unit'
											: 'Create Unit'}
									</div>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

// Export types
export type { UnitFormProps, CreateUnitInput, UpdateUnitInput }
