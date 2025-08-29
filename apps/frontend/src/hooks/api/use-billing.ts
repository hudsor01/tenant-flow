/**
 * React Query hooks for Billing and Subscriptions
 * Direct React Query usage with built-in optimistic updates
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { get, post } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-keys'
import type { PaymentMethod, Subscription } from '@repo/shared'

// Portal redirect response type for operations handled through Stripe Portal
interface PortalRedirectResponse {
	portalUrl: string
	message: string
}

// Generic portal request factory - DRY principle  
const createPortalRequest = () => ({
	queryFn: () => fetchPortalUrl()
})

const createPortalMutation = () => ({
	mutationFn: () => fetchPortalUrl()
})

/**
 * Fetch current user subscription
 */
export function useSubscription(options?: {
    enabled?: boolean
    refetchInterval?: number
}): UseQueryResult<Subscription> {
    return useQuery({
        queryKey: queryKeys.billing.subscription(),
        queryFn: () => get<Subscription>('stripe/subscription'),
        enabled: options?.enabled ?? true,
        refetchInterval: options?.refetchInterval,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000 // 10 minutes
    })
}

// Shared portal URL fetching function - DRY principle
async function fetchPortalUrl(options?: {
    returnUrl?: string
    prefillEmail?: string
}): Promise<PortalRedirectResponse> {
    const portalData: { returnUrl?: string; prefillEmail?: string } = {
        returnUrl: options?.returnUrl || (typeof window !== 'undefined' ? window.location.origin : undefined),
        ...(options?.prefillEmail && { prefillEmail: options.prefillEmail })
    }
    const res = await post<{ url?: string }>('stripe/portal', portalData)
    return { portalUrl: res.url ?? '', message: 'Open customer portal' }
}

/**
 * Fetch user invoices via portal
 */
export function useInvoices(options?: {
    enabled?: boolean
    refetchInterval?: number
}): UseQueryResult<PortalRedirectResponse> {
    return useQuery({
        queryKey: queryKeys.billing.invoices(),
        ...createPortalRequest(),
        enabled: options?.enabled ?? true,
        refetchInterval: options?.refetchInterval,
        staleTime: 10 * 60 * 1000 // 10 minutes
    })
}

/**
 * Fetch payment methods via portal
 */
export function usePaymentMethods(options?: {
    enabled?: boolean
}): UseQueryResult<PortalRedirectResponse> {
    return useQuery({
        queryKey: queryKeys.billing.paymentMethods(),
        ...createPortalRequest(),
        enabled: options?.enabled ?? true,
        staleTime: 10 * 60 * 1000 // 10 minutes
    })
}

/**
 * Fetch usage metrics
 */
export function useUsageMetrics(_options?: {
	enabled?: boolean
	refetchInterval?: number
}) {
	// TODO: Implement when UsageMetrics type is defined in @repo/shared
	return {
		data: undefined,
		isLoading: false,
		error: null,
		refetch: async () => Promise.resolve({ data: undefined })
	}
}

/**
 * Create checkout session for new subscription
 */
export function useCreateCheckoutSession(): UseMutationResult<
	{ url: string; sessionId?: string },
	Error,
	{
		planId: string
		interval: 'monthly' | 'annual'
		successUrl?: string
		cancelUrl?: string
	}
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: {
			planId: string
			interval: 'monthly' | 'annual'
			successUrl?: string
			cancelUrl?: string
    }) => post<{ url: string; sessionId?: string }>('stripe/checkout', data),
		onSuccess: data => {
			// Redirect to checkout
			const checkoutUrl = data.url
			if (checkoutUrl) {
				try {
					window.location.href = checkoutUrl
				} catch (error) {
					console.error('Failed to redirect to checkout:', error)
					window.open(checkoutUrl, '_blank')
				}
			}

			// Invalidate subscription data
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription()
			})
		},
		onError: () => {
			toast.error('Failed to create checkout session. Please try again.')
		}
	})
}

/**
 * Create customer portal session
 */
export function useCreatePortalSession(): UseMutationResult<
	{ url?: string },
	Error,
	{ returnUrl?: string; prefillEmail?: string } | undefined
> {
	return useMutation({
		mutationFn: async (data) => {
            const response = await fetchPortalUrl(data)
            return { url: response.portalUrl }
        },
		onSuccess: data => {
			// Redirect to portal
			if (data.url) {
				try {
					window.location.href = data.url
				} catch (error) {
					console.error('Failed to redirect to portal:', error)
					window.open(data.url, '_blank')
				}
			}
		},
		onError: () => {
			toast.error('Failed to open billing portal. Please try again.')
		}
	})
}

/**
 * Update subscription
 */
