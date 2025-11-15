import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
	Injectable,
	Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Options for structured error logging and context
 */
export interface SupabaseErrorContext {
	/** Resource type (e.g., 'property', 'lease', 'tenant') */
	resource?: string
	/** Resource ID */
	id?: string | number
	/** Operation being performed (e.g., 'findOne', 'update', 'delete') */
	operation?: string
	/** User ID for audit trails */
	userId?: string
	/** Additional context for debugging */
	metadata?: Record<string, unknown>
}

/**
 * Centralized Supabase/PostgREST error handler
 *
 * Maps PostgREST error codes to appropriate NestJS HTTP exceptions
 * with structured logging and consistent error messages.
 *
 * @example
 * ```typescript
 * const { data, error } = await client.from('property').select('*').eq('id', id).single()
 * if (error) {
 *   this.errorHandler.mapAndThrow(error, {
 *     resource: 'property',
 *     id,
 *     operation: 'findOne'
 *   })
 * }
 * ```
 */
@Injectable()
export class SupabaseErrorHandler {
	private readonly logger = new Logger(SupabaseErrorHandler.name)
	private readonly isDevelopment: boolean

	constructor(private readonly configService: ConfigService) {
		this.isDevelopment = this.configService.get('NODE_ENV') === 'development'
	}

	/**
	 * Maps Supabase/PostgREST errors to NestJS HTTP exceptions
	 *
	 * @param error - Supabase error object
	 * @param context - Structured context for logging
	 * @throws {NotFoundException} for PGRST116 (not found)
	 * @throws {ConflictException} for 23505 (unique violation)
	 * @throws {BadRequestException} for 23503 (foreign key violation)
	 * @throws {ForbiddenException} for 42501 (insufficient privilege)
	 * @throws {UnauthorizedException} for PGRST301/302 (JWT errors)
	 * @throws {InternalServerErrorException} for unknown errors
	 */
	mapAndThrow(error: PostgrestError, context: SupabaseErrorContext = {}): never {
		// Log structured error before throwing
		this.logError(error, context)

		const { resource, id } = context
		const resourceLabel = resource ? `${resource}${id ? ` (${id})` : ''}` : 'Resource'

		// Map PostgREST error codes to HTTP exceptions
		switch (error.code) {
			case 'PGRST116':
				// Not found (404)
				throw new NotFoundException(`${resourceLabel} not found`)

			case '23505':
				// Unique constraint violation (409)
				throw new ConflictException(
					this.extractConstraintMessage(error) || `${resourceLabel} already exists`
				)

			case '23503':
				// Foreign key violation (400)
				throw new BadRequestException(
					`Invalid reference: ${this.extractConstraintMessage(error) || 'related resource not found'}`
				)

			case '42501':
				// Insufficient privilege (403)
				throw new ForbiddenException(`Insufficient permissions to access ${resourceLabel}`)

			case 'PGRST301':
			case 'PGRST302':
				// JWT errors (401)
				throw new UnauthorizedException('Invalid or expired authentication token')

			case '22P02':
				// Invalid input syntax (400)
				throw new BadRequestException(`Invalid input format for ${resourceLabel}`)

			case '23514':
				// Check constraint violation (400)
				throw new BadRequestException(
					this.extractConstraintMessage(error) || `${resourceLabel} failed validation`
				)

			default:
				// Unknown error (500)
				throw new InternalServerErrorException(
					this.isDevelopment
						? `Database error: ${error.message} (code: ${error.code})`
						: 'An unexpected error occurred'
				)
		}
	}

	/**
	 * Checks if error is optimistic locking conflict (PGRST116 with version mismatch)
	 *
	 * @param error - Supabase error object
	 * @returns true if this is an optimistic locking conflict
	 */
	isOptimisticLockingConflict(error: PostgrestError | null): boolean {
		return error?.code === 'PGRST116'
	}

	/**
	 * Throws ConflictException for optimistic locking failures
	 *
	 * @param context - Error context
	 */
	throwOptimisticLockingError(context: SupabaseErrorContext = {}): never {
		const { resource = 'Resource', id } = context
		const resourceLabel = id ? `${resource} (${id})` : resource

		this.logger.warn('Optimistic locking conflict detected', {
			resource: context.resource,
			id: context.id,
			operation: context.operation,
			expectedVersion: context.metadata?.expectedVersion
		})

		throw new ConflictException(
			`${resourceLabel} was modified by another user. Please refresh and try again.`
		)
	}

	/**
	 * Logs structured error with full context
	 */
	private logError(error: PostgrestError, context: SupabaseErrorContext): void {
		const logPayload = {
			level: 'error',
			supabaseErrorCode: error.code,
			supabaseErrorMessage: error.message,
			supabaseErrorDetails: error.details,
			supabaseErrorHint: error.hint,
			resource: context.resource,
			id: context.id,
			operation: context.operation,
			userId: context.userId,
			...context.metadata
		}

		this.logger.error(
			`Supabase error: ${context.operation || 'unknown'} ${context.resource || 'resource'}`,
			logPayload
		)
	}

	/**
	 * Extracts human-readable constraint message from error details
	 */
	private extractConstraintMessage(error: PostgrestError): string | null {
		if (!error.details) return null

		// Extract constraint name from details like:
		// "Key (email)=(test@example.com) already exists."
		const keyMatch = error.details.match(/Key \((.+?)\)=\((.+?)\)/)
		if (keyMatch) {
			const [, field, value] = keyMatch
			return `${field} '${value}' is already in use`
		}

		return error.details
	}
}
