/**
 * Express Request Types
 * Express-specific request type definitions for NestJS backend
 */

import type { AuthUser } from '@repo/shared/types/auth'
import type { Request } from 'express'

// Authenticated request with user attached
export interface AuthenticatedRequest extends Request {
	user: AuthUser
	startTime?: number | undefined
	authUserCache?: AuthUser | null
	// Added by StripeConnectedGuard for ConnectedAccountId decorator
	connectedAccountId?: string
	// Added by OwnerContextInterceptor
	ownerContext?: {
		owner_id: string
		timestamp: string
		route: string
		method: string
	}
	// Added by TenantContextInterceptor
	tenantContext?: {
		tenant_id: string
		authuser_id: string
		status?: string
	}
}
