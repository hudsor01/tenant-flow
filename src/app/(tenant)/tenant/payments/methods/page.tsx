import { Suspense } from 'react'

import { AddPaymentMethod } from '#app/(owner)/payments/methods/add-payment-method.client'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { TenantPaymentMethods } from './tenant-payment-methods.client'

function PaymentMethodsError() {
	return (
		<Alert variant="destructive">
			<AlertTriangle className="size-4" />
			<AlertTitle>Failed to load payment methods</AlertTitle>
			<AlertDescription>
				There was an error loading your payment methods. Please try refreshing the
				page. If the problem persists, contact support.
			</AlertDescription>
		</Alert>
	)
}

export default function TenantPaymentMethodsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h1">Payment methods</h1>
				<p className="text-muted-foreground">
					Save a payment method for rent autopay. You can update or remove it at
					any time.
				</p>
			</div>
			<ErrorBoundary fallback={<PaymentMethodsError />}>
				<Suspense
					fallback={
						<div className="animate-pulse text-muted-foreground">
							Loading payment methods...
						</div>
					}
				>
					<TenantPaymentMethods />
				</Suspense>
			</ErrorBoundary>
			<AddPaymentMethod />
		</div>
	)
}
