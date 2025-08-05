import { SetMetadata } from '@nestjs/common'

export const FEATURE_REQUIRED_KEY = 'feature_required'

/**
 * Decorator to require specific feature access for endpoints
 * Usage: @FeatureRequired('data_export')
 */
export const FeatureRequired = (feature: string) => SetMetadata(FEATURE_REQUIRED_KEY, feature)

// Predefined feature constants for type safety
export const FEATURES = {
  DATA_EXPORT: 'data_export',
  ADVANCED_ANALYTICS: 'advanced_analytics', 
  BULK_OPERATIONS: 'bulk_operations',
  API_ACCESS: 'api_access',
  TEAM_COLLABORATION: 'team_collaboration',
  PREMIUM_INTEGRATIONS: 'premium_integrations'
} as const

export type FeatureType = typeof FEATURES[keyof typeof FEATURES]