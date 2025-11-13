"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyImageUploadSchema = exports.updatePropertyRequestSchema = exports.createPropertyRequestSchema = exports.propertyMarkedSoldSchema = exports.transformPropertyUpdateData = exports.propertyUpdateFormSchema = exports.transformPropertyFormData = exports.propertyFormSchema = exports.propertyStatsSchema = exports.propertyQuerySchema = exports.propertyUpdateSchema = exports.propertySchema = exports.propertyInputSchema = exports.propertyStatusSchema = exports.propertyTypeSchema = void 0;
const zod_1 = require("zod");
const supabase_generated_js_1 = require("../types/supabase-generated.js");
const common_js_1 = require("./common.js");
const image_url_schemas_js_1 = require("./image-url.schemas.js");
const billing_1 = require("@repo/shared/constants/billing");
exports.propertyTypeSchema = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.PropertyType);
exports.propertyStatusSchema = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.PropertyStatus);
exports.propertyInputSchema = zod_1.z.object({
    name: common_js_1.nonEmptyStringSchema
        .min(3, 'Property name must be at least 3 characters')
        .max(billing_1.VALIDATION_LIMITS.PROPERTY_NAME_MAX_LENGTH, `Property name cannot exceed ${billing_1.VALIDATION_LIMITS.PROPERTY_NAME_MAX_LENGTH} characters`),
    description: zod_1.z
        .string()
        .max(billing_1.VALIDATION_LIMITS.PROPERTY_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${billing_1.VALIDATION_LIMITS.PROPERTY_DESCRIPTION_MAX_LENGTH} characters`)
        .optional()
        .or(zod_1.z.literal('')),
    propertyType: exports.propertyTypeSchema,
    address: common_js_1.nonEmptyStringSchema
        .min(5, 'Address must be at least 5 characters')
        .max(200, 'Address cannot exceed 200 characters'),
    city: common_js_1.nonEmptyStringSchema
        .min(2, 'City must be at least 2 characters')
        .max(50, 'City cannot exceed 50 characters'),
    state: zod_1.z
        .string()
        .min(2, 'State is required')
        .max(2, 'State must be 2 characters')
        .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),
    zipCode: zod_1.z
        .string()
        .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)'),
    bedrooms: common_js_1.positiveNumberSchema
        .int('Bedrooms must be a whole number')
        .max(billing_1.VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BEDROOMS, `Maximum ${billing_1.VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BEDROOMS} bedrooms allowed`)
        .optional(),
    bathrooms: common_js_1.positiveNumberSchema
        .max(billing_1.VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BATHROOMS, `Maximum ${billing_1.VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BATHROOMS} bathrooms allowed`)
        .optional(),
    squareFootage: common_js_1.positiveNumberSchema
        .int('Square footage must be a whole number')
        .max(billing_1.VALIDATION_LIMITS.SQUARE_FOOTAGE_MAXIMUM, 'Square footage seems unrealistic')
        .optional(),
    rent: common_js_1.nonNegativeNumberSchema
        .max(billing_1.VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Rent amount seems unrealistic')
        .optional(),
    deposit: common_js_1.nonNegativeNumberSchema
        .max(billing_1.VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Deposit amount seems unrealistic')
        .optional(),
    images: zod_1.z.array(common_js_1.urlSchema).optional(),
    amenities: zod_1.z.array(zod_1.z.string()).optional()
});
exports.propertySchema = exports.propertyInputSchema.extend({
    id: common_js_1.uuidSchema,
    ownerId: common_js_1.uuidSchema,
    status: exports.propertyStatusSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.propertyUpdateSchema = exports.propertyInputSchema.partial().extend({
    status: exports.propertyStatusSchema.optional()
});
exports.propertyQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    propertyType: exports.propertyTypeSchema.optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    minRent: common_js_1.nonNegativeNumberSchema.optional(),
    maxRent: common_js_1.nonNegativeNumberSchema.optional(),
    bedrooms: common_js_1.positiveNumberSchema.int().optional(),
    bathrooms: common_js_1.positiveNumberSchema.optional(),
    status: exports.propertyStatusSchema.optional(),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'rent', 'city']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    page: zod_1.z.coerce.number().int().positive().default(billing_1.VALIDATION_LIMITS.API_QUERY_DEFAULT_PAGE),
    limit: zod_1.z.coerce.number().int().positive().max(billing_1.VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(billing_1.VALIDATION_LIMITS.API_QUERY_DEFAULT_LIMIT)
});
exports.propertyStatsSchema = zod_1.z.object({
    total: common_js_1.nonNegativeNumberSchema,
    active: common_js_1.nonNegativeNumberSchema,
    inactive: common_js_1.nonNegativeNumberSchema,
    maintenance: common_js_1.nonNegativeNumberSchema,
    totalRent: common_js_1.nonNegativeNumberSchema,
    averageRent: common_js_1.nonNegativeNumberSchema
});
exports.propertyFormSchema = zod_1.z.object({
    name: common_js_1.requiredString,
    description: zod_1.z.string().optional(),
    propertyType: zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.PropertyType),
    address: common_js_1.requiredString,
    city: common_js_1.requiredString,
    state: common_js_1.requiredString,
    zipCode: common_js_1.requiredString,
    bedrooms: zod_1.z.string().optional(),
    bathrooms: zod_1.z.string().optional(),
    squareFootage: zod_1.z.string().optional(),
    rent: zod_1.z.string().optional(),
    deposit: zod_1.z.string().optional(),
    imageUrl: image_url_schemas_js_1.imageUrlSchema,
    propertyId: zod_1.z.string().optional(),
    hasGarage: zod_1.z.boolean().optional(),
    hasPool: zod_1.z.boolean().optional(),
    numberOfUnits: zod_1.z.string().optional(),
    createUnitsNow: zod_1.z.boolean().optional()
});
const transformPropertyFormData = (data) => {
    const result = {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        propertyType: data.propertyType
    };
    if (data.description) {
        result.description = data.description;
    }
    if (data.imageUrl) {
        result.imageUrl = data.imageUrl;
    }
    return result;
};
exports.transformPropertyFormData = transformPropertyFormData;
exports.propertyUpdateFormSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
    propertyType: zod_1.z
        .enum(supabase_generated_js_1.Constants.public.Enums.PropertyType)
        .optional(),
    status: zod_1.z
        .enum(supabase_generated_js_1.Constants.public.Enums.PropertyStatus)
        .optional()
});
const transformPropertyUpdateData = (data) => {
    const result = {};
    if (data.name !== undefined)
        result.name = data.name;
    if (data.address !== undefined)
        result.address = data.address;
    if (data.city !== undefined)
        result.city = data.city;
    if (data.state !== undefined)
        result.state = data.state;
    if (data.zipCode !== undefined)
        result.zipCode = data.zipCode;
    if (data.propertyType !== undefined) {
        result.propertyType =
            data.propertyType;
    }
    if (data.status !== undefined) {
        result.status = data.status;
    }
    return result;
};
exports.transformPropertyUpdateData = transformPropertyUpdateData;
exports.propertyMarkedSoldSchema = zod_1.z.object({
    dateSold: zod_1.z.string().refine(val => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
    }, 'Sale date must be valid and cannot be in the future'),
    salePrice: common_js_1.positiveNumberSchema
        .max(billing_1.VALIDATION_LIMITS.SALE_PRICE_MAXIMUM, 'Sale price seems unrealistic')
        .refine(val => val > 0, 'Sale price must be greater than $0'),
    saleNotes: zod_1.z
        .string()
        .max(billing_1.VALIDATION_LIMITS.PROPERTY_DESCRIPTION_MAX_LENGTH, `Sale notes cannot exceed ${billing_1.VALIDATION_LIMITS.PROPERTY_DESCRIPTION_MAX_LENGTH} characters`)
        .optional()
        .or(zod_1.z.literal(''))
});
exports.createPropertyRequestSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Property name is required'),
    address: zod_1.z.string().trim().min(1, 'Address is required'),
    city: zod_1.z.string().trim().min(1, 'City is required'),
    state: zod_1.z
        .string()
        .trim()
        .length(2, 'State must be exactly 2 characters')
        .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),
    zipCode: zod_1.z
        .string()
        .trim()
        .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)'),
    unitCount: zod_1.z.number().int().positive().optional(),
    description: zod_1.z.string().optional(),
    propertyType: zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.PropertyType),
    amenities: zod_1.z.array(zod_1.z.string()).optional(),
    imageUrl: image_url_schemas_js_1.imageUrlSchema
        .transform(val => (val === '' || val === null ? undefined : val))
        .optional()
});
exports.updatePropertyRequestSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Property name is required').optional(),
    address: zod_1.z.string().trim().min(1, 'Address is required').optional(),
    city: zod_1.z.string().trim().min(1, 'City is required').optional(),
    state: zod_1.z
        .string()
        .trim()
        .length(2, 'State must be exactly 2 characters')
        .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters')
        .optional(),
    zipCode: zod_1.z
        .string()
        .trim()
        .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)')
        .optional(),
    unitCount: zod_1.z.number().int().positive().optional(),
    description: zod_1.z.string().optional(),
    propertyType: exports.propertyTypeSchema.optional(),
    amenities: zod_1.z.array(zod_1.z.string()).optional(),
    imageUrl: image_url_schemas_js_1.imageUrlSchema
        .transform(val => (val === '' || val === null ? undefined : val))
        .optional(),
    version: zod_1.z.number().optional()
});
exports.propertyImageUploadSchema = zod_1.z.object({
    isPrimary: zod_1.z
        .union([
        zod_1.z.boolean(),
        zod_1.z
            .string()
            .toLowerCase()
            .transform(val => val.trim())
            .refine(val => ['true', 'false', '1', '0', 'yes', 'no'].includes(val), {
            message: 'isPrimary must be one of: true, false, 1, 0, yes, no (case-insensitive)'
        })
            .transform(val => ['true', '1', 'yes'].includes(val))
    ])
        .default(false),
    caption: zod_1.z
        .string()
        .trim()
        .max(255, 'Caption cannot exceed 255 characters')
        .optional()
        .transform(val => (val && val.length > 0 ? val : undefined))
});
//# sourceMappingURL=properties.js.map