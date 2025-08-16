import { Injectable } from '@nestjs/common'

/**
 * Centralized data sanitization service for queue infrastructure
 * Single source of truth for sensitive data redaction - eliminates ALL duplication
 */
@Injectable()
export class DataSanitizationService {
	// Comprehensive list of sensitive fields to redact
	private static readonly SENSITIVE_FIELDS = [
		'password',
		'token',
		'apiKey',
		'secret',
		'privateKey',
		'creditCard',
		'ssn',
		'paymentMethod',
		'bankAccount',
		'idempotencyKey',
		'authorization',
		'accessToken',
		'refreshToken',
		'sessionId',
		'cvv',
		'pin'
	]

	/**
	 * Sanitizes sensitive data from job payloads for safe logging
	 * This is THE ONLY implementation - used by ALL processors and services
	 */
	static sanitize<T>(data: T): Partial<T> {
		if (!data || typeof data !== 'object') {
			return data as Partial<T>
		}

		const sanitized = { ...data } as Record<string, unknown>

		// Replace all sensitive fields with [REDACTED]
		this.SENSITIVE_FIELDS.forEach(field => {
			if (field in sanitized) {
				sanitized[field] = '[REDACTED]'
			}
			// Also check for camelCase, snake_case, and UPPER_CASE variants
			const variants = [
				field,
				field.toLowerCase(),
				field.toUpperCase(),
				field.replace(/([A-Z])/g, '_$1').toLowerCase() // camelCase to snake_case
			]
			variants.forEach(variant => {
				if (variant in sanitized) {
					sanitized[variant] = '[REDACTED]'
				}
			})
		})

		// Recursively sanitize nested objects
		Object.keys(sanitized).forEach(key => {
			if (
				sanitized[key] &&
				typeof sanitized[key] === 'object' &&
				!Array.isArray(sanitized[key])
			) {
				sanitized[key] = this.sanitize(sanitized[key])
			}
		})

		return sanitized as Partial<T>
	}
}
