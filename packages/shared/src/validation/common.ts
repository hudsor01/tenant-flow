/**
 * Common validation schemas and functions
 * Shared across frontend and backend for consistency
 */

import { z } from 'zod'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

/** Email validation schema */
export const emailSchema = z.string().email({ message: 'Please enter a valid email address' })

/** Required non-empty string schema */
export const requiredString = z.string().min(1, 'This field is required')

/** Non-empty string schema with trimming */
export const nonEmptyStringSchema = z.string().trim().min(1, 'This field cannot be empty')

/** Required title schema (1-200 characters) */
export const requiredTitle = z.string().trim().min(1, 'Title is required').max(VALIDATION_LIMITS.TITLE_MAX_LENGTH, `Title cannot exceed ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} characters`)

/** Required description schema (1-2000 characters) */
export const requiredDescription = z.string().trim().min(1, 'Description is required').max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)

/** UUID validation schema */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/** URL validation schema with custom validator */
export const urlSchema = z.string().url({ message: 'Invalid URL format' }).refine(
	(url) => isValidUrl(url),
	{ message: 'URL must use http/https protocol' }
)

/** Non-negative number schema (>= 0) */
export const nonNegativeNumberSchema = z.number().min(0, 'Value must be non-negative')

/** Positive number schema (> 0) */
export const positiveNumberSchema = z.number().positive('Value must be positive')

/** Phone number validation schema */
export const phoneSchema = z
	.string()
	.regex(/^[\d+()-\s]+$/, 'Phone number can only contain digits, +, (), -, and spaces')
	.min(10, 'Phone number must be at least 10 characters')
	.max(VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH, `Phone number cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH} characters`)

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
			process.env["NODE_ENV"] === 'production' &&
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
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	return uuidRegex.test(uuid)
}
