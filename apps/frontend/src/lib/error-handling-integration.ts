/**
 * Error Handling Integration Guide
 * Complete system tying together error boundaries, retry logic, analytics, and recovery
 * Based on React 19 + TanStack Query v5 + Next.js 15
 *
 * This file serves as both documentation and helper utilities for the complete error handling system
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { ErrorContext } from '@repo/shared/types/errors'
import { useCallback } from 'react'
import {
	getErrorAnalyticsSummary,
	trackMutationError,
	trackQueryError
} from './error-analytics'
import { handleApiError } from './error-handler'
import { useErrorRecovery } from './error-recovery'
import { adaptiveRetryDelay, defaultQueryRetry } from './query-retry-strategies'

const logger = createLogger({ component: 'ErrorHandlingIntegration' })

/**
 * ============================================================================
 * SYSTEM OVERVIEW
 * ============================================================================
 *
 * This comprehensive error handling system includes:
 *
 * 1. **Smart Retry Mechanisms** (query-retry-strategies.ts)
 *    - Exponential backoff with jitter
 *    - Circuit breaker pattern
 *    - Error categorization (network, auth, server, client)
 *    - Adaptive retry delays based on error type
 *
 * 2. **Error Analytics** (error-analytics.ts)
 *    - Comprehensive error tracking via PostHog
 *    - Persistent error pattern detection
 *    - User impact tracking
 *    - Session-based error metrics
 *
 * 3. **Error Recovery** (error-recovery.ts)
 *    - Automatic recovery strategies
 *    - Network reconnection
 *    - Token refresh for auth errors
 *    - Cache invalidation
 *    - Rate limit backoff
 *
 * 4. **Error Boundaries** (components/tenant/tenant-error-boundary.tsx)
 *    - React 19 error boundaries
 *    - Specialized tenant error UI
 *    - Automatic error reporting
 *    - Recovery attempt integration
 *
 * 5. **Query Provider** (providers/query-provider.tsx)
 *    - Global TanStack Query configuration
 *    - Default retry logic
 *    - Analytics integration
 *    - Error boundary wrapping
 */

/**
 * ============================================================================
 * USAGE EXAMPLES
 * ============================================================================
 */

/**
 * Example 1: Enhanced Query Hook with Full Error Handling
 *
 * ```typescript
 * export function useTenantQuery(id: string) {
 *   const queryClient = useQueryClient()
 *   const { recover } = useErrorRecovery()
 *
 *   return useQuery({
 *     queryKey: ['tenant', id],
 *     queryFn: async () => {
 *       return await apiClient<Tenant>(`/api/v1/tenants/${id}`)
 *     },
 *     retry: (failureCount, error) => {
 *       const shouldRetry = defaultQueryRetry(failureCount, error)
 *       if (!shouldRetry) {
 *         trackQueryError(error, ['tenant', id], {
 *           entityType: 'tenant',
 *           entityId: id,
 *           operation: 'fetch tenant',
 *           retryCount: failureCount
 *         })
 *       }
 *       return shouldRetry
 *     },
 *     retryDelay: (attemptIndex, error) => adaptiveRetryDelay(attemptIndex, error),
 *     meta: {
 *       onError: async (error: unknown) => {
 *         await recover(error, {
 *           entityType: 'tenant',
 *           entityId: id,
 *           queryKey: ['tenant', id]
 *         })
 *       }
 *     }
 *   })
 * }
 * ```
 */

/**
 * Example 2: Enhanced Mutation Hook with Error Handling
 *
 * ```typescript
 * export function useCreateTenantMutation() {
 *   const queryClient = useQueryClient()
 *   const { recover } = useErrorRecovery()
 *
 *   return useMutation({
 *     mutationFn: async (data: TenantInput) => {
 *       return await apiClient<Tenant>('/api/v1/tenants', {
 *         method: 'POST',
 *         body: JSON.stringify(data)
 *       })
 *     },
 *     retry: (failureCount, error) => {
 *       const shouldRetry = defaultMutationRetry(failureCount, error)
 *       if (!shouldRetry) {
 *         trackMutationError(error, ['tenant', 'create'], {
 *           entityType: 'tenant',
 *           operation: 'create tenant',
 *           retryCount: failureCount
 *         })
 *       }
 *       return shouldRetry
 *     },
 *     retryDelay: (attemptIndex, error) => adaptiveRetryDelay(attemptIndex, error),
 *     onError: async (error) => {
 *       handleApiError(error, 'create tenant', 'tenant')
 *       await recover(error, {
 *         entityType: 'tenant',
 *         operation: 'create tenant'
 *       })
 *     },
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['tenants'] })
 *     }
 *   })
 * }
 * ```
 */

/**
 * Example 3: Component with Error Boundary and Suspense
 *
 * ```typescript
 * import { TenantSuspenseWrapper } from '@/components/tenant/tenant-suspense-wrapper'
 *
 * export function TenantDetailsPage({ id }: { id: string }) {
 *   return (
 *     <TenantSuspenseWrapper
 *       fallbackType="detail"
 *       onReset={() => {
 *         // Custom reset logic
 *         router.refresh()
 *       }}
 *     >
 *       <TenantDetails id={id} />
 *     </TenantSuspenseWrapper>
 *   )
 * }
 * ```
 */

