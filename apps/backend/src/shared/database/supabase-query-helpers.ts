import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Options for query helpers to enable structured logging
 */
export interface QueryOptions {
	/** Resource name for error messages (e.g. 'tenant', 'lease', 'property') */
	resource?: string
	/** Resource ID for error messages and logging */
	id?: string | number
	/** Operation name for logging (e.g. 'fetch', 'update', 'delete') */
	operation?: string
	/** Logger instance (defaults to SupabaseQueryHelpers logger) */
	logger?: Logger
}

/**
 * Centralized Supabase/PostgREST error code mapping
 *
 * PostgREST error codes: https://postgrest.org/en/stable/errors.html
 * PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * This function ensures consistent HTTP exception mapping across all Supabase calls.
 * Consolidates 147+ ad hoc error handling blocks into single source of truth.
 */
export function mapSupabaseErrorToHttp(
	error: PostgrestError | null,
	options: QueryOptions = {}
): never {
	const { resource = 'resource', id, operation = 'query', logger } = options
	const defaultLogger = new Logger('SupabaseQueryHelpers')
	const log = logger ?? defaultLogger

	if (!error) {
		throw new InternalServerErrorException('Unexpected error state')
	}

	// Structured error payload for production debugging
	const errorPayload = {
		level: 'error' as const,
		resource,
		id,
		operation,
		supabaseErrorCode: error.code,
		supabaseErrorMessage: error.message,
		supabaseErrorDetails: error.details,
		supabaseErrorHint: error.hint
	}

	log.error(
		`Database ${operation} failed for ${resource}${id ? ` ${id}` : ''}`,
		errorPayload
	)

	// PostgREST API errors (PGRST prefix)
	switch (error.code) {
		case 'PGRST116': // No rows returned (when .single() or .maybeSingle() expected 1+)
			throw new NotFoundException(
				id ? `${resource} with ID ${id} not found` : `${resource} not found`
			)

		case 'PGRST301': // Invalid query parameters
		case 'PGRST302': // Invalid filter syntax
			throw new BadRequestException(error.message)

		case 'PGRST204': // Range not satisfiable
			throw new BadRequestException('Invalid pagination range')
	}

	// PostgreSQL constraint violations (23xxx)
	if (error.code?.startsWith('23')) {
		switch (error.code) {
			case '23505': // unique_violation
				// Extract constraint name from error details for better messages
				const constraintMatch = error.message.match(/constraint "([^"]+)"/)
				const constraint = constraintMatch?.[1] ?? 'unique constraint'
				throw new ConflictException(
					`${resource} already exists: ${constraint} violation`
				)

			case '23503': // foreign_key_violation
				throw new BadRequestException(
					`Cannot ${operation} ${resource}: referenced record does not exist`
				)

			case '23502': // not_null_violation
				throw new BadRequestException(`Missing required field for ${resource}`)

			case '23514': // check_constraint_violation
				throw new BadRequestException(error.message)
		}
	}

	// PostgreSQL permission errors (42xxx)
	if (error.code?.startsWith('42')) {
		switch (error.code) {
			case '42501': // insufficient_privilege
				throw new ForbiddenException(
					`Insufficient permissions to ${operation} ${resource}`
				)

			case '42P01': // undefined_table
			case '42703': // undefined_column
				// This is a dev error - table/column doesn't exist
				throw new InternalServerErrorException(
					'Database schema error - please contact support'
				)
		}
	}

	// Row-Level Security violations
	if (error.code === '42501' || error.message.includes('RLS')) {
		throw new ForbiddenException(
			`Access denied for ${resource}${id ? ` ${id}` : ''}`
		)
	}

	// JWT/Auth errors
	if (error.message.includes('JWT') || error.message.includes('token')) {
		throw new UnauthorizedException('Invalid authentication token')
	}

	// Default fallback
	throw new InternalServerErrorException(
		`Failed to ${operation} ${resource}${id ? ` ${id}` : ''}`
	)
}

/**
 * Execute a Supabase query expecting a single result
 *
 * Handles .single() + null check + error mapping in one place.
 * Replaces 50+ manual patterns of: if (error) throw...; if (!data) throw...
 *
 * @example
 * const tenant = await querySingle(
 *   supabase.from('tenants').select('*').eq('id', id).single(),
 *   { resource: 'tenant', id, operation: 'fetch' }
 * )
 */
export async function querySingle<T>(
	queryPromise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
	options: QueryOptions = {}
): Promise<T> {
	const { data, error } = await queryPromise

	// Handle Supabase/PostgREST errors
	if (error) {
		mapSupabaseErrorToHttp(error, options)
	}

	// Handle null data (resource not found)
	if (data === null || data === undefined) {
		const { resource = 'resource', id, logger } = options
		const defaultLogger = new Logger('SupabaseQueryHelpers')
		const log = logger ?? defaultLogger

		log.warn(`${resource}${id ? ` ${id}` : ''} returned null data`, {
			level: 'warn',
			resource,
			id,
			operation: options.operation ?? 'query'
		})

		throw new NotFoundException(
			id ? `${resource} with ID ${id} not found` : `${resource} not found`
		)
	}

	return data
}

/**
 * Execute a Supabase query expecting a list of results
 *
 * Handles error mapping and structured logging.
 * Returns empty array if no results (does NOT throw 404).
 *
 * @example
 * const leases = await queryList(
 *   supabase.from('leases').select('*').eq('property_id', propertyId),
 *   { resource: 'leases', operation: 'fetch', id: propertyId }
 * )
 */
export async function queryList<T>(
	queryPromise: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
	options: QueryOptions = {}
): Promise<T[]> {
	const { data, error } = await queryPromise

	if (error) {
		mapSupabaseErrorToHttp(error, options)
	}

	// List queries return empty array if no results (not 404)
	return data ?? []
}

/**
 * Execute a Supabase mutation (insert/update/delete)
 *
 * Handles error mapping with mutation-specific context.
 * Alias for querySingle with 'mutation' as default operation.
 *
 * @example
 * const updated = await queryMutation(
 *   supabase.from('tenants').update(updates).eq('id', id).select().single(),
 *   { resource: 'tenant', id, operation: 'update' }
 * )
 */
export async function queryMutation<T>(
	queryPromise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
	options: QueryOptions = {}
): Promise<T> {
	return querySingle(queryPromise, {
		...options,
		operation: options.operation ?? 'mutation'
	})
}
