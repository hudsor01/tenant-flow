'use client'

import { Building2 } from 'lucide-react'
import { Button } from '#components/ui/button'

interface OnboardingStepWelcomeProps {
	onNext: () => void
	onSkip: () => void
}

/**
 * Welcome step - intro screen for the onboarding wizard
 */
export function OnboardingStepWelcome({
	onNext,
	onSkip
}: OnboardingStepWelcomeProps) {
	return (
		<div className="flex flex-col items-center text-center gap-6 py-4">
			<div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
				<Building2 className="w-8 h-8 text-primary" aria-hidden="true" />
			</div>

			<div className="space-y-2">
				<h2 className="text-xl font-semibold">Welcome to TenantFlow</h2>
				<p className="text-sm text-muted-foreground max-w-sm">
					Let us get you set up quickly. We will guide you through adding your
					first property, connecting Stripe for payouts, and inviting your first
					tenant.
				</p>
			</div>

			<div className="flex flex-col gap-2 w-full max-w-xs">
				<Button
					type="button"
					onClick={onNext}
					className="min-h-11 w-full"
				>
					Get Started
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={onSkip}
					className="min-h-11 w-full text-muted-foreground"
				>
					Skip for now
				</Button>
			</div>
		</div>
	)
}
