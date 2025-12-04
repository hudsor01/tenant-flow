'use client'

import { cva, type VariantProps as _VariantProps } from 'class-variance-authority'
import { Check } from 'lucide-react'
import { cn } from '#lib/utils'

// CVA for step indicator circle
const stepIndicatorVariants = cva(
	'relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-colors',
	{
		variants: {
			state: {
				complete: 'border-primary bg-primary text-primary-foreground',
				current: 'border-primary bg-background text-primary',
				upcoming: 'border-muted-foreground/20 bg-background text-muted-foreground'
			}
		},
		defaultVariants: {
			state: 'upcoming'
		}
	}
)

// CVA for progress line between steps
const stepLineVariants = cva('h-full w-full transition-colors', {
	variants: {
		state: {
			complete: 'bg-primary',
			incomplete: 'bg-muted-foreground/20'
		}
	},
	defaultVariants: {
		state: 'incomplete'
	}
})

// CVA for step title text
const stepTitleVariants = cva('text-sm font-medium transition-colors', {
	variants: {
		state: {
			complete: 'text-foreground',
			current: 'text-primary',
			upcoming: 'text-muted-foreground'
		}
	},
	defaultVariants: {
		state: 'upcoming'
	}
})

export interface Step {
	id: string
	title: string
	description?: string
}

interface StepperProps {
	steps: Step[]
	currentStep: number
	className?: string
}

// Derive step state from index and current step
function getStepState(stepIdx: number, currentStep: number) {
	if (stepIdx < currentStep) return 'complete' as const
	if (stepIdx === currentStep) return 'current' as const
	return 'upcoming' as const
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
	return (
		<nav aria-label="Progress" className={cn('w-full', className)}>
			<ol role="list" className="flex-between">
				{steps.map((step, stepIdx) => {
					const state = getStepState(stepIdx, currentStep)
					const isLastStep = stepIdx === steps.length - 1

					return (
						<li
							key={step.id}
							className={cn('relative', !isLastStep && 'flex-1 pr-8 sm:pr-20')}
						>
							{!isLastStep && (
								<div
									className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
									aria-hidden="true"
								>
									<div
										className={stepLineVariants({
											state: state === 'complete' ? 'complete' : 'incomplete'
										})}
									/>
								</div>
							)}

							<div className="group relative flex flex-col items-start">
								<span className="flex-start">
									<span className={stepIndicatorVariants({ state })}>
										{state === 'complete' ? (
											<Check className="size-5" aria-hidden="true" />
										) : (
											<span className="text-sm font-semibold">
												{stepIdx + 1}
											</span>
										)}
									</span>
								</span>
								<span className="mt-2 flex min-w-0 flex-col">
									<span className={stepTitleVariants({ state })}>
										{step.title}
									</span>
									{step.description && (
										<span className="text-caption">{step.description}</span>
									)}
								</span>
							</div>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}

export { stepIndicatorVariants, stepLineVariants, stepTitleVariants }
