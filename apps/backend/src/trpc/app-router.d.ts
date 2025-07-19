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
                createdAt: string;
                updatedAt: string;
                role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                email: string;
                emailVerified: boolean;
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
                    createdAt: string;
                    updatedAt: string;
                    role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                    email: string;
                    emailVerified: boolean;
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
                    createdAt: string;
                    updatedAt: string;
                    role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                    email: string;
                    emailVerified: boolean;
                    name?: string | undefined;
                    phone?: string | undefined;
                    avatarUrl?: string | undefined;
                };
                expiresAt: string;
                isValid: boolean;
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
                status?: string | undefined;
                search?: string | undefined;
                propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
                limit?: string | undefined;
                offset?: string | undefined;
            };
            output: {
                total: number;
                properties: {
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
                    propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
                }[];
            };
            meta: object;
        }>;
        stats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                totalProperties: number;
                totalUnits: number;
                occupiedUnits: number;
                vacantUnits: number;
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
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                name?: string | undefined;
                description?: string | undefined;
                address?: string | undefined;
                city?: string | undefined;
                state?: string | undefined;
                zipCode?: string | undefined;
                imageUrl?: string | undefined;
                propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
            };
            output: {
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
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
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
                propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
            };
            meta: object;
        }>;
        uploadImage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                propertyId: string;
                file: {
                    data: string;
                    size: number;
                    filename: string;
                    mimeType: string;
                };
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
                endDate?: string | undefined;
                unitId?: string | undefined;
                tenantId?: string | undefined;
                startDate?: string | undefined;
                status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
                propertyId?: string | undefined;
                search?: string | undefined;
                limit?: string | undefined;
                offset?: string | undefined;
                category?: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY" | undefined;
                priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
                assignedTo?: string | undefined;
            };
            output: {
                total: number;
                requests: {
                    id: string;
                    unitId: string;
                    status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                    createdAt: string;
                    updatedAt: string;
                    description: string;
                    title: string;
                    category: string | null;
                    priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                    category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
                    count: number;
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
                id: string;
                unitId: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                description: string;
                title: string;
                category: string | null;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                unitId: string;
                description: string;
                title: string;
                category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
                priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
                preferredDate?: string | undefined;
                allowEntry?: boolean | undefined;
                contactPhone?: string | undefined;
                photos?: string[] | undefined;
            };
            output: {
                id: string;
                unitId: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                description: string;
                title: string;
                category: string | null;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
                description?: string | undefined;
                title?: string | undefined;
                category?: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY" | undefined;
                priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
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
                id: string;
                unitId: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                description: string;
                title: string;
                category: string | null;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                id: string;
                unitId: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                description: string;
                title: string;
                category: string | null;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                id: string;
                unitId: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                description: string;
                title: string;
                category: string | null;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                id: string;
                unitId: string;
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                description: string;
                title: string;
                category: string | null;
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
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
                assignedTo: string;
                maintenanceRequestId: string;
                scheduledDate: string;
                estimatedHours: number;
                instructions?: string | undefined;
            };
            output: {
                id: string;
                createdAt: string;
                assignedTo: string;
                maintenanceRequestId: string;
                scheduledDate: string;
                estimatedHours: number;
                materials?: {
                    name: string;
                    cost: number;
                    quantity: number;
                }[] | undefined;
                instructions?: string | undefined;
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
                status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                stripeCustomerId: string | null;
                stripeSubscriptionId: string | null;
                planId: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | null;
                currentPeriodStart: Date | null;
                currentPeriodEnd: Date | null;
                trialEnd: Date | null;
                plan: {
                    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
                    name: string;
                    price: number;
                    limits: {
                        tenants: number;
                        properties: number;
                    };
                    stripePriceId?: string | undefined;
                };
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
                price: number;
                limits: {
                    tenants: number;
                    properties: number;
                };
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
                price: number;
                limits: {
                    tenants: number;
                    properties: number;
                };
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
                status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
                user: {
                    id: string;
                    email: string;
                    fullName: string | null;
                };
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
                status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
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
                status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                stripeCustomerId: string | null;
                stripeSubscriptionId: string | null;
                planId: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | null;
                currentPeriodStart: Date | null;
                currentPeriodEnd: Date | null;
                trialEnd: Date | null;
                plan: {
                    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
                    name: string;
                    price: number;
                    limits: {
                        tenants: number;
                        properties: number;
                    };
                    stripePriceId?: string | undefined;
                };
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
                trialEnd: Date | null;
                success: boolean;
                subscriptionId: string;
            };
            meta: object;
        }>;
        canPerformAction: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                action: "property" | "tenant" | "api" | "storage" | "leaseGeneration";
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