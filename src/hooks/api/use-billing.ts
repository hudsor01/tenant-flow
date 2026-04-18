import { useQuery } from '@tanstack/react-query'

import { billingQueries } from './query-keys/billing-keys'
import { subscriptionStatusQuery } from './query-keys/subscription-keys'

export function useInvoices() {
	return useQuery(billingQueries.invoices())
}

export function useBillingHistory() {
	return useQuery(billingQueries.history())
}

export function useFailedPaymentAttempts() {
	return useQuery(billingQueries.failed())
}

export function useSubscriptionStatus(options: { enabled?: boolean } = {}) {
	return useQuery(subscriptionStatusQuery.subscriptionStatus(options))
}
