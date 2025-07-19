import { z } from 'zod';
import type { MaintenanceService } from '../../maintenance/maintenance.service';
export declare const createMaintenanceRouter: (maintenanceService: MaintenanceService) => import("@trpc/server").TRPCBuiltRouter<{
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
export declare const maintenanceRouter: (maintenanceService: MaintenanceService) => import("@trpc/server").TRPCBuiltRouter<{
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
//# sourceMappingURL=maintenance.router.d.ts.map