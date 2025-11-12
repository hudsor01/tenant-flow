"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTenantCreateForm = exports.updateTenantRequestSchema = exports.createTenantRequestSchema = exports.validateTenantForm = exports.tenantUpdateFormSchema = exports.tenantCreateFormSchema = exports.tenantFormSchema = exports.tenantStatsSchema = exports.tenantQuerySchema = exports.tenantUpdateSchema = exports.tenantSchema = exports.tenantInputSchema = exports.emergencyContactSchema = void 0;
const zod_1 = require("zod");
const common_js_1 = require("./common.js");
exports.emergencyContactSchema = zod_1.z
    .string()
    .max(500, 'Emergency contact info cannot exceed 500 characters')
    .optional();
const tenantBaseSchema = zod_1.z.object({
    email: common_js_1.emailSchema,
    name: common_js_1.nonEmptyStringSchema
        .max(200, 'Name cannot exceed 200 characters')
        .optional(),
    firstName: common_js_1.nonEmptyStringSchema
        .max(100, 'First name cannot exceed 100 characters')
        .optional(),
    lastName: common_js_1.nonEmptyStringSchema
        .max(100, 'Last name cannot exceed 100 characters')
        .optional(),
    phone: common_js_1.phoneSchema.optional(),
    emergencyContact: exports.emergencyContactSchema,
    avatarUrl: zod_1.z.string().url().optional(),
    userId: common_js_1.uuidSchema.optional()
});
exports.tenantInputSchema = tenantBaseSchema;
exports.tenantSchema = tenantBaseSchema.extend({
    id: common_js_1.uuidSchema,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.tenantUpdateSchema = tenantBaseSchema.partial();
exports.tenantQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    userId: common_js_1.uuidSchema.optional(),
    sortBy: zod_1.z
        .enum(['name', 'firstName', 'lastName', 'email', 'createdAt'])
        .optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
});
exports.tenantStatsSchema = zod_1.z.object({
    total: zod_1.z.number().nonnegative()
});
exports.tenantFormSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .max(254, 'Email cannot exceed 254 characters'),
    name: zod_1.z
        .string()
        .max(200, 'Name cannot exceed 200 characters')
        .optional()
        .transform(val => val?.trim() || undefined),
    firstName: zod_1.z
        .string()
        .min(1, 'First name is required')
        .max(100, 'First name cannot exceed 100 characters')
        .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
        .optional()
        .transform(val => val?.trim() || undefined),
    lastName: zod_1.z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name cannot exceed 100 characters')
        .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
        .optional()
        .transform(val => val?.trim() || undefined),
    phone: zod_1.z
        .string()
        .optional()
        .transform(val => val?.replace(/[^\d+()-\s]/g, '') || undefined)
        .refine(val => !val || common_js_1.phoneSchema.safeParse(val).success, 'Please enter a valid phone number'),
    emergencyContact: zod_1.z
        .string()
        .max(500, 'Emergency contact info cannot exceed 500 characters')
        .optional()
        .transform(val => val?.trim() || undefined),
    avatarUrl: zod_1.z
        .string()
        .url('Please enter a valid URL')
        .optional()
        .transform(val => val?.trim() || undefined),
    userId: zod_1.z.string().uuid('User ID must be a valid UUID').optional()
});
exports.tenantCreateFormSchema = exports.tenantFormSchema.partial().extend({
    email: zod_1.z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .max(254, 'Email cannot exceed 254 characters'),
    name: zod_1.z
        .string()
        .min(1, 'Name is required')
        .max(200, 'Name cannot exceed 200 characters')
        .optional(),
    firstName: zod_1.z
        .string()
        .max(100, 'First name cannot exceed 100 characters')
        .optional()
        .transform(val => val?.trim() || undefined),
    lastName: zod_1.z
        .string()
        .max(100, 'Last name cannot exceed 100 characters')
        .optional()
        .transform(val => val?.trim() || undefined)
});
exports.tenantUpdateFormSchema = exports.tenantFormSchema.partial();
const validateTenantForm = (data) => {
    const result = exports.tenantFormSchema.safeParse(data);
    const validationResult = {
        success: result.success
    };
    if (result.success) {
        validationResult.data = result.data;
    }
    else {
        validationResult.errors = result.error;
    }
    return validationResult;
};
exports.validateTenantForm = validateTenantForm;
exports.createTenantRequestSchema = zod_1.z.object({
    firstName: common_js_1.nonEmptyStringSchema.max(100).optional(),
    lastName: common_js_1.nonEmptyStringSchema.max(100).optional(),
    email: common_js_1.emailSchema,
    phone: common_js_1.phoneSchema.optional(),
    dateOfBirth: zod_1.z.string().optional(),
    ssn: zod_1.z.string().optional(),
    name: common_js_1.nonEmptyStringSchema.max(200).optional(),
    emergencyContact: exports.emergencyContactSchema,
    avatarUrl: zod_1.z.string().url().optional()
});
exports.updateTenantRequestSchema = zod_1.z.object({
    firstName: common_js_1.nonEmptyStringSchema.max(100).optional(),
    lastName: common_js_1.nonEmptyStringSchema.max(100).optional(),
    email: common_js_1.emailSchema.optional(),
    phone: common_js_1.phoneSchema.optional(),
    dateOfBirth: zod_1.z.string().optional(),
    name: common_js_1.nonEmptyStringSchema.max(200).optional(),
    emergencyContact: exports.emergencyContactSchema
});
const validateTenantCreateForm = (data) => {
    const result = exports.tenantCreateFormSchema.safeParse(data);
    const validationResult = {
        success: result.success
    };
    if (result.success) {
        validationResult.data = result.data;
    }
    else {
        validationResult.errors = result.error;
    }
    return validationResult;
};
exports.validateTenantCreateForm = validateTenantCreateForm;
//# sourceMappingURL=tenants.js.map