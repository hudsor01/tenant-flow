/**
 * Common validation schemas and functions
 * Shared across frontend and backend for consistency
 *
 * Zod 4 Best Practices:
 * - Use top-level validators: z.email(), z.uuid(), z.url() (not z.string().email())
 * - Use z.stringbool() for env-style boolean parsing
 * - Use z.file() for file upload validation
 * - Use .meta() for schema documentation
 */

import { z } from 'zod'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// ============================================================================
// TOP-LEVEL STRING FORMAT VALIDATORS (Zod 4)
// ============================================================================

/**
 * Email validation schema (Zod 4 top-level)
 * @example emailSchema.parse('user@example.com')
 */
export const emailSchema = z
	.email({ message: 'Please enter a valid email address' })
	.meta({
		description: 'Valid email address',
		examples: ['user@example.com', 'admin@tenantflow.com']
	})

/**
 * UUID validation schema (Zod 4 top-level)
 * RFC 9562/4122 compliant UUID validation
 * @example uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')
 */
export const uuidSchema = z
	.uuid({ message: 'Invalid UUID format' })
	.meta({
		description: 'RFC 4122 compliant UUID identifier',
		examples: ['550e8400-e29b-41d4-a716-446655440000'],
		format: 'uuid'
	})

/**
 * URL validation schema with security checks
 * Only allows http/https protocols, blocks localhost in production
 */
export const urlSchema = z
	.url({ message: 'Invalid URL format' })
	.refine(url => isValidUrl(url), {
		message: 'URL must use http/https protocol'
	})
	.meta({
		description: 'Valid HTTP/HTTPS URL',
		examples: ['https://example.com', 'https://tenantflow.com/properties'],
		format: 'uri'
	})

// ============================================================================
// STRING SCHEMAS
// ============================================================================

/** Required non-empty string schema */
export const requiredString = z.string().min(1, 'This field is required')

/** Non-empty string schema with trimming */
export const nonEmptyStringSchema = z
	.string()
	.trim()
	.min(1, 'This field cannot be empty')

/** Required title schema (1-200 characters) */
export const requiredTitle = z
	.string()
	.trim()
	.min(1, 'Title is required')
	.max(
		VALIDATION_LIMITS.TITLE_MAX_LENGTH,
		`Title cannot exceed ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} characters`
	)

/** Required description schema (1-2000 characters) */
export const requiredDescription = z
	.string()
	.trim()
	.min(1, 'Description is required')
	.max(
		VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
		`Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`
	)

// ============================================================================
// NUMBER SCHEMAS
// ============================================================================

/** Non-negative number schema (>= 0) */
export const nonNegativeNumberSchema = z
	.number()
	.min(0, 'Value must be non-negative')

/** Positive number schema (> 0) */
export const positiveNumberSchema = z
	.number()
	.positive('Value must be positive')

/**
 * Safe integer schema (Zod 4)
 * Validates integers within JavaScript's safe integer range
 */
export const safeIntegerSchema = z.int({ message: 'Must be a valid integer' })

// ============================================================================
// PHONE SCHEMA
// ============================================================================

/** Phone number validation schema */
export const phoneSchema = z
	.string()
	.regex(
		/^[\d+()-\s]+$/,
		'Phone number can only contain digits, +, (), -, and spaces'
	)
	.min(10, 'Phone number must be at least 10 characters')
	.max(
		VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH,
		`Phone number cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH} characters`
	)
	.meta({
		description: 'Phone number with optional formatting',
		examples: ['+1 (555) 123-4567', '555-123-4567', '5551234567'],
		format: 'phone'
	})

// ============================================================================
// BOOLEAN COERCION (Zod 4)
// ============================================================================

/**
 * Environment-style boolean parsing (Zod 4)
 * Parses string values to boolean:
 * - true: "true", "1", "yes", "on", "y", "enabled"
 * - false: "false", "0", "no", "off", "n", "disabled"
 *
 * @example stringBoolSchema.parse("true") // => true
 * @example stringBoolSchema.parse("0") // => false
 */
export const stringBoolSchema = z.stringbool()

/**
 * Optional string boolean with default false
 * Useful for query params and form checkboxes
 */
export const optionalStringBool = z.stringbool().optional().default(false)

// ============================================================================
// FILE VALIDATION (Zod 4)
// ============================================================================

/**
 * Base file schema for file uploads
 * Use .min(), .max() for size limits and .mime() for type restrictions
 */
export const fileSchema = z.file()

/**
 * Image file validation schema
 * Accepts common image formats up to 5MB
 */
export const imageFileSchema = z
	.file()
	.max(5 * 1024 * 1024, 'Image must be less than 5MB')
	.mime(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
		message: 'File must be an image (JPEG, PNG, GIF, or WebP)'
	})
	.meta({
		description: 'Image file upload (JPEG, PNG, GIF, WebP)',
		contentMediaType: 'image/*',
		maxSize: 5242880 // 5MB in bytes
	})

/**
 * Document file validation schema
 * Accepts PDF and common document formats up to 10MB
 */
export const documentFileSchema = z
	.file()
	.max(10 * 1024 * 1024, 'Document must be less than 10MB')
	.mime(
		[
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		],
		{ message: 'File must be a document (PDF or Word)' }
	)
	.meta({
		description: 'Document file upload (PDF, Word)',
		contentMediaType: 'application/pdf',
		maxSize: 10485760 // 10MB in bytes
	})

/**
 * Lease document file validation schema
 * Accepts PDF only, up to 20MB for signed lease agreements
 */
export const leaseDocumentSchema = z
	.file()
	.max(20 * 1024 * 1024, 'Lease document must be less than 20MB')
	.mime(['application/pdf'], { message: 'Lease must be a PDF document' })
	.meta({
		description: 'Lease agreement PDF upload',
		contentMediaType: 'application/pdf',
		maxSize: 20971520 // 20MB in bytes
	})

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate URL format and security
 */
export function isValidUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url)

		// Only allow http and https protocols
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			return false
		}

		// Prevent localhost in production
		if (
			process.env['NODE_ENV'] === 'production' &&
			(parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
		) {
			return false
		}

		return true
	} catch {
		return false
	}
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	return uuidRegex.test(uuid)
}

// ============================================================================
// JSON SCHEMA EXPORT (Zod 4)
// ============================================================================

/**
 * Convert a Zod schema to JSON Schema format
 * Useful for API documentation and OpenAPI specs
 *
 * @example
 * const jsonSchema = toJSONSchema(userSchema)
 * // Use in OpenAPI/Swagger documentation
 */
export const toJSONSchema = z.toJSONSchema
