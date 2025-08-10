/**
 * Shared error handling utilities
 * Common error classification and handling patterns for both frontend and backend
 */
import { z } from 'zod';
// Error classification constants
export const ERROR_TYPES = {
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
// Error severity levels
export const ERROR_SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};
/**
 * Create a standardized error object
 */
export function createStandardError(type, message, options = {}) {
    return {
        type,
        severity: options.severity || ERROR_SEVERITY.MEDIUM,
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
/**
 * Create a validation error from Zod error
 */
export function createValidationError(zodError, context) {
    const firstIssue = zodError.issues[0];
    const field = firstIssue?.path.join('.') || 'unknown';
    const fieldErrors = {};
    zodError.issues.forEach(issue => {
        const fieldPath = issue.path.join('.');
        fieldErrors[fieldPath] ??= [];
        fieldErrors[fieldPath].push(issue.message);
    });
    return {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.LOW,
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
/**
 * Create a network error
 */
export function createNetworkError(message, status, options = {}) {
    return {
        type: ERROR_TYPES.NETWORK,
        severity: status && status >= 500 ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM,
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
/**
 * Create a business logic error
 */
export function createBusinessLogicError(operation, reason, options = {}) {
    return {
        type: ERROR_TYPES.BUSINESS_LOGIC,
        severity: options.severity || ERROR_SEVERITY.MEDIUM,
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
/**
 * Get user-friendly network error message
 */
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
/**
 * Classify an unknown error into a standard error type
 */
export function classifyError(error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
        return createValidationError(error);
    }
    // Handle standard Error objects
    if (error instanceof Error) {
        // Check for specific error types based on message patterns
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
            return createNetworkError(error.message);
        }
        if (message.includes('not found')) {
            const standardError = createStandardError(ERROR_TYPES.NOT_FOUND, error.message, {
                severity: ERROR_SEVERITY.LOW,
                userMessage: 'The requested item was not found.'
            });
            standardError.retryable = false;
            return standardError;
        }
        if (message.includes('unauthorized') || message.includes('authentication')) {
            const standardError = createStandardError(ERROR_TYPES.UNAUTHORIZED, error.message, {
                severity: ERROR_SEVERITY.MEDIUM,
                userMessage: 'Please log in to continue.'
            });
            standardError.retryable = false;
            return standardError;
        }
        if (message.includes('permission') || message.includes('forbidden')) {
            const standardError = createStandardError(ERROR_TYPES.PERMISSION_DENIED, error.message, {
                severity: ERROR_SEVERITY.MEDIUM,
                userMessage: 'You don\'t have permission to perform this action.'
            });
            standardError.retryable = false;
            return standardError;
        }
        const standardError = createStandardError(ERROR_TYPES.UNKNOWN, error.message, {
            severity: ERROR_SEVERITY.MEDIUM
        });
        standardError.retryable = true;
        return standardError;
    }
    // Handle string errors
    if (typeof error === 'string') {
        const standardError = createStandardError(ERROR_TYPES.UNKNOWN, error, {
            severity: ERROR_SEVERITY.MEDIUM
        });
        standardError.retryable = true;
        return standardError;
    }
    // Handle unknown error types
    const standardError = createStandardError(ERROR_TYPES.UNKNOWN, 'An unexpected error occurred', {
        severity: ERROR_SEVERITY.MEDIUM,
        details: { originalError: error }
    });
    standardError.retryable = true;
    return standardError;
}
/**
 * Check if an error is retryable based on its type and details
 */
export function isRetryableError(error) {
    switch (error.type) {
        case ERROR_TYPES.NETWORK: {
            const networkError = error;
            const status = networkError.details.status;
            // Retry on 5xx errors and network failures
            return !status || status >= 500;
        }
        case ERROR_TYPES.RATE_LIMIT:
            return true;
        case ERROR_TYPES.DATABASE:
            return true;
        case ERROR_TYPES.EXTERNAL_SERVICE:
            return true;
        default:
            return false;
    }
}
/**
 * Get error severity for logging purposes
 */
export function getErrorLogLevel(error) {
    switch (error.severity) {
        case ERROR_SEVERITY.LOW:
            return 'info';
        case ERROR_SEVERITY.MEDIUM:
            return 'warn';
        case ERROR_SEVERITY.HIGH:
        case ERROR_SEVERITY.CRITICAL:
            return 'error';
        default:
            return 'warn';
    }
}
//# sourceMappingURL=errors.js.map