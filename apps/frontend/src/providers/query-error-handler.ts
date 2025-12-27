import type { createLogger } from '@repo/shared/lib/frontend-logger'

type Logger = ReturnType<typeof createLogger>

type MutationVariables = unknown
type MutationContext = unknown

type QueryErrorHandlers = {
	retry: (failureCount: number, error: unknown) => boolean
	retryDelay: (attemptIndex: number) => number
	onMutationSuccess: (
		data: unknown,
		variables: MutationVariables,
		context: MutationContext
	) => void
	onMutationError: (
		error: unknown,
		variables: MutationVariables,
		context: MutationContext
	) => void
}

const formatVariables = (variables: MutationVariables) => {
	if (variables && typeof variables === 'object') {
		return Object.keys(variables as Record<string, unknown>)
	}

	return String(variables)
}

const isClientError = (error: unknown) => {
	if (!error || typeof error !== 'object' || !('status' in error)) {
		return false
	}

	const status = (error as { status: number }).status
	return status >= 400 && status < 500
}

export const createQueryErrorHandlers = (logger: Logger): QueryErrorHandlers => {
	return {
		retry: (failureCount, error) => {
			if (isClientError(error)) {
				return false
			}

			return failureCount < 3
		},
		retryDelay: attemptIndex => {
			const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000)
			const jitter = Math.random() * 0.3 * baseDelay
			return baseDelay + jitter
		},
		onMutationSuccess: (_data, variables, context) => {
			logger.debug('Mutation succeeded', {
				action: 'mutation_success',
				metadata: {
					variables: formatVariables(variables),
					hasRollbackData: !!context
				}
			})
		},
		onMutationError: (error, variables, context) => {
			logger.warn('Mutation failed', {
				action: 'mutation_error',
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					variables: formatVariables(variables),
					hasRollbackData: !!context
				}
			})
		}
	}
}
