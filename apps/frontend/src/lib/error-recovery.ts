/**
 * Centralized Error Recovery System
 * Provides automatic error recovery, fallback strategies, and user guidance
 * Based on React 19 + TanStack Query v5 best practices
 */

import { logger } from '@repo/shared/lib/frontend-logger'
import type { ErrorContext } from '@repo/shared/types/errors'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { trackError } from './error-analytics'
import { categorizeError } from './error-handler'

export interface RecoveryStrategy {
	name: string
	canRecover: (error: unknown) => boolean
	recover: (error: unknown, context?: ErrorContext) => Promise<boolean>
	fallback?: () => void
}

export interface RecoveryOptions {
	showToast?: boolean
	redirectOnFailure?: string
	customStrategies?: RecoveryStrategy[]
	maxRecoveryAttempts?: number
}

/**
 * Built-in recovery strategies
 */
const builtInRecoveryStrategies: RecoveryStrategy[] = [
	// Strategy 1: Network reconnection
	{
		name: 'network_reconnection',
		canRecover: error => {
			const message =
				error instanceof Error
					? error.message.toLowerCase()
					: String(error).toLowerCase()
			return (
				message.includes('network') ||
				message.includes('offline') ||
				message.includes('fetch')
			)
		},
		recover: async (error, context) => {
			logger.info('Attempting network recovery', {
				action: 'network_recovery_attempt',
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					context
				}
			})

			// Wait for network to be available
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				await waitForNetwork()
			}

			// Verify connection with a simple fetch
			try {
				await fetch('/api/health', { method: 'HEAD' })
				logger.info('Network recovery successful', {
					action: 'network_recovery_success',
					metadata: {}
				})
				return true
			} catch {
				logger.warn('Network recovery failed', {
					action: 'network_recovery_failed',
					metadata: {}
				})
				return false
			}
		}
	},

	// Strategy 2: Token refresh for auth errors
	{
		name: 'token_refresh',
		canRecover: error => {
			const message =
				error instanceof Error
					? error.message.toLowerCase()
					: String(error).toLowerCase()
			return (
				message.includes('401') ||
				message.includes('unauthorized') ||
				message.includes('token expired')
			)
		},
		recover: async (error, context) => {
			logger.info('Attempting token refresh', {
				action: 'token_refresh_attempt',
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					context
				}
			})

			try {
				// Use Supabase client to refresh session
				const { createBrowserClient } = await import('@supabase/ssr')
				const supabase = createBrowserClient(
					process.env.NEXT_PUBLIC_SUPABASE_URL!,
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
				)

				const { data, error: refreshError } =
					await supabase.auth.refreshSession()

				if (refreshError || !data.session) {
					logger.warn('Token refresh failed', {
						action: 'token_refresh_failed',
						metadata: { error: refreshError?.message }
					})
					return false
				}

				logger.info('Token refresh successful', {
					action: 'token_refresh_success',
					metadata: {}
				})
				return true
			} catch (refreshError) {
				logger.error('Token refresh error', {
					action: 'token_refresh_error',
					metadata: {
						error:
							refreshError instanceof Error
								? refreshError.message
								: String(refreshError)
					}
				})
				return false
			}
		},
		fallback: () => {
			// Redirect to login if token refresh fails
			if (typeof window !== 'undefined') {
				window.location.href = '/login'
			}
		}
	},

	// Strategy 3: Cache invalidation for stale data errors
	{
		name: 'cache_invalidation',
		canRecover: error => {
			const message =
				error instanceof Error
					? error.message.toLowerCase()
					: String(error).toLowerCase()
			return (
				message.includes('stale') ||
				message.includes('cache') ||
				message.includes('outdated')
			)
		},
		recover: async (error, context) => {
			logger.info('Attempting cache invalidation', {
				action: 'cache_invalidation_attempt',
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					context
				}
			})

			// This will be called with queryClient from useErrorRecovery hook
			return true // Indicates strategy can proceed
		}
	},

	// Strategy 4: Rate limit backoff
	{
		name: 'rate_limit_backoff',
		canRecover: error => {
			const message =
				error instanceof Error
					? error.message.toLowerCase()
					: String(error).toLowerCase()
			const statusCode = (error as { statusCode?: number })?.statusCode
			return message.includes('rate limit') || statusCode === 429
		},
		recover: async (error, context) => {
			logger.info('Handling rate limit with backoff', {
				action: 'rate_limit_backoff',
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					context
				}
			})

			// Wait for 5 seconds before allowing retry
			await new Promise(resolve => setTimeout(resolve, 5000))

			logger.info('Rate limit backoff completed', {
				action: 'rate_limit_backoff_completed',
				metadata: {}
			})
			return true
		}
	}
]

/**
 * Wait for network to become available
 */
