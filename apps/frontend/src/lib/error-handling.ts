/**
 * Unified Error Handling System
 * Single source of truth for all error handling patterns using shared types
 */

import { logger } from '@/lib/logger/logger'
import { toast } from 'sonner'
import { sanitizeErrorMessage } from './auth/error-sanitizer'
import type {
	AppError,
	AuthError as _AuthError,
	ValidationError as _ValidationError,
	NetworkError as _NetworkError,
	ServerError as _ServerError,
	BusinessError as _BusinessError,
	FileUploadError as _FileUploadError,
	PaymentError as _PaymentError,
	ErrorContext
} from '@repo/shared'

// ============================================
// Extended Error Types for Frontend
// ============================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// Local literal type to avoid indexing into shared union which may not expose 'type'
export type ErrorType =
	| 'AUTH_ERROR'
	| 'PAYMENT_ERROR'
	| 'VALIDATION_ERROR'
	| 'NETWORK_ERROR'
	| 'FILE_UPLOAD_ERROR'
	| 'BUSINESS_ERROR'
	| 'SERVER_ERROR'

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

// Generic async result type used across frontend helpers
export type AsyncResult<T> =
	| { success: true; data: T }
	| { success: false; error: ExtendedAppError }

// ============================================
// Error Classification
// ============================================

export function classifyError(error: unknown): {
	type: ErrorType
	severity: ErrorSeverity
	retryable: boolean
} {
	if (!error) {
		return {
			type: 'SERVER_ERROR',
			severity: 'low',
			retryable: false
		}
	}

	// Check for structured error object
	const errorObj = error as {
		type?: ErrorType
		code?: string
		response?: { status?: number; data?: { code?: string; type?: string } }
		statusCode?: number
		fields?: Record<string, string[]>
	}

	// Use explicit type if available
	if (errorObj.type) {
		return {
			type: errorObj.type,
			severity: getSeverityForType(errorObj.type),
			retryable: getRetryableForType(errorObj.type)
		}
	}

	// Check status codes
	const status = errorObj.response?.status || errorObj.statusCode

	if (status === 400 || errorObj.fields) {
		return {
			type: 'VALIDATION_ERROR',
			severity: 'medium',
			retryable: false
		}
	}

	if (status === 401) {
		return {
			type: 'AUTH_ERROR',
			severity: 'high',
			retryable: false
		}
	}

	if (status === 402) {
		return {
			type: 'BUSINESS_ERROR',
			severity: 'high',
			retryable: false
		}
	}

	if (status === 403) {
		return {
			type: 'AUTH_ERROR',
			severity: 'high',
			retryable: false
		}
	}

	if (status === 404) {
		return {
			type: 'BUSINESS_ERROR',
			severity: 'low',
			retryable: false
		}
	}

	if (status === 429) {
		return {
			type: 'NETWORK_ERROR',
			severity: 'medium',
			retryable: true
		}
	}

	if (typeof status === 'number' && status >= 500) {
		return {
			type: 'SERVER_ERROR',
			severity: 'high',
			retryable: true
		}
	}

	// Check error codes
	const code = errorObj.code || errorObj.response?.data?.code

	if (
		code === 'NETWORK_ERROR' ||
		code === 'CONNECTION_FAILED' ||
		!navigator.onLine
	) {
		return {
			type: 'NETWORK_ERROR',
			severity: 'medium',
			retryable: true
		}
	}

	if (
		code?.startsWith('AUTH_') ||
		code === 'UNAUTHORIZED' ||
		code === 'FORBIDDEN'
	) {
		return {
			type: 'AUTH_ERROR',
			severity: 'high',
			retryable: false
		}
	}

	if (code?.startsWith('VALIDATION_')) {
		return {
			type: 'VALIDATION_ERROR',
			severity: 'medium',
			retryable: false
		}
	}

	if (code?.startsWith('PAYMENT_')) {
		return {
			type: 'PAYMENT_ERROR',
			severity: 'high',
			retryable: false
		}
	}

	// Default to server error
	return {
		type: 'SERVER_ERROR',
		severity: 'medium',
		retryable: true
	}
}

function getSeverityForType(type: ErrorType): ErrorSeverity {
	switch (type) {
		case 'AUTH_ERROR':
		case 'PAYMENT_ERROR':
			return 'high'
		case 'VALIDATION_ERROR':
		case 'NETWORK_ERROR':
		case 'FILE_UPLOAD_ERROR':
			return 'medium'
		case 'BUSINESS_ERROR':
			return 'low'
		case 'SERVER_ERROR':
		default:
			return 'high'
	}
}

function getRetryableForType(type: ErrorType): boolean {
	switch (type) {
		case 'NETWORK_ERROR':
		case 'SERVER_ERROR':
			return true
		case 'AUTH_ERROR':
		case 'VALIDATION_ERROR':
		case 'BUSINESS_ERROR':
		case 'FILE_UPLOAD_ERROR':
		case 'PAYMENT_ERROR':
		default:
			return false
	}
}

