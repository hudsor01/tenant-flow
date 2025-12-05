'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import {
	Stepper,
	StepperList,
	StepperItem,
	StepperTrigger,
	StepperIndicator,
	StepperTitle,
	StepperDescription,
	StepperSeparator
} from '#components/ui/stepper'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { cn } from '#lib/utils'

const WIZARD_STEPS = [
	{
		value: 'basic-info',
		title: 'Basic Information',
		description: 'Property and lease details'
	},
	{
		value: 'financial',
		title: 'Financial Terms',
		description: 'Rent and deposits'
	},
	{
		value: 'terms',
		title: 'Terms & Conditions',
		description: 'Pets, utilities, rules'
	},
	{
		value: 'review',
		title: 'Review & Generate',
		description: 'Final review'
	}
] as const

type StepValue = (typeof WIZARD_STEPS)[number]['value']

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
	const [currentStepValue, setCurrentStepValue] = useState<StepValue>('basic-info')
	const [canGoNext, setCanGoNext] = useState(true)

	const currentStepIndex = WIZARD_STEPS.findIndex(s => s.value === currentStepValue)
	const isFirstStep = currentStepIndex === 0
	const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

	const goToStep = (stepIndex: number) => {
		const step = WIZARD_STEPS[stepIndex]
		if (step) {
			setCurrentStepValue(step.value)
		}
	}

	const goToNextStep = () => {
		if (!isLastStep && canGoNext) {
			const nextStep = WIZARD_STEPS[currentStepIndex + 1]
			if (nextStep) setCurrentStepValue(nextStep.value)
		}
	}

	const goToPreviousStep = () => {
		if (!isFirstStep) {
			const prevStep = WIZARD_STEPS[currentStepIndex - 1]
			if (prevStep) setCurrentStepValue(prevStep.value)
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
			<div className="flex-center p-8">
				<div className="text-center space-y-2">
					<p className="text-destructive font-semibold">
						Missing Required Information
					</p>
					<p className="text-muted">
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
			<Stepper
				value={currentStepValue}
				onValueChange={(value) => setCurrentStepValue(value as StepValue)}
				orientation="horizontal"
				nonInteractive
			>
				<StepperList>
					{WIZARD_STEPS.map((step) => (
						<StepperItem key={step.value} value={step.value}>
							<StepperTrigger className="gap-3">
								<StepperIndicator />
								<div className="flex flex-col items-start">
									<StepperTitle>{step.title}</StepperTitle>
									<StepperDescription className="hidden sm:block">
										{step.description}
									</StepperDescription>
								</div>
							</StepperTrigger>
							<StepperSeparator />
						</StepperItem>
					))}
				</StepperList>
			</Stepper>

			{/* Step Content */}
			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="min-h-[400px]">
					{children({
						currentStep: currentStepIndex,
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
