import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type {
	Subscription,
	Invoice,
	SubscriptionCreateRequest,
	SubscriptionCreateResponse,
	CustomerPortalRequest,
	CustomerPortalResponse
} from '@/types/subscription'
import {
	PLANS,
	getPlanById,
	checkLimitExceeded,
	subscriptionKeys
} from '@/types/subscription'
import { usePostHog } from 'posthog-js/react'
import * as FacebookPixel from '@/lib/facebook-pixel'

// Get user's current subscription
export function useSubscription() {
	const { user } = useAuthStore()

	return useQuery({
		queryKey: ['subscription', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			try {
				const subscription = await apiClient.subscriptions.getCurrent()
				return subscription
			} catch (error) {
				console.warn('Subscription query error:', error)
				return null // Default to free plan on any error
			}
		},
		enabled: !!user?.id
	})
}

// Get user's current plan with limits
export function useUserPlan() {
	const { data: subscription } = useSubscription()

	return useQuery({
		queryKey: ['user-plan', subscription?.planId],
		queryFn: async () => {
			const planId = subscription?.planId || 'freeTrial'
			const plan = getPlanById(planId)

			if (!plan) {
				throw new Error('Plan not found')
			}

			return {
				...plan,
				subscription,
				isActive:
					subscription?.status === 'active' || planId === 'freeTrial',
				trialDaysRemaining: subscription?.trialEnd
					? Math.max(
							0,
							Math.ceil(
								(new Date(subscription.trialEnd).getTime() -
									Date.now()) /
									(1000 * 60 * 60 * 24)
							)
						)
					: 0
			}
		},
		enabled: true
	})
}

// Get user's usage metrics
export function useUsageMetrics() {
	const { user } = useAuthStore()
	const { data: userPlan } = useUserPlan()

	return useQuery({
		queryKey: ['usage-metrics', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Get current month usage
			const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

			// Get counts from backend API
			const [
				propertiesResult,
				tenantsResult,
				leasesResult,
				leaseGenResult
			] = await Promise.allSettled([
				apiClient.properties
					.getAll()
					.then(data => ({ count: data.length })),
				apiClient.tenants
					.getAll()
					.then(data => ({ count: data.length })),
				apiClient.leases
					.getAll()
					.then(data => ({ count: data.length })),
				// Lease generator usage - placeholder until implemented
				Promise.resolve({ count: 0 })
			])

			// Calculate storage usage from documents (handle errors gracefully)
			const storageUsed = 0
			// Storage calculation placeholder - will be implemented when documents API is available

			// Convert bytes to MB for display
			const storageUsedMB =
				Math.round((storageUsed / (1024 * 1024)) * 100) / 100

			const usage = {
				propertiesCount:
					propertiesResult.status === 'fulfilled'
						? propertiesResult.value.count || 0
						: 0,
				tenantsCount:
					tenantsResult.status === 'fulfilled'
						? tenantsResult.value.count || 0
						: 0,
				leasesCount:
					leasesResult.status === 'fulfilled'
						? leasesResult.value.count || 0
						: 0,
				storageUsed: storageUsedMB,
				apiCallsCount: 0, // This would require API call tracking implementation
				teamMembersCount: 1, // Single user for now - team feature not implemented
				leaseGenerationsCount:
					leaseGenResult.status === 'fulfilled'
						? leaseGenResult.value.count || 0
						: 0
			}

			// Check limits
			const limits = userPlan?.limits
			const limitChecks = limits
				? {
						propertiesExceeded: checkLimitExceeded(
							usage.propertiesCount,
							limits.properties
						),
						tenantsExceeded: checkLimitExceeded(
							usage.tenantsCount,
							limits.tenants
						),
						storageExceeded: checkLimitExceeded(
							usage.storageUsed,
							limits.storage
						),
						apiCallsExceeded: checkLimitExceeded(
							usage.apiCallsCount,
							limits.apiCalls
						),
						teamMembersExceeded: checkLimitExceeded(
							usage.teamMembersCount,
							limits.teamMembers || 1
						)
					}
				: null

			return {
				...usage,
				limits,
				limitChecks,
				month: currentMonth
			}
		},
		enabled: !!user?.id,
		retry: false // Don't retry on failure
	})
}

