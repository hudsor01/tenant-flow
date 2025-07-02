import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getTenantsByOwner(ownerId: string) {
    return await this.prisma.tenant.findMany({
      where: {
        OR: [
          {
            // Tenants invited by this owner
            invitedBy: ownerId,
          },
          {
            // Tenants with leases in properties owned by this owner
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
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        Lease: {
          where: {
            Unit: {
              Property: {
                ownerId: ownerId,
              },
            },
          },
          include: {
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
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getTenantById(id: string, ownerId: string) {
    return await this.prisma.tenant.findFirst({
      where: {
        id: id,
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
        Lease: {
          where: {
            Unit: {
              Property: {
                ownerId: ownerId,
              },
            },
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
                    state: true,
                  },
                },
              },
            },
            Payment: {
              orderBy: {
                date: 'desc',
              },
              take: 10, // Last 10 payments
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async createTenant(
    ownerId: string,
    tenantData: {
      name: string;
      email: string;
      phone?: string;
      emergencyContact?: string;
    },
  ) {
    return await this.prisma.tenant.create({
      data: {
        ...tenantData,
        invitedBy: ownerId,
        invitationStatus: 'PENDING',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateTenant(
    id: string,
    ownerId: string,
    tenantData: {
      name?: string;
      email?: string;
      phone?: string;
      emergencyContact?: string;
    },
  ) {
    return await this.prisma.tenant.update({
      where: {
        id: id,
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
      data: {
        ...tenantData,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteTenant(id: string, ownerId: string) {
    // Check if tenant has active leases before deletion
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: id,
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
      include: {
        Lease: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.Lease.length > 0) {
      throw new Error('Cannot delete tenant with active leases');
    }

    return await this.prisma.tenant.delete({
      where: {
        id: id,
      },
    });
  }

  async getTenantStats(ownerId: string) {
    const [totalTenants, activeTenants, pendingInvitations] = await Promise.all(
      [
        // Total tenants
        this.prisma.tenant.count({
          where: {
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
        }),
        // Active tenants (with active leases)
        this.prisma.tenant.count({
          where: {
            Lease: {
              some: {
                status: 'ACTIVE',
                Unit: {
                  Property: {
                    ownerId: ownerId,
                  },
                },
              },
            },
          },
        }),
        // Pending invitations
        this.prisma.tenant.count({
          where: {
            invitedBy: ownerId,
            invitationStatus: 'PENDING',
          },
        }),
      ],
    );

    return {
      totalTenants,
      activeTenants,
      pendingInvitations,
    };
  }
}
