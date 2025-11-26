import { Metadata } from 'next'
import { PayoutsDashboard } from './payouts-dashboard'

export const metadata: Metadata = {
	title: 'Payouts | TenantFlow',
	description: 'View your payout history and balance'
}

export default function PayoutsPage() {
	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Payouts
				</h1>
				<p className="text-muted-foreground">
					View your account balance and payout history from rent payments.
				</p>
			</div>

			<PayoutsDashboard />
		</div>
	)
}