// Create Stripe checkout session
// Create subscription using new Vercel API (replaces useCreateCheckoutSession)
export function useCreateSubscription() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return useMutation({
		mutationFn: async (
			request: SubscriptionCreateRequest
		): Promise<SubscriptionCreateResponse> => {
			logger.userAction('subscription_creation_started', request.userId, {
				planId: request.planId,
				billingPeriod: request.billingPeriod
			})

			// Track subscription creation attempt
			posthog?.capture('subscription_creation_started', {
				plan_id: request.planId,
				billing_period: request.billingPeriod,
				user_id: request.userId,
				user_email: request.userEmail,
				create_account: request.createAccount,
				timestamp: new Date().toISOString()
			})

			// Track subscription initiation in Facebook Pixel
			const plan = PLANS.find(p => p.id === request.planId)
			if (plan) {
				const price =
					request.billingPeriod === 'monthly'
						? plan.monthlyPrice
						: plan.annualPrice
				FacebookPixel.trackInitiateCheckout(price, 'USD', [
					request.planId
				])
			}

			const response = await apiClient.subscriptions.create(request)
			return response
		},
		onSuccess: (data, variables) => {
			logger.userAction('subscription_created', variables.userId, {
				subscriptionId: data.subscriptionId
			})

			// Track successful subscription creation
			posthog?.capture('subscription_created', {
				subscription_id: data.subscriptionId,
				customer_id: data.customerId,
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				status: data.status,
				timestamp: new Date().toISOString()
			})

			// Track purchase in Facebook Pixel
			const plan = PLANS.find(p => p.id === variables.planId)
			if (plan) {
				const price =
					variables.billingPeriod === 'monthly'
						? plan.monthlyPrice
						: plan.annualPrice
				FacebookPixel.trackPurchase(price, 'USD', [variables.planId])
				FacebookPixel.trackStartTrial(
					`${plan.name}_${variables.billingPeriod}`,
					price
				)
			}

			// Invalidate subscription-related queries
			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			// Show success toast
			toast.success('Subscription created successfully!', {
				description: 'Your payment method is ready for setup.'
			})
		},
		onError: (error, variables) => {
			logger.error('Failed to create subscription', error as Error, {
				planId: variables.planId,
				billingPeriod: variables.billingPeriod
			})

			// Track subscription creation failure
			posthog?.capture('subscription_creation_failed', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			})

			// Show error toast with specific message
			const message =
				error instanceof Error
					? error.message
					: 'Failed to create subscription'
			toast.error('Subscription creation failed', {
				description: message,
				action: {
					label: 'Retry',
					onClick: () => {
						// The component can handle retry logic
					}
				}
			})
		}
	})
}

// Legacy checkout session function (for backwards compatibility)
export function useCreateCheckoutSession() {
	const { user } = useAuthStore()
	const posthog = usePostHog()

	return useMutation({
		mutationFn: async ({
			planId,
			billingPeriod,
			userEmail,
			userName,
			createAccount = false
		}: {
			planId: string
			billingPeriod: 'monthly' | 'annual'
			successUrl?: string
			cancelUrl?: string
			userEmail?: string
			userName?: string
			createAccount?: boolean
		}) => {
			// Track checkout session creation attempt
			posthog?.capture('checkout_session_started', {
				plan_id: planId,
				billing_period: billingPeriod,
				user_id: user?.id,
				user_email: user?.email || userEmail,
				create_account: createAccount || !user,
				timestamp: new Date().toISOString()
			})

			// Call backend API to create checkout session
			const data = await apiClient.subscriptions.create({
				planId,
				billingPeriod,
				userId: user?.id || null,
				userEmail: user?.email || userEmail,
				userName: user?.name || userName,
				createAccount: createAccount || !user
			})

			return data
		},
		onSuccess: (data, variables) => {
			// Track successful checkout session creation
			posthog?.capture('checkout_session_created', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				checkout_url: data.url,
				timestamp: new Date().toISOString()
			})

			// Redirect to Stripe Checkout
			if (data.url) {
				window.location.href = data.url
			}
		},
		onError: (error, variables) => {
			logger.error('Checkout session creation failed', error as Error, {
				planId: variables.planId,
				billingPeriod: variables.billingPeriod
			})

			// Track checkout session failure
			posthog?.capture('checkout_session_failed', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			})

			toast.error('Failed to start checkout process. Please try again.')
		}
	})
}

