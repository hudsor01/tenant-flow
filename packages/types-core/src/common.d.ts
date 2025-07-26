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
//# sourceMappingURL=common.d.ts.map