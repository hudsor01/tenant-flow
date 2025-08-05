import { Injectable, Logger } from '@nestjs/common'
import type { AppError } from '@repo/shared'




// Extend shared ErrorContext with backend-specific fields
/**
 * Define a minimal SharedErrorContext if not imported from shared package.
 * Replace this with the correct import if available.
 */
export type SharedErrorContext = Record<string, unknown>;

export interface ErrorContext extends SharedErrorContext {
	operation?: string
	resource?: string
	metadata?: Record<
		string,
		| string
		| number
		| boolean
		| null
		| undefined
		| string[]
		| Record<string, string | number | boolean | null>
	>
}

// Legacy ErrorCode enum - mapped to shared error types
export enum ErrorCode {
	BAD_REQUEST = 'BAD_REQUEST',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN',
	NOT_FOUND = 'NOT_FOUND',
	CONFLICT = 'CONFLICT',
	UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
	PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
	SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
	STORAGE_ERROR = 'STORAGE_ERROR',
	EMAIL_ERROR = 'EMAIL_ERROR',
	STRIPE_ERROR = 'STRIPE_ERROR',
	INVALID_INPUT = 'INVALID_INPUT'
}

@Injectable()
export class ErrorHandlerService {
	private readonly logger = new Logger(ErrorHandlerService.name)

	constructor() {
		// PERFORMANCE: Remove constructor logging to speed up service initialization
		// Error handling is critical path - minimize overhead
	}

	/**
	 * Handle and transform errors into appropriate HTTP errors
	 * Uses unified error handler for consistency
	 */
	handleErrorEnhanced(error: Error | AppError, context?: ErrorContext): never {
		this.logError(error, context)
		throw error
	}

	/**
	 * Create a business logic error with consistent formatting
	 */
	createBusinessError(
		code: ErrorCode,
		message: string,
		context?: ErrorContext
	): Error {
		this.logger.warn(`Business error: ${message}`, {
			code,
			context,
			operation: context?.operation
		})

		const error = new Error(message)
		Object.assign(error, { code, context })
		return error
	}

	/**
	 * Create a validation error with field details
	 */
	createValidationError(
		message: string,
		fields?: Record<string, string>,
		context?: ErrorContext
	): Error {
		this.logger.warn(`Validation error: ${message}`, { fields, context })

		const error = new Error(message)
		Object.assign(error, { 
			code: 'BAD_REQUEST',
			type: 'VALIDATION_ERROR',
			fields,
			context 
		})
		return error
	}

	/**
	 * Create a not found error with resource details
	 */
	createNotFoundError(
		resource: string,
		identifier?: string,
		context?: ErrorContext
	): Error {
		const message = identifier 
			? `${resource} with ID '${identifier}' not found`
			: `${resource} not found`

		this.logger.warn(`Resource not found: ${message}`, { resource, identifier, context })

		const error = new Error(message)
		Object.assign(error, {
			code: 'NOT_FOUND',
			type: 'NOT_FOUND_ERROR',
			resource,
			identifier,
			context
		})
		return error
	}

	/**
	 * Create a permission error
	 */
	createPermissionError(
		operation: string,
		resource?: string,
		context?: ErrorContext
	): Error {
		const message = resource 
			? `Not authorized to ${operation} ${resource}`
			: `Not authorized to ${operation}`

		this.logger.warn(`Permission denied: ${message}`, { operation, resource, context })

		const error = new Error(message)
		Object.assign(error, {
			code: 'FORBIDDEN',
			type: 'PERMISSION_ERROR',
			operation,
			resource,
			context
		})
		return error
	}

	/**
	 * Create a configuration error
	 */
	createConfigError(
		message: string,
		context?: ErrorContext
	): Error {
		this.logger.error(`Configuration error: ${message}`, { context })

		const error = new Error(message)
		Object.assign(error, {
			code: 'INTERNAL_SERVER_ERROR',
			type: 'CONFIG_ERROR',
			context
		})
		return error
	}

	private logError(error: Error | AppError, context?: ErrorContext): void {
		if (error instanceof Error) {
			this.logger.error(`Error occurred: ${error.message}`, {
				error: error.message,
				stack: error.stack,
				context,
				operation: context?.operation
			})
		} else {
			this.logger.error('Unknown error occurred', {
				error: String(error),
				context,
				operation: context?.operation
			})
		}
	}


	/**
	 * Create shared AppError objects for consistent error handling
	 */
	
	createAuthError(
		code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'EMAIL_NOT_VERIFIED' | 'ACCOUNT_LOCKED' | 'INVALID_TOKEN',
		message: string,
		_context?: ErrorContext
	): AppError {
		return {
			name: 'AuthError',
			type: 'AUTH_ERROR',
			code,
			message,
			statusCode: 401,
			timestamp: new Date()
		}
	}

	createValidationAppError(
		message: string,
		field?: string,
		errors?: string[],
		_context?: ErrorContext
	): AppError {
		return {
			name: 'ValidationError',
			type: 'VALIDATION_ERROR',
			code: 'VALIDATION_FAILED',
			message,
			field,
			errors,
			statusCode: 400,
			timestamp: new Date()
		}
	}

	createBusinessAppError(
		code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'INSUFFICIENT_PERMISSIONS' | 'OPERATION_NOT_ALLOWED' | 'QUOTA_EXCEEDED' | 'SUBSCRIPTION_REQUIRED',
		message: string,
		_context?: ErrorContext
	): AppError {
		return {
			name: 'BusinessError',
			type: 'BUSINESS_ERROR',
			code,
			message,
			statusCode: 400,
			timestamp: new Date()
		}
	}

	createServerAppError(
		code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'DATABASE_ERROR' | 'EXTERNAL_SERVICE_ERROR',
		message: string,
		_context?: ErrorContext
	): AppError {
		return {
			name: 'ServerError',
			type: 'SERVER_ERROR',
			code,
			message,
			statusCode: 500,
			timestamp: new Date()
		}
	}

	createPaymentAppError(
		code: 'PAYMENT_FAILED' | 'INSUFFICIENT_FUNDS' | 'CARD_DECLINED' | 'PAYMENT_METHOD_INVALID' | 'STRIPE_ERROR',
		message: string,
		_context?: ErrorContext
	): AppError {
		return {
			name: 'PaymentError',
			type: 'PAYMENT_ERROR',
			code,
			message,
			statusCode: 402,
			timestamp: new Date()
		}
	}
}