'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Progress } from '#components/ui/progress'
import { useFormStep, useUIStore } from '#stores/ui-store'
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Edit
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface FormStep {
	id: number
	title: string
	description: string
}

export interface EditDialogProps {
	/**
	 * Dialog trigger button text (optional when hideTrigger is true)
	 */
	triggerText?: string
	/**
	 * Dialog trigger button icon (defaults to Edit)
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
	 * Form steps configuration (optional - for multi-step edit forms)
	 */
	steps?: FormStep[]
	/**
	 * Form type identifier (for Zustand store)
	 */
	formType: 'PROPERTY' | 'TENANT' | 'LEASE' | 'MAINTENANCE'
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
	 * Form content - render function receives current step (1 if no steps)
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
	 * Custom trigger button variant
	 */
	triggerVariant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
	/**
	 * Render trigger as button child (for custom triggers like icon-only buttons)
	 */
	renderTrigger?: (onClick: () => void) => ReactNode
	/**
	 * Controlled open state (optional)
	 */
		open?: boolean
	/**
	 * Hide default trigger (use when controlling the dialog externally)
	 */
	hideTrigger?: boolean
}

/**
 * Base edit dialog component with optional multi-step wizard pattern
 *
 * Features:
 * - Single-step or multi-step wizard with progress indicator
 * - Zustand store integration for form state
 * - Step validation
 * - Previous/Next/Submit navigation
 * - Customizable via children render function
 *
 * @example
 * ```tsx
 * <EditDialog
 *   triggerText="Edit Property"
 *   title="Edit Property"
 *   description="Update property information"
 *   formType="PROPERTY"
 *   onSubmit={handleSubmit}
 * >
 *   {() => <PropertyEditForm />}
 * </EditDialog>
 * ```
 */
export function EditDialog({
	triggerText = 'Edit',
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
	contentClassName = 'sm:max-w-2xl max-h-[90vh] overflow-y-auto',
	triggerClassName = 'flex items-center gap-2',
	triggerVariant = 'outline',
	renderTrigger,
	open,
	hideTrigger = false
}: EditDialogProps) {
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

	const hasSteps = steps && steps.length > 0
	const effectiveTotalSteps = hasSteps ? steps.length : 1
	const hasMultipleSteps = useMemo(
		() => effectiveTotalSteps > 1,
		[effectiveTotalSteps]
	)

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
				totalSteps: effectiveTotalSteps,
				completedSteps: [],
				formData: {},
				formType
			})
		} else {
			resetFormProgress()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, effectiveTotalSteps, formType])

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

	const progressPercentage =
		effectiveTotalSteps > 1 ? ((currentStep - 1) / (effectiveTotalSteps - 1)) * 100 : 100

	const triggerButton = renderTrigger ? (
		<div onClick={() => setDialogOpen(true)}>{renderTrigger(() => setDialogOpen(true))}</div>
	) : (
		<Button variant={triggerVariant} className={triggerClassName}>
			{triggerIcon}
			{triggerText}
		</Button>
	)

	const shouldRenderTrigger = !hideTrigger

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			{shouldRenderTrigger && (
				<DialogTrigger asChild>
					{triggerButton}
				</DialogTrigger>
			)}

			<DialogContent className={contentClassName}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-gradient">
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				{/* Progress Indicator (only show for multi-step) */}
				{hasMultipleSteps && (
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
								{steps?.[currentStep - 1]?.title}
							</h3>
						</div>
						<p className="text-center text-muted-foreground text-sm">
							{steps?.[currentStep - 1]?.description}
						</p>
					</div>
				)}

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
