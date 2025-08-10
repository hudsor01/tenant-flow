"use strict";
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
function createQueryAdapter(query) {
    if (!query)
        return {};
    const filtered = {};
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
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
function createMutationAdapter(data) {
    const adapted = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            if (value instanceof Date) {
                adapted[key] = value.toISOString();
            }
            else if (Array.isArray(value)) {
                adapted[key] = value;
            }
            else if (typeof value === 'object' && value !== null) {
                adapted[key] = value;
            }
            else {
                adapted[key] = value;
            }
        }
    }
    return adapted;
}
function validateApiParams(params, requiredFields) {
    for (const field of requiredFields) {
        if (params[field] === undefined || params[field] === null) {
            throw new Error(`Required field '${String(field)}' is missing`);
        }
    }
}
function createResponseAdapter(apiData, transformer) {
    try {
        return transformer(apiData);
    }
    catch (error) {
        throw new Error(`Failed to transform API response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
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
function safeParseNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}
function safeParseDate(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
}
function mergeApiParams(base, override) {
    return { ...base, ...override };
}
function createApiCall(endpoint, method = 'GET') {
    return {
        endpoint,
        method,
        prepareParams: (params) => createQueryAdapter(params),
        prepareData: (data) => createMutationAdapter(data),
    };
}
function isValidQueryParam(value) {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
function isValidMutationData(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
class TypeAdapterError extends Error {
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
