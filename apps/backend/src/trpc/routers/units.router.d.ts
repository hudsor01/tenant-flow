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
        })[];
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: ({
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
        }) | null;
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            monthlyRent: number;
            squareFeet?: number | undefined;
            description?: string | undefined;
            amenities?: string[] | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            unitNumber?: string | undefined;
            bedrooms?: number | undefined;
            bathrooms?: number | undefined;
            squareFeet?: number | undefined;
            description?: string | undefined;
            monthlyRent?: number | undefined;
            amenities?: string[] | undefined;
        };
        output: {
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