import { Injectable, Logger } from '@nestjs/common'
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { ErrorCode, ErrorHandlerService } from '../errors/error-handler.service'
import { SupabaseService } from '../supabase/supabase.service'
import { MultiTenantSupabaseService } from '../supabase/multi-tenant-supabase.service'

// Type aliases for Supabase operations
type Tables = Database['public']['Tables']
type TableName = keyof Tables
type TableRow<T extends TableName> = Tables[T]['Row']
type TableInsert<T extends TableName> = Tables[T]['Insert']
type TableUpdate<T extends TableName> = Tables[T]['Update']

interface FindOptions {
	select?: string
	order?: { column: string; ascending?: boolean }[]
	limit?: number
	offset?: number
	filters?: {
		column: string
		operator: string
		value: unknown
	}[]
}

interface PaginationOptions {
	page?: number
	limit?: number
	offset?: number
}

/**
 * Base repository class that provides common CRUD operations
 * for all Supabase tables. Replaces the Prisma-based BaseRepository.
 */
@Injectable()
export abstract class BaseSupabaseRepository<
	TTableName extends TableName,
	T = TableRow<TTableName>,
	TInsert = TableInsert<TTableName>,
	TUpdate = TableUpdate<TTableName>
> {
	protected abstract readonly tableName: TTableName
	protected readonly logger: Logger
	private readonly errorHandler = new ErrorHandlerService()

	constructor(
		protected readonly supabaseService: SupabaseService,
		protected readonly multiTenantService?: MultiTenantSupabaseService
	) {
		this.logger = new Logger(`${this.constructor.name}`)
	}

	/**
	 * Get the appropriate Supabase client (admin or tenant-scoped)
	 */
	protected async getClient(
		userId?: string,
		userToken?: string
	): Promise<SupabaseClient<Database>> {
		if (userId && this.multiTenantService) {
			return this.multiTenantService.getTenantClient(userId, userToken)
		}
		return this.supabaseService.getAdminClient()
	}

	/**
	 * Find many records with optional filtering and pagination
	 */
	async findMany(
		options: FindOptions & PaginationOptions = {},
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)
			let query = client
				.from(this.tableName)
				.select(options.select || '*')

			// Apply filters
			if (options.filters) {
				for (const filter of options.filters) {
					query = query.filter(
						filter.column,
						filter.operator,
						filter.value
					)
				}
			}

			// Apply ordering
			if (options.order) {
				for (const orderBy of options.order) {
					query = query.order(orderBy.column, {
						ascending: orderBy.ascending ?? true
					})
				}
			}

			// Apply pagination
			const limit = options.limit || 10
			const offset =
				options.offset ||
				(options.page ? (options.page - 1) * limit : 0)

			query = query.range(offset, offset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error(`Error fetching ${this.tableName}:`, error)
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			return (data || []) as T[]
		} catch (error) {
			this.logger.error(`Failed to fetch ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Find many records with pagination metadata
	 */
	async findManyPaginated(
		options: FindOptions & PaginationOptions = {},
		userId?: string,
		userToken?: string
	) {
		const { page = 1, limit = 10 } = options

		// Get total count
		const totalCount = await this.count(options.filters, userId, userToken)

		// Get paginated data
		const data = await this.findMany(
			{ ...options, page, limit },
			userId,
			userToken
		)

		return {
			data,
			pagination: {
				page,
				limit,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limit)
			}
		}
	}

	/**
	 * Find a single record by ID
	 */
	async findById(
		id: string,
		userId?: string,
		userToken?: string
	): Promise<T | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await (
				client
					.from(this.tableName)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.select('*') as any
			)
				.eq('id', id)
				.single()

			if (error) {
				if ((error as PostgrestError).code === 'PGRST116') {
					return null // Not found
				}
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			return data as T
		} catch (error) {
			this.logger.error(`Failed to find ${this.tableName} by ID:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Find first record matching filters
	 */
	async findFirst(
		filters?: { column: string; operator: string; value: unknown }[],
		userId?: string,
		userToken?: string
	): Promise<T | null> {
		try {
			const client = await this.getClient(userId, userToken)
			let query = client.from(this.tableName).select('*')

			if (filters) {
				for (const filter of filters) {
					query = query.filter(
						filter.column,
						filter.operator,
						filter.value
					)
				}
			}

			const { data, error } = await query.limit(1).single()

			if (error) {
				if ((error as PostgrestError).code === 'PGRST116') {
					return null // Not found
				}
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			return data as T
		} catch (error) {
			this.logger.error(`Failed to find first ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Count records matching filters
	 */
	async count(
		filters?: { column: string; operator: string; value: unknown }[],
		userId?: string,
		userToken?: string
	): Promise<number> {
		try {
			const client = await this.getClient(userId, userToken)
			let query = client
				.from(this.tableName)
				.select('*', { count: 'exact', head: true })

			if (filters) {
				for (const filter of filters) {
					query = query.filter(
						filter.column,
						filter.operator,
						filter.value
					)
				}
			}

			const { count, error } = await query

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			return count || 0
		} catch (error) {
			this.logger.error(`Failed to count ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Create a new record
	 */
	async create(
		data: TInsert,
		userId?: string,
		userToken?: string
	): Promise<T> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: created, error } = await (
				client
					.from(this.tableName)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.insert(data as any) as any
			)
				.select('*')
				.single()

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			this.logger.debug(`Created ${this.tableName}:`, created)
			return created as T
		} catch (error) {
			this.logger.error(`Failed to create ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Update a record by ID
	 */
	async update(
		id: string,
		data: TUpdate,
		userId?: string,
		userToken?: string
	): Promise<T> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: updated, error } = await (
				client
					.from(this.tableName)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.update(data as any) as any
			)
				.eq('id', id)
				.select('*')
				.single()

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			this.logger.debug(`Updated ${this.tableName}:`, updated)
			return updated as T
		} catch (error) {
			this.logger.error(`Failed to update ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Delete a record by ID
	 */
	async delete(id: string, userId?: string, userToken?: string): Promise<T> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: deleted, error } = await (
				client
					.from(this.tableName)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.delete() as any
			)
				.eq('id', id)
				.select('*')
				.single()

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			this.logger.debug(`Deleted ${this.tableName}:`, deleted)
			return deleted as T
		} catch (error) {
			this.logger.error(`Failed to delete ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Perform a bulk insert
	 */
	async createMany(
		data: TInsert[],
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: created, error } = await (
				client
					.from(this.tableName)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.insert(data as any) as any
			).select('*')

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			this.logger.debug(
				`Bulk created ${data.length} ${this.tableName} records`
			)
			return (created || []) as T[]
		} catch (error) {
			this.logger.error(`Failed to bulk create ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Perform a bulk update
	 */
	async updateMany(
		filters: { column: string; operator: string; value: unknown }[],
		data: TUpdate,
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let query = client.from(this.tableName).update(data as any)

			for (const filter of filters) {
				query = query.filter(
					filter.column,
					filter.operator,
					filter.value
				)
			}

			const { data: updated, error } = await query.select('*')

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			this.logger.debug(`Bulk updated ${this.tableName} records`)
			return (updated || []) as T[]
		} catch (error) {
			this.logger.error(`Failed to bulk update ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}

	/**
	 * Perform a bulk delete
	 */
	async deleteMany(
		filters: { column: string; operator: string; value: unknown }[],
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)
			let query = client.from(this.tableName).delete()

			for (const filter of filters) {
				query = query.filter(
					filter.column,
					filter.operator,
					filter.value
				)
			}

			const { data: deleted, error } = await query.select('*')

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.DATABASE_ERROR,
					(error as Error).message || 'Database operation failed',
					{ operation: 'database' }
				)
			}

			this.logger.debug(`Bulk deleted ${this.tableName} records`)
			return (deleted || []) as T[]
		} catch (error) {
			this.logger.error(`Failed to bulk delete ${this.tableName}:`, error)
			const message =
				error instanceof Error
					? error.message
					: 'Database operation failed'
			throw this.errorHandler.createBusinessError(
				ErrorCode.DATABASE_ERROR,
				message,
				{ operation: 'database' }
			)
		}
	}
}
