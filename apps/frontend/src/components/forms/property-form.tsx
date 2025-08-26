import React, { useState } from 'react'
import { logger } from '@/lib/logger/logger'
import Image from 'next/image'
import type { CreatePropertyInput, UpdatePropertyInput } from '@repo/shared'
import type { PropertyFormProps, BaseComponentProps } from '@/types'
import { useForm, FormProvider, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { propertyFormSchema } from '@repo/shared/validation'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Controller } from 'react-hook-form'
import {
	useCreateProperty,
	useUpdateProperty
} from '@/hooks/api/use-properties'
// Modal close handler will be passed as prop instead of atom
import { propertyApi } from '@/lib/api/properties'
import { toast } from 'sonner'

interface PropertyImageUploadProps extends BaseComponentProps {
	propertyId: string
	currentImageUrl?: string
	onImageChange: (imageUrl: string) => void
	disabled?: boolean
}

function PropertyImageUpload({
	propertyId,
	currentImageUrl,
	onImageChange,
	disabled
}: PropertyImageUploadProps) {
	const [uploading, setUploading] = useState(false)

	const uploadPropertyImage = async (
		propertyId: string,
		file: File
	): Promise<string> => {
		const formData = new FormData()
		formData.append('image', file)

		const response = await propertyApi.uploadImage(propertyId, formData)
		return response.url
	}

	const handleImageUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0]
		if (!file) {
			return
		}

		setUploading(true)
		try {
			const imageUrl = await uploadPropertyImage(propertyId, file)
			onImageChange(imageUrl)
			toast.success('Image uploaded successfully!')
		} catch {
			toast.error('Failed to upload image')
		} finally {
			setUploading(false)
		}
	}

	return (
		<div className="space-y-4">
			<label className="text-sm font-medium">Property Image</label>
			<div className="flex items-center space-x-4">
				{currentImageUrl && (
					<div className="relative h-20 w-20">
						<Image
							src={currentImageUrl}
							alt="Property"
							width={80}
							height={80}
							className="rounded-lg object-cover"
						/>
						<button
							type="button"
							onClick={() => onImageChange('')}
							className="bg-destructive text-destructive-foreground absolute -right-2 -top-2 rounded-full p-1"
						>
							<X className="h-3 w-3" />
						</button>
					</div>
				)}
				<div>
					<input
						type="file"
						accept="image/*"
						onChange={handleImageUpload}
						className="hidden"
						id="image-upload"
						disabled={uploading || disabled}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							document.getElementById('image-upload')?.click()
						}
						disabled={uploading || disabled}
					>
						{uploading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Upload className="mr-2 h-4 w-4" />
						)}
						{uploading ? 'Uploading...' : 'Upload Image'}
					</Button>
				</div>
			</div>
		</div>
	)
}

interface PropertyFormFieldsProps {
	control: Control<z.input<typeof propertyFormSchema>>
}

