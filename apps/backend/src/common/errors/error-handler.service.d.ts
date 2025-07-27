import type { AppError, ErrorContext as SharedErrorContext } from '@tenantflow/shared';
export interface ErrorContext extends SharedErrorContext {
    operation?: string;
    resource?: string;
    metadata?: Record<string, string | number | boolean | null | undefined | Record<string, string | number | boolean | null>>;
}
export declare enum ErrorCode {
    BAD_REQUEST = "BAD_REQUEST",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    SUBSCRIPTION_ERROR = "SUBSCRIPTION_ERROR",
    STORAGE_ERROR = "STORAGE_ERROR",
    EMAIL_ERROR = "EMAIL_ERROR",
    STRIPE_ERROR = "STRIPE_ERROR"
}
export declare class ErrorHandlerService {
    private readonly logger;
    handleErrorEnhanced(error: Error | AppError, context?: ErrorContext): never;
    createBusinessError(code: ErrorCode, message: string, context?: ErrorContext): Error;
    createValidationError(message: string, fields?: Record<string, string>, context?: ErrorContext): Error;
    createNotFoundError(resource: string, identifier?: string, context?: ErrorContext): Error;
    createPermissionError(operation: string, resource?: string, context?: ErrorContext): Error;
    createConfigError(message: string, context?: ErrorContext): Error;
    private logErrorEnhanced;
    private logError;
    private transformError;
    private mapToHttpCode;
    private isValidationError;
    private isAuthenticationError;
    private isPermissionError;
    private isNotFoundError;
    private isConflictError;
    createAuthError(code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'EMAIL_NOT_VERIFIED' | 'ACCOUNT_LOCKED' | 'INVALID_TOKEN', message: string, _context?: ErrorContext): AppError;
    createValidationAppError(message: string, field?: string, errors?: string[], _context?: ErrorContext): AppError;
    createBusinessAppError(code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'INSUFFICIENT_PERMISSIONS' | 'OPERATION_NOT_ALLOWED' | 'QUOTA_EXCEEDED' | 'SUBSCRIPTION_REQUIRED', message: string, _context?: ErrorContext): AppError;
    createServerAppError(code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'DATABASE_ERROR' | 'EXTERNAL_SERVICE_ERROR', message: string, _context?: ErrorContext): AppError;
    createPaymentAppError(code: 'PAYMENT_FAILED' | 'INSUFFICIENT_FUNDS' | 'CARD_DECLINED' | 'PAYMENT_METHOD_INVALID' | 'STRIPE_ERROR', message: string, _context?: ErrorContext): AppError;
}
//# sourceMappingURL=error-handler.service.d.ts.map