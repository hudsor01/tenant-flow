import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../errors/error-handler.service'

// Generic types for Prisma operations with proper typing
type PrismaInclude = Record<string, boolean | Record<string, unknown>>
type PrismaSelect = Record<string, boolean | Record<string, unknown>>
type PrismaOrderBy = Record<string, 'asc' | 'desc'> | Record<string, unknown> | Record<string, unknown>[]

interface PrismaDelegate<T, TCreate, TUpdate, TWhere> {
  findMany: (args?: { where?: TWhere; include?: PrismaInclude; select?: PrismaSelect; orderBy?: PrismaOrderBy; take?: number; skip?: number }) => Promise<T[]>
  findFirst: (args?: { where?: TWhere; include?: PrismaInclude; select?: PrismaSelect }) => Promise<T | null>
  findUnique: (args: { where: { id: string } & Partial<TWhere>; include?: PrismaInclude; select?: PrismaSelect }) => Promise<T | null>
  count: (args?: { where?: TWhere }) => Promise<number>
  create: (args: { data: TCreate; include?: PrismaInclude; select?: PrismaSelect }) => Promise<T>
  update: (args: { where: TWhere; data: TUpdate; include?: PrismaInclude; select?: PrismaSelect }) => Promise<T>
  delete: (args: { where: TWhere; include?: PrismaInclude; select?: PrismaSelect }) => Promise<T>
}

interface FindOptions<TWhere> {
  where?: TWhere
  include?: PrismaInclude
  select?: PrismaSelect
  orderBy?: PrismaOrderBy
  take?: number
  skip?: number
}

interface CreateOptions<TCreate> {
  data: TCreate
  include?: PrismaInclude
  select?: PrismaSelect
}

interface UpdateOptions<TUpdate, TWhere> {
  where: TWhere
  data: TUpdate
  include?: PrismaInclude
  select?: PrismaSelect
}

interface DeleteOptions<TWhere> {
  where: TWhere
  include?: PrismaInclude
  select?: PrismaSelect
}

interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Base repository class that provides common CRUD operations
 * for all Prisma models. Reduces code duplication across services.
 * Simplified to avoid TypeScript compilation issues.
 */
@Injectable()
export abstract class BaseRepository<T = unknown, TCreate = unknown, TUpdate = unknown, TWhere = unknown> {
    protected abstract readonly modelName: string
    protected readonly logger: Logger
    private readonly errorHandler = new ErrorHandlerService()
    
    constructor(protected readonly prisma: PrismaService) {
        this.logger = new Logger(`${this.constructor.name}`)
    }
    
    /**
     * Get the Prisma delegate for the model
     */
    protected get model(): PrismaDelegate<T, TCreate, TUpdate, TWhere> {
        const prismaModel = (this.prisma as unknown as Record<string, unknown>)[this.modelName]
        if (!prismaModel) {
            throw new Error(`Model ${this.modelName} not found in Prisma client`)
        }
        return prismaModel as PrismaDelegate<T, TCreate, TUpdate, TWhere>
    }
    
    /**
     * Find many records with optional pagination
     */
    async findMany(options: FindOptions<TWhere> & PaginationOptions = {}): Promise<T[]> {
        const { limit, offset, ...findOptions } = options
        
        const queryOptions: FindOptions<TWhere> = {
            ...findOptions
        }
        
        if (limit !== undefined) {
            queryOptions.take = limit
        }
        
        if (offset !== undefined) {
            queryOptions.skip = offset
        }
        
        return await this.model.findMany(queryOptions)
    }
    
