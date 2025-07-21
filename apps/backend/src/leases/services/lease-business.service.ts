import { Injectable } from '@nestjs/common'
import { LeaseRepository, type LeaseWithRelations } from '../repositories/lease.repository'
import { LeaseEmailService } from './lease-email.service'
import type { LeaseStatus, Prisma } from '@prisma/client'
import { ErrorHandlerService } from '../../common/errors/error-handler.service'

export interface CreateLeaseDto {
    tenantId: string
    unitId: string
    startDate: Date
    endDate: Date
    rentAmount: number
    securityDeposit?: number
    terms?: string
}

export interface UpdateLeaseDto {
    startDate?: Date
    endDate?: Date
    rentAmount?: number
    securityDeposit?: number
    terms?: string
    status?: LeaseStatus
}

@Injectable()
export class LeaseBusinessService {
    constructor(
        private leaseRepository: LeaseRepository,
        private leaseEmailService: LeaseEmailService,
        private errorHandler: ErrorHandlerService
    ) {}

    async createLease(userId: string, data: CreateLeaseDto) {
        // Validate that the unit belongs to the user
        const leaseData: Prisma.LeaseCreateInput = {
            startDate: data.startDate,
            endDate: data.endDate,
            rentAmount: data.rentAmount,
            securityDeposit: data.securityDeposit || 0,
            terms: data.terms,
            status: 'DRAFT',
            Tenant: {
                connect: { id: data.tenantId }
            },
            Unit: {
                connect: { id: data.unitId }
            }
        }

        const lease = await this.leaseRepository.create(leaseData)

        // Send notification email if tenant has email
        if (lease.Tenant?.email) {
            await this.leaseEmailService.sendLeaseStatusUpdate(
                lease.Tenant.email,
                lease.Tenant.name,
                lease.id,
                'DRAFT'
            )
        }

        return lease
    }    async updateLease(userId: string, leaseId: string, data: UpdateLeaseDto) {
        // Verify the lease belongs to this user
        const existingLease = await this.leaseRepository.findById(leaseId, userId)
        if (!existingLease) {
            throw this.errorHandler.createNotFoundError('Lease', leaseId)
        }

        const updateData: Prisma.LeaseUpdateInput = {}
        
        if (data.startDate !== undefined) updateData.startDate = data.startDate
        if (data.endDate !== undefined) updateData.endDate = data.endDate
        if (data.rentAmount !== undefined) updateData.rentAmount = data.rentAmount
        if (data.securityDeposit !== undefined) updateData.securityDeposit = data.securityDeposit
        if (data.terms !== undefined) updateData.terms = data.terms
        if (data.status !== undefined) updateData.status = data.status

        const updatedLease = await this.leaseRepository.update(leaseId, updateData)

        // Send status update email if status changed
        if (data.status && existingLease.Tenant?.email) {
            await this.leaseEmailService.sendLeaseStatusUpdate(
                existingLease.Tenant.email,
                existingLease.Tenant.name,
                leaseId,
                data.status
            )
        }

        return updatedLease
    }

    async activateLease(userId: string, leaseId: string) {
        return this.updateLease(userId, leaseId, { status: 'ACTIVE' })
    }

    async terminateLease(userId: string, leaseId: string) {
        return this.updateLease(userId, leaseId, { status: 'TERMINATED' })
    }
}