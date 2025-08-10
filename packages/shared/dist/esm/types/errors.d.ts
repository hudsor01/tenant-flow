/**
 * Error types for the application
 * Centralized error handling types for consistent error management
 */
export interface BaseError {
    name?: string;
    message: string;
    code?: string;
    statusCode?: number;
    timestamp?: Date;
    stack?: string;
}
export interface AuthError extends BaseError {
    type: 'AUTH_ERROR';
    code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'EMAIL_NOT_VERIFIED' | 'ACCOUNT_LOCKED' | 'INVALID_TOKEN';
}
export interface ValidationError extends BaseError {
    type: 'VALIDATION_ERROR';
    code: 'VALIDATION_FAILED';
    field?: string;
    errors?: string[];
}
export interface NetworkError extends BaseError {
    type: 'NETWORK_ERROR';
    code: 'CONNECTION_FAILED' | 'TIMEOUT' | 'NETWORK_UNREACHABLE' | 'REQUEST_ABORTED';
}
export interface ServerError extends BaseError {
    type: 'SERVER_ERROR';
    code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'DATABASE_ERROR' | 'EXTERNAL_SERVICE_ERROR';
}
export interface BusinessError extends BaseError {
    type: 'BUSINESS_ERROR';
    code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'INSUFFICIENT_PERMISSIONS' | 'OPERATION_NOT_ALLOWED' | 'QUOTA_EXCEEDED' | 'SUBSCRIPTION_REQUIRED';
}
export interface FileUploadError extends BaseError {
    type: 'FILE_UPLOAD_ERROR';
    code: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'UPLOAD_FAILED' | 'STORAGE_QUOTA_EXCEEDED';
}
export interface PaymentError extends BaseError {
    type: 'PAYMENT_ERROR';
    code: 'PAYMENT_FAILED' | 'INSUFFICIENT_FUNDS' | 'CARD_DECLINED' | 'PAYMENT_METHOD_INVALID' | 'STRIPE_ERROR';
}
export type AppError = AuthError | ValidationError | NetworkError | ServerError | BusinessError | FileUploadError | PaymentError;
export interface ErrorResponse {
    success: false;
    error: AppError;
    requestId?: string;
    timestamp: Date;
}
export interface SuccessResponse<T = Record<string, string | number | boolean | null>> {
    success: true;
    data: T;
    message?: string;
    requestId?: string;
    timestamp: Date;
}
export interface StandardApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: AppError;
    message?: string;
    requestId?: string;
    timestamp?: Date;
}
export type ApiResponse<T = Record<string, string | number | boolean | null>> = SuccessResponse<T> | ErrorResponse;
export type { StandardApiResponse as ControllerApiResponse };
export type ErrorHandler = (error: AppError) => void;
export interface ErrorBoundaryProps {
    fallback?: string | null;
    onError?: ErrorHandler;
    children: string | string[];
}
export type FormErrorState = Record<string, string | undefined>;
export type AsyncResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: AppError;
};
export interface ErrorContext {
    userId?: string;
    component?: string;
    action?: string;
    additionalData?: Record<string, string | number | boolean | null>;
}
//# sourceMappingURL=errors.d.ts.map