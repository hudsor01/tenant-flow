/**
 * Express Request Types
 * Express-specific request type definitions for NestJS backend
 */

import type { authUser } from '@repo/shared/types/auth'
import type { Request } from 'express'

// Authenticated request with user attached
export interface AuthenticatedRequest extends Request {
	user: authUser
	startTime?: number | undefined
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

// Combined authenticated request with raw body support
// Note: For webhook-only endpoints, use RawBodyRequest<Request> from '@nestjs/common'
export interface AuthenticatedRawRequest extends AuthenticatedRequest {
	rawBody?: Buffer
}

// Organization-scoped request
export interface OrganizationRequest extends AuthenticatedRequest {
	organizationId: string
}

// Request with timing information
export interface TimedRequest extends Request {
	startTime: number
	duration?: number
}

// Security context for request monitoring
export interface SecurityContextRequest extends Request {
	securityContext?: {
		riskLevel: 'low' | 'medium' | 'high'
		ipAddress: string
		userAgent?: string
		timestamp: Date
	}
}
