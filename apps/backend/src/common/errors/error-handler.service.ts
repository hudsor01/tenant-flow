import { Injectable, Logger } from '@nestjs/common'
import { TRPCError } from '@trpc/server'
import type { AppError, ErrorContext as SharedErrorContext } from '@tenantflow/shared'

// Extend shared ErrorContext with backend-specific fields
export interface ErrorContext extends SharedErrorContext {
	operation?: string
	resource?: string
	metadata?: Record<string, string | number | boolean | null | undefined | Record<string, string | number | boolean | null>>
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
	STRIPE_ERROR = 'STRIPE_ERROR'
}

@Injectable()
export class ErrorHandlerService {
	private readonly logger = new Logger(ErrorHandlerService.name)

	/**
	 * Handle and transform errors into appropriate TRPC errors
	 */
	handleError(error: Error | TRPCError | AppError, context?: ErrorContext): never {
		this.logError(error, context)

		if (error instanceof TRPCError) {
			throw error
		}

		if (error instanceof Error) {
			throw this.transformError(error, context)
		}

		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred',
			cause: error
		})
	}

	/**
	 * Create a business logic error with consistent formatting
	 */
	createBusinessError(
		code: ErrorCode,
		message: string,
		_context?: ErrorContext
	): TRPCError {
		const trpcCode = this.mapToTRPCCode(code)
		
		this.logger.warn(`Business error: ${message}`, {
			code,
			context: _context,
			operation: _context?.operation
		})

		return new TRPCError({
			code: trpcCode,
			message,
			cause: { code, context: _context }
		})
	}

	/**
	 * Create a validation error with field details
	 */
	createValidationError(
		message: string,
		fields?: Record<string, string>,
		_context?: ErrorContext
	): TRPCError {
		this.logger.warn(`Validation error: ${message}`, { fields, context: _context })

		return new TRPCError({
			code: 'BAD_REQUEST',
			message,
			cause: { type: 'VALIDATION_ERROR', fields, context: _context }
		})
	}

	/**
	 * Create a not found error with resource details
	 */
	createNotFoundError(
		resource: string,
		identifier?: string,
		_context?: ErrorContext
	): TRPCError {
		const message = identifier 
			? `${resource} with ID '${identifier}' not found`
			: `${resource} not found`

		this.logger.warn(`Resource not found: ${message}`, { resource, identifier, context: _context })

		return new TRPCError({
			code: 'NOT_FOUND',
			message,
			cause: { type: 'NOT_FOUND_ERROR', resource, identifier, context: _context }
		})
	}

	/**
	 * Create a permission error
	 */
	createPermissionError(
		operation: string,
		resource?: string,
		_context?: ErrorContext
	): TRPCError {
		const message = resource 
			? `Not authorized to ${operation} ${resource}`
			: `Not authorized to ${operation}`

		this.logger.warn(`Permission denied: ${message}`, { operation, resource, context: _context })

		return new TRPCError({
			code: 'FORBIDDEN',
			message,
			cause: { type: 'PERMISSION_ERROR', operation, resource, context: _context }
		})
	}

	/**
	 * Create a configuration error
	 */
	createConfigError(
		message: string,
		_context?: ErrorContext
	): TRPCError {
		this.logger.error(`Configuration error: ${message}`, { context: _context })

		return new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message,
			cause: { type: 'CONFIG_ERROR', context: _context }
		})
	}

	private logError(error: Error | TRPCError | AppError, context?: ErrorContext): void {
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

	private transformError(error: Error, context?: ErrorContext): TRPCError {
		// Handle specific error types
		if (this.isValidationError(error)) {
			return new TRPCError({
				code: 'BAD_REQUEST',
				message: error.message,
				cause: { type: 'VALIDATION_ERROR', context }
			})
		}

		if (this.isAuthenticationError(error)) {
			return new TRPCError({
				code: 'UNAUTHORIZED',
				message: 'Authentication required',
				cause: { type: 'AUTH_ERROR', context }
			})
		}

		if (this.isPermissionError(error)) {
			return new TRPCError({
				code: 'FORBIDDEN',
				message: 'Insufficient permissions',
				cause: { type: 'PERMISSION_ERROR', context }
			})
		}

		if (this.isNotFoundError(error)) {
			return new TRPCError({
				code: 'NOT_FOUND',
				message: error.message,
				cause: { type: 'NOT_FOUND_ERROR', context }
			})
		}

		if (this.isConflictError(error)) {
			return new TRPCError({
				code: 'CONFLICT',
				message: error.message,
				cause: { type: 'CONFLICT_ERROR', context }
			})
		}

		// Default to internal server error
		return new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'An internal error occurred',
			cause: { originalError: error.message, context }
		})
	}

	private mapToTRPCCode(code: ErrorCode): TRPCError['code'] {
		switch (code) {
			case ErrorCode.BAD_REQUEST:
				return 'BAD_REQUEST'
			case ErrorCode.UNAUTHORIZED:
				return 'UNAUTHORIZED'
			case ErrorCode.FORBIDDEN:
				return 'FORBIDDEN'
			case ErrorCode.NOT_FOUND:
				return 'NOT_FOUND'
			case ErrorCode.CONFLICT:
				return 'CONFLICT'
			case ErrorCode.UNPROCESSABLE_ENTITY:
				return 'UNPROCESSABLE_CONTENT'
			case ErrorCode.PAYMENT_REQUIRED:
				return 'PAYMENT_REQUIRED'
			case ErrorCode.INTERNAL_SERVER_ERROR:
			case ErrorCode.SERVICE_UNAVAILABLE:
			case ErrorCode.SUBSCRIPTION_ERROR:
			case ErrorCode.STORAGE_ERROR:
			case ErrorCode.EMAIL_ERROR:
			case ErrorCode.STRIPE_ERROR:
			default:
				return 'INTERNAL_SERVER_ERROR'
		}
	}

	private isValidationError(error: Error): boolean {
		return error.message.includes('validation') ||
			   error.message.includes('required') ||
			   error.message.includes('invalid') ||
			   error.message.includes('must be')
	}

	private isAuthenticationError(error: Error): boolean {
		return error.message.includes('unauthorized') ||
			   error.message.includes('authentication') ||
			   error.message.includes('token') ||
			   error.message.includes('login')
	}

	private isPermissionError(error: Error): boolean {
		return error.message.includes('permission') ||
			   error.message.includes('forbidden') ||
			   error.message.includes('access denied') ||
			   error.message.includes('not authorized')
	}

	private isNotFoundError(error: Error): boolean {
		return error.message.includes('not found') ||
			   error.message.includes('does not exist') ||
			   error.message.includes('not exist')
	}

	private isConflictError(error: Error): boolean {
		return error.message.includes('already exists') ||
			   error.message.includes('duplicate') ||
			   error.message.includes('conflict')
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
			type: 'PAYMENT_ERROR',
			code,
			message,
			statusCode: 402,
			timestamp: new Date()
		}
	}
}