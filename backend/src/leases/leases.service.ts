import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseStatus } from '@prisma/client';

@Injectable()
export class LeasesService {
  constructor(private prisma: PrismaService) {}

  async getLeasesByOwner(ownerId: string) {
    return await this.prisma.lease.findMany({
      where: {
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
      },
      include: {
        Tenant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
        Unit: {
          include: {
            Property: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
              },
            },
          },
        },
        Payment: {
          orderBy: {
            date: 'desc',
          },
          take: 3, // Last 3 payments for summary
        },
        _count: {
          select: {
            Payment: true,
            Document: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getLeaseById(id: string, ownerId: string) {
    return await this.prisma.lease.findFirst({
      where: {
        id: id,
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
      },
      include: {
        Tenant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
        Unit: {
          include: {
            Property: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
          },
        },
        Payment: {
          orderBy: {
            date: 'desc',
          },
        },
        Document: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async createLease(
    ownerId: string,
    leaseData: {
      unitId: string;
      tenantId: string;
      startDate: string;
      endDate: string;
      rentAmount: number;
      securityDeposit: number;
      status?: string;
    },
  ) {
    // Verify unit ownership
    const unit = await this.prisma.unit.findFirst({
      where: {
        id: leaseData.unitId,
        Property: {
          ownerId: ownerId,
        },
      },
    });

    if (!unit) {
      throw new Error('Unit not found or access denied');
    }

    // Verify tenant belongs to owner (either invited by owner or has lease in owner's property)
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: leaseData.tenantId,
        OR: [
          {
            invitedBy: ownerId,
          },
          {
            Lease: {
              some: {
                Unit: {
                  Property: {
                    ownerId: ownerId,
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found or access denied');
    }

    // Check for overlapping active leases on the same unit
    const overlappingLease = await this.prisma.lease.findFirst({
      where: {
        unitId: leaseData.unitId,
        status: {
          in: ['ACTIVE', 'DRAFT'],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(leaseData.endDate) } },
              { endDate: { gte: new Date(leaseData.startDate) } },
            ],
          },
        ],
      },
    });

    if (overlappingLease) {
      throw new Error('Unit has overlapping lease for the specified dates');
    }

    return await this.prisma.lease.create({
      data: {
        unitId: leaseData.unitId,
        tenantId: leaseData.tenantId,
        startDate: new Date(leaseData.startDate),
        endDate: new Date(leaseData.endDate),
        rentAmount: leaseData.rentAmount,
        securityDeposit: leaseData.securityDeposit,
        status: (leaseData.status as LeaseStatus) || LeaseStatus.DRAFT,
      },
      include: {
        Tenant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        Unit: {
          include: {
            Property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  async updateLease(
    id: string,
    ownerId: string,
    leaseData: {
      startDate?: string;
      endDate?: string;
      rentAmount?: number;
      securityDeposit?: number;
      status?: string;
    },
  ) {
    // Verify lease ownership
    const existingLease = await this.prisma.lease.findFirst({
      where: {
        id: id,
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
      },
    });

    if (!existingLease) {
      throw new Error('Lease not found or access denied');
    }

    // If updating dates, check for overlapping leases
    if (leaseData.startDate || leaseData.endDate) {
      const startDate = leaseData.startDate
        ? new Date(leaseData.startDate)
        : existingLease.startDate;
      const endDate = leaseData.endDate
        ? new Date(leaseData.endDate)
        : existingLease.endDate;

      const overlappingLease = await this.prisma.lease.findFirst({
        where: {
          unitId: existingLease.unitId,
          id: { not: id }, // Exclude current lease
          status: {
            in: ['ACTIVE', 'DRAFT'],
          },
          OR: [
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } },
              ],
            },
          ],
        },
      });

      if (overlappingLease) {
        throw new Error('Unit has overlapping lease for the specified dates');
      }
    }

    return await this.prisma.lease.update({
      where: {
        id: id,
      },
      data: {
        ...leaseData,
        startDate: leaseData.startDate
          ? new Date(leaseData.startDate)
          : undefined,
        endDate: leaseData.endDate ? new Date(leaseData.endDate) : undefined,
        status: leaseData.status ? (leaseData.status as LeaseStatus) : undefined,
        updatedAt: new Date(),
      },
      include: {
        Tenant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        Unit: {
          include: {
            Property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteLease(id: string, ownerId: string) {
    // Verify lease ownership
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: id,
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
      },
      include: {
        Payment: true,
      },
    });

    if (!lease) {
      throw new Error('Lease not found or access denied');
    }

    if (lease.status === 'ACTIVE') {
      throw new Error('Cannot delete active lease');
    }

    if (lease.Payment.length > 0) {
      throw new Error('Cannot delete lease with payment history');
    }

    return await this.prisma.lease.delete({
      where: {
        id: id,
      },
    });
  }

  async getLeaseStats(ownerId: string) {
    const [totalLeases, activeLeases, pendingLeases, expiredLeases] =
      await Promise.all([
        // Total leases
        this.prisma.lease.count({
          where: {
            Unit: {
              Property: {
                ownerId: ownerId,
              },
            },
          },
        }),
        // Active leases
        this.prisma.lease.count({
          where: {
            Unit: {
              Property: {
                ownerId: ownerId,
              },
            },
            status: 'ACTIVE',
          },
        }),
        // Pending leases
        this.prisma.lease.count({
          where: {
            Unit: {
              Property: {
                ownerId: ownerId,
              },
            },
            status: 'DRAFT',
          },
        }),
        // Expired leases
        this.prisma.lease.count({
          where: {
            Unit: {
              Property: {
                ownerId: ownerId,
              },
            },
            status: 'EXPIRED',
          },
        }),
      ]);

    // Calculate lease revenue
    const revenueStats = await this.prisma.lease.aggregate({
      where: {
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
        status: 'ACTIVE',
      },
      _sum: {
        rentAmount: true,
        securityDeposit: true,
      },
      _avg: {
        rentAmount: true,
      },
    });

    // Get leases expiring soon (within 30 days)
    const expiringSoon = await this.prisma.lease.count({
      where: {
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
        status: 'ACTIVE',
        endDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          gte: new Date(), // Not already expired
        },
      },
    });

    return {
      totalLeases,
      activeLeases,
      pendingLeases,
      expiredLeases,
      expiringSoon,
      monthlyRentTotal: revenueStats._sum.rentAmount || 0,
      totalSecurityDeposits: revenueStats._sum.securityDeposit || 0,
      averageRent: revenueStats._avg.rentAmount || 0,
    };
  }

  async getExpiringLeases(ownerId: string, days: number = 30) {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    return await this.prisma.lease.findMany({
      where: {
        Unit: {
          Property: {
            ownerId: ownerId,
          },
        },
        status: 'ACTIVE',
        endDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        Tenant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        Unit: {
          include: {
            Property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });
  }
}
