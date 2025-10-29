/**
 * Common validation schemas and functions
 * Shared across frontend and backend for consistency
 */

import { z } from 'zod'

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/** Email validation schema */
export const emailSchema = z.string().email('Please enter a valid email address')

/** Required non-empty string schema */
export const requiredString = z.string().min(1, 'This field is required')

/** Non-empty string schema with trimming */
export const nonEmptyStringSchema = z.string().trim().min(1, 'This field cannot be empty')

/** Required title schema (1-200 characters) */
export const requiredTitle = z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters')

/** Required description schema (1-2000 characters) */
export const requiredDescription = z.string().trim().min(1, 'Description is required').max(2000, 'Description cannot exceed 2000 characters')

/** UUID validation schema */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/** URL validation schema with custom validator */
export const urlSchema = z.string().url('Invalid URL format').refine(
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
	.max(20, 'Phone number cannot exceed 20 characters')

// ============================================================================
// VALIDATION FUNCTIONS
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
			process.env.NODE_ENV === 'production' &&
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
 * Validate Stripe session ID format
 */
export function isValidStripeSessionId(sessionId: string): boolean {
	const sessionIdRegex = /^cs_[a-zA-Z0-9_-]{24,}$/
	return sessionIdRegex.test(sessionId)
}