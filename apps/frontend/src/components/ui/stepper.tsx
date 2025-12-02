'use client'

import { Check } from 'lucide-react'
import { cn } from '#lib/utils'

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

export function Stepper({ steps, currentStep, className }: StepperProps) {
	return (
		<nav aria-label="Progress" className={cn('w-full', className)}>
			<ol role="list" className="flex-between">
				{steps.map((step, stepIdx) => {
					const isComplete = stepIdx < currentStep
					const isCurrent = stepIdx === currentStep
					const isUpcoming = stepIdx > currentStep

					return (
						<li
							key={step.id}
							className={cn(
								'relative',
								stepIdx !== steps.length - 1 ? 'flex-1 pr-8 sm:pr-20' : ''
							)}
						>
							{stepIdx !== steps.length - 1 && (
								<div
									className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
									aria-hidden="true"
								>
									<div
										className={cn(
											'h-full w-full transition-colors',
											isComplete
												? 'bg-primary'
												: 'bg-muted-foreground/20'
										)}
									/>
								</div>
							)}

							<div className="group relative flex flex-col items-start">
								<span className="flex-start">
									<span
										className={cn(
											'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
											isComplete &&
												'border-primary bg-primary text-primary-foreground',
											isCurrent &&
												'border-primary bg-background text-primary',
											isUpcoming &&
												'border-muted-foreground/20 bg-background text-muted-foreground'
										)}
									>
										{isComplete ? (
											<Check className="h-5 w-5" aria-hidden="true" />
										) : (
											<span className="text-sm font-semibold">
												{stepIdx + 1}
											</span>
										)}
									</span>
								</span>
								<span className="mt-2 flex min-w-0 flex-col">
									<span
										className={cn(
											'text-sm font-medium transition-colors',
											isCurrent && 'text-primary',
											isComplete && 'text-foreground',
											isUpcoming && 'text-muted-foreground'
										)}
									>
										{step.title}
									</span>
									{step.description && (
										<span className="text-xs text-muted-foreground">
											{step.description}
										</span>
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
