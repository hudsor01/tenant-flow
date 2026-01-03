/**
 * Payments Hooks
 * TanStack Query hooks for all payment-related functionality
 *
 * Includes:
 * - Rent collection (analytics, upcoming/overdue, manual payments, CSV export)
 * - Rent payments (creation, status, history)
 * - Payment methods (list, set default, delete)
 * - Payment verification (Stripe session verification)
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient,
	usePrefetchQuery,
	type QueryKey
} from '@tanstack/react-query'
import { apiRequest, apiRequestRaw } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mutationKeys } from './mutation-keys'
import { incrementVersion } from '@repo/shared/utils/optimistic-locking'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { RentPayment } from '@repo/shared/types/core'
import type {
	PaymentMethodResponse,
	PaymentMethodResponseWithVersion,
	StripeSessionStatusResponse
} from '@repo/shared/types/core'
import type {
	TenantPaymentStatusResponse,
	SendPaymentReminderRequest,
	SendPaymentReminderResponse,
	TenantPaymentHistoryResponse
} from '@repo/shared/types/api-contracts'
import type {
	PaymentAnalytics,
	UpcomingPayment,
	OverduePayment,
	PaymentFilters,
	ManualPaymentInput
} from '@repo/shared/types/sections/payments'
import type { SubscriptionData } from '#types/stripe'

const logger = createLogger({ component: 'Payments' })

// ============================================================================
// TYPES
// ============================================================================

interface PaymentQueryOptions {
	limit?: number
	enabled?: boolean
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Rent collection query keys for cache management
 */
export const rentCollectionKeys = {
	all: ['rent-collection'] as const,
	analytics: () => [...rentCollectionKeys.all, 'analytics'] as const,
	upcoming: () => [...rentCollectionKeys.all, 'upcoming'] as const,
	overdue: () => [...rentCollectionKeys.all, 'overdue'] as const,
	list: (filters?: PaymentFilters) =>
		[...rentCollectionKeys.all, 'list', filters] as const,
	detail: (id: string) => [...rentCollectionKeys.all, 'detail', id] as const
}

/**
 * Rent payment query keys
 */
export const rentPaymentKeys = {
	all: ['rent-payments'] as const,
	list: () => [...rentPaymentKeys.all, 'list'] as const,
	status: (tenant_id: string) =>
		[...rentPaymentKeys.all, 'status', tenant_id] as const,
	tenantHistory: () => [...rentPaymentKeys.all, 'tenant-history'] as const,
	ownerView: (tenant_id: string, limit?: number) =>
		[
			...rentPaymentKeys.all,
			'tenant-history',
			'owner',
			tenant_id,
			limit ?? 20
		] as const,
	selfView: (limit?: number) =>
		[...rentPaymentKeys.all, 'tenant-history', 'self', limit ?? 20] as const
}

/**
 * Payment method query keys
 */
export const paymentMethodKeys = {
	all: ['paymentMethods'] as const,
	list: () => [...paymentMethodKeys.all, 'list'] as const
}

/**
 * Payment verification query keys
 */
export const paymentVerificationKeys = {
	verifySession: (sessionId: string) =>
		['payment', 'verify', sessionId] as const,
	sessionStatus: (sessionId: string) =>
		['payment', 'status', sessionId] as const
}

// ============================================================================
// QUERY OPTIONS (for direct use with useQueries/prefetch)
// ============================================================================

/**
 * Rent collection query factory
 */
export const rentCollectionQueries = {
	all: () => ['rent-collection'] as const,

	analytics: () =>
		queryOptions({
			queryKey: rentCollectionKeys.analytics(),
			queryFn: async (): Promise<PaymentAnalytics> => {
				const response = await apiRequest<{
					success: boolean
					analytics: PaymentAnalytics
				}>('/api/v1/rent-payments/analytics')
				return response.analytics
			},
			staleTime: 60 * 1000
		}),

	upcoming: () =>
		queryOptions({
			queryKey: rentCollectionKeys.upcoming(),
			queryFn: async (): Promise<UpcomingPayment[]> => {
				const response = await apiRequest<{
					success: boolean
					payments: UpcomingPayment[]
				}>('/api/v1/rent-payments/upcoming')
				return response.payments
			},
			staleTime: 60 * 1000
		}),

	overdue: () =>
		queryOptions({
			queryKey: rentCollectionKeys.overdue(),
			queryFn: async (): Promise<OverduePayment[]> => {
				const response = await apiRequest<{
					success: boolean
					payments: OverduePayment[]
				}>('/api/v1/rent-payments/overdue')
				return response.payments
			},
			staleTime: 30 * 1000
		})
}

/**
 * Tenant payment query factory
 */
