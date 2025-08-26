/**
 * Maintenance Request Form Component
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
import type {
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	Unit
} from '@repo/shared'
import type { MaintenanceFormProps } from '@/types'
import {
	useCreateMaintenanceRequest,
	useUpdateMaintenanceRequest
} from '@/hooks/api/use-maintenance'
import { useUnits } from '@/hooks/api/use-units'
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
import { Save, X, Wrench, AlertCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

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
	name: FieldPath<CreateMaintenanceInput | UpdateMaintenanceInput>
	control: Control<CreateMaintenanceInput | UpdateMaintenanceInput>
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

// Unit Select Field Component
function UnitSelectField({
	name,
	control,
	label,
	required = false,
	units
}: {
	name: FieldPath<CreateMaintenanceInput | UpdateMaintenanceInput>
	control: Control<CreateMaintenanceInput | UpdateMaintenanceInput>
	label: string
	required?: boolean
	units: Unit[]
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
					<SelectValue placeholder="Select a unit" />
				</SelectTrigger>
				<SelectContent>
					{units.map(unit => (
						<SelectItem key={unit.id} value={unit.id}>
							Unit {unit.unitNumber} - Property {unit.propertyId}
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

// Priority Select Field
function PrioritySelectField({
	name,
	control,
	label,
	required = false
}: {
	name: FieldPath<CreateMaintenanceInput | UpdateMaintenanceInput>
	control: Control<CreateMaintenanceInput | UpdateMaintenanceInput>
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

	const priorityOptions = [
		{ value: 'LOW', label: 'Low Priority' },
		{ value: 'MEDIUM', label: 'Medium Priority' },
		{ value: 'HIGH', label: 'High Priority' },
		{ value: 'EMERGENCY', label: 'Emergency' }
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
					<SelectValue placeholder="Select priority level" />
				</SelectTrigger>
				<SelectContent>
					{priorityOptions.map(priority => (
						<SelectItem key={priority.value} value={priority.value}>
							{priority.label}
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

// Status Select Field
function StatusSelectField({
	name,
	control,
	label,
	required = false
}: {
	name: FieldPath<CreateMaintenanceInput | UpdateMaintenanceInput>
	control: Control<CreateMaintenanceInput | UpdateMaintenanceInput>
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
		{ value: 'OPEN', label: 'Open' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'COMPLETED', label: 'Completed' },
		{ value: 'CANCELED', label: 'Canceled' },
		{ value: 'ON_HOLD', label: 'On Hold' }
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
					<SelectValue placeholder="Select request status" />
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

// Checkbox Field Component
function CheckboxField({
	name,
	control,
	label,
	description
}: {
	name: FieldPath<CreateMaintenanceInput | UpdateMaintenanceInput>
	control: Control<CreateMaintenanceInput | UpdateMaintenanceInput>
	label: string
	description?: string
}) {
	const {
		field,
		fieldState: { error }
	} = useController({
		name,
		control
	})

	const fieldId = `field-${name}`

	return (
		<div className="items-top flex space-x-2">
			<Checkbox
				id={fieldId}
				checked={Boolean(field.value)}
				onCheckedChange={field.onChange}
			/>
			<div className="grid gap-1.5 leading-none">
				<Label
					htmlFor={fieldId}
					className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{label}
				</Label>
				{description && (
					<p className="text-muted-foreground text-xs">
						{description}
					</p>
				)}
			</div>
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

export function MaintenanceForm({
	request,
	mode = 'create',
	onSuccess,
	onClose,
	className
}: MaintenanceFormProps) {
	const [isPending, startTransition] = useTransition()
	const isEditing = mode === 'edit' && Boolean(request)
	const { trackEvent } = usePostHog()
	const { trackUserError } = useBusinessEvents()
	const { trackFormSubmission } = useInteractionTracking()

	const title = isEditing ? 'Edit Maintenance Request' : 'Create New Request'
	const description = isEditing
		? 'Update maintenance request information and details'
		: 'Create a new maintenance request for your property'

	// Fetch units for dropdown
	const { data: units } = useUnits()

	// React Query mutations with optimistic updates
	const createMutation = useCreateMaintenanceRequest()
	const updateMutation = useUpdateMaintenanceRequest()

	// React Hook Form setup - simplified to match API interface
	const form = useForm<CreateMaintenanceInput | UpdateMaintenanceInput>({
		defaultValues:
			isEditing && request
				? {
						unitId: request.unitId ?? '',
						title: request.title ?? '',
						description: request.description ?? '',
						category: request.category ?? '',
						priority: request.priority ?? 'MEDIUM',
						status: request.status ?? 'OPEN',
						preferredDate: request.preferredDate ?? '',
						allowEntry: request.allowEntry ?? false,
						contactPhone: request.contactPhone ?? '',
						requestedBy: request.requestedBy ?? '',
						notes: request.notes ?? '',
						assignedTo: request.assignedTo ?? '',
						estimatedCost: request.estimatedCost ?? undefined,
						actualCost: request.actualCost ?? undefined
					}
				: {
						unitId: '',
						title: '',
						description: '',
						category: '',
						priority: 'MEDIUM',
						status: 'OPEN',
						preferredDate: '',
						allowEntry: false,
						contactPhone: '',
						requestedBy: '',
						notes: '',
						assignedTo: '',
						estimatedCost: undefined,
						actualCost: undefined
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
			form_type: 'maintenance',
			form_mode: mode,
			has_existing_data: !!request
		})
	}, [trackEvent, mode, request])

	// Form submission handler using React Hook Form
	const onSubmit = (
		formData: CreateMaintenanceInput | UpdateMaintenanceInput
	) => {
		// Track form submission attempt
		trackEvent('form_submitted', {
			form_type: 'maintenance',
			form_mode: mode,
			has_existing_data: !!request,
			request_id: request?.id
		})

		startTransition(async () => {
			try {
				if (isEditing) {
					// Update existing request
					if (!request) {
						throw new Error('Request missing for update')
					}

					const fd = formData as UpdateMaintenanceInput
					const requestData: UpdateMaintenanceInput = {
						title: fd.title,
						description: fd.description,
						category: fd.category,
						priority: fd.priority,
						status: fd.status,
						preferredDate: fd.preferredDate || undefined,
						allowEntry: fd.allowEntry,
						contactPhone: fd.contactPhone || undefined,
						requestedBy: fd.requestedBy || undefined,
						notes: fd.notes || undefined,
						assignedTo: fd.assignedTo || undefined,
						estimatedCost: fd.estimatedCost || undefined,
						actualCost: fd.actualCost || undefined
					}

					const updatedRequest = await updateMutation.mutateAsync({
						id: request.id,
						input: requestData
					})

					trackEvent('maintenance_request_updated', {
						request_id: updatedRequest.id,
						form_type: 'maintenance'
					})

					onSuccess?.(updatedRequest)
				} else {
					// Create new request
					const fd = formData as CreateMaintenanceInput
					const requestData: CreateMaintenanceInput = {
						unitId: fd.unitId,
						title: fd.title,
						description: fd.description,
						category: fd.category,
						priority: fd.priority || 'MEDIUM',
						status: fd.status || 'OPEN',
						preferredDate: fd.preferredDate || undefined,
						allowEntry: fd.allowEntry || false,
						contactPhone: fd.contactPhone || undefined,
						requestedBy: fd.requestedBy || undefined,
						notes: fd.notes || undefined
					}

					const newRequest =
						await createMutation.mutateAsync(requestData)

					trackEvent('maintenance_request_created', {
						request_id: newRequest.id,
						form_type: 'maintenance'
					})

					trackFormSubmission('maintenance_form', true)
					onSuccess?.(newRequest)

					// Reset form for create mode
					reset()
				}
			} catch (error) {
				logger.error(
					'Form submission error:',
					error instanceof Error ? error : new Error(String(error)),
					{ component: 'maintenanceform' }
				)

				// Track form submission error
				trackEvent('form_submission_failed', {
					form_type: 'maintenance',
					form_mode: mode,
					error_message:
						error instanceof Error
							? error.message
							: 'Unknown error',
					request_id: request?.id
				})

				// Track enhanced error event
				trackFormSubmission('maintenance_form', false, [
					error instanceof Error ? error.message : 'Unknown error'
				])
				trackUserError({
					error_type: 'maintenance_form_submission_failed',
					error_message:
						error instanceof Error
							? error.message
							: 'Unknown error',
					page_url: window.location.href,
					user_action:
						mode === 'edit'
							? 'update_maintenance'
							: 'create_maintenance'
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
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
									<Wrench className="text-primary h-4 w-4 dark:text-orange-400" />
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
							title="Request Details"
							description="Basic information about the maintenance request"
						>
							<div className="grid grid-cols-1 gap-6">
								{units && !isEditing && (
									<UnitSelectField
										name="unitId"
										control={control}
										label="Unit"
										required
										units={units}
									/>
								)}

								<FormField
									name="title"
									control={control}
									label="Request Title"
									placeholder="e.g., Leaky faucet in kitchen"
									required
								/>

								<FormField
									name="description"
									control={control}
									label="Description"
									placeholder="Detailed description of the issue..."
									multiline
									rows={4}
									required
								/>

								<div className="grid grid-cols-2 gap-4">
									<FormField
										name="category"
										control={control}
										label="Category"
										placeholder="e.g., Plumbing, Electrical"
										required
									/>

									<PrioritySelectField
										name="priority"
										control={control}
										label="Priority"
										required
									/>
								</div>
							</div>
						</FormSection>

						{/* Status and Assignment Section (Edit mode) */}
						{isEditing && (
							<FormSection
								title="Status & Assignment"
								description="Current status and assignment details"
							>
								<div className="grid grid-cols-1 gap-6">
									<div className="grid grid-cols-2 gap-4">
										<StatusSelectField
											name="status"
											control={control}
											label="Status"
											required
										/>

										<FormField
											name="assignedTo"
											control={control}
											label="Assigned To"
											placeholder="Technician or contractor"
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<FormField
											name="estimatedCost"
											control={control}
											label="Estimated Cost"
											type="number"
											placeholder="0.00"
											description="Estimated cost in USD"
										/>

										<FormField
											name="actualCost"
											control={control}
											label="Actual Cost"
											type="number"
											placeholder="0.00"
											description="Final cost in USD"
										/>
									</div>
								</div>
							</FormSection>
						)}

						{/* Additional Details Section */}
						<FormSection
							title="Additional Information"
							description="Optional details and contact information"
						>
							<div className="grid grid-cols-1 gap-6">
								<div className="grid grid-cols-2 gap-4">
									<FormField
										name="preferredDate"
										control={control}
										label="Preferred Date"
										type="date"
										description="When would you like this completed?"
									/>

									<FormField
										name="contactPhone"
										control={control}
										label="Contact Phone"
										placeholder="(555) 123-4567"
									/>
								</div>

								<FormField
									name="requestedBy"
									control={control}
									label="Requested By"
									placeholder="Tenant name or contact"
								/>

								<CheckboxField
									name="allowEntry"
									control={control}
									label="Allow Entry"
									description="Permission to enter unit when tenant is not present"
								/>

								<FormField
									name="notes"
									control={control}
									label="Additional Notes"
									placeholder="Any additional information or special instructions..."
									multiline
									rows={3}
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
											? 'Update Request'
											: 'Create Request'}
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
export type {
	MaintenanceFormProps,
	CreateMaintenanceInput,
	UpdateMaintenanceInput
}
