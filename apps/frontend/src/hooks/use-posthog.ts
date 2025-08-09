'use client'

import { usePostHog as usePostHogBase } from 'posthog-js/react'
import { useCallback } from 'react'
import type { User } from '@/types/auth'

// Custom event types for TenantFlow
export type TenantFlowEvent = 
  // Authentication Events
  | 'user_signed_up'
  | 'user_signed_in'
  | 'user_signed_out'
  | 'user_login_failed'
  | 'user_signup_failed'
  | 'user_oauth_failed'
  | 'user_oauth_initiated'
  | 'password_reset_requested'
  | 'password_reset_completed'
  
  // Property Management Events
  | 'property_created'
  | 'property_updated'
  | 'property_deleted'
  | 'property_viewed'
  
  // Unit Management Events
  | 'unit_created'
  | 'unit_updated'
  | 'unit_deleted'
  | 'unit_viewed'
  
  // Tenant Management Events
  | 'tenant_created'
  | 'tenant_updated'
  | 'tenant_deleted'
  | 'tenant_viewed'
  | 'tenant_invited'
  
  // Lease Management Events
  | 'lease_created'
  | 'lease_updated'
  | 'lease_renewed'
  | 'lease_terminated'
  | 'lease_viewed'
  | 'lease_document_uploaded'
  
  // Maintenance Events
  | 'maintenance_request_created'
  | 'maintenance_request_updated'
  | 'maintenance_request_completed'
  | 'maintenance_request_viewed'
  
  // Payment Events
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  
  // Feature Usage Events
  | 'dashboard_viewed'
  | 'report_generated'
  | 'document_uploaded'
  | 'notification_sent'
  | 'settings_updated'
  
  // Form Events
  | 'form_viewed'
  | 'form_submitted'
  | 'form_validation_failed'
  | 'form_submission_failed'
  
  // Error Events
  | 'error_occurred'
  | 'api_error'
  | 'validation_error'

export interface EventProperties {
  [key: string]: any
  error_message?: string
  error_code?: string
  user_id?: string
  organization_id?: string
  property_id?: string
  unit_id?: string
  tenant_id?: string
  lease_id?: string
  amount?: number
  currency?: string
}

export function usePostHog() {
  const posthog = usePostHogBase()

  // Track custom events with consistent naming
  const trackEvent = useCallback((
    event: TenantFlowEvent,
    properties?: EventProperties
  ) => {
    if (!posthog) return
    
    // Add consistent metadata to all events
    const enrichedProperties = {
      ...properties,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NEXT_PUBLIC_APP_ENV,
      timestamp: new Date().toISOString(),
    }
    
    posthog.capture(event, enrichedProperties)
  }, [posthog])

  // Identify user with properties
  const identifyUser = useCallback((
    user: User | null,
    organizationId?: string
  ) => {
    if (!posthog || !user) return
    
    posthog.identify(user.id, {
      email: user.email,
      created_at: user.createdAt,
      organization_id: organizationId,
    })
  }, [posthog])

  // Reset user identification on logout
  const resetUser = useCallback(() => {
    if (!posthog) return
    posthog.reset()
  }, [posthog])

  // Track conversion goals
  const trackConversion = useCallback((
    goalName: string,
    value?: number,
    properties?: EventProperties
  ) => {
    if (!posthog) return
    
    posthog.capture('conversion_goal', {
      goal_name: goalName,
      goal_value: value,
      ...properties,
    })
  }, [posthog])

  // Track errors with context
  const trackError = useCallback((
    error: Error | unknown,
    context?: EventProperties
  ) => {
    if (!posthog) return
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    posthog.capture('error_occurred', {
      error_message: errorMessage,
      error_stack: errorStack,
      error_type: error instanceof Error ? error.name : 'UnknownError',
      ...context,
    })
  }, [posthog])

  // Check feature flag status
  const isFeatureEnabled = useCallback((
    flagKey: string,
    fallback: boolean = false
  ): boolean => {
    if (!posthog) return fallback
    return posthog.isFeatureEnabled(flagKey) ?? fallback
  }, [posthog])

  // Get feature flag payload
  const getFeatureFlagPayload = useCallback((flagKey: string) => {
    if (!posthog) return null
    return posthog.getFeatureFlagPayload(flagKey)
  }, [posthog])

  // Track timing metrics
  const trackTiming = useCallback((
    category: string,
    variable: string,
    time: number,
    label?: string
  ) => {
    if (!posthog) return
    
    posthog.capture('timing_metric', {
      timing_category: category,
      timing_variable: variable,
      timing_time: time,
      timing_label: label,
    })
  }, [posthog])

  return {
    posthog,
    trackEvent,
    identifyUser,
    resetUser,
    trackConversion,
    trackError,
    isFeatureEnabled,
    getFeatureFlagPayload,
    trackTiming,
  }
}