export const tenantPaymentQueries = {
	ownerPayments: (tenant_id: string, options?: PaymentQueryOptions) =>
		queryOptions({
			queryKey: rentPaymentKeys.ownerView(tenant_id, options?.limit),
			queryFn: () =>
				apiRequest<TenantPaymentHistoryResponse>(
					`/api/v1/tenants//payments?limit=${options?.limit ?? 20}`
				),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: options?.enabled ?? Boolean(tenant_id)
		}),
	selfPayments: (options?: PaymentQueryOptions) =>
		queryOptions({
			queryKey: rentPaymentKeys.selfView(options?.limit),
			queryFn: () =>
				apiRequest<TenantPaymentHistoryResponse>(
					`/api/v1/tenants/me/payments?limit=${options?.limit ?? 20}`
				),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: options?.enabled ?? true
		})
}

/**
 * Payment verification query factory
 */
export const paymentVerificationQueries = {
	sessionStatus: (sessionId: string) =>
		queryOptions({
			queryKey: paymentVerificationKeys.sessionStatus(sessionId),
			queryFn: ({ signal }) =>
				apiRequest<StripeSessionStatusResponse>(
					`/stripe/session-status?session_id=${sessionId}`,
					{ signal }
				),
			...QUERY_CACHE_TIMES.STATS,
			enabled: !!sessionId
		})
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Export payments as CSV
 */
export async function exportPaymentsCSV(
	filters?: PaymentFilters
): Promise<Blob> {
	const params = new URLSearchParams()
	if (filters?.status) params.append('status', filters.status)
	if (filters?.startDate) params.append('startDate', filters.startDate)
	if (filters?.endDate) params.append('endDate', filters.endDate)

	const queryString = params.toString()
	const url = `/api/v1/rent-payments/export${queryString ? `?${queryString}` : ''}`

	const response = await apiRequestRaw(url)
	return response.blob()
}

/**
 * Record a manual payment
 */
export async function recordManualPayment(
	data: ManualPaymentInput
): Promise<{ success: boolean; payment: unknown }> {
	return apiRequest<{ success: boolean; payment: unknown }>(
		'/api/v1/rent-payments/manual',
		{
			method: 'POST',
			body: JSON.stringify(data)
		}
	)
}

// ============================================================================
// RENT COLLECTION HOOKS
// ============================================================================

/**
 * Get payment analytics
 */
export function usePaymentAnalytics() {
	return useQuery(rentCollectionQueries.analytics())
}

/**
 * Get upcoming payments
 */
export function useUpcomingPayments() {
	return useQuery(rentCollectionQueries.upcoming())
}

/**
 * Get overdue payments
 */
export function useOverduePayments() {
	return useQuery(rentCollectionQueries.overdue())
}

/**
 * Record a manual payment
 */
export function useRecordManualPaymentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentCollection.recordManual,
		mutationFn: (data: ManualPaymentInput) => recordManualPayment(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rentCollectionKeys.all })
		}
	})
}

/**
 * Export payments as CSV
 */
export function useExportPaymentsMutation() {
	return useMutation({
		mutationKey: mutationKeys.rentCollection.exportCsv,
		mutationFn: async (filters?: PaymentFilters) => {
			const blob = await exportPaymentsCSV(filters)

			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			return blob
		}
	})
}

// ============================================================================
// RENT PAYMENT HOOKS
// ============================================================================

/**
 * Create a one-time rent payment
 * Uses saved payment method to charge tenant immediately
 */
export function useCreateRentPaymentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentPayments.process,
		mutationFn: async (params: {
			tenant_id: string
			lease_id: string
			amount: number
			paymentMethodId: string
		}) => {
			const response = await apiRequest<{
				success: boolean
				payment: {
					id: string
					amount: number
					status: string
					stripePaymentIntentId: string
				}
				paymentIntent: {
					id: string
					status: string
					receiptUrl?: string
				}
			}>('/api/v1/rent-payments', {
				method: 'POST',
				body: JSON.stringify(params)
			})

			return {
				...response,
				paymentIntent: {
					...response.paymentIntent,
					receiptUrl: response.paymentIntent.receiptUrl
				}
			}
		},
		onMutate: async newPayment => {
			await queryClient.cancelQueries({ queryKey: rentPaymentKeys.list() })

			const previousList = queryClient.getQueryData<RentPayment[] | undefined>(
				rentPaymentKeys.list()
			)

			const tempId = `temp-${Date.now()}`
			const today = new Date().toISOString().split('T')[0] ?? ''
			const optimisticPayment: RentPayment = {
				id: tempId,
				amount: newPayment.amount,
				status: 'pending',
				tenant_id: newPayment.tenant_id,
				lease_id: newPayment.lease_id,
				stripe_payment_intent_id: '',
				application_fee_amount: 0,
				late_fee_amount: null,
				payment_method_type: 'stripe',
				period_start: today,
				period_end: today,
				due_date: today,
				paid_date: null,
				currency: 'USD',
				notes: null,
				created_at: new Date().toISOString(),
				updated_at: null
			}

			queryClient.setQueryData<RentPayment[] | undefined>(
				rentPaymentKeys.list(),
				old => (old ? [optimisticPayment, ...old] : [optimisticPayment])
			)

			return { previousList, tempId }
		},
		onError: (_err, _variables, context) => {
			if (context?.previousList) {
				queryClient.setQueryData(rentPaymentKeys.list(), context.previousList)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: rentPaymentKeys.list() })
		}
	})
}

