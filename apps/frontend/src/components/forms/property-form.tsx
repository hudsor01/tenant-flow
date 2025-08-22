import React, { useState } from 'react'
import { useFormAnalytics } from '@/hooks/common/use-form-analytics'
import Image from 'next/image'
import type { CreatePropertyInput, UpdatePropertyInput } from '@repo/shared'
import type { PropertyFormProps, BaseComponentProps } from '@/types'
import { useForm, useController } from 'react-hook-form'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, X } from 'lucide-react'
import {
	useCreateProperty,
	useUpdateProperty
} from '@/hooks/api/use-properties'
// No more Jotai dependencies - using props for modal control
import { PropertiesApi } from '@/lib/api/properties'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
		const response = await PropertiesApi.uploadPropertyImage(
			propertyId,
			file
		)
		return response.url
	}

	const handleImageUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0]
		if (!file) return

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
							className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
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

// Property Type Field using direct RHF
function PropertyTypeField({ control }: { control: unknown }) {
	const {
		field,
		fieldState: { error }
	} = useController({
		name: 'propertyType',
		control,
		rules: { required: 'Property type is required' }
	})

	return (
		<div className="space-y-2">
			<Label htmlFor="propertyType">
				Property Type
				<span className="text-destructive ml-1">*</span>
			</Label>
			<Select value={field.value || ''} onValueChange={field.onChange}>
				<SelectTrigger
					id="propertyType"
					className={cn(
						error && 'border-destructive focus-visible:ring-destructive'
					)}
				>
					<SelectValue placeholder="Select property type" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="SINGLE_FAMILY">Single Family Home</SelectItem>
					<SelectItem value="MULTI_UNIT">Multi-Unit Building</SelectItem>
					<SelectItem value="APARTMENT">Apartment Complex</SelectItem>
					<SelectItem value="CONDO">Condominium</SelectItem>
					<SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
					<SelectItem value="COMMERCIAL">Commercial Property</SelectItem>
					<SelectItem value="OTHER">Other</SelectItem>
				</SelectContent>
			</Select>
			{error && (
				<p className="text-destructive text-sm">{error.message}</p>
			)}
		</div>
	)
}

// Form Field Component using direct RHF
function FormField({ 
	name, 
	control, 
	label, 
	type = 'text', 
	placeholder, 
	required = false, 
	multiline = false, 
	rows = 3 
}: {
	name: string
	control: unknown
	label: string
	type?: string
	placeholder?: string
	required?: boolean
	multiline?: boolean
	rows?: number
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
			{multiline ? (
				<Textarea
					{...field}
					id={fieldId}
					placeholder={placeholder}
					rows={rows}
					value={field.value || ''}
					className={cn(
						error && 'border-destructive focus-visible:ring-destructive'
					)}
				/>
			) : (
				<Input
					{...field}
					id={fieldId}
					type={type}
					placeholder={placeholder}
					value={field.value || ''}
					className={cn(
						error && 'border-destructive focus-visible:ring-destructive'
					)}
				/>
			)}
			{error && (
				<p className="text-destructive text-sm">{error.message}</p>
			)}
		</div>
	)
}

interface PropertyFormFieldsProps {
	control: unknown
}

function PropertyFormFields({ control }: PropertyFormFieldsProps) {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div className="md:col-span-2">
				<FormField
					name="name"
					control={control}
					label="Property Name"
					placeholder="Enter property name"
					required
				/>
			</div>

			<div className="md:col-span-2">
				<FormField
					name="address"
					control={control}
					label="Address"
					placeholder="Enter street address"
					required
				/>
			</div>

			<FormField
				name="city"
				control={control}
				label="City"
				placeholder="Enter city"
				required
			/>

			<FormField
				name="state"
				control={control}
				label="State"
				placeholder="CA"
				required
			/>

			<FormField
				name="zipCode"
				control={control}
				label="ZIP Code"
				placeholder="12345"
				required
			/>

			<PropertyTypeField control={control} />

			<div className="md:col-span-2">
				<FormField
					name="description"
					control={control}
					label="Description"
					placeholder="Describe the property..."
					multiline
					rows={3}
				/>
			</div>
		</div>
	)
}

export function PropertyForm({
	property,
	onSuccess,
	onCancel
}: PropertyFormProps) {
	// No more Jotai modal atoms - using props/callbacks for modal control

	// DRY: Reusable form analytics
	const { withFormTracking } = useFormAnalytics({
		featureName: 'property_form',
		successEvent: 'property_created'
	})

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
			description: data.description || undefined,
			propertyType: data.propertyType,
			imageUrl: data.imageUrl || undefined
		}

		// DRY: Use form tracking wrapper for analytics
		return await withFormTracking(
			async () => {
				const result = await createPropertyMutation.mutateAsync(createData)
				onSuccess?.(result)
				// Modal closing handled by parent component via onSuccess callback
				return result
			},
			{
				property_type: data.propertyType,
				has_photos: Boolean(data.imageUrl),
				is_update: false
			}
		)
	}

	const handleUpdateProperty = async (
		data: z.output<typeof propertyFormSchema>
	) => {
		if (!property) return

		const updateData: UpdatePropertyInput = {
			name: data.name,
			address: data.address,
			city: data.city,
			state: data.state,
			zipCode: data.zipCode,
			description: data.description || undefined,
			propertyType: data.propertyType,
			imageUrl: data.imageUrl || undefined
		}

		// DRY: Use form tracking wrapper for analytics
		return await withFormTracking(
			async () => {
				const result = await updatePropertyMutation.mutateAsync({
					id: property.id,
					data: updateData
				})
				onSuccess?.(result)
				// Modal closing handled by parent component via onSuccess callback
				return result
			},
			{
				property_type: data.propertyType,
				has_photos: Boolean(data.imageUrl),
				is_update: true
			}
		)
	}

	// Form submission handler - simplified with analytics built-in
	const onSubmit = async (data: z.output<typeof propertyFormSchema>) => {
		// DRY: Analytics tracking is now handled by withFormTracking wrapper
		if (property) {
			await handleUpdateProperty(data)
		} else {
			await handleCreateProperty(data)
		}
		// Error handling and analytics are handled by withFormTracking
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
		</CardContent>
		</Card>
	)
}
