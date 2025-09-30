'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { tenantsApi } from '@/lib/api-client'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	tenantFormSchema,
	type TenantFormData
} from '@repo/shared/validation/tenants'

type InsertTenant = Database['public']['Tables']['Tenant']['Insert']

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

	const qc = useQueryClient()
	const createTenant = useMutation({
		mutationFn: (values: InsertTenant) => tenantsApi.create(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
			toast.success('Tenant created successfully')
		},
		onError: (error: Error) => {
			toast.error('Failed to create tenant', { description: error.message })
		}
	})

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

	const form = useForm<TenantFormData>({
		resolver: zodResolver(tenantFormSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			emergencyContact: '',
			firstName: '',
			lastName: '',
			avatarUrl: ''
		}
	})

	const onSubmit = async (value: TenantFormData) => {
		try {
			// Transform form data to match Database Insert type
			const tenantData: Omit<InsertTenant, 'userId'> = {
				name: value.name,
				email: value.email,
				phone: value.phone || null,
				emergencyContact: value.emergencyContact || null,
				firstName: value.firstName || null,
				lastName: value.lastName || null,
				avatarUrl: value.avatarUrl || null
			}

			await createTenant.mutateAsync(tenantData as InsertTenant)
			toast.success('Tenant created successfully')
			setIsOpen(false)
			form.reset()
			resetFormProgress()
		} catch (error) {
			toast.error('Failed to create tenant')
			logger.error('Failed to create tenant', { action: 'createTenant' }, error)
		}
	}

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
		const values = form.getValues()

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

				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{/* Step 1: Basic Information */}
					{currentStep === 1 && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name" className="flex items-center gap-2">
									<User className="w-4 h-4" />
									Full Name *
								</Label>
								<Input
									id="name"
									placeholder="e.g. John Smith"
									{...form.register('name')}
								/>
								{form.formState.errors.name && (
									<p className="text-sm text-destructive">
										{form.formState.errors.name.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="email" className="flex items-center gap-2">
									<Mail className="w-4 h-4" />
									Email Address *
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="john.smith@example.com"
									{...form.register('email')}
								/>
								{form.formState.errors.email && (
									<p className="text-sm text-destructive">
										{form.formState.errors.email.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="phone" className="flex items-center gap-2">
									<Phone className="w-4 h-4" />
									Phone Number
								</Label>
								<Input
									id="phone"
									type="tel"
									placeholder="(555) 123-4567"
									{...form.register('phone')}
								/>
								<p className="text-sm text-muted-foreground">
									Optional - for contact and notifications
								</p>
							</div>
						</div>
					)}

					{/* Step 2: Emergency Contact */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="emergencyContact">
									Emergency Contact Information
								</Label>
								<Textarea
									id="emergencyContact"
									placeholder="Emergency contact name, relationship, and phone number..."
									rows={4}
									{...form.register('emergencyContact')}
								/>
								<p className="text-sm text-muted-foreground">
									Optional - Include name, relationship, and contact information
									for emergencies
								</p>
							</div>
						</div>
					)}

					{/* Step 3: Additional Details */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="firstName">First Name</Label>
									<Input
										id="firstName"
										placeholder="John"
										{...form.register('firstName')}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="lastName">Last Name</Label>
									<Input
										id="lastName"
										placeholder="Smith"
										{...form.register('lastName')}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="avatarUrl">Profile Picture URL</Label>
								<Input
									id="avatarUrl"
									type="url"
									placeholder="https://example.com/profile.jpg"
									{...form.register('avatarUrl')}
								/>
								<p className="text-sm text-muted-foreground">
									Optional - URL for profile picture
								</p>
							</div>

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>Name: {form.watch('name') || 'Not specified'}</div>
									<div>Email: {form.watch('email') || 'Not specified'}</div>
									{form.watch('phone') && (
										<div>Phone: {form.watch('phone')}</div>
									)}
									{form.watch('emergencyContact') && (
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
									disabled={createTenant.isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{createTenant.isPending ? 'Creating...' : 'Create Tenant'}
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
