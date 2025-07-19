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
            tenantId?: string | undefined;
            status?: "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING" | undefined;
            propertyId?: string | undefined;
        } | undefined;
        output: ({
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
        })[];
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: ({
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
        }) | null;
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            endDate: string;
            unitId: string;
            tenantId: string;
            startDate: string;
            propertyId: string;
            monthlyRent: number;
            securityDeposit?: number | undefined;
            terms?: string | undefined;
            leaseDocument?: string | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            endDate?: string | undefined;
            startDate?: string | undefined;
            securityDeposit?: number | undefined;
            status?: "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING" | undefined;
            monthlyRent?: number | undefined;
            terms?: string | undefined;
            leaseDocument?: string | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    upcomingExpirations: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            days?: number | undefined;
        } | undefined;
        output: ({
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
        })[];
        meta: object;
    }>;
}>>;
export type LeasesRouter = ReturnType<typeof createLeasesRouter>;
//# sourceMappingURL=leases.router.d.ts.map