function PropertyFormFields({ control }: PropertyFormFieldsProps) {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div className="md:col-span-2">
				<div className="space-y-2">
					<Label htmlFor="name">Property Name *</Label>
					<Controller
						name="name"
						control={control}
						render={({ field, fieldState }) => (
							<>
								<Input
									id="name"
									placeholder="Enter property name"
									{...field}
								/>
								{fieldState.error && (
									<p className="text-destructive text-sm">
										{fieldState.error.message}
									</p>
								)}
							</>
						)}
					/>
				</div>
			</div>

			<div className="md:col-span-2">
				<div className="space-y-2">
					<Label htmlFor="address">Address *</Label>
					<Controller
						name="address"
						control={control}
						render={({ field, fieldState }) => (
							<>
								<Input
									id="address"
									placeholder="Enter street address"
									{...field}
								/>
								{fieldState.error && (
									<p className="text-destructive text-sm">
										{fieldState.error.message}
									</p>
								)}
							</>
						)}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="city">City *</Label>
				<Controller
					name="city"
					control={control}
					render={({ field, fieldState }) => (
						<>
							<Input
								id="city"
								placeholder="Enter city"
								{...field}
							/>
							{fieldState.error && (
								<p className="text-destructive text-sm">
									{fieldState.error.message}
								</p>
							)}
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="state">State *</Label>
				<Controller
					name="state"
					control={control}
					render={({ field, fieldState }) => (
						<>
							<Input id="state" placeholder="CA" {...field} />
							{fieldState.error && (
								<p className="text-destructive text-sm">
									{fieldState.error.message}
								</p>
							)}
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="zipCode">ZIP Code *</Label>
				<Controller
					name="zipCode"
					control={control}
					render={({ field, fieldState }) => (
						<>
							<Input
								id="zipCode"
								placeholder="12345"
								{...field}
							/>
							{fieldState.error && (
								<p className="text-destructive text-sm">
									{fieldState.error.message}
								</p>
							)}
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="propertyType">Property Type *</Label>
				<Controller
					name="propertyType"
					control={control}
					render={({ field, fieldState }) => (
						<>
							<Select
								onValueChange={field.onChange}
								value={field.value}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select property type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="SINGLE_FAMILY">
										Single Family
									</SelectItem>
									<SelectItem value="MULTI_FAMILY">
										Multi Family
									</SelectItem>
									<SelectItem value="APARTMENT">
										Apartment
									</SelectItem>
									<SelectItem value="CONDO">Condo</SelectItem>
									<SelectItem value="TOWNHOUSE">
										Townhouse
									</SelectItem>
									<SelectItem value="COMMERCIAL">
										Commercial
									</SelectItem>
								</SelectContent>
							</Select>
							{fieldState.error && (
								<p className="text-destructive text-sm">
									{fieldState.error.message}
								</p>
							)}
						</>
					)}
				/>
			</div>

			<div className="md:col-span-2">
				<div className="space-y-2">
					<Label htmlFor="description">Description</Label>
					<Controller
						name="description"
						control={control}
						render={({ field, fieldState }) => (
							<>
								<Textarea
									id="description"
									placeholder="Describe the property..."
									rows={3}
									{...field}
								/>
								{fieldState.error && (
									<p className="text-destructive text-sm">
										{fieldState.error.message}
									</p>
								)}
							</>
						)}
					/>
				</div>
			</div>
		</div>
	)
}

export function PropertyForm({
	property,
	onSuccess,
	onCancel
}: PropertyFormProps) {
	// Modal close will be handled by parent component or navigation

	// React Query mutations
	const createPropertyMutation = useCreateProperty()
	const updatePropertyMutation = useUpdateProperty()

	// Form setup with correct TypeScript signature for zodResolver
	const form = useForm<
		z.input<typeof propertyFormSchema>,
		unknown,
		z.output<typeof propertyFormSchema>
	>({
		resolver: zodResolver(propertyFormSchema),
		defaultValues: property
			? {
					name: property.name,
					address: property.address,
					city: property.city,
					state: property.state,
					zipCode: property.zipCode,
					description: property.description ?? '',
					propertyType: property.propertyType,
					imageUrl: property.imageUrl ?? ''
				}
			: {
					name: '',
					address: '',
					city: '',
					state: '',
					zipCode: '',
					description: '',
					propertyType: 'SINGLE_FAMILY',
					imageUrl: ''
				},
		mode: 'onChange'
	})

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors }
	} = form
	const isSubmitting =
		createPropertyMutation.isPending || updatePropertyMutation.isPending

	// Separate handlers for create and update operations
	const handleCreateProperty = async (
		data: z.output<typeof propertyFormSchema>
	) => {
		const createData: CreatePropertyInput = {
			name: data.name,
			address: data.address,
			city: data.city,
			state: data.state,
			zipCode: data.zipCode,
			description: data.description ?? undefined,
			propertyType: data.propertyType,
			imageUrl: data.imageUrl ?? undefined
		}

		const result = await createPropertyMutation.mutateAsync(createData)
		onSuccess?.(result)
		// Modal close is handled by onSuccess callback
		// onCancel not needed here as form was successful
	}

	const handleUpdateProperty = async (
		data: z.output<typeof propertyFormSchema>
	) => {
		if (!property) {
			return
		}

		const updateData: UpdatePropertyInput = {
			name: data.name,
			address: data.address,
			city: data.city,
			state: data.state,
			zipCode: data.zipCode,
			description: data.description ?? undefined,
			propertyType: data.propertyType,
			imageUrl: data.imageUrl ?? undefined
		}

		const result = await updatePropertyMutation.mutateAsync({
			id: property.id,
			data: updateData
		})

		onSuccess?.(result)
		// Modal close is handled by onSuccess callback
		// onCancel not needed here as form was successful
	}

	// Form submission handler
	const onSubmit = async (data: z.output<typeof propertyFormSchema>) => {
		try {
			if (property) {
				await handleUpdateProperty(data)
			} else {
				await handleCreateProperty(data)
			}
		} catch (error) {
			// Error handling is done by React Query hooks with toast notifications
			logger.error(
				'Form submission error:',
				error instanceof Error ? error : new Error(String(error)),
				{ component: 'propertyform' }
			)
		}
	}

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardHeader>
				<CardTitle>
					{property ? 'Edit Property' : 'Add New Property'}
				</CardTitle>
				<CardDescription>
					{property
						? 'Update property information and settings'
						: 'Create a new property in your portfolio'}
				</CardDescription>
			</CardHeader>

			<CardContent>
				<FormProvider {...form}>
					<form
						onSubmit={handleSubmit(onSubmit)}
						className="space-y-6"
					>
						{/* Image Upload Section */}
						{property && (
							<PropertyImageUpload
								propertyId={property.id}
								currentImageUrl={watch('imageUrl')}
								onImageChange={imageUrl =>
									setValue('imageUrl', imageUrl)
								}
								disabled={isSubmitting}
							/>
						)}

						{/* Form Fields */}
						<PropertyFormFields control={control} />

						{/* Error Display */}
						{Object.keys(errors).length > 0 && (
							<Alert variant="destructive">
								<AlertDescription>
									Please fix the errors above and try again.
								</AlertDescription>
							</Alert>
						)}

						{/* Actions */}
						<div className="flex justify-end space-x-3">
							{onCancel && (
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
								>
									Cancel
								</Button>
							)}

							<Button
								type="submit"
								disabled={isSubmitting}
								className="min-w-[120px]"
							>
								{isSubmitting && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{property ? 'Update' : 'Create'} Property
							</Button>
						</div>
					</form>
				</FormProvider>
			</CardContent>
		</Card>
	)
}
