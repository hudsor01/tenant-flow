import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
	Subscription,
	Plan,
	BillingUsageMetrics as UsageMetrics,
	SubscriptionSyncResult,
	SubscriptionState,
	PlanType
} from '@repo/shared'
import { apiClient } from '@/lib/api-client'

// Interface for subscription status API response
interface SubscriptionStatusResponse {
	isActive: boolean
	planType: PlanType
	status: string
	trialDaysRemaining: number
	canUpgrade: boolean
}

interface SubscriptionSyncOptions {
	enableAutoSync?: boolean
	syncIntervalMs?: number
	enableRealTimeUpdates?: boolean
	onSyncComplete?: (result: SubscriptionSyncResult) => void
	onSubscriptionChange?: (subscription: Subscription) => void
}

interface SubscriptionSyncHook {
	// Current subscription state
	subscription: Subscription | null
	plan: Plan | null
	usage: UsageMetrics | null

	// Sync status
	isLoading: boolean
	isSyncing: boolean
	lastSyncAt: Date | null
	syncError: Error | null

	// State consistency
	isInSync: boolean
	discrepancies: string[]

	// Actions
	syncNow: () => Promise<void>
	refreshSubscription: () => Promise<void>
	forceFullSync: () => Promise<void>

	// Real-time events
	onSubscriptionChange?: (subscription: Subscription) => void
	onSyncComplete?: (result: SubscriptionSyncResult) => void
}

const QUERY_KEYS = {
	subscription: (userId: string) => ['subscription', userId] as const,
	usage: (userId: string) => ['subscription-usage', userId] as const,
	syncState: (userId: string) => ['subscription-sync-state', userId] as const
} as const

/**
 * Comprehensive subscription synchronization hook
 *
 * Features:
 * - Real-time subscription state management
 * - Automatic sync with configurable intervals
 * - Manual sync triggers
 * - Consistency checking and discrepancy detection
 * - Usage metrics tracking
 * - Error handling and retry logic
 */
export function useSubscriptionSync(
	userId: string,
	options: SubscriptionSyncOptions = {}
): SubscriptionSyncHook {
	const {
		enableAutoSync = true,
		syncIntervalMs = 5 * 60 * 1000, // 5 minutes
		enableRealTimeUpdates = true
	} = options

	const queryClient = useQueryClient()
	const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
	const [isSyncing, setIsSyncing] = useState(false)

	// Main subscription query with auto-refresh
	const {
		data: subscriptionData,
		isLoading: isSubscriptionLoading,
		error: subscriptionError,
		refetch: refetchSubscription
	} = useQuery({
		queryKey: QUERY_KEYS.subscription(userId),
		queryFn: async (): Promise<{
			subscription: Subscription | null
			plan: Plan | null
		}> => {
			return apiClient.get(`/subscriptions/user/${userId}`)
		},
		staleTime: 1 * 60 * 1000, // 1 minute
		refetchInterval: enableAutoSync ? syncIntervalMs : false,
		refetchIntervalInBackground: false,
		retry: 3
	})

	// Usage metrics query
	const { data: usage, isLoading: isUsageLoading } = useQuery({
		queryKey: QUERY_KEYS.usage(userId),
		queryFn: async (): Promise<UsageMetrics> => {
			return apiClient.get(`/subscriptions/usage/${userId}`)
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: enableAutoSync ? syncIntervalMs * 2 : false, // Slower refresh for usage
		retry: 2
	})

	// Subscription sync state query for debugging
	const { data: syncState } = useQuery({
		queryKey: QUERY_KEYS.syncState(userId),
		queryFn: async (): Promise<SubscriptionState> => {
			return apiClient.get(`/subscriptions/sync-state/${userId}`)
		},
		staleTime: 30 * 1000, // 30 seconds
		enabled: false, // Only fetch when explicitly requested
		retry: 1
	})

	// Manual sync mutation
	const syncMutation = useMutation({
		mutationFn: async (
			force?: boolean
		): Promise<SubscriptionSyncResult> => {
			return apiClient.post(`/subscriptions/sync/${userId}`, { force })
		},
		onMutate: () => {
			setIsSyncing(true)
		},
		onSuccess: result => {
			setLastSyncAt(new Date())

			// Invalidate and refetch subscription data
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.subscription(userId)
			})
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.usage(userId)
			})

			// Call success callback if provided
			if (options.onSyncComplete) {
				options.onSyncComplete(result)
			}
		},
		onError: error => {
			console.error('Subscription sync failed:', error)
		},
		onSettled: () => {
			setIsSyncing(false)
		}
	})

	// Server-Sent Events for real-time updates
	useEffect(() => {
		if (!enableRealTimeUpdates || !userId) return

		const eventSource = new EventSource(
			`/api/subscriptions/events/${userId}`
		)

		eventSource.addEventListener('subscription-changed', event => {
			try {
				const subscription: Subscription = JSON.parse(event.data)

				// Update query cache
				queryClient.setQueryData(
					QUERY_KEYS.subscription(userId),
					(
						old:
							| {
									subscription: Subscription | null
									plan: Plan | null
							  }
							| undefined
					) =>
						old
							? { ...old, subscription }
							: { subscription, plan: null }
				)

				// Call change callback if provided
				if (options.onSubscriptionChange) {
					options.onSubscriptionChange(subscription)
				}

				setLastSyncAt(new Date())
			} catch (error) {
				console.error(
					'Failed to process subscription change event:',
					error
				)
			}
		})

		eventSource.addEventListener('sync-completed', event => {
			try {
				const result: SubscriptionSyncResult = JSON.parse(event.data)

				if (result.success) {
					// Refresh subscription data
					queryClient.invalidateQueries({
						queryKey: QUERY_KEYS.subscription(userId)
					})
					setLastSyncAt(new Date())
				}

				if (options.onSyncComplete) {
					options.onSyncComplete(result)
				}
			} catch (error) {
				console.error('Failed to process sync completion event:', error)
			}
		})

		eventSource.addEventListener('error', event => {
			console.error('Subscription SSE error:', event)
		})

		return () => {
			eventSource.close()
		}
	}, [userId, enableRealTimeUpdates, queryClient, options])

	// Manual sync functions
	const syncNow = useCallback(async () => {
		if (isSyncing) return
		await syncMutation.mutateAsync(false)
	}, [isSyncing, syncMutation])

	const forceFullSync = useCallback(async () => {
		if (isSyncing) return
		await syncMutation.mutateAsync(true)
	}, [isSyncing, syncMutation])

	const refreshSubscription = useCallback(async () => {
		await refetchSubscription()
	}, [refetchSubscription])

	// Periodic sync check for discrepancies
	useEffect(() => {
		if (!enableAutoSync || !userId) return

		const interval = setInterval(async () => {
			// Only check sync state occasionally (every 10 minutes)
			if (Math.random() < 0.1) {
				try {
					await queryClient.refetchQueries({
						queryKey: QUERY_KEYS.syncState(userId)
					})
				} catch (error) {
					console.warn('Failed to check sync state:', error)
				}
			}
		}, syncIntervalMs)

		return () => clearInterval(interval)
	}, [enableAutoSync, userId, syncIntervalMs, queryClient])

	// Computed values
	const isLoading = isSubscriptionLoading || isUsageLoading
	const syncError = subscriptionError || syncMutation.error
	const isInSync =
		!syncState?.discrepancies || syncState.discrepancies.length === 0
	const discrepancies = syncState?.discrepancies || []

	return {
		// Current state
		subscription: subscriptionData?.subscription || null,
		plan: subscriptionData?.plan || null,
		usage: usage || null,

		// Sync status
		isLoading,
		isSyncing: isSyncing || syncMutation.isPending,
		lastSyncAt,
		syncError: syncError as Error | null,

		// Consistency
		isInSync,
		discrepancies,

		// Actions
		syncNow,
		refreshSubscription,
		forceFullSync
	}
}

