import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import type { Database } from '@repo/shared/types/supabase'
import { createThrottleDefaults } from '../../config/throttle.config'

// Extended request interface for tenant context
export interface TenantAuthenticatedRequest extends AuthenticatedRequest {
	tenant?: Database['public']['Tables']['tenants']['Row']
}

/**
 * Rate limiting for Stripe API endpoints
 * Subscription status checks are cached client-side (5min), so limit server calls
 */
export const STRIPE_API_THROTTLE = createThrottleDefaults({
	envTtlKey: 'STRIPE_API_THROTTLE_TTL',
	envLimitKey: 'STRIPE_API_THROTTLE_LIMIT',
	defaultTtl: 60000, // 60 seconds
	defaultLimit: 20 // 20 requests per minute (generous for cached frontend queries)
})
