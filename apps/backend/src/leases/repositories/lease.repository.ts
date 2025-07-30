import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { Lease, LeaseStatus, Prisma } from '@prisma/client'

export type LeaseWithRelations = Lease & {
    Tenant?: {
        id: string
        name: string
        email: string
        phone: string | null
        avatarUrl: string | null
    }
    Unit?: {
        id: string
        unitNumber: string
        propertyId: string
        bedrooms: number
        bathrooms: number
        squareFeet: number | null
        rent: number
        status: string
        Property?: {
            id: string
            name: string
            address: string
            city: string
            state: string
            ownerId: string
        }
    }
    Document?: {
        id: string
        filename: string | null
        mimeType: string | null
        size: bigint | null
        createdAt: Date | null
        updatedAt: Date | null
    }[]
}

@Injectable()
export class LeaseRepository {
    constructor(private prisma: PrismaService) {}

    async findMany(where?: Prisma.LeaseWhereInput, include?: Prisma.LeaseInclude): Promise<LeaseWithRelations[]> {
        return this.prisma.lease.findMany({
            where,
            include: include || {
                Tenant: true,
                Unit: true,
                _count: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    }

    async findByUserId(userId: string) {
        return this.findMany({
            Unit: {
                Property: {
                    ownerId: userId
                }
            }
        })
    }

    async findById(id: string, userId?: string): Promise<LeaseWithRelations | null> {
        if (userId) {
            const lease = await this.prisma.lease.findFirst({
                where: {
                    id,
                    Unit: {
                        Property: {
                            ownerId: userId
                        }
                    }
                }
            })
            
            if (!lease) return null
        }

        return this.prisma.lease.findUnique({
            where: { id },
            include: {
                Tenant: true,
                Unit: true,
                Document: true
            }
        })
    }

    async create(data: Prisma.LeaseCreateInput): Promise<LeaseWithRelations> {
        return this.prisma.lease.create({
            data,
            include: {
                Tenant: true,
                Unit: true
            }
        })
    }

    async update(id: string, data: Prisma.LeaseUpdateInput): Promise<LeaseWithRelations> {
        return this.prisma.lease.update({
            where: { id },
            data,
            include: {
                Tenant: true,
                Unit: true
            }
        })
    }

    async delete(id: string) {
        return this.prisma.lease.delete({
            where: { id }
        })
    }

    async updateStatus(id: string, status: LeaseStatus) {
        return this.update(id, { status })
    }

    async findActiveLeases(userId: string) {
        return this.findMany({
            status: 'ACTIVE',
            Unit: {
                Property: {
                    ownerId: userId
                }
            }
        })
    }

    async findExpiringLeases(userId: string, daysFromNow = 30) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + daysFromNow)

        return this.findMany({
            endDate: {
                lte: futureDate
            },
            status: 'ACTIVE',
            Unit: {
                Property: {
                    ownerId: userId
                }
            }
        })
    }
}