import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpStatus,
	Logger
} from '@nestjs/common'
import type { Response } from 'express'

/**
 * PostgreSQL/PostgREST Error Type
 */
interface PostgrestError {
	code?: string
	message?: string
	details?: string
	hint?: string
}

/**
 * Database Exception Filter
 * Handles PostgreSQL/PostgREST errors and maps them to appropriate HTTP status codes
 * 
 * Common PostgREST error codes:
 * - PGRST116: Not found (404)
 * - PGRST301: JWT expired (401)
 * - PGRST302: JWT invalid (401)
 * - 23505: Unique violation (409)
 * - 23503: Foreign key violation (400)
 * - 42501: Insufficient privilege (403)
 */
@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(DatabaseExceptionFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()

		// Check if this is a PostgREST error
		const error = exception as PostgrestError

		// Map error codes to HTTP status
		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'Internal server error'

		if (error?.code) {
			switch (error.code) {
				case 'PGRST116':
					// Not found
					status = HttpStatus.NOT_FOUND
					message = error.message || 'Resource not found'
					break
				case 'PGRST301':
				case 'PGRST302':
					// JWT errors
					status = HttpStatus.UNAUTHORIZED
					message = 'Invalid or expired authentication token'
					break
				case '23505':
					// Unique violation
					status = HttpStatus.CONFLICT
					message = 'Resource already exists'
					break
				case '23503':
					// Foreign key violation
					status = HttpStatus.BAD_REQUEST
					message = 'Invalid reference to related resource'
					break
				case '42501':
					// Insufficient privilege
					status = HttpStatus.FORBIDDEN
					message = 'Insufficient permissions'
					break
				default:
					// Unknown database error
					this.logger.error('Unhandled database error', {
						code: error.code,
						message: error.message,
						details: error.details
					})
			}
		}

		response.status(status).json({
			statusCode: status,
			message,
			error: error?.code,
			...(error?.details ? { details: error.details } : {})
		})
	}
}
