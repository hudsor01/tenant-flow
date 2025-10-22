'use client'

import { useCreateProperty } from '@/hooks/api/use-properties'
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { z } from 'zod'

import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState
} from '@/components/dropzone'
import { useSupabaseUser } from '@/hooks/api/use-supabase-auth'
import { usePropertyImageUpload } from '@/hooks/use-property-image-upload'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	propertyFormSchema,
	transformPropertyFormData,
	type PropertyFormData
} from '@repo/shared/validation/properties'
import { useForm } from '@tanstack/react-form'

const FORM_STEPS = [
	{
		id: 1,
		title: 'Basic Information',
		description: 'Property name, type, and address'
	},
	{
		id: 2,
		title: 'Property Details',
		description: 'Bedrooms, bathrooms, and features'
	},
	{
		id: 3,
		title: 'Financial Information',
		description: 'Rent and deposit amounts'
	},
	{
		id: 4,
		title: 'Units & Amenities',
		description: 'Units setup and property amenities'
	}
]

export function CreatePropertyForm() {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const [currentStep, setCurrentStep] = useState(1)
	const { data: user } = useSupabaseUser()
	const logger = createLogger({ component: 'CreatePropertyForm' })
	const createPropertyMutation = useCreateProperty()

	const totalSteps = FORM_STEPS.length
	const isFirstStep = currentStep === 1
	const isLastStep = currentStep === totalSteps

	const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps))
	const previousStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

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
			propertyType: 'SINGLE_FAMILY',
			address: '',
			city: '',
			state: '',
			zipCode: '',
			bedrooms: '',
			bathrooms: '',
			squareFootage: '',
			rent: '',
			deposit: '',
			imageUrl: '',
			hasGarage: false,
			hasPool: false,
			numberOfUnits: '1',
			createUnitsNow: false
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
				setCurrentStep(1)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create property'
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
				const result = propertyFormSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	

	const handleNext = async () => {
		// Validate current step fields
		const isValid = await validateCurrentStep()
		if (isValid) {
			if (!isLastStep) {
				nextStep()
			}
		}
	}

	const validateCurrentStep = async (): Promise<boolean> => {
		// For now, just check if required fields are filled
		const values = form.state.values
		const requiredFields =
			currentStep === 1
				? ['name', 'propertyType', 'address', 'city', 'state', 'zipCode']
				: []

		const hasErrors = requiredFields.some(
			field =>
				!values[field as keyof PropertyFormData] ||
				values[field as keyof PropertyFormData] === ''
		)

		if (hasErrors) {
			toast.error('Please fill in all required fields')
			return false
		}

		return true
	}

	const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100

	if (isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center">
				<CheckCircle className="w-16 h-16 text-green-500" />
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
			{/* Progress Indicator */}
			<div className="space-y-4">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						Step {currentStep} of {totalSteps}
					</span>
					<span className="text-muted-foreground">
						{Math.round(progressPercentage)}% Complete
					</span>
				</div>

				<Progress value={progressPercentage} className="h-2" />

				<div className="flex items-center justify-center">
					<h3 className="font-semibold text-lg">
						{FORM_STEPS[currentStep - 1]?.title}
					</h3>
				</div>
				<p className="text-center text-muted-foreground text-sm">
					{FORM_STEPS[currentStep - 1]?.description}
				</p>
			</div>

			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-6"
			>
				{/* Step 1: Basic Information */}
				{currentStep === 1 && (
					<div className="space-y-4">
						<form.Field name="name">
							{field => (
								<Field>
									<FieldLabel htmlFor="name">Property Name *</FieldLabel>
									<Input
										id="name"
										placeholder="e.g. Sunset Apartments"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors?.length && (
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
									<Select
										value={field.state.value}
										onValueChange={(value: string) => field.handleChange(value)}
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
										placeholder="123 Main St"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors?.length && (
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
											placeholder="City"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length && (
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
											placeholder="CA"
											maxLength={2}
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value.toUpperCase())
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length && (
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
											placeholder="12345"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length && (
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
					</div>
				)}

				{/* Step 2: Property Details */}
				{currentStep === 2 && (
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-4">
							<form.Field name="bedrooms">
								{field => (
									<Field>
										<FieldLabel htmlFor="bedrooms">Bedrooms</FieldLabel>
										<Input
											id="bedrooms"
											type="number"
											placeholder="3"
											min="0"
											max="50"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="bathrooms">
								{field => (
									<Field>
										<FieldLabel htmlFor="bathrooms">Bathrooms</FieldLabel>
										<Input
											id="bathrooms"
											type="number"
											step="0.5"
											placeholder="2.5"
											min="0"
											max="50"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="squareFootage">
								{field => (
									<Field>
										<FieldLabel htmlFor="squareFootage">
											Square Footage
										</FieldLabel>
										<Input
											id="squareFootage"
											type="number"
											placeholder="1200"
											min="0"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>
						</div>

						<form.Field name="imageUrl">
							{field => (
								<Field>
									<FieldLabel>Property Image</FieldLabel>
									<div className="space-y-2">
										<Dropzone
											{...upload.getRootProps()}
											{...upload.getInputProps()}
										>
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

						<div className="space-y-4">
							<FieldLabel>Property Features</FieldLabel>
							<div className="flex items-center space-x-6">
								<form.Field name="hasGarage">
									{field => (
										<div className="flex items-center space-x-2">
											<Checkbox
												id="hasGarage"
												checked={field.state.value}
												onCheckedChange={checked =>
													field.handleChange(!!checked)
												}
											/>
											<FieldLabel htmlFor="hasGarage">Garage</FieldLabel>
										</div>
									)}
								</form.Field>

								<form.Field name="hasPool">
									{field => (
										<div className="flex items-center space-x-2">
											<Checkbox
												id="hasPool"
												checked={field.state.value}
												onCheckedChange={checked =>
													field.handleChange(!!checked)
												}
											/>
											<FieldLabel htmlFor="hasPool">Pool</FieldLabel>
										</div>
									)}
								</form.Field>
							</div>
						</div>
					</div>
				)}

				{/* Step 3: Financial Information */}
				{currentStep === 3 && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="rent">
								{field => (
									<Field>
										<FieldLabel htmlFor="rent">Monthly Rent ($)</FieldLabel>
										<Input
											id="rent"
											type="number"
											step="0.01"
											placeholder="2500.00"
											min="0"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="deposit">
								{field => (
									<Field>
										<FieldLabel htmlFor="deposit">
											Security Deposit ($)
										</FieldLabel>
										<Input
											id="deposit"
											type="number"
											step="0.01"
											placeholder="2500.00"
											min="0"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>
						</div>
					</div>
				)}

				{/* Step 4: Units & Amenities */}
				{currentStep === 4 && (
					<div className="space-y-4">
						<form.Field name="numberOfUnits">
							{field => (
								<Field>
									<FieldLabel htmlFor="numberOfUnits">
										Number of Units
									</FieldLabel>
									<Input
										id="numberOfUnits"
										type="number"
										placeholder="1"
										min="1"
										max="1000"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
									/>
									<p className="text-sm text-muted-foreground">
										How many rental units does this property have?
									</p>
								</Field>
							)}
						</form.Field>

						<form.Field name="createUnitsNow">
							{field => (
								<div className="flex items-center space-x-2">
									<Checkbox
										id="createUnitsNow"
										checked={field.state.value}
										onCheckedChange={checked => field.handleChange(!!checked)}
									/>
									<FieldLabel htmlFor="createUnitsNow">
										Create individual unit records now
									</FieldLabel>
								</div>
							)}
						</form.Field>

						<div className="rounded-lg border p-4 bg-muted/50">
							<h4 className="font-medium mb-2">Summary</h4>
							<div className="space-y-1 text-sm text-muted-foreground">
								<div>
									Property: {form.state.values.name || 'Unnamed Property'}
								</div>
								<div>Type: {form.state.values.propertyType}</div>
								<div>
									Location: {form.state.values.city}, {form.state.values.state}
								</div>
								{form.state.values.rent && (
									<div>Monthly Rent: ${form.state.values.rent}</div>
								)}
								<div>Units: {form.state.values.numberOfUnits || '1'}</div>
							</div>
						</div>
					</div>
				)}

				{/* Navigation */}
				<div className="flex justify-between pt-6 border-t">
					<Button
						type="button"
						variant="outline"
						onClick={previousStep}
						disabled={isFirstStep}
						className="flex items-center gap-2"
					>
						<ChevronLeft className="size-4" />
						Previous
					</Button>

					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => window.history.back()}
						>
							Cancel
						</Button>

						{isLastStep ? (
							<Button
								type="submit"
								disabled={createPropertyMutation.isPending}
					className="flex items-center gap-2"
				>
					<CheckCircle className="size-4" />
					{createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
							</Button>
						) : (
							<Button
								type="button"
								onClick={handleNext}
								className="flex items-center gap-2"
							>
								Next
								<ChevronRight className="size-4" />
							</Button>
						)}
					</div>
				</div>
			</form>
		</div>
	)
}
