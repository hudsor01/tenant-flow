'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
	Building2,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	MapPin,
	Plus
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useCreateProperty } from '@/hooks/api/use-properties'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { CreatePropertyInput } from '@repo/shared/types/api-inputs'
import type { CreatePropertyRequest } from '@repo/shared/types/backend-domain'
import { useForm } from '@tanstack/react-form'

const FORM_STEPS = [
	{
		id: 1,
		title: 'Basic Information',
		description: 'Property name and type'
	},
	{
		id: 2,
		title: 'Address',
		description: 'Full property address'
	},
	{
		id: 3,
		title: 'Details',
		description: 'Description and additional information'
	}
]

export function CreatePropertyDialog() {
	const [isOpen, setIsOpen] = useState(false)
	const logger = createLogger({ component: 'CreatePropertyDialog' })

	// Use modern TanStack Query hook with optimistic updates
	const createPropertyMutation = useCreateProperty()

	const { setFormProgress, resetFormProgress } = useUIStore()
	const {
		currentStep,
		totalSteps,
		nextStep,
		previousStep,
		completeStep,
		isFirstStep,
		isLastStep
	} = useFormStep()

	// Initialize form progress when dialog opens
	const handleOpenChange = (open: boolean) => {
		setIsOpen(open)
		if (open) {
			setFormProgress({
				currentStep: 1,
				totalSteps: FORM_STEPS.length,
				completedSteps: [],
				formData: {},
				formType: 'property'
			})
		} else {
			resetFormProgress()
		}
	}

	const form = useForm({
		defaultValues: {
			name: '',
			propertyType: 'SINGLE_FAMILY' as const,
			address: '',
			city: '',
			state: '',
			zipCode: '',
			description: '',
			imageUrl: '',
			status: 'ACTIVE' as const
		},
		onSubmit: async ({ value }) => {
			try {
				// Transform form data to match CreatePropertyRequest type (ownerId set by backend)
				const propertyData: CreatePropertyRequest & {
					status?: string
					imageUrl?: string | null
				} = {
					name: value.name,
					type: value.propertyType,
					address: value.address,
					city: value.city,
					state: value.state,
					zipCode: value.zipCode
				}

				if (value.description) {
					propertyData.description = value.description
				}
				if (value.imageUrl) {
					propertyData.imageUrl = value.imageUrl
				}
				if (value.status) {
					propertyData.status = value.status
				}

				await createPropertyMutation.mutateAsync(
					propertyData as unknown as CreatePropertyInput
				)
				toast.success('Property created successfully')
				setIsOpen(false)
				form.reset()
				resetFormProgress()
			} catch (error) {
				toast.error('Failed to create property')
				logger.error(
					'Failed to create property',
					{ action: 'createProperty' },
					error
				)
			}
		}
	})

	const handleNext = async () => {
		// Validate current step fields
		const isValid = await validateCurrentStep()
		if (isValid) {
			completeStep(currentStep)
			if (!isLastStep) {
				nextStep()
			}
		}
	}

	const validateCurrentStep = async (): Promise<boolean> => {
		const values = form.state.values

		switch (currentStep) {
			case 1:
				if (!values.name || !values.propertyType) {
					toast.error('Please enter property name and select type')
					return false
				}
				break
			case 2:
				if (
					!values.address ||
					!values.city ||
					!values.state ||
					!values.zipCode
				) {
					toast.error('Please complete all address fields')
					return false
				}
				// Validate zip code format (US)
				if (!/^\d{5}(-\d{4})?$/.test(values.zipCode)) {
					toast.error(
						'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
					)
					return false
				}
				break
			case 3:
				// Optional fields, validate imageUrl if provided
				if (values.imageUrl && values.imageUrl !== '') {
					try {
						new URL(values.imageUrl)
					} catch {
						toast.error('Please enter a valid image URL')
						return false
					}
				}
				break
		}

		return true
	}

	const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="default"
				className="flex items-center gap-2 bg-[var(--color-primary-brand)] text-white rounded-[var(--radius-medium)] px-4 py-2 transition-all duration-150 ease-[var(--ease-smooth)]"
				>
					<Plus className="size-4" />
					Add Property
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						<Building2 className="w-5 h-5" />
						Add New Property
					</DialogTitle>
					<DialogDescription>
						Add a new property to your portfolio with location and details.
					</DialogDescription>
				</DialogHeader>

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
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Building2 className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="name"
												placeholder="e.g. Sunset Apartments"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
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
											onValueChange={value =>
												field.handleChange(
													value as unknown as typeof field.state.value
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select property type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="SINGLE_FAMILY">
													Single Family
												</SelectItem>
												<SelectItem value="MULTI_UNIT">Multi-Unit</SelectItem>
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

							<form.Field name="status">
								{field => (
									<Field>
										<FieldLabel htmlFor="status">Status *</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={value =>
												field.handleChange(
													value as unknown as typeof field.state.value
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ACTIVE">Active</SelectItem>
												<SelectItem value="INACTIVE">Inactive</SelectItem>
												<SelectItem value="PENDING">Pending</SelectItem>
												<SelectItem value="SOLD">Sold</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					{/* Step 2: Address */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<form.Field name="address">
								{field => (
									<Field>
										<FieldLabel htmlFor="address">Street Address *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<MapPin className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="address"
												placeholder="123 Main Street"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<div className="grid grid-cols-2 gap-4">
								<form.Field name="city">
									{field => (
										<Field>
											<FieldLabel htmlFor="city">City *</FieldLabel>
											<Input
												id="city"
												placeholder="San Francisco"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
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
										</Field>
									)}
								</form.Field>
							</div>

							<form.Field name="zipCode">
								{field => (
									<Field>
										<FieldLabel htmlFor="zipCode">ZIP Code *</FieldLabel>
										<Input
											id="zipCode"
											placeholder="94102"
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
					)}

					{/* Step 3: Details */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<form.Field name="description">
								{field => (
									<Field>
										<FieldLabel htmlFor="description">
											Description (Optional)
										</FieldLabel>
										<Textarea
											id="description"
											placeholder="Describe the property, amenities, nearby attractions..."
											rows={4}
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
										<FieldLabel htmlFor="imageUrl">
											Property Image URL (Optional)
										</FieldLabel>
										<Input
											id="imageUrl"
											type="url"
											placeholder="https://example.com/property-image.jpg"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Optional - URL for property image
										</p>
									</Field>
								)}
							</form.Field>

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>Name: {form.state.values.name || 'Not specified'}</div>
									<div>Type: {form.state.values.propertyType}</div>
									<div>
										Address: {form.state.values.address || 'Not specified'}
									</div>
									<div>
										{form.state.values.city && form.state.values.state
											? `${form.state.values.city}, ${form.state.values.state} ${form.state.values.zipCode}`
											: 'Address incomplete'}
									</div>
									<div>Status: {form.state.values.status}</div>
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
								onClick={() => setIsOpen(false)}
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
									{createPropertyMutation.isPending
										? 'Creating...'
										: 'Create Property'}
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
			</DialogContent>
		</Dialog>
	)
}
