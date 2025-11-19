'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { cn } from '#lib/utils'
import { Building2, Users, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mobileOnboardingCompleted'

const STEPS = [
	{
		icon: Building2,
		title: 'Manage Properties',
		description: 'Capture addresses, rent rolls, and photos in seconds.',
		color: 'text-blue-500'
	},
	{
		icon: Users,
		title: 'Track Tenants',
		description: 'Stay ahead of renewals and communication in one timeline.',
		color: 'text-green-500'
	},
	{
		icon: Wrench,
		title: 'Handle Maintenance',
		description: 'Assign vendors, update statuses, and notify tenants instantly.',
		color: 'text-orange-500'
	}
]

export function MobileOnboarding() {
	const [step, setStep] = useState(0)
	const [completed, setCompleted] = useState(true)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}
		const stored = window.localStorage.getItem(STORAGE_KEY) === 'true'
		setCompleted(stored)
		setMounted(true)
	}, [])

	const completeOnboarding = () => {
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(STORAGE_KEY, 'true')
		}
		setCompleted(true)
	}

	if (!mounted || completed) {
		return null
	}

	const currentStep = STEPS[step]

	if (!currentStep) {
		return null
	}

	const Icon = currentStep.icon

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center bg-background/95 px-4 py-6 md:hidden">
			<Card className="w-full max-w-sm rounded-3xl">
				<CardHeader className="text-center space-y-4">
					<div className={cn('mx-auto rounded-full bg-primary/10 p-4', currentStep.color)}>
						<Icon className="size-8" aria-hidden />
					</div>
					<CardTitle className="text-xl font-semibold">{currentStep.title}</CardTitle>
					<p className="text-sm text-muted-foreground">{currentStep.description}</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex justify-center gap-2">
						{STEPS.map((_, index) => (
							<span
								key={index}
								className={cn(
									'size-2 rounded-full',
									index === step ? 'bg-primary' : 'bg-muted'
								)}
							/>
						))}
					</div>
					<div className="flex gap-2">
						{step > 0 && (
							<Button variant="outline" onClick={() => setStep(step - 1)}>
								Back
							</Button>
						)}
						<Button
							className="flex-1"
							onClick={() => {
								if (step === STEPS.length - 1) {
									completeOnboarding()
								} else {
									setStep(step + 1)
								}
							}}
						>
							{step === STEPS.length - 1 ? 'Get Started' : 'Next'}
						</Button>
					</div>
					<Button variant="link" onClick={completeOnboarding}>
						Skip
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
