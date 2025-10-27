'use client'

import { useCreateProperty } from '@/hooks/api/use-properties'
import { CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { z } from 'zod'
import type { Database } from '@repo/shared/types/supabase-generated'

type PropertyType = Database['public']['Enums']['PropertyType']

import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState
} from '@/components/dropzone'
import { useSupabaseUser } from '@/hooks/api/use-supabase-auth'
import { usePropertyImageUpload } from '@/hooks/use-property-image-upload'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { transformPropertyFormData } from '@repo/shared/validation/properties'
import { useForm } from '@tanstack/react-form'

/**
 * ✅ SIMPLIFIED Property Creation Form (Phase 2.1 Fix)
 *
 * BEFORE: Multi-step wizard that persisted data on Step 1 → orphaned records
 * AFTER: Single-step form that creates property only on final submit
 *
 * Unit-specific data (bedrooms, bathrooms, rent) created separately via Units page
 */

export function CreatePropertyForm() {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const { data: user } = useSupabaseUser()
	const logger = createLogger({ component: 'CreatePropertyForm' })
	const createPropertyMutation = useCreateProperty()

	// Initialize image upload hook
	const upload = usePropertyImageUpload({
		onUploadComplete: url => {
			form.setFieldValue('imageUrl', url)
			toast.success('Property image uploaded successfully')
		},
		onUploadError: error => {
			toast.error(`Failed to upload image: ${error.message}`)
		}
	})

	const form = useForm({
		defaultValues: {
			name: '',
			description: '',
			propertyType: 'SINGLE_FAMILY' as PropertyType,
			address: '',
			city: '',
			state: '',
			zipCode: '',
			imageUrl: ''
		},
		onSubmit: async ({ value }) => {
			try {
				if (!user?.id) {
					toast.error('You must be logged in to create a property')
					logger.error('User not authenticated', { action: 'formSubmission' })
					return
				}
				const transformedData = transformPropertyFormData(value, user.id)
				logger.info('Submitting property data', {
					action: 'formSubmission',
					data: transformedData
				})
				await createPropertyMutation.mutateAsync(transformedData)

				toast.success('Property created successfully')
				setIsSubmitted(true)
				form.reset()
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to create property'
				toast.error(errorMessage)
				logger.error(
					'Form submission error',
					{ action: 'formSubmission' },
					error
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				// Simplify schema validation - only required fields
				const requiredSchema = z.object({
					name: z.string().min(3, 'Property name must be at least 3 characters'),
					propertyType: z.string(),
					address: z.string().min(5, 'Address is required'),
					city: z.string().min(2, 'City is required'),
					state: z.string().length(2, 'State must be 2 characters'),
					zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code')
				})

				const result = requiredSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	if (isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center">
				<CheckCircle className="size-16 text-green-500" />
				<h2 className="text-2xl font-bold">Property Created!</h2>
				<p className="text-muted-foreground">
					Your property has been successfully added to your portfolio.
				</p>
				<Button onClick={() => window.history.back()}>
					Return to Properties
				</Button>
			</div>
		)
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<h2 className="text-2xl font-bold">Add New Property</h2>
				<p className="text-muted-foreground">
					Enter property details to add it to your portfolio
				</p>
			</div>

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
									<FieldError>
										{String(field.state.meta.errors[0])}
									</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="propertyType">
						{field => (
							<Field>
								<FieldLabel htmlFor="propertyType">
									Property Type *
								</FieldLabel>
								<input
									type="hidden"
									name="propertyType"
									value={field.state.value}
									readOnly
								/>
								<Select
									value={field.state.value}
									onValueChange={(value: string) => field.handleChange(value as PropertyType)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select property type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="SINGLE_FAMILY">
											Single Family
										</SelectItem>
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
									<FieldError>
										{String(field.state.meta.errors[0])}
									</FieldError>
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
									<FieldLabel htmlFor="zipCode">
										ZIP Code *
									</FieldLabel>
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
								<div className="space-y-2">
									<Dropzone {...upload}>
										<DropzoneEmptyState />
										<DropzoneContent />
									</Dropzone>
									{field.state.value && (
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
						disabled={createPropertyMutation.isPending}
						className="flex items-center gap-2"
					>
						<CheckCircle className="size-4" />
						{createPropertyMutation.isPending
							? 'Creating...'
							: 'Create Property'}
					</Button>
				</div>
			</form>
		</div>
	)
}
