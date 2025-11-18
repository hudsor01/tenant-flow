// Billing types - subscription and invoice tables not yet implemented in database
// Billing domain helper types kept intentionally lightweight to avoid
// referencing non-existent Supabase tables. These align with the
// autopay subscription payloads returned by the SubscriptionsService.

export interface Subscription {
	id: string
	user_id: string
	status: 'active' | 'paused' | 'canceled'
	stripe_subscription_id?: string
	stripe_customer_id?: string | null
	created_at: string
	updated_at: string
}

export interface Invoice {
	id: string
	user_id: string
	status: 'draft' | 'sent' | 'paid'
	amount: number
	currency: string
	due_date: string
	created_at: string
	updated_at: string
}
