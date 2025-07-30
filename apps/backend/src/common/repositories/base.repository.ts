import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../errors/error-handler.service'

// Generic types for Prisma operations with proper typing
interface PrismaDelegate<T, TCreate, TUpdate, TWhere> {
  findMany: (args?: { where?: TWhere; include?: Record<string, boolean>; select?: Record<string, boolean>; orderBy?: Record<string, 'asc' | 'desc'>; take?: number; skip?: number }) => Promise<T[]>
  findFirst: (args?: { where?: TWhere; include?: Record<string, boolean>; select?: Record<string, boolean> }) => Promise<T | null>
  findUnique: (args: { where: { id: string } & Partial<TWhere>; include?: Record<string, boolean>; select?: Record<string, boolean> }) => Promise<T | null>
  count: (args?: { where?: TWhere }) => Promise<number>
  create: (args: { data: TCreate; include?: Record<string, boolean>; select?: Record<string, boolean> }) => Promise<T>
  update: (args: { where: TWhere; data: TUpdate; include?: Record<string, boolean>; select?: Record<string, boolean> }) => Promise<T>
  delete: (args: { where: TWhere; include?: Record<string, boolean>; select?: Record<string, boolean> }) => Promise<T>
}

interface FindOptions<TWhere> {
  where?: TWhere
  include?: Record<string, boolean>
  select?: Record<string, boolean>
  orderBy?: Record<string, 'asc' | 'desc'>
  take?: number
  skip?: number
}

interface CreateOptions<TCreate> {
  data: TCreate
  include?: Record<string, boolean>
  select?: Record<string, boolean>
}

interface UpdateOptions<TUpdate, TWhere> {
  where: TWhere
  data: TUpdate
  include?: Record<string, boolean>
  select?: Record<string, boolean>
}

interface DeleteOptions<TWhere> {
  where: TWhere
  include?: Record<string, boolean>
  select?: Record<string, boolean>
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
     * Delete a record
     */
    async delete(options: DeleteOptions<TWhere>): Promise<T> {
        try {
            const result = await this.model.delete(options)
            this.logger.log(`Deleted ${this.modelName}`)
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
     * Delete by ID
     */
    async deleteById(id: string) {
        return await this.delete({
            where: { id } as TWhere
        })
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
        }
    }
    
    /**
     * Apply search filter to where clause
     * Override in child classes for model-specific search fields
     */
    protected applySearchFilter(where: TWhere, _search: string): TWhere {
        return where
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