import { PrismaService } from 'nestjs-prisma';
export declare class LeasesService {
    private prisma;
    constructor(prisma: PrismaService);
    getLeasesByOwner(ownerId: string): Promise<({
        Tenant: {
            User: {
                id: string;
                email: string;
                name: string | null;
                phone: string | null;
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
        };
        _count: {
            Document: number;
        };
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
    })[]>;
    getLeaseById(id: string, ownerId: string): Promise<({
        Tenant: {
            User: {
                id: string;
                email: string;
                name: string | null;
                phone: string | null;
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
        };
        Document: {
            id: string;
            createdAt: Date | null;
            updatedAt: Date | null;
            propertyId: string | null;
            name: string;
            url: string;
            type: import("@prisma/client").$Enums.DocumentType;
            leaseId: string | null;
            fileSizeBytes: bigint;
        }[];
        Unit: {
            Property: {
                id: string;
                name: string;
                address: string;
                city: string;
                state: string;
                zipCode: string;
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
    }) | null>;
    createLease(ownerId: string, leaseData: {
        unitId: string;
        tenantId: string;
        startDate: string;
        endDate: string;
        rentAmount: number;
        securityDeposit: number;
        status?: string;
    }): Promise<{
        Tenant: {
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
        Unit: {
            Property: {
                id: string;
                name: string;
                address: string;
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
    }>;
    updateLease(id: string, ownerId: string, leaseData: {
        startDate?: string;
        endDate?: string;
        rentAmount?: number;
        securityDeposit?: number;
        status?: string;
    }): Promise<{
        Tenant: {
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
        Unit: {
            Property: {
                id: string;
                name: string;
                address: string;
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
    }>;
    deleteLease(id: string, ownerId: string): Promise<{
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
    }>;
    getLeaseStats(ownerId: string): Promise<{
        totalLeases: number;
        activeLeases: number;
        pendingLeases: number;
        expiredLeases: number;
        expiringSoon: number;
        monthlyRentTotal: number;
        totalSecurityDeposits: number;
        averageRent: number;
    }>;
    getExpiringLeases(ownerId: string, days?: number): Promise<({
        Tenant: {
            User: {
                id: string;
                email: string;
                name: string | null;
                phone: string | null;
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
        Unit: {
            Property: {
                id: string;
                name: string;
                address: string;
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
    })[]>;
    getRentReminders(ownerId: string): Promise<{
        reminders: {
            id: string;
            leaseId: string;
            tenantId: string;
            propertyName: string;
            tenantName: string;
            tenantEmail: string;
            rentAmount: number;
            dueDate: string;
            reminderType: "upcoming" | "due" | "overdue";
            daysToDue: number;
            status: "pending" | "sent" | "paid";
            createdAt: string;
        }[];
        stats: {
            totalReminders: number;
            upcomingReminders: number;
            dueToday: number;
            overdue: number;
            totalRentAmount: number;
            overdueAmount: number;
        };
    }>;
    sendRentReminder(reminderId: string, ownerId: string): Promise<{
        status: string;
        error: string;
        id: string;
        leaseId: string;
        tenantId: string;
        propertyName: string;
        tenantName: string;
        tenantEmail: string;
        rentAmount: number;
        dueDate: string;
        reminderType: "upcoming" | "due" | "overdue";
        daysToDue: number;
        createdAt: string;
    } | {
        status: string;
        sentAt: string;
        id: string;
        leaseId: string;
        tenantId: string;
        propertyName: string;
        tenantName: string;
        tenantEmail: string;
        rentAmount: number;
        dueDate: string;
        reminderType: "upcoming" | "due" | "overdue";
        daysToDue: number;
        createdAt: string;
    }>;
    sendBulkRentReminders(reminderIds: string[], ownerId: string): Promise<{
        successful: number;
        failed: number;
        total: number;
        results: {
            id: string;
            status: string;
            error: string;
        }[];
    } | {
        successful: number;
        failed: number;
        total: number;
        results: {
            id: string;
            status: string;
            sentAt: string | undefined;
            error: any;
        }[];
    }>;
}
//# sourceMappingURL=leases.service.d.ts.map