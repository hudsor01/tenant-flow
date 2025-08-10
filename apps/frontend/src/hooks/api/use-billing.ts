/**
 * React Query hooks for Billing and Subscriptions
 * Provides type-safe data fetching and mutations for Stripe integration
 */
import { 
  type UseQueryResult,
  type UseMutationResult
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type { 
  UserSubscription,
  Invoice,
  PaymentMethod,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  SubscriptionUpdateParams,
  Plan,
  SubscriptionStatus
} from '@repo/shared'
import { createMutationAdapter } from '@repo/shared'
import { useQueryFactory, useMutationFactory } from '../query-factory'

/**
 * Fetch current user subscription
 * Maps to SubscriptionsController@current endpoint
 */
export function useSubscription(
  options?: { enabled?: boolean }
): UseQueryResult<UserSubscription, Error> {
  return useQueryFactory({
    queryKey: queryKeys.subscription(),
    queryFn: async () => {
      const response = await apiClient.get<UserSubscription>('/subscriptions/current')
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  })
}

/**
 * Fetch user invoices
 * TODO: Backend endpoint not implemented yet
 * Future endpoint: GET /billing/invoices
 */
export function useInvoices(
  options?: { 
    enabled?: boolean
    limit?: number
  }
): UseQueryResult<Invoice[], Error> {
  return useQueryFactory({
    queryKey: queryKeys.invoices(),
    queryFn: async () => {
      // TODO: Replace with actual backend endpoint when implemented
      const response = await apiClient.get<Invoice[]>(
        '/billing/invoices',
        { params: { limit: options?.limit ?? 10 } }
      )
      return response.data
    },
    enabled: false, // Disable until backend endpoint is ready
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
  })
}

/**
 * Fetch payment methods
 * Maps to BillingController@payment-methods endpoint
 */
export function usePaymentMethods(
  options?: { enabled?: boolean }
): UseQueryResult<PaymentMethod[], Error> {
  return useQueryFactory({
    queryKey: queryKeys.paymentMethods(),
    queryFn: async () => {
      const response = await apiClient.get<{ paymentMethods: PaymentMethod[] }>('/billing/payment-methods')
      return response.data.paymentMethods
    },
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
  })
}

/**
 * Create checkout session for new subscription
 * Uses BillingController@checkout/session (preferred) or StripeCheckoutController@create-checkout-session
 */
export function useCreateCheckoutSession(): UseMutationResult<
  CreateCheckoutSessionResponse,
  Error,
  CreateCheckoutSessionRequest
> {
  return useMutationFactory({
    mutationFn: async (data: CreateCheckoutSessionRequest) => {
      // Use BillingController endpoint for full subscription management
      const response = await apiClient.post<{ sessionId: string; url: string }>(
        '/billing/checkout/session',
        createMutationAdapter(data)
      )
      return {
        sessionId: response.data.sessionId,
        url: response.data.url
      } as CreateCheckoutSessionResponse
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
    errorMessage: 'Failed to create checkout session'
  })
}

/**
 * Cancel subscription
 */
export function useCancelSubscription(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  { subscriptionId: string; reason?: string }
> {
  return useMutationFactory({
    mutationFn: async ({ subscriptionId, reason }) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/stripe/subscriptions/${subscriptionId}/cancel`,
        { reason }
      )
      return response.data
    },
    invalidateKeys: [queryKeys.subscription()],
    successMessage: 'Subscription cancelled successfully',
    errorMessage: 'Failed to cancel subscription'
  })
}

/**
 * Update subscription (upgrade/downgrade plan)
 */
export function useUpdateSubscription(): UseMutationResult<
  UserSubscription,
  Error,
  SubscriptionUpdateParams
> {
  return useMutationFactory({
    mutationFn: async (data: SubscriptionUpdateParams) => {
      const response = await apiClient.put<UserSubscription>(
        '/stripe/subscription',
        createMutationAdapter(data)
      )
      return response.data
    },
    invalidateKeys: [queryKeys.subscription()],
    successMessage: 'Subscription updated successfully',
    errorMessage: 'Failed to update subscription',
    optimisticUpdate: {
      queryKey: queryKeys.subscription(),
      updater: (oldData: unknown, _variables: SubscriptionUpdateParams) => {
        const previousSubscription = oldData as UserSubscription
        return previousSubscription ? {
          ...previousSubscription,
          status: 'updating' as SubscriptionStatus
        } : undefined
      }
    }
  })
}

/**
 * Update default payment method
 * Maps to BillingController@payment-methods/update endpoint
 */
export function useUpdatePaymentMethod(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  { paymentMethodId: string; setAsDefault?: boolean }
> {
  return useMutationFactory({
    mutationFn: async ({ paymentMethodId, setAsDefault = true }) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/billing/payment-methods/update',
        { paymentMethodId, setAsDefault }
      )
      return response.data
    },
    invalidateKeys: [queryKeys.paymentMethods(), queryKeys.subscription()],
    successMessage: 'Payment method updated successfully',
    errorMessage: 'Failed to update payment method'
  })
}

/**
 * Fetch available pricing plans
 * Maps to SubscriptionsController@plans endpoint
 */
export function usePricingPlans(
  options?: { enabled?: boolean }
): UseQueryResult<Plan[], Error> {
  return useQueryFactory({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const response = await apiClient.get<Plan[]>('/subscriptions/plans')
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000, // Consider fresh for 30 minutes
  })
}

/**
 * Create customer portal session
 * Uses BillingController@portal/session (preferred) or StripeCheckoutController@create-portal-session
 */
export function useCreatePortalSession(): UseMutationResult<
  { url: string },
  Error,
  { returnUrl?: string } | undefined
> {
  return useMutationFactory({
    mutationFn: async (data?: { returnUrl?: string }) => {
      const { returnUrl } = data || {}
      // Use BillingController endpoint for full subscription management
      const response = await apiClient.post<{ url: string }>(
        '/billing/portal/session',
        { returnUrl }
      )
      return response.data
    },
    onSuccess: (data) => {
      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    },
    errorMessage: 'Failed to open billing portal'
  })
}

/**
 * Retry failed payment
 */
export function useRetryPayment(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  { invoiceId: string }
> {
  return useMutationFactory({
    mutationFn: async ({ invoiceId }) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/stripe/invoices/${invoiceId}/retry`
      )
      return response.data
    },
    invalidateKeys: [queryKeys.invoices(), queryKeys.subscription()],
    successMessage: 'Payment retry initiated',
    errorMessage: 'Failed to retry payment'
  })
}

/**
 * Download invoice PDF
 */
export function useDownloadInvoice(): UseMutationResult<
  Blob,
  Error,
  { invoiceId: string }
> {
  return useMutationFactory({
    mutationFn: async ({ invoiceId }) => {
      const response = await apiClient.get(
        `/stripe/invoices/${invoiceId}/download`,
        { responseType: 'blob' }
      )
      return response.data as Blob
    },
    onSuccess: (blob, { invoiceId }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      import('sonner').then(({ toast }) => toast.success('Invoice downloaded'))
    },
    errorMessage: 'Failed to download invoice'
  })
}