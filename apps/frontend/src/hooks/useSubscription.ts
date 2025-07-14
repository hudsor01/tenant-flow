// Refactored: useSubscription hooks now use tRPC for backend calls instead of legacy apiClient

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpcClient'
import { logger } from '@/lib/logger'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
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
	const { user } = useAuth()

	return trpc.subscriptions.getCurrent.useQuery(undefined, {
		enabled: !!user?.id,
		...cacheConfig.business,
		retry: (failureCount, error: any) => {
			if (error?.status === 401 || error?.status === 403) return false
			return failureCount < 2
		}
	})
}

// Get user's current plan with limits
export function useUserPlan() {
	const { data: subscription = null } = useSubscription()

	return useQuery({
		queryKey: [...queryKeys.subscriptions.current(), 'plan', subscription?.planId],
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
	const { user } = useAuth()
	const { data: userPlan } = useUserPlan()

	return useQuery({
		queryKey: ['usage-metrics', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Get current month usage
			const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

			// TODO: Replace with actual tRPC calls when router methods are available
			// For now, using placeholder data until properties/tenants routers are updated
			const [
				propertiesResult,
				tenantsResult,
				leasesResult,
				leaseGenResult
			] = await Promise.allSettled([
				// trpc.properties.getAll.fetch().then(data => ({ count: data.length })),
				// trpc.tenants.getAll.fetch().then(data => ({ count: data.length })),
				// trpc.leases.getAll.fetch().then(data => ({ count: data.length })),
				Promise.resolve({ count: 0 }), // properties placeholder
				Promise.resolve({ count: 0 }), // tenants placeholder
				Promise.resolve({ count: 0 }), // leases placeholder
				Promise.resolve({ count: 0 })  // lease generation placeholder
			])

			// Storage usage placeholder
			const storageUsed = 0
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
				apiCallsCount: 0,
				teamMembersCount: 1,
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
		retry: false
	})
}

// Create Stripe checkout session
export function useCreateSubscription() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return trpc.subscriptions.create.useMutation({
		onMutate: (variables) => {
			logger.userAction('subscription_creation_started', variables.userId ?? undefined, {
				planId: variables.planId,
				billingPeriod: variables.billingPeriod
			})

			posthog?.capture('subscription_creation_started', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				user_id: variables.userId,
				user_email: variables.userEmail,
				create_account: variables.createAccount,
				timestamp: new Date().toISOString()
			})

			const plan = PLANS.find(p => p.id === variables.planId)
			if (plan) {
				const price =
					variables.billingPeriod === 'monthly'
						? plan.monthlyPrice
						: plan.annualPrice
				FacebookPixel.trackInitiateCheckout(price, 'USD', [
					variables.planId
				])
			}
		},
		onSuccess: (data, variables) => {
			logger.userAction('subscription_created', variables.userId ?? undefined, {
				subscriptionId: data.subscriptionId
			})

			posthog?.capture('subscription_created', {
				subscription_id: data.subscriptionId,
				customer_id: data.customerId,
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				status: data.status,
				timestamp: new Date().toISOString()
			})

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

			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			toast.success('Subscription created successfully!', {
				description: 'Your payment method is ready for setup.'
			})
		},
		onError: (error, variables) => {
			logger.error('Failed to create subscription', error as Error, {
				planId: variables.planId,
				billingPeriod: variables.billingPeriod
			})

			posthog?.capture('subscription_creation_failed', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			})

			const message =
				error instanceof Error
					? error.message
					: 'Failed to create subscription'
			toast.error('Subscription creation failed', {
				description: message,
				action: {
					label: 'Retry',
					onClick: () => { }
				}
			})
		}
	})
}

