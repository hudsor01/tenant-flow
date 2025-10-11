import { Suspense } from 'react'

import { AddPaymentMethod } from './add-payment-method.client'
import { PaymentMethodsList } from './payment-methods-list.client'

export default function OwnerPaymentMethodsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Payment methods
				</h1>
				<p className="text-muted-foreground">
					Manage owner payment methods used for collecting rent and subscription
					revenue.
				</p>
			</div>
			<Suspense
				fallback={
					<div className="animate-pulse text-muted-foreground">
						Loading payment methods...
					</div>
				}
			>
				<PaymentMethodsList />
			</Suspense>
			<AddPaymentMethod />
		</div>
	)
}
