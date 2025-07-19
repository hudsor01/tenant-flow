import type { AuthService } from '../auth/auth.service';
import type { PropertiesService } from '../properties/properties.service';
import type { TenantsService } from '../tenants/tenants.service';
import type { MaintenanceService } from '../maintenance/maintenance.service';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { PortalService } from '../stripe/services/portal.service';
import type { StripeService } from '../stripe/services/stripe.service';
import type { WebhookService } from '../stripe/services/webhook.service';
import type { StorageService } from '../storage/storage.service';
import type { UsersService } from '../users/users.service';
import type { UnitsService } from '../units/units.service';
import type { LeasesService } from '../leases/leases.service';
export declare const createAppRouter: (services: {
    authService: AuthService;
    propertiesService: PropertiesService;
    tenantsService: TenantsService;
    maintenanceService: MaintenanceService;
    subscriptionsService: SubscriptionsService;
    portalService: PortalService;
    stripeService: StripeService;
    webhookService: WebhookService;
    storageService: StorageService;
    usersService: UsersService;
    unitsService: UnitsService;
    leasesService: LeasesService;
}) => import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("./context/app.context").Context;
    meta: object;
    errorShape: {
        data: {
            zodError: import("zod").typeToFlattenedError<any, string> | null;
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
    auth: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
        me: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                email: string;
                role: "TENANT" | "OWNER" | "MANAGER" | "ADMIN";
                emailVerified: boolean;
                createdAt: string;
                updatedAt: string;
                name?: string | undefined;
                phone?: string | undefined;
                avatarUrl?: string | undefined;
            };
            meta: object;
        }>;
        updateProfile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name?: string | undefined;
                phone?: string | undefined;
                avatarUrl?: string | undefined;
            };
            output: {
                user: {
                    id: string;
                    email: string;
                    role: "TENANT" | "OWNER" | "MANAGER" | "ADMIN";
                    emailVerified: boolean;
                    createdAt: string;
                    updatedAt: string;
                    name?: string | undefined;
                    phone?: string | undefined;
                    avatarUrl?: string | undefined;
                };
                message: string;
            };
            meta: object;
        }>;
        validateSession: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                user: {
                    id: string;
                    email: string;
                    role: "TENANT" | "OWNER" | "MANAGER" | "ADMIN";
                    emailVerified: boolean;
                    createdAt: string;
                    updatedAt: string;
                    name?: string | undefined;
                    phone?: string | undefined;
                    avatarUrl?: string | undefined;
                };
                isValid: boolean;
                expiresAt: string;
            };
            meta: object;
        }>;
    }>>;
    properties: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                search?: string | undefined;
                status?: string | undefined;
                offset?: string | undefined;
                limit?: string | undefined;
                propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
            };
            output: {
                total: number;
                properties: {
                    description: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    address: string;
                    city: string;
                    state: string;
                    zipCode: string;
                    imageUrl: string | null;
                    ownerId: string;
                    propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
                }[];
            };
            meta: object;
        }>;
        stats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                totalUnits: number;
                occupiedUnits: number;
                vacantUnits: number;
                totalProperties: number;
                totalRent: number;
                collectedRent: number;
                pendingRent: number;
            };
            meta: object;
        }>;
        byId: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                description: string | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                imageUrl: string | null;
                ownerId: string;
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                description?: string | undefined;
                propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
            };
            output: {
                description: string | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                imageUrl: string | null;
                ownerId: string;
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                description?: string | undefined;
                name?: string | undefined;
                address?: string | undefined;
                city?: string | undefined;
                state?: string | undefined;
                zipCode?: string | undefined;
                imageUrl?: string | undefined;
                propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
            };
            output: {
                description: string | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                imageUrl: string | null;
                ownerId: string;
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                description: string | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                imageUrl: string | null;
                ownerId: string;
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        uploadImage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                file: {
                    filename: string;
                    mimeType: string;
                    size: number;
                    data: string;
                };
                propertyId: string;
            };
            output: {
                path: string;
                url: string;
                filename: string;
                mimeType: string;
                size: number;
            };
            meta: object;
        }>;
    }>>;
    tenants: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                search?: string | undefined;
                status?: string | undefined;
                offset?: string | undefined;
                limit?: string | undefined;
            };
            output: {
                tenants: {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: string;
                    updatedAt: string;
                    expiresAt: string | null;
                    emergencyContact: string | null;
                    invitationStatus: string;
                    invitedAt: string | null;
                    acceptedAt: string | null;
                    User: {
                        id: string;
                        email: string;
                        name: string | null;
                        avatarUrl: string | null;
                    } | null;
                    Lease?: {
                        id: string;
                        status: string;
                        startDate: string;
                        endDate: string;
                        rentAmount: number;
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
                total: number;
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
                email: string;
                name: string;
                phone: string | null;
                createdAt: string;
                updatedAt: string;
                expiresAt: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                Lease?: {
                    id: string;
                    status: string;
                    startDate: string;
                    endDate: string;
                    rentAmount: number;
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
                email: string;
                name: string;
                phone: string | null;
                createdAt: string;
                updatedAt: string;
                expiresAt: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                Lease?: {
                    id: string;
                    status: string;
                    startDate: string;
                    endDate: string;
                    rentAmount: number;
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
                email: string;
                name: string;
                phone: string | null;
                createdAt: string;
                updatedAt: string;
                expiresAt: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                Lease?: {
                    id: string;
                    status: string;
                    startDate: string;
                    endDate: string;
                    rentAmount: number;
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
                email: string;
                name: string;
                phone: string | null;
                createdAt: string;
                updatedAt: string;
                expiresAt: string | null;
                emergencyContact: string | null;
                invitationStatus: string;
                invitedAt: string | null;
                acceptedAt: string | null;
                User: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatarUrl: string | null;
                } | null;
                Lease?: {
                    id: string;
                    status: string;
                    startDate: string;
                    endDate: string;
                    rentAmount: number;
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
                expiresAt: Date | null;
                tenant: {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                };
                property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                } | null;
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
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: string;
                    updatedAt: string;
                    expiresAt: string | null;
                    emergencyContact: string | null;
                    invitationStatus: string;
                    invitedAt: string | null;
                    acceptedAt: string | null;
                    User: {
                        id: string;
                        email: string;
                        name: string | null;
                        avatarUrl: string | null;
                    } | null;
                    Lease?: {
                        id: string;
                        status: string;
                        startDate: string;
                        endDate: string;
                        rentAmount: number;
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
                documentType: string;
                file: {
                    filename: string;
                    mimeType: string;
                    size: number;
                    data: string;
                };
            };
            output: {
                path: string;
                url: string;
                filename: string;
                mimeType: string;
                size: number;
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
    maintenance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                search?: string | undefined;
                status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
                offset?: string | undefined;
                limit?: string | undefined;
                startDate?: string | undefined;
                endDate?: string | undefined;
                tenantId?: string | undefined;
                unitId?: string | undefined;
                propertyId?: string | undefined;
                priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
                category?: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY" | undefined;
                assignedTo?: string | undefined;
            };
            output: {
                total: number;
                requests: {
                    description: string;
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                    status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                    unitId: string;
                    priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                    title: string;
                    category: string | null;
                    preferredDate: string | null;
                    allowEntry: boolean;
                    contactPhone: string | null;
                    requestedBy: string | null;
                    notes: string | null;
                    photos: string[] | null;
                    completedAt: string | null;
                    assignedTo: string | null;
                    estimatedCost: number | null;
                    actualCost: number | null;
                    Unit?: {
                        id: string;
                        unitNumber: string;
                        Property: {
                            id: string;
                            name: string;
                            address: string;
                            ownerId: string;
                        };
                    } | undefined;
                    Assignee?: {
                        id: string;
                        email: string;
                        name: string | null;
                        phone: string | null;
                    } | null | undefined;
                }[];
                totalCost: number;
            };
            meta: object;
        }>;
        stats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                totalRequests: number;
                openRequests: number;
                inProgressRequests: number;
                completedRequests: number;
                urgentRequests: number;
                totalEstimatedCost: number;
                totalActualCost: number;
                averageCompletionTime: number;
                categoryBreakdown: {
                    count: number;
                    category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
                    percentage: number;
                }[];
                monthlyTrend?: {
                    count: number;
                    month: string;
                    cost: number;
                }[] | undefined;
            };
            meta: object;
        }>;
        byId: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                description: string;
                id: string;
                createdAt: string;
                updatedAt: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                unitId: string;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                title: string;
                category: string | null;
                preferredDate: string | null;
                allowEntry: boolean;
                contactPhone: string | null;
                requestedBy: string | null;
                notes: string | null;
                photos: string[] | null;
                completedAt: string | null;
                assignedTo: string | null;
                estimatedCost: number | null;
                actualCost: number | null;
                Unit?: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        ownerId: string;
                    };
                } | undefined;
                Assignee?: {
                    id: string;
                    email: string;
                    name: string | null;
                    phone: string | null;
                } | null | undefined;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                description: string;
                unitId: string;
                title: string;
                category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
                priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
                preferredDate?: string | undefined;
                allowEntry?: boolean | undefined;
                contactPhone?: string | undefined;
                photos?: string[] | undefined;
            };
            output: {
                description: string;
                id: string;
                createdAt: string;
                updatedAt: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                unitId: string;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                title: string;
                category: string | null;
                preferredDate: string | null;
                allowEntry: boolean;
                contactPhone: string | null;
                requestedBy: string | null;
                notes: string | null;
                photos: string[] | null;
                completedAt: string | null;
                assignedTo: string | null;
                estimatedCost: number | null;
                actualCost: number | null;
                Unit?: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        ownerId: string;
                    };
                } | undefined;
                Assignee?: {
                    id: string;
                    email: string;
                    name: string | null;
                    phone: string | null;
                } | null | undefined;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                description?: string | undefined;
                status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
                priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
                title?: string | undefined;
                category?: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY" | undefined;
                preferredDate?: string | undefined;
                allowEntry?: boolean | undefined;
                contactPhone?: string | undefined;
                notes?: string | undefined;
                photos?: string[] | undefined;
                completedAt?: string | undefined;
                assignedTo?: string | undefined;
                estimatedCost?: number | undefined;
                actualCost?: number | undefined;
            };
            output: {
                description: string;
                id: string;
                createdAt: string;
                updatedAt: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                unitId: string;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                title: string;
                category: string | null;
                preferredDate: string | null;
                allowEntry: boolean;
                contactPhone: string | null;
                requestedBy: string | null;
                notes: string | null;
                photos: string[] | null;
                completedAt: string | null;
                assignedTo: string | null;
                estimatedCost: number | null;
                actualCost: number | null;
                Unit?: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        ownerId: string;
                    };
                } | undefined;
                Assignee?: {
                    id: string;
                    email: string;
                    name: string | null;
                    phone: string | null;
                } | null | undefined;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                description: string;
                id: string;
                createdAt: string;
                updatedAt: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                unitId: string;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                title: string;
                category: string | null;
                preferredDate: string | null;
                allowEntry: boolean;
                contactPhone: string | null;
                requestedBy: string | null;
                notes: string | null;
                photos: string[] | null;
                completedAt: string | null;
                assignedTo: string | null;
                estimatedCost: number | null;
                actualCost: number | null;
                Unit?: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        ownerId: string;
                    };
                } | undefined;
                Assignee?: {
                    id: string;
                    email: string;
                    name: string | null;
                    phone: string | null;
                } | null | undefined;
            };
            meta: object;
        }>;
        assign: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                assignedTo: string;
                notes?: string | undefined;
                estimatedCost?: number | undefined;
            };
            output: {
                description: string;
                id: string;
                createdAt: string;
                updatedAt: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                unitId: string;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                title: string;
                category: string | null;
                preferredDate: string | null;
                allowEntry: boolean;
                contactPhone: string | null;
                requestedBy: string | null;
                notes: string | null;
                photos: string[] | null;
                completedAt: string | null;
                assignedTo: string | null;
                estimatedCost: number | null;
                actualCost: number | null;
                Unit?: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        ownerId: string;
                    };
                } | undefined;
                Assignee?: {
                    id: string;
                    email: string;
                    name: string | null;
                    phone: string | null;
                } | null | undefined;
            };
            meta: object;
        }>;
        complete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                notes?: string | undefined;
                photos?: string[] | undefined;
                actualCost?: number | undefined;
            };
            output: {
                description: string;
                id: string;
                createdAt: string;
                updatedAt: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                unitId: string;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                title: string;
                category: string | null;
                preferredDate: string | null;
                allowEntry: boolean;
                contactPhone: string | null;
                requestedBy: string | null;
                notes: string | null;
                photos: string[] | null;
                completedAt: string | null;
                assignedTo: string | null;
                estimatedCost: number | null;
                actualCost: number | null;
                Unit?: {
                    id: string;
                    unitNumber: string;
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                        ownerId: string;
                    };
                } | undefined;
                Assignee?: {
                    id: string;
                    email: string;
                    name: string | null;
                    phone: string | null;
                } | null | undefined;
            };
            meta: object;
        }>;
        createWorkOrder: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                scheduledDate: string;
                assignedTo: string;
                maintenanceRequestId: string;
                estimatedHours: number;
                instructions?: string | undefined;
            };
            output: {
                id: string;
                createdAt: string;
                scheduledDate: string;
                assignedTo: string;
                maintenanceRequestId: string;
                estimatedHours: number;
                instructions?: string | undefined;
                materials?: {
                    name: string;
                    cost: number;
                    quantity: number;
                }[] | undefined;
            };
            meta: object;
        }>;
    }>>;
    units: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                Lease: ({
                    Tenant: {
                        id: string;
                        email: string;
                        name: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.LeaseStatus;
                    startDate: Date;
                    endDate: Date;
                    rentAmount: number;
                    tenantId: string;
                    unitId: string;
                    securityDeposit: number;
                })[];
                _count: {
                    Lease: number;
                    MaintenanceRequest: number;
                };
                MaintenanceRequest: {
                    description: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.RequestStatus;
                    unitId: string;
                    priority: import("@prisma/client").$Enums.Priority;
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.UnitStatus;
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
                        email: string;
                        name: string;
                        phone: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        expiresAt: Date | null;
                        emergencyContact: string | null;
                        invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                        invitedAt: Date | null;
                        acceptedAt: Date | null;
                        userId: string | null;
                        invitationToken: string | null;
                        invitedBy: string | null;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.LeaseStatus;
                    startDate: Date;
                    endDate: Date;
                    rentAmount: number;
                    tenantId: string;
                    unitId: string;
                    securityDeposit: number;
                })[];
                Inspection: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    type: string;
                    status: string;
                    unitId: string | null;
                    propertyId: string;
                    scheduledDate: Date;
                    notes: string | null;
                    inspectorId: string;
                    completedDate: Date | null;
                    reportUrl: string | null;
                }[];
                MaintenanceRequest: ({
                    Expense: {
                        description: string;
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        date: Date;
                        propertyId: string;
                        category: string;
                        maintenanceId: string | null;
                        amount: number;
                        receiptUrl: string | null;
                        vendorName: string | null;
                        vendorContact: string | null;
                    }[];
                } & {
                    description: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.RequestStatus;
                    unitId: string;
                    priority: import("@prisma/client").$Enums.Priority;
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.UnitStatus;
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
                description?: string | undefined;
                squareFeet?: number | undefined;
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
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.UnitStatus;
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
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.UnitStatus;
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
    leases: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                status?: "PENDING" | "EXPIRED" | "ACTIVE" | "TERMINATED" | undefined;
                tenantId?: string | undefined;
                propertyId?: string | undefined;
            } | undefined;
            output: ({
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
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.UnitStatus;
                    unitNumber: string;
                    propertyId: string;
                    bedrooms: number;
                    bathrooms: number;
                    squareFeet: number | null;
                    rent: number;
                    lastInspectionDate: Date | null;
                };
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
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    emergencyContact: string | null;
                    invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                    invitedAt: Date | null;
                    acceptedAt: Date | null;
                    userId: string | null;
                    invitationToken: string | null;
                    invitedBy: string | null;
                };
                _count: {
                    Document: number;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.LeaseStatus;
                startDate: Date;
                endDate: Date;
                rentAmount: number;
                tenantId: string;
                unitId: string;
                securityDeposit: number;
            })[];
            meta: object;
        }>;
        byId: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: ({
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
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.UnitStatus;
                    unitNumber: string;
                    propertyId: string;
                    bedrooms: number;
                    bathrooms: number;
                    squareFeet: number | null;
                    rent: number;
                    lastInspectionDate: Date | null;
                };
                Document: {
                    id: string;
                    name: string;
                    createdAt: Date | null;
                    updatedAt: Date | null;
                    type: import("@prisma/client").$Enums.DocumentType;
                    url: string;
                    propertyId: string | null;
                    leaseId: string | null;
                    fileSizeBytes: bigint;
                }[];
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
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    emergencyContact: string | null;
                    invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                    invitedAt: Date | null;
                    acceptedAt: Date | null;
                    userId: string | null;
                    invitationToken: string | null;
                    invitedBy: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.LeaseStatus;
                startDate: Date;
                endDate: Date;
                rentAmount: number;
                tenantId: string;
                unitId: string;
                securityDeposit: number;
            }) | null;
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                startDate: string;
                endDate: string;
                tenantId: string;
                unitId: string;
                propertyId: string;
                monthlyRent: number;
                securityDeposit?: number | undefined;
                terms?: string | undefined;
                leaseDocument?: string | undefined;
            };
            output: {
                Unit: {
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.UnitStatus;
                    unitNumber: string;
                    propertyId: string;
                    bedrooms: number;
                    bathrooms: number;
                    squareFeet: number | null;
                    rent: number;
                    lastInspectionDate: Date | null;
                };
                Tenant: {
                    User: {
                        id: string;
                        email: string;
                        name: string | null;
                    } | null;
                } & {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    emergencyContact: string | null;
                    invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                    invitedAt: Date | null;
                    acceptedAt: Date | null;
                    userId: string | null;
                    invitationToken: string | null;
                    invitedBy: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.LeaseStatus;
                startDate: Date;
                endDate: Date;
                rentAmount: number;
                tenantId: string;
                unitId: string;
                securityDeposit: number;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                status?: "PENDING" | "EXPIRED" | "ACTIVE" | "TERMINATED" | undefined;
                startDate?: string | undefined;
                endDate?: string | undefined;
                securityDeposit?: number | undefined;
                monthlyRent?: number | undefined;
                terms?: string | undefined;
                leaseDocument?: string | undefined;
            };
            output: {
                Unit: {
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.UnitStatus;
                    unitNumber: string;
                    propertyId: string;
                    bedrooms: number;
                    bathrooms: number;
                    squareFeet: number | null;
                    rent: number;
                    lastInspectionDate: Date | null;
                };
                Tenant: {
                    User: {
                        id: string;
                        email: string;
                        name: string | null;
                    } | null;
                } & {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    emergencyContact: string | null;
                    invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                    invitedAt: Date | null;
                    acceptedAt: Date | null;
                    userId: string | null;
                    invitationToken: string | null;
                    invitedBy: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.LeaseStatus;
                startDate: Date;
                endDate: Date;
                rentAmount: number;
                tenantId: string;
                unitId: string;
                securityDeposit: number;
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
                Unit: {
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.UnitStatus;
                    unitNumber: string;
                    propertyId: string;
                    bedrooms: number;
                    bathrooms: number;
                    squareFeet: number | null;
                    rent: number;
                    lastInspectionDate: Date | null;
                };
                Tenant: {
                    User: {
                        id: string;
                        email: string;
                        name: string | null;
                    } | null;
                } & {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    emergencyContact: string | null;
                    invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                    invitedAt: Date | null;
                    acceptedAt: Date | null;
                    userId: string | null;
                    invitationToken: string | null;
                    invitedBy: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.LeaseStatus;
                startDate: Date;
                endDate: Date;
                rentAmount: number;
                tenantId: string;
                unitId: string;
                securityDeposit: number;
            };
            meta: object;
        }>;
        upcomingExpirations: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                days?: number | undefined;
            } | undefined;
            output: ({
                Unit: {
                    Property: {
                        id: string;
                        name: string;
                        address: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.UnitStatus;
                    unitNumber: string;
                    propertyId: string;
                    bedrooms: number;
                    bathrooms: number;
                    squareFeet: number | null;
                    rent: number;
                    lastInspectionDate: Date | null;
                };
                Tenant: {
                    User: {
                        id: string;
                        email: string;
                        name: string | null;
                        phone: string | null;
                    } | null;
                } & {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    emergencyContact: string | null;
                    invitationStatus: import("@prisma/client").$Enums.InvitationStatus;
                    invitedAt: Date | null;
                    acceptedAt: Date | null;
                    userId: string | null;
                    invitationToken: string | null;
                    invitedBy: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.LeaseStatus;
                startDate: Date;
                endDate: Date;
                rentAmount: number;
                tenantId: string;
                unitId: string;
                securityDeposit: number;
            })[];
            meta: object;
        }>;
    }>>;
    subscriptions: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./context/app.context").Context;
        meta: object;
        errorShape: {
            data: {
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
        getCurrent: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: "CANCELED" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "UNPAID";
                userId: string;
                stripeCustomerId: string | null;
                plan: {
                    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
                    name: string;
                    limits: {
                        tenants: number;
                        properties: number;
                    };
                    price: number;
                    stripePriceId?: string | undefined;
                };
                planId: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | null;
                currentPeriodStart: Date | null;
                currentPeriodEnd: Date | null;
                trialEnd: Date | null;
                stripeSubscriptionId: string | null;
                usage: {
                    tenants: number;
                    properties: number;
                };
            };
            meta: object;
        }>;
        getUsage: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                tenants: number;
                properties: number;
            };
            meta: object;
        }>;
        getPlans: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
                name: string;
                limits: {
                    tenants: number;
                    properties: number;
                };
                price: number;
                stripePriceId?: string | undefined;
            }[];
            meta: object;
        }>;
        getPlan: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                planId: string;
            };
            output: {
                id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
                name: string;
                limits: {
                    tenants: number;
                    properties: number;
                };
                price: number;
                stripePriceId?: string | undefined;
            } | null;
            meta: object;
        }>;
        createWithSignup: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                planId: string;
                userEmail: string;
                userName: string;
                userId?: string | undefined;
                billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
                paymentMethodCollection?: "always" | "if_required" | undefined;
                createAccount?: boolean | undefined;
            };
            output: {
                user: {
                    id: string;
                    email: string;
                    fullName: string | null;
                };
                status: "CANCELED" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "UNPAID";
                subscriptionId: string;
                accessToken: string;
                refreshToken: string;
                trialEnd?: number | null | undefined;
                clientSecret?: string | null | undefined;
                setupIntentId?: string | undefined;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                planId: string;
                userId?: string | undefined;
                billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
                paymentMethodCollection?: "always" | "if_required" | undefined;
                userEmail?: string | undefined;
                userName?: string | undefined;
                createAccount?: boolean | undefined;
            };
            output: {
                status: "CANCELED" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "UNPAID";
                subscriptionId: string;
                trialEnd?: number | null | undefined;
                clientSecret?: string | null | undefined;
                setupIntentId?: string | undefined;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                planId?: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | undefined;
                billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
                subscriptionId?: string | undefined;
            };
            output: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: "CANCELED" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "UNPAID";
                userId: string;
                stripeCustomerId: string | null;
                plan: {
                    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
                    name: string;
                    limits: {
                        tenants: number;
                        properties: number;
                    };
                    price: number;
                    stripePriceId?: string | undefined;
                };
                planId: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | null;
                currentPeriodStart: Date | null;
                currentPeriodEnd: Date | null;
                trialEnd: Date | null;
                stripeSubscriptionId: string | null;
                usage: {
                    tenants: number;
                    properties: number;
                };
            };
            meta: object;
        }>;
        cancel: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                subscriptionId: string;
            };
            output: {
                message: string;
                success: boolean;
            };
            meta: object;
        }>;
        createPortalSession: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                customerId?: string | undefined;
                returnUrl?: string | undefined;
            };
            output: {
                url: string;
                sessionId?: string | undefined;
            };
            meta: object;
        }>;
        startTrial: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                status: string;
                success: boolean;
                trialEnd: Date | null;
                subscriptionId: string;
            };
            meta: object;
        }>;
        canPerformAction: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                action: "tenant" | "property" | "api" | "storage" | "leaseGeneration";
            };
            output: {
                allowed: boolean;
                upgradeRequired: boolean;
                reason?: string | undefined;
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = ReturnType<typeof createAppRouter>;
//# sourceMappingURL=app-router.d.ts.map