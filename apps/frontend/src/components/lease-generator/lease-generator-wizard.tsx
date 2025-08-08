import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, CheckCircle, CreditCard, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
// Temporary mock for state data
const getAllStates = () => [
  { value: 'california', label: 'California' },
  { value: 'new-york', label: 'New York' },
  { value: 'texas', label: 'Texas' },
  { value: 'florida', label: 'Florida' }
]
const getStateFromSlug = (slug: string) => getAllStates().find(s => s.value === slug)
import { leaseFormSchema, type LeaseFormData } from '@repo/shared'
import { PropertyInfoSection } from './sections/property-info-section'
import { PartiesInfoSection } from './sections/parties-info-section'
import { LeaseTermsSection } from './sections/wizard-lease-terms'
import { AdditionalTermsSection } from './sections/additional-terms-section'
import { GenerationSummary } from './sections/generation-summary'
import type { LeaseGeneratorForm, LeaseOutputFormat } from '@repo/shared'
import { createAsyncHandler } from '@/utils/async-handlers'

interface LeaseGeneratorWizardProps {
	onGenerate: (data: LeaseGeneratorForm, format: LeaseOutputFormat) => Promise<void>
	isGenerating: boolean
	usageRemaining: number
	requiresPayment: boolean
}

const STEPS = [
	{ id: 'property', title: 'Property', description: 'Property details and location' },
	{ id: 'parties', title: 'Parties', description: 'Landlord and tenant information' },
	{ id: 'terms', title: 'Terms', description: 'Lease terms and payment details' },
	{ id: 'additional', title: 'Additional', description: 'Policies and utilities' },
	{ id: 'review', title: 'Review', description: 'Review and generate' }
] as const

type StepId = typeof STEPS[number]['id']

