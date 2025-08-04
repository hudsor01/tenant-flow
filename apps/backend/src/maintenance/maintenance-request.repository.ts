import { Injectable } from '@nestjs/common'
import { MaintenanceRequest, RequestStatus, Priority, Prisma } from '@repo/database'
import { PrismaService } from '../prisma/prisma.service'
import { BaseRepository } from '../common/repositories/base.repository'

export interface MaintenanceRequestWithRelations extends MaintenanceRequest {
  unit?: {
    id: string
    unitNumber: string
    status: string
    property: {
      id: string
      name: string
      address: string
    }
  }
  _count?: {
    photos: number
  }
}

export interface MaintenanceRequestQueryOptions extends Partial<Record<string, unknown>> {
  status?: RequestStatus
  priority?: Priority
  category?: string
  unitId?: string
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
export class MaintenanceRequestRepository extends BaseRepository<
  MaintenanceRequest,
  Prisma.MaintenanceRequestCreateInput,
  Prisma.MaintenanceRequestUpdateInput,
  Prisma.MaintenanceRequestWhereInput
> {
  protected readonly modelName = 'maintenanceRequest'
  
  constructor(prisma: PrismaService) {
    super(prisma)
  }
  
  // Expose prisma for complex queries
  get prismaClient() {
    return this.prisma
  }
  
  /**
   * Apply search filter for maintenance requests
   */
  protected override applySearchFilter(where: Record<string, unknown>, search: string): Record<string, unknown> {
    return {
      ...where,
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { requestedBy: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
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
   * Find maintenance requests by owner
   */
  override async findByOwner(
    ownerId: string,
    options: Partial<Record<string, unknown>> = {}
  ) {
    const maintenanceOptions = options as MaintenanceRequestQueryOptions;
    const { search, ...paginationOptions } = maintenanceOptions
    
    let where: Record<string, unknown> = {}
    
    // Add unit property owner filter
    where = this.addOwnerFilter(where, ownerId)
    
    // Add status filter
    if (maintenanceOptions.status) {
      where.status = maintenanceOptions.status
    }
    
    // Add priority filter
    if (maintenanceOptions.priority) {
      where.priority = maintenanceOptions.priority
    }
    
    // Add category filter
    if (maintenanceOptions.category) {
      where.category = maintenanceOptions.category
    }
    
    // Add unit filter
    if (maintenanceOptions.unitId) {
      where.unitId = maintenanceOptions.unitId
    }
    
    // Add search filter
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Unit: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Get maintenance request statistics for owner
   */
  override async getStatsByOwner(ownerId: string) {
    const baseWhere = this.addOwnerFilter({}, ownerId)
    
    const [
      totalCount,
      openCount,
      inProgressCount,
      completedCount,
      emergencyCount
    ] = await Promise.all([
      this.count({ where: baseWhere }),
      this.count({ where: { ...baseWhere, status: RequestStatus.OPEN } }),
      this.count({ where: { ...baseWhere, status: RequestStatus.IN_PROGRESS } }),
      this.count({ where: { ...baseWhere, status: RequestStatus.COMPLETED } }),
      this.count({ where: { ...baseWhere, priority: Priority.EMERGENCY } })
    ])
    
    return {
      totalMaintenanceRequests: totalCount,
      openRequests: openCount,
      inProgressRequests: inProgressCount,
      completedRequests: completedCount,
      emergencyRequests: emergencyCount
    }
  }
  
  /**
   * Find maintenance request by ID with owner check
   */
  override async findByIdAndOwner(
    id: string,
    ownerId: string
  ) {
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
        Unit: true
      }
    })
  }
  
  /**
   * Get maintenance requests by unit
   */
  async findByUnit(unitId: string, ownerId: string, options: MaintenanceRequestQueryOptions = {}) {
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
    
    if (options.priority) {
      where.priority = options.priority
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
        createdAt: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
}