/**
 * Hook for subscription admin operations
 * Provides additional functionality for admin users
 */
export function useSubscriptionAdmin() {
	const queryClient = useQueryClient()

	// Bulk sync mutation for admin operations
	const bulkSyncMutation = useMutation({
		mutationFn: async (
			userIds: string[]
		): Promise<{
			completed: number
			errors: number
			results: { userId: string; result: SubscriptionSyncResult }[]
		}> => {
			return apiClient.post('/admin/subscriptions/bulk-sync', { userIds })
		},
		onSuccess: () => {
			// Invalidate all subscription queries to force refresh
			queryClient.invalidateQueries({ queryKey: ['subscription'] })
		}
	})

	// Get subscription metrics for admin dashboard
	const { data: subscriptionMetrics, isLoading: isMetricsLoading } = useQuery(
		{
			queryKey: ['subscription-metrics'],
			queryFn: async () => {
				return apiClient.get('/admin/subscriptions/metrics')
			},
			staleTime: 5 * 60 * 1000, // 5 minutes
			retry: 2
		}
	)

	return {
		bulkSync: bulkSyncMutation.mutate,
		isBulkSyncing: bulkSyncMutation.isPending,
		bulkSyncError: bulkSyncMutation.error,
		subscriptionMetrics,
		isMetricsLoading
	}
}

/**
 * Simple hook for basic subscription status
 * Lightweight version for components that only need basic info
 */
export function useSubscriptionStatus(userId: string) {
	const { data } = useQuery<SubscriptionStatusResponse>({
		queryKey: QUERY_KEYS.subscription(userId),
		queryFn: async () => {
			return apiClient.get<SubscriptionStatusResponse>(`/subscriptions/status/${userId}`)
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		retry: 2
	})

	return {
		isActive: data?.isActive || false,
		planType: data?.planType || 'FREETRIAL',
		status: data?.status || 'unknown',
		trialDaysRemaining: data?.trialDaysRemaining || 0,
		canUpgrade: data?.canUpgrade || false
	}
}
