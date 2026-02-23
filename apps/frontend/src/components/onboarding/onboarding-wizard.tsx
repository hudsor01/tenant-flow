'use client'

/**
 * Onboarding Wizard
 *
 * Multi-step wizard dialog that guides new landlords through setup:
 * 1. Welcome
 * 2. Add First Property
 * 3. Connect Stripe
 * 4. Invite First Tenant
 * 5. Complete
 *
 * Auto-shows when onboarding_status is null or 'not_started'.
 * Marks onboarding complete or skipped on close.
 */

import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { useOnboarding } from './use-onboarding'
import { OnboardingStepWelcome } from './onboarding-step-welcome'
import { OnboardingStepProperty } from './onboarding-step-property'
import { OnboardingStepStripe } from './onboarding-step-stripe'
import { OnboardingStepTenant } from './onboarding-step-tenant'
import { OnboardingStepComplete } from './onboarding-step-complete'

// ============================================================================
// TYPES
// ============================================================================

type WizardStep = 'welcome' | 'property' | 'stripe' | 'tenant' | 'complete'

const STEPS: WizardStep[] = ['welcome', 'property', 'stripe', 'tenant', 'complete']

const STEP_LABELS: Record<WizardStep, string> = {
	welcome: 'Welcome',
	property: 'Add Property',
	stripe: 'Connect Stripe',
	tenant: 'Invite Tenant',
	complete: 'All Done'
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
	const currentIndex = STEPS.indexOf(currentStep)
	const displaySteps = STEPS.filter(s => s !== 'welcome' && s !== 'complete')

	if (currentStep === 'welcome' || currentStep === 'complete') {
		return null
	}

	return (
		<div className="flex items-center gap-1.5" aria-label="Setup progress">
			{displaySteps.map(step => {
				const stepIndex = STEPS.indexOf(step)
				const isCompleted = stepIndex < currentIndex
				const isCurrent = step === currentStep

				return (
					<div
						key={step}
						title={STEP_LABELS[step]}
						className={[
							'h-1.5 rounded-full transition-all duration-200',
							isCurrent ? 'w-6 bg-primary' : isCompleted ? 'w-3 bg-primary/50' : 'w-3 bg-muted'
						].join(' ')}
					/>
				)
			})}
		</div>
	)
}

// ============================================================================
// MAIN WIZARD
// ============================================================================

/**
 * Onboarding wizard dialog - auto-shows for new landlords.
 * Add to any layout component where new owners will land.
 */
export function OnboardingWizard() {
	const { showWizard, isLoading, completeOnboarding, skipOnboarding } =
		useOnboarding()

	const [currentStep, setCurrentStep] = useState<WizardStep>('welcome')
	const [isDismissed, setIsDismissed] = useState(false)

	const isOpen = !isLoading && showWizard && !isDismissed

	const handleNext = () => {
		const currentIndex = STEPS.indexOf(currentStep)
		const nextStep = STEPS[currentIndex + 1]
		if (nextStep) {
			setCurrentStep(nextStep)
		}
	}

	const handleSkipStep = () => {
		const currentIndex = STEPS.indexOf(currentStep)
		const nextStep = STEPS[currentIndex + 1]
		if (nextStep) {
			setCurrentStep(nextStep)
		}
	}

	const handleDone = () => {
		completeOnboarding()
		setIsDismissed(true)
	}

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			skipOnboarding()
			setIsDismissed(true)
		}
	}

	const currentStepIndex = STEPS.indexOf(currentStep)
	const totalSteps = STEPS.length - 2
	const displayStepNumber = currentStepIndex

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md" showCloseButton={true}>
				<DialogHeader>
					<div className="flex items-center justify-between gap-4">
						<DialogTitle className="text-base">
							{currentStep === 'welcome' && 'Getting Started'}
							{currentStep === 'complete' && 'Setup Complete'}
							{currentStep !== 'welcome' && currentStep !== 'complete' && (
								<span>
									Step {displayStepNumber} of {totalSteps}
								</span>
							)}
						</DialogTitle>
						<StepIndicator currentStep={currentStep} />
					</div>
				</DialogHeader>

				{currentStep === 'welcome' && (
					<OnboardingStepWelcome
						onNext={handleNext}
						onSkip={() => handleOpenChange(false)}
					/>
				)}

				{currentStep === 'property' && (
					<OnboardingStepProperty
						onNext={handleNext}
						onSkip={handleSkipStep}
					/>
				)}

				{currentStep === 'stripe' && (
					<OnboardingStepStripe
						onNext={handleNext}
						onSkip={handleSkipStep}
					/>
				)}

				{currentStep === 'tenant' && (
					<OnboardingStepTenant
						onNext={handleNext}
						onSkip={handleSkipStep}
					/>
				)}

				{currentStep === 'complete' && (
					<OnboardingStepComplete onDone={handleDone} />
				)}
			</DialogContent>
		</Dialog>
	)
}
