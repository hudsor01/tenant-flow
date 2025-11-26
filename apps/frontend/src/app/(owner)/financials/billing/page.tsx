import { Metadata } from 'next'
import { StripeConnectStatus } from './stripe-connect-onboarding'

export const metadata: Metadata = {
	title: 'Billing & Payments | TenantFlow',
	description: 'Manage your Stripe Connect account and payment settings'
}

export default function BillingPage() {
	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Billing & Payments
				</h1>
				<p className="text-muted-foreground">
					Connect and manage your Stripe account to receive rent payments from tenants.
				</p>
			</div>

			<StripeConnectStatus />
		</div>
	)
}
