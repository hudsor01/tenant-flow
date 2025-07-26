import { PrismaService } from 'nestjs-prisma';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
export declare class TenantsService {
    private prisma;
    private errorHandler;
    constructor(prisma: PrismaService, errorHandler: ErrorHandlerService);
    getTenantsByOwner(ownerId: string, query?: {
        status?: string;
        search?: string;
        limit?: string;
        offset?: string;
    }): Promise<({
        User: {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        } | null;
        Lease: ({
            Unit: {
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city: string;
                    state: string;
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
        })[];
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
    })[]>;
    getTenantById(id: string, ownerId: string): Promise<({
        User: {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
            phone: string | null;
        } | null;
        Lease: ({
            Unit: {
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city: string;
                    state: string;
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
        })[];
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
    }) | null>;
    createTenant(ownerId: string, tenantData: {
        name: string;
        email: string;
        phone?: string;
        emergencyContact?: string;
    }): Promise<{
        User: {
            name: string | null;
            avatarUrl: string | null;
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
    }>;
    updateTenant(id: string, ownerId: string, tenantData: {
        name?: string;
        email?: string;
        phone?: string;
        emergencyContact?: string;
    }): Promise<{
        User: {
            name: string | null;
            avatarUrl: string | null;
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
    }>;
    deleteTenant(id: string, ownerId: string): Promise<{
        userId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        avatarUrl: string | null;
        id: string;
        email: string;
        phone: string | null;
        emergencyContact: string | null;
    }>;
    getTenantStats(ownerId: string): Promise<{
        totalTenants: number;
        activeTenants: number;
    }>;
}
//# sourceMappingURL=tenants.service.d.ts.map