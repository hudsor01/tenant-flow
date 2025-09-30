'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Building,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Plus
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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

	const form = useForm<PropertyFormData>({
		resolver: zodResolver(propertyFormSchema),
		defaultValues: {
			name: '',
			description: '',
			propertyType: 'SINGLE_FAMILY' as const,
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
		const values = form.getValues()
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
						Add a new property to your portfolio with basic information, details, and financial data.
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
					onSubmit={form.handleSubmit(data => {
						try {
							const transformedData = transformPropertyFormData(
								data,
								user?.id || ''
							)
							createProperty.mutate(transformedData)
						} catch (error) {
							logger.error(
								'Form submission error',
								{ action: 'formSubmission' },
								error
							)
						}
					})}
					className="space-y-6"
				>
					{/* Step 1: Basic Information */}
					{currentStep === 1 && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Property Name *</Label>
								<Input
									id="name"
									placeholder="e.g. Sunset Apartments"
									{...form.register('name')}
								/>
								{form.formState.errors.name && (
									<p className="text-sm text-destructive">
										{form.formState.errors.name.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="propertyType">Property Type *</Label>
								<Controller
									name="propertyType"
									control={form.control}
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
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
									)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="address">Address *</Label>
								<Input
									id="address"
									placeholder="123 Main St"
									{...form.register('address')}
								/>
								{form.formState.errors.address && (
									<p className="text-sm text-destructive">
										{form.formState.errors.address.message}
									</p>
								)}
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="city">City *</Label>
									<Input
										id="city"
										placeholder="City"
										{...form.register('city')}
									/>
									{form.formState.errors.city && (
										<p className="text-sm text-destructive">
											{form.formState.errors.city.message}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="state">State *</Label>
									<Input
										id="state"
										placeholder="CA"
										maxLength={2}
										{...form.register('state', {
											onChange: e => {
												e.target.value = e.target.value.toUpperCase()
											}
										})}
									/>
									{form.formState.errors.state && (
										<p className="text-sm text-destructive">
											{form.formState.errors.state.message}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="zipCode">ZIP Code *</Label>
									<Input
										id="zipCode"
										placeholder="12345"
										{...form.register('zipCode')}
									/>
									{form.formState.errors.zipCode && (
										<p className="text-sm text-destructive">
											{form.formState.errors.zipCode.message}
										</p>
									)}
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Brief description of the property..."
									rows={3}
									{...form.register('description')}
								/>
							</div>
						</div>
					)}

					{/* Step 2: Property Details */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="bedrooms">Bedrooms</Label>
									<Input
										id="bedrooms"
										type="number"
										placeholder="3"
										min="0"
										max="50"
										{...form.register('bedrooms')}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bathrooms">Bathrooms</Label>
									<Input
										id="bathrooms"
										type="number"
										step="0.5"
										placeholder="2.5"
										min="0"
										max="50"
										{...form.register('bathrooms')}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="squareFootage">Square Footage</Label>
									<Input
										id="squareFootage"
										type="number"
										placeholder="1200"
										min="0"
										{...form.register('squareFootage')}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="imageUrl">Property Image URL</Label>
								<Input
									id="imageUrl"
									type="url"
									placeholder="https://example.com/property.jpg"
									{...form.register('imageUrl')}
								/>
							</div>

							<div className="space-y-4">
								<Label>Property Features</Label>
								<div className="flex items-center space-x-6">
									<div className="flex items-center space-x-2">
										<Controller
											name="hasGarage"
											control={form.control}
											render={({ field }) => (
												<Checkbox
													id="hasGarage"
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											)}
										/>
										<Label htmlFor="hasGarage">Garage</Label>
									</div>

									<div className="flex items-center space-x-2">
										<Controller
											name="hasPool"
											control={form.control}
											render={({ field }) => (
												<Checkbox
													id="hasPool"
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											)}
										/>
										<Label htmlFor="hasPool">Pool</Label>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Step 3: Financial Information */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="rent">Monthly Rent ($)</Label>
									<Input
										id="rent"
										type="number"
										step="0.01"
										placeholder="2500.00"
										min="0"
										{...form.register('rent')}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="deposit">Security Deposit ($)</Label>
									<Input
										id="deposit"
										type="number"
										step="0.01"
										placeholder="2500.00"
										min="0"
										{...form.register('deposit')}
									/>
								</div>
							</div>
						</div>
					)}

					{/* Step 4: Units & Amenities */}
					{currentStep === 4 && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="numberOfUnits">Number of Units</Label>
								<Input
									id="numberOfUnits"
									type="number"
									placeholder="1"
									min="1"
									max="1000"
									{...form.register('numberOfUnits')}
								/>
								<p className="text-sm text-muted-foreground">
									How many rental units does this property have?
								</p>
							</div>

							<div className="flex items-center space-x-2">
								<Controller
									name="createUnitsNow"
									control={form.control}
									render={({ field }) => (
										<Checkbox
											id="createUnitsNow"
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
								<Label htmlFor="createUnitsNow">
									Create individual unit records now
								</Label>
							</div>

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>
										Property: {form.watch('name') || 'Unnamed Property'}
									</div>
									<div>Type: {form.watch('propertyType')}</div>
									<div>
										Location: {form.watch('city')}, {form.watch('state')}
									</div>
									{form.watch('rent') && (
										<div>Monthly Rent: ${form.watch('rent')}</div>
									)}
									<div>Units: {form.watch('numberOfUnits') || '1'}</div>
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
