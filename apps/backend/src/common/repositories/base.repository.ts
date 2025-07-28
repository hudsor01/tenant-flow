import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { UnifiedErrors } from '../errors/unified-error-handler'

// Generic types for Prisma operations
interface PrismaDelegate {
  findMany: (args?: unknown) => Promise<unknown[]>
  findFirst: (args?: unknown) => Promise<unknown | null>
  findUnique: (args?: unknown) => Promise<unknown | null>
  count: (args?: unknown) => Promise<number>
  create: (args: unknown) => Promise<unknown>
  update: (args: unknown) => Promise<unknown>
  delete: (args: unknown) => Promise<unknown>
}

type WhereInput = Record<string, unknown>
interface FindOptions {
  where?: WhereInput
  include?: Record<string, unknown>
  select?: Record<string, unknown>
  orderBy?: Record<string, unknown>
  take?: number
  skip?: number
}

interface CreateOptions {
  data: Record<string, unknown>
  include?: Record<string, unknown>
  select?: Record<string, unknown>
}

interface UpdateOptions {
  where: WhereInput
  data: Record<string, unknown>
  include?: Record<string, unknown>
  select?: Record<string, unknown>
}

interface DeleteOptions {
  where: WhereInput
  include?: Record<string, unknown>
  select?: Record<string, unknown>
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
export abstract class BaseRepository {
    protected abstract readonly modelName: string
    protected readonly logger: Logger
    
    constructor(protected readonly prisma: PrismaService) {
        this.logger = new Logger(`${this.constructor.name}`)
    }
    
    /**
     * Get the Prisma delegate for the model
     */
    protected get model(): PrismaDelegate {
        return (this.prisma as any)[this.modelName]
    }
    
    /**
     * Find many records with optional pagination
     */
    async findMany(options: FindOptions & PaginationOptions = {}): Promise<unknown[]> {
        const { limit, offset, ...findOptions } = options
        
        const queryOptions: FindOptions = {
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
    async findManyPaginated(options: FindOptions & PaginationOptions = {}) {
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
    async findOne(options: FindOptions): Promise<unknown | null> {
        return await this.model.findFirst(options)
    }
    
    /**
     * Find by ID
     */
    async findById(id: string, options?: Omit<FindOptions, 'where'>): Promise<unknown | null> {
        return await this.model.findUnique({
            where: { id },
            ...options
        })
    }
    
    /**
     * Count records
     */
    async count(options: { where?: WhereInput } = {}): Promise<number> {
        return await this.model.count(options)
    }
    
    /**
     * Create a new record
     */
    async create(options: CreateOptions): Promise<unknown> {
        try {
            const startTime = Date.now()
            const result = await this.model.create(options)
            
            const duration = Date.now() - startTime
            this.logger.log(`Created ${this.modelName} in ${duration}ms`, {
                id: (result as { id?: string }).id
            })
            
            return result
        } catch (error) {
            this.logger.error(`Error creating ${this.modelName}`, error)
            
            // Handle unique constraint violations
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                throw UnifiedErrors.conflict(`${this.modelName} already exists`, this.modelName)
            }
            
            throw error
        }
    }
    
    /**
     * Update a record
     */
    async update(options: UpdateOptions): Promise<unknown> {
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
                throw UnifiedErrors.notFound(this.modelName)
            }
            
            throw error
        }
    }
    
    /**
     * Update by ID
     */
    async updateById(id: string, data: Record<string, unknown>, options?: Omit<UpdateOptions, 'where' | 'data'>): Promise<unknown> {
        return await this.update({
            where: { id },
            data,
            ...options
        })
    }
    
    /**
     * Delete a record
     */
    async delete(options: DeleteOptions): Promise<unknown> {
        try {
            const result = await this.model.delete(options)
            this.logger.log(`Deleted ${this.modelName}`)
            return result
        } catch (error) {
            this.logger.error(`Error deleting ${this.modelName}`, error)
            
            // Handle record not found
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                throw UnifiedErrors.notFound(this.modelName)
            }
            
            throw error
        }
    }
    
    /**
     * Delete by ID
     */
    async deleteById(id: string) {
        return await this.delete({
            where: { id }
        })
    }
    
    /**
     * Check if a record exists
     */
    async exists(where: WhereInput): Promise<boolean> {
        const count = await this.count({ where })
        return count > 0
    }
    
    /**
     * Find many records by owner
     * Common pattern across properties, units, tenants
     */
    async findManyByOwner(ownerId: string, options: FindOptions & PaginationOptions = {}): Promise<unknown[]> {
        const whereWithOwner = this.addOwnerFilter(options.where || {}, ownerId)
        
        return await this.findMany({
            ...options,
            where: whereWithOwner
        })
    }
    
    /**
     * Find many records by owner with pagination
     */
    async findManyByOwnerPaginated(ownerId: string, options: FindOptions & PaginationOptions = {}) {
        const whereWithOwner = this.addOwnerFilter(options.where || {}, ownerId)
        
        return await this.findManyPaginated({
            ...options,
            where: whereWithOwner
        })
    }
    
    /**
     * Add owner filter to where clause
     * Override in child classes for model-specific owner filtering
     */
    protected addOwnerFilter(where: WhereInput, ownerId: string): WhereInput {
        return {
            ...where,
            ownerId
        }
    }
    
    /**
     * Apply search filter to where clause
     * Override in child classes for model-specific search fields
     */
    protected applySearchFilter(where: WhereInput, _search: string): WhereInput {
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