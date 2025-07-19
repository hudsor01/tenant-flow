import { PrismaService } from 'nestjs-prisma';
export declare class UnitsService {
    private prisma;
    constructor(prisma: PrismaService);
    getUnitsByOwner(ownerId: string): Promise<({
        Property: {
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
        };
        _count: {
            Lease: number;
            MaintenanceRequest: number;
        };
        Lease: ({
            Tenant: {
                id: string;
                email: string;
                name: string;
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
        MaintenanceRequest: {
            id: string;
            unitId: string;
            status: import("@prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            title: string;
            category: string | null;
            priority: import("@prisma/client").$Enums.Priority;
            preferredDate: Date | null;
            allowEntry: boolean;
            contactPhone: string | null;
            requestedBy: string | null;
            notes: string | null;
            photos: string[];
            completedAt: Date | null;
            assignedTo: string | null;
            estimatedCost: number | null;
            actualCost: number | null;
        }[];
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
    })[]>;
    getUnitsByProperty(propertyId: string, ownerId: string): Promise<({
        _count: {
            Lease: number;
            MaintenanceRequest: number;
        };
        Lease: ({
            Tenant: {
                id: string;
                email: string;
                name: string;
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
        MaintenanceRequest: {
            id: string;
            unitId: string;
            status: import("@prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            title: string;
            category: string | null;
            priority: import("@prisma/client").$Enums.Priority;
            preferredDate: Date | null;
            allowEntry: boolean;
            contactPhone: string | null;
            requestedBy: string | null;
            notes: string | null;
            photos: string[];
            completedAt: Date | null;
            assignedTo: string | null;
            estimatedCost: number | null;
            actualCost: number | null;
        }[];
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
    })[]>;
    getUnitById(id: string, ownerId: string): Promise<({
        Inspection: {
            id: string;
            unitId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            propertyId: string;
            notes: string | null;
            type: string;
            scheduledDate: Date;
            inspectorId: string;
            completedDate: Date | null;
            reportUrl: string | null;
        }[];
        Property: {
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
        };
        Lease: ({
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
        MaintenanceRequest: ({
            Expense: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                propertyId: string;
                description: string;
                date: Date;
                category: string;
                maintenanceId: string | null;
                amount: number;
                receiptUrl: string | null;
                vendorName: string | null;
                vendorContact: string | null;
            }[];
        } & {
            id: string;
            unitId: string;
            status: import("@prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            title: string;
            category: string | null;
            priority: import("@prisma/client").$Enums.Priority;
            preferredDate: Date | null;
            allowEntry: boolean;
            contactPhone: string | null;
            requestedBy: string | null;
            notes: string | null;
            photos: string[];
            completedAt: Date | null;
            assignedTo: string | null;
            estimatedCost: number | null;
            actualCost: number | null;
        })[];
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
    }) | null>;
    createUnit(ownerId: string, unitData: {
        unitNumber: string;
        propertyId: string;
        bedrooms?: number;
        bathrooms?: number;
        squareFeet?: number;
        rent: number;
        status?: string;
    }): Promise<{
        Property: {
            id: string;
            name: string;
            address: string;
        };
        _count: {
            Lease: number;
            MaintenanceRequest: number;
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
    }>;
    updateUnit(id: string, ownerId: string, unitData: {
        unitNumber?: string;
        bedrooms?: number;
        bathrooms?: number;
        squareFeet?: number;
        rent?: number;
        status?: string;
        lastInspectionDate?: Date;
    }): Promise<{
        Property: {
            id: string;
            name: string;
            address: string;
        };
        _count: {
            Lease: number;
            MaintenanceRequest: number;
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
    }>;
    deleteUnit(id: string, ownerId: string): Promise<{
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
    }>;
    getUnitStats(ownerId: string): Promise<{
        totalUnits: number;
        occupiedUnits: number;
        vacantUnits: number;
        maintenanceUnits: number;
        averageRent: number;
        totalRentPotential: number;
        occupancyRate: number;
    }>;
}
//# sourceMappingURL=units.service.d.ts.map