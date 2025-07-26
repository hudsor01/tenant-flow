/**
 * Error Handling Types
 * Centralized type definitions for error handling and logging
 */
export interface AppError extends Error {
    name: string;
    code: string;
    statusCode: number;
    context?: Record<string, unknown>;
    type?: string;
    timestamp?: Date;
    field?: string;
    errors?: unknown;
}
export interface ErrorContext {
    operation?: string;
    userId?: string;
    resource?: string;
    metadata?: Record<string, string | number | boolean | null | undefined | Record<string, string | number | boolean | null>>;
    [key: string]: unknown;
}
export interface AuthError extends AppError {
    type: 'AUTH_ERROR';
}
export interface ValidationError extends AppError {
    type: 'VALIDATION_ERROR';
    field?: string;
    errors?: string[];
}
export interface BusinessError extends AppError {
    type: 'BUSINESS_ERROR';
}
export interface ServerError extends AppError {
    type: 'SERVER_ERROR';
}
export interface PaymentError extends AppError {
    type: 'PAYMENT_ERROR';
}
export interface NetworkError extends AppError {
    type: 'NETWORK_ERROR';
}
export interface FileUploadError extends AppError {
    type: 'FILE_UPLOAD_ERROR';
    maxSize?: number;
    allowedTypes?: string[];
}
export interface BaseError {
    message: string;
    code?: string;
    statusCode?: number;
}
export declare const ERROR_CODES: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly INVALID_FORMAT: "INVALID_FORMAT";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED";
    readonly QUOTA_EXCEEDED: "QUOTA_EXCEEDED";
    readonly SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
    readonly STRIPE_ERROR: "STRIPE_ERROR";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS";
    readonly CARD_DECLINED: "CARD_DECLINED";
    readonly PAYMENT_METHOD_INVALID: "PAYMENT_METHOD_INVALID";
};
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
