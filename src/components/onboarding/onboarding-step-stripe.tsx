'use client'

import { CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '#components/ui/button'
import Link from 'next/link'

interface OnboardingStepStripeProps {
	onNext: () => void
	onSkip: () => void
}

/**
 * Stripe Connect step - informational screen explaining Stripe payouts
 */
export function OnboardingStepStripe({
	onNext,
	onSkip
}: OnboardingStepStripeProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
					<CreditCard className="w-5 h-5 text-primary" aria-hidden="true" />
				</div>
				<div>
					<h3 className="font-semibold">Connect Stripe for Payouts</h3>
					<p className="text-sm text-muted-foreground">
						Receive rent payments directly to your bank account.
					</p>
				</div>
			</div>

			<div className="rounded-lg border bg-muted/40 p-4 space-y-2">
				<p className="text-sm font-medium">Why connect Stripe?</p>
				<ul className="text-sm text-muted-foreground space-y-1.5">
					<li className="flex items-start gap-2">
						<span className="mt-0.5 text-primary font-bold shrink-0">+</span>
						Accept online rent payments from tenants
					</li>
					<li className="flex items-start gap-2">
						<span className="mt-0.5 text-primary font-bold shrink-0">+</span>
						Automatic transfers to your bank account
					</li>
					<li className="flex items-start gap-2">
						<span className="mt-0.5 text-primary font-bold shrink-0">+</span>
						Detailed payment tracking and receipts
					</li>
				</ul>
			</div>

			<div className="flex gap-2 pt-1">
				<Button
					type="button"
					asChild
					className="min-h-11 flex-1"
					onClick={onNext}
				>
					<Link href="/financials/billing">
						Open Billing
						<ExternalLink className="ml-2 w-4 h-4" aria-hidden="true" />
					</Link>
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onSkip}
					className="min-h-11"
				>
					Skip
				</Button>
			</div>

			<p className="text-xs text-muted-foreground text-center">
				You can connect Stripe later from the Billing settings page.
			</p>
		</div>
	)
}
