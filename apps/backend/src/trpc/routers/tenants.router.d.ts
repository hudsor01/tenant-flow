import { z } from 'zod';
import type { TenantsService } from '../../tenants/tenants.service';
import type { StorageService } from '../../storage/storage.service';
export declare const createTenantsRouter: (tenantsService: TenantsService, storageService?: StorageService) => import("@trpc/server").TRPCBuiltRouter<{
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
            status?: string | undefined;
            search?: string | undefined;
            limit?: number | undefined;
            page?: number | undefined;
        };
        output: {
            total: number;
            tenants: {
                userId: string | null;
                createdAt: string;
                updatedAt: string;
                name: string;
                id: string;
                email: string;
                phone: string | null;
                User: {
                    name: string | null;
                    avatarUrl: string | null;
                    id: string;
                    email: string;
                } | null;
                emergencyContact: string | null;
                Lease?: {
                    status: string;
                    id: string;
                    startDate: string;
                    endDate: string;
                    Unit: {
                        id: string;
                        Property: {
                            name: string;
                            id: string;
                            address: string;
                            city?: string | undefined;
                            state?: string | undefined;
                        };
                        unitNumber: string;
                    };
                    rentAmount: number;
                }[] | undefined;
            }[];
        };
        meta: object;
    }>;
    stats: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            totalTenants: number;
            activeTenants: number;
        };
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            email: string;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            name?: string | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    uploadDocument: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tenantId: string;
            file: {
                data: string;
                size: number;
                filename: string;
                mimeType: string;
            };
            documentType: string;
        };
        output: {
            url: string;
            path: string;
            size: number;
            filename: string;
            mimeType: string;
        };
        meta: object;
    }>;
}>>;
export declare const tenantsRouter: (tenantsService: TenantsService, storageService?: StorageService) => import("@trpc/server").TRPCBuiltRouter<{
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
            status?: string | undefined;
            search?: string | undefined;
            limit?: number | undefined;
            page?: number | undefined;
        };
        output: {
            total: number;
            tenants: {
                userId: string | null;
                createdAt: string;
                updatedAt: string;
                name: string;
                id: string;
                email: string;
                phone: string | null;
                User: {
                    name: string | null;
                    avatarUrl: string | null;
                    id: string;
                    email: string;
                } | null;
                emergencyContact: string | null;
                Lease?: {
                    status: string;
                    id: string;
                    startDate: string;
                    endDate: string;
                    Unit: {
                        id: string;
                        Property: {
                            name: string;
                            id: string;
                            address: string;
                            city?: string | undefined;
                            state?: string | undefined;
                        };
                        unitNumber: string;
                    };
                    rentAmount: number;
                }[] | undefined;
            }[];
        };
        meta: object;
    }>;
    stats: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            totalTenants: number;
            activeTenants: number;
        };
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            email: string;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            name?: string | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            userId: string | null;
            createdAt: string;
            updatedAt: string;
            name: string;
            id: string;
            email: string;
            phone: string | null;
            User: {
                name: string | null;
                avatarUrl: string | null;
                id: string;
                email: string;
            } | null;
            emergencyContact: string | null;
            Lease?: {
                status: string;
                id: string;
                startDate: string;
                endDate: string;
                Unit: {
                    id: string;
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                    unitNumber: string;
                };
                rentAmount: number;
            }[] | undefined;
        };
        meta: object;
    }>;
    uploadDocument: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tenantId: string;
            file: {
                data: string;
                size: number;
                filename: string;
                mimeType: string;
            };
            documentType: string;
        };
        output: {
            url: string;
            path: string;
            size: number;
            filename: string;
            mimeType: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=tenants.router.d.ts.map