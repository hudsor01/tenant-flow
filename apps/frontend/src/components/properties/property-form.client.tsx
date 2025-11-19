'use client'

import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'

import { useModalStore } from '#stores/modal-store'
import { PropertyImageGallery } from './property-image-gallery'
import { PropertyImageUpload } from './property-image-upload'

import {
	useCreateProperty,
	useUpdateProperty,
	propertiesKeys
} from '#hooks/api/use-properties'
import { useSupabaseUser } from '#hooks/api/use-auth'


import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, PropertyType } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { handleMutationError } from '#lib/mutation-error-handler'
import { cn } from '#lib/utils'

interface PropertyFormProps {
	mode: 'create' | 'edit'
	property?: Property
	onSuccess?: () => void
	modalId?: string // For modal store integration
	showSuccessState?: boolean
	className?: string
}

/**
 * Consolidated Property Form Component
 *
 * Supports both create and edit modes with a single, reusable implementation.
 *
 * @param mode - 'create' | 'edit' determines form behavior
 * @param property - Required for edit mode, provides initial values
 * @param onSuccess - Optional callback after successful submission
 * @param showSuccessState - Whether to show success UI (default: true for create, false for edit)
 */
export function PropertyForm({
	mode,
	property,
	onSuccess,
	modalId,
	showSuccessState = mode === 'create',
	className
}: PropertyFormProps) {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const { data: user } = useSupabaseUser()
	const router = useRouter()
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'PropertyForm' })

	const createPropertyMutation = useCreateProperty()
	const updatePropertyMutation = useUpdateProperty()

	const mutation =
		mode === 'create' ? createPropertyMutation : updatePropertyMutation

	// Validation schema
	const validationSchema = z.object({
		name: z.string().min(3, 'Property name must be at least 3 characters'),
		property_type: z.string(),
		address_line1: z.string().min(5, 'Address is required'),
		city: z.string().min(2, 'City is required'),
		state: z.string().length(2, 'State must be 2 characters'),
		postal_code: z.string().min(5, 'ZIP code is required')
	})

	// Sync server-fetched property into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && property) {
			queryClient.setQueryData(propertiesKeys.detail(property.id), property)
		}
	}, [mode, property, queryClient])

	// Initialize form
	const { trackMutation, closeOnMutationSuccess } = useModalStore()

	const form = useForm({
		defaultValues: {
			name: property?.name ?? '',
			property_type: (property?.property_type ?? 'single_family') as PropertyType,
			address_line1: property?.address_line1 ?? '',
			address_line2: property?.address_line2 ?? '',
			city: property?.city ?? '',
			state: property?.state ?? '',
			postal_code: property?.postal_code ?? '',
			country: property?.country ?? 'US'
		},
		onSubmit: async ({ value }) => {
			try {
				if (mode === 'create') {
					if (!user?.id) {
						toast.error('You must be logged in to create a property')
						logger.error('User not authenticated', { action: 'formSubmission' })
						return
					}
					const createData = {
						name: value.name,
						address_line1: value.address_line1,
						city: value.city,
						state: value.state,
						postal_code: value.postal_code,
						country: value.country,
						property_type: value.property_type,
						property_owner_id: user.id,
						...(value.address_line2 ? { address_line2: value.address_line2 } : {})
					}
					logger.info('Creating property', {
						action: 'formSubmission',
						data: createData
					})

					// Track mutation for auto-close if in modal
					if (modalId) {
						trackMutation(modalId, 'create-property', queryClient)
					}

					await createPropertyMutation.mutateAsync(createData)
					toast.success('Property created successfully')

					if (showSuccessState) {
						setIsSubmitted(true)
					}
					form.reset()

					// Close modal on success if tracked
					if (modalId) {
						closeOnMutationSuccess('create-property')
					}
				} else {
					// Edit mode
					if (!property?.id) {
						toast.error('Property ID is missing')
						return
					}
					const updateData = {
						name: value.name,
						address_line1: value.address_line1,
						city: value.city,
						state: value.state,
						postal_code: value.postal_code,
						country: value.country,
						property_type: value.property_type,
						...(value.address_line2 ? { address_line2: value.address_line2 } : {})
					}
					logger.info('Updating property', {
						action: 'formSubmission',
						property_id: property.id,
						data: updateData
					})

					// Track mutation for auto-close if in modal
					if (modalId) {
						trackMutation(modalId, 'update-property', queryClient)
					}

					await updatePropertyMutation.mutateAsync({
						id: property.id,
						data: updateData
					})
					toast.success('Property updated successfully')

					// Close modal on success if tracked
					if (modalId) {
						closeOnMutationSuccess('update-property')
					}

					// Navigate back if no custom onSuccess handler
					if (!onSuccess) {
						router.back()
					}
				}

				onSuccess?.()
			} catch (error) {
				handleMutationError(error, `${mode === 'create' ? 'Create' : 'Update'} property`)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = validationSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	// Success state (create mode only)
	if (showSuccessState && isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center">
				<CheckCircle className="size-16 text-success" />
				<h2 className="text-2xl font-bold">Property Created!</h2>
				<p className="text-muted-foreground">
					Your property has been successfully added to your portfolio.
				</p>
				<Button onClick={() => router.push('/manage/properties')}>
					Return to Properties
				</Button>
			</div>
		)
	}

	return (
		<div className={cn('mx-auto max-w-2xl space-y-6', className)}>
			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-6"
			>
				{/* Property Information */}
				<div className="space-y-4 border rounded-lg p-6">
					<form.Field name="name">
						{field => (
							<Field>
								<FieldLabel htmlFor="name">Property Name *</FieldLabel>
								<Input
									id="name"
									name="name"
									autoComplete="organization"
									placeholder="e.g. Sunset Apartments"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
								{(field.state.meta.errors?.length ?? 0) > 0 && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="property_type">
						{field => (
							<Field>
								<FieldLabel htmlFor="property_type">Property Type *</FieldLabel>
								<input
									type="hidden"
									name="property_type"
									value={field.state.value}
									readOnly
								/>
								<Select
									value={field.state.value}
									onValueChange={(value: string) =>
										field.handleChange(value as PropertyType)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select property type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="single_family">Single Family</SelectItem>
										<SelectItem value="multi_family">Multi Family</SelectItem>
										<SelectItem value="apartment">Apartment</SelectItem>
										<SelectItem value="commercial">Commercial</SelectItem>
										<SelectItem value="condo">Condo</SelectItem>
										<SelectItem value="townhouse">Townhouse</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						)}
					</form.Field>

					<form.Field name="address_line1">
						{field => (
							<Field>
								<FieldLabel htmlFor="address_line1">Address *</FieldLabel>
								<Input
									id="address_line1"
									name="address_line1"
									autoComplete="street-address"
									placeholder="123 Main St"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
								{(field.state.meta.errors?.length ?? 0) > 0 && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="address_line2">
						{field => (
							<Field>
								<FieldLabel htmlFor="address_line2">Address Line 2 (Optional)</FieldLabel>
								<Input
									id="address_line2"
									name="address_line2"
									placeholder="Apt, Suite, Unit, etc."
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<form.Field name="city">
							{field => (
								<Field>
									<FieldLabel htmlFor="city">City *</FieldLabel>
									<Input
										id="city"
										name="city"
										autoComplete="address-level2"
										placeholder="City"
										value={field.state.value}
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

						<form.Field name="state">
							{field => (
								<Field>
									<FieldLabel htmlFor="state">State *</FieldLabel>
									<Input
										id="state"
										name="state"
										autoComplete="address-level1"
										placeholder="CA"
										maxLength={2}
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value.toUpperCase())
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

						<form.Field name="postal_code">
							{field => (
								<Field>
									<FieldLabel htmlFor="postal_code">ZIP Code *</FieldLabel>
									<Input
										id="postal_code"
										name="postal_code"
										autoComplete="postal-code"
										inputMode="numeric"
										placeholder="12345"
										value={field.state.value}
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
					</div>

					<form.Field name="country">
						{field => (
							<Field>
								<FieldLabel htmlFor="country">Country *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value: string) => field.handleChange(value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select country" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="US">United States</SelectItem>
										<SelectItem value="CA">Canada</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						)}
					</form.Field>
				</div>

				{/* Property Images - only in edit mode, after property is created */}
				{mode === 'edit' && property?.id && (
					<div className="space-y-4 border rounded-lg p-6">
						<h3 className="text-lg font-semibold">Property Images</h3>
						<p className="text-sm text-muted-foreground">
							Manage your property photos. First uploaded image appears on property card.
						</p>

						{/* Gallery - view existing images */}
						<PropertyImageGallery propertyId={property.id} editable={true} />

						{/* Upload form - add new images */}
						<div className="border-t pt-4 mt-4">
							<h4 className="text-sm font-medium mb-4">Add New Images</h4>
							<PropertyImageUpload propertyId={property.id} />
						</div>
					</div>
				)}

				{/* Create mode message */}
				{mode === 'create' && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p className="text-sm text-blue-800">
							Save property first to upload images. Images help attract tenants and showcase your property.
						</p>
					</div>
				)}

				{/* Submit Button */}
				<div className="flex justify-end gap-4 pt-6 border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => window.history.back()}
					>
						Cancel
					</Button>

					<Button
						type="submit"
						disabled={mutation.isPending}
						className="flex items-center gap-2"
					>
						<CheckCircle className="size-4" />
						{mutation.isPending
							? mode === 'create'
								? 'Creating...'
								: 'Updating...'
							: mode === 'create'
								? 'Create Property'
								: 'Update Property'}
					</Button>
				</div>
			</form>
		</div>
	)
}
