/**
 * Common hooks exports
 * Centralized location for all reusable hooks
 */

export { useLoadingState } from './use-loading-state'
export type { UseLoadingStateOptions } from './use-loading-state'

export { useFormState } from './use-form-state'
export type { UseFormStateOptions } from './use-form-state'

export { useApiCall } from './use-api-call'
export type { UseApiCallOptions } from './use-api-call'

export { useAnalytics } from './use-analytics'
export type { 
  UseAnalyticsOptions,
  UseAnalyticsReturn,
  EssentialAnalyticsEvent,
  AnalyticsProperties 
} from './use-analytics'

// DRY: Form-related analytics and utilities 
export { useFormAnalytics } from './use-form-analytics'
export { usePropertyFormDefaults } from './use-property-form-defaults'