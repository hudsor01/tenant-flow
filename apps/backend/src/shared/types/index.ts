/**
 * Backend-specific type definitions
 * Common types are imported from @repo/shared for frontend/backend reuse
 */

import type { FastifyRequest } from 'fastify'
import type { JwtPayload, ValidatedUser } from '@repo/shared'

// Utility types
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>

// Re-export common types from shared
export type {
	ControllerApiResponse,
	LeaseStatus,
	PropertyType,
	MaintenanceStatus,
	MaintenancePriority,
	UserRole,
	ValidatedUser,
	JwtPayload
} from '@repo/shared'

export interface AuthRequest extends FastifyRequest {
	user?: ValidatedUser & {
		supabaseToken?: string
	}
	jwt?: JwtPayload
}

export interface PerformanceMetadata {
	threshold?: number
	metric?: string
	target?: object
	propertyKey?: string | symbol
	descriptor?: PropertyDescriptor
}
