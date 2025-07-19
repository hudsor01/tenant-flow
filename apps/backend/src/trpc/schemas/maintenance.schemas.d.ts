import { z } from 'zod';
export declare const maintenanceStatusSchema: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED", "ON_HOLD"]>;
export declare const maintenancePrioritySchema: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "EMERGENCY"]>;
export declare const maintenanceCategorySchema: z.ZodEnum<["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PAINTING", "FLOORING", "PEST_CONTROL", "LANDSCAPING", "SECURITY", "OTHER"]>;
export declare const createMaintenanceSchema: z.ZodObject<{
    unitId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PAINTING", "FLOORING", "PEST_CONTROL", "LANDSCAPING", "SECURITY", "OTHER"]>;
    priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "EMERGENCY"]>>;
    preferredDate: z.ZodOptional<z.ZodString>;
    allowEntry: z.ZodDefault<z.ZodBoolean>;
    contactPhone: z.ZodOptional<z.ZodString>;
    photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    unitId: string;
    description: string;
    title: string;
    category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
    priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
    allowEntry: boolean;
    preferredDate?: string | undefined;
    contactPhone?: string | undefined;
    photos?: string[] | undefined;
}, {
    unitId: string;
    description: string;
    title: string;
    category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | undefined;
    preferredDate?: string | undefined;
    allowEntry?: boolean | undefined;
    contactPhone?: string | undefined;
    photos?: string[] | undefined;
}>;
export declare const updateMaintenanceSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PAINTING", "FLOORING", "PEST_CONTROL", "LANDSCAPING", "SECURITY", "OTHER"]>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "EMERGENCY"]>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED", "ON_HOLD"]>>;
    preferredDate: z.ZodOptional<z.ZodString>;
    allowEntry: z.ZodOptional<z.ZodBoolean>;
    contactPhone: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    estimatedCost: z.ZodOptional<z.ZodNumber>;
    actualCost: z.ZodOptional<z.ZodNumber>;
    completedAt: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const maintenanceQuerySchema: z.ZodObject<{
    unitId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED", "ON_HOLD"]>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "EMERGENCY"]>>;
    category: z.ZodOptional<z.ZodEnum<["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PAINTING", "FLOORING", "PEST_CONTROL", "LANDSCAPING", "SECURITY", "OTHER"]>>;
    assignedTo: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const maintenanceIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const assignMaintenanceSchema: z.ZodObject<{
    id: z.ZodString;
    assignedTo: z.ZodString;
    estimatedCost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    assignedTo: string;
    notes?: string | undefined;
    estimatedCost?: number | undefined;
}, {
    id: string;
    assignedTo: string;
    notes?: string | undefined;
    estimatedCost?: number | undefined;
}>;
export declare const completeMaintenanceSchema: z.ZodObject<{
    id: z.ZodString;
    actualCost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    notes?: string | undefined;
    photos?: string[] | undefined;
    actualCost?: number | undefined;
}, {
    id: string;
    notes?: string | undefined;
    photos?: string[] | undefined;
    actualCost?: number | undefined;
}>;
export declare const unitReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    unitNumber: z.ZodString;
    Property: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        address: z.ZodString;
        ownerId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        address: string;
        ownerId: string;
    }, {
        id: string;
        name: string;
        address: string;
        ownerId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    unitNumber: string;
    Property: {
        id: string;
        name: string;
        address: string;
        ownerId: string;
    };
}, {
    id: string;
    unitNumber: string;
    Property: {
        id: string;
        name: string;
        address: string;
        ownerId: string;
    };
}>;
export declare const tenantReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
    User: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name: string | null;
    }, {
        id: string;
        email: string;
        name: string | null;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    User: {
        id: string;
        email: string;
        name: string | null;
    } | null;
    email: string;
    name: string;
    phone: string | null;
}, {
    id: string;
    User: {
        id: string;
        email: string;
        name: string | null;
    } | null;
    email: string;
    name: string;
    phone: string | null;
}>;
export declare const assigneeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    email: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
}, {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
}>;
export declare const maintenanceRequestSchema: z.ZodObject<{
    id: z.ZodString;
    unitId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodNullable<z.ZodString>;
    priority: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "EMERGENCY"]>;
    status: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED", "ON_HOLD"]>;
    preferredDate: z.ZodNullable<z.ZodString>;
    allowEntry: z.ZodBoolean;
    contactPhone: z.ZodNullable<z.ZodString>;
    requestedBy: z.ZodNullable<z.ZodString>;
    assignedTo: z.ZodNullable<z.ZodString>;
    estimatedCost: z.ZodNullable<z.ZodNumber>;
    actualCost: z.ZodNullable<z.ZodNumber>;
    completedAt: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    photos: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    Unit: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        unitNumber: z.ZodString;
        Property: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            address: z.ZodString;
            ownerId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            address: string;
            ownerId: string;
        }, {
            id: string;
            name: string;
            address: string;
            ownerId: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        unitNumber: string;
        Property: {
            id: string;
            name: string;
            address: string;
            ownerId: string;
        };
    }, {
        id: string;
        unitNumber: string;
        Property: {
            id: string;
            name: string;
            address: string;
            ownerId: string;
        };
    }>>;
    Assignee: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
        phone: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
    }, {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
    }>>>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const maintenanceListSchema: z.ZodObject<{
    requests: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        unitId: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        category: z.ZodNullable<z.ZodString>;
        priority: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "EMERGENCY"]>;
        status: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED", "ON_HOLD"]>;
        preferredDate: z.ZodNullable<z.ZodString>;
        allowEntry: z.ZodBoolean;
        contactPhone: z.ZodNullable<z.ZodString>;
        requestedBy: z.ZodNullable<z.ZodString>;
        assignedTo: z.ZodNullable<z.ZodString>;
        estimatedCost: z.ZodNullable<z.ZodNumber>;
        actualCost: z.ZodNullable<z.ZodNumber>;
        completedAt: z.ZodNullable<z.ZodString>;
        notes: z.ZodNullable<z.ZodString>;
        photos: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        Unit: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            unitNumber: z.ZodString;
            Property: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                address: z.ZodString;
                ownerId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                address: string;
                ownerId: string;
            }, {
                id: string;
                name: string;
                address: string;
                ownerId: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                ownerId: string;
            };
        }, {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                ownerId: string;
            };
        }>>;
        Assignee: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodNullable<z.ZodString>;
            email: z.ZodString;
            phone: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
        }, {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
        }>>>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>, "many">;
    total: z.ZodNumber;
    totalCost: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const maintenanceStatsSchema: z.ZodObject<{
    totalRequests: z.ZodNumber;
    openRequests: z.ZodNumber;
    inProgressRequests: z.ZodNumber;
    completedRequests: z.ZodNumber;
    urgentRequests: z.ZodNumber;
    totalEstimatedCost: z.ZodNumber;
    totalActualCost: z.ZodNumber;
    averageCompletionTime: z.ZodNumber;
    categoryBreakdown: z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PAINTING", "FLOORING", "PEST_CONTROL", "LANDSCAPING", "SECURITY", "OTHER"]>;
        count: z.ZodNumber;
        percentage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
        count: number;
        percentage: number;
    }, {
        category: "OTHER" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "APPLIANCE" | "STRUCTURAL" | "PAINTING" | "FLOORING" | "PEST_CONTROL" | "LANDSCAPING" | "SECURITY";
        count: number;
        percentage: number;
    }>, "many">;
    monthlyTrend: z.ZodOptional<z.ZodArray<z.ZodObject<{
        month: z.ZodString;
        count: z.ZodNumber;
        cost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        month: string;
        cost: number;
    }, {
        count: number;
        month: string;
        cost: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const maintenanceWorkOrderSchema: z.ZodObject<{
    id: z.ZodString;
    maintenanceRequestId: z.ZodString;
    assignedTo: z.ZodString;
    scheduledDate: z.ZodString;
    estimatedHours: z.ZodNumber;
    materials: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        quantity: z.ZodNumber;
        cost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        cost: number;
        quantity: number;
    }, {
        name: string;
        cost: number;
        quantity: number;
    }>, "many">>;
    instructions: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
//# sourceMappingURL=maintenance.schemas.d.ts.map