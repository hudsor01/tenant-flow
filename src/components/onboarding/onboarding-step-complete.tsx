'use client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '#components/ui/button'

interface OnboardingStepCompleteProps {
	onDone: () => void
}

/**
 * Complete step - celebration screen shown when onboarding wizard finishes
 */
export function OnboardingStepComplete({ onDone }: OnboardingStepCompleteProps) {
	return (
		<div className="flex flex-col items-center text-center gap-6 py-4">
			<div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
				<CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
			</div>

			<div className="space-y-2">
				<h2 className="text-xl font-semibold">You are all set!</h2>
				<p className="text-sm text-muted-foreground max-w-sm">
					Your account is ready to use. You can manage properties, tenants,
					leases, and more from your dashboard.
				</p>
			</div>

			<Button
				type="button"
				onClick={onDone}
				className="min-h-11 w-full max-w-xs"
			>
				Go to Dashboard
			</Button>
		</div>
	)
}
