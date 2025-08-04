import { Injectable } from '@nestjs/common'
import { Property, PropertyType, Prisma } from '@repo/database'
import { PrismaService } from '../prisma/prisma.service'
import { BaseRepository } from '../common/repositories/base.repository'

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


/**
 * Repository for Property entity
 * Extends BaseRepository to inherit common CRUD operations
 */
@Injectable()
export class PropertiesRepository extends BaseRepository<
    Property,
    Prisma.PropertyCreateInput,
    Prisma.PropertyUpdateInput,
    Prisma.PropertyWhereInput
> {
    protected readonly modelName = 'property'
    
    constructor(prisma: PrismaService) {
        super(prisma)
    }
    
    // Access to prisma for complex queries
    get prismaClient() {
        return this.prisma
    }
    
    /**
     * Apply search filter for properties
     * Searches in name, address, and city fields
     */
    protected override applySearchFilter(where: Prisma.PropertyWhereInput, search: string): Prisma.PropertyWhereInput {
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
        const { propertyType, search, status: _status, ...paginationOptions } = options
        
        let where: Prisma.PropertyWhereInput = { ownerId }
        
        // Add property type filter
        if (propertyType) {
            where.propertyType = propertyType
        }
        
        // Add search filter
        if (search) {
            where = this.applySearchFilter(where, search)
        }
        
        // Note: Property model doesn't have a status field, so status filter is not applicable
        
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
    override async getStatsByOwner(ownerId: string) {
        const [propertyCount, unitCount] = await Promise.all([
            this.model.count({ where: { ownerId } }),
            this.prisma.unit.count({
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
    override async findByIdAndOwner(
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
        return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    
    /**
     * Override addOwnerFilter for property-specific owner filtering
     */
    protected override addOwnerFilter(where: Prisma.PropertyWhereInput, ownerId: string): Prisma.PropertyWhereInput {
        return {
            ...where,
            ownerId
        }
    }
}