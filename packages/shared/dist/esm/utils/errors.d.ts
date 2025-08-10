/**
 * Shared error handling utilities
 * Common error classification and handling patterns for both frontend and backend
 */
import { z } from 'zod';
export declare const ERROR_TYPES: {
    readonly VALIDATION: "VALIDATION";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly BUSINESS_LOGIC: "BUSINESS_LOGIC";
    readonly NETWORK: "NETWORK";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly SERVER_ERROR: "SERVER_ERROR";
    readonly AUTH_ERROR: "AUTH_ERROR";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly RATE_LIMIT: "RATE_LIMIT";
    readonly DATABASE: "DATABASE";
    readonly EXTERNAL_SERVICE: "EXTERNAL_SERVICE";
    readonly UNKNOWN: "UNKNOWN";
};
export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];
export declare const ERROR_SEVERITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly CRITICAL: "CRITICAL";
};
export type ErrorSeverity = typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];
export interface StandardError {
    retryable: boolean;
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
    field?: string;
    context?: Record<string, unknown>;
    timestamp: string;
    userMessage?: string;
}
export interface ValidationError extends StandardError {
    type: typeof ERROR_TYPES.VALIDATION;
    field: string;
    details: {
        zodError?: z.ZodError;
        fieldErrors?: Record<string, string[]>;
    };
}
export interface NetworkError extends StandardError {
    type: typeof ERROR_TYPES.NETWORK;
    details: {
        status?: number;
        statusText?: string;
        url?: string;
        method?: string;
    };
}
export interface BusinessLogicError extends StandardError {
    type: typeof ERROR_TYPES.BUSINESS_LOGIC;
    code: string;
    details: {
        operation: string;
        resource?: string;
        reason: string;
    };
}
/**
 * Create a standardized error object
 */
export declare function createStandardError(type: ErrorType, message: string, options?: {
    severity?: ErrorSeverity;
    code?: string;
    details?: Record<string, unknown>;
    field?: string;
    context?: Record<string, unknown>;
    userMessage?: string;
}): StandardError;
/**
 * Create a validation error from Zod error
 */
export declare function createValidationError(zodError: z.ZodError, context?: Record<string, unknown>): ValidationError;
/**
 * Create a network error
 */
export declare function createNetworkError(message: string, status?: number, options?: {
    statusText?: string;
    url?: string;
    method?: string;
    context?: Record<string, unknown>;
}): NetworkError;
/**
 * Create a business logic error
 */
export declare function createBusinessLogicError(operation: string, reason: string, options?: {
    code?: string;
    resource?: string;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    userMessage?: string;
}): BusinessLogicError;
/**
 * Classify an unknown error into a standard error type
 */
export declare function classifyError(error: unknown): StandardError;
/**
 * Check if an error is retryable based on its type and details
 */
export declare function isRetryableError(error: StandardError): boolean;
/**
 * Get error severity for logging purposes
 */
export declare function getErrorLogLevel(error: StandardError): 'debug' | 'info' | 'warn' | 'error';
//# sourceMappingURL=errors.d.ts.map