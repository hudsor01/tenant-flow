"use strict";
/**
 * Type Adapter Utilities
 * Provides type-safe bridges between domain types and API layer requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeAdapterError = void 0;
exports.createQueryAdapter = createQueryAdapter;
exports.createMutationAdapter = createMutationAdapter;
exports.validateApiParams = validateApiParams;
exports.createResponseAdapter = createResponseAdapter;
exports.validateEnumValue = validateEnumValue;
exports.safeParseNumber = safeParseNumber;
exports.safeParseDate = safeParseDate;
exports.mergeApiParams = mergeApiParams;
exports.createApiCall = createApiCall;
exports.isValidQueryParam = isValidQueryParam;
exports.isValidMutationData = isValidMutationData;
exports.handleAdapterError = handleAdapterError;
/**
 * Creates a type-safe query parameter adapter
 * Ensures domain query types are properly converted to API-compatible formats
 */
function createQueryAdapter(query) {
    if (!query)
        return {};
    // Filter out undefined values and ensure proper serialization
    const filtered = {};
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
            // Handle nested objects by serializing them
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                filtered[key] = JSON.stringify(value);
            }
            else if (value instanceof Date) {
                filtered[key] = value.toISOString();
            }
            else {
                filtered[key] = value;
            }
        }
    }
    return filtered;
}
/**
 * Creates a type-safe mutation data adapter
 * Ensures domain input types are properly converted to API-compatible formats
 */
function createMutationAdapter(data) {
    // Ensure all required fields are present and properly typed
    const adapted = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            // Handle Date objects
            if (value instanceof Date) {
                adapted[key] = value.toISOString();
            }
            // Handle arrays
            else if (Array.isArray(value)) {
                adapted[key] = value;
            }
            // Handle nested objects  
            else if (typeof value === 'object' && value !== null) {
                adapted[key] = value;
            }
            // Handle primitive types
            else {
                adapted[key] = value;
            }
        }
    }
    return adapted;
}
/**
 * Type-safe parameter validator that ensures required fields are present
 */
function validateApiParams(params, requiredFields) {
    for (const field of requiredFields) {
        if (params[field] === undefined || params[field] === null) {
            throw new Error(`Required field '${String(field)}' is missing`);
        }
    }
}
/**
 * Creates a type-safe response adapter
 * Converts API responses back to domain types with proper type checking
 */
function createResponseAdapter(apiData, transformer) {
    try {
        return transformer(apiData);
    }
    catch (error) {
        throw new Error(`Failed to transform API response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Enum validation helper
 * Ensures enum values are valid and provides type safety
 */
function validateEnumValue(value, enumObject, fallback) {
    const enumValues = Object.values(enumObject);
    if (enumValues.includes(value)) {
        return value;
    }
    if (fallback !== undefined) {
        return fallback;
    }
    throw new Error(`Invalid enum value '${value}'. Valid values are: ${enumValues.join(', ')}`);
}
/**
 * Utility to safely convert strings to numbers for query parameters
 */
function safeParseNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}
/**
 * Utility to safely convert strings to dates for API parameters
 */
function safeParseDate(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
}
/**
 * Type-safe deep merge utility for combining API parameters
 */
function mergeApiParams(base, override) {
    return { ...base, ...override };
}
/**
 * Creates a typed API call wrapper that ensures proper parameter conversion
 */
function createApiCall(endpoint, method = 'GET') {
    return {
        endpoint,
        method,
        prepareParams: (params) => createQueryAdapter(params),
        prepareData: (data) => createMutationAdapter(data),
    };
}
// Type guards for common API parameter validation
function isValidQueryParam(value) {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
function isValidMutationData(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Error handling utilities for type adapter operations
 */
class TypeAdapterError extends Error {
    operation;
    originalData;
    constructor(message, operation, originalData) {
        super(message);
        this.operation = operation;
        this.originalData = originalData;
        this.name = 'TypeAdapterError';
    }
}
exports.TypeAdapterError = TypeAdapterError;
function handleAdapterError(error, operation, data) {
    if (error instanceof Error) {
        throw new TypeAdapterError(error.message, operation, data);
    }
    throw new TypeAdapterError('Unknown adapter error', operation, data);
}
//# sourceMappingURL=type-adapters.js.map