// Create Stripe Customer Portal session (Updated to use Vercel API)
export function useCreatePortalSession() {
	return useMutation({
		mutationFn: async (
			request: CustomerPortalRequest
		): Promise<CustomerPortalResponse> => {
			logger.userAction('customer_portal_requested', undefined, {
				customerId: request.customerId
			})

			const response = await apiClient.subscriptions.createPortal(request)

			return response
		},
		onSuccess: data => {
			logger.userAction('customer_portal_created', undefined, {
				url: data.url
			})

			// Redirect to customer portal
			window.location.href = data.url
		},
		onError: error => {
			logger.error(
				'Failed to create customer portal session',
				error as Error
			)

			const message =
				error instanceof Error
					? error.message
					: 'Failed to open customer portal'
			toast.error('Portal access failed', {
				description: message
			})
		}
	})
}

// Cancel subscription (Updated to use Vercel API)
export function useCancelSubscription() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return useMutation({
		mutationFn: async (subscriptionId: string) => {
			logger.userAction('subscription_cancellation_started', undefined, {
				subscriptionId
			})

			// Track cancellation attempt
			posthog?.capture('subscription_cancellation_started', {
				subscription_id: subscriptionId,
				timestamp: new Date().toISOString()
			})

			const response = await apiClient.subscriptions.cancel()

			return response
		},
		onSuccess: (data, subscriptionId) => {
			logger.userAction('subscription_canceled', undefined, {
				subscriptionId
			})

			// Track successful cancellation
			posthog?.capture('subscription_canceled', {
				subscription_id: subscriptionId,
				timestamp: new Date().toISOString()
			})

			// Track cancellation in Facebook Pixel
			FacebookPixel.trackSubscriptionCancellation(subscriptionId)

			// Invalidate subscription queries
			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
			queryClient.invalidateQueries({ queryKey: ['subscription'] })
			queryClient.invalidateQueries({ queryKey: ['user-plan'] })

			// Show success toast
			toast.success('Subscription canceled', {
				description: 'Your subscription has been canceled successfully.'
			})
		},
		onError: (error, subscriptionId) => {
			logger.error('Failed to cancel subscription', error as Error, {
				subscriptionId
			})

			// Track cancellation failure
			posthog?.capture('subscription_cancellation_failed', {
				subscription_id: subscriptionId,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			})

			const message =
				error instanceof Error
					? error.message
					: 'Failed to cancel subscription'
			toast.error('Cancellation failed', {
				description: message
			})
		}
	})
}

// Get billing history
export function useBillingHistory() {
	const { user } = useAuthStore()

	return useQuery({
		queryKey: ['billing-history', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Billing history placeholder - will be implemented with Stripe webhook data
			return [] as Invoice[]
		},
		enabled: !!user?.id
	})
}

// Check if user can perform an action based on plan limits
export function useCanPerformAction() {
	const { data: usage } = useUsageMetrics()

	return {
		canAddProperty: () => {
			if (!usage?.limitChecks) return true
			return !usage.limitChecks.propertiesExceeded
		},
		canAddTenant: () => {
			if (!usage?.limitChecks) return true
			return !usage.limitChecks.tenantsExceeded
		},
		canAddTeamMember: () => {
			if (!usage?.limitChecks) return true
			return !usage.limitChecks.teamMembersExceeded
		},
		canUseAPI: () => {
			if (!usage?.limitChecks) return true
			return !usage.limitChecks.apiCallsExceeded
		},
		getUpgradeReason: (action: 'property' | 'tenant' | 'team' | 'api') => {
			const plan = usage?.limits
			if (!plan) return ''

			switch (action) {
				case 'property':
					return `You've reached the limit of ${plan.properties} properties on your current plan.`
				case 'tenant':
					return `You've reached the limit of ${plan.tenants} tenants on your current plan.`
				case 'team':
					return `You've reached the limit of ${plan.teamMembers} team members on your current plan.`
				case 'api':
					return `You've reached the limit of ${plan.apiCalls} API calls on your current plan.`
				default:
					return 'Upgrade your plan to access this feature.'
			}
		}
	}
}

