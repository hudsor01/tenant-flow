/**
 * React Query hooks for Billing and Subscriptions
 * Provides type-safe data fetching and mutations for Stripe integration
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult 
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys, mutationKeys } from '@/lib/react-query/query-client'
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
import { toast } from 'sonner'

/**
 * Fetch current user subscription
 * Maps to SubscriptionsController@current endpoint
 */
export function useSubscription(
  options?: { enabled?: boolean }
): UseQueryResult<UserSubscription, Error> {
  return useQuery({
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
  return useQuery({
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
  return useQuery({
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
  const _queryClient = useQueryClient() // TODO: Use for cache invalidation if needed

  return useMutation({
    mutationKey: mutationKeys.createCheckoutSession,
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
    onError: (error) => {
      toast.error(error.message || 'Failed to create checkout session')
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.cancelSubscription,
    mutationFn: async ({ subscriptionId, reason }) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/stripe/subscriptions/${subscriptionId}/cancel`,
        { reason }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Subscription cancelled successfully')
      // Invalidate subscription data
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.subscription() 
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel subscription')
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SubscriptionUpdateParams) => {
      const response = await apiClient.put<UserSubscription>(
        '/stripe/subscription',
        createMutationAdapter(data)
      )
      return response.data
    },
    onMutate: async (_data) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.subscription() 
      })

      // Snapshot previous value
      const previousSubscription = queryClient.getQueryData<UserSubscription>(
        queryKeys.subscription()
      )

      // Optimistically update status only
      // Note: We don't update planType here as it requires mapping from priceId to planType
      // which should be handled by the server response
      if (previousSubscription) {
        queryClient.setQueryData<UserSubscription>(
          queryKeys.subscription(),
          {
            ...previousSubscription,
            status: 'updating' as SubscriptionStatus
          }
        )
      }

      return { previousSubscription }
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousSubscription) {
        queryClient.setQueryData(
          queryKeys.subscription(),
          context.previousSubscription
        )
      }
      toast.error('Failed to update subscription')
    },
    onSuccess: () => {
      toast.success('Subscription updated successfully')
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.subscription() 
      })
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updatePaymentMethod,
    mutationFn: async ({ paymentMethodId, setAsDefault = true }) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/billing/payment-methods/update',
        { paymentMethodId, setAsDefault }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Payment method updated successfully')
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.paymentMethods() 
      })
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.subscription() 
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update payment method')
    },
  })
}

/**
 * Fetch available pricing plans
 * Maps to SubscriptionsController@plans endpoint
 */
export function usePricingPlans(
  options?: { enabled?: boolean }
): UseQueryResult<Plan[], Error> {
  return useQuery({
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
  return useMutation({
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
    onError: (error) => {
      toast.error(error.message || 'Failed to open billing portal')
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId }) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/stripe/invoices/${invoiceId}/retry`
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Payment retry initiated')
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.invoices() 
      })
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.subscription() 
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to retry payment')
    },
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
  return useMutation({
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
      toast.success('Invoice downloaded')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to download invoice')
    },
  })
}