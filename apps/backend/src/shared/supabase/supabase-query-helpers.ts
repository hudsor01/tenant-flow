import { Injectable, NotFoundException } from '@nestjs/common'
import type { PostgrestSingleResponse, PostgrestResponse, PostgrestFilterBuilder } from '@supabase/supabase-js'
import { SupabaseErrorHandler, type SupabaseErrorContext } from './supabase-error-handler'

/**
 * Typed query helpers for common Supabase operations
 *
 * Eliminates boilerplate error checking, null handling, and logging
 * across service methods.
 */
@Injectable()
export class SupabaseQueryHelpers {
	constructor(private readonly errorHandler: SupabaseErrorHandler) {}

	/**
	 * Executes a .single() query with automatic error handling
	 *
	 * @template T - Result type
	 * @param queryPromise - Supabase query promise
	 * @param context - Error context for logging
	 * @returns Resolved data (never null)
	 * @throws {NotFoundException} if data is null or error.code is PGRST116
	 * @throws {HttpException} for other Supabase errors
	 *
	 * @example
	 * ```typescript
	 * const property = await this.queryHelpers.querySingle(
	 *   client.from('property').select('*').eq('id', propertyId).single(),
	 *   { resource: 'property', id: propertyId, operation: 'findOne', userId }
	 * )
	 * ```
	 */
	async querySingle<T>(
		queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
		context: SupabaseErrorContext = {}
	): Promise<T> {
		const { data, error } = await queryPromise

		// Handle Supabase errors
		if (error) {
			this.errorHandler.mapAndThrow(error, context)
		}

		// Handle null data (resource not found or RLS denied access)
		if (!data) {
			const { resource = 'Resource', id } = context
			const resourceLabel = id ? `${resource} (${id})` : resource
			throw new NotFoundException(`${resourceLabel} not found`)
		}

		return data
	}

	/**
	 * Executes a .single() query with optimistic locking
	 *
	 * @template T - Result type
	 * @param queryPromise - Supabase query promise (must include .eq('version', expectedVersion))
	 * @param context - Error context (must include metadata.expectedVersion)
	 * @returns Resolved data
	 * @throws {ConflictException} if version mismatch (PGRST116)
	 * @throws {NotFoundException} if resource not found
	 * @throws {HttpException} for other errors
	 *
	 * @example
	 * ```typescript
	 * const updatedProperty = await this.queryHelpers.querySingleWithVersion(
	 *   client.from('property')
	 *     .update(updateData)
	 *     .eq('id', propertyId)
	 *     .eq('version', expectedVersion)
	 *     .select()
	 *     .single(),
	 *   {
	 *     resource: 'property',
	 *     id: propertyId,
	 *     operation: 'update',
	 *     metadata: { expectedVersion }
	 *   }
	 * )
	 * ```
	 */
	async querySingleWithVersion<T>(
		queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
		context: SupabaseErrorContext & { metadata: { expectedVersion: number } }
	): Promise<T> {
		const { data, error } = await queryPromise

		// Detect optimistic locking conflict (PGRST116 = 0 rows affected)
		if (error) {
			if (this.errorHandler.isOptimisticLockingConflict(error)) {
				this.errorHandler.throwOptimisticLockingError(context)
			}
			this.errorHandler.mapAndThrow(error, context)
		}
		if (!data) {
			// Data is null but no error = not found
			const { resource = 'Resource', id } = context
			throw new NotFoundException(`${resource}${id ? ` (${id})` : ''} not found`)
		}

		return data
	}

	/**
	 * Executes a list query with automatic error handling
	 *
	 * @template T - Result type
	 * @param queryPromise - Supabase query promise
	 * @param context - Error context for logging
	 * @returns Resolved data array (never null, defaults to empty array)
	 * @throws {HttpException} for Supabase errors
	 *
	 * @example
	 * ```typescript
	 * const properties = await this.queryHelpers.queryList(
	 *   client.from('property').select('*').eq('ownerId', userId),
	 *   { resource: 'property', operation: 'findAll', userId }
	 * )
	 * ```
	 */
	async queryList<T>(
		queryPromise: PromiseLike<PostgrestResponse<T>> | PostgrestFilterBuilder<any, any, T>,
		context: SupabaseErrorContext = {}
	): Promise<T[]> {
		const { data, error } = await queryPromise

		if (error) {
			this.errorHandler.mapAndThrow(error, context)
		}

		return data ?? []
	}

	/**
	 * Executes a count query with automatic error handling
	 *
	 * @param queryPromise - Supabase query promise with .count()
	 * @param context - Error context for logging
	 * @returns Total count (defaults to 0 on error)
	 *
	 * @example
	 * ```typescript
	 * const totalProperties = await this.queryHelpers.queryCount(
	 *   client.from('property').select('*', { count: 'exact', head: true }).eq('ownerId', userId),
	 *   { resource: 'property', operation: 'count', userId }
	 * )
	 * ```
	 */
	async queryCount(
		queryPromise: PromiseLike<PostgrestResponse<unknown>>,
		context: SupabaseErrorContext = {}
	): Promise<number> {
		const { count, error } = await queryPromise

		if (error) {
			this.errorHandler.mapAndThrow(error, context)
		}

		return count ?? 0
	}
}
