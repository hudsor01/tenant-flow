/**
 * Mutation callback factory.
 * Creates onSuccess/onError/onMutate/onSettled callbacks for useMutation.
 *
 * Tier 1: Simple invalidation + toast
 * Tier 2: + setQueryData for detail cache (updateDetail) or removeQueries (removeDetail)
 * Tier 3: + optimistic updates with cancel/snapshot/rollback/apply
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

export interface OptimisticConfig<TVariables, TContext> {
	/** Query keys to cancel before mutation. Static array or function receiving variables. */
	cancel:
		| ReadonlyArray<readonly unknown[]>
		| ((variables: TVariables) => ReadonlyArray<readonly unknown[]>)
	/** Captures previous state for rollback */
	snapshot: (queryClient: QueryClient, variables: TVariables) => TContext
	/** Restores previous state on error */
	rollback: (
		queryClient: QueryClient,
		context: TContext,
		variables: TVariables
	) => void
	/** Applies optimistic update to cache */
	apply?: (queryClient: QueryClient, variables: TVariables) => void
}

export interface MutationCallbackConfig<
	TData,
	TVariables = unknown,
	TContext = unknown
> {
	/** Query keys to invalidate on success. Static array, or function of variables for optimistic mode. */
	invalidate:
		| ReadonlyArray<readonly unknown[]>
		| ((variables: TVariables) => ReadonlyArray<readonly unknown[]>)
	/** Toast message on success */
	successMessage?: string
	/** Context for handleMutationError (e.g., "Create property") */
	errorContext: string
	/** Tier 2: set detail cache on success */
	updateDetail?: (
		data: TData
	) => { queryKey: readonly unknown[]; data: TData }
	/** Remove detail cache entry on success (for deletes) */
	removeDetail?: (
		data: TData,
		variables: TVariables
	) => readonly unknown[]
	/** Custom callback after standard operations */
	onSuccessExtra?: (data: TData) => void
	/** When true, use handleMutationSuccess (structured logging) instead of toast.success */
	broadcastSuccess?: boolean
	/** Tier 3: optimistic update config */
	optimistic?: OptimisticConfig<TVariables, TContext>
}

/** Return type when optimistic config is provided (Tier 3) */
interface OptimisticCallbacks<TData, TVariables, TContext> {
	onMutate: (variables: TVariables) => Promise<TContext>
	onSuccess: (data: TData) => void
	onError: (
		error: unknown,
		variables: TVariables,
		context: TContext | undefined
	) => void
	onSettled: (
		data: TData | undefined,
		error: unknown,
		variables: TVariables
	) => void
}

/** Return type for standard callbacks (Tier 1 / Tier 2) */
interface StandardCallbacks<TData, TVariables> {
	onSuccess: (data: TData, variables: TVariables) => void
	onError: (error: unknown) => void
}

/**
 * Creates mutation callback objects for useMutation (Tier 3 optimistic).
 */
export function createMutationCallbacks<TData, TVariables, TContext>(
	queryClient: QueryClient,
	config: MutationCallbackConfig<TData, TVariables, TContext> & {
		optimistic: OptimisticConfig<TVariables, TContext>
	}
): OptimisticCallbacks<TData, TVariables, TContext>

/**
 * Creates mutation callback objects for useMutation (Tier 1 / Tier 2).
 */
export function createMutationCallbacks<
	TData,
	TVariables = unknown,
	TContext = unknown
>(
	queryClient: QueryClient,
	config: MutationCallbackConfig<TData, TVariables, TContext>
): StandardCallbacks<TData, TVariables>

/**
 * Implementation.
 */
export function createMutationCallbacks<
	TData,
	TVariables = unknown,
	TContext = unknown
>(
	queryClient: QueryClient,
	config: MutationCallbackConfig<TData, TVariables, TContext>
):
	| OptimisticCallbacks<TData, TVariables, TContext>
	| StandardCallbacks<TData, TVariables> {
	const showSuccess = () => {
		if (config.broadcastSuccess && config.successMessage) {
			handleMutationSuccess(config.errorContext, config.successMessage)
		} else if (config.successMessage) {
			toast.success(config.successMessage)
		}
	}

	const invalidateAll = (variables: TVariables) => {
		const keys =
			typeof config.invalidate === 'function'
				? config.invalidate(variables)
				: config.invalidate
		for (const key of keys) {
			queryClient.invalidateQueries({ queryKey: key as QueryKey })
		}
	}

	// Tier 3: optimistic updates
	if (config.optimistic) {
		const opt = config.optimistic

		return {
			onMutate: async (variables: TVariables): Promise<TContext> => {
				const cancelKeys =
					typeof opt.cancel === 'function'
						? opt.cancel(variables)
						: opt.cancel

				for (const key of cancelKeys) {
					await queryClient.cancelQueries({
						queryKey: key as QueryKey
					})
				}

				const context = opt.snapshot(queryClient, variables)
				opt.apply?.(queryClient, variables)
				return context
			},
			onSuccess: (data: TData) => {
				showSuccess()
				config.onSuccessExtra?.(data)
			},
			onError: (
				error: unknown,
				_variables: TVariables,
				context: TContext | undefined
			) => {
				if (context) {
					opt.rollback(queryClient, context, _variables)
				}
				handleMutationError(error, config.errorContext)
			},
			onSettled: (
				_data: TData | undefined,
				_error: unknown,
				variables: TVariables
			) => {
				invalidateAll(variables)
			}
		}
	}

	// Tier 1 + Tier 2: standard callbacks
	return {
		onSuccess: (data: TData, variables: TVariables) => {
			if (config.updateDetail) {
				const result = config.updateDetail(data)
				queryClient.setQueryData(result.queryKey, result.data)
			}
			if (config.removeDetail) {
				const queryKey = config.removeDetail(data, variables)
				queryClient.removeQueries({ queryKey })
			}
			invalidateAll(variables)
			showSuccess()
			config.onSuccessExtra?.(data)
		},
		onError: (error: unknown) => {
			handleMutationError(error, config.errorContext)
		}
	}
}
