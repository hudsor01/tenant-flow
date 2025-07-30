import { Injectable, Logger } from '@nestjs/common'
import { LeaseRepository } from './lease.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import {
  LeaseNotFoundException,
  InvalidLeaseDatesException,
  LeaseConflictException
} from '../common/exceptions/lease.exceptions'
import { CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto } from './dto'

@Injectable()
export class LeasesService {
  private readonly logger = new Logger(LeasesService.name)

  constructor(
    private readonly leaseRepository: LeaseRepository,
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * Validate lease dates
   */
  private validateLeaseDates(startDate: string, endDate: string, leaseId?: string): void {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (end <= start) {
      throw new InvalidLeaseDatesException(leaseId || 'new', startDate, endDate)
    }
  }

  async getByOwner(ownerId: string, query?: LeaseQueryDto) {
    try {
      return await this.leaseRepository.findByOwner(ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByOwner',
        resource: 'lease',
        metadata: { ownerId }
      })
    }
  }

  async getStats(ownerId: string) {
    try {
      return await this.leaseRepository.getStatsByOwner(ownerId)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getStats',
        resource: 'lease',
        metadata: { ownerId }
      })
    }
  }

  async getByIdOrThrow(id: string, ownerId: string) {
    try {
      const lease = await this.leaseRepository.findByIdAndOwner(id, ownerId)
      
      if (!lease) {
        throw new LeaseNotFoundException(id)
      }
      
      return lease
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByIdOrThrow',
        resource: 'lease',
        metadata: { id, ownerId }
      })
    }
  }

  async create(data: CreateLeaseDto, ownerId: string) {
    try {
      // Validate lease dates
      this.validateLeaseDates(data.startDate, data.endDate)
      
      // Check for lease conflicts
      const hasConflict = await this.leaseRepository.checkLeaseConflict(
        data.unitId,
        new Date(data.startDate),
        new Date(data.endDate)
      )
      
      if (hasConflict) {
        throw new LeaseConflictException(data.unitId, data.startDate, data.endDate)
      }
      
      const result = await this.leaseRepository.create({
        data: {
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate)
        }
      })
      
      this.logger.log(`Lease created: ${(result as { id: string }).id} for unit ${data.unitId}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'create',
        resource: 'lease',
        metadata: { ownerId }
      })
    }
  }

  async update(id: string, data: UpdateLeaseDto, ownerId: string) {
    try {
      // Verify ownership first
      const existingLease = await this.leaseRepository.findByIdAndOwner(id, ownerId)
      
      if (!existingLease) {
        throw new LeaseNotFoundException(id)
      }
      
      // Validate dates if provided
      if (data.startDate || data.endDate) {
        const startDate = data.startDate || existingLease.startDate.toISOString()
        const endDate = data.endDate || existingLease.endDate.toISOString()
        this.validateLeaseDates(startDate, endDate, id)
        
        // Check for conflicts if dates changed
        if (data.startDate || data.endDate) {
          const hasConflict = await this.leaseRepository.checkLeaseConflict(
            existingLease.unitId,
            new Date(startDate),
            new Date(endDate),
            id // Exclude current lease from conflict check
          )
          
          if (hasConflict) {
            throw new LeaseConflictException(existingLease.unitId, startDate, endDate)
          }
        }
      }

      const updateData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined
      }

      const result = await this.leaseRepository.update({
        where: { id },
        data: updateData
      })
      
      this.logger.log(`Lease updated: ${id}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'update',
        resource: 'lease',
        metadata: { id, ownerId }
      })
    }
  }

  async delete(id: string, ownerId: string) {
    try {
      // Verify ownership first
      const exists = await this.leaseRepository.findByIdAndOwner(id, ownerId)
      
      if (!exists) {
        throw new LeaseNotFoundException(id)
      }

      const result = await this.leaseRepository.deleteById(id)
      this.logger.log(`Lease deleted: ${id}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'delete',
        resource: 'lease',
        metadata: { id, ownerId }
      })
    }
  }

  async getByUnit(unitId: string, ownerId: string, query?: LeaseQueryDto) {
    try {
      return await this.leaseRepository.findByUnit(unitId, ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByUnit',
        resource: 'lease',
        metadata: { unitId, ownerId }
      })
    }
  }

  async getByTenant(tenantId: string, ownerId: string, query?: LeaseQueryDto) {
    try {
      return await this.leaseRepository.findByTenant(tenantId, ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByTenant',
        resource: 'lease',
        metadata: { tenantId, ownerId }
      })
    }
  }
}