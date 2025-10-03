'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Building,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Plus
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { useSupabaseUser } from '@/hooks/api/use-supabase-auth'
import { propertiesApi } from '@/lib/api-client'
import { useFormStep, useUIStore } from '@/stores/ui-store'
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

export function CreatePropertyDialog() {
	const [isOpen, setIsOpen] = useState(false)
	const queryClient = useQueryClient()
	const { data: user } = useSupabaseUser()
	const logger = createLogger({ component: 'CreatePropertyDialog' })

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
				const transformedData = transformPropertyFormData(value, user?.id || '')
				createProperty.mutate(transformedData)
			} catch (error) {
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
					return result.error.format()
				}
				return undefined
			}
		}
	})

	const createProperty = useMutation({
		mutationFn: (data: ReturnType<typeof transformPropertyFormData>) =>
			propertiesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			toast.success('Property created successfully')
			setIsOpen(false)
			form.reset()
			resetFormProgress()
		},
		onError: error => {
			toast.error('Failed to create property')
			logger.error(
				'Failed to create property',
				{ action: 'createProperty' },
				error
			)
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

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="default"
					className="flex items-center gap-2"
					style={{
						background: 'var(--color-primary-brand)',
						color: 'white',
						borderRadius: 'var(--radius-medium)',
						padding: 'var(--spacing-2) var(--spacing-4)',
						transition: 'all var(--duration-quick) var(--ease-smooth)'
					}}
				>
					<Plus className="size-4" />
					New Property
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						<Building className="w-5 h-5" />
						Create New Property
					</DialogTitle>
					<DialogDescription>
						Add a new property to your portfolio with basic information,
						details, and financial data.
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
									<div className="space-y-2">
										<Label htmlFor="name">Property Name *</Label>
										<Input
											id="name"
											placeholder="e.g. Sunset Apartments"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<p className="text-sm text-destructive">
												{String(field.state.meta.errors[0])}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

							<form.Field name="propertyType">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="propertyType">Property Type *</Label>
										<Select
											value={field.state.value}
											onValueChange={value => field.handleChange(value)}
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
									</div>
								)}
							</form.Field>

							<form.Field name="address">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="address">Address *</Label>
										<Input
											id="address"
											placeholder="123 Main St"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<p className="text-sm text-destructive">
												{String(field.state.meta.errors[0])}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

							<div className="grid grid-cols-3 gap-4">
								<form.Field name="city">
									{field => (
										<div className="space-y-2">
											<Label htmlFor="city">City *</Label>
											<Input
												id="city"
												placeholder="City"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors?.length ? (
												<p className="text-sm text-destructive">
													{String(field.state.meta.errors[0])}
												</p>
											) : null}
										</div>
									)}
								</form.Field>

								<form.Field name="state">
									{field => (
										<div className="space-y-2">
											<Label htmlFor="state">State *</Label>
											<Input
												id="state"
												placeholder="CA"
												maxLength={2}
												value={field.state.value}
												onChange={e =>
													field.handleChange(e.target.value.toUpperCase())
												}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors?.length ? (
												<p className="text-sm text-destructive">
													{String(field.state.meta.errors[0])}
												</p>
											) : null}
										</div>
									)}
								</form.Field>

								<form.Field name="zipCode">
									{field => (
										<div className="space-y-2">
											<Label htmlFor="zipCode">ZIP Code *</Label>
											<Input
												id="zipCode"
												placeholder="12345"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors?.length ? (
												<p className="text-sm text-destructive">
													{String(field.state.meta.errors[0])}
												</p>
											) : null}
										</div>
									)}
								</form.Field>
							</div>

							<form.Field name="description">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											placeholder="Brief description of the property..."
											rows={3}
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
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
										<div className="space-y-2">
											<Label htmlFor="bedrooms">Bedrooms</Label>
											<Input
												id="bedrooms"
												type="number"
												placeholder="3"
												min="0"
												max="50"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="bathrooms">
									{field => (
										<div className="space-y-2">
											<Label htmlFor="bathrooms">Bathrooms</Label>
											<Input
												id="bathrooms"
												type="number"
												step="0.5"
												placeholder="2.5"
												min="0"
												max="50"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="squareFootage">
									{field => (
										<div className="space-y-2">
											<Label htmlFor="squareFootage">Square Footage</Label>
											<Input
												id="squareFootage"
												type="number"
												placeholder="1200"
												min="0"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<form.Field name="imageUrl">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="imageUrl">Property Image URL</Label>
										<Input
											id="imageUrl"
											type="url"
											placeholder="https://example.com/property.jpg"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
								)}
							</form.Field>

							<div className="space-y-4">
								<Label>Property Features</Label>
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
												<Label htmlFor="hasGarage">Garage</Label>
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
												<Label htmlFor="hasPool">Pool</Label>
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
										<div className="space-y-2">
											<Label htmlFor="rent">Monthly Rent ($)</Label>
											<Input
												id="rent"
												type="number"
												step="0.01"
												placeholder="2500.00"
												min="0"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="deposit">
									{field => (
										<div className="space-y-2">
											<Label htmlFor="deposit">Security Deposit ($)</Label>
											<Input
												id="deposit"
												type="number"
												step="0.01"
												placeholder="2500.00"
												min="0"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</div>
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
									<div className="space-y-2">
										<Label htmlFor="numberOfUnits">Number of Units</Label>
										<Input
											id="numberOfUnits"
											type="number"
											placeholder="1"
											min="1"
											max="1000"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											How many rental units does this property have?
										</p>
									</div>
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
										<Label htmlFor="createUnitsNow">
											Create individual unit records now
										</Label>
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
										Location: {form.state.values.city},{' '}
										{form.state.values.state}
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
								onClick={() => setIsOpen(false)}
							>
								Cancel
							</Button>

							{isLastStep ? (
								<Button
									type="submit"
									disabled={createProperty.isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{createProperty.isPending ? 'Creating...' : 'Create Property'}
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
