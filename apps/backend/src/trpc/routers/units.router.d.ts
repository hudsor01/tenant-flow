import { z } from 'zod';
import type { UnitsService } from '../../units/units.service';
export declare const createUnitsRouter: (unitsService: UnitsService) => import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context/app.context").Context;
    meta: object;
    errorShape: {
        data: {
            zodError: z.typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            propertyId?: string | undefined;
        } | undefined;
        output: ({
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
        })[];
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: ({
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
        }) | null;
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            MONTHLYRent: number;
            description?: string | undefined;
            squareFeet?: number | undefined;
            amenities?: string[] | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            description?: string | undefined;
            unitNumber?: string | undefined;
            bedrooms?: number | undefined;
            bathrooms?: number | undefined;
            squareFeet?: number | undefined;
            MONTHLYRent?: number | undefined;
            amenities?: string[] | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
}>>;
export type UnitsRouter = ReturnType<typeof createUnitsRouter>;
//# sourceMappingURL=units.router.d.ts.map