// ============================================
// Error Message Extraction
// ============================================

export function extractErrorMessage(error: unknown, context?: string): string {
	// Use sanitizer for auth-related errors
	if (
		context?.includes('auth') ||
		context?.includes('login') ||
		context?.includes('signup')
	) {
		return sanitizeErrorMessage(error, context)
	}

	// Priority order for message extraction
	const errorObj = error as {
		message?: string
		userMessage?: string
		response?: { data?: { message?: string } }
	}

	if (errorObj.response?.data?.message) {
		return errorObj.response.data.message
	}
	if (errorObj.userMessage) {
		return errorObj.userMessage
	}
	if (errorObj.message) {
		return errorObj.message
	}
	if (typeof error === 'string') {
		return error
	}

	// Default messages by error type
	const { type } = classifyError(error)

	return getDefaultMessageForType(type)
}

function getDefaultMessageForType(type: ErrorType): string {
	switch (type) {
		case 'NETWORK_ERROR':
			return navigator.onLine
				? 'Unable to connect to the server. Please try again.'
				: 'You appear to be offline. Please check your connection.'
		case 'AUTH_ERROR':
			return 'Authentication failed. Please sign in to continue.'
		case 'VALIDATION_ERROR':
			return 'Please check your input and try again.'
		case 'BUSINESS_ERROR':
			return 'The requested action could not be completed.'
		case 'SERVER_ERROR':
			return 'A server error occurred. Please try again later.'
		case 'FILE_UPLOAD_ERROR':
			return 'File upload failed. Please try again.'
		case 'PAYMENT_ERROR':
			return 'Payment processing failed. Please try again.'
		default:
			return 'An unexpected error occurred.'
	}
}

// ============================================
// Validation Error Extraction
// ============================================

export function extractValidationErrors(
	error: unknown
): Record<string, string[]> {
	const errorObj = error as {
		fields?: Record<string, string[]>
		errors?: Record<string, string[]>
		response?: {
			data?: {
				fields?: Record<string, string[]>
				errors?: Record<string, string[]>
			}
		}
	}

	return (
		errorObj.response?.data?.fields ||
		errorObj.response?.data?.errors ||
		errorObj.fields ||
		errorObj.errors ||
		({} as Record<string, string[]>)
	)
}

// ============================================
// Main Error Handler Class
// ============================================