export default function LeaseGeneratorWizard({
	onGenerate,
	isGenerating,
	usageRemaining,
	requiresPayment
}: LeaseGeneratorWizardProps) {
	const [currentStep, setCurrentStep] = useState<StepId>('property')
	const [selectedFormat, setSelectedFormat] = useState<LeaseOutputFormat>('pdf')
	const [selectedUtilities, setSelectedUtilities] = useState<string[]>([])
	const posthog = usePostHog()

	// Utilities options
	const utilitiesOptions = ['Water', 'Electricity', 'Gas', 'Trash', 'Internet', 'Cable']

	// Handle utility toggle
	const handleUtilityToggle = (utility: string) => {
		setSelectedUtilities(prev => 
			prev.includes(utility) 
				? prev.filter(u => u !== utility)
				: [...prev, utility]
		)
	}

	// Form setup with better defaults
	const form = useForm<LeaseFormData>({
		resolver: zodResolver(leaseFormSchema),
		defaultValues: {
			// Property defaults
			propertyAddress: '',
			city: '',
			state: '',
			zipCode: '',
			unitNumber: '',
			countyName: '',
			propertyType: 'apartment',
			bedrooms: 2,
			bathrooms: 1,
			squareFootage: 1000,
			parkingSpaces: 1,
			storageUnit: '',
			
			// Landlord defaults
			landlordName: '',
			landlordEmail: '',
			landlordPhone: '',
			landlordAddress: '',
			
			// Tenant defaults
			tenantNames: [{ name: '' }],
			
			// Lease terms defaults
			rentAmount: 0,
			securityDeposit: 0,
			leaseStartDate: '',
			leaseEndDate: '',
			paymentDueDate: 1,
			lateFeeAmount: 50,
			lateFeeDays: 5,
			paymentMethod: 'check',
			paymentAddress: '',
			
			// Additional terms defaults
			petPolicy: 'not_allowed',
			petDeposit: 0,
			smokingPolicy: 'not_allowed',
			maintenanceResponsibility: 'landlord',
			utilitiesIncluded: [],
			maxOccupants: 2,
			occupancyLimits: {
				adults: 2,
				childrenUnder18: 0,
				childrenUnder2: 0
			},
			emergencyContact: undefined,
			moveInDate: undefined,
			prorationAmount: undefined,
			petDetails: undefined,
			keyDeposit: undefined,
			additionalTerms: '',
			specialProvisions: undefined
		},
		mode: 'onChange'
	})

	// Track wizard view
	useEffect(() => {
		posthog?.capture('lease_wizard_viewed', {
			usage_remaining: usageRemaining,
			requires_payment: requiresPayment,
			timestamp: new Date().toISOString()
		})
	}, [posthog, usageRemaining, requiresPayment])

	// Calculate progress
	const currentStepIndex = STEPS.findIndex(step => step.id === currentStep)
	const progress = ((currentStepIndex + 1) / STEPS.length) * 100

	// Step navigation
	const goToNextStep = async () => {
		const currentIndex = STEPS.findIndex(step => step.id === currentStep)
		if (currentIndex < STEPS.length - 1) {
			// Validate current step before proceeding
			const isValid = await validateCurrentStep()
			if (isValid) {
				const nextStepData = STEPS[currentIndex + 1]
				if (nextStepData) {
					const nextStep = nextStepData.id
					setCurrentStep(nextStep)
					posthog?.capture('lease_wizard_step_next', {
						from_step: currentStep,
						to_step: nextStep
					})
				}
			}
		}
	}

	const goToPreviousStep = () => {
		const currentIndex = STEPS.findIndex(step => step.id === currentStep)
		if (currentIndex > 0) {
			const previousStepData = STEPS[currentIndex - 1]
			if (previousStepData) {
				const previousStep = previousStepData.id
				setCurrentStep(previousStep)
				posthog?.capture('lease_wizard_step_back', {
					from_step: currentStep,
					to_step: previousStep
				})
			}
		}
	}

	// Step validation
	const validateCurrentStep = async (): Promise<boolean> => {
		const fieldsToValidate = getFieldsForStep(currentStep)
		const result = await form.trigger(fieldsToValidate)
		
		if (!result) {
			toast.error('Please complete all required fields before continuing')
		}
		
		return result
	}

	const getFieldsForStep = (stepId: StepId): (keyof LeaseFormData)[] => {
		switch (stepId) {
			case 'property':
				return ['propertyAddress', 'city', 'state', 'zipCode']
			case 'parties':
				return ['landlordName', 'landlordEmail', 'landlordAddress', 'tenantNames']
			case 'terms':
				return ['rentAmount', 'securityDeposit', 'leaseStartDate', 'leaseEndDate']
			case 'additional':
				return []
			case 'review':
				return []
			default:
				return []
		}
	}

	// Form submission
	const handleSubmit = async (data: LeaseFormData) => {
		posthog?.capture('lease_wizard_submitted', {
			format: selectedFormat,
			tenant_count: data.tenantNames.length,
			rent_amount: data.rentAmount,
			state: data.state,
			requires_payment: requiresPayment
		})

		if (requiresPayment) {
			toast.error('Payment required to generate additional leases')
			return
		}

		try {
			// Transform data for lease generator
			const leaseData: LeaseGeneratorForm = {
				...data,
				tenantNames: data.tenantNames
				.filter(tenant => tenant.name.trim() !== '')
			}

			await onGenerate(leaseData, selectedFormat)

			posthog?.capture('lease_wizard_success', {
				format: selectedFormat,
				state: data.state
			})

			toast.success(`${getStateFromSlug(data.state)?.label} lease agreement generated successfully!`)
		} catch (error) {
			posthog?.capture('lease_wizard_error', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			toast.error('Failed to generate lease agreement')
			console.error('Lease generation error:', error)
		}
	}

	// Render current step content
	const renderStepContent = () => {
		switch (currentStep) {
			case 'property':
				return <PropertyInfoSection form={form} supportedStates={[
					{ value: 'TX', label: 'Texas' },
					{ value: 'CA', label: 'California' },
					{ value: 'FL', label: 'Florida' },
					{ value: 'NY', label: 'New York' }
				]} />
			case 'parties':
				return <PartiesInfoSection form={form} />
			case 'terms':
				return <LeaseTermsSection form={form} />
			case 'additional':
				return (
					<AdditionalTermsSection 
						form={form}
						utilitiesOptions={utilitiesOptions}
						selectedUtilities={selectedUtilities}
						handleUtilityToggle={handleUtilityToggle}
						selectedFormat={selectedFormat}
						setSelectedFormat={setSelectedFormat}
					/>
				)
			case 'review':
				return (
					<GenerationSummary 
						form={form} 
						selectedFormat={selectedFormat}
						onFormatChange={setSelectedFormat}
						isGenerating={isGenerating}
					/>
				)
			default:
				return null
		}
	}

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* Header with usage status */}
			<Card className="border-primary/20">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<FileText className="text-primary h-7 w-7" />
							<div>
								<CardTitle className="text-xl">State-Compliant Lease Generator</CardTitle>
								<CardDescription>
									Create professional lease agreements in minutes
								</CardDescription>
							</div>
						</div>
						<div className="text-right">
							{usageRemaining > 0 ? (
								<Badge variant="secondary" className="text-sm">
									<CheckCircle className="mr-1 h-4 w-4" />
									{usageRemaining} free use{usageRemaining > 1 ? 's' : ''} remaining
								</Badge>
							) : (
								<Badge variant="destructive" className="text-sm">
									<CreditCard className="mr-1 h-4 w-4" />
									Payment required
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Progress indicator */}
			<Card>
				<CardContent className="pt-6">
					<div className="space-y-4">
						<div className="flex justify-between text-sm text-muted-foreground">
							<span>Step {currentStepIndex + 1} of {STEPS.length}</span>
							<span>{Math.round(progress)}% complete</span>
						</div>
						<Progress value={progress} className="h-2" />
						<div className="flex justify-between">
							{STEPS.map((step, index) => (
								<div 
									key={step.id}
									className={`text-center ${index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}
								>
									<div className="text-xs font-medium">{step.title}</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Step content */}
			<form onSubmit={createAsyncHandler(form.handleSubmit(handleSubmit), 'Failed to submit lease form')} className="space-y-6">
				{renderStepContent()}

				{/* Navigation buttons */}
				<Card>
					<CardContent className="pt-6">
						<div className="flex justify-between">
							<Button
								type="button"
								variant="outline"
								onClick={goToPreviousStep}
								disabled={currentStepIndex === 0}
								className="flex items-center gap-2"
							>
								<ChevronLeft className="h-4 w-4" />
								Previous
							</Button>

							{currentStep === 'review' ? (
								<Button
									type="submit"
									disabled={isGenerating || requiresPayment}
									className="flex items-center gap-2"
								>
									{isGenerating ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
											Generating...
										</>
									) : (
										<>
											<Download className="h-4 w-4" />
											Generate Lease
										</>
									)}
								</Button>
							) : (
								<Button
									type="button"
									onClick={createAsyncHandler(goToNextStep, 'Failed to proceed to next step')}
									className="flex items-center gap-2"
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	)
}