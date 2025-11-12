"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMaintenanceRequestSchema = exports.createMaintenanceRequestSchema = exports.maintenanceCommentSchema = exports.maintenanceUpdateSchema = exports.maintenanceInputSchema = exports.maintenanceRequestUpdateFormSchema = exports.maintenanceRequestFormSchema = exports.maintenanceStatsSchema = exports.maintenanceRequestQuerySchema = exports.maintenanceRequestUpdateSchema = exports.maintenanceRequestSchema = exports.maintenanceRequestInputSchema = exports.maintenanceCategorySchema = exports.maintenanceStatusSchema = exports.maintenancePrioritySchema = void 0;
const zod_1 = require("zod");
const supabase_generated_js_1 = require("../types/supabase-generated.js");
const common_js_1 = require("./common.js");
exports.maintenancePrioritySchema = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.Priority);
exports.maintenanceStatusSchema = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.RequestStatus);
exports.maintenanceCategorySchema = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.MaintenanceCategory);
exports.maintenanceRequestInputSchema = zod_1.z.object({
    title: common_js_1.nonEmptyStringSchema
        .min(5, 'Title must be at least 5 characters')
        .max(200, 'Title cannot exceed 200 characters'),
    description: common_js_1.nonEmptyStringSchema
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description cannot exceed 2000 characters'),
    priority: exports.maintenancePrioritySchema.default('MEDIUM'),
    category: zod_1.z.string().optional(),
    unitId: common_js_1.uuidSchema,
    assignedTo: common_js_1.uuidSchema.optional(),
    requestedBy: common_js_1.uuidSchema.optional(),
    contactPhone: zod_1.z.string().optional(),
    allowEntry: zod_1.z.boolean().optional().default(false),
    estimatedCost: common_js_1.nonNegativeNumberSchema
        .max(1000000, 'Estimated cost seems unrealistic')
        .optional(),
    photos: zod_1.z.array(zod_1.z.string()).optional().default([]),
    notes: zod_1.z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
    preferredDate: zod_1.z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Please enter a valid preferred date'
    })
        .transform((val) => (val ? new Date(val) : undefined))
});
exports.maintenanceRequestSchema = exports.maintenanceRequestInputSchema.extend({
    id: common_js_1.uuidSchema,
    status: exports.maintenanceStatusSchema.default('OPEN'),
    completedAt: zod_1.z.date().optional(),
    actualCost: common_js_1.nonNegativeNumberSchema.optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.maintenanceRequestUpdateSchema = exports.maintenanceRequestInputSchema
    .partial()
    .extend({
    status: exports.maintenanceStatusSchema.optional(),
    actualCost: common_js_1.nonNegativeNumberSchema.optional(),
    completedAt: zod_1.z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Please enter a valid completion date'
    })
        .transform((val) => (val ? new Date(val) : undefined))
});
exports.maintenanceRequestQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    unitId: common_js_1.uuidSchema.optional(),
    requestedBy: common_js_1.uuidSchema.optional(),
    assignedTo: common_js_1.uuidSchema.optional(),
    status: exports.maintenanceStatusSchema.optional(),
    priority: exports.maintenancePrioritySchema.optional(),
    category: zod_1.z.string().optional(),
    dateFrom: zod_1.z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format'
    }),
    dateTo: zod_1.z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format'
    }),
    minCost: common_js_1.nonNegativeNumberSchema.optional(),
    maxCost: common_js_1.nonNegativeNumberSchema.optional(),
    sortBy: zod_1.z
        .enum([
        'title',
        'priority',
        'status',
        'createdAt',
        'preferredDate',
        'estimatedCost'
    ])
        .optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
});
exports.maintenanceStatsSchema = zod_1.z.object({
    total: zod_1.z.number().nonnegative(),
    open: zod_1.z.number().nonnegative(),
    inProgress: zod_1.z.number().nonnegative(),
    completed: zod_1.z.number().nonnegative(),
    canceled: zod_1.z.number().nonnegative(),
    onHold: zod_1.z.number().nonnegative(),
    overdue: zod_1.z.number().nonnegative(),
    averageCompletionTime: zod_1.z.number().nonnegative(),
    totalCost: zod_1.z.number().nonnegative(),
    averageCost: zod_1.z.number().nonnegative()
});
exports.maintenanceRequestFormSchema = zod_1.z
    .object({
    title: common_js_1.requiredString,
    description: common_js_1.requiredString,
    priority: zod_1.z.string().default('MEDIUM'),
    category: zod_1.z.string().optional().or(zod_1.z.literal('')),
    unitId: common_js_1.requiredString,
    requestedBy: zod_1.z.string().optional().or(zod_1.z.literal('')),
    assignedTo: zod_1.z.string().optional().or(zod_1.z.literal('')),
    contactPhone: zod_1.z.string().optional(),
    allowEntry: zod_1.z.boolean().optional().default(false),
    estimatedCost: zod_1.z
        .string()
        .optional()
        .transform((val) => val ? parseFloat(val) : undefined),
    photos: zod_1.z.array(zod_1.z.string()).optional().default([]),
    preferredDate: zod_1.z.string().optional().or(zod_1.z.literal('')),
    notes: zod_1.z.string().optional()
})
    .transform((data) => ({
    ...data,
    priority: data.priority,
    category: data.category === '' ? undefined : data.category,
    requestedBy: data.requestedBy === '' ? undefined : data.requestedBy,
    assignedTo: data.assignedTo === '' ? undefined : data.assignedTo,
    preferredDate: data.preferredDate === '' ? undefined : data.preferredDate,
    photos: data.photos || []
}));
exports.maintenanceRequestUpdateFormSchema = zod_1.z
    .object({
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.string().optional(),
    category: zod_1.z.string().optional().or(zod_1.z.literal('')),
    estimatedCost: zod_1.z
        .string()
        .optional()
        .transform((val) => val ? parseFloat(val) : undefined),
    notes: zod_1.z.string().optional(),
    preferredDate: zod_1.z.string().optional().or(zod_1.z.literal('')),
    allowEntry: zod_1.z.boolean().optional().default(false),
    status: zod_1.z.string().optional(),
    actualCost: zod_1.z
        .string()
        .optional()
        .transform((val) => val ? parseFloat(val) : undefined),
    completedAt: zod_1.z.string().optional().or(zod_1.z.literal(''))
})
    .transform((data) => ({
    ...data,
    priority: data.priority,
    category: data.category === '' ? undefined : data.category,
    preferredDate: data.preferredDate === '' ? undefined : data.preferredDate,
    completedAt: data.completedAt === '' ? undefined : data.completedAt,
    status: data.status
}));
exports.maintenanceInputSchema = exports.maintenanceRequestInputSchema;
exports.maintenanceUpdateSchema = exports.maintenanceRequestUpdateSchema;
exports.maintenanceCommentSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, 'Comment is required')
        .max(1000, 'Comment too long'),
    maintenanceRequestId: common_js_1.uuidSchema
});
exports.createMaintenanceRequestSchema = zod_1.z.object({
    unitId: common_js_1.uuidSchema,
    title: common_js_1.nonEmptyStringSchema
        .min(5, 'Title must be at least 5 characters')
        .max(200, 'Title cannot exceed 200 characters'),
    description: common_js_1.nonEmptyStringSchema
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description cannot exceed 2000 characters'),
    priority: exports.maintenancePrioritySchema.optional(),
    category: zod_1.z.string().optional(),
    scheduledDate: zod_1.z.string().optional(),
    estimatedCost: common_js_1.nonNegativeNumberSchema.optional(),
    photos: zod_1.z.array(zod_1.z.string()).optional(),
    allowEntry: zod_1.z.boolean().optional(),
    contactPhone: zod_1.z.string().optional(),
    notes: zod_1.z.string().max(1000).optional().nullable()
});
exports.updateMaintenanceRequestSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    scheduledDate: zod_1.z.string().optional(),
    completedDate: zod_1.z.string().optional(),
    estimatedCost: zod_1.z.number().optional(),
    actualCost: zod_1.z.number().optional(),
    notes: zod_1.z.string().optional(),
    allowEntry: zod_1.z.boolean().optional(),
    contactPhone: zod_1.z.string().optional()
});
//# sourceMappingURL=maintenance.js.map