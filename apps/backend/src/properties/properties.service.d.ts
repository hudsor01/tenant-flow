import { PrismaService } from 'nestjs-prisma';
import { PropertyType } from '@prisma/client';
export declare class PropertiesService {
    private prisma;
    constructor(prisma: PrismaService);
    getPropertiesByOwner(ownerId: string, query?: {
        propertyType?: PropertyType;
        search?: string;
        limit?: string;
        offset?: string;
    }): Promise<({
        _count: {
            Unit: number;
        };
        Unit: {
            id: string;
            status: import("@prisma/client").$Enums.UnitStatus;
            unitNumber: string;
            rent: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
    })[]>;
    getPropertyStats(ownerId: string): Promise<{
        totalProperties: number;
        totalUnits: number;
    }>;
    getPropertyById(id: string, ownerId: string): Promise<({
        _count: {
            Inspection: number;
            Expense: number;
            Unit: number;
        };
        Unit: ({
            Lease: ({
                Tenant: {
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
    }) | null>;
    createProperty(ownerId: string, propertyData: {
        name: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        description?: string;
        propertyType?: PropertyType;
        stripeCustomerId?: string;
    }): Promise<{
        _count: {
            Unit: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
    }>;
    updateProperty(id: string, ownerId: string, propertyData: {
        name?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        description?: string;
        propertyType?: PropertyType;
        imageUrl?: string;
    }): Promise<{
        _count: {
            Unit: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
    }>;
    deleteProperty(id: string, ownerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
    }>;
}
//# sourceMappingURL=properties.service.d.ts.map