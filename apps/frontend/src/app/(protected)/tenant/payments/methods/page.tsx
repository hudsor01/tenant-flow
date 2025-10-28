import { Suspense } from 'react'

import { AddPaymentMethod } from '#app/(protected)/manage/payments/methods/add-payment-method.client'
import { TenantPaymentMethods } from './tenant-payment-methods.client'

export default function TenantPaymentMethodsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Payment methods
				</h1>
				<p className="text-muted-foreground">
					Save a payment method for rent autopay. You can update or remove it at
					any time.
				</p>
			</div>
			<Suspense
				fallback={
					<div className="animate-pulse text-muted-foreground">
						Loading payment methods...
					</div>
				}
			>
				<TenantPaymentMethods />
			</Suspense>
			<AddPaymentMethod />
		</div>
	)
}
