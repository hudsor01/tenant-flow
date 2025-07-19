// Refactored: useSubscription hooks now use tRPC for backend calls instead of legacy apiClient

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useApiAuth'
import { toast } from 'sonner'
import { trpc } from '@/lib/api'
import { logger } from '@/lib/logger'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import type { Subscription, Invoice } from '@/types/subscription'
// import type {
//	AppError
// } from '@tenantflow/shared'
import { getPlanById, subscriptionKeys } from '@/types/subscription'
import { usePostHog } from 'posthog-js/react'

// Get user's current subscription
export function useSubscription() {
	const { user } = useAuth()

	return trpc.subscriptions.getCurrent.useQuery(undefined, {
		enabled: !!user?.id,
		...cacheConfig.business,
		retry: (failureCount: number, error: unknown) => {
			const httpError = error as { status?: number }
			if (httpError?.status === 401 || httpError?.status === 403)
				return false
			return failureCount < 2
		}
	})
}

// Get user's current plan with limits
export function useUserPlan() {
	const { data: subscription = null } = useSubscription()

	return useQuery({
		queryKey: [
			...queryKeys.subscriptions.current(),
			'plan',
			subscription?.planId
		],
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
					subscription?.status === 'ACTIVE' || planId === 'freeTrial',
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

			// Use actual tRPC calls to get current usage
			const [
				propertiesResult,
				tenantsResult,
				leasesResult,
				leaseGenResult
			] = await Promise.allSettled([
				Promise.resolve({ count: 0 }), // properties placeholder
				Promise.resolve({ count: 0 }), // tenants placeholder
				Promise.resolve({ count: 0 }), // leases placeholder
				Promise.resolve({ count: 0 }) // lease generation placeholder
			])

			// Storage usage placeholder
			const storageUsed = 0
			const storageUsedMB =
				Math.round((storageUsed / (1024 * 1024)) * 100) / 100

			const usage = {
				propertiesCount:
					propertiesResult.status === 'fulfilled'
						? (propertiesResult.value as UsageResult).count || 0
						: 0,
				tenantsCount:
					tenantsResult.status === 'fulfilled'
						? (tenantsResult.value as UsageResult).count || 0
						: 0,
				leasesCount:
					leasesResult.status === 'fulfilled'
						? (leasesResult.value as UsageResult).count || 0
						: 0,
				storageUsed: storageUsedMB,
				apiCallsCount: 0,
				leaseGenerationsCount:
					leaseGenResult.status === 'fulfilled'
						? (leaseGenResult.value as UsageResult).count || 0
						: 0
			}

			// Check limits
			const limits =
				userPlan && 'propertyLimit' in userPlan
					? {
							properties: userPlan.propertyLimit as number,
							tenants:
								((userPlan as Record<string, unknown>)
									.tenantLimit as number) || -1,
							storage: -1, // unlimited for now
							apiCalls: -1 // unlimited for now
						}
					: null

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

// Create subscription with new user signup
export function useCreateSubscriptionWithSignup() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return trpc.subscriptions.createWithSignup.useMutation({
		onMutate: variables => {
			logger.userAction('subscription_signup_started', undefined, {
				planId: variables.planId,
				billingPeriod: variables.billingPeriod,
				userEmail: variables.userEmail,
				userName: variables.userName
			})

			posthog?.capture('subscription_signup_started', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				user_email: variables.userEmail,
				user_name: variables.userName,
				timestamp: new Date().toISOString()
			})

			// Analytics tracking removed - FacebookPixel was eliminated
		},
		onSuccess: (data, variables) => {
			logger.userAction('subscription_signup_completed', data.user.id, {
				subscriptionId: data.subscriptionId,
				userId: data.user.id
			})

			posthog?.capture('subscription_signup_completed', {
				subscription_id: data.subscriptionId,
				user_id: data.user.id,
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				status: data.status,
				timestamp: new Date().toISOString()
			})

			// Analytics tracking removed - FacebookPixel was eliminated

			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			toast.success('Account created successfully!', {
				description:
					'Your free trial has started. Welcome to TenantFlow!'
			})
		},
		onError: (error, variables) => {
			logger.error(
				'Failed to create subscription with signup',
				error as unknown as Error,
				{
					planId: variables.planId,
					billingPeriod: variables.billingPeriod,
					userEmail: variables.userEmail
				}
			)

			posthog?.capture('subscription_signup_failed', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				user_email: variables.userEmail,
				error: error?.message || 'Unknown error',
				timestamp: new Date().toISOString()
			})

			const message =
				error?.message || 'Failed to create account and subscription'
			toast.error('Account creation failed', {
				description: message
			})
		}
	})
}

// Start trial (minimal implementation)
export function useStartTrial() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return trpc.subscriptions.startTrial.useMutation({
		onMutate: () => {
			logger.userAction('trial_started', undefined, {
				action: 'start_trial'
			})

			posthog?.capture('trial_started', {
				timestamp: new Date().toISOString()
			})
		},
		onSuccess: data => {
			logger.userAction('trial_created', undefined, {
				subscriptionId: data.subscriptionId,
				status: data.status
			})

			posthog?.capture('trial_created', {
				subscription_id: data.subscriptionId,
				status: data.status,
				timestamp: new Date().toISOString()
			})

			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			toast.success('Trial started successfully!', {
				description: 'Your 14-day free trial has begun.'
			})
		},
		onError: error => {
			logger.error('Failed to start trial', error as unknown as Error)

			posthog?.capture('trial_start_failed', {
				error: error?.message || 'Unknown error',
				timestamp: new Date().toISOString()
			})

			const message = error?.message || 'Failed to start trial'
			toast.error('Trial start failed', {
				description: message
			})
		}
	})
}

