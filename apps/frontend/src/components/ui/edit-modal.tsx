'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import { CheckCircle, ChevronLeft, ChevronRight, Edit, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

export interface FormStep {
	id: number
	title: string
	description: string
}

export interface EditModalProps {
	/**
	 * Modal trigger button text
	 */
	triggerText: string
	/**
	 * Modal trigger button icon (defaults to Edit)
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
	 * Form steps configuration (optional - for multi-step edit forms)
	 */
	steps?: FormStep[]
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
	 */
	onValidateStep?: (step: number) => Promise<boolean> | boolean
	/**
	 * Form submit handler
	 */
	onSubmit: (e: React.FormEvent) => void | Promise<void>
	/**
	 * Controlled open state (optional)
	 */
	open?: boolean
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
	/**
	 * Custom trigger button variant
	 */
	triggerVariant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
	/**
	 * Render trigger as button child (for custom triggers)
	 */
	renderTrigger?: (onClick: () => void) => ReactNode
}

/**
 * Base edit modal component (full-page overlay) with optional multi-step wizard
 *
 * @example
 * ```tsx
 * <EditModal
 *   triggerText="Edit Tenant"
 *   title="Edit Tenant"
 *   description="Update tenant information"
 *   formType="tenant"
 *   onSubmit={handleSubmit}
 * >
 *   {() => <TenantEditForm />}
 * </EditModal>
 * ```
 */
export function EditModal({
	triggerText,
	triggerIcon = <Edit className="size-4" />,
	title,
	description,
	steps,
	formType,
	isPending = false,
	submitText = 'Save Changes',
	submitPendingText = 'Saving...',
	onValidateStep,
	onSubmit,
	onOpenChange,
	children,
	className = '',
	triggerClassName = 'flex items-center gap-2',
	triggerVariant = 'outline',
	renderTrigger
}: EditModalProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const isControlled = open !== undefined
	const isOpen = isControlled ? !!open : internalOpen

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

	const hasSteps = steps && steps.length > 0
	const effectiveTotalSteps = hasSteps ? steps.length : 1

	const handleOpenChange = (open: boolean) => {
		if (!isControlled) setInternalOpen(open)
		if (open) {
			setFormProgress({
				currentStep: 1,
				totalSteps: effectiveTotalSteps,
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

	const progressPercentage =
		effectiveTotalSteps > 1
			? ((currentStep - 1) / (effectiveTotalSteps - 1)) * 100
			: 100

	if (!isOpen) {
		if (renderTrigger) {
			return (
				<div onClick={() => handleOpenChange(true)}>
					{renderTrigger(() => handleOpenChange(true))}
				</div>
			)
		}

		return (
			<Button
				variant={triggerVariant}
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

				{/* Progress Indicator (only for multi-step) */}
				{hasSteps && (
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
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Dynamic form content */}
					<div className="max-h-[60vh] overflow-y-auto">
						{children(currentStep)}
					</div>

					{/* Navigation */}
					<div className="flex justify-between pt-6 border-t">
						{hasSteps ? (
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
						) : (
							<div />
						)}

						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
							>
								Cancel
							</Button>

							{hasSteps && !isLastStep ? (
								<Button
									type="button"
									onClick={handleNext}
									className="flex items-center gap-2"
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							) : (
								<Button
									type="submit"
									disabled={isPending}
									className="flex items-center gap-2"
								>
									<CheckCircle className="size-4" />
									{isPending ? submitPendingText : submitText}
								</Button>
							)}
						</div>
					</div>
				</form>
			</div>
		</>
	)
}
