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
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Home,
	Plus
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { usePropertyList } from '@/hooks/api/use-properties'
import { useCreateUnit } from '@/hooks/api/use-unit'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { CreateUnitInput } from '@repo/shared/types/api-inputs'
import { useForm } from '@tanstack/react-form'

type UnitFormValues = {
	propertyId: string
	unitNumber: string
	bedrooms: string
	bathrooms: string
	squareFeet: string
	rent: string
	status: CreateUnitInput['status']
	lastInspectionDate: string
}

const FORM_STEPS = [
	{
		id: 1,
		title: 'Property & Number',
		description: 'Select property and unit number'
	},
	{
		id: 2,
		title: 'Unit Details',
		description: 'Bedrooms, bathrooms, and size'
	},
	{
		id: 3,
		title: 'Rent & Status',
		description: 'Monthly rent and availability'
	}
]

export function CreateUnitDialog() {
	const [isOpen, setIsOpen] = useState(false)
	const logger = createLogger({ component: 'CreateUnitDialog' })

	// Use modern TanStack Query hook with optimistic updates
	const createUnitMutation = useCreateUnit()

	// Load properties for selection
	const { data: propertiesResponse } = usePropertyList({ limit: 100 })
	const properties = propertiesResponse?.data || []

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
				formType: null
			})
		} else {
			resetFormProgress()
		}
	}

	const form = useForm({
		defaultValues: {
			propertyId: '',
			unitNumber: '',
			bedrooms: '1',
			bathrooms: '1',
			squareFeet: '',
			rent: '',
			status: 'VACANT',
			lastInspectionDate: ''
		},
		onSubmit: async ({ value }) => {
			try {
				// Transform form data to match CreateUnitInput type
				const unitData: CreateUnitInput = {
					propertyId: value.propertyId,
					unitNumber: value.unitNumber,
					bedrooms: parseInt(value.bedrooms, 10),
					bathrooms: parseFloat(value.bathrooms),
					squareFeet: value.squareFeet ? parseInt(value.squareFeet, 10) : null,
					rent: parseFloat(value.rent),
					status: (value.status ?? 'VACANT') as NonNullable<
						CreateUnitInput['status']
					>,
					lastInspectionDate: value.lastInspectionDate || null
				}

				await createUnitMutation.mutateAsync(unitData)
				toast.success('Unit created successfully')
				setIsOpen(false)
				form.reset()
				resetFormProgress()
			} catch (error) {
				toast.error('Failed to create unit')
				logger.error('Failed to create unit', { action: 'createUnit' }, error)
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
				if (!values.propertyId || !values.unitNumber) {
					toast.error('Please select a property and enter a unit number')
					return false
				}
				break
			case 2:
				if (!values.bedrooms || !values.bathrooms) {
					toast.error('Please enter bedrooms and bathrooms')
					return false
				}
				break
			case 3:
				if (!values.rent) {
					toast.error('Please enter monthly rent amount')
					return false
				}
				if (parseFloat(values.rent) <= 0) {
					toast.error('Rent must be greater than zero')
					return false
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
					Add Unit
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						<Home className="w-5 h-5" />
						Add New Unit
					</DialogTitle>
					<DialogDescription>
						Add a new unit to your property with details and rental information.
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
					{/* Step 1: Property & Number */}
					{currentStep === 1 && (
						<div className="space-y-4">
							<form.Field name="propertyId">
								{field => (
									<Field>
										<FieldLabel htmlFor="propertyId">Property *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={value => field.handleChange(value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a property" />
											</SelectTrigger>
											<SelectContent>
												{properties.map(property => (
													<SelectItem key={property.id} value={property.id}>
														{property.name} - {property.address}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="unitNumber">
								{field => (
									<Field>
										<FieldLabel htmlFor="unitNumber">Unit Number *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Home className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="unitNumber"
												placeholder="e.g. 101, A1, Suite 5"
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
						</div>
					)}

					{/* Step 2: Unit Details */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<form.Field name="bedrooms">
									{field => (
										<Field>
											<FieldLabel htmlFor="bedrooms">Bedrooms *</FieldLabel>
											<Input
												id="bedrooms"
												type="number"
												min="0"
												placeholder="1"
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
											<FieldLabel htmlFor="bathrooms">Bathrooms *</FieldLabel>
											<Input
												id="bathrooms"
												type="number"
												min="0"
												step="0.5"
												placeholder="1"
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

							<form.Field name="squareFeet">
								{field => (
									<Field>
										<FieldLabel htmlFor="squareFeet">
											Square Feet (Optional)
										</FieldLabel>
										<Input
											id="squareFeet"
											type="number"
											min="0"
											placeholder="750"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Optional - Total living space in square feet
										</p>
									</Field>
								)}
							</form.Field>

							<form.Field name="lastInspectionDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="lastInspectionDate">
											Last Inspection Date (Optional)
										</FieldLabel>
										<Input
											id="lastInspectionDate"
											type="date"
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
					)}

					{/* Step 3: Rent & Status */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<form.Field name="rent">
								{field => (
									<Field>
										<FieldLabel htmlFor="rent">Monthly Rent *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="rent"
												type="number"
												min="0"
												step="0.01"
												placeholder="1500.00"
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

							<form.Field name="status">
								{field => (
									<Field>
										<FieldLabel htmlFor="status">Status *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={value => {
												if (value && typeof value === 'string') {
													field.handleChange(
														value as NonNullable<UnitFormValues['status']>
													)
												}
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="VACANT">Vacant</SelectItem>
												<SelectItem value="OCCUPIED">Occupied</SelectItem>
												<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
												<SelectItem value="RESERVED">Reserved</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>
										Unit: {form.state.values.unitNumber || 'Not specified'}
									</div>
									<div>
										Bedrooms: {form.state.values.bedrooms || '0'} / Bathrooms:{' '}
										{form.state.values.bathrooms || '0'}
									</div>
									{form.state.values.squareFeet && (
										<div>{form.state.values.squareFeet} sq ft</div>
									)}
									<div>Rent: ${form.state.values.rent || '0'}/month</div>
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
									disabled={createUnitMutation.isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{createUnitMutation.isPending ? 'Creating...' : 'Create Unit'}
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