    /**
     * Find many records with pagination metadata
     */
    async findManyPaginated(options: FindOptions<TWhere> & PaginationOptions = {}) {
        const { page = 1, limit = 10, offset, ...findOptions } = options
        
        // Calculate actual offset
        const actualOffset = offset ?? (page - 1) * limit
        
        // Execute queries in parallel
        const [items, total] = await Promise.all([
            this.findMany({
                ...findOptions,
                limit,
                offset: actualOffset
            }),
            this.count({ where: findOptions.where })
        ])
        
        return {
            items,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit)
        }
    }
    
    /**
     * Find one record
     */
    async findOne(options: FindOptions<TWhere>): Promise<T | null> {
        return await this.model.findFirst(options)
    }
    
    /**
     * Find by ID
     */
    async findById(id: string, options?: Omit<FindOptions<TWhere>, 'where'>): Promise<T | null> {
        return await this.model.findUnique({
            where: { id } as { id: string } & Partial<TWhere>,
            ...options
        })
    }
    
    /**
     * Count records
     */
    async count(options: { where?: TWhere } = {}): Promise<number> {
        return await this.model.count(options)
    }
    
    /**
     * Create a new record
     */
    async create(options: CreateOptions<TCreate>): Promise<T> {
        try {
            const startTime = Date.now()
            const result = await this.model.create(options)
            
            const duration = Date.now() - startTime
            this.logger.log(`Created ${this.modelName} in ${duration}ms`, {
                id: (result as T & { id?: string }).id
            })
            
            return result
        } catch (error) {
            this.logger.error(`Error creating ${this.modelName}`, error)
            
            // Handle unique constraint violations
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                throw this.errorHandler.createBusinessError(ErrorCode.CONFLICT, `${this.modelName} already exists`, { metadata: { modelName: this.modelName } })
            }
            
            throw error
        }
    }
    
    /**
     * Update a record
     */
    async update(options: UpdateOptions<TUpdate, TWhere>): Promise<T> {
        try {
            const startTime = Date.now()
            const result = await this.model.update(options)
            
            const duration = Date.now() - startTime
            this.logger.log(`Updated ${this.modelName} in ${duration}ms`)
            
            return result
        } catch (error) {
            this.logger.error(`Error updating ${this.modelName}`, error)
            
            // Handle record not found
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                throw this.errorHandler.createNotFoundError(this.modelName, 'Record not found')
            }
            
            throw error
        }
    }
    
    /**
     * Update by ID
     */
    async updateById(id: string, data: TUpdate, options?: Omit<UpdateOptions<TUpdate, TWhere>, 'where' | 'data'>): Promise<T> {
        return await this.update({
            where: { id } as TWhere,
            data,
            ...options
        })
    }
    
    /**
     * Delete a record with ownership validation
     */
    async delete(options: DeleteOptions<TWhere>): Promise<T> {
        try {
            // Validate ownership before deletion for security
            this.validateOwnershipInWhere(options.where)
            
            const result = await this.model.delete(options)
            this.logger.log(`Deleted ${this.modelName} with ownership validation`)
            return result
        } catch (error) {
            this.logger.error(`Error deleting ${this.modelName}`, error)
            
            // Handle record not found
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                throw this.errorHandler.createNotFoundError(this.modelName, 'Record not found')
            }
            
            throw error
        }
    }
    
    /**
     * Delete by ID - SECURITY WARNING: Use delete() with owner validation instead
     * This method bypasses ownership checks and should only be used for system operations
     */
    async deleteById(id: string) {
        this.logger.warn(`SECURITY WARNING: deleteById() called without owner validation for ${this.modelName}`, {
            id,
            stack: new Error().stack
        })
        
        return await this.delete({
            where: { id } as TWhere
        })
    }

    /**
     * Validates that a where clause includes proper ownership validation
     * This helps prevent accidental bypasses of multi-tenant security
     */
    protected validateOwnershipInWhere(where: TWhere): void {
        if (!where || typeof where !== 'object') {
            throw new Error(`Security violation: delete operations must include ownership validation`)
        }

        // Check for common ownership fields
        const hasOwnership = 'ownerId' in where || 
                           'organizationId' in where ||
                           'userId' in where ||
                           ('AND' in where && Array.isArray((where as { AND: unknown[] }).AND))

        if (!hasOwnership) {
            this.logger.error(`SECURITY VIOLATION: Delete attempted without ownership validation`, {
                modelName: this.modelName,
                where: JSON.stringify(where),
                stack: new Error().stack
            })
            throw new Error(`Security violation: delete operations must include ownership validation for ${this.modelName}`)
        }
    }
    
    /**
     * Check if a record exists
     */
    async exists(where: TWhere): Promise<boolean> {
        const count = await this.count({ where })
        return count > 0
    }
    
    /**
     * Find many records by owner
     * Common pattern across properties, units, tenants
     */
    async findManyByOwner(ownerId: string, options: FindOptions<TWhere> & PaginationOptions = {}): Promise<T[]> {
        const whereWithOwner = this.addOwnerFilter(options.where || {} as TWhere, ownerId)
        
        return await this.findMany({
            ...options,
            where: whereWithOwner
        })
    }
    
    /**
     * Find many records by owner with pagination
     */
    async findManyByOwnerPaginated(ownerId: string, options: FindOptions<TWhere> & PaginationOptions = {}) {
        const whereWithOwner = this.addOwnerFilter(options.where || {} as TWhere, ownerId)
        
        return await this.findManyPaginated({
            ...options,
            where: whereWithOwner
        })
    }
    
    /**
     * Add owner filter to where clause
     * Override in child classes for model-specific owner filtering
     */
    protected addOwnerFilter(where: TWhere, ownerId: string): TWhere {
        return {
            ...where,
            ownerId
        } as TWhere
    }
    
    /**
     * Apply search filter to where clause
     * Override in child classes for model-specific search fields
     */
    protected applySearchFilter(where: TWhere, _search: string): TWhere {
        return where
    }
    
    /**
     * Find first matching record
     */
    async findFirst(options: FindOptions<TWhere> = {}): Promise<T | null> {
        const { where, include, select } = options
        return await this.model.findFirst({
            where,
            include,
            select
        })
    }
    
    /**
     * Find records by owner (alias for findManyByOwner)
     */
    async findByOwner(ownerId: string, options: Partial<FindOptions<TWhere>> = {}): Promise<T[]> {
        return await this.findManyByOwner(ownerId, options)
    }
    
    /**
     * Find record by ID and owner
     */
    async findByIdAndOwner(id: string, ownerId: string, _includeDetails?: boolean): Promise<T | null> {
        const whereWithOwner = this.addOwnerFilter({ id } as TWhere, ownerId)
        return await this.model.findFirst({
            where: whereWithOwner
        })
    }
    
    /**
     * Get statistics by owner (to be overridden by specific repositories)
     */
    async getStatsByOwner(ownerId: string): Promise<Record<string, unknown>> {
        const total = await this.count({ where: this.addOwnerFilter({} as TWhere, ownerId) })
        return { total }
    }
    
    /**
     * Parse and validate query parameters
     * Common pattern for list endpoints
     */
    parseQueryParams(query: Record<string, unknown>) {
        const limit = query.limit ? parseInt(String(query.limit)) : undefined
        const offset = query.offset ? parseInt(String(query.offset)) : undefined
        const page = query.page ? parseInt(String(query.page)) : undefined
        
        return {
            ...query,
            limit,
            offset,
            page,
            search: query.search ? String(query.search).trim() : undefined
        }
    }
}