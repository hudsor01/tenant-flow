/**
 * Common Types & Utilities
 * Centralized type definitions for common patterns and utilities
 */
export interface PaginationParams {
    page: number;
    limit: number;
    offset?: number;
}
export interface PaginationResponse {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationResponse;
}
export declare const SORT_ORDER: {
    readonly ASC: "asc";
    readonly DESC: "desc";
};
export type SortOrder = typeof SORT_ORDER[keyof typeof SORT_ORDER];
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp?: Date;
}
export interface ApiError {
    success: false;
    error: string;
    code?: string;
    statusCode?: number;
    timestamp: Date;
}
export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
    timestamp: Date;
}
export interface BaseQuery {
    search?: string;
    sortBy?: string;
    sortOrder?: SortOrder;
    page?: number;
    limit?: number;
}
export interface DateRange {
    startDate?: Date | string;
    endDate?: Date | string;
}
export interface AuditFields {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}
export interface FileUpload {
    filename: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export interface UploadedFile {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
}
export interface Metadata {
    [key: string]: string | number | boolean | null | undefined;
}
export declare const DOCUMENT_TYPE: {
    readonly LEASE: "LEASE";
    readonly INVOICE: "INVOICE";
    readonly RECEIPT: "RECEIPT";
    readonly INSPECTION: "INSPECTION";
    readonly PHOTO: "PHOTO";
    readonly INSURANCE: "INSURANCE";
    readonly OTHER: "OTHER";
};
export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];
export interface Document {
    id: string;
    name: string;
    type: DocumentType;
    url: string;
    size: number;
    mimeType: string;
    uploadedBy: string;
    entityId: string;
    entityType: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const NOTIFICATION_TYPE: {
    readonly RENT_DUE: "RENT_DUE";
    readonly LEASE_EXPIRING: "LEASE_EXPIRING";
    readonly MAINTENANCE_REQUEST: "MAINTENANCE_REQUEST";
    readonly MAINTENANCE_COMPLETED: "MAINTENANCE_COMPLETED";
    readonly NEW_TENANT: "NEW_TENANT";
    readonly TENANT_MOVED_OUT: "TENANT_MOVED_OUT";
    readonly PAYMENT_RECEIVED: "PAYMENT_RECEIVED";
    readonly SUBSCRIPTION_EXPIRING: "SUBSCRIPTION_EXPIRING";
    readonly SYSTEM_ALERT: "SYSTEM_ALERT";
};
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    entityId?: string;
    entityType?: string;
    actionUrl?: string;
    createdAt: Date;
    readAt?: Date;
}
export interface WebSocketMessage {
    type: string;
    payload: unknown;
    timestamp: Date;
}
export interface WebSocketState {
    connected: boolean;
    reconnecting: boolean;
    error?: string;
}
export interface UseWebSocketOptions {
    url: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}
export declare const APP_CONFIG: {
    readonly FRONTEND_URL: string;
    readonly API_PORT: string;
    readonly API_PREFIX: "/api";
    readonly ALLOWED_ORIGINS: string[];
    readonly DEV_PORTS: {
        readonly FRONTEND: readonly ["5172", "5173", "5174", "5175"];
        readonly BACKEND: readonly ["3000", "3001", "3002", "3003", "3004"];
    };
    readonly SUPABASE: {
        readonly URL: string;
        readonly SERVICE_KEY: string;
        readonly ANON_KEY: string;
    };
    readonly STRIPE: {
        readonly SECRET_KEY: string;
        readonly WEBHOOK_SECRET: string;
        readonly PORTAL_RETURN_URL: string;
    };
    readonly EMAIL: {
        readonly RESEND_API_KEY: string;
        readonly FROM_ADDRESS: string;
        readonly SUPPORT_EMAIL: string;
    };
    readonly FEATURES: {
        readonly ENABLE_TELEMETRY: boolean;
        readonly ENABLE_DEBUG_LOGGING: boolean;
        readonly ENABLE_MAINTENANCE_MODE: boolean;
    };
    readonly IS_PRODUCTION: boolean;
    readonly IS_DEVELOPMENT: boolean;
    readonly IS_TEST: boolean;
    readonly DATABASE_URL: string;
    readonly JWT_SECRET: string;
    readonly JWT_EXPIRES_IN: string;
    readonly RATE_LIMIT: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: string | 100;
    };
};
export declare function validateConfig(): void;
export declare function getFrontendUrl(path?: string): string;
