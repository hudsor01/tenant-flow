'use client'

import { CheckCircle, Upload, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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

import { PropertyImageGallery } from './property-image-gallery'
import { PropertyImageDropzone } from './property-image-dropzone'
import { createClient } from '#lib/supabase/client'
import { useDropzone } from 'react-dropzone'

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

interface PropertyFormProps {
	mode: 'create' | 'edit'
	property?: Property
	onSuccess?: () => void
	showSuccessState?: boolean
	className?: string
}

type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error'

interface FileWithStatus {
	file: File
	status: FileUploadStatus
	error?: string
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

	// Image dropzone for create mode - store files locally, upload after property created
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		accept: {
			'image/jpeg': ['.jpg', '.jpeg'],
			'image/png': ['.png'],
			'image/webp': ['.webp'],
			'image/gif': ['.gif']
		},
		maxSize: 10 * 1024 * 1024, // 10MB per file
		maxFiles: 10,
		onDrop: acceptedFiles => {
			const newFiles: FileWithStatus[] = acceptedFiles.map(file => ({
				file,
				status: 'pending' as const
			}))
			setFilesWithStatus(prev => [...prev, ...newFiles].slice(0, 10))
		}
	})

	// Use shared validation schema (partial for form fields only)
	const validationSchema = propertyFormSchema.pick({
		name: true,
		property_type: true,
		address_line1: true,
		city: true,
		state: true,
		postal_code: true
	})

	// Sync server-fetched property into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && property) {
			queryClient.setQueryData(
				propertyQueries.detail(property.id).queryKey,
				property
			)
		}
	}, [mode, property, queryClient])

	// Cache object URLs to avoid recreating them on every render and memory leaks
	const objectUrlsRef = useRef<Map<File, string>>(new Map())
	useEffect(() => {
		const currentFiles = new Set(filesWithStatus.map(f => f.file))

		// Revoke URLs for files that were removed
		for (const [file, url] of objectUrlsRef.current) {
			if (!currentFiles.has(file)) {
				URL.revokeObjectURL(url)
				objectUrlsRef.current.delete(file)
			}
		}

		// Create URLs only for newly added files
		for (const { file } of filesWithStatus) {
			if (!objectUrlsRef.current.has(file)) {
				objectUrlsRef.current.set(file, URL.createObjectURL(file))
			}
		}

		return () => {
			const urlMap = objectUrlsRef.current
			for (const url of urlMap.values()) {
				URL.revokeObjectURL(url)
			}
			urlMap.clear()
		}
	}, [filesWithStatus])

	// Initialize form
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
						status: 'active' as const,
						...(value.address_line2
							? { address_line2: value.address_line2 }
							: {})
						// Note: owner_user_id is set by backend from authenticated user
					}
					logger.info('Creating property', {
						action: 'formSubmission',
						data: createData
					})

					const newProperty = await createPropertyMutation.mutateAsync(createData)

					// Upload selected images if any
					if (filesWithStatus.length > 0) {
						setUploadingImages(true)
						try {
							const uploadPromises = filesWithStatus.map(async (fileWithStatus, index) => {
								const { file } = fileWithStatus

								// Update status to uploading
								setFilesWithStatus(prev =>
									prev.map((f, i) =>
										i === index ? { ...f, status: 'uploading' as const } : f
									)
								)

								try {
									const fileExt = file.name.split('.').pop()
									const fileName = `${crypto.randomUUID()}.${fileExt}`
									const filePath = `${newProperty.id}/${fileName}`

									const { error: uploadError } = await supabase.storage
										.from('property-images')
										.upload(filePath, file, {
											cacheControl: '3600',
											upsert: false
										})

									if (uploadError) throw uploadError

									// Update status to success
									setFilesWithStatus(prev =>
										prev.map((f, i) =>
											i === index ? { ...f, status: 'success' as const } : f
										)
									)
								} catch (error) {
									// Update status to error
									setFilesWithStatus(prev =>
										prev.map((f, i) =>
											i === index
												? {
														...f,
														status: 'error' as const,
														error: error instanceof Error ? error.message : 'Upload failed'
													}
												: f
										)
									)
									throw error
								}
							})

							await Promise.allSettled(uploadPromises)

							const successCount = filesWithStatus.filter(f => f.status === 'success').length
							const errorCount = filesWithStatus.filter(f => f.status === 'error').length

							logger.info('Images upload completed', {
								propertyId: newProperty.id,
								successCount,
								errorCount
							})

							// Invalidate property images query to show new images
							queryClient.invalidateQueries({
								queryKey: propertyQueries.detail(newProperty.id).queryKey
							})

							if (errorCount === 0) {
								toast.success(
									`Property created with ${successCount} image(s)`
								)
							} else if (successCount > 0) {
								toast.warning(
									`Property created. ${successCount} image(s) uploaded, ${errorCount} failed`
								)
							} else {
								toast.error('Property created but all images failed to upload')
							}
						} catch (error) {
							logger.error('Failed to upload images', { error })
						} finally {
							setUploadingImages(false)
							// Clear files after a delay so user can see final status
							setTimeout(() => {
								if (isMountedRef.current) setFilesWithStatus([])
							}, 2000)
						}
					} else {
						toast.success('Property created successfully')
					}

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
					const updateData = {
						name: value.name,
						address_line1: value.address_line1,
						city: value.city,
						state: value.state,
						postal_code: value.postal_code,
						country: value.country,
						property_type: value.property_type,
						...(value.address_line2
							? { address_line2: value.address_line2 }
							: {})
					}
					logger.info('Updating property', {
						action: 'formSubmission',
						property_id: property.id,
						data: updateData
					})

					await updatePropertyMutation.mutateAsync({
						id: property.id,
						data: updateData
					})
					toast.success('Property updated successfully')

					// Navigate back if no custom onSuccess handler
					if (!onSuccess) {
						router.back()
					}
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

	// Success state (create mode only)
	if (showSuccessState && isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center">
				<CheckCircle className="size-16 text-success" />
				<h2 className="typography-h3">Property Created!</h2>
				<p className="text-muted-foreground">
					Your property has been successfully added to your portfolio.
				</p>
				<Button onClick={() => router.push('/properties')}>
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
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
										<SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
										<SelectItem value="MULTI_UNIT">Multi Family</SelectItem>
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
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
								<FieldLabel htmlFor="address_line2">
									Address Line 2 (Optional)
								</FieldLabel>
								<Input
									id="address_line2"
									name="address_line2"
									placeholder="Apt, Suite, Unit, etc."
									value={field.state.value}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
						<h3 className="typography-large">Property Images</h3>
						<p className="text-muted">
							Manage your property photos. First uploaded image appears on
							property card.
						</p>

						{/* Gallery - view existing images */}
						<PropertyImageGallery propertyId={property.id} editable={true} />

						{/* Upload form - add new images */}
						<div className="border-t pt-4 mt-4">
							<h4 className="typography-small mb-4">Add New Images</h4>
							<PropertyImageDropzone propertyId={property.id} />
						</div>
					</div>
				)}

				{/* Create mode - image upload */}
				{mode === 'create' && (
					<div className="space-y-4 border rounded-lg p-6">
						<h3 className="typography-large">Property Images (Optional)</h3>
						<p className="text-sm text-muted-foreground">
							Add photos to showcase your property. Images will be uploaded after
							property creation. (Max 10 files, 10MB each)
						</p>

						<div
							{...getRootProps()}
							className={cn(
								'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
								isDragActive
									? 'border-primary bg-primary/5'
									: 'border-muted-foreground/25 hover:border-primary/50',
								uploadingImages && 'pointer-events-none opacity-60'
							)}
						>
							<input {...getInputProps()} disabled={uploadingImages} />
							{filesWithStatus.length === 0 ? (
								<div className="space-y-2">
									<Upload className="mx-auto h-12 w-12 text-muted-foreground" />
									<p className="text-sm font-medium">
										{isDragActive
											? 'Drop images here...'
											: 'Drag & drop images here, or click to browse'}
									</p>
									<p className="text-xs text-muted-foreground">
										JPG, PNG, WebP, or GIF (max 10MB each)
									</p>
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-sm font-medium">
										{filesWithStatus.length} image(s) selected
									</p>
									<p className="text-xs text-muted-foreground">
										{uploadingImages
											? 'Uploading...'
											: 'Click or drag to add more (max 10 total)'}
									</p>
								</div>
							)}
						</div>

						{/* Selected files preview with upload status */}
						{filesWithStatus.length > 0 && (
							<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
								{filesWithStatus.map(({ file, status }, index) => (
									<div
										key={index}
										className="relative aspect-square rounded-lg border overflow-hidden group"
									>
										<img
											src={objectUrlsRef.current.get(file) ?? ''}
											alt={file.name}
											className="w-full h-full object-cover"
										/>

										{/* Remove button - only show when not uploading */}
										{status === 'pending' && (
											<button
												type="button"
												onClick={e => {
													e.stopPropagation()
													setFilesWithStatus(prev =>
														prev.filter((_, i) => i !== index)
													)
												}}
												className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
												aria-label="Remove image"
											>
												×
											</button>
										)}

										{/* Upload status overlay */}
										{status !== 'pending' && (
											<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
												{status === 'uploading' && (
													<div className="flex flex-col items-center gap-2 text-white">
														<Loader2 className="h-6 w-6 animate-spin" />
														<span className="text-xs font-medium">Uploading...</span>
													</div>
												)}
												{status === 'success' && (
													<div className="flex flex-col items-center gap-2 text-green-400">
														<CheckCircle className="h-6 w-6" />
														<span className="text-xs font-medium">Uploaded</span>
													</div>
												)}
												{status === 'error' && (
													<div className="flex flex-col items-center gap-2 text-red-400">
														<X className="h-6 w-6" />
														<span className="text-xs font-medium">Failed</span>
													</div>
												)}
											</div>
										)}

										{/* Filename - always visible */}
										<div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
											{file.name}
										</div>
									</div>
								))}
							</div>
						)}
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
						disabled={mutation.isPending || uploadingImages}
						className="flex items-center gap-2"
					>
						<CheckCircle className="size-4" />
						{uploadingImages
							? 'Uploading images...'
							: mutation.isPending
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
