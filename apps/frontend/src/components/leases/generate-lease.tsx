'use client'

import {
	Building2,
	Users,
	FileText,
	Check,
	ChevronRight,
	ChevronLeft
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

// Step components
import { LeaseStepProperty } from './lease-step-property'
import { LeaseStepTenant } from './lease-step-tenant'
import { LeaseStepTerms } from './lease-step-terms'
import { LeaseStepReview } from './lease-step-review'

// Form hook
import { useGenerateLeaseForm } from './use-generate-lease-form'

// Types
import type { GenerateLeaseProps, LeaseWizardStep } from './types'


const STEPS: LeaseWizardStep[] = [
	{ id: 'property', label: 'Property & Unit', icon: Building2 },
	{ id: 'tenant', label: 'Tenant', icon: Users },
	{ id: 'terms', label: 'Lease Terms', icon: FileText },
	{ id: 'review', label: 'Review', icon: Check }
]

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GenerateLease - Multi-step wizard for creating a new lease
 *
 * Features:
 * - 4-step wizard: Property, Tenant, Terms, Review
 * - Progress indicator with step icons
 * - Form validation per step
 * - Support for existing or new tenants
 * - Template-based lease term calculation
 */
export function GenerateLease({
	properties,
	existingTenants,
	templates,
	onGenerate,
	onCancel
}: GenerateLeaseProps) {
	const {
		currentStep,
		isFirstStep,
		isLastStep,
		formData,
		setFormData,
		tenantMode,
		setTenantMode,
		tenantSearch,
		setTenantSearch,
		canProceed,
		handleNext,
		handleBack,
		handleSubmit
	} = useGenerateLeaseForm({
		properties,
		existingTenants,
		templates,
		onGenerate
	})

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="mb-8">
					<h1 className="text-2xl font-semibold text-foreground">
						Generate New Lease
					</h1>
					<p className="text-muted-foreground">
						Create a new lease agreement step by step.
					</p>
				</div>
			</BlurFade>

			{/* Progress Steps */}
			<BlurFade delay={0.2} inView>
				<div className="flex items-center justify-between mb-8 max-w-2xl">
					{STEPS.map((step, index) => {
						const StepIcon = step.icon
						const isActive = index === currentStep
						const isCompleted = index < currentStep
						return (
							<div key={step.id} className="flex items-center">
								<div className="flex flex-col items-center">
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
											isCompleted
												? 'bg-emerald-500 text-white'
												: isActive
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground'
										}`}
									>
										{isCompleted ? (
											<Check className="w-5 h-5" />
										) : (
											<StepIcon className="w-5 h-5" />
										)}
									</div>
									<span
										className={`text-xs mt-2 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
									>
										{step.label}
									</span>
								</div>
								{index < STEPS.length - 1 && (
									<div
										className={`w-16 h-0.5 mx-2 ${index < currentStep ? 'bg-emerald-500' : 'bg-muted'}`}
									/>
								)}
							</div>
						)
					})}
				</div>
			</BlurFade>

			{/* Step Content */}
			<div className="max-w-2xl">
				{/* Step 1: Property & Unit */}
				{currentStep === 0 && (
					<LeaseStepProperty
						properties={properties}
						formData={formData}
						onFormDataChange={setFormData}
					/>
				)}

				{/* Step 2: Tenant */}
				{currentStep === 1 && (
					<LeaseStepTenant
						existingTenants={existingTenants}
						formData={formData}
						onFormDataChange={setFormData}
						tenantMode={tenantMode}
						onTenantModeChange={setTenantMode}
						tenantSearch={tenantSearch}
						onTenantSearchChange={setTenantSearch}
					/>
				)}

				{/* Step 3: Lease Terms */}
				{currentStep === 2 && (
					<LeaseStepTerms
						templates={templates}
						formData={formData}
						onFormDataChange={setFormData}
					/>
				)}

				{/* Step 4: Review */}
				{currentStep === 3 && (
					<LeaseStepReview
						properties={properties}
						existingTenants={existingTenants}
						templates={templates}
						formData={formData}
					/>
				)}

				{/* Navigation Buttons */}
				<BlurFade delay={0.4} inView>
					<div className="flex items-center justify-between mt-6">
						<button
							onClick={isFirstStep ? onCancel : handleBack}
							className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							<ChevronLeft className="w-4 h-4" />
							{isFirstStep ? 'Cancel' : 'Back'}
						</button>
						<button
							onClick={isLastStep ? handleSubmit : handleNext}
							disabled={!canProceed}
							className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isLastStep ? 'Generate Lease' : 'Continue'}
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