export class ErrorHandler {
	private static instance: ErrorHandler
	private errorCounts = new Map<string, number>()
	private lastErrorTime = new Map<string, number>()

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler()
		}
		return ErrorHandler.instance
	}

	/**
	 * Main error handling method
	 */
	handle(
		error: unknown,
		options: {
			context?: string
			showToast?: boolean
			logError?: boolean
			throwError?: boolean
		} = {}
	): ExtendedAppError {
		const {
			context = 'unknown',
			showToast = true,
			logError = true,
			throwError = false
		} = options

		// Classify error
		const classification = classifyError(error)
		const message = extractErrorMessage(error, context)
		const validationErrors = extractValidationErrors(error)

		// Create extended application error
		const errorObj = error as {
			code?: string
			statusCode?: number
			response?: { status?: number; data?: { code?: string } }
			stack?: string
			context?: ErrorContext
		}

		const appError: ExtendedAppError = new Error(
			message
		) as ExtendedAppError
		appError.type = classification.type
		appError.code = (errorObj.code ||
			errorObj.response?.data?.code) as AppError['code']
		appError.statusCode = errorObj.response?.status || errorObj.statusCode
		appError.severity = classification.severity
		appError.retryable = classification.retryable
		appError.fields = validationErrors
		appError.userMessage = message
		appError.suggestions = this.getSuggestions(classification.type)
		appError.context = {
			component: context,
			...errorObj.context
		}

		// Track error frequency
		this.trackError(appError, context)

		// Log if needed
		if (logError && process.env.NODE_ENV !== 'production') {
			const errorForLogging = new Error(appError.message)
			errorForLogging.name = appError.type || 'UnhandledError'
			logger.error('Error handled', errorForLogging, {
				errorType: appError.type,
				errorMessage: appError.message,
				code: appError.code,
				statusCode: appError.statusCode,
				context: appError.context,
				severity: appError.severity
			})
		}

		// Show toast if needed
		if (showToast) {
			this.showToast(appError)
		}

		// Throw if needed
		if (throwError) {
			throw appError
		}

		return appError
	}

	/**
	 * Handle async operations
	 */
	async handleAsync<T>(
		operation: () => Promise<T>,
		options?: Parameters<typeof this.handle>[1]
	): Promise<AsyncResult<T>> {
		try {
			const data = await operation()
			return { success: true, data }
		} catch (error) {
			const handledError = this.handle(error, options)
			return {
				success: false,
				error: handledError
			}
		}
	}

	/**
	 * Handle form validation errors
	 */
	handleValidationError(
		error: unknown,
		setFieldError?: (field: string, message: string) => void
	): void {
		const appError = this.handle(error, {
			showToast: false,
			logError: false,
			context: 'validation'
		})

		// Set field-specific errors
		if (setFieldError && appError.fields) {
			Object.entries(appError.fields).forEach(([field, messages]) => {
				if (Array.isArray(messages) && messages.length > 0) {
					setFieldError(field, messages[0] || '')
				}
			})
		}

		// Show general error if no field errors
		if (!appError.fields || Object.keys(appError.fields).length === 0) {
			toast.error(appError.message)
		}
	}

	/**
	 * Create retry function with exponential backoff
	 */
	createRetryFn<T>(
		fn: () => Promise<T>,
		maxRetries = 3,
		baseDelay = 1000
	): () => Promise<T> {
		 
		return async () => {
			let lastError: unknown

			for (let attempt = 0; attempt <= maxRetries; attempt++) {
				try {
					return await fn()
				} catch (error) {
					lastError = error
					const { retryable } = classifyError(error)

					if (!retryable || attempt === maxRetries) {
						throw error
					}

					// Exponential backoff with jitter
					const delay =
						baseDelay * Math.pow(2, attempt) + Math.random() * 1000
					await new Promise(resolve => setTimeout(resolve, delay))
				}
			}

			throw lastError
		}
	}

	/**
	 * Track error frequency for circuit breaker
	 */
	private trackError(error: ExtendedAppError, context: string): void {
		const key = `${error.type}-${context}`
		const now = Date.now()

		// Reset if last error was > 5 min ago
		const lastTime = this.lastErrorTime.get(key) || 0
		if (now - lastTime > 5 * 60 * 1000) {
			this.errorCounts.set(key, 0)
		}

		// Increment count
		const count = (this.errorCounts.get(key) || 0) + 1
		this.errorCounts.set(key, count)
		this.lastErrorTime.set(key, now)

		// Escalate severity for repeated errors
		if (count >= 3 && error.severity !== 'critical') {
			error.severity = 'high'
		}
		if (count >= 5) {
			error.severity = 'critical'
		}
	}

	/**
	 * Show error toast
	 */
	private showToast(error: ExtendedAppError): void {
		const description = error.suggestions?.[0]

		switch (error.severity) {
			case 'critical':
				toast.error(error.userMessage || error.message, {
					description: description || 'Please contact support',
					duration: 10000
				})
				break
			case 'high':
				toast.error(error.userMessage || error.message, {
					description,
					duration: 8000
				})
				break
			case 'medium':
				toast.warning(error.userMessage || error.message, {
					description,
					duration: 5000
				})
				break
			case 'low':
				// Don't show low severity errors
				break
		}

		// Special handling for auth errors
		if (error.type === 'AUTH_ERROR') {
			toast.error(error.userMessage || error.message, {
				action: {
					label: 'Sign In',
					onClick: () => (window.location.href = '/auth/login')
				}
			})
		}
	}

	/**
	 * Get suggestions for error type
	 */
	private getSuggestions(type: ErrorType): string[] {
		switch (type) {
			case 'NETWORK_ERROR':
				return ['Check your internet connection', 'Try again']
			case 'AUTH_ERROR':
				return ['Please sign in', 'Check your credentials']
			case 'VALIDATION_ERROR':
				return ['Check your input', 'Review the form for errors']
			case 'BUSINESS_ERROR':
				return ['Contact your administrator', 'Check your permissions']
			case 'SERVER_ERROR':
				return [
					'Try again later',
					'Contact support if the problem persists'
				]
			case 'FILE_UPLOAD_ERROR':
				return ['Check file size and type', 'Try uploading again']
			case 'PAYMENT_ERROR':
				return ['Check your payment method', 'Contact your bank']
			default:
				return ['Try refreshing the page', 'Contact support']
		}
	}
}

// ============================================
// Exported Instances and Helpers
// ============================================

export const errorHandler = ErrorHandler.getInstance()

export const handleError = (
	error: unknown,
	options?: Parameters<ErrorHandler['handle']>[1]
) => errorHandler.handle(error, options)

export const handleAsync = async <T>(
	operation: () => Promise<T>,
	options?: Parameters<ErrorHandler['handle']>[1]
) => errorHandler.handleAsync(operation, options)

export const handleValidationError = (
	error: unknown,
	setFieldError?: (field: string, message: string) => void
) => errorHandler.handleValidationError(error, setFieldError)

export const handleAsyncError = (
	error: unknown,
	context?: string
): ExtendedAppError => {
	return handleError(error, { context, showToast: false })
}

// Hook for error handling
export function useErrorHandler() {
	return {
		handleError,
		handleAsync,
		handleValidationError
	}
}
