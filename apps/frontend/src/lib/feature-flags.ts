'use client';

import { usePostHog } from '@/hooks/use-posthog';
import { useCallback, useEffect } from 'react';

/**
 * Feature flags configuration for TenantFlow
 * Business-focused experiments and rollouts
 */
export const FEATURE_FLAGS = {
  // Property Management Optimization
  NEW_PROPERTY_FORM_V2: 'new_property_form_v2',
  PROPERTY_BULK_ACTIONS: 'property_bulk_actions',
  PROPERTY_AUTO_VALUATION: 'property_auto_valuation',
  
  // Tenant Experience
  TENANT_SELF_SERVICE_PORTAL: 'tenant_self_service_portal',
  TENANT_PAYMENT_REMINDERS: 'tenant_payment_reminders',
  TENANT_MAINTENANCE_PHOTOS: 'tenant_maintenance_photos',
  
  // Maintenance Workflow
  MAINTENANCE_AUTO_ASSIGNMENT: 'maintenance_auto_assignment',
  MAINTENANCE_PRIORITY_SCORING: 'maintenance_priority_scoring',
  MAINTENANCE_VENDOR_RATINGS: 'maintenance_vendor_ratings',
  
  // Financial Features  
  RENT_COLLECTION_AUTOMATION: 'rent_collection_automation',
  LATE_FEE_AUTO_CALCULATION: 'late_fee_auto_calculation',
  FINANCIAL_REPORTING_V2: 'financial_reporting_v2',
  
  // User Experience
  DASHBOARD_REDESIGN_V2: 'dashboard_redesign_v2',
  MOBILE_APP_PROMOTION: 'mobile_app_promotion',
  ONBOARDING_FLOW_V3: 'onboarding_flow_v3',
  
  // Performance & Technical
  LAZY_LOADING_OPTIMIZATION: 'lazy_loading_optimization',
  API_CACHING_STRATEGY: 'api_caching_strategy',
  REAL_TIME_NOTIFICATIONS: 'real_time_notifications',
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/**
 * Hook for feature flag management with PostHog integration
 */
export function useFeatureFlags() {
  const { posthog } = usePostHog();

  /**
   * Check if a feature flag is enabled
   */
  const isFeatureEnabled = useCallback((flag: FeatureFlagKey): boolean => {
    if (!posthog) return false;
    return posthog.isFeatureEnabled(flag) === true;
  }, [posthog]);

  /**
   * Get feature flag variant (for A/B testing)
   */
  const getFeatureVariant = useCallback((flag: FeatureFlagKey): string | boolean => {
    if (!posthog) return false;
    return posthog.getFeatureFlag(flag) || false;
  }, [posthog]);

  /**
   * Track feature flag exposure
   */
  const trackFeatureFlagExposure = useCallback((flag: FeatureFlagKey, context?: Record<string, any>) => {
    if (!posthog) return;
    
    posthog.capture('feature_flag_called', {
      flag_key: flag,
      flag_value: posthog.getFeatureFlag(flag),
      context,
    });
  }, [posthog]);

  /**
   * Reload feature flags from PostHog
   */
  const reloadFeatureFlags = useCallback(async () => {
    if (!posthog) return;
    await posthog.reloadFeatureFlags();
  }, [posthog]);

  return {
    isFeatureEnabled,
    getFeatureVariant,
    trackFeatureFlagExposure,
    reloadFeatureFlags,
  };
}

/**
 * Property Form Optimization Experiment
 */
export function usePropertyFormExperiment() {
  const { isFeatureEnabled, getFeatureVariant, trackFeatureFlagExposure } = useFeatureFlags();
  
  const isNewFormEnabled = isFeatureEnabled(FEATURE_FLAGS.NEW_PROPERTY_FORM_V2);
  const variant = getFeatureVariant(FEATURE_FLAGS.NEW_PROPERTY_FORM_V2);

  useEffect(() => {
    if (isNewFormEnabled) {
      trackFeatureFlagExposure(FEATURE_FLAGS.NEW_PROPERTY_FORM_V2, {
        variant,
        page: 'property_form',
      });
    }
  }, [isNewFormEnabled, variant, trackFeatureFlagExposure]);

  return {
    useNewForm: isNewFormEnabled,
    variant,
  };
}

/**
 * Maintenance Auto-Assignment Experiment
 */
export function useMaintenanceExperiment() {
  const { isFeatureEnabled, getFeatureVariant, trackFeatureFlagExposure } = useFeatureFlags();
  
  const isAutoAssignEnabled = isFeatureEnabled(FEATURE_FLAGS.MAINTENANCE_AUTO_ASSIGNMENT);
  const variant = getFeatureVariant(FEATURE_FLAGS.MAINTENANCE_AUTO_ASSIGNMENT);

  useEffect(() => {
    if (isAutoAssignEnabled) {
      trackFeatureFlagExposure(FEATURE_FLAGS.MAINTENANCE_AUTO_ASSIGNMENT, {
        variant,
        context: 'maintenance_workflow',
      });
    }
  }, [isAutoAssignEnabled, variant, trackFeatureFlagExposure]);

  return {
    useAutoAssignment: isAutoAssignEnabled,
    variant,
  };
}

/**
 * Tenant Payment Reminders Experiment
 */
export function useTenantPaymentExperiment() {
  const { isFeatureEnabled, getFeatureVariant, trackFeatureFlagExposure } = useFeatureFlags();
  
  const isPaymentRemindersEnabled = isFeatureEnabled(FEATURE_FLAGS.TENANT_PAYMENT_REMINDERS);
  const variant = getFeatureVariant(FEATURE_FLAGS.TENANT_PAYMENT_REMINDERS);

  useEffect(() => {
    if (isPaymentRemindersEnabled) {
      trackFeatureFlagExposure(FEATURE_FLAGS.TENANT_PAYMENT_REMINDERS, {
        variant,
        context: 'payment_flow',
      });
    }
  }, [isPaymentRemindersEnabled, variant, trackFeatureFlagExposure]);

  return {
    usePaymentReminders: isPaymentRemindersEnabled,
    variant,
    getReminderFrequency: () => {
      // A/B test different reminder frequencies
      switch (variant) {
        case 'aggressive': return 'daily';
        case 'moderate': return 'weekly';  
        case 'gentle': return 'monthly';
        default: return 'weekly';
      }
    },
  };
}

/**
 * Dashboard Redesign Experiment
 */
export function useDashboardExperiment() {
  const { isFeatureEnabled, getFeatureVariant, trackFeatureFlagExposure } = useFeatureFlags();
  
  const isRedesignEnabled = isFeatureEnabled(FEATURE_FLAGS.DASHBOARD_REDESIGN_V2);
  const variant = getFeatureVariant(FEATURE_FLAGS.DASHBOARD_REDESIGN_V2);

  useEffect(() => {
    if (isRedesignEnabled) {
      trackFeatureFlagExposure(FEATURE_FLAGS.DASHBOARD_REDESIGN_V2, {
        variant,
        page: 'dashboard',
      });
    }
  }, [isRedesignEnabled, variant, trackFeatureFlagExposure]);

  return {
    useNewDashboard: isRedesignEnabled,
    variant,
  };
}