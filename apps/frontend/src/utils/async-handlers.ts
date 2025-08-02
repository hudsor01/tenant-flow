/**
 * React 19 Async Event Handler Utilities
 * 
 * This module provides utilities for handling async operations in React 19
 * event handlers while maintaining proper error handling and type safety.
 */

import { useTransition, useCallback } from 'react'
import { toast } from 'sonner'

/**
 * Type-safe wrapper for async event handlers that need to return void
 */
export function createAsyncHandler<T extends unknown[]>(
  asyncFn: (...args: T) => Promise<void>,
  errorMessage?: string
): (...args: T) => void {
  return (...args: T) => {
    // Use void operator to explicitly mark promise as intentionally unhandled
    void asyncFn(...args).catch((error) => {
      console.error('Async handler error:', error)
      toast.error(errorMessage || 'An error occurred. Please try again.')
    })
  }
}

/**
 * React 19 hook for async form submissions with transitions
 */
export function useAsyncFormHandler<T extends unknown[]>(
  asyncFn: (...args: T) => Promise<void>,
  options?: {
    errorMessage?: string
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
) {
  const [isPending, startTransition] = useTransition()

  const handler = useCallback((...args: T) => {
    startTransition(() => {
      void asyncFn(...args)
        .then(() => {
          options?.onSuccess?.()
        })
        .catch((error) => {
          console.error('Async form handler error:', error)
          const errorMessage = options?.errorMessage || 'An error occurred. Please try again.'
          toast.error(errorMessage)
          options?.onError?.(error as Error)
        })
    })
  }, [asyncFn, options])

  return {
    handler,
    isPending
  }
}

/**
 * React 19 hook for async click handlers with optimistic updates
 */
export function useAsyncClickHandler<T extends unknown[]>(
  asyncFn: (...args: T) => Promise<void>,
  options?: {
    errorMessage?: string
    optimisticUpdate?: () => void
    revertUpdate?: () => void
  }
) {
  const [isPending, startTransition] = useTransition()

  const handler = useCallback((...args: T) => {
    startTransition(() => {
      // Apply optimistic update immediately
      options?.optimisticUpdate?.()

      void asyncFn(...args).catch((error) => {
        // Revert optimistic update on error
        options?.revertUpdate?.()
        
        console.error('Async click handler error:', error)
        const errorMessage = options?.errorMessage || 'An error occurred. Please try again.'
        toast.error(errorMessage)
      })
    })
  }, [asyncFn, options])

  return {
    handler,
    isPending
  }
}

/**
 * Safe no-op function for empty handlers
 */
export const noOpHandler = (): void => {
  // Intentionally empty - used as a safe placeholder
}

/**
 * Type-safe promise wrapper that explicitly handles floating promises
 */
export function handlePromise<T>(
  promise: Promise<T>,
  errorMessage?: string
): void {
  void promise.catch((error) => {
    console.error('Promise error:', error)
    if (errorMessage) {
      toast.error(errorMessage)
    }
  })
}

/**
 * React 19 pattern for form actions with built-in error handling
 */
export function createFormAction<T extends FormData | Record<string, unknown>>(
  actionFn: (data: T) => Promise<void>,
  options?: {
    errorMessage?: string
    onSuccess?: () => void
  }
) {
  return async (data: T): Promise<void> => {
    try {
      await actionFn(data)
      options?.onSuccess?.()
    } catch (error) {
      console.error('Form action error:', error)
      const errorMessage = options?.errorMessage || 'An error occurred. Please try again.'
      toast.error(errorMessage)
      throw error // Re-throw to maintain error state in useActionState
    }
  }
}