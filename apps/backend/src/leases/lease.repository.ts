import { Injectable } from '@nestjs/common'
import { Lease, LeaseStatus, Prisma } from '@repo/database'
import { PrismaService } from '../prisma/prisma.service'
import { BaseRepository } from '../common/repositories/base.repository'

export interface LeaseWithRelations extends Lease {
  Unit?: {
    id: string
    unitNumber: string
    status: string
    Property: {
      id: string
      name: string
      address: string
    }
  }
  Tenant?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  _count?: {
    Document: number
  }
}

export interface LeaseQueryOptions extends Partial<Record<string, unknown>> {
  status?: LeaseStatus
  unitId?: string
  tenantId?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  search?: string
  limit?: number
  offset?: number
  page?: number
  where?: Record<string, unknown>
  include?: Record<string, unknown>
  select?: Record<string, unknown>
  orderBy?: Record<string, unknown>
  take?: number
  skip?: number
}

@Injectable()
export class LeaseRepository extends BaseRepository<
  Lease,
  Prisma.LeaseCreateInput,
  Prisma.LeaseUpdateInput,
  Prisma.LeaseWhereInput
> {
  protected readonly modelName = 'lease'
  
  constructor(prisma: PrismaService) {
    super(prisma)
  }
  
  // Expose prisma for complex queries
  get prismaClient() {
    return this.prisma
  }
  
  /**
   * Apply search filter for leases
   */
  protected override applySearchFilter(where: Record<string, unknown>, search: string): Record<string, unknown> {
    return {
      ...where,
      OR: [
        { terms: { contains: search, mode: 'insensitive' } },
        { 
          Tenant: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          Unit: {
            OR: [
              { unitNumber: { contains: search, mode: 'insensitive' } },
              { Property: { name: { contains: search, mode: 'insensitive' } } }
            ]
          }
        }
      ]
    }
  }
  
  /**
   * Override owner filter to filter by unit property owner
   */
  protected override addOwnerFilter(where: Record<string, unknown>, ownerId: string): Record<string, unknown> {
    return {
      ...where,
      Unit: {
        Property: {
          ownerId
        }
      }
    }
  }
  
  /**
   * Find leases by owner
   */
  override async findByOwner(
    ownerId: string,
    options: Partial<Record<string, unknown>> = {}
  ) {
    const leaseOptions = options as LeaseQueryOptions;
    const { search, ...paginationOptions } = leaseOptions
    
    let where: Record<string, unknown> = {}
    
    // Add unit property owner filter
    where = this.addOwnerFilter(where, ownerId)
    
    // Add status filter
    if (leaseOptions.status) {
      where.status = leaseOptions.status
    }
    
    // Add unit filter
    if (leaseOptions.unitId) {
      where.unitId = leaseOptions.unitId
    }
    
    // Add tenant filter
    if (leaseOptions.tenantId) {
      where.tenantId = leaseOptions.tenantId
    }
    
    // Add date range filters
    if (leaseOptions.startDateFrom || leaseOptions.startDateTo) {
      where.startDate = {}
      if (leaseOptions.startDateFrom) {
        (where.startDate as Record<string, unknown>).gte = new Date(leaseOptions.startDateFrom)
      }
      if (leaseOptions.startDateTo) {
        (where.startDate as Record<string, unknown>).lte = new Date(leaseOptions.startDateTo)
      }
    }
    
    if (leaseOptions.endDateFrom || leaseOptions.endDateTo) {
      where.endDate = {}
      if (leaseOptions.endDateFrom) {
        (where.endDate as Record<string, unknown>).gte = new Date(leaseOptions.endDateFrom)
      }
      if (leaseOptions.endDateTo) {
        (where.endDate as Record<string, unknown>).lte = new Date(leaseOptions.endDateTo)
      }
    }
    
    // Add search filter
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Unit: true,
        Tenant: true,
        _count: true
      },
      orderBy: {
        startDate: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Get lease statistics for owner
   */
  override async getStatsByOwner(ownerId: string) {
    const baseWhere = this.addOwnerFilter({}, ownerId)
    
    const [
      totalCount,
      activeCount,
      draftCount,
      expiredCount,
      terminatedCount,
      expiringCount
    ] = await Promise.all([
      this.count({ where: baseWhere }),
      this.count({ where: { ...baseWhere, status: LeaseStatus.ACTIVE } }),
      this.count({ where: { ...baseWhere, status: LeaseStatus.DRAFT } }),
      this.count({ where: { ...baseWhere, status: LeaseStatus.EXPIRED } }),
      this.count({ where: { ...baseWhere, status: LeaseStatus.TERMINATED } }),
      this.count({ 
        where: { 
          ...baseWhere, 
          status: LeaseStatus.ACTIVE,
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          }
        } 
      })
    ])
    
    return {
      totalLeases: totalCount,
      activeLeases: activeCount,
      draftLeases: draftCount,
      expiredLeases: expiredCount,
      terminatedLeases: terminatedCount,
      expiringLeases: expiringCount
    }
  }
  
  /**
   * Find lease by ID with owner check
   */
  override async findByIdAndOwner(
    id: string,
    ownerId: string
  ): Promise<LeaseWithRelations | null> {
    return await this.findOne({
      where: {
        id,
        Unit: {
          Property: {
            ownerId
          }
        }
      },
      include: {
        Unit: true,
        Tenant: true,
        Document: true
      }
    }) as LeaseWithRelations | null
  }
  
  /**
   * Get leases by unit
   */
  async findByUnit(unitId: string, ownerId: string, options: LeaseQueryOptions = {}) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {
      unitId,
      Unit: {
        Property: {
          ownerId
        }
      }
    }
    
    // Add filters
    if (options.status) {
      where.status = options.status
    }
    
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Tenant: true
      },
      orderBy: {
        startDate: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Get leases by tenant
   */
  async findByTenant(tenantId: string, ownerId: string, options: LeaseQueryOptions = {}) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {
      tenantId,
      Unit: {
        Property: {
          ownerId
        }
      }
    }
    
    // Add filters
    if (options.status) {
      where.status = options.status
    }
    
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Unit: true
      },
      orderBy: {
        startDate: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Check for lease conflicts
   */
  async checkLeaseConflict(
    unitId: string, 
    startDate: Date, 
    endDate: Date, 
    excludeLeaseId?: string
  ): Promise<boolean> {
    const where: Record<string, unknown> = {
      unitId,
      status: {
        in: [LeaseStatus.ACTIVE, LeaseStatus.DRAFT]
      },
      OR: [
        // New lease starts during existing lease
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: startDate } }
          ]
        },
        // New lease ends during existing lease
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: endDate } }
          ]
        },
        // New lease completely contains existing lease
        {
          AND: [
            { startDate: { gte: startDate } },
            { endDate: { lte: endDate } }
          ]
        }
      ]
    }
    
    if (excludeLeaseId) {
      where.id = { not: excludeLeaseId }
    }
    
    const conflictingLease = await this.findOne({ where })
    return !!conflictingLease
  }
}