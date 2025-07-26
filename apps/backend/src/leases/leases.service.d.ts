import { PrismaService } from 'nestjs-prisma';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
export declare class LeasesService {
    private prisma;
    private errorHandler;
    private readonly logger;
    constructor(prisma: PrismaService, errorHandler: ErrorHandlerService);
    private isEmailServiceConfigured;
    getLeasesByOwner(ownerId: string): Promise<{
        tenant: {
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null;
        } & {
            userId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            avatarUrl: string | null;
            id: string;
            email: string;
            phone: string | null;
            emergencyContact: string | null;
        };
        unit: {
            property: {
                name: string;
                id: string;
                address: string;
                city: string;
                state: string;
            };
            Property: undefined;
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
        property: {
            name: string;
            id: string;
            address: string;
            city: string;
            state: string;
        };
        documents: {
            createdAt: Date | null;
            updatedAt: Date | null;
            name: string;
            id: string;
            url: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.DocumentType;
            size: bigint | null;
            filename: string | null;
            mimeType: string | null;
            leaseId: string | null;
            fileSizeBytes: bigint;
        }[];
        status: import("@prisma/client").$Enums.LeaseStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        startDate: Date;
        endDate: Date;
        tenantId: string;
        unitId: string;
        rentAmount: number;
        securityDeposit: number;
        terms: string | null;
    }[]>;
    getLeaseById(id: string, ownerId: string): Promise<{
        tenant: {
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null;
        } & {
            userId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            avatarUrl: string | null;
            id: string;
            email: string;
            phone: string | null;
            emergencyContact: string | null;
        };
        unit: {
            property: {
                name: string;
                id: string;
                address: string;
                city: string;
                state: string;
                zipCode: string;
            };
            Property: undefined;
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
        property: {
            name: string;
            id: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
        };
        documents: {
            createdAt: Date | null;
            updatedAt: Date | null;
            name: string;
            id: string;
            url: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.DocumentType;
            size: bigint | null;
            filename: string | null;
            mimeType: string | null;
            leaseId: string | null;
            fileSizeBytes: bigint;
        }[];
        status: import("@prisma/client").$Enums.LeaseStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        startDate: Date;
        endDate: Date;
        tenantId: string;
        unitId: string;
        rentAmount: number;
        securityDeposit: number;
        terms: string | null;
    } | null>;
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
                name: string | null;
                id: string;
                email: string;
            } | null;
        } & {
            userId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            avatarUrl: string | null;
            id: string;
            email: string;
            phone: string | null;
            emergencyContact: string | null;
        };
        Unit: {
            Property: {
                name: string;
                id: string;
                address: string;
            };
        } & {
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
    } & {
        status: import("@prisma/client").$Enums.LeaseStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        startDate: Date;
        endDate: Date;
        tenantId: string;
        unitId: string;
        rentAmount: number;
        securityDeposit: number;
        terms: string | null;
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
                name: string | null;
                id: string;
                email: string;
            } | null;
        } & {
            userId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            avatarUrl: string | null;
            id: string;
            email: string;
            phone: string | null;
            emergencyContact: string | null;
        };
        Unit: {
            Property: {
                name: string;
                id: string;
                address: string;
            };
        } & {
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
    } & {
        status: import("@prisma/client").$Enums.LeaseStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        startDate: Date;
        endDate: Date;
        tenantId: string;
        unitId: string;
        rentAmount: number;
        securityDeposit: number;
        terms: string | null;
    }>;
    deleteLease(id: string, ownerId: string): Promise<{
        status: import("@prisma/client").$Enums.LeaseStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        startDate: Date;
        endDate: Date;
        tenantId: string;
        unitId: string;
        rentAmount: number;
        securityDeposit: number;
        terms: string | null;
    }>;
    getLeaseStats(ownerId: string): Promise<{
        totalLeases: number;
        activeLeases: number;
        pendingLeases: number;
        expiredLeases: number;
        expiringSoon: number;
        MONTHLYRentTotal: number;
        totalSecurityDeposits: number;
        averageRent: number;
    }>;
    getExpiringLeases(ownerId: string, days?: number): Promise<{
        tenant: {
            User: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null;
        } & {
            userId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            avatarUrl: string | null;
            id: string;
            email: string;
            phone: string | null;
            emergencyContact: string | null;
        };
        unit: {
            property: {
                name: string;
                id: string;
                address: string;
            };
            Property: undefined;
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
        property: {
            name: string;
            id: string;
            address: string;
        };
        documents: {
            createdAt: Date | null;
            updatedAt: Date | null;
            name: string;
            id: string;
            url: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.DocumentType;
            size: bigint | null;
            filename: string | null;
            mimeType: string | null;
            leaseId: string | null;
            fileSizeBytes: bigint;
        }[];
        status: import("@prisma/client").$Enums.LeaseStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        startDate: Date;
        endDate: Date;
        tenantId: string;
        unitId: string;
        rentAmount: number;
        securityDeposit: number;
        terms: string | null;
    }[]>;
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