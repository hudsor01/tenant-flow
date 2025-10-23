'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Plus,
	X
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

export interface FormStep {
	id: number
	title: string
	description: string
}

export interface CreateModalProps {
	/**
	 * Modal trigger button text
	 */
	triggerText: string
	/**
	 * Modal trigger button icon (defaults to Plus)
	 */
	triggerIcon?: ReactNode
	/**
	 * Modal title
	 */
	title: string
	/**
	 * Modal description
	 */
	description: string
	/**
	 * Form steps configuration
	 */
	steps: FormStep[]
	/**
	 * Form type identifier (for Zustand store)
	 */
	formType: 'property' | 'tenant' | 'lease' | 'maintenance'
	/**
	 * Whether the form submission is pending
	 */
	isPending?: boolean
	/**
	 * Submit button text
	 */
	submitText?: string
	/**
	 * Submit button pending text
	 */
	submitPendingText?: string
	/**
	 * Custom validation per step
	 * Return true if valid, false if invalid (shows error via toast)
	 */
	onValidateStep?: (step: number) => Promise<boolean> | boolean
	/**
	 * Form submit handler
	 */
	onSubmit: (e: React.FormEvent) => void | Promise<void>
	/**
	 * Callback when modal open state changes
	 */
	onOpenChange?: (open: boolean) => void
	/**
	 * Form content - render function receives current step
	 */
	children: (currentStep: number) => ReactNode
	/**
	 * Custom modal className
	 */
	className?: string
	/**
	 * Custom trigger button className
	 */
	triggerClassName?: string
}

/**
 * Base create modal component with multi-step wizard pattern (full-page overlay)
 *
 * Features:
 * - Multi-step wizard with progress indicator
 * - Full-page modal overlay
 * - Zustand store integration for form state
 * - Step validation
 * - Previous/Next/Submit navigation
 * - Customizable via children render function
 *
 * @example
 * ```tsx
 * <CreateModal
 *   triggerText="Add Tenant"
 *   title="Add New Tenant"
 *   description="Add a new tenant to your properties"
 *   steps={TENANT_STEPS}
 *   formType="tenant"
 *   onSubmit={handleSubmit}
 *   onValidateStep={validateTenantStep}
 * >
 *   {(currentStep) => (
 *     <>
 *       {currentStep === 1 && <TenantBasicInfoStep />}
 *       {currentStep === 2 && <TenantContactStep />}
 *       {currentStep === 3 && <TenantLeaseStep />}
 *     </>
 *   )}
 * </CreateModal>
 * ```
 */
export function CreateModal({
	triggerText,
	triggerIcon = <Plus className="size-4" />,
	title,
	description,
	steps,
	formType,
	isPending = false,
	submitText = 'Create',
	submitPendingText = 'Creating...',
	onValidateStep,
	onSubmit,
	onOpenChange,
	children,
	className = '',
	triggerClassName = 'flex items-center gap-2 bg-[var(--color-primary-brand)] text-white rounded-[var(--radius-medium)] px-4 py-2 transition-all duration-150 ease-[var(--ease-smooth)]'
}: CreateModalProps) {
	const [isOpen, setIsOpen] = useState(false)

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

	// Initialize form progress when modal opens
	const handleOpenChange = (open: boolean) => {
		setIsOpen(open)
		if (open) {
			setFormProgress({
				currentStep: 1,
				totalSteps: steps.length,
				completedSteps: [],
				formData: {},
				formType
			})
		} else {
			resetFormProgress()
		}
		onOpenChange?.(open)
	}

	const handleNext = async () => {
		// Validate current step if validator provided
		if (onValidateStep) {
			const isValid = await onValidateStep(currentStep)
			if (!isValid) {
				return
			}
		}

		completeStep(currentStep)
		if (!isLastStep) {
			nextStep()
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		await onSubmit(e)
	}

	const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100

	if (!isOpen) {
		return (
			<Button
				variant="default"
				className={triggerClassName}
				onClick={() => handleOpenChange(true)}
			>
				{triggerIcon}
				{triggerText}
			</Button>
		)
	}

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0"
				onClick={() => handleOpenChange(false)}
			/>

			{/* Modal Content */}
			<div
				className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] sm:rounded-lg ${className}`}
			>
				{/* Close Button */}
				<button
					onClick={() => handleOpenChange(false)}
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</button>

				{/* Header */}
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold text-gradient">{title}</h2>
					<p className="text-muted-foreground">{description}</p>
				</div>

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
							{steps[currentStep - 1]?.title}
						</h3>
					</div>
					<p className="text-center text-muted-foreground text-sm">
						{steps[currentStep - 1]?.description}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Dynamic form content based on current step */}
					<div className="max-h-[60vh] overflow-y-auto">{children(currentStep)}</div>

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
								onClick={() => handleOpenChange(false)}
							>
								Cancel
							</Button>

							{isLastStep ? (
								<Button
									type="submit"
									disabled={isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{isPending ? submitPendingText : submitText}
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
			</div>
		</>
	)
}
