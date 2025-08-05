import { Injectable } from '@nestjs/common'
import { Unit, Prisma, UnitStatus } from '@repo/database'
import { PrismaService } from '../prisma/prisma.service'
import { BaseRepository } from '../common/repositories/base.repository'

export interface UnitQueryOptions {
    propertyId?: string
    status?: UnitStatus
    search?: string
    limit?: number
    offset?: number
    page?: number
}

/**
 * Repository for Unit entity
 * Extends BaseRepository to inherit common CRUD operations
 * Units are owned through property ownership
 */
@Injectable()
export class UnitsRepository extends BaseRepository<
    Unit,
    Prisma.UnitCreateInput,
    Prisma.UnitUpdateInput,
    Prisma.UnitWhereInput
> {
    protected readonly modelName = 'unit'
    
    constructor(prisma: PrismaService) {
        super(prisma)
    }

    /**
     * Override addOwnerFilter for unit-specific owner filtering
     * Units are owned through property ownership
     */
    protected override addOwnerFilter(where: Prisma.UnitWhereInput, ownerId: string): Prisma.UnitWhereInput {
        return {
            ...where,
            Property: {
                ownerId
            }
        }
    }

    /**
     * Apply search filter for units
     * Searches in unit number and property name
     */
    protected override applySearchFilter(where: Prisma.UnitWhereInput, search: string): Prisma.UnitWhereInput {
        return {
            ...where,
            OR: [
                { unitNumber: { contains: search, mode: 'insensitive' } },
                { Property: { name: { contains: search, mode: 'insensitive' } } }
            ]
        }
    }

    /**
     * Find units by owner with full property/lease data
     */
    async findByOwnerWithDetails(
        ownerId: string,
        options: UnitQueryOptions = {}
    ) {
        const { search, status, propertyId, ...paginationOptions } = options
        
        let where: Prisma.UnitWhereInput = this.addOwnerFilter({}, ownerId)
        
        // Add property filter
        if (propertyId) {
            where.propertyId = propertyId
        }

        // Add status filter
        if (status) {
            where.status = status
        }
        
        // Add search filter
        if (search) {
            where = this.applySearchFilter(where, search)
        }
        
        return await this.prisma.unit.findMany({
            where,
            include: {
                Property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true
                    }
                },
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
                    take: 5 // Latest 5 open maintenance requests
                },
                _count: {
                    select: {
                        Lease: true,
                        MaintenanceRequest: true
                    }
                }
            },
            orderBy: [
                {
                    Property: {
                        name: 'asc'
                    }
                },
                {
                    unitNumber: 'asc'
                }
            ],
            take: paginationOptions.limit ? Math.min(paginationOptions.limit, 1000) : undefined,
            skip: paginationOptions.offset || (paginationOptions.page ? (paginationOptions.page - 1) * (paginationOptions.limit || 20) : undefined)
        })
    }

    /**
     * Find units by property with ownership verification
     */
    async findByPropertyAndOwner(
        propertyId: string,
        ownerId: string
    ) {
        // First verify property ownership
        const property = await this.prisma.property.findFirst({
            where: {
                id: propertyId,
                ownerId
            }
        })

        if (!property) {
            return null
        }

        return await this.prisma.unit.findMany({
            where: {
                propertyId
            },
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
                    }
                },
                _count: {
                    select: {
                        Lease: true,
                        MaintenanceRequest: true
                    }
                }
            },
            orderBy: {
                unitNumber: 'asc'
            }
        })
    }

    /**
     * Find unit by ID with owner check and detailed includes
     */
    override async findByIdAndOwner(
        id: string,
        ownerId: string,
        includeDetails = true
    ) {
        const where: Prisma.UnitWhereInput = {
            id,
            Property: {
                ownerId
            }
        }

        return await this.model.findFirst({
            where,
            include: includeDetails ? {
                Property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        zipCode: true
                    }
                },
                Lease: {
                    include: {
                        Tenant: {
                            include: {
                                User: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true,
                                        avatarUrl: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                MaintenanceRequest: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        Expense: true
                    }
                },
                Inspection: {
                    orderBy: {
                        scheduledDate: 'desc'
                    },
                    take: 5 // Last 5 inspections
                }
            } : undefined
        })
    }

    /**
     * Verify property ownership before unit operations
     */
    async verifyPropertyOwnership(propertyId: string, ownerId: string): Promise<boolean> {
        const count = await this.prisma.property.count({
            where: {
                id: propertyId,
                ownerId
            }
        })

        return count > 0
    }

    /**
     * Check if unit has active leases before deletion
     */
    async hasActiveLeases(id: string, ownerId: string): Promise<boolean> {
        const count = await this.model.count({
            where: {
                id,
                Property: {
                    ownerId
                },
                Lease: {
                    some: {
                        status: 'ACTIVE'
                    }
                }
            }
        })

        return count > 0
    }

    /**
     * Get unit statistics for owner
     */
    override async getStatsByOwner(ownerId: string) {
        const [totalUnits, occupiedUnits, vacantUnits, maintenanceUnits] = await Promise.all([
            // Total units
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    }
                }
            }),
            // Occupied units (with active leases)
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    },
                    Lease: {
                        some: {
                            status: 'ACTIVE'
                        }
                    }
                }
            }),
            // Vacant units
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    },
                    status: 'VACANT'
                }
            }),
            // Units under maintenance
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    },
                    status: 'MAINTENANCE'
                }
            })
        ])

        // Calculate average rent
        const rentStats = await this.prisma.unit.aggregate({
            where: {
                Property: {
                    ownerId
                }
            },
            _avg: {
                rent: true
            },
            _sum: {
                rent: true
            }
        })

        return {
            totalUnits,
            occupiedUnits,
            vacantUnits,
            maintenanceUnits,
            averageRent: rentStats._avg.rent || 0,
            totalRentPotential: rentStats._sum.rent || 0,
            occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
        }
    }
}