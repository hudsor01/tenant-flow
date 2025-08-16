'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignupStep {
	id: string
	title: string
	description: string
	isCompleted: boolean
	isActive: boolean
}

interface SignupProgressIndicatorProps {
	currentStep: number
	className?: string
}

const SIGNUP_STEPS: SignupStep[] = [
	{
		id: 'details',
		title: 'Basic Details',
		description: 'Email and password',
		isCompleted: false,
		isActive: true
	},
	{
		id: 'verify',
		title: 'Email Verification',
		description: 'Confirm your email',
		isCompleted: false,
		isActive: false
	},
	{
		id: 'complete',
		title: 'Welcome',
		description: 'Account ready',
		isCompleted: false,
		isActive: false
	}
]

export function SignupProgressIndicator({
	currentStep,
	className
}: SignupProgressIndicatorProps) {
	const steps = SIGNUP_STEPS.map((step, index) => ({
		...step,
		isCompleted: index < currentStep,
		isActive: index === currentStep
	}))

	return (
		<div className={cn('mx-auto w-full max-w-md', className)}>
			<div className="relative flex items-center justify-between">
				{/* Progress line */}
				<div className="absolute top-4 left-0 h-0.5 w-full bg-gray-200">
					<div
						className="from-primary h-full bg-gradient-to-r to-purple-600 transition-all duration-500 ease-out"
						style={{
							width: `${(currentStep / (steps.length - 1)) * 100}%`
						}}
					/>
				</div>

				{steps.map((step, index) => (
					<div
						key={step.id}
						className="relative flex flex-col items-center"
					>
						{/* Step circle */}
						<div
							className={cn(
								'z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300',
								'shadow-sm',
								step.isCompleted &&
									'from-primary border-transparent bg-gradient-to-r to-purple-600 text-white',
								step.isActive &&
									!step.isCompleted &&
									'border-primary text-primary scale-110 bg-blue-50',
								!step.isActive &&
									!step.isCompleted &&
									'border-gray-300 bg-white text-gray-400'
							)}
						>
							{step.isCompleted ? (
								<Check className="h-4 w-4" />
							) : (
								<span className="text-sm font-semibold">
									{index + 1}
								</span>
							)}
						</div>

						{/* Step details - only show for active step on mobile */}
						<div
							className={cn(
								'mt-3 text-center transition-all duration-200',
								step.isActive
									? 'opacity-100'
									: 'hidden opacity-60 sm:block'
							)}
						>
							<div
								className={cn(
									'text-xs font-medium transition-colors',
									step.isActive && 'text-foreground',
									!step.isActive && 'text-muted-foreground'
								)}
							>
								{step.title}
							</div>
							<div className="text-muted-foreground mt-0.5 text-xs">
								{step.description}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
