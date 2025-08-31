/**
 * Unified Error Handling System - SIMPLIFIED
 * Following KISS principle with single configuration object
 */

import { logger } from '@/lib/logger/logger'
import { toast } from 'sonner'
import { sanitizeErrorMessage } from './auth/error-sanitizer'
import type {
	AppError,
	ErrorContext
} from '@repo/shared'

// ============================================
// Single Configuration Object (KISS)
// ============================================

type ErrorType =
	| 'AUTH_ERROR'
	| 'PAYMENT_ERROR'
	| 'VALIDATION_ERROR'
	| 'NETWORK_ERROR'
	| 'FILE_UPLOAD_ERROR'
	| 'BUSINESS_ERROR'
	| 'SERVER_ERROR'

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

interface ErrorConfig {
	severity: ErrorSeverity
	retryable: boolean
	defaultMessage: string
	suggestions: string[]
	toastType: 'info' | 'success' | 'warning' | 'error'
}

// Single source of truth for all error configurations
const ERROR_CONFIG: Record<ErrorType, ErrorConfig> = {
	AUTH_ERROR: {
		severity: 'high',
		retryable: false,
		defaultMessage: 'Authentication required',
		suggestions: ['Please sign in again', 'Check your credentials'],
		toastType: 'error'
	},
	PAYMENT_ERROR: {
		severity: 'high',
		retryable: false,
		defaultMessage: 'Payment processing failed',
		suggestions: ['Check payment details', 'Contact support'],
		toastType: 'error'
	},
	VALIDATION_ERROR: {
		severity: 'medium',
		retryable: false,
		defaultMessage: 'Please check your input',
		suggestions: ['Review form fields', 'Check required fields'],
		toastType: 'warning'
	},
	NETWORK_ERROR: {
		severity: 'medium',
		retryable: true,
		defaultMessage: 'Connection failed',
		suggestions: ['Check internet connection', 'Try again later'],
		toastType: 'warning'
	},
	FILE_UPLOAD_ERROR: {
		severity: 'medium',
		retryable: true,
		defaultMessage: 'File upload failed',
		suggestions: ['Check file size', 'Try a different format'],
		toastType: 'warning'
	},
	BUSINESS_ERROR: {
		severity: 'low',
		retryable: false,
		defaultMessage: 'Operation not allowed',
		suggestions: ['Review business rules', 'Contact admin'],
		toastType: 'info'
	},
	SERVER_ERROR: {
		severity: 'high',
		retryable: true,
		defaultMessage: 'Something went wrong',
		suggestions: ['Try again', 'Contact support if persists'],
		toastType: 'error'
	}
}

// ============================================
// Extended Error Type
// ============================================

export interface ExtendedAppError extends Error {
	type: ErrorType
	code: AppError['code']
	statusCode?: number
	severity: ErrorSeverity
	retryable: boolean
	fields?: Record<string, string[]>
	userMessage: string
	suggestions: string[]
	context?: ErrorContext
}

export type AsyncResult<T> =
	| { success: true; data: T }
	| { success: false; error: ExtendedAppError }

// ============================================
// Simplified Error Classification
// ============================================

export function classifyError(error: unknown): {
	type: ErrorType
	severity: ErrorSeverity
	retryable: boolean
} {
	// Early returns for edge cases
	if (!error) {
		return {
			type: 'SERVER_ERROR',
			severity: ERROR_CONFIG.SERVER_ERROR.severity,
			retryable: ERROR_CONFIG.SERVER_ERROR.retryable
		}
	}

	const errorObj = error as {
		type?: ErrorType
		code?: string
		response?: { status?: number }
		statusCode?: number
		fields?: Record<string, string[]>
	}

	// Use explicit type if available
	if (errorObj.type && errorObj.type in ERROR_CONFIG) {
		const config = ERROR_CONFIG[errorObj.type]
		return {
			type: errorObj.type,
			severity: config.severity,
			retryable: config.retryable
		}
	}

	// Check status codes
	const status = errorObj.response?.status || errorObj.statusCode

	if (status === 400 || errorObj.fields) {
		return {
			type: 'VALIDATION_ERROR',
			severity: ERROR_CONFIG.VALIDATION_ERROR.severity,
			retryable: ERROR_CONFIG.VALIDATION_ERROR.retryable
		}
	}

	if (status === 401) {
		return {
			type: 'AUTH_ERROR',
			severity: ERROR_CONFIG.AUTH_ERROR.severity,
			retryable: ERROR_CONFIG.AUTH_ERROR.retryable
		}
	}

	if (status === 402) {
		return {
			type: 'PAYMENT_ERROR',
			severity: ERROR_CONFIG.PAYMENT_ERROR.severity,
			retryable: ERROR_CONFIG.PAYMENT_ERROR.retryable
		}
	}

	if (status === 403) {
		return {
			type: 'BUSINESS_ERROR',
			severity: ERROR_CONFIG.BUSINESS_ERROR.severity,
			retryable: ERROR_CONFIG.BUSINESS_ERROR.retryable
		}
	}

	if (status === 413) {
		return {
			type: 'FILE_UPLOAD_ERROR',
			severity: ERROR_CONFIG.FILE_UPLOAD_ERROR.severity,
			retryable: ERROR_CONFIG.FILE_UPLOAD_ERROR.retryable
		}
	}

	if (status && status >= 500) {
		return {
			type: 'SERVER_ERROR',
			severity: ERROR_CONFIG.SERVER_ERROR.severity,
			retryable: ERROR_CONFIG.SERVER_ERROR.retryable
		}
	}

	// Check error codes
	const code = errorObj.code || (errorObj.response as { data?: { code?: string } })?.data?.code

	if (!navigator.onLine || code === 'NETWORK_ERROR') {
		return {
			type: 'NETWORK_ERROR',
			severity: ERROR_CONFIG.NETWORK_ERROR.severity,
			retryable: ERROR_CONFIG.NETWORK_ERROR.retryable
		}
	}

	if (code?.startsWith('AUTH_')) {
		return {
			type: 'AUTH_ERROR',
			severity: ERROR_CONFIG.AUTH_ERROR.severity,
			retryable: ERROR_CONFIG.AUTH_ERROR.retryable
		}
	}

	if (code?.startsWith('PAYMENT_')) {
		return {
			type: 'PAYMENT_ERROR',
			severity: ERROR_CONFIG.PAYMENT_ERROR.severity,
			retryable: ERROR_CONFIG.PAYMENT_ERROR.retryable
		}
	}

	// Default
	return {
		type: 'SERVER_ERROR',
		severity: ERROR_CONFIG.SERVER_ERROR.severity,
		retryable: ERROR_CONFIG.SERVER_ERROR.retryable
	}
}

