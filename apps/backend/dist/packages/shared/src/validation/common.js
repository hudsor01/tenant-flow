"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookDeliverySchema = exports.webhookEventSchema = exports.bulkResponseSchema = exports.bulkOperationSchema = exports.timeRangeSchema = exports.advancedSearchSchema = exports.sortSchema = exports.coordinatesSchema = exports.addressSchema = exports.uploadedFileSchema = exports.fileSizeSchema = exports.fileTypeSchema = exports.urlSchema = exports.percentageSchema = exports.currencyAmountSchema = exports.phoneSchema = exports.serverActionResponseSchema = exports.formActionStateSchema = exports.actionStateSchema = exports.createListResponseSchema = exports.createApiResponseSchema = exports.createPaginatedResponseSchema = exports.auditFieldsSchema = exports.metadataSchema = exports.errorResponseSchema = exports.successResponseSchema = exports.baseQuerySchema = exports.searchSchema = exports.sortOrderSchema = exports.statusSchema = exports.timestampFieldsSchema = exports.idSchema = exports.dateRangeSchema = exports.dateStringSchema = exports.paginationResponseSchema = exports.paginationQuerySchema = exports.paginationSchema = exports.nonNegativeNumberSchema = exports.positiveNumberSchema = exports.nonEmptyStringSchema = exports.emailSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
exports.uuidSchema = zod_1.z.string()
    .min(1, { message: 'UUID is required' })
    .refine((val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), { message: 'Invalid UUID format' });
exports.emailSchema = zod_1.z.string()
    .min(1, { message: 'Email is required' })
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'Invalid email format' });
exports.nonEmptyStringSchema = zod_1.z.string()
    .min(1, { message: 'This field is required' });
exports.positiveNumberSchema = zod_1.z.number()
    .positive({ message: 'Must be a positive number' });
exports.nonNegativeNumberSchema = zod_1.z.number()
    .nonnegative({ message: 'Cannot be negative' });
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(10)
});
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
});
exports.paginationResponseSchema = zod_1.z.object({
    totalCount: zod_1.z.number(),
    totalPages: zod_1.z.number(),
    currentPage: zod_1.z.number(),
    hasNextPage: zod_1.z.boolean(),
    hasPreviousPage: zod_1.z.boolean()
});
exports.dateStringSchema = zod_1.z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid date format' });
exports.dateRangeSchema = zod_1.z.object({
    startDate: exports.dateStringSchema.optional(),
    endDate: exports.dateStringSchema.optional(),
});
exports.idSchema = zod_1.z.object({
    id: exports.uuidSchema,
});
exports.timestampFieldsSchema = zod_1.z.object({
    createdAt: exports.dateStringSchema,
    updatedAt: exports.dateStringSchema,
});
exports.statusSchema = zod_1.z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'FAILED']);
exports.sortOrderSchema = zod_1.z.enum(['asc', 'desc']).optional().default('desc');
exports.searchSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: exports.sortOrderSchema,
});
exports.baseQuerySchema = zod_1.z.object({
    ...exports.paginationSchema.shape,
    ...exports.searchSchema.shape,
    ...exports.dateRangeSchema.shape,
});
exports.successResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
exports.errorResponseSchema = zod_1.z.object({
    error: zod_1.z.string(),
    message: zod_1.z.string(),
    code: zod_1.z.string().optional(),
});
exports.metadataSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
exports.auditFieldsSchema = zod_1.z.object({
    createdBy: zod_1.z.string()
        .refine((val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), { message: 'Invalid UUID format' })
        .optional(),
    updatedBy: zod_1.z.string()
        .refine((val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), { message: 'Invalid UUID format' })
        .optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
const createPaginatedResponseSchema = (itemSchema) => zod_1.z.object({
    data: zod_1.z.array(itemSchema),
    pagination: exports.paginationResponseSchema
});
exports.createPaginatedResponseSchema = createPaginatedResponseSchema;
const createApiResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: dataSchema.optional(),
    error: zod_1.z.string().optional(),
    message: zod_1.z.string().optional()
});
exports.createApiResponseSchema = createApiResponseSchema;
const createListResponseSchema = (itemSchema) => zod_1.z.object({
    items: zod_1.z.array(itemSchema),
    totalCount: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
    totalPages: zod_1.z.number()
});
exports.createListResponseSchema = createListResponseSchema;
exports.actionStateSchema = zod_1.z.object({
    success: zod_1.z.boolean().optional(),
    loading: zod_1.z.boolean().optional(),
    error: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
    data: zod_1.z.unknown().optional()
});
exports.formActionStateSchema = exports.actionStateSchema.extend({
    fieldErrors: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional()
});
exports.serverActionResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.unknown().optional(),
    error: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
    redirect: zod_1.z.string().optional()
});
exports.phoneSchema = zod_1.z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
exports.currencyAmountSchema = zod_1.z.number()
    .min(0, 'Amount cannot be negative')
    .max(999999999.99, 'Amount is too large');
