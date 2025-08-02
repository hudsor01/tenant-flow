"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createListResponseSchema = exports.createApiResponseSchema = exports.createPaginatedResponseSchema = exports.auditFieldsSchema = exports.metadataSchema = exports.errorResponseSchema = exports.successResponseSchema = exports.baseQuerySchema = exports.searchSchema = exports.sortOrderSchema = exports.statusSchema = exports.timestampFieldsSchema = exports.idSchema = exports.dateRangeSchema = exports.dateStringSchema = exports.paginationResponseSchema = exports.paginationQuerySchema = exports.paginationSchema = exports.nonNegativeNumberSchema = exports.positiveNumberSchema = exports.nonEmptyStringSchema = exports.emailSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
exports.uuidSchema = zod_1.z.string({
    error: 'UUID is required'
}).uuid({ message: 'Invalid UUID format' });
exports.emailSchema = zod_1.z.string({
    error: 'Email is required'
}).email({ message: 'Invalid email format' });
exports.nonEmptyStringSchema = zod_1.z.string({
    error: 'This field is required'
}).min(1, { message: 'Field cannot be empty' });
exports.positiveNumberSchema = zod_1.z.number({
    error: 'This field is required'
}).positive({ message: 'Must be a positive number' });
exports.nonNegativeNumberSchema = zod_1.z.number({
    error: 'This field is required'
}).nonnegative({ message: 'Cannot be negative' });
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
exports.dateStringSchema = zod_1.z.string().datetime('Invalid date format');
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
exports.baseQuerySchema = exports.paginationSchema.merge(exports.searchSchema).merge(exports.dateRangeSchema);
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
    createdBy: zod_1.z.string().uuid().optional(),
    updatedBy: zod_1.z.string().uuid().optional(),
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
    limit: zod_1.z.number(),
    totalPages: zod_1.z.number()
});
exports.createListResponseSchema = createListResponseSchema;
