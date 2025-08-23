import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PlanType } from '@repo/shared'
import type {
	Subscription,
	StripeSubscription
} from '@repo/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

interface SubscriptionManagementResult {
	success: boolean
	subscription?: Subscription
	stripeSubscription?: StripeSubscription
	checkoutUrl?: string
	error?: string
	changes: string[]
	metadata: {
		operation: string
		fromPlan?: PlanType
		toPlan?: PlanType
		correlationId: string
		timestamp: string
	}
}

interface _PlanChangePreview {
	currentPlan: PlanType
	targetPlan: PlanType
	priceChange: number
	billingCycle: 'monthly' | 'annual'
	proratedAmount?: number
	nextBillingDate: string
	features: {
		added: string[]
		removed: string[]
	}
}

interface UpgradeRequest extends Record<string, unknown> {
	targetPlan: PlanType
	billingCycle: 'monthly' | 'annual'
	prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

interface DowngradeRequest extends Record<string, unknown> {
	targetPlan: PlanType
	billingCycle: 'monthly' | 'annual'
	effectiveDate?: 'immediate' | 'end_of_period'
	reason?: string
}

interface CancelRequest extends Record<string, unknown> {
	cancelAt: 'immediate' | 'end_of_period'
	reason?: string
	feedback?: string
}

interface CheckoutRequest extends Record<string, unknown> {
	planType: PlanType
	billingCycle: 'monthly' | 'annual'
	successUrl: string
	cancelUrl: string
}

interface SubscriptionManagementHook {
	// Actions
	upgradePlan: (
		request: UpgradeRequest
	) => Promise<SubscriptionManagementResult>
	downgradePlan: (
		request: DowngradeRequest
	) => Promise<SubscriptionManagementResult>
	cancelSubscription: (
		request: CancelRequest
	) => Promise<SubscriptionManagementResult>
	createCheckout: (
		request: CheckoutRequest
	) => Promise<SubscriptionManagementResult>
	reactivateSubscription: () => Promise<SubscriptionManagementResult>
	previewPlanChange: (
		targetPlan: PlanType,
		billingCycle: 'monthly' | 'annual'
	) => Promise<unknown>

	// State
	isUpgrading: boolean
	isDowngrading: boolean
	isCanceling: boolean
	isCreatingCheckout: boolean
	isReactivating: boolean
	isPreviewing: boolean

	// Errors
	upgradeError: Error | null
	downgradeError: Error | null
	cancelError: Error | null
	checkoutError: Error | null
	reactivateError: Error | null
	previewError: Error | null

	// Last operation result
	lastResult: SubscriptionManagementResult | null
}

/**
 * Hook for managing subscription plan changes
 *
 * Features:
 * - Subscription upgrades with immediate effect
 * - Subscription downgrades (immediate or end-of-period)
 * - Subscription cancellation with retention options
 * - Checkout session creation for new subscriptions
 * - Plan change previews
 * - Subscription reactivation
 * - Comprehensive error handling
 * - Cache invalidation after changes
 */
export function useSubscriptionManagement(
	userId: string
): SubscriptionManagementHook {
	const queryClient = useQueryClient()
	const [lastResult, setLastResult] =
		useState<SubscriptionManagementResult | null>(null)

	// Upgrade mutation
	const upgradeMutation = useMutation({
		mutationFn: async (
			request: UpgradeRequest
		): Promise<SubscriptionManagementResult> => {
			return apiClient.post(`/subscriptions/upgrade/${userId}`, request)
		},
		onSuccess: result => {
			setLastResult(result)
			if (result.success) {
				// Invalidate subscription-related queries
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.user(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.usage(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.syncState(userId)
				})
			}
		},
		onError: error => {
			console.error('Subscription upgrade failed:', error)
		}
	})

	// Downgrade mutation
	const downgradeMutation = useMutation({
		mutationFn: async (
			request: DowngradeRequest
		): Promise<SubscriptionManagementResult> => {
			return apiClient.post(`/subscriptions/downgrade/${userId}`, request)
		},
		onSuccess: result => {
			setLastResult(result)
			if (result.success) {
				// Invalidate subscription-related queries
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.user(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.usage(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.syncState(userId)
				})
			}
		},
		onError: error => {
			console.error('Subscription downgrade failed:', error)
		}
	})

	// Cancel mutation
	const cancelMutation = useMutation({
		mutationFn: async (
			request: CancelRequest
		): Promise<SubscriptionManagementResult> => {
			return apiClient.post(`/subscriptions/cancel/${userId}`, request)
		},
		onSuccess: result => {
			setLastResult(result)
			if (result.success) {
				// Invalidate subscription-related queries
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.user(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.usage(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.syncState(userId)
				})
			}
		},
		onError: error => {
			console.error('Subscription cancellation failed:', error)
		}
	})

	// Checkout mutation
	const checkoutMutation = useMutation({
		mutationFn: async (
			request: CheckoutRequest
		): Promise<SubscriptionManagementResult> => {
			return apiClient.post(`/subscriptions/checkout/${userId}`, request)
		},
		onSuccess: result => {
			setLastResult(result)
			if (result.success && result.checkoutUrl) {
				// Redirect to Stripe checkout
				window.location.href = result.checkoutUrl
			}
		},
		onError: error => {
			console.error('Checkout session creation failed:', error)
		}
	})

	// Reactivate mutation
	const reactivateMutation = useMutation({
		mutationFn: async (): Promise<SubscriptionManagementResult> => {
			return apiClient.post(`/subscriptions/reactivate/${userId}`)
		},
		onSuccess: result => {
			setLastResult(result)
			if (result.success) {
				// Invalidate subscription-related queries
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.user(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.usage(userId)
				})
				queryClient.invalidateQueries({
					queryKey: queryKeys.subscriptions.syncState(userId)
				})
			}
		},
		onError: error => {
			console.error('Subscription reactivation failed:', error)
		}
	})