exports.percentageSchema = zod_1.z.number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100');
exports.urlSchema = zod_1.z.string().refine((val) => {
    try {
        new URL(val);
        return true;
    }
    catch {
        return false;
    }
}, { message: 'Invalid URL format' });
exports.fileTypeSchema = zod_1.z.enum([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
]);
exports.fileSizeSchema = zod_1.z.number()
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB');
exports.uploadedFileSchema = zod_1.z.object({
    name: zod_1.z.string(),
    size: exports.fileSizeSchema,
    type: exports.fileTypeSchema,
    lastModified: zod_1.z.number(),
    data: zod_1.z.string().optional()
});
exports.addressSchema = zod_1.z.object({
    street: exports.nonEmptyStringSchema,
    city: exports.nonEmptyStringSchema,
    state: exports.nonEmptyStringSchema,
    zipCode: zod_1.z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: zod_1.z.string().length(2, 'Country code must be 2 letters').default('US')
});
exports.coordinatesSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180)
});
exports.sortSchema = zod_1.z.object({
    field: zod_1.z.string(),
    direction: zod_1.z.enum(['asc', 'desc']).default('desc')
});
exports.advancedSearchSchema = exports.searchSchema.extend({
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    sort: zod_1.z.array(exports.sortSchema).optional(),
    include: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional()
});
exports.timeRangeSchema = zod_1.z.object({
    from: exports.dateStringSchema.optional(),
    to: exports.dateStringSchema.optional(),
    preset: zod_1.z.enum(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']).optional()
});
exports.bulkOperationSchema = zod_1.z.object({
    action: zod_1.z.enum(['create', 'update', 'delete', 'archive', 'restore']),
    ids: zod_1.z.array(exports.uuidSchema).min(1, 'At least one ID is required'),
    data: zod_1.z.unknown().optional()
});
exports.bulkResponseSchema = zod_1.z.object({
    successful: zod_1.z.array(exports.uuidSchema),
    failed: zod_1.z.array(zod_1.z.object({
        id: exports.uuidSchema,
        error: zod_1.z.string()
    })),
    totalProcessed: zod_1.z.number(),
    successCount: zod_1.z.number(),
    failureCount: zod_1.z.number()
});
exports.webhookEventSchema = zod_1.z.object({
    id: exports.uuidSchema,
    type: zod_1.z.string(),
    data: zod_1.z.unknown(),
    timestamp: exports.dateStringSchema,
    version: zod_1.z.string().default('1.0')
});
exports.webhookDeliverySchema = zod_1.z.object({
    id: exports.uuidSchema,
    url: exports.urlSchema,
    event: exports.webhookEventSchema,
    attempts: zod_1.z.number().min(1),
    status: zod_1.z.enum(['pending', 'delivered', 'failed']),
    response: zod_1.z.object({
        status: zod_1.z.number(),
        headers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
        body: zod_1.z.string()
    }).optional(),
    nextRetry: exports.dateStringSchema.optional()
});
