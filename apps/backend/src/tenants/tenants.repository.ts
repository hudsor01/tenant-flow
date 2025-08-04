import { Injectable } from '@nestjs/common'
import { Tenant, Prisma, LeaseStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { BaseRepository } from '../common/repositories/base.repository'

export interface TenantQueryOptions {
    status?: string
    search?: string
    limit?: number
    offset?: number
    page?: number
}

/**
 * Repository for Tenant entity
 * Extends BaseRepository to inherit common CRUD operations
 * Note: Tenants have indirect ownership through leases
 */
@Injectable()
export class TenantsRepository extends BaseRepository<
    Tenant,
    Prisma.TenantCreateInput,
    Prisma.TenantUpdateInput,
    Prisma.TenantWhereInput
> {
    protected readonly modelName = 'tenant'
    
    constructor(prisma: PrismaService) {
        super(prisma)
    }

    /**
     * Override addOwnerFilter for tenant-specific owner filtering
     * Tenants are owned through property ownership via leases
     */
    protected override addOwnerFilter(where: Prisma.TenantWhereInput, ownerId: string): Prisma.TenantWhereInput {
        return {
            ...where,
            Lease: {
                some: {
                    Unit: {
                        Property: {
                            ownerId
                        }
                    }
                }
            }
        }
    }

    /**
     * Apply search filter for tenants
     * Searches in name, email, and phone fields
     */
    protected override applySearchFilter(where: Prisma.TenantWhereInput, search: string): Prisma.TenantWhereInput {
        return {
            ...where,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ]
        }
    }

    /**
     * Find tenants by owner with full lease/property data
     */
    async findByOwnerWithLeases(
        ownerId: string,
        options: TenantQueryOptions = {}
    ) {
        const { search, status, ...paginationOptions } = options
        
        let where: Prisma.TenantWhereInput = this.addOwnerFilter({}, ownerId)
        
        // Add search filter
        if (search) {
            where = this.applySearchFilter(where, search)
        }
        
        // Add status filter if provided
        if (status) {
            where.Lease = {
                ...where.Lease,
                some: {
                    ...((where.Lease as Prisma.LeaseListRelationFilter)?.some || {}),
                    status: status as LeaseStatus
                }
            }
        }
        
        return await this.model.findMany({
            where,
            include: {
                User: true,
                Lease: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: paginationOptions.limit ? Math.min(paginationOptions.limit, 1000) : undefined,
            skip: paginationOptions.offset || (paginationOptions.page ? (paginationOptions.page - 1) * (paginationOptions.limit || 20) : undefined)
        })
    }

    /**
     * Find tenant by ID with owner check
     */
    override async findByIdAndOwner(
        id: string,
        ownerId: string,
        includeLeases = true
    ) {
        const where: Prisma.TenantWhereInput = {
            id,
            Lease: {
                some: {
                    Unit: {
                        Property: {
                            ownerId
                        }
                    }
                }
            }
        }

        return await this.prisma.tenant.findFirst({
            where,
            include: includeLeases ? {
                User: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatarUrl: true
                    }
                },
                Lease: {
                    where: {
                        Unit: {
                            Property: {
                                ownerId
                            }
                        }
                    },
                    include: {
                        Unit: {
                            include: {
                                Property: {
                                    select: {
                                        id: true,
                                        name: true,
                                        address: true,
                                        city: true,
                                        state: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            } : undefined
        })
    }

    /**
     * Get tenant statistics for owner
     */
    override async getStatsByOwner(ownerId: string) {
        const [totalTenants, activeTenants] = await Promise.all([
            // Total tenants with leases in owner's properties
            this.model.count({
                where: {
                    Lease: {
                        some: {
                            Unit: {
                                Property: {
                                    ownerId
                                }
                            }
                        }
                    }
                }
            }),
            // Active tenants (with active leases)
            this.model.count({
                where: {
                    Lease: {
                        some: {
                            status: 'ACTIVE',
                            Unit: {
                                Property: {
                                    ownerId
                                }
                            }
                        }
                    }
                }
            })
        ])

        return {
            totalTenants,
            activeTenants
        }
    }

    /**
     * Check if tenant has active leases before deletion
     */
    async hasActiveLeases(id: string, ownerId: string): Promise<boolean> {
        const count = await this.model.count({
            where: {
                id,
                Lease: {
                    some: {
                        status: 'ACTIVE',
                        Unit: {
                            Property: {
                                ownerId
                            }
                        }
                    }
                }
            }
        })

        return count > 0
    }
}