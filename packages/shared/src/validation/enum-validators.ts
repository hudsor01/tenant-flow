/**
 * Shared Enum Validation Utilities
 *
 * Centralized validation for enum types used across the application.
 * Eliminates duplicate validation logic in controllers and services.
 */

// Lease Status Validation

/**
 * Valid lease status values (must match database enum)
 */
export const VALID_LEASE_STATUSES = [
	'draft',
	'pending_signature',
	'active',
	'ended',
	'terminated'
] as const

export type LeaseStatus = typeof VALID_LEASE_STATUSES[number]

/**
 * Type guard for lease status validation
 * Avoids unsafe casting by checking against string array
 */
export function isValidLeaseStatus(status: string): status is LeaseStatus {
	return (VALID_LEASE_STATUSES as readonly string[]).includes(status)
}

/**
 * Validate lease status and throw error if invalid
 * @param status - The status value to validate
 * @returns The validated status
 * @throws Error if status is invalid
 */
export function validateLeaseStatus(status: string): LeaseStatus {
	if (!isValidLeaseStatus(status)) {
		throw new Error(
			`Invalid lease status: ${status}. Valid values are: ${VALID_LEASE_STATUSES.join(', ')}`
		)
	}
	return status
}

// Unit Status Validation

/**
 * Valid unit status values (must match database enum)
 */
export const VALID_UNIT_STATUSES = [
	'available',
	'occupied',
	'maintenance',
	'reserved'
] as const

export type UnitStatus = typeof VALID_UNIT_STATUSES[number]

/**
 * Type guard for unit status validation
 * Avoids unsafe casting by checking against string array
 */
export function isValidUnitStatus(status: string): status is UnitStatus {
	return (VALID_UNIT_STATUSES as readonly string[]).includes(status)
}

/**
 * Validate unit status and throw error if invalid
 * @param status - The status value to validate
 * @returns The validated status
 * @throws Error if status is invalid
 */
export function validateUnitStatus(status: string): UnitStatus {
	if (!isValidUnitStatus(status)) {
		throw new Error(
			`Invalid unit status: ${status}. Valid values are: ${VALID_UNIT_STATUSES.join(', ')}`
		)
	}
	return status
}

// Case-Insensitive Normalization

/**
 * Normalize status values to lowercase (handles mixed case input)
 * @param status - The status value to normalize
 * @returns Normalized lowercase status
 */
export function normalizeStatus(status: string): string {
	return status.toLowerCase()
}

/**
 * Validate and normalize lease status
 * @param status - The status value to validate and normalize
 * @returns Normalized and validated lease status
 */
export function validateAndNormalizeLeaseStatus(status: string): LeaseStatus {
	const normalized = normalizeStatus(status)
	return validateLeaseStatus(normalized)
}

/**
 * Validate and normalize unit status
 * @param status - The status value to validate and normalize
 * @returns Normalized and validated unit status
 */
export function validateAndNormalizeUnitStatus(status: string): UnitStatus {
	const normalized = normalizeStatus(status)
	return validateUnitStatus(normalized)
}