// Get all available plans
export function usePlans() {
	return useQuery({
		queryKey: ['plans'],
		queryFn: async () => {
			return PLANS.filter(plan => plan.active)
		},
		staleTime: 5 * 60 * 1000 // 5 minutes
	})
}

// ========================================
// NEW: Enhanced API operations using unified Vercel API
// ========================================

// Update subscription mutation (NEW from useSubscriptionApi.ts)
export function useUpdateSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			subscriptionId,
			updates
		}: {
			subscriptionId: string
			updates: { planId?: string; billingPeriod?: 'monthly' | 'annual' }
		}) => {
			logger.userAction('subscription_update_started', undefined, {
				subscriptionId,
				updates
			})

			const response = await apiClient.subscriptions.update(
				subscriptionId,
				updates
			)

			return response
		},
		onMutate: async ({ subscriptionId, updates }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: subscriptionKeys.detail(subscriptionId)
			})

			// Snapshot the previous value
			const previousSubscription = queryClient.getQueryData(
				subscriptionKeys.detail(subscriptionId)
			)

			// Optimistically update to the new value
			queryClient.setQueryData(
				subscriptionKeys.detail(subscriptionId),
				(old: Subscription | undefined) => ({
					...old,
					...updates
				})
			)

			// Return a context object with the snapshotted value
			return { previousSubscription }
		},
		onError: (err, { subscriptionId, updates }, context) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			queryClient.setQueryData(
				subscriptionKeys.detail(subscriptionId),
				context?.previousSubscription
			)

			logger.error('Failed to update subscription', err as Error, {
				subscriptionId,
				updates
			})

			const message =
				err instanceof Error
					? err.message
					: 'Failed to update subscription'
			toast.error('Update failed', {
				description: message
			})
		},
		onSuccess: (data, { subscriptionId }) => {
			logger.userAction('subscription_updated', undefined, {
				subscriptionId
			})

			// Invalidate and refetch
			queryClient.invalidateQueries({
				queryKey: subscriptionKeys.detail(subscriptionId)
			})
			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			// Show success toast
			toast.success('Subscription updated', {
				description: 'Your subscription changes have been applied.'
			})
		},
		onSettled: () => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
		}
	})
}

// Combined hook for subscription management (NEW from useSubscriptionApi.ts)
export function useSubscriptionManager() {
	const createSubscription = useCreateCheckoutSession()
	const createPortalSession = useCreatePortalSession()
	const cancelSubscription = useCancelSubscription()
	const updateSubscription = useUpdateSubscription()
	const subscriptionStatus = useSubscription()

	return {
		// Mutations
		createSubscription,
		createPortalSession,
		cancelSubscription,
		updateSubscription,

		// Queries
		subscriptionStatus,

		// Derived state
		isCreatingSubscription: createSubscription.isPending,
		isCreatingPortal: createPortalSession.isPending,
		isCanceling: cancelSubscription.isPending,
		isUpdating: updateSubscription.isPending,

		// Error states
		createError: createSubscription.error,
		portalError: createPortalSession.error,
		cancelError: cancelSubscription.error,
		updateError: updateSubscription.error,

		// Helper functions
		handleCreateSubscription: createSubscription.mutate,
		handleCreatePortal: createPortalSession.mutate,
		handleCancelSubscription: cancelSubscription.mutate,
		handleUpdateSubscription: updateSubscription.mutate
	}
}
