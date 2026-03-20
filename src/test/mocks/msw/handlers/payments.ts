import { http } from 'msw'
import { supabaseUrl, postgrestList, postgrestEmpty } from '../utils'

const DEFAULT_PAYMENT = {
	id: 'payment-1',
	rent_due_id: 'rent-due-1',
	lease_id: 'lease-1',
	tenant_id: 'tenant-1',
	amount: 1500,
	status: 'succeeded',
	stripe_payment_intent_id: 'pi_test_123',
	payment_method_type: 'card',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

export const paymentHandlers = [
	http.get(supabaseUrl('/rest/v1/rent_payments'), () => {
		return postgrestList([DEFAULT_PAYMENT], 1)
	}),
	http.get(supabaseUrl('/rest/v1/rent_due'), () => {
		return postgrestList([], 0)
	}),
	http.get(supabaseUrl('/rest/v1/payment_methods'), () => {
		return postgrestEmpty()
	})
]