/**
 * Get current payment status for a tenant
 */
export function usePaymentStatus(tenant_id: string) {
	return useQuery({
		queryKey: rentPaymentKeys.status(tenant_id),
		queryFn: () =>
			apiRequest<TenantPaymentStatusResponse>(
				`/api/v1/rent-payments/status/${tenant_id}`
			),
		enabled: !!tenant_id,
		...QUERY_CACHE_TIMES.STATS
	})
}

/**
 * Get tenant payment history from owner perspective
 */
export function useOwnerTenantPayments(
	tenant_id: string,
	options?: PaymentQueryOptions
) {
	return useQuery({
		queryKey: rentPaymentKeys.ownerView(tenant_id, options?.limit),
		queryFn: () =>
			apiRequest<TenantPaymentHistoryResponse>(
				`/api/v1/tenants//payments?limit=${options?.limit ?? 20}`
			),
		...QUERY_CACHE_TIMES.DETAIL,
		enabled: options?.enabled ?? Boolean(tenant_id)
	})
}

/**
 * Get tenant's own payment history
 */
export function useTenantPaymentsHistory(options?: PaymentQueryOptions) {
	return useQuery({
		queryKey: rentPaymentKeys.selfView(options?.limit),
		queryFn: () =>
			apiRequest<TenantPaymentHistoryResponse>(
				`/api/v1/tenants/me/payments?limit=${options?.limit ?? 20}`
			),
		...QUERY_CACHE_TIMES.DETAIL,
		enabled: options?.enabled ?? true
	})
}

type SendReminderVariables = {
	request: SendPaymentReminderRequest
	ownerQueryKey?: QueryKey
}

/**
 * Send payment reminder to tenant
 */
export function useSendTenantPaymentReminderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentPayments.sendReminder,
		mutationFn: async ({ request }: SendReminderVariables) => {
			return apiRequest<SendPaymentReminderResponse>(
				'/api/v1/tenants/payments/reminders',
				{
					method: 'POST',
					body: JSON.stringify(request)
				}
			)
		},
		onSuccess: (_data, variables) => {
			if (variables?.ownerQueryKey) {
				queryClient.invalidateQueries({
					queryKey: variables.ownerQueryKey
				})
			} else if (variables?.request.tenant_id) {
				queryClient.invalidateQueries({
					queryKey: rentPaymentKeys.ownerView(variables.request.tenant_id)
				})
			}
		}
	})
}

// ============================================================================
// PAYMENT METHOD HOOKS
// ============================================================================

/**
 * Fetch tenant payment methods
 */
export function usePaymentMethods() {
	return useQuery({
		queryKey: paymentMethodKeys.list(),
		queryFn: async (): Promise<PaymentMethodResponse[]> => {
			const response = await apiRequest<{
				payment_methods: PaymentMethodResponse[]
			}>('/api/v1/stripe/tenant-payment-methods')
			return response.payment_methods
		},
		...QUERY_CACHE_TIMES.DETAIL
	})
}

/**
 * Set default payment method
 */
export function useSetDefaultPaymentMethodMutation() {
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean },
		unknown,
		string,
		{ previous?: PaymentMethodResponse[] }
	>({
		mutationFn: async (
			paymentMethodId: string
		): Promise<{ success: boolean }> => {
			return apiRequest<{ success: boolean }>(
				`/api/v1/payment-methods/${paymentMethodId}/default`,
				{
					method: 'PATCH'
				}
			)
		},
		onMutate: async (
			paymentMethodId: string
		): Promise<{
			previous?: PaymentMethodResponse[]
		}> => {
			await queryClient.cancelQueries({ queryKey: paymentMethodKeys.list() })
			const previous = queryClient.getQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list()
			)
			queryClient.setQueryData<PaymentMethodResponseWithVersion[]>(
				paymentMethodKeys.list(),
				(old: PaymentMethodResponseWithVersion[] | undefined) =>
					old
						? old.map((m: PaymentMethodResponseWithVersion) =>
								incrementVersion(m, {
									isDefault: m.id === paymentMethodId
								})
							)
						: old
			)
			return previous ? { previous } : {}
		},
		onError: (
			_err: unknown,
			_paymentMethodId: string,
			context?: {
				previous?: PaymentMethodResponse[]
			}
		) => {
			if (context?.previous) {
				queryClient.setQueryData(paymentMethodKeys.list(), context.previous)
			}
		}
	})
}