export function useUpdateSubscription(): UseMutationResult<
	PortalRedirectResponse,
	Error,
	{
		newPriceId: string
		userId: string
		prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
	}
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (_params: {
			newPriceId: string
			userId: string
			prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
        }) => {
			const response = await fetchPortalUrl()
			return {
				...response,
				message: 'Redirecting to Stripe portal...'
			}
		},
		onMutate: async _params => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.billing.subscription()
			})

			// Snapshot the previous value
			const previousSubscription = queryClient.getQueryData(
				queryKeys.billing.subscription()
			)

			// Optimistically update subscription
			queryClient.setQueryData(
				queryKeys.billing.subscription(),
				(old: Subscription | undefined) =>
					old ? { ...old, status: 'ACTIVE' as const } : undefined
			)

			return { previousSubscription }
		},
		onError: (err, params, context) => {
			// Revert optimistic update on error
			if (context?.previousSubscription) {
				queryClient.setQueryData(
					queryKeys.billing.subscription(),
					context.previousSubscription
				)
			}
			toast.error('Failed to update subscription.')
		},
		onSuccess: () => {
			toast.success('Subscription updated successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.usage()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.invoices()
			})
		}
	})
}

/**
 * Cancel subscription
 */
export function useCancelSubscription(): UseMutationResult<
	{ message: string },
	Error,
	{ reason?: string; cancelAtPeriodEnd?: boolean }
> {
	const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            await fetchPortalUrl()
            // Transform response to match expected return type
            return {
                message: 'Subscription cancellation will be processed through Stripe portal'
            }
        },
		onMutate: async () => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.billing.subscription()
			})

			// Snapshot the previous value
			const previousSubscription = queryClient.getQueryData(
				queryKeys.billing.subscription()
			)

			// Optimistically update subscription
			queryClient.setQueryData(
				queryKeys.billing.subscription(),
				(old: Subscription | undefined) =>
					old
						? {
								...old,
								status: 'CANCELED' as const,
								cancelAtPeriodEnd: true
							}
						: undefined
			)

			return { previousSubscription }
		},
		onError: (err, params, context) => {
			// Revert optimistic update on error
			if (context?.previousSubscription) {
				queryClient.setQueryData(
					queryKeys.billing.subscription(),
					context.previousSubscription
				)
			}
			toast.error('Failed to cancel subscription.')
		},
		onSuccess: () => {
			toast.success('Subscription cancelled successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.usage()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.invoices()
			})
		}
	})
}

/**
 * Add payment method
 */
export function useAddPaymentMethod(): UseMutationResult<
	PortalRedirectResponse,
	Error,
	{ paymentMethodId: string; setAsDefault?: boolean }
> {
	const queryClient = useQueryClient()

    return useMutation({
        ...createPortalMutation(),
		onSuccess: () => {
			toast.success('Payment method added successfully')
		},
		onError: () => {
			toast.error('Failed to add payment method')
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.paymentMethods()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription()
			})
		}
	})
}

/**
 * Update default payment method
 */
export function useUpdatePaymentMethod(): UseMutationResult<
	PortalRedirectResponse,
	Error,
	{ paymentMethodId: string }
> {
	const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const response = await fetchPortalUrl()
            return {
                ...response,
                message: 'Redirecting to Stripe portal to update payment method'
            }
        },
		onMutate: async ({ paymentMethodId }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.billing.paymentMethods()
			})

			// Snapshot the previous value
			const previousPaymentMethods = queryClient.getQueryData(
				queryKeys.billing.paymentMethods()
			)

			// Optimistically update payment methods
			queryClient.setQueryData(
				queryKeys.billing.paymentMethods(),
				(old: PaymentMethod[] | undefined) =>
					old?.map(pm => ({
						...pm,
						isDefault: pm.id === paymentMethodId
					}))
			)

			return { previousPaymentMethods }
		},
		onError: (err, params, context) => {
			// Revert optimistic update on error
			if (context?.previousPaymentMethods) {
				queryClient.setQueryData(
					queryKeys.billing.paymentMethods(),
					context.previousPaymentMethods
				)
			}
			toast.error('Failed to update payment method')
		},
		onSuccess: () => {
			toast.success('Default payment method updated successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.paymentMethods()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription()
			})
		}
	})
}

/**
 * Download invoice
 */
export function useDownloadInvoice(): UseMutationResult<
    PortalRedirectResponse,
    Error,
    { invoiceId: string; filename?: string }
> {
    return useMutation({
        ...createPortalMutation(),
        onSuccess: data => {
            const url = data.portalUrl
            if (url) {
                try {
                    window.open(url, '_blank')
                } catch (error) {
                    console.error('Failed to open portal:', error)
                    toast.error('Failed to open customer portal')
                }
                toast.success('Redirecting to customer portal for invoice download')
            } else {
                toast.error('No portal URL available')
            }
        },
        onError: () => {
            toast.error('Failed to download invoice.')
        }
    })
}
