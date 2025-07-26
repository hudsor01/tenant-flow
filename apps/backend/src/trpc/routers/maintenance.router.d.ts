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
            priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
            status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
            search?: string | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
            tenantId?: string | undefined;
            propertyId?: string | undefined;
            limit?: string | undefined;
            offset?: string | undefined;
            unitId?: string | undefined;
            category?: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY" | undefined;
            assignedTo?: string | undefined;
        };
        output: {
            total: number;
            requests: {
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                id: string;
                description: string;
                unitId: string;
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
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        ownerId: string;
                    };
                    unitNumber: string;
                } | undefined;
                Assignee?: {
                    name: string | null;
                    id: string;
                    email: string;
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
            MONTHLYTrend?: {
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null | undefined;
        };
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
            status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
            description?: string | undefined;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null | undefined;
        };
        meta: object;
    }>;
    createWorkOrder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            assignedTo: string;
            scheduledDate: string;
            maintenanceRequestId: string;
            estimatedHours: number;
            instructions?: string | undefined;
        };
        output: {
            createdAt: string;
            id: string;
            assignedTo: string;
            scheduledDate: string;
            maintenanceRequestId: string;
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
            priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
            status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
            search?: string | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
            tenantId?: string | undefined;
            propertyId?: string | undefined;
            limit?: string | undefined;
            offset?: string | undefined;
            unitId?: string | undefined;
            category?: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY" | undefined;
            assignedTo?: string | undefined;
        };
        output: {
            total: number;
            requests: {
                priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
                status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
                createdAt: string;
                updatedAt: string;
                id: string;
                description: string;
                unitId: string;
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
                    Property: {
                        name: string;
                        id: string;
                        address: string;
                        ownerId: string;
                    };
                    unitNumber: string;
                } | undefined;
                Assignee?: {
                    name: string | null;
                    id: string;
                    email: string;
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
            MONTHLYTrend?: {
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null | undefined;
        };
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
            status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD" | undefined;
            description?: string | undefined;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
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
            priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
            status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
            createdAt: string;
            updatedAt: string;
            id: string;
            description: string;
            unitId: string;
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
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    ownerId: string;
                };
                unitNumber: string;
            } | undefined;
            Assignee?: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
            } | null | undefined;
        };
        meta: object;
    }>;
    createWorkOrder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            assignedTo: string;
            scheduledDate: string;
            maintenanceRequestId: string;
            estimatedHours: number;
            instructions?: string | undefined;
        };
        output: {
            createdAt: string;
            id: string;
            assignedTo: string;
            scheduledDate: string;
            maintenanceRequestId: string;
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