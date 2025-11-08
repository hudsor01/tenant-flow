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
import { Textarea } from '#components/ui/textarea'
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState
} from '#components/ui/dropzone'

import {
	useCreateProperty,
	useUpdateProperty,
	propertiesKeys
} from '#hooks/api/use-properties'
import { useSupabaseUser } from '#hooks/api/use-supabase-auth'
import { useSupabaseUpload } from '#hooks/use-supabase-upload'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	transformPropertyFormData,
	transformPropertyUpdateData
} from '@repo/shared/validation/properties'
import type { Property } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { SUPABASE_URL } from '@repo/shared/config/supabase'
import { ERROR_MESSAGES } from '#lib/constants'

type PropertyType = Database['public']['Enums']['PropertyType']

interface PropertyFormProps {
	mode: 'create' | 'edit'
	property?: Property
	onSuccess?: () => void
	showSuccessState?: boolean
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
	showSuccessState = mode === 'create'
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
		propertyType: z.string(),
		address: z.string().min(5, 'Address is required'),
		city: z.string().min(2, 'City is required'),
		state: z.string().length(2, 'State must be 2 characters'),
		zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code')
	})

	// Sync server-fetched property into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && property) {
			queryClient.setQueryData(propertiesKeys.detail(property.id), property)
		}
	}, [mode, property, queryClient])

	// Initialize form
	const form = useForm({
		defaultValues: {
			name: property?.name ?? '',
			description: property?.description ?? '',
			propertyType: (property?.propertyType ?? 'SINGLE_FAMILY') as PropertyType,
			address: property?.address ?? '',
			city: property?.city ?? '',
			state: property?.state ?? '',
			zipCode: property?.zipCode ?? '',
			imageUrl: property?.imageUrl ?? ''
		},
		onSubmit: async ({ value }) => {
			try {
				if (mode === 'create') {
					if (!user?.id) {
						toast.error('You must be logged in to create a property')
						logger.error('User not authenticated', { action: 'formSubmission' })
						return
					}
					const transformedData = transformPropertyFormData(value)
					logger.info('Creating property', {
						action: 'formSubmission',
						data: transformedData
					})
					await createPropertyMutation.mutateAsync(transformedData)
					toast.success('Property created successfully')

					if (showSuccessState) {
						setIsSubmitted(true)
					}
					form.reset()
				} else {
					// Edit mode
					if (!property?.id) {
						toast.error('Property ID is missing')
						return
					}
					const transformedData = transformPropertyUpdateData(value)
					logger.info('Updating property', {
						action: 'formSubmission',
						propertyId: property.id,
						data: transformedData
					})
					await updatePropertyMutation.mutateAsync({
						id: property.id,
						data: transformedData,
						version: property.version
					})
					toast.success('Property updated successfully')

					// Navigate back if no custom onSuccess handler
					if (!onSuccess) {
						router.back()
					}
				}

				onSuccess?.()
			} catch (error) {
				logger.error(`Property ${mode} failed`, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					details: JSON.stringify(error, null, 2)
				})

				const errorMessage =
					error instanceof Error ? error.message : ERROR_MESSAGES.GENERIC_FAILED(mode, 'property')
				toast.error(errorMessage)
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

	// Initialize image upload hook (both create and edit modes)
	const upload = useSupabaseUpload({
		bucketName: 'property-images',
		path: 'temp',
		allowedMimeTypes: [
			'image/png',
			'image/jpeg',
			'image/jpg',
			'image/webp',
			'image/heic'
		],
		maxFileSize: 10 * 1024 * 1024, // 10MB
		maxFiles: 1
	})

	// Watch for successful uploads and update imageUrl field (both modes)
	useEffect(() => {
		if (upload.isSuccess && upload.successes.length > 0) {
			const uploadedFileName = upload.successes[0]
			const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/property-images/temp/${uploadedFileName}`
			form.setFieldValue('imageUrl', imageUrl)
			toast.success('Property image uploaded successfully')
		}
	}, [form, upload.isSuccess, upload.successes])

	// Success state (create mode only)
	if (showSuccessState && isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center">
				<CheckCircle className="size-16 text-green-500" />
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
		<div className="max-w-2xl mx-auto space-y-6">
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

					<form.Field name="propertyType">
						{field => (
							<Field>
								<FieldLabel htmlFor="propertyType">Property Type *</FieldLabel>
								<input
									type="hidden"
									name="propertyType"
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
										<SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
										<SelectItem value="MULTI_UNIT">Multi Unit</SelectItem>
										<SelectItem value="APARTMENT">Apartment</SelectItem>
										<SelectItem value="COMMERCIAL">Commercial</SelectItem>
										<SelectItem value="CONDO">Condo</SelectItem>
										<SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
										<SelectItem value="OTHER">Other</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						)}
					</form.Field>

					<form.Field name="address">
						{field => (
							<Field>
								<FieldLabel htmlFor="address">Address *</FieldLabel>
								<Input
									id="address"
									name="address"
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

					<div className="grid grid-cols-3 gap-4">
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

						<form.Field name="zipCode">
							{field => (
								<Field>
									<FieldLabel htmlFor="zipCode">ZIP Code *</FieldLabel>
									<Input
										id="zipCode"
										name="zipCode"
										autoComplete="postal-code"
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

					<form.Field name="description">
						{field => (
							<Field>
								<FieldLabel htmlFor="description">Description</FieldLabel>
								<Textarea
									id="description"
									placeholder="Brief description of the property..."
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

					<form.Field name="imageUrl">
						{field => (
							<Field>
								<FieldLabel>Property Image (Optional)</FieldLabel>
								<div className="space-y-3">
									{/* Show existing image in edit mode */}
									{mode === 'edit' && field.state.value && (
										<div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border bg-muted">
											<img
												src={field.state.value}
												alt="Property"
												className="object-cover w-full h-full"
											/>
											<Button
												type="button"
												variant="destructive"
												size="sm"
												className="absolute top-2 right-2"
												onClick={() => {
													form.setFieldValue('imageUrl', '')
													toast.success('Image removed')
												}}
											>
												Remove Image
											</Button>
										</div>
									)}

									{/* Upload new image */}
									<div>
										{mode === 'edit' && field.state.value ? (
											<p className="text-sm text-muted-foreground mb-2">
												Upload a new image to replace the current one
											</p>
										) : null}
										<Dropzone {...upload}>
											<DropzoneEmptyState />
											<DropzoneContent />
										</Dropzone>
									</div>

									{mutation.isSuccess && field.state.value && (
										<p className="text-sm text-muted-foreground">
											Image uploaded successfully
										</p>
									)}
								</div>
							</Field>
						)}
					</form.Field>
				</div>

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
