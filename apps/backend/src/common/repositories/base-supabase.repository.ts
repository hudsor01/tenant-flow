import { Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import type { 
	Database, 
	RawTablesType, 
	TablesInsert, 
	TablesUpdate
} from '@repo/shared/types/supabase'
import { ErrorHandlerService } from '../errors/error-handler.service'
import { SupabaseService } from '../supabase/supabase.service'
import { MultiTenantSupabaseService } from '../supabase/multi-tenant-supabase.service'

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
 * for all Supabase tables. Uses string table names for compatibility.
 */
@Injectable()
export abstract class BaseSupabaseRepository<T = Record<string, unknown>> {
	protected abstract readonly tableName: string
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
	 * Find multiple records with filtering, sorting, and pagination
	 */
	async find(
		options: FindOptions = {},
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)
			let query = client
				.from(this.tableName as keyof RawTablesType)
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
						ascending: orderBy.ascending !== false
					})
				}
			}

			// Apply pagination
			if (options.limit) {
				query = query.limit(options.limit)
			}
			if (options.offset) {
				query = query.range(
					options.offset,
					options.offset + (options.limit || 10) - 1
				)
			}

			const { data, error } = await query

			if (error) {
				this.logger.error(`Error finding records in ${this.tableName}:`, error)
				throw this.errorHandler.handleError(error, { operation: 'find' })
			}

			return (data || []) as T[]
		} catch (error) {
			this.logger.error(`Failed to find records in ${this.tableName}:`, error)
			throw error
		}
	}

	/**
	 * Find all records
	 */
	async findAll(userId?: string, userToken?: string): Promise<T[]> {
		return this.find({}, userId, userToken)
	}

	/**
	 * Find all records with pagination
	 */
	async findMany(
		options: PaginationOptions = {},
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		const { page, limit = 10, offset } = options
		const actualOffset = page ? (page - 1) * limit : offset || 0

		return this.find(
			{
				limit,
				offset: actualOffset
			},
			userId,
			userToken
		)
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

			const { data, error } = await client
				.from(this.tableName as keyof RawTablesType)
				.select('*')
				.eq('id', id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				this.logger.error(
					`Error finding record by ID in ${this.tableName}:`,
					error
				)
				throw this.errorHandler.handleError(error, { operation: 'find' })
			}

			return data as T
		} catch (error) {
			this.logger.error(
				`Failed to find record by ID in ${this.tableName}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Find a single record by field
	 */
	async findByField(
		field: string,
		value: string | number | boolean,
		userId?: string,
		userToken?: string
	): Promise<T | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName as keyof RawTablesType)
				.select('*')
				.eq(field, value)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				this.logger.error(
					`Error finding record by field in ${this.tableName}:`,
					error
				)
				throw this.errorHandler.handleError(error, { operation: 'find' })
			}

			return data as T
		} catch (error) {
			this.logger.error(
				`Failed to find record by field in ${this.tableName}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Count records with optional filtering
	 */
	async count(
		filters?: { column: string; operator: string; value: unknown }[],
		userId?: string,
		userToken?: string
	): Promise<number> {
		try {
			const client = await this.getClient(userId, userToken)
			let query = client
				.from(this.tableName as keyof RawTablesType)
				.select('*', { count: 'exact', head: true })

			// Apply filters
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
				this.logger.error(`Error counting records in ${this.tableName}:`, error)
				throw this.errorHandler.handleError(error, { operation: 'find' })
			}

			return count || 0
		} catch (error) {
			this.logger.error(`Failed to count records in ${this.tableName}:`, error)
			throw error
		}
	}

	/**
	 * Create a new record
	 */
	async create(
		data: Record<string, unknown>,
		userId?: string,
		userToken?: string
	): Promise<T> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: created, error } = await client
				.from(this.tableName as keyof RawTablesType)
				.insert(data as TablesInsert<keyof RawTablesType>)
				.select('*')
				.single()

			if (error) {
				this.logger.error(`Error creating record in ${this.tableName}:`, error)
				throw this.errorHandler.handleError(error, { operation: 'create' })
			}

			return created as T
		} catch (error) {
			this.logger.error(`Failed to create record in ${this.tableName}:`, error)
			throw error
		}
	}

	/**
	 * Update a record by ID
	 */
	async update(
		id: string,
		data: Record<string, unknown>,
		userId?: string,
		userToken?: string
	): Promise<T> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: updated, error } = await client
				.from(this.tableName as keyof RawTablesType)
				.update(data as TablesUpdate<keyof RawTablesType>)
				.eq('id', id)
				.select('*')
				.single()

			if (error) {
				this.logger.error(`Error updating record in ${this.tableName}:`, error)
				throw this.errorHandler.handleError(error, { operation: 'update' })
			}

			return updated as T
		} catch (error) {
			this.logger.error(`Failed to update record in ${this.tableName}:`, error)
			throw error
		}
	}

	/**
	 * Delete a record by ID
	 */
	async delete(
		id: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			const client = await this.getClient(userId, userToken)

			const { error } = await client
				.from(this.tableName as keyof RawTablesType)
				.delete()
				.eq('id', id)

			if (error) {
				this.logger.error(`Error deleting record in ${this.tableName}:`, error)
				throw this.errorHandler.handleError(error, { operation: 'find' })
			}
		} catch (error) {
			this.logger.error(`Failed to delete record in ${this.tableName}:`, error)
			throw error
		}
	}

	/**
	 * Create multiple records
	 */
	async createMany(
		data: Record<string, unknown>[],
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data: created, error } = await client
				.from(this.tableName as keyof RawTablesType)
				.insert(data as TablesInsert<keyof RawTablesType>[])
				.select('*')

			if (error) {
				this.logger.error(
					`Error creating multiple records in ${this.tableName}:`,
					error
				)
				throw this.errorHandler.handleError(error, { operation: 'createMany' })
			}

			return (created || []) as T[]
		} catch (error) {
			this.logger.error(
				`Failed to create multiple records in ${this.tableName}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Update multiple records based on filters
	 */
	async updateMany(
		filters: { column: string; operator: string; value: unknown }[],
		data: Record<string, unknown>,
		userId?: string,
		userToken?: string
	): Promise<T[]> {
		try {
			const client = await this.getClient(userId, userToken)
			 
			let query = client.from(this.tableName as keyof RawTablesType).update(data as TablesUpdate<keyof RawTablesType>)

			for (const filter of filters) {
				query = query.filter(
					filter.column,
					filter.operator,
					filter.value
				)
			}

			const { data: updated, error } = await query.select('*')

			if (error) {
				this.logger.error(
					`Error updating multiple records in ${this.tableName}:`,
					error
				)
				throw this.errorHandler.handleError(error, { operation: 'updateMany' })
			}

			return (updated || []) as T[]
		} catch (error) {
			this.logger.error(
				`Failed to update multiple records in ${this.tableName}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Delete multiple records based on filters
	 */
	async deleteMany(
		filters: { column: string; operator: string; value: unknown }[],
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			const client = await this.getClient(userId, userToken)

			let query = client.from(this.tableName as keyof RawTablesType).delete()

			for (const filter of filters) {
				query = query.filter(
					filter.column,
					filter.operator,
					filter.value
				)
			}

			const { error } = await query

			if (error) {
				this.logger.error(
					`Error deleting multiple records in ${this.tableName}:`,
					error
				)
				throw this.errorHandler.handleError(error, { operation: 'find' })
			}
		} catch (error) {
			this.logger.error(
				`Failed to delete multiple records in ${this.tableName}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Check if a record exists by ID
	 */
	async exists(
		id: string,
		userId?: string,
		userToken?: string
	): Promise<boolean> {
		const record = await this.findById(id, userId, userToken)
		return record !== null
	}

	/**
	 * Upsert (insert or update) a record
	 */
	async upsert(
		data: Partial<T> & { id?: string },
		userId?: string,
		userToken?: string
	): Promise<T> {
		if (data.id && (await this.exists(data.id, userId, userToken))) {
			return this.update(data.id, data, userId, userToken)
		} else {
			return this.create(data, userId, userToken)
		}
	}
}