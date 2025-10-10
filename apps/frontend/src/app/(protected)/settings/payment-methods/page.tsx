import { PaymentMethodsList } from '@/components/payment-methods/payment-methods-list'

export default function PaymentMethodsPage() {
	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
				<p className="text-muted-foreground mt-2">
					Manage your payment methods for rent and fees
				</p>
			</div>

			<PaymentMethodsList />
		</div>
	)
}
