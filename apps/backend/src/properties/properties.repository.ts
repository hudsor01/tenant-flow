import { Injectable } from '@nestjs/common'
import { Property, PropertyType, Prisma } from '@prisma/client'
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
export class PropertiesRepository extends BaseRepository {
    protected readonly modelName = 'property'
    
    /**
     * Apply search filter for properties
     * Searches in name, address, and city fields
     */
    protected override applySearchFilter(where: Record<string, unknown>, search: string): Record<string, unknown> {
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
        
        return await this.findMany({
            where,
            include: {
                Unit: {
                    select: {
                        id: true,
                        unitNumber: true,
                        status: true,
                        rent: true
                    }
                },
                _count: {
                    select: {
                        Unit: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        })
    }
    
    /**
     * Get property statistics for owner
     */
    async getStatsByOwner(ownerId: string) {
        const [propertyCount, unitCount] = await Promise.all([
            this.count({ where: { ownerId } }),
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
    async findByIdAndOwner(
        id: string,
        ownerId: string,
        includeUnits = false
    ) {
        return await this.findOne({
            where: {
                id,
                ownerId
            },
            include: includeUnits ? {
                Unit: {
                    include: {
                        Lease: {
                            where: {
                                status: 'ACTIVE'
                            },
                            include: {
                                Tenant: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        },
                        MaintenanceRequest: {
                            where: {
                                status: {
                                    not: 'COMPLETED'
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            },
                            take: 5
                        },
                        _count: {
                            select: {
                                Lease: true,
                                MaintenanceRequest: true
                            }
                        }
                    }
                }
            } : undefined
        })
    }
    
    /**
     * Create property with units
     */
    async createWithUnits(data: Prisma.PropertyCreateInput, unitCount = 1) {
        // Create property with units in a transaction
        return await this.prisma.$transaction(async (tx) => {
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
}