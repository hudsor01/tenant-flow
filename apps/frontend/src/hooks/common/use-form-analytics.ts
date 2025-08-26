'use client'

import { useCallback } from 'react'
import { useAnalytics, type AnalyticsProperties, type EssentialAnalyticsEvent } from './use-analytics'

/**
 * DRY: Reusable Form Analytics Hook
 * Eliminates duplicate analytics patterns across form components
 */
interface UseFormAnalyticsOptions {
  featureName: string
  successEvent: EssentialAnalyticsEvent
  debug?: boolean
}

export function useFormAnalytics({
  featureName,
  successEvent,
  debug = false
}: UseFormAnalyticsOptions) {
  const { track } = useAnalytics({ debug })

  // DRY: Standard form submission success tracking
  const trackFormSuccess = useCallback(
    (properties?: AnalyticsProperties) => {
      track(successEvent, {
        feature_name: featureName,
        ...properties
      })
    },
    [track, successEvent, featureName]
  )

  // DRY: Standard form error tracking  
  const trackFormError = useCallback(
    (error: Error, additionalProperties?: AnalyticsProperties) => {
      const errorMessage = error instanceof Error 
        ? error.message 
        : `${featureName} submission failed`

      track('error_occurred', {
        error_message: errorMessage,
        feature_name: featureName,
        ...additionalProperties
      })
    },
    [track, featureName]
  )

  // DRY: Standard form submission wrapper
  const withFormTracking = useCallback(
    async <T>(
      submitFn: () => Promise<T>,
      successProperties?: AnalyticsProperties
    ): Promise<T> => {
      try {
        const result = await submitFn()
        trackFormSuccess(successProperties)
        return result
      } catch (error) {
        trackFormError(error instanceof Error ? error : new Error('Form submission failed'))
        throw error
      }
    },
    [trackFormSuccess, trackFormError]
  )

  return {
    trackFormSuccess,
    trackFormError, 
    withFormTracking
  }
}