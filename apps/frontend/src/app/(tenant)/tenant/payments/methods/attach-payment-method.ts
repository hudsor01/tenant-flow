/**
 * Attaches a payment method to the current tenant's Stripe customer via backend API.
 * Sets it as the default payment method.
 */
export async function attachPaymentMethod(
	paymentMethodId: string,
	signal: AbortSignal
): Promise<{ success: boolean; error?: string }> {
	const response = await fetch('/api/v1/stripe/attach-tenant-payment-method', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			payment_method_id: paymentMethodId,
			set_as_default: true
		}),
		signal
	})

	return response.json() as Promise<{ success: boolean; error?: string }>
}