	// Preview mutation
	const previewMutation = useMutation({
		mutationFn: async ({
			targetPlan,
			billingCycle
		}: {
			targetPlan: PlanType
			billingCycle: 'monthly' | 'annual'
		}) => {
			return apiClient.post(`/subscriptions/preview/${userId}`, {
				targetPlan,
				billingCycle
			})
		},
		onError: error => {
			console.error('Plan change preview failed:', error)
		}
	})

	// Action callbacks
	const upgradePlan = useCallback(
		async (
			request: UpgradeRequest
		): Promise<SubscriptionManagementResult> => {
			return upgradeMutation.mutateAsync(request)
		},
		[upgradeMutation]
	)

	const downgradePlan = useCallback(
		async (
			request: DowngradeRequest
		): Promise<SubscriptionManagementResult> => {
			return downgradeMutation.mutateAsync(request)
		},
		[downgradeMutation]
	)

	const cancelSubscription = useCallback(
		async (
			request: CancelRequest
		): Promise<SubscriptionManagementResult> => {
			return cancelMutation.mutateAsync(request)
		},
		[cancelMutation]
	)

	const createCheckout = useCallback(
		async (
			request: CheckoutRequest
		): Promise<SubscriptionManagementResult> => {
			return checkoutMutation.mutateAsync(request)
		},
		[checkoutMutation]
	)

	const reactivateSubscription =
		useCallback(async (): Promise<SubscriptionManagementResult> => {
			return reactivateMutation.mutateAsync()
		}, [reactivateMutation])

	const previewPlanChange = useCallback(
		async (targetPlan: PlanType, billingCycle: 'monthly' | 'annual') => {
			return previewMutation.mutateAsync({ targetPlan, billingCycle })
		},
		[previewMutation]
	)

	return {
		// Actions
		upgradePlan,
		downgradePlan,
		cancelSubscription,
		createCheckout,
		reactivateSubscription,
		previewPlanChange,

		// State
		isUpgrading: upgradeMutation.isPending,
		isDowngrading: downgradeMutation.isPending,
		isCanceling: cancelMutation.isPending,
		isCreatingCheckout: checkoutMutation.isPending,
		isReactivating: reactivateMutation.isPending,
		isPreviewing: previewMutation.isPending,

		// Errors
		upgradeError: upgradeMutation.error as Error | null,
		downgradeError: downgradeMutation.error as Error | null,
		cancelError: cancelMutation.error as Error | null,
		checkoutError: checkoutMutation.error as Error | null,
		reactivateError: reactivateMutation.error as Error | null,
		previewError: previewMutation.error as Error | null,

		// Last result
		lastResult
	}
}

/**
 * Hook for simple plan upgrades with predefined flows
 * Simplifies the upgrade process for common use cases
 */
export function useQuickPlanUpgrade(userId: string) {
	const { upgradePlan, isUpgrading, upgradeError } =
		useSubscriptionManagement(userId)

	const upgradeToStarter = useCallback(
		async (billingCycle: 'monthly' | 'annual' = 'monthly') => {
			return upgradePlan({
				targetPlan: 'STARTER',
				billingCycle,
				prorationBehavior: 'create_prorations'
			})
		},
		[upgradePlan]
	)

	const upgradeToGrowth = useCallback(
		async (billingCycle: 'monthly' | 'annual' = 'monthly') => {
			return upgradePlan({
				targetPlan: 'GROWTH',
				billingCycle,
				prorationBehavior: 'create_prorations'
			})
		},
		[upgradePlan]
	)

	const upgradeToMax = useCallback(
		async (billingCycle: 'monthly' | 'annual' = 'monthly') => {
			return upgradePlan({
				targetPlan: 'TENANTFLOW_MAX',
				billingCycle,
				prorationBehavior: 'create_prorations'
			})
		},
		[upgradePlan]
	)

	return {
		upgradeToStarter,
		upgradeToGrowth,
		upgradeToMax,
		isUpgrading,
		upgradeError
	}
}

/**
 * Hook for subscription cancellation with retention handling
 */
export function useSubscriptionCancellation(userId: string) {
	const { cancelSubscription, isCanceling, cancelError } =
		useSubscriptionManagement(userId)

	const cancelImmediately = useCallback(
		async (reason?: string, feedback?: string) => {
			return cancelSubscription({
				cancelAt: 'immediate',
				reason,
				feedback
			})
		},
		[cancelSubscription]
	)

	const cancelAtPeriodEnd = useCallback(
		async (reason?: string, feedback?: string) => {
			return cancelSubscription({
				cancelAt: 'end_of_period',
				reason,
				feedback
			})
		},
		[cancelSubscription]
	)

	return {
		cancelImmediately,
		cancelAtPeriodEnd,
		isCanceling,
		cancelError
	}
}
