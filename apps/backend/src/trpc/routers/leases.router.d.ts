import { z } from 'zod';
import type { LeasesService } from '../../leases/leases.service';
export declare const createLeasesRouter: (leasesService: LeasesService) => import("@trpc/server").TRPCBuiltRouter<{
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
            status?: "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING" | undefined;
            tenantId?: string | undefined;
            propertyId?: string | undefined;
        } | undefined;
        output: {
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
        }[];
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
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
        } | null;
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            startDate: string;
            endDate: string;
            tenantId: string;
            propertyId: string;
            unitId: string;
            MONTHLYRent: number;
            securityDeposit?: number | undefined;
            terms?: string | undefined;
            leaseDocument?: string | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            status?: "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING" | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
            securityDeposit?: number | undefined;
            terms?: string | undefined;
            MONTHLYRent?: number | undefined;
            leaseDocument?: string | undefined;
        };
        output: {
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
    terminate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            terminationDate: string;
            reason?: string | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    upcomingExpirations: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            days?: number | undefined;
        } | undefined;
        output: {
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
        }[];
        meta: object;
    }>;
}>>;
export type LeasesRouter = ReturnType<typeof createLeasesRouter>;
//# sourceMappingURL=leases.router.d.ts.map