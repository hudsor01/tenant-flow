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
            limit?: string | undefined;
            offset?: string | undefined;
        };
        output: {
            total: number;
            tenants: {
                id: string;
                createdAt: string;
                updatedAt: string;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                email: string;
                name: string;
                phone: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                expiresAt: string | null;
                Lease?: {
                    endDate: string;
                    id: string;
                    startDate: string;
                    rentAmount: number;
                    status: string;
                    Unit: {
                        id: string;
                        unitNumber: string;
                        Property: {
                            id: string;
                            name: string;
                            address: string;
                            city?: string | undefined;
                            state?: string | undefined;
                        };
                    };
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
            pendingInvitations: number;
        };
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    invite: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            email: string;
            name: string;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            email?: string | undefined;
            name?: string | undefined;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    verifyInvitation: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            token: string;
        };
        output: {
            property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            } | null;
            tenant: {
                id: string;
                email: string;
                name: string;
                phone: string | null;
            };
            expiresAt: Date | null;
            propertyOwner: {
                id: string;
                email: string;
                name: string | null;
            };
        };
        meta: object;
    }>;
    acceptInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            token: string;
            password: string;
            userInfo: {
                id: string;
                email: string;
                name?: string | undefined;
            };
        };
        output: {
            user: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            };
            tenant: {
                id: string;
                createdAt: string;
                updatedAt: string;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                email: string;
                name: string;
                phone: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                expiresAt: string | null;
                Lease?: {
                    endDate: string;
                    id: string;
                    startDate: string;
                    rentAmount: number;
                    status: string;
                    Unit: {
                        id: string;
                        unitNumber: string;
                        Property: {
                            id: string;
                            name: string;
                            address: string;
                            city?: string | undefined;
                            state?: string | undefined;
                        };
                    };
                }[] | undefined;
            };
            success: boolean;
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
    resendInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            message: string;
            success: boolean;
        };
        meta: object;
    }>;
    deletePendingInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            message: string;
            success: boolean;
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
            limit?: string | undefined;
            offset?: string | undefined;
        };
        output: {
            total: number;
            tenants: {
                id: string;
                createdAt: string;
                updatedAt: string;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                email: string;
                name: string;
                phone: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                expiresAt: string | null;
                Lease?: {
                    endDate: string;
                    id: string;
                    startDate: string;
                    rentAmount: number;
                    status: string;
                    Unit: {
                        id: string;
                        unitNumber: string;
                        Property: {
                            id: string;
                            name: string;
                            address: string;
                            city?: string | undefined;
                            state?: string | undefined;
                        };
                    };
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
            pendingInvitations: number;
        };
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    invite: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            email: string;
            name: string;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            email?: string | undefined;
            name?: string | undefined;
            phone?: string | undefined;
            emergencyContact?: string | undefined;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            createdAt: string;
            updatedAt: string;
            User: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            } | null;
            email: string;
            name: string;
            phone: string | null;
            emergencyContact: string | null;
            invitationStatus: string;
            invitedAt: string | null;
            acceptedAt: string | null;
            expiresAt: string | null;
            Lease?: {
                endDate: string;
                id: string;
                startDate: string;
                rentAmount: number;
                status: string;
                Unit: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        city?: string | undefined;
                        state?: string | undefined;
                    };
                };
            }[] | undefined;
        };
        meta: object;
    }>;
    verifyInvitation: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            token: string;
        };
        output: {
            property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            } | null;
            tenant: {
                id: string;
                email: string;
                name: string;
                phone: string | null;
            };
            expiresAt: Date | null;
            propertyOwner: {
                id: string;
                email: string;
                name: string | null;
            };
        };
        meta: object;
    }>;
    acceptInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            token: string;
            password: string;
            userInfo: {
                id: string;
                email: string;
                name?: string | undefined;
            };
        };
        output: {
            user: {
                id: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            };
            tenant: {
                id: string;
                createdAt: string;
                updatedAt: string;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                email: string;
                name: string;
                phone: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                expiresAt: string | null;
                Lease?: {
                    endDate: string;
                    id: string;
                    startDate: string;
                    rentAmount: number;
                    status: string;
                    Unit: {
                        id: string;
                        unitNumber: string;
                        Property: {
                            id: string;
                            name: string;
                            address: string;
                            city?: string | undefined;
                            state?: string | undefined;
                        };
                    };
                }[] | undefined;
            };
            success: boolean;
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
    resendInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            message: string;
            success: boolean;
        };
        meta: object;
    }>;
    deletePendingInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            message: string;
            success: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=tenants.router.d.ts.map