// Create Stripe checkout session
export function useCreateSubscription() {
	const queryClient = useQueryClient()
	const posthog = usePostHog()

	return trpc.subscriptions.create.useMutation({
		onMutate: variables => {
			logger.userAction(
				'subscription_creation_started',
				variables.userId ?? undefined,
				{
					planId: variables.planId,
					billingPeriod: variables.billingPeriod
				}
			)

			posthog?.capture('subscription_creation_started', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				user_id: variables.userId,
				user_email: variables.userEmail,
				create_account: variables.createAccount,
				timestamp: new Date().toISOString()
			})

			// Analytics tracking removed - FacebookPixel was eliminated
		},
		onSuccess: (data, variables) => {
			logger.userAction(
				'subscription_created',
				variables.userId ?? undefined,
				{
					subscriptionId: data.subscriptionId
				}
			)

			posthog?.capture('subscription_created', {
				subscription_id: data.subscriptionId,
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				status: data.status,
				timestamp: new Date().toISOString()
			})

			// Analytics tracking removed - FacebookPixel was eliminated

			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

			toast.success('Subscription created successfully!', {
				description: 'Your payment method is ready for setup.'
			})
		},
		onError: (error, variables) => {
			logger.error(
				'Failed to create subscription',
				error as unknown as Error,
				{
					planId: variables.planId,
					billingPeriod: variables.billingPeriod
				}
			)

			posthog?.capture('subscription_creation_failed', {
				plan_id: variables.planId,
				billing_period: variables.billingPeriod,
				error: error?.message || 'Unknown error',
				timestamp: new Date().toISOString()
			})

			const message = error?.message || 'Failed to create subscription'
			toast.error('Subscription creation failed', {
				description: message,
				action: {
					label: 'Retry',
					onClick: () => {
						// Handle retry action - could retry the subscription operation
						logger.info('User clicked retry on subscription error')
					}
				}
			})
		}
	})
}

// Create Stripe Customer Portal session (Updated to use tRPC)
export function useCreatePortalSession() {
	return trpc.subscriptions.createPortalSession.useMutation({
		onMutate: variables => {
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
				error as unknown as Error
			)

			const message = error?.message || 'Failed to open customer portal'
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
		onMutate: variables => {
			logger.userAction('subscription_cancellation_started', undefined, {
				subscriptionId: variables.subscriptionId
			})

			posthog?.capture('subscription_cancellation_started', {
				subscription_id: variables.subscriptionId,
				timestamp: new Date().toISOString()
			})
		},
		onSuccess: (data, variables) => {
			logger.userAction('subscription_canceled', undefined, {
				subscriptionId: variables.subscriptionId
			})

			posthog?.capture('subscription_canceled', {
				subscription_id: variables.subscriptionId,
				timestamp: new Date().toISOString()
			})

			// Analytics tracking removed - FacebookPixel was eliminated

			queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
			queryClient.invalidateQueries({ queryKey: ['subscription'] })
			queryClient.invalidateQueries({ queryKey: ['user-plan'] })

			toast.success('Subscription canceled', {
				description: 'Your subscription has been canceled successfully.'
			})
		},
		onError: (error, variables) => {
			logger.error(
				'Failed to cancel subscription',
				error as unknown as Error,
				{
					subscriptionId: variables.subscriptionId
				}
			)

			posthog?.capture('subscription_cancellation_failed', {
				subscription_id: variables.subscriptionId,
				error: error?.message || 'Unknown error',
				timestamp: new Date().toISOString()
			})

			const message = error?.message || 'Failed to cancel subscription'
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

// Update subscription mutation (NEW from useSubscriptionApi.ts)
export function useUpdateSubscription() {
	const queryClient = useQueryClient()

	return trpc.subscriptions.update.useMutation({
		onMutate: async variables => {
			logger.userAction('subscription_update_started', undefined, {
				subscriptionId: variables.subscriptionId,
				updates: variables
			})

			const subscriptionId = variables.subscriptionId
			if (!subscriptionId) return { previousSubscription: null }

			await queryClient.cancelQueries({
				queryKey: subscriptionKeys.detail(subscriptionId)
			})

			const previousSubscription = queryClient.getQueryData(
				subscriptionKeys.detail(subscriptionId)
			)

			queryClient.setQueryData(
				subscriptionKeys.detail(subscriptionId),
				(old: Subscription | undefined) => ({
					...old,
					...variables
				})
			)

			return { previousSubscription }
		},
		onError: (err, variables, context) => {
			if (context?.previousSubscription) {
				if (variables.subscriptionId) {
					queryClient.setQueryData(
						subscriptionKeys.detail(variables.subscriptionId),
						context.previousSubscription
					)
				}
			}

			logger.error(
				'Failed to update subscription',
				new Error(String(err)),
				{
					subscriptionId: variables.subscriptionId,
					updates: variables
				}
			)

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

			if (variables.subscriptionId) {
				queryClient.invalidateQueries({
					queryKey: subscriptionKeys.detail(variables.subscriptionId)
				})
			}
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
	const createSubscription = useCreateSubscription()
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
function checkLimitExceeded(current: number, limit: number): boolean {
	return current >= limit
}

// Helper interface for usage result
interface UsageResult {
	count: number
}
