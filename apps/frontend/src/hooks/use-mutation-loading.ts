/**
 * Comprehensive Mutation Loading States
 * Provides consistent loading feedback for all React Query mutations
 */

import {
	useMutation,
	useIsFetching,
	useIsMutating
} from '@tanstack/react-query'
import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
<<<<<<< HEAD
import { logger } from '@/lib/logger/logger'
=======
import { logger } from '@/lib/logger'
>>>>>>> origin/main

interface MutationLoadingOptions<
	TData = unknown,
	TError extends Error = Error
> {
	loadingMessage?: string
	successMessage?: string | ((data: TData) => string)
	errorMessage?: string | ((error: TError) => string)
	showToasts?: boolean
	autoToastSuccess?: boolean
	autoToastError?: boolean
	mutationType?: string
	onSuccess?: (data: TData) => void
	onError?: (error: TError) => void
}

interface MutationState<TData = unknown> {
	isLoading: boolean
	error: Error | null
	data: TData | null
	loadingMessage: string
}

export function useMutationLoading<
	TData = unknown,
	TError extends Error = Error,
	TVariables = void
>(
	mutationFn: (variables: TVariables) => Promise<TData>,
	options: MutationLoadingOptions = {}
) {
	const {
		loadingMessage = 'Processing...',
		successMessage,
		errorMessage = 'An error occurred',
		showToasts = true,
		autoToastSuccess = true,
		autoToastError = true,
		mutationType = 'mutation',
		onSuccess,
		onError
	} = options

	const [state, setState] = useState<MutationState>({
		isLoading: false,
		error: null,
		data: null,
		loadingMessage
	})

	const toastId = useRef<string | number | null>(null)

	const mutation = useMutation<TData, TError, TVariables>({
		mutationFn,
		onMutate: variables => {
			logger.debug('Mutation started', {
				mutationType,
				variables:
					process.env.NODE_ENV === 'development'
						? variables
						: '[hidden]'
			})

			setState(prev => ({
				...prev,
				isLoading: true,
				error: null,
				loadingMessage
			}))

			// Show loading toast if enabled
			if (showToasts && loadingMessage) {
				toastId.current = toast.loading(loadingMessage)
			}
		},
<<<<<<< HEAD
		onSuccess: (data, _variables) => {
=======
		onSuccess: (data, variables) => {
>>>>>>> origin/main
			logger.info('Mutation completed successfully', {
				mutationType,
				data: process.env.NODE_ENV === 'development' ? data : '[hidden]'
			})

			setState(prev => ({
				...prev,
				isLoading: false,
				data,
				error: null
			}))

			// Dismiss loading toast
			if (toastId.current) {
				toast.dismiss(toastId.current)
				toastId.current = null
			}

			// Show success message
			if (showToasts && autoToastSuccess && successMessage) {
				const message =
					typeof successMessage === 'function'
						? successMessage(data)
						: successMessage
				toast.success(message)
			}

			onSuccess?.(data)
		},
		onError: (error, variables) => {
			const errorInstance =
				error instanceof Error ? error : new Error(String(error))

			logger.error('Mutation failed', errorInstance, {
				mutationType,
				variables:
					process.env.NODE_ENV === 'development'
						? variables
						: '[hidden]'
			})

			setState(prev => ({
				...prev,
				isLoading: false,
				error: errorInstance
			}))

			// Dismiss loading toast
			if (toastId.current) {
				toast.dismiss(toastId.current)
				toastId.current = null
			}

			// Show error message
			if (showToasts && autoToastError) {
				const message =
					typeof errorMessage === 'function'
						? errorMessage(error)
						: errorMessage
				toast.error(message)
			}

			onError?.(error)
		}
	})

	const execute = useCallback(
		async (variables: TVariables) => {
			return await mutation.mutateAsync(variables)
		},
		[mutation]
	)

	const reset = useCallback(() => {
		if (toastId.current) {
			toast.dismiss(toastId.current)
			toastId.current = null
		}

		setState({
			isLoading: false,
			error: null,
			data: null,
			loadingMessage
		})

		mutation.reset()
	}, [mutation, loadingMessage])

	return {
		...state,
		execute,
		reset,
		mutate: mutation.mutate,
		mutateAsync: mutation.mutateAsync,
		isError: !!state.error,
		isSuccess: !!state.data && !state.error,
		isPending: mutation.isPending,
		status: mutation.status
	}
}

/**
 * Global mutation loading state tracking
 */
export function useGlobalMutationLoading() {
	const mutatingCount = useIsMutating()
	const fetchingCount = useIsFetching()

	return {
		isMutating: mutatingCount > 0,
		isFetching: fetchingCount > 0,
		isLoading: mutatingCount > 0 || fetchingCount > 0,
		mutatingCount,
		fetchingCount
	}
}

/**
 * Specific mutation loading hooks for common operations
 */

// Property mutations
export function usePropertyMutationLoading<T = unknown>(
	mutationFn: (variables: T) => Promise<unknown>,
	operation: 'create' | 'update' | 'delete'
) {
	return useMutationLoading(mutationFn, {
		loadingMessage: `${operation === 'create' ? 'Creating' : operation === 'update' ? 'Updating' : 'Deleting'} property...`,
		successMessage: data => {
			if (operation === 'create') {
				const property = data as { name?: string } | null | undefined
				return `Property "${property?.name || 'New property'}" created successfully`
			}
<<<<<<< HEAD
			if (operation === 'update') {
				return `Property updated successfully`
			}
=======
			if (operation === 'update') return `Property updated successfully`
>>>>>>> origin/main
			return 'Property deleted successfully'
		},
		errorMessage: `Failed to ${operation} property`,
		mutationType: `property_${operation}`
	})
}

// Tenant mutations
export function useTenantMutationLoading<T = unknown>(
	mutationFn: (variables: T) => Promise<unknown>,
	operation: 'create' | 'update' | 'delete'
) {
	return useMutationLoading(mutationFn, {
		loadingMessage: `${operation === 'create' ? 'Creating' : operation === 'update' ? 'Updating' : 'Deleting'} tenant...`,
		successMessage: data => {
			if (operation === 'create') {
				const tenant = data as
					| { firstName?: string; lastName?: string }
					| null
					| undefined
				return `Tenant "${`${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim() || 'New tenant'}" added successfully`
			}
<<<<<<< HEAD
			if (operation === 'update') {
				return `Tenant updated successfully`
			}
=======
			if (operation === 'update') return `Tenant updated successfully`
>>>>>>> origin/main
			return 'Tenant removed successfully'
		},
		errorMessage: `Failed to ${operation} tenant`,
		mutationType: `tenant_${operation}`
	})
}

// Lease mutations
export function useLeaseMutationLoading<T = unknown>(
	mutationFn: (variables: T) => Promise<unknown>,
	operation: 'create' | 'update' | 'delete'
) {
	return useMutationLoading(mutationFn, {
		loadingMessage: `${operation === 'create' ? 'Creating' : operation === 'update' ? 'Updating' : 'Terminating'} lease...`,
		successMessage: () => {
<<<<<<< HEAD
			if (operation === 'create') {
				return 'Lease created successfully'
			}
			if (operation === 'update') {
				return 'Lease updated successfully'
			}
=======
			if (operation === 'create') return 'Lease created successfully'
			if (operation === 'update') return 'Lease updated successfully'
>>>>>>> origin/main
			return 'Lease terminated successfully'
		},
		errorMessage: `Failed to ${operation} lease`,
		mutationType: `lease_${operation}`
	})
}

// Maintenance mutations
export function useMaintenanceMutationLoading<T = unknown>(
	mutationFn: (variables: T) => Promise<unknown>,
	operation: 'create' | 'update' | 'delete'
) {
	return useMutationLoading(mutationFn, {
		loadingMessage: `${operation === 'create' ? 'Submitting' : operation === 'update' ? 'Updating' : 'Canceling'} maintenance request...`,
		successMessage: () => {
<<<<<<< HEAD
			if (operation === 'create') {
				return 'Maintenance request submitted successfully'
			}
			if (operation === 'update') {
				return 'Maintenance request updated successfully'
			}
=======
			if (operation === 'create')
				return 'Maintenance request submitted successfully'
			if (operation === 'update')
				return 'Maintenance request updated successfully'
>>>>>>> origin/main
			return 'Maintenance request canceled successfully'
		},
		errorMessage: `Failed to ${operation} maintenance request`,
		mutationType: `maintenance_${operation}`
	})
}

// Generic form mutations
export function useFormMutationLoading<T = unknown>(
	mutationFn: (variables: T) => Promise<unknown>,
	formType: string
) {
	return useMutationLoading(mutationFn, {
		loadingMessage: 'Saving...',
		successMessage: `${formType} saved successfully`,
		errorMessage: `Failed to save ${formType.toLowerCase()}`,
		mutationType: `form_${formType}`
	})
}

export default useMutationLoading
