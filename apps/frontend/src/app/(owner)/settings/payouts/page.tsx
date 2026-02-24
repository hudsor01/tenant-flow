'use client'

/**
 * Settings > Payouts Page
 * URL: /settings/payouts
 *
 * Shows Stripe Connect account status and allows owners to connect or
 * complete verification of their Stripe account for receiving rent payments.
 *
 * The account status section is always visible (not dismissible) so owners
 * can track verification status at any time.
 */
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	useConnectedAccount,
	useCreateConnectedAccountMutation,
} from '#hooks/api/use-stripe-connect'

export default function SettingsPayoutsPage() {
	const { data: connectedAccount, isLoading } = useConnectedAccount()
	const { mutate: startOnboarding, isPending } = useCreateConnectedAccountMutation()

	return (
		<div className="p-4 sm:p-6 lg:p-8 bg-background min-h-full">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Payouts</h1>
				<p className="text-sm text-muted-foreground">
					Manage your Stripe account for receiving rent payments
				</p>
			</div>

			{/* Always-visible Stripe account status section */}
			<section className="mb-6 rounded-lg border p-6">
				<h2 className="text-xl font-semibold mb-3">Stripe Account Status</h2>
				{isLoading ? (
					<div className="skeleton-text" />
				) : !connectedAccount ? (
					<div className="flex items-center gap-3">
						<Badge variant="secondary">Not connected</Badge>
						<Button
							onClick={() => startOnboarding({})}
							disabled={isPending}
							className="min-h-11"
						>
							Connect Stripe
						</Button>
					</div>
				) : (
					<div className="flex items-center gap-3">
						<Badge variant={connectedAccount.charges_enabled ? 'success' : 'warning'}>
							{connectedAccount.charges_enabled ? 'Verified' : 'Verification pending'}
						</Badge>
						{!connectedAccount.charges_enabled && (
							<Button
								variant="outline"
								onClick={() => startOnboarding({})}
								disabled={isPending}
								className="min-h-11"
							>
								Complete verification
							</Button>
						)}
					</div>
				)}
				{connectedAccount && (
					<p className="mt-3 text-sm text-muted-foreground">
						{connectedAccount.charges_enabled
							? 'Your Stripe account is verified. Rent payments will be deposited to your linked bank account.'
							: 'Complete Stripe verification to start receiving rent payments from tenants.'}
					</p>
				)}
			</section>

			{/* Placeholder for future payout history content */}
			<section className="rounded-lg border p-6">
				<h2 className="text-xl font-semibold mb-3">Payout History</h2>
				<p className="text-sm text-muted-foreground">
					Payout history and transfer details are available in{' '}
					<a href="/financials/payouts" className="text-primary underline underline-offset-4">
						Financials &rsaquo; Payouts
					</a>
					.
				</p>
			</section>
		</div>
	)
}
