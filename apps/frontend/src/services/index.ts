/**
 * Service Layer Constants and Utilities
 *
 * Centralized business rules and constants for the application.
 * Services have been replaced with direct React Query hooks.
 */

// Authentication replaced with direct Supabase Auth actions in /lib/actions/auth-actions.ts

/**
 * Business Rule Constants
 *
 * Centralized business rules that can be imported and used
 * across components for consistency.
 */
export const BUSINESS_RULES = {
	PASSWORD: {
		MIN_LENGTH: 8,
		REQUIRE_UPPERCASE: true,
		REQUIRE_LOWERCASE: true,
		REQUIRE_NUMBERS: true,
		REQUIRE_SPECIAL_CHARS: false
	},
	PROPERTY: {
		MAX_UNITS_PER_PROPERTY: 500,
		MIN_RENT_AMOUNT: 0,
		MAX_NAME_LENGTH: 200,
		MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
		ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
	},
	TENANT: {
		MAX_NAME_LENGTH: 100,
		MAX_NOTES_LENGTH: 1000,
		MIN_AGE: 18,
		MAX_TENANTS_PER_UNIT: 10
	},
	LEASE: {
		MIN_DURATION_MONTHS: 1,
		MAX_DURATION_MONTHS: 60,
		MIN_DEPOSIT_AMOUNT: 0
	},
	FILES: {
		MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
		ALLOWED_DOCUMENT_TYPES: [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'image/jpeg',
			'image/png'
		]
	}
} as const

/**
 * Service Error Types
 *
 * Common error types that services can return for consistent error handling.
 */
export const SERVICE_ERRORS = {
	VALIDATION: 'VALIDATION_ERROR',
	NOT_FOUND: 'NOT_FOUND',
	CONFLICT: 'CONFLICT',
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	NETWORK: 'NETWORK_ERROR',
	SERVER: 'SERVER_ERROR',
	UNKNOWN: 'UNKNOWN_ERROR'
} as const

/**
 * Service Status Types
 *
 * Standard status values used across different entities.
 */
export const SERVICE_STATUS = {
	PROPERTY: {
		ACTIVE: 'active',
		INACTIVE: 'inactive',
		MAINTENANCE: 'maintenance',
		SOLD: 'sold'
	},
	TENANT: {
		ACTIVE: 'active',
		INACTIVE: 'inactive',
		FORMER: 'former'
	},
	LEASE: {
		PENDING: 'pending',
		ACTIVE: 'active',
		EXPIRED: 'expired',
		TERMINATED: 'terminated',
		CANCELLED: 'cancelled'
	},
	MAINTENANCE: {
		PENDING: 'pending',
		IN_PROGRESS: 'in_progress',
		COMPLETED: 'completed',
		CANCELLED: 'cancelled'
	},
	UNIT: {
		VACANT: 'vacant',
		OCCUPIED: 'occupied',
		MAINTENANCE: 'maintenance',
		UNAVAILABLE: 'unavailable'
	}
} as const
