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
import { Progress } from '@/components/ui/progress'
import { useFormStep, useUIStore } from '@/stores/ui-store'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { FormProgress } from '@repo/shared/types/frontend'
import { CheckCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

export interface FormStep {
	id: number
	title: string
	description: string
}

export interface CreateDialogProps
	extends Omit<React.ComponentProps<typeof DialogPrimitive.Root>, 'children'> {
	/**
	 * Dialog trigger button text
	 */
	triggerText: string
	/**
	 * Dialog trigger button icon (defaults to Plus)
	 */
	triggerIcon?: ReactNode
	/**
	 * Dialog title
	 */
	title: string
	/**
	 * Dialog description
	 */
	description: string
	/**
	 * Form steps configuration
	 */
	steps: FormStep[]
	/**
	 * Form type identifier (for Zustand store)
	 */
	formType: FormProgress['formType']
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
	 * Callback when dialog open state changes
	 */
	onOpenChange?: (open: boolean) => void
	/**
	 * Form content - render function receives current step
	 */
	children: (currentStep: number) => ReactNode
	/**
	 * Custom dialog content className
	 */
	contentClassName?: string
	/**
	 * Custom trigger button className
	 */
	triggerClassName?: string
	/**
	 * Controlled open state (optional)
	 */
	open?: boolean
}

/**
 * Base create dialog component with multi-step wizard pattern
 *
 * Features:
 * - Multi-step wizard with progress indicator
 * - Zustand store integration for form state
 * - Step validation
 * - Previous/Next/Submit navigation
 * - Customizable via children render function
 *
 * @example
 * ```tsx
 * <CreateDialog
 *   triggerText="Add Property"
 *   title="Add New Property"
 *   description="Add a new property to your portfolio"
 *   steps={PROPERTY_STEPS}
 *   formType="property"
 *   onSubmit={handleSubmit}
 *   onValidateStep={validatePropertyStep}
 * >
 *   {(currentStep) => (
 *     <>
 *       {currentStep === 1 && <PropertyBasicInfoStep />}
 *       {currentStep === 2 && <PropertyAddressStep />}
 *       {currentStep === 3 && <PropertyDetailsStep />}
 *     </>
 *   )}
 * </CreateDialog>
 * ```
 */
export function CreateDialog({
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
	contentClassName = 'sm:max-w-2xl max-h-[90vh] overflow-y-auto',
	triggerClassName = 'flex items-center gap-2 bg-[var(--color-primary-brand)] text-white rounded-[var(--radius-medium)] px-4 py-2 transition-all duration-150 ease-[var(--ease-smooth)]',
	open,
	...rest
}: CreateDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const isControlled = open !== undefined
	const isOpen = isControlled ? open : internalOpen

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

	const setDialogOpen = (value: boolean) => {
		if (!isControlled) {
			setInternalOpen(value)
		}
		onOpenChange?.(value)
	}

	useEffect(() => {
		if (isOpen) {
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, steps.length, formType])

	// Initialize form progress when dialog opens
	const handleOpenChange = (openState: boolean) => {
		setDialogOpen(openState)
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

	const hasMultipleSteps = useMemo(() => steps.length > 1, [steps.length])
	const progressPercentage = hasMultipleSteps
		? ((currentStep - 1) / (totalSteps - 1)) * 100
		: 100

	return (
		<Dialog {...rest} open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="default" className={triggerClassName}>
					{triggerIcon}
					{triggerText}
				</Button>
			</DialogTrigger>

			<DialogContent className={contentClassName}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
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

					{hasMultipleSteps && (
						<>
							<Progress value={progressPercentage} className="h-2" />

							<div className="flex items-center justify-center">
								<h3 className="font-semibold text-lg">
									{steps[currentStep - 1]?.title}
								</h3>
							</div>
							<p className="text-center text-muted-foreground text-sm">
								{steps[currentStep - 1]?.description}
							</p>
						</>
					)}
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Dynamic form content based on current step */}
					{children(currentStep)}

					{/* Navigation */}
					<div className="flex justify-between pt-6 border-t">
						{hasMultipleSteps ? (
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
								onClick={() => setDialogOpen(false)}
							>
								Cancel
							</Button>

							{hasMultipleSteps && !isLastStep ? (
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
			</DialogContent>
		</Dialog>
	)
}