// ============================================
// Error Message Extraction
// ============================================

export function extractErrorMessage(error: unknown, context?: string): string {
	// Use sanitizer for auth-related errors
	if (context?.includes('auth') || context?.includes('login')) {
		return sanitizeErrorMessage(error, context)
	}

	const errorObj = error as {
		message?: string
		userMessage?: string
		response?: { data?: { message?: string } }
	}

	return (
		errorObj.userMessage ||
		errorObj.response?.data?.message ||
		errorObj.message ||
		ERROR_CONFIG.SERVER_ERROR.defaultMessage
	)
}

// ============================================
// Validation Error Extraction
// ============================================

export function extractValidationErrors(
	error: unknown
): Record<string, string[]> | null {
	const errorObj = error as {
		fields?: Record<string, string[]>
		response?: { data?: { fields?: Record<string, string[]> } }
	}

	return errorObj.fields || errorObj.response?.data?.fields || null
}

// ============================================
// Error to AppError Conversion
// ============================================

export function toAppError(error: unknown, context?: ErrorContext): ExtendedAppError {
	const classification = classifyError(error)
	const config = ERROR_CONFIG[classification.type]
	const message = extractErrorMessage(error, context?.action)

	const errorObj = error as { code?: string; statusCode?: number }
	
	const appError: ExtendedAppError = Object.assign(new Error(message), {
		type: classification.type,
		code: (errorObj.code || classification.type) as AppError['code'],
		statusCode: errorObj.statusCode,
		severity: classification.severity,
		retryable: classification.retryable,
		userMessage: message,
		suggestions: config.suggestions,
		context: context,
		fields: extractValidationErrors(error) || undefined
	})

	return appError
}

// ============================================
// Error Handling with Toast
// ============================================

export function handleError(
	error: unknown,
	options: {
		silent?: boolean
		context?: ErrorContext
		fallbackMessage?: string
	} = {}
): ExtendedAppError {
	const appError = toAppError(error, options.context)

	// Log error
	logger.error('Error occurred', appError, {
		type: appError.type,
		severity: appError.severity,
		...appError.context
	})

	// Show toast unless silent
	if (!options.silent) {
		const config = ERROR_CONFIG[appError.type]
		const toastFn = toast[config.toastType]
		
		toastFn(appError.userMessage || options.fallbackMessage || config.defaultMessage, {
			description: appError.suggestions[0]
		})
	}

	return appError
}

// ============================================
// Retry Logic Helper
// ============================================

export async function withRetry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number
		delay?: number
		onRetry?: (attempt: number, error: unknown) => void
	} = {}
): Promise<T> {
	const { maxAttempts = 3, delay = 1000, onRetry } = options

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			const classification = classifyError(error)
			
			if (!classification.retryable || attempt === maxAttempts) {
				throw error
			}

			onRetry?.(attempt, error)
			await new Promise(resolve => setTimeout(resolve, delay * attempt))
		}
	}

	throw new Error('Retry failed')
}

// ============================================
// React Hook for Error Handling
// ============================================

export function useErrorHandler() {
	return {
		handleError,
		toAppError,
		classifyError,
		withRetry
	}
}