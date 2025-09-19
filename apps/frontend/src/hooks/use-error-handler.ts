/**
 * React hooks for consistent error handling across the application
 * Provides standardized error handling patterns for TanStack Query mutations
 */

import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { createMutationErrorHandler, type ErrorContext } from '@/lib/error-handler'

/**
 * Enhanced useMutation hook with automatic error handling
 */
export function useMutationWithErrorHandling<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    operation: string
    entityType?: ErrorContext['entityType']
  }
) {
  const { operation, entityType, onError, ...mutationOptions } = options

  return useMutation({
    ...mutationOptions,
    onError: (error, variables, context) => {
      // Call the centralized error handler
      createMutationErrorHandler(operation, entityType)(error)

      // Call the original onError if provided
      if (onError) {
        onError(error, variables, context)
      }
    },
    meta: {
      operation,
      entityType,
      ...options.meta
    }
  })
}

/**
 * Hook for handling form validation errors
 */
export function useFormErrorHandler() {
  return {
    handleValidationError: (errors: Record<string, { message?: string }>) => {
      const firstError = Object.values(errors)[0]
      const message = firstError?.message || 'Please check your input and try again'

      createMutationErrorHandler('validate form', undefined)({
        message,
        name: 'ValidationError'
      })
    },

    handleSubmitError: (error: unknown, operation: string = 'submit form') => {
      createMutationErrorHandler(operation, undefined)(error)
    }
  }
}

/**
 * Hook for handling async operations outside of TanStack Query
 */
export function useAsyncErrorHandler() {
  return {
    withErrorHandling: async <T>(
      operation: () => Promise<T>,
      context: ErrorContext
    ): Promise<T | null> => {
      try {
        return await operation()
      } catch (error) {
        createMutationErrorHandler(
          context.operation || 'async operation',
          context.entityType
        )(error)
        return null
      }
    }
  }
}

/**
 * Hook for handling specific error types with custom logic
 */
export function useCustomErrorHandler() {
  return {
    handleAuthError: (error: unknown) => {
      createMutationErrorHandler('authenticate', 'user')(error)
      // Additional auth-specific logic could go here
      // e.g., redirect to login page
    },

    handlePaymentError: (error: unknown) => {
      createMutationErrorHandler('process payment', undefined)(error)
      // Additional payment-specific logic could go here
    },

    handleNetworkError: (error: unknown) => {
      createMutationErrorHandler('network request', undefined)(error)
      // Additional network-specific logic could go here
    }
  }
}