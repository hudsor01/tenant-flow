import { Injectable } from '@nestjs/common'
import { MaintenanceRequest, RequestStatus, Priority } from '@prisma/client'
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

export interface MaintenanceRequestQueryOptions {
  status?: RequestStatus
  priority?: Priority
  category?: string
  unitId?: string
  search?: string
  limit?: number
  offset?: number
  page?: number
}

@Injectable()
export class MaintenanceRequestRepository extends BaseRepository {
  protected readonly modelName = 'maintenanceRequest'
  
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
  async findByOwner(
    ownerId: string,
    options: MaintenanceRequestQueryOptions = {}
  ) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {}
    
    // Add unit property owner filter
    where = this.addOwnerFilter(where, ownerId)
    
    // Add status filter
    if (options.status) {
      where.status = options.status
    }
    
    // Add priority filter
    if (options.priority) {
      where.priority = options.priority
    }
    
    // Add category filter
    if (options.category) {
      where.category = options.category
    }
    
    // Add unit filter
    if (options.unitId) {
      where.unitId = options.unitId
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
  async getStatsByOwner(ownerId: string) {
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
  async findByIdAndOwner(
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