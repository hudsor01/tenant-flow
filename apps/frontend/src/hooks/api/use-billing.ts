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
import { billingApi, billingKeys } from '@/lib/api/billing'
import type { PaymentMethod, Subscription } from '@repo/shared'

// Portal redirect response type for operations handled through Stripe Portal
interface PortalRedirectResponse {
	portalUrl: string
	message: string
}

/**
 * Fetch current user subscription
 */
export function useSubscription(options?: {
	enabled?: boolean
	refetchInterval?: number
}): UseQueryResult<Subscription> {
	return useQuery({
		queryKey: billingKeys.subscription(),
		queryFn: billingApi.getSubscription,
		enabled: options?.enabled ?? true,
		refetchInterval: options?.refetchInterval,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Fetch user invoices
 */
export function useInvoices(options?: {
	enabled?: boolean
	refetchInterval?: number
}): UseQueryResult<PortalRedirectResponse> {
	return useQuery({
		queryKey: billingKeys.invoices(),
		queryFn: billingApi.getInvoices,
		enabled: options?.enabled ?? true,
		refetchInterval: options?.refetchInterval,
		staleTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Fetch payment methods
 */
export function usePaymentMethods(options?: {
	enabled?: boolean
}): UseQueryResult<PortalRedirectResponse> {
	return useQuery({
		queryKey: billingKeys.paymentMethods(),
		queryFn: billingApi.getPaymentMethods,
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
		mutationFn: billingApi.createCheckoutSession,
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
				queryKey: billingKeys.subscription()
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
		mutationFn: async data => {
			const portalData: { returnUrl?: string; prefillEmail?: string } = {
				returnUrl: data?.returnUrl || window.location.origin,
				...(data?.prefillEmail && { prefillEmail: data.prefillEmail })
			}
			return billingApi.createPortalSession(portalData)
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
		mutationFn: billingApi.updateSubscription,
	onMutate: async _params => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: billingKeys.subscription()
			})

			// Snapshot the previous value
			const previousSubscription = queryClient.getQueryData(
				billingKeys.subscription()
			)

			// Optimistically update subscription
			queryClient.setQueryData(
				billingKeys.subscription(),
				(old: Subscription | undefined) =>
					old ? { ...old, status: 'ACTIVE' as const } : undefined
			)

			return { previousSubscription }
		},
		onError: (err, params, context) => {
			// Revert optimistic update on error
			if (context?.previousSubscription) {
				queryClient.setQueryData(
					billingKeys.subscription(),
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
				queryKey: billingKeys.subscription()
			})
			void queryClient.invalidateQueries({ queryKey: billingKeys.usage() })
			void queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
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
			return billingApi.cancelSubscription()
		},
		onMutate: async () => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: billingKeys.subscription()
			})

			// Snapshot the previous value
			const previousSubscription = queryClient.getQueryData(
				billingKeys.subscription()
			)

			// Optimistically update subscription
			queryClient.setQueryData(
				billingKeys.subscription(),
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
					billingKeys.subscription(),
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
				queryKey: billingKeys.subscription()
			})
			void queryClient.invalidateQueries({ queryKey: billingKeys.usage() })
			void queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
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
		mutationFn: async ({ paymentMethodId }) => {
			const result = await billingApi.addPaymentMethod(paymentMethodId)

			// Note: setAsDefault is handled through the portal
			// if (setAsDefault && result.id) {
			//   await billingApi.setDefaultPaymentMethod(result.id)
			// }

			return result
		},
		onSuccess: () => {
			toast.success('Payment method added successfully')
		},
		onError: () => {
			toast.error('Failed to add payment method')
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: billingKeys.paymentMethods()
			})
			void queryClient.invalidateQueries({
				queryKey: billingKeys.subscription()
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
		mutationFn: async ({ paymentMethodId }) =>
			billingApi.setDefaultPaymentMethod(paymentMethodId),
		onMutate: async ({ paymentMethodId }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: billingKeys.paymentMethods()
			})

			// Snapshot the previous value
			const previousPaymentMethods = queryClient.getQueryData(
				billingKeys.paymentMethods()
			)

			// Optimistically update payment methods
			queryClient.setQueryData(
				billingKeys.paymentMethods(),
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
					billingKeys.paymentMethods(),
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
				queryKey: billingKeys.paymentMethods()
			})
			void queryClient.invalidateQueries({
				queryKey: billingKeys.subscription()
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
		mutationFn: async ({ invoiceId }) => billingApi.downloadInvoice(invoiceId),
	onSuccess: (data) => {
			// Redirect to portal for invoice download
			if (data.portalUrl) {
				try {
					window.open(data.portalUrl, '_blank')
				} catch (error) {
					console.error('Failed to open portal:', error)
					toast.error('Failed to open customer portal')
				}

				toast.success(
					'Redirecting to customer portal for invoice download'
				)
				} else {
					toast.error('No portal URL available')
				}
		},
		onError: () => {
			toast.error('Failed to download invoice.')
		}
	})
}
