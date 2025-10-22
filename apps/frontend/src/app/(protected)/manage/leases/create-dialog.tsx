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
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	FileText,
	Plus
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useCreateLease } from '@/hooks/api/use-lease'
import { useTenantList } from '@/hooks/api/use-tenant'
import { useUnitList } from '@/hooks/api/use-unit'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { CreateLeaseInput } from '@repo/shared/types/api-inputs'
import { useForm } from '@tanstack/react-form'

type LeaseStatus = NonNullable<CreateLeaseInput['status']>

const FORM_STEPS = [
	{
		id: 1,
		title: 'Tenant & Unit',
		description: 'Select tenant and unit for this lease'
	},
	{
		id: 2,
		title: 'Lease Dates',
		description: 'Start date, end date, and duration'
	},
	{
		id: 3,
		title: 'Financial Terms',
		description: 'Rent amount, deposit, and fees'
	},
	{
		id: 4,
		title: 'Additional Terms',
		description: 'Late fees, grace period, and notes'
	}
]

export function CreateLeaseDialog() {
	const [isOpen, setIsOpen] = useState(false)
	const logger = createLogger({ component: 'CreateLeaseDialog' })

	// Use modern TanStack Query hook with optimistic updates
	const createLeaseMutation = useCreateLease()

	// Load tenants and units for selection
	const { data: tenantsResponse } = useTenantList(1, 100)
	const { data: unitsResponse } = useUnitList({ status: 'VACANT', limit: 100 })
	const tenants = tenantsResponse?.data || []
	const units = unitsResponse?.data || []

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
				formType: 'lease'
			})
		} else {
			resetFormProgress()
		}
	}

	const form = useForm({
		defaultValues: {
			tenantId: '',
			unitId: '',
			startDate: '',
			endDate: '',
			rentAmount: '',
			securityDeposit: '',
			monthlyRent: '',
			gracePeriodDays: '5',
			lateFeeAmount: '',
			lateFeePercentage: '',
			terms: '',
			status: 'ACTIVE'
		},
		onSubmit: async ({ value }) => {
			try {
				// Transform form data to match CreateLeaseInput type
				const leaseData: CreateLeaseInput = {
					tenantId: value.tenantId,
					unitId: value.unitId,
					startDate: value.startDate,
					endDate: value.endDate,
					rentAmount: parseFloat(value.rentAmount),
					securityDeposit: parseFloat(value.securityDeposit),
					monthlyRent: value.monthlyRent ? parseFloat(value.monthlyRent) : null,
					gracePeriodDays: value.gracePeriodDays
						? parseInt(value.gracePeriodDays, 10)
						: null,
					lateFeeAmount: value.lateFeeAmount
						? parseFloat(value.lateFeeAmount)
						: null,
					lateFeePercentage: value.lateFeePercentage
						? parseFloat(value.lateFeePercentage)
						: null,
					terms: value.terms || null,
					status: (value.status ?? 'ACTIVE') as LeaseStatus
				}

				await createLeaseMutation.mutateAsync(leaseData)
				toast.success('Lease created successfully')
				setIsOpen(false)
				form.reset()
				resetFormProgress()
			} catch (error) {
				toast.error('Failed to create lease')
				logger.error('Failed to create lease', { action: 'createLease' }, error)
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
				if (!values.tenantId || !values.unitId) {
					toast.error('Please select both a tenant and a unit')
					return false
				}
				break
			case 2:
				if (!values.startDate || !values.endDate) {
					toast.error('Please enter start and end dates')
					return false
				}
				if (new Date(values.startDate) >= new Date(values.endDate)) {
					toast.error('End date must be after start date')
					return false
				}
				break
			case 3:
				if (!values.rentAmount || !values.securityDeposit) {
					toast.error('Please enter rent amount and security deposit')
					return false
				}
				if (
					parseFloat(values.rentAmount) <= 0 ||
					parseFloat(values.securityDeposit) < 0
				) {
					toast.error('Please enter valid amounts')
					return false
				}
				break
			case 4:
				// Optional fields, no validation needed
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
					Add Lease
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						<FileText className="w-5 h-5" />
						Add New Lease
					</DialogTitle>
					<DialogDescription>
						Create a new lease agreement with tenant, unit, and terms.
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
					{/* Step 1: Tenant & Unit */}
					{currentStep === 1 && (
						<div className="space-y-4">
							<form.Field name="tenantId">
								{field => (
									<Field>
										<FieldLabel htmlFor="tenantId">Tenant *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={field.handleChange}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a tenant" />
											</SelectTrigger>
											<SelectContent>
												{tenants.map(tenant => (
													<SelectItem key={tenant.id} value={tenant.id}>
														{tenant.name} - {tenant.email}
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

							<form.Field name="unitId">
								{field => (
									<Field>
										<FieldLabel htmlFor="unitId">Unit *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={field.handleChange}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a unit" />
											</SelectTrigger>
											<SelectContent>
												{units.map(unit => (
													<SelectItem key={unit.id} value={unit.id}>
														Unit {unit.unitNumber} - ${unit.rent}/month
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="text-sm text-muted-foreground">
											Only vacant units are shown
										</p>
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

					{/* Step 2: Lease Dates */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<form.Field name="startDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="startDate">Start Date *</FieldLabel>
										<Input
											id="startDate"
											type="date"
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

							<form.Field name="endDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="endDate">End Date *</FieldLabel>
										<Input
											id="endDate"
											type="date"
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

							<form.Field name="status">
								{field => (
									<Field>
										<FieldLabel htmlFor="status">Status *</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={value =>
												field.handleChange(value as LeaseStatus)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ACTIVE">Active</SelectItem>
												<SelectItem value="EXPIRED">Expired</SelectItem>
												<SelectItem value="TERMINATED">Terminated</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					{/* Step 3: Financial Terms */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<form.Field name="rentAmount">
								{field => (
									<Field>
										<FieldLabel htmlFor="rentAmount">
											Rent Amount (per lease term) *
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="rentAmount"
												type="number"
												min="0"
												step="0.01"
												placeholder="18000.00"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										<p className="text-sm text-muted-foreground">
											Total rent for the entire lease term
										</p>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="monthlyRent">
								{field => (
									<Field>
										<FieldLabel htmlFor="monthlyRent">
											Monthly Rent (Optional)
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="monthlyRent"
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
										<p className="text-sm text-muted-foreground">
											Monthly payment amount
										</p>
									</Field>
								)}
							</form.Field>

							<form.Field name="securityDeposit">
								{field => (
									<Field>
										<FieldLabel htmlFor="securityDeposit">
											Security Deposit *
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="securityDeposit"
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
						</div>
					)}

					{/* Step 4: Additional Terms */}
					{currentStep === 4 && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<form.Field name="gracePeriodDays">
									{field => (
										<Field>
											<FieldLabel htmlFor="gracePeriodDays">
												Grace Period (Days)
											</FieldLabel>
											<Input
												id="gracePeriodDays"
												type="number"
												min="0"
												placeholder="5"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</Field>
									)}
								</form.Field>

								<form.Field name="lateFeeAmount">
									{field => (
										<Field>
											<FieldLabel htmlFor="lateFeeAmount">
												Late Fee Amount
											</FieldLabel>
											<InputGroup>
												<InputGroupAddon align="inline-start">
													<DollarSign className="w-4 h-4" />
												</InputGroupAddon>
												<InputGroupInput
													id="lateFeeAmount"
													type="number"
													min="0"
													step="0.01"
													placeholder="50.00"
													value={field.state.value}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														field.handleChange(e.target.value)
													}
													onBlur={field.handleBlur}
												/>
											</InputGroup>
										</Field>
									)}
								</form.Field>
							</div>

							<form.Field name="lateFeePercentage">
								{field => (
									<Field>
										<FieldLabel htmlFor="lateFeePercentage">
											Late Fee Percentage
										</FieldLabel>
										<Input
											id="lateFeePercentage"
											type="number"
											min="0"
											max="100"
											step="0.1"
											placeholder="5.0"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Percentage of monthly rent as late fee
										</p>
									</Field>
								)}
							</form.Field>

							<form.Field name="terms">
								{field => (
									<Field>
										<FieldLabel htmlFor="terms">
											Additional Terms & Conditions
										</FieldLabel>
										<Textarea
											id="terms"
											placeholder="Special terms, conditions, or notes about this lease..."
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

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>
										Lease Term: {form.state.values.startDate || 'N/A'} to{' '}
										{form.state.values.endDate || 'N/A'}
									</div>
									<div>Total Rent: ${form.state.values.rentAmount || '0'}</div>
									{form.state.values.monthlyRent && (
										<div>Monthly: ${form.state.values.monthlyRent}</div>
									)}
									<div>
										Security Deposit: $
										{form.state.values.securityDeposit || '0'}
									</div>
									{form.state.values.gracePeriodDays && (
										<div>
											Grace Period: {form.state.values.gracePeriodDays} days
										</div>
									)}
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
									disabled={createLeaseMutation.isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{createLeaseMutation.isPending
										? 'Creating...'
										: 'Create Lease'}
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
