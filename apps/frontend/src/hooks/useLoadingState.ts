import React from 'react'
import type { LoaderError } from '@/components/common/LoaderComponents'

/**
 * Hook for managing loading states in components
 */
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState)
  const [error, setError] = React.useState<LoaderError | null>(null)
  
  const startLoading = React.useCallback(() => {
    setIsLoading(true)
    setError(null)
  }, [])
  
  const stopLoading = React.useCallback(() => {
    setIsLoading(false)
  }, [])
  
  const setLoadingError = React.useCallback((error: LoaderError) => {
    setError(error)
    setIsLoading(false)
  }, [])
  
  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
  }
}