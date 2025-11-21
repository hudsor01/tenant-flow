'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { Stepper, type Step } from '#components/ui/stepper'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@repo/shared/utils/cn'

const WIZARD_STEPS: Step[] = [
	{
		id: 'basic-info',
		title: 'Basic Information',
		description: 'Property and lease details'
	},
	{
		id: 'financial',
		title: 'Financial Terms',
		description: 'Rent and deposits'
	},
	{
		id: 'terms',
		title: 'Terms & Conditions',
		description: 'Pets, utilities, rules'
	},
	{
		id: 'review',
		title: 'Review & Generate',
		description: 'Final review'
	}
]

interface LeaseWizardProps {
	property_id: string
	unit_id: string
	tenant_id: string
	children: (props: {
		currentStep: number
		goToStep: (step: number) => void
		goToNextStep: () => void
		goToPreviousStep: () => void
		isFirstStep: boolean
		isLastStep: boolean
		canGoNext: boolean
		setCanGoNext: (can: boolean) => void
	}) => React.ReactNode
	onSubmit: () => void
	isSubmitting: boolean
}

export function LeaseWizard({
	property_id,
	unit_id,
	tenant_id,
	children,
	onSubmit,
	isSubmitting
}: LeaseWizardProps) {
	const [currentStep, setCurrentStep] = useState(0)
	const [canGoNext, setCanGoNext] = useState(true)

	const isFirstStep = currentStep === 0
	const isLastStep = currentStep === WIZARD_STEPS.length - 1

	const goToStep = (step: number) => {
		if (step >= 0 && step < WIZARD_STEPS.length) {
			setCurrentStep(step)
		}
	}

	const goToNextStep = () => {
		if (!isLastStep && canGoNext) {
			setCurrentStep(prev => prev + 1)
		}
	}

	const goToPreviousStep = () => {
		if (!isFirstStep) {
			setCurrentStep(prev => prev - 1)
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (isLastStep) {
			onSubmit()
		} else {
			goToNextStep()
		}
	}

	// Show error if required data is missing
	if (!property_id || !unit_id || !tenant_id) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center space-y-2">
					<p className="text-destructive font-semibold">
						Missing Required Information
					</p>
					<p className="text-sm text-muted-foreground">
						Property, unit, and tenant must all be selected to generate a lease
						agreement.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full space-y-8">
			{/* Progress Stepper */}
			<Stepper steps={WIZARD_STEPS} currentStep={currentStep} />

			{/* Step Content */}
			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="min-h-[400px]">
					{children({
						currentStep,
						goToStep,
						goToNextStep,
						goToPreviousStep,
						isFirstStep,
						isLastStep,
						canGoNext,
						setCanGoNext
					})}
				</div>

				{/* Navigation Buttons */}
				<div
					className={cn(
						'flex items-center border-t pt-6',
						isFirstStep ? 'justify-end' : 'justify-between'
					)}
				>
					{!isFirstStep && (
						<Button
							type="button"
							variant="outline"
							onClick={goToPreviousStep}
							disabled={isSubmitting}
						>
							<ChevronLeft className="mr-2 h-4 w-4" />
							Previous
						</Button>
					)}

					{!isLastStep ? (
						<Button
							type="button"
							onClick={goToNextStep}
							disabled={!canGoNext || isSubmitting}
						>
							Next
							<ChevronRight className="ml-2 h-4 w-4" />
						</Button>
					) : (
						<Button type="submit" disabled={isSubmitting || !canGoNext}>
							{isSubmitting ? (
								<>
									<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									Generating...
								</>
							) : (
								<>
									<FileText className="mr-2 h-4 w-4" />
									Generate & Download Lease
								</>
							)}
						</Button>
					)}
				</div>
			</form>
		</div>
	)
}