/**
 * Delete tenant payment method
 */
export function useDeletePaymentMethodMutation() {
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean; message?: string },
		unknown,
		string,
		{ previous?: PaymentMethodResponse[] }
	>({
		mutationFn: async (
			paymentMethodId: string
		): Promise<{
			success: boolean
			message?: string
		}> => {
			return apiRequest<{
				success: boolean
				message?: string
			}>(`/api/v1/stripe/tenant-payment-methods/${paymentMethodId}`, {
				method: 'DELETE'
			})
		},
		onMutate: async (
			paymentMethodId: string
		): Promise<{
			previous?: PaymentMethodResponse[]
		}> => {
			await queryClient.cancelQueries({ queryKey: paymentMethodKeys.list() })
			const previous = queryClient.getQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list()
			)
			queryClient.setQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list(),
				(old: PaymentMethodResponse[] | undefined) =>
					old
						? old.filter((m: PaymentMethodResponse) => m.id !== paymentMethodId)
						: old
			)
			return previous ? { previous } : {}
		},
		onError: (
			_err: unknown,
			_paymentMethodId: string,
			context?: {
				previous?: PaymentMethodResponse[]
			}
		) => {
			if (context?.previous) {
				queryClient.setQueryData(paymentMethodKeys.list(), context.previous)
			}
		}
	})
}

// ============================================================================
// PAYMENT VERIFICATION HOOKS
// ============================================================================

/**
 * Verify payment session with TanStack Query
 */
export function usePaymentVerification(
	sessionId: string | null,
	options: { throwOnError?: boolean } = {}
) {
	return useQuery({
		queryKey: paymentVerificationKeys.verifySession(sessionId || ''),
		queryFn: async (): Promise<{ subscription: SubscriptionData }> => {
			if (!sessionId) {
				throw new Error('No session ID provided')
			}

			let data
			try {
				const response = await apiRequest<{
					session: unknown
					subscription: {
						id: string
						status: string
						current_period_start: number | null
						current_period_end: number | null
						cancelAt_period_end: boolean
						items: Array<{
							price: {
								nickname: string | null
								product: {
									name: string
								}
							}
						}>
					} | null
				}>('/stripe/verify-checkout-session', {
					method: 'POST',
					body: JSON.stringify({ sessionId })
				})

				if (!response.subscription) {
					throw new Error('No subscription found in response')
				}

				const sub = response.subscription
				const planName =
					sub.items[0]?.price?.nickname ||
					sub.items[0]?.price?.product?.name ||
					'Unknown Plan'

				data = {
					subscription: {
						status: sub.status as SubscriptionData['status'],
						planName,
						currentPeriodEnd: sub.current_period_end
							? new Date(sub.current_period_end * 1000).toISOString()
							: '',
						cancelAtPeriodEnd: sub.cancelAt_period_end
					}
				}
			} catch (error) {
				logger.error('Payment verification failed', {
					action: 'payment_verification_failed',
					metadata: {
						sessionId,
						error: error instanceof Error ? error.message : String(error)
					}
				})
				throw error
			}

			logger.info('Payment verification successful', {
				action: 'payment_verification_success',
				metadata: {
					sessionId,
					planName: data.subscription?.planName
				}
			})

			return data
		},
		enabled: !!sessionId,
		...QUERY_CACHE_TIMES.SECURITY,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		throwOnError: options.throwOnError ?? false
	})
}

/**
 * Get session status with TanStack Query
 */
export function useSessionStatus(
	sessionId: string | null,
	options: { throwOnError?: boolean } = {}
) {
	return useQuery({
		queryKey: paymentVerificationKeys.sessionStatus(sessionId || ''),
		queryFn: async (): Promise<StripeSessionStatusResponse> => {
			if (!sessionId) {
				throw new Error('No session ID provided')
			}

			const data = await apiRequest<StripeSessionStatusResponse>(
				`/stripe/session-status?session_id=${sessionId}`
			)

			logger.info('Session status retrieved', {
				action: 'session_status_retrieved',
				metadata: {
					sessionId,
					status: data.status,
					paymentStatus: data.payment_status
				}
			})

			return data
		},
		enabled: !!sessionId,
		...QUERY_CACHE_TIMES.STATS,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		throwOnError: options.throwOnError ?? false
	})
}

/**
 * Declarative prefetch hook for session status
 */
export function usePrefetchSessionStatus(sessionId: string) {
	usePrefetchQuery(paymentVerificationQueries.sessionStatus(sessionId))
}

// Legacy key exports for backwards compatibility
export const paymentQueryKeys = paymentVerificationKeys
