"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_SEVERITY = exports.ERROR_TYPES = void 0;
exports.createStandardError = createStandardError;
exports.createValidationError = createValidationError;
exports.createNetworkError = createNetworkError;
exports.createBusinessLogicError = createBusinessLogicError;
exports.classifyError = classifyError;
exports.isRetryableError = isRetryableError;
exports.getErrorLogLevel = getErrorLogLevel;
const zod_1 = require("zod");
exports.ERROR_TYPES = {
    VALIDATION: 'VALIDATION',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC',
    NETWORK: 'NETWORK',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    DATABASE: 'DATABASE',
    EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
    UNKNOWN: 'UNKNOWN'
};
exports.ERROR_SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};
function createStandardError(type, message, options = {}) {
    return {
        type,
        severity: options.severity || exports.ERROR_SEVERITY.MEDIUM,
        message,
        code: options.code,
        details: options.details,
        field: options.field,
        context: options.context,
        timestamp: new Date().toISOString(),
        userMessage: options.userMessage || message,
        retryable: false
    };
}
function createValidationError(zodError, context) {
    const firstIssue = zodError.issues[0];
    const field = firstIssue?.path.join('.') || 'unknown';
    const fieldErrors = {};
    zodError.issues.forEach(issue => {
        const fieldPath = issue.path.join('.');
        if (!fieldErrors[fieldPath]) {
            fieldErrors[fieldPath] = [];
        }
        fieldErrors[fieldPath].push(issue.message);
    });
    return {
        type: exports.ERROR_TYPES.VALIDATION,
        severity: exports.ERROR_SEVERITY.LOW,
        message: `Validation failed for field: ${field}`,
        field,
        details: {
            zodError,
            fieldErrors
        },
        context,
        timestamp: new Date().toISOString(),
        userMessage: firstIssue?.message || 'Please check your input and try again',
        retryable: false
    };
}
function createNetworkError(message, status, options = {}) {
    return {
        type: exports.ERROR_TYPES.NETWORK,
        severity: status && status >= 500 ? exports.ERROR_SEVERITY.HIGH : exports.ERROR_SEVERITY.MEDIUM,
        message,
        details: {
            status,
            statusText: options.statusText,
            url: options.url,
            method: options.method
        },
        context: options.context,
        timestamp: new Date().toISOString(),
        userMessage: getNetworkErrorMessage(status, message),
        retryable: !status || status >= 500
    };
}
function createBusinessLogicError(operation, reason, options = {}) {
    return {
        type: exports.ERROR_TYPES.BUSINESS_LOGIC,
        severity: options.severity || exports.ERROR_SEVERITY.MEDIUM,
        message: `Business logic error in ${operation}: ${reason}`,
        code: options.code || 'BUSINESS_LOGIC_ERROR',
        details: {
            operation,
            resource: options.resource,
            reason
        },
        context: options.context,
        timestamp: new Date().toISOString(),
        userMessage: options.userMessage || reason,
        retryable: false
    };
}
function getNetworkErrorMessage(status, originalMessage) {
    if (!status) {
        return 'Network error occurred. Please check your connection.';
    }
    switch (status) {
        case 400:
            return 'Invalid request. Please check your input.';
        case 401:
            return 'Please log in to continue.';
        case 403:
            return 'You don\'t have permission to perform this action.';
        case 404:
            return 'The requested resource was not found.';
        case 409:
            return 'This action conflicts with existing data.';
        case 422:
            return 'Please check your input and try again.';
        case 429:
            return 'Too many requests. Please wait a moment and try again.';
        case 500:
            return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
            return 'Service temporarily unavailable. Please try again later.';
        default:
            return originalMessage || 'An unexpected error occurred.';
    }
}
function classifyError(error) {
    if (error instanceof zod_1.z.ZodError) {
        return createValidationError(error);
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
            return createNetworkError(error.message);
        }
        if (message.includes('not found')) {
            const standardError = createStandardError(exports.ERROR_TYPES.NOT_FOUND, error.message, {
                severity: exports.ERROR_SEVERITY.LOW,
                userMessage: 'The requested item was not found.'
            });
            standardError.retryable = false;
            return standardError;
        }
        if (message.includes('unauthorized') || message.includes('authentication')) {
            const standardError = createStandardError(exports.ERROR_TYPES.UNAUTHORIZED, error.message, {
                severity: exports.ERROR_SEVERITY.MEDIUM,
                userMessage: 'Please log in to continue.'
            });
            standardError.retryable = false;
            return standardError;
        }
        if (message.includes('permission') || message.includes('forbidden')) {
            const standardError = createStandardError(exports.ERROR_TYPES.PERMISSION_DENIED, error.message, {
                severity: exports.ERROR_SEVERITY.MEDIUM,
                userMessage: 'You don\'t have permission to perform this action.'
            });
            standardError.retryable = false;
            return standardError;
        }
        const standardError = createStandardError(exports.ERROR_TYPES.UNKNOWN, error.message, {
            severity: exports.ERROR_SEVERITY.MEDIUM
        });
        standardError.retryable = true;
        return standardError;
    }
    if (typeof error === 'string') {
        const standardError = createStandardError(exports.ERROR_TYPES.UNKNOWN, error, {
            severity: exports.ERROR_SEVERITY.MEDIUM
        });
        standardError.retryable = true;
        return standardError;
    }
    const standardError = createStandardError(exports.ERROR_TYPES.UNKNOWN, 'An unexpected error occurred', {
        severity: exports.ERROR_SEVERITY.MEDIUM,
        details: { originalError: error }
    });
    standardError.retryable = true;
    return standardError;
}
function isRetryableError(error) {
    switch (error.type) {
        case exports.ERROR_TYPES.NETWORK:
            const networkError = error;
            const status = networkError.details.status;
            return !status || status >= 500;
        case exports.ERROR_TYPES.RATE_LIMIT:
            return true;
        case exports.ERROR_TYPES.DATABASE:
            return true;
        case exports.ERROR_TYPES.EXTERNAL_SERVICE:
            return true;
        default:
            return false;
    }
}
function getErrorLogLevel(error) {
    switch (error.severity) {
        case exports.ERROR_SEVERITY.LOW:
            return 'info';
        case exports.ERROR_SEVERITY.MEDIUM:
            return 'warn';
        case exports.ERROR_SEVERITY.HIGH:
        case exports.ERROR_SEVERITY.CRITICAL:
            return 'error';
        default:
            return 'warn';
    }
}
