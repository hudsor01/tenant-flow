import { PrismaService } from 'nestjs-prisma';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
export declare class UnitsService {
    private prisma;
    private errorHandler;
    constructor(prisma: PrismaService, errorHandler: ErrorHandlerService);
    getUnitsByOwner(ownerId: string): Promise<({
        Property: {
            name: string;
            id: string;
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
                name: string;
                id: string;
                email: string;
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
        })[];
        MaintenanceRequest: {
            priority: import("@prisma/client").$Enums.Priority;
            status: import("@prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            description: string;
            unitId: string;
            title: string;
            category: string | null;
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
    })[]>;
    getUnitsByProperty(propertyId: string, ownerId: string): Promise<({
        _count: {
            Lease: number;
            MaintenanceRequest: number;
        };
        Lease: ({
            Tenant: {
                name: string;
                id: string;
                email: string;
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
        })[];
        MaintenanceRequest: {
            priority: import("@prisma/client").$Enums.Priority;
            status: import("@prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            description: string;
            unitId: string;
            title: string;
            category: string | null;
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
    })[]>;
    getUnitById(id: string, ownerId: string): Promise<({
        Inspection: {
            status: string;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            propertyId: string;
            unitId: string | null;
            notes: string | null;
            type: string;
            scheduledDate: Date;
            inspectorId: string;
            completedDate: Date | null;
            reportUrl: string | null;
        }[];
        Property: {
            name: string;
            id: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
        };
        Lease: ({
            Tenant: {
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
        })[];
        MaintenanceRequest: ({
            Expense: {
                date: Date;
                createdAt: Date;
                updatedAt: Date;
                id: string;
                description: string;
                propertyId: string;
                category: string;
                maintenanceId: string | null;
                amount: number;
                receiptUrl: string | null;
                vendorName: string | null;
                vendorContact: string | null;
            }[];
        } & {
            priority: import("@prisma/client").$Enums.Priority;
            status: import("@prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            description: string;
            unitId: string;
            title: string;
            category: string | null;
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
            name: string;
            id: string;
            address: string;
        };
        _count: {
            Lease: number;
            MaintenanceRequest: number;
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
            name: string;
            id: string;
            address: string;
        };
        _count: {
            Lease: number;
            MaintenanceRequest: number;
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
    }>;
    deleteUnit(id: string, ownerId: string): Promise<{
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