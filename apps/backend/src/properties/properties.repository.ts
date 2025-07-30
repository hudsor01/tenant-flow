import { Injectable } from '@nestjs/common'
import { Property, PropertyType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface PropertyWithRelations extends Property {
    Unit?: {
        id: string
        unitNumber: string
        status: string
        rent: number
    }[]
    _count?: {
        Unit: number
    }
}

export interface PropertyQueryOptions {
    propertyType?: PropertyType
    search?: string
    status?: string
    limit?: number
    offset?: number
    page?: number
}

// Add common repository methods for compatibility
export interface CommonRepositoryMethods {
    exists(where: Record<string, unknown>): Promise<boolean>
    count(options?: { where?: Record<string, unknown> }): Promise<number>
    create(params: { data: unknown }): Promise<Property>
    update(params: { where: unknown; data: unknown }): Promise<Property>
    deleteById(id: string): Promise<Property>
    findMany(params: unknown): Promise<Property[]>
    findOne(params: unknown): Promise<Property | null>
    parseQueryParams(options: PropertyQueryOptions): { take?: number; skip?: number }
}

/**
 * Repository for Property entity
 * Extends BaseRepository to inherit common CRUD operations
 */
@Injectable()
export class PropertiesRepository implements CommonRepositoryMethods {
    
    constructor(private prismaService: PrismaService) {}
    
    // Access to the property model
    get model() {
        return this.prismaService.property
    }
    
    // Access to prisma for complex queries
    get prismaClient() {
        return this.prismaService
    }
    
    /**
     * Apply search filter for properties
     * Searches in name, address, and city fields
     */
    private applySearchFilter(where: Record<string, unknown>, search: string): Record<string, unknown> {
        return {
            ...where,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } }
            ]
        }
    }
    
    /**
     * Find properties by owner with specific includes
     */
    async findByOwnerWithUnits(
        ownerId: string,
        options: PropertyQueryOptions = {}
    ) {
        const { propertyType, search, status, ...paginationOptions } = options
        
        let where: Record<string, unknown> = { ownerId }
        
        // Add property type filter
        if (propertyType) {
            where.propertyType = propertyType
        }
        
        // Add search filter
        if (search) {
            where = this.applySearchFilter(where, search)
        }
        
        // Add status filter if provided
        if (status) {
            where.status = status
        }
        
        return await this.model.findMany({
            where,
            include: {
                Unit: true,
                _count: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: paginationOptions.limit ? Math.min(paginationOptions.limit, 1000) : undefined,
            skip: paginationOptions.offset || (paginationOptions.page ? (paginationOptions.page - 1) * (paginationOptions.limit || 20) : undefined)
        })
    }
    
    /**
     * Get property statistics for owner
     */
    async getStatsByOwner(ownerId: string) {
        const [propertyCount, unitCount] = await Promise.all([
            this.model.count({ where: { ownerId } }),
            this.prismaService.unit.count({
                where: {
                    Property: {
                        ownerId
                    }
                }
            })
        ])
        
        return {
            totalProperties: propertyCount,
            totalUnits: unitCount
        }
    }
    
    /**
     * Find property by ID with owner check
     */
    async findByIdAndOwner(
        id: string,
        ownerId: string,
        includeUnits = false
    ) {
        return await this.model.findUnique({
            where: {
                id,
                ownerId
            },
            include: includeUnits ? {
                Unit: true
            } : undefined
        })
    }
    
    /**
     * Create property with units
     */
    async createWithUnits(data: Prisma.PropertyCreateInput, unitCount = 1) {
        // Create property with units in a transaction
        return await this.prismaService.$transaction(async (tx) => {
            // Create the property
            const property = await tx.property.create({ data })
            
            // Create default units if specified
            if (unitCount > 0) {
                const units = Array.from({ length: unitCount }, (_, i) => ({
                    propertyId: property.id,
                    unitNumber: `${i + 1}`,
                    bedrooms: 1,
                    bathrooms: 1,
                    rent: 0,
                    status: 'VACANT' as const
                }))
                
                await tx.unit.createMany({ data: units })
            }
            
            return property
        })
    }
    
    // Implement compatibility methods from BaseRepository
    async exists(where: Record<string, unknown>): Promise<boolean> {
        const result = await this.model.findFirst(
            { where, select: { id: true } }
        )
        return result !== null
    }
    
    async count(options: { where?: Record<string, unknown> } = {}): Promise<number> {
        return await this.model.count(options)
    }
    
    async create(params: { data: unknown }): Promise<Property> {
        const data = params.data as Prisma.PropertyCreateInput
        return await this.model.create({ data })
    }
    
    async update(params: { where: unknown; data: unknown }): Promise<Property> {
        const data = params.data as Prisma.PropertyUpdateInput
        const where = params.where as Prisma.PropertyWhereUniqueInput
        return await this.model.update({ where, data })
    }
    
    async deleteById(id: string): Promise<Property> {
        return await this.model.delete({ where: { id } })
    }
    
    async findMany(params: unknown): Promise<Property[]> {
        const queryParams = params as Parameters<typeof this.model.findMany>[0]
        return await this.model.findMany(queryParams)
    }
    
    async findOne(params: unknown): Promise<Property | null> {
        const queryParams = params as Parameters<typeof this.model.findUnique>[0]
        return await this.model.findUnique(queryParams)
    }
    
    parseQueryParams(options: PropertyQueryOptions): { take?: number; skip?: number } {
        return {
            take: options.limit ? Math.min(options.limit, 1000) : undefined,
            skip: options.offset || (options.page && options.limit ? (options.page - 1) * options.limit : undefined)
        }
    }
}