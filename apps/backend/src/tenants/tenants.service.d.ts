import { PrismaService } from 'nestjs-prisma';
export declare class TenantsService {
    private prisma;
    constructor(prisma: PrismaService);
    getTenantsByOwner(ownerId: string, query?: {
        status?: string;
        search?: string;
        limit?: string;
        offset?: string;
    }): Promise<({
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        Lease: ({
            Unit: {
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city: string;
                    state: string;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.UnitStatus;
                createdAt: Date;
                updatedAt: Date;
                unitNumber: string;
                propertyId: string;
                bedrooms: number;
                bathrooms: number;
                squareFeet: number | null;
                rent: number;
                lastInspectionDate: Date | null;
            };
        } & {
            endDate: Date;
            id: string;
            unitId: string;
            tenantId: string;
            startDate: Date;
            rentAmount: number;
            securityDeposit: number;
            status: import("@prisma/client").$Enums.LeaseStatus;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        name: string;
        phone: string | null;
        userId: string | null;
        emergencyContact: string | null;
        invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
        invitationToken: string | null;
        invitedBy: string | null;
        invitedAt: Date | null;
        acceptedAt: Date | null;
        expiresAt: Date | null;
    })[]>;
    getTenantById(id: string, ownerId: string): Promise<({
        User: {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            avatarUrl: string | null;
        } | null;
        Lease: ({
            Unit: {
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city: string;
                    state: string;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.UnitStatus;
                createdAt: Date;
                updatedAt: Date;
                unitNumber: string;
                propertyId: string;
                bedrooms: number;
                bathrooms: number;
                squareFeet: number | null;
                rent: number;
                lastInspectionDate: Date | null;
            };
        } & {
            endDate: Date;
            id: string;
            unitId: string;
            tenantId: string;
            startDate: Date;
            rentAmount: number;
            securityDeposit: number;
            status: import("@prisma/client").$Enums.LeaseStatus;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        name: string;
        phone: string | null;
        userId: string | null;
        emergencyContact: string | null;
        invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
        invitationToken: string | null;
        invitedBy: string | null;
        invitedAt: Date | null;
        acceptedAt: Date | null;
        expiresAt: Date | null;
    }) | null>;
    createTenant(ownerId: string, tenantData: {
        name: string;
        email: string;
        phone?: string;
        emergencyContact?: string;
    }): Promise<{
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        name: string;
        phone: string | null;
        userId: string | null;
        emergencyContact: string | null;
        invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
        invitationToken: string | null;
        invitedBy: string | null;
        invitedAt: Date | null;
        acceptedAt: Date | null;
        expiresAt: Date | null;
    }>;
    updateTenant(id: string, ownerId: string, tenantData: {
        name?: string;
        email?: string;
        phone?: string;
        emergencyContact?: string;
    }): Promise<{
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        name: string;
        phone: string | null;
        userId: string | null;
        emergencyContact: string | null;
        invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
        invitationToken: string | null;
        invitedBy: string | null;
        invitedAt: Date | null;
        acceptedAt: Date | null;
        expiresAt: Date | null;
    }>;
    deleteTenant(id: string, ownerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        name: string;
        phone: string | null;
        userId: string | null;
        emergencyContact: string | null;
        invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
        invitationToken: string | null;
        invitedBy: string | null;
        invitedAt: Date | null;
        acceptedAt: Date | null;
        expiresAt: Date | null;
    }>;
    getTenantStats(ownerId: string): Promise<{
        totalTenants: number;
        activeTenants: number;
        pendingInvitations: number;
    }>;
    acceptInvitation(token: string, acceptanceData: {
        password: string;
        userInfo: {
            id: string;
            email: string;
            name?: string;
        };
    }): Promise<{
        success: boolean;
        tenant: {
            User: {
                id: string;
                email: string;
                name: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            name: string;
            phone: string | null;
            userId: string | null;
            emergencyContact: string | null;
            invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
            invitationToken: string | null;
            invitedBy: string | null;
            invitedAt: Date | null;
            acceptedAt: Date | null;
            expiresAt: Date | null;
        };
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            role: import("@prisma/client").$Enums.UserRole;
            email: string;
            name: string | null;
            phone: string | null;
            bio: string | null;
            avatarUrl: string | null;
        };
    }>;
    verifyInvitation(token: string): Promise<{
        tenant: {
            id: string;
            name: string;
            email: string;
            phone: string | null;
        };
        property: {
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
        } | null;
        propertyOwner: {
            id: string;
            email: string;
            name: string | null;
        };
        expiresAt: Date | null;
    }>;
    resendInvitation(tenantId: string, ownerId: string): Promise<{
        success: boolean;
    }>;
    deletePendingInvitation(tenantId: string, ownerId: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=tenants.service.d.ts.map