async function waitForNetwork(timeout = 30000): Promise<boolean> {
	return new Promise(resolve => {
		const startTime = Date.now()

		const checkNetwork = () => {
			if (navigator.onLine) {
				resolve(true)
				return
			}

			if (Date.now() - startTime > timeout) {
				resolve(false)
				return
			}

			setTimeout(checkNetwork, 1000)
		}

		// Also listen for online event
		const onlineHandler = () => {
			window.removeEventListener('online', onlineHandler)
			resolve(true)
		}

		window.addEventListener('online', onlineHandler)
		checkNetwork()
	})
}

/**
 * Main error recovery function
 */
export async function recoverFromError(
	error: unknown,
	context?: ErrorContext,
	options: RecoveryOptions = {}
): Promise<boolean> {
	const { showToast = true, redirectOnFailure, customStrategies = [] } = options

	// Track error
	trackError(error, context)

	// Combine built-in and custom strategies
	const allStrategies = [...builtInRecoveryStrategies, ...customStrategies]

	// Find applicable strategies
	const applicableStrategies = allStrategies.filter(strategy =>
		strategy.canRecover(error)
	)

	if (applicableStrategies.length === 0) {
		logger.warn('No recovery strategies available for error', {
			action: 'no_recovery_strategies',
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				context
			}
		})

		if (showToast) {
			const userError = categorizeError(error, context)
			toast.error(userError.title, {
				description: userError.message
			})
		}

		if (redirectOnFailure && typeof window !== 'undefined') {
			window.location.href = redirectOnFailure
		}

		return false
	}

	// Try each strategy
	for (const strategy of applicableStrategies) {
		logger.info('Attempting recovery strategy', {
			action: 'recovery_strategy_attempt',
			metadata: { strategy: strategy.name, context }
		})

		try {
			const recovered = await strategy.recover(error, context)

			if (recovered) {
				logger.info('Recovery successful', {
					action: 'recovery_successful',
					metadata: { strategy: strategy.name }
				})

				if (showToast) {
					toast.success('Connection restored', {
						description: 'Your request is being retried automatically.'
					})
				}

				return true
			}
		} catch (recoveryError) {
			logger.error('Recovery strategy failed', {
				action: 'recovery_strategy_failed',
				metadata: {
					strategy: strategy.name,
					error:
						recoveryError instanceof Error
							? recoveryError.message
							: String(recoveryError)
				}
			})
		}

		// Try fallback if available
		if (strategy.fallback) {
			logger.info('Executing recovery fallback', {
				action: 'recovery_fallback',
				metadata: { strategy: strategy.name }
			})
			strategy.fallback()
		}
	}

	// All strategies failed
	logger.error('All recovery strategies failed', {
		action: 'all_recovery_failed',
		metadata: {
			error: error instanceof Error ? error.message : String(error),
			strategies: applicableStrategies.map(s => s.name),
			context
		}
	})

	if (showToast) {
		const userError = categorizeError(error, context)
		toast.error(userError.title, {
			description: userError.message,
			action: redirectOnFailure
				? {
						label: 'Go Back',
						onClick: () => {
							if (typeof window !== 'undefined') {
								window.location.href = redirectOnFailure
							}
						}
					}
				: undefined
		})
	}

	return false
}

/**
 * React hook for error recovery in components
 */
export function useErrorRecovery(options: RecoveryOptions = {}) {
	const queryClient = useQueryClient()

	const recover = async (
		error: unknown,
		context?: ErrorContext & { queryKey?: unknown[] }
	): Promise<boolean> => {
		// Add cache invalidation strategy if queryKey is provided
		const strategies: RecoveryStrategy[] = context?.queryKey
			? [
					{
						name: 'query_invalidation',
						canRecover: () => true,
						recover: async () => {
							await queryClient.invalidateQueries({
								queryKey: context.queryKey as unknown[]
							})
							return true
						}
					}
				]
			: []

		return recoverFromError(error, context, {
			...options,
			customStrategies: [...strategies, ...(options.customStrategies || [])]
		})
	}

	const recoverAndRetry = async <T>(
		fn: () => Promise<T>,
		context?: ErrorContext & { queryKey?: unknown[] }
	): Promise<T | null> => {
		try {
			return await fn()
		} catch (error) {
			const recovered = await recover(error, context)

			if (recovered) {
				// Retry the function after recovery
				try {
					return await fn()
				} catch (retryError) {
					logger.error('Retry after recovery failed', {
						action: 'retry_after_recovery_failed',
						metadata: {
							error:
								retryError instanceof Error
									? retryError.message
									: String(retryError)
						}
					})
					return null
				}
			}

			return null
		}
	}

	return {
		recover,
		recoverAndRetry
	}
}

/**
 * Global error recovery handler
 * Can be used in event handlers, callbacks, etc.
 */
export const globalErrorRecovery = {
	handle: async (error: unknown, context?: ErrorContext): Promise<void> => {
		await recoverFromError(error, context, {
			showToast: true,
			redirectOnFailure: '/manage'
		})
	}
}
