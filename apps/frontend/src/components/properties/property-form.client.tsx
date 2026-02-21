'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { createClient } from '#lib/supabase/client'
import {
	useCreatePropertyMutation,
	useUpdatePropertyMutation
} from '#hooks/api/use-properties'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { useSupabaseUser } from '#hooks/api/use-auth'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, PropertyType } from '@repo/shared/types/core'
import { propertyFormSchema } from '@repo/shared/validation/properties'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { handleMutationError } from '#lib/mutation-error-handler'
import { cn } from '#lib/utils'

import { PropertyFormSuccessState } from './property-form-success-state'
import { PropertyInfoSection } from './sections/property-info-section'
import { PropertyAddressSection } from './sections/property-address-section'
import { PropertyImagesEditSection } from './sections/property-images-edit-section'
import {
	PropertyImagesCreateSection,
	type FileWithStatus
} from './sections/property-images-create-section'
import { PropertyFormActions } from './sections/property-form-actions'
import { uploadPropertyImages } from './property-form-upload'
import { usePropertyImageDropzone } from './use-property-image-dropzone'
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'

interface PropertyFormProps {
	mode: 'create' | 'edit'
	property?: Property
	onSuccess?: () => void
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
	showSuccessState = mode === 'create',
	className
}: PropertyFormProps) {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const [uploadingImages, setUploadingImages] = useState(false)
	const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([])
	const isMountedRef = useRef(true)

	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
		}
	}, [])

	const { data: user } = useSupabaseUser()
	const router = useRouter()
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'PropertyForm' })
	const supabase = createClient()

	const createPropertyMutation = useCreatePropertyMutation()
	const updatePropertyMutation = useUpdatePropertyMutation()

	const mutation =
		mode === 'create' ? createPropertyMutation : updatePropertyMutation

	const { getRootProps, getInputProps, isDragActive } = usePropertyImageDropzone({
		setFilesWithStatus
	})

	const validationSchema = propertyFormSchema.pick({
		name: true,
		property_type: true,
		address_line1: true,
		city: true,
		state: true,
		postal_code: true
	})

	useEffect(() => {
		if (mode === 'edit' && property) {
			queryClient.setQueryData(
				propertyQueries.detail(property.id).queryKey,
				property
			)
		}
	}, [mode, property, queryClient])

	const filesWithStatusRef = useRef<FileWithStatus[]>([])
	filesWithStatusRef.current = filesWithStatus
	useEffect(() => {
		return () => {
			for (const { objectUrl } of filesWithStatusRef.current) {
				URL.revokeObjectURL(objectUrl)
			}
		}
	}, [])

	const form = useForm({
		defaultValues: {
			name: property?.name ?? '',
			property_type: (property?.property_type ??
				'SINGLE_FAMILY') as PropertyType,
			address_line1: property?.address_line1 ?? '',
			address_line2: property?.address_line2 ?? '',
			city: property?.city ?? '',
			state: property?.state ?? '',
			postal_code: property?.postal_code ?? '',
			country: property?.country ?? 'US',
			acquisition_cost: (property?.acquisition_cost !== null && property?.acquisition_cost !== undefined
				? Number(property.acquisition_cost)
				: null) as number | null,
			acquisition_date: property?.acquisition_date ?? ''
		},
		onSubmit: async ({ value }) => {
			try {
				if (mode === 'create') {
					await handleCreateSubmit(value)
				} else {
					await handleEditSubmit(value)
				}
				onSuccess?.()
			} catch (error) {
				handleMutationError(
					error,
					`${mode === 'create' ? 'Create' : 'Update'} property`
				)
			}
		},
		validators: {
			onBlur: ({ value }) => {
				const result = validationSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			},
			onSubmitAsync: ({ value }) => {
				const result = validationSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	async function handleCreateSubmit(
		value: typeof form.state.values
	): Promise<void> {
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
			status: 'active' as const,
			...(value.address_line2 ? { address_line2: value.address_line2 } : {}),
			...(value.acquisition_cost !== null
				? { acquisition_cost: value.acquisition_cost }
				: {}),
			...(value.acquisition_date
				? { acquisition_date: value.acquisition_date }
				: {})
		}
		logger.info('Creating property', { action: 'formSubmission', data: createData })

		const newProperty = await createPropertyMutation.mutateAsync(createData)

		if (filesWithStatus.length > 0) {
			await uploadPropertyImages({
				propertyId: newProperty.id,
				files: filesWithStatus,
				supabase,
				queryClient,
				isMountedRef,
				setUploadingImages,
				setFilesWithStatus
			})
		} else {
			toast.success('Property created successfully')
		}

		if (showSuccessState) {
			setIsSubmitted(true)
		}
		form.reset()
	}

	async function handleEditSubmit(
		value: typeof form.state.values
	): Promise<void> {
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
			...(value.address_line2 ? { address_line2: value.address_line2 } : {}),
			...(value.acquisition_cost !== null
				? { acquisition_cost: value.acquisition_cost }
				: { acquisition_cost: null }),
			...(value.acquisition_date
				? { acquisition_date: value.acquisition_date }
				: { acquisition_date: null })
		}
		logger.info('Updating property', {
			action: 'formSubmission',
			property_id: property.id,
			data: updateData
		})

		await updatePropertyMutation.mutateAsync({ id: property.id, data: updateData })
		toast.success('Property updated successfully')

		if (!onSuccess) {
			router.back()
		}
	}

	function handleRemoveFile(index: number): void {
		setFilesWithStatus(prev => {
			const removed = prev[index]
			if (removed) URL.revokeObjectURL(removed.objectUrl)
			return prev.filter((_, i) => i !== index)
		})
	}

	if (showSuccessState && isSubmitted) {
		return <PropertyFormSuccessState />
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
				<div className="space-y-4 border rounded-lg p-6">
					<PropertyInfoSection form={form} />
					<PropertyAddressSection form={form} />
				</div>

				{/* Acquisition Details (optional) */}
				<div className="space-y-4 border rounded-lg p-6">
					<div>
						<h3 className="text-sm font-medium">Acquisition Details</h3>
						<p className="text-xs text-muted-foreground mt-1">
							Optional. Used for accurate depreciation calculations in your tax documents.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<form.Field name="acquisition_cost">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="acquisition_cost">Purchase Price</Label>
									<Input
										id="acquisition_cost"
										type="number"
										step="0.01"
										min="0"
										placeholder="e.g. 250000"
										value={field.state.value ?? ''}
										onChange={e => {
											const raw = e.target.value
											field.handleChange(raw === '' ? null : parseFloat(raw))
										}}
										onBlur={field.handleBlur}
									/>
									{(field.state.meta.errors?.length ?? 0) > 0 && (
										<p className="text-xs text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="acquisition_date">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="acquisition_date">Purchase Date</Label>
									<Input
										id="acquisition_date"
										type="date"
										value={field.state.value ?? ''}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{(field.state.meta.errors?.length ?? 0) > 0 && (
										<p className="text-xs text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									)}
								</div>
							)}
						</form.Field>
					</div>
				</div>

				{mode === 'edit' && property?.id && (
					<PropertyImagesEditSection propertyId={property.id} />
				)}

				{mode === 'create' && (
					<PropertyImagesCreateSection
						getRootProps={getRootProps}
						getInputProps={getInputProps}
						isDragActive={isDragActive}
						uploadingImages={uploadingImages}
						filesWithStatus={filesWithStatus}
						onRemoveFile={handleRemoveFile}
					/>
				)}

				<PropertyFormActions
					mode={mode}
					isPending={mutation.isPending}
					uploadingImages={uploadingImages}
				/>
			</form>
		</div>
	)
}