/**
 * Example 4: Manual Error Recovery
 *
 * ```typescript
 * function MyComponent() {
 *   const { recoverAndRetry } = useErrorRecovery()
 *
 *   const handleAction = async () => {
 *     const result = await recoverAndRetry(
 *       async () => {
 *         return await apiClient('/api/v1/action')
 *       },
 *       {
 *         operation: 'perform action',
 *         entityType: 'tenant'
 *       }
 *     )
 *
 *     if (result) {
 *       // Success
 *     } else {
 *       // All recovery attempts failed
 *     }
 *   }
 *
 *   return <button onClick={handleAction}>Perform Action</button>
 * }
 * ```
 */

/**
 * ============================================================================
 * HELPER HOOKS FOR COMMON PATTERNS
 * ============================================================================
 */

/**
 * Hook for creating error-aware query options
 */
export function useEnhancedQueryOptions(
	queryKey: unknown[],
	context: Omit<ErrorContext, 'queryKey'>
) {
	const { recover } = useErrorRecovery()

	return {
		retry: useCallback(
			(failureCount: number, error: unknown) => {
				const shouldRetry = defaultQueryRetry(failureCount, error)
				if (!shouldRetry) {
					trackQueryError(error, queryKey, {
						...context,
						retryCount: failureCount
					})
				}
				return shouldRetry
			},
			[queryKey, context]
		),

		retryDelay: useCallback((attemptIndex: number, error: unknown) => {
			return adaptiveRetryDelay(attemptIndex, error)
		}, []),

		meta: {
			onError: useCallback(
				async (error: unknown) => {
					await recover(error, {
						...context,
						queryKey
					})
				},
				[recover, context, queryKey]
			)
		}
	}
}

/**
 * Hook for creating error-aware mutation options
 */
export function useEnhancedMutationOptions(
	mutationKey: unknown[],
	context: Omit<ErrorContext, 'queryKey'>
) {
	const { recover } = useErrorRecovery()

	return {
		retry: useCallback(
			(failureCount: number, error: unknown) => {
				const shouldRetry = defaultQueryRetry(failureCount, error)
				if (!shouldRetry) {
					trackMutationError(error, mutationKey, {
						...context,
						retryCount: failureCount
					})
				}
				return shouldRetry
			},
			[mutationKey, context]
		),

		retryDelay: useCallback((attemptIndex: number, error: unknown) => {
			return adaptiveRetryDelay(attemptIndex, error)
		}, []),

		onError: useCallback(
			async (error: unknown) => {
				handleApiError(
					error,
					context.operation || 'mutation',
					context.entityType
				)
				await recover(error, context)
			},
			[recover, context]
		)
	}
}

/**
 * Hook for accessing error analytics
 */
export function useErrorAnalytics() {
	return {
		getSummary: getErrorAnalyticsSummary,
		trackQuery: trackQueryError,
		trackMutation: trackMutationError
	}
}

/**
 * ============================================================================
 * MONITORING AND DEBUGGING
 * ============================================================================
 */

/**
 * Development helper to log current error state
 * Only works in development mode
 */
export function logErrorSystemState(): void {
	if (process.env.NODE_ENV !== 'development') return

	const summary = getErrorAnalyticsSummary()

	logger.info('Error System State', {
		action: 'error_system_state',
		metadata: {
			sessionErrors: summary.sessionErrors,
			persistentErrors: summary.persistentErrors,
			affectedOperations: summary.affectedOperations
		}
	})
}

/**
 * Development helper to get error system health status
 */
export function getErrorSystemHealth(): {
	isHealthy: boolean
	issues: string[]
	warnings: string[]
} {
	const summary = getErrorAnalyticsSummary()
	const issues: string[] = []
	const warnings: string[] = []

	// Check for high error rates
	if (summary.sessionErrors > 10) {
		issues.push(
			`High error rate: ${summary.sessionErrors} errors in current session`
		)
	} else if (summary.sessionErrors > 5) {
		warnings.push(
			`Elevated error rate: ${summary.sessionErrors} errors in current session`
		)
	}

	// Check for persistent errors
	const highFrequencyErrors = summary.persistentErrors.filter(e => e.count > 3)
	if (highFrequencyErrors.length > 0) {
		issues.push(`${highFrequencyErrors.length} errors occurring repeatedly`)
	}

	// Check for critical operations affected
	const criticalOps = ['authentication', 'authorization', 'payment']
	const affectedCritical = summary.affectedOperations.filter(op =>
		criticalOps.some(critical => op.includes(critical))
	)
	if (affectedCritical.length > 0) {
		issues.push(`Critical operations affected: ${affectedCritical.join(', ')}`)
	}

	return {
		isHealthy: issues.length === 0,
		issues,
		warnings
	}
}

/**
 * ============================================================================
 * BEST PRACTICES
 * ============================================================================
 *
 * 1. **Always use error boundaries around data-fetching components**
 *    - Use TenantSuspenseWrapper or similar for automatic handling
 *    - Provides graceful error UI and recovery options
 *
 * 2. **Let TanStack Query handle retries automatically**
 *    - Default retry logic is smart and error-aware
 *    - Only customize when you have specific requirements
 *
 * 3. **Track errors at the query/mutation level**
 *    - Provides valuable insights for debugging
 *    - Helps identify patterns and problematic endpoints
 *
 * 4. **Use recovery strategies for critical operations**
 *    - Automatic recovery for network/auth issues
 *    - Manual recovery for business-critical flows
 *
 * 5. **Monitor error analytics in development**
 *    - Use logErrorSystemState() to debug issues
 *    - Check getErrorSystemHealth() for overall system health
 *
 * 6. **Keep error messages user-friendly**
 *    - Categorize errors into user-understandable messages
 *    - Provide actionable recovery steps
 *
 * 7. **Test error scenarios thoroughly**
 *    - Network failures
 *    - Authentication errors
 *    - Validation errors
 *    - Server errors
 */
