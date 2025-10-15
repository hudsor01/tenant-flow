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
import { Textarea } from '@/components/ui/textarea'
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Mail,
	Phone,
	Plus,
	User,
	Users
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useCreateTenant } from '@/hooks/api/use-tenant'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { CreateTenantInput } from '@repo/shared/types/api-inputs'
import { tenantFormSchema } from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

const FORM_STEPS = [
	{
		id: 1,
		title: 'Basic Information',
		description: 'Name, email, and primary contact'
	},
	{
		id: 2,
		title: 'Emergency Contact',
		description: 'Emergency contact information'
	},
	{
		id: 3,
		title: 'Additional Details',
		description: 'Profile and additional information'
	}
]

export function CreateTenantDialog() {
	const [isOpen, setIsOpen] = useState(false)
	const logger = createLogger({ component: 'CreateTenantDialog' })

	// Use modern TanStack Query hook with optimistic updates
	const createTenantMutation = useCreateTenant()

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
				formType: 'tenant'
			})
		} else {
			resetFormProgress()
		}
	}

	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			emergencyContact: '',
			firstName: '',
			lastName: '',
			avatarUrl: ''
		},
		onSubmit: async ({ value }) => {
			try {
				// Transform form data to match CreateTenantInput type
				const tenantData: CreateTenantInput = {
					name: value.name,
					email: value.email,
					phone: value.phone || null,
					emergencyContact: value.emergencyContact || null,
					firstName: value.firstName || null,
					lastName: value.lastName || null,
					avatarUrl: value.avatarUrl || null
				}

				await createTenantMutation.mutateAsync(tenantData)
				toast.success('Tenant created successfully')
				setIsOpen(false)
				form.reset()
				resetFormProgress()
			} catch (error) {
				toast.error('Failed to create tenant')
				logger.error(
					'Failed to create tenant',
					{ action: 'createTenant' },
					error
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantFormSchema.safeParse(value)
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
				if (!values.name || !values.email) {
					toast.error('Please fill in name and email')
					return false
				}
				// Validate email format
				{
					const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
					if (!emailRegex.test(values.email)) {
						toast.error('Please enter a valid email address')
						return false
					}
				}
				break
			case 2:
				// Emergency contact is optional, so no validation required
				break
			case 3:
				// Additional details are optional
				if (values.avatarUrl && values.avatarUrl !== '') {
					try {
						new URL(values.avatarUrl)
					} catch {
						toast.error('Please enter a valid avatar URL')
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
					Add Tenant
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						<Users className="w-5 h-5" />
						Add New Tenant
					</DialogTitle>
					<DialogDescription>
						Add a new tenant to your portfolio with basic information and
						contact details.
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
										<FieldLabel htmlFor="name">Full Name *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<User className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="name"
												placeholder="e.g. John Smith"
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

							<form.Field name="email">
								{field => (
									<Field>
										<FieldLabel htmlFor="email">Email Address *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Mail className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="email"
												type="email"
												placeholder="john.smith@example.com"
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

							<form.Field name="phone">
								{field => (
									<Field>
										<FieldLabel htmlFor="phone">Phone Number</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Phone className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="phone"
												type="tel"
												placeholder="(555) 123-4567"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										<p className="text-sm text-muted-foreground">
											Optional - for contact and notifications
										</p>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					{/* Step 2: Emergency Contact */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<form.Field name="emergencyContact">
								{field => (
									<Field>
										<FieldLabel htmlFor="emergencyContact">
											Emergency Contact Information
										</FieldLabel>
										<Textarea
											id="emergencyContact"
											placeholder="Emergency contact name, relationship, and phone number..."
											rows={4}
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Optional - Include name, relationship, and contact
											information for emergencies
										</p>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					{/* Step 3: Additional Details */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<form.Field name="firstName">
									{field => (
										<Field>
											<FieldLabel htmlFor="firstName">First Name</FieldLabel>
											<Input
												id="firstName"
												placeholder="John"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</Field>
									)}
								</form.Field>

								<form.Field name="lastName">
									{field => (
										<Field>
											<FieldLabel htmlFor="lastName">Last Name</FieldLabel>
											<Input
												id="lastName"
												placeholder="Smith"
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

							<form.Field name="avatarUrl">
								{field => (
									<Field>
										<FieldLabel htmlFor="avatarUrl">
											Profile Picture URL
										</FieldLabel>
										<Input
											id="avatarUrl"
											type="url"
											placeholder="https://example.com/profile.jpg"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Optional - URL for profile picture
										</p>
									</Field>
								)}
							</form.Field>

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>Name: {form.state.values.name || 'Not specified'}</div>
									<div>Email: {form.state.values.email || 'Not specified'}</div>
									{form.state.values.phone && (
										<div>Phone: {form.state.values.phone}</div>
									)}
									{form.state.values.emergencyContact && (
										<div>Emergency Contact: Provided</div>
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
									disabled={createTenantMutation.isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{createTenantMutation.isPending
										? 'Creating...'
										: 'Create Tenant'}
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