// Legacy checkout session function (for backwards compatibility)
export function useCreateCheckoutSession() {
	const { user } = useAuth()
	const posthog = usePostHog()

	return trpc.subscriptions.create.useMutation({
		onMutate: (variables) => {
			posthog?.capture('checkout_session_started', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				user_id: variables.userId,
				user_email: variables.userEmail,
				create_account: variables.createAccount,
				timestamp: new Date().toISOString()
			})
		},
		onSuccess: (data, variables) => {
			posthog?.capture('checkout_session_created', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				checkout_url: data.url,
				timestamp: new Date().toISOString()
			})

			if (data.url) {
				window.location.href = data.url
			}
		},
		onError: (error, variables) => {
			logger.error('Checkout session creation failed', error as Error, {
				planId: variables.planId,
				billingPeriod: variables.billingPeriod
			})

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

// Create Stripe Customer Portal session (Updated to use tRPC)
export function useCreatePortalSession() {
	return trpc.subscriptions.createPortalSession.useMutation({
		onMutate: (variables) => {
			logger.userAction('customer_portal_requested', undefined, {
				customerId: variables.customerId
			})
		},
		onSuccess: data => {
			logger.userAction('customer_portal_created', undefined, {
				url: data.url
			})

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

// Cancel subscription (Updated to use tRPC)
export function useCancelSubscription() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return trpc.subscriptions.cancel.useMutation({
		onMutate: (variables) => {
			logger.userAction('subscription_cancellation_started', undefined, {
				subscriptionId: variables.subscriptionId
			})

			posthog?.capture('subscription_cancellation_started', {
				subscription_id: variables.subscriptionId,
				timestamp: new Date().toISOString()
			})
		},
		onSuccess: (data, subscriptionId) => {
			logger.userAction('subscription_canceled', undefined, {
				subscriptionId
			})

			posthog?.capture('subscription_canceled', {
				subscription_id: subscriptionId,
				timestamp: new Date().toISOString()
			})

			FacebookPixel.trackSubscriptionCancellation(subscriptionId)

			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
			queryClient.invalidateQueries({ queryKey: ['subscription'] })
			queryClient.invalidateQueries({ queryKey: ['user-plan'] })

			toast.success('Subscription canceled', {
				description: 'Your subscription has been canceled successfully.'
			})
		},
		onError: (error, subscriptionId) => {
			logger.error('Failed to cancel subscription', error as Error, {
				subscriptionId
			})

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
	const { user } = useAuth()

	return useQuery({
		queryKey: ['billing-history', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')
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
		staleTime: 5 * 60 * 1000
	})
}

// Update subscription mutation (NEW from useSubscriptionApi.ts)
export function useUpdateSubscription() {
	const queryClient = useQueryClient()

	return trpc.subscriptions.update.useMutation({
		onMutate: async (variables) => {
			logger.userAction('subscription_update_started', undefined, {
				subscriptionId: variables.subscriptionId,
				updates: variables
			})

			await queryClient.cancelQueries({
				queryKey: subscriptionKeys.detail(variables.subscriptionId)
			})

			const previousSubscription = queryClient.getQueryData(
				subscriptionKeys.detail(variables.subscriptionId)
			)

			queryClient.setQueryData(
				subscriptionKeys.detail(variables.subscriptionId),
				(old: Subscription | undefined) => ({
					...old,
					...variables
				})
			)

			return { previousSubscription }
		},
		onError: (err, variables, context) => {
			queryClient.setQueryData(
				subscriptionKeys.detail(variables.subscriptionId),
				context?.previousSubscription
			)

			logger.error('Failed to update subscription', err as Error, {
				subscriptionId: variables.subscriptionId,
				updates: variables
			})

			const message =
				err instanceof Error
					? err.message
					: 'Failed to update subscription'
			toast.error('Update failed', {
				description: message
			})
		},
		onSuccess: (data, variables) => {
			logger.userAction('subscription_updated', undefined, {
				subscriptionId: variables.subscriptionId
			})

			queryClient.invalidateQueries({
				queryKey: subscriptionKeys.detail(variables.subscriptionId)
			})
			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			toast.success('Subscription updated', {
				description: 'Your subscription changes have been applied.'
			})
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
		}
	})
}

// Combined hook for subscription management
export function useSubscriptionManager() {
	const createSubscription = useCreateCheckoutSession()
	const createPortalSession = useCreatePortalSession()
	const cancelSubscription = useCancelSubscription()
	const updateSubscription = useUpdateSubscription()
	const subscriptionStatus = useSubscription()

	return {
		createSubscription,
		createPortalSession,
		cancelSubscription,
		updateSubscription,
		subscriptionStatus,
		isCreatingSubscription: createSubscription.isPending,
		isCreatingPortal: createPortalSession.isPending,
		isCanceling: cancelSubscription.isPending,
		isUpdating: updateSubscription.isPending,
		createError: createSubscription.error,
		portalError: createPortalSession.error,
		cancelError: cancelSubscription.error,
		updateError: updateSubscription.error,
		handleCreateSubscription: createSubscription.mutate,
		handleCreatePortal: createPortalSession.mutate,
		handleCancelSubscription: cancelSubscription.mutate,
		handleUpdateSubscription: updateSubscription.mutate
	}
}
