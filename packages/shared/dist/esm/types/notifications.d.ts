import type { WebSocketMessage } from './websocket';
export declare enum NotificationType {
    MAINTENANCE = "MAINTENANCE",
    LEASE = "LEASE",
    PAYMENT = "PAYMENT",
    GENERAL = "GENERAL",
    SYSTEM = "SYSTEM"
}
export interface NotificationData {
    id: string;
    type: string;
    title: string;
    message: string;
    userId: string;
    read: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    metadata?: Record<string, string | number | boolean | null>;
}
export type Notification = NotificationData;
export interface NotificationWebSocketMessage {
    type: string;
    data: Record<string, string | number | boolean | null>;
    timestamp?: Date | string;
    id?: string;
}
export interface WebSocketState {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
    error: string | null;
    reconnectCount: number;
}
export interface UseWebSocketOptions {
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelay?: number;
}
export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
    categories: {
        maintenance: boolean;
        leases: boolean;
        general: boolean;
    };
}
export declare enum NotificationPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare const NOTIFICATION_PRIORITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly URGENT: "URGENT";
};
export declare const NOTIFICATION_PRIORITY_OPTIONS: readonly [{
    readonly value: "LOW";
    readonly label: "Low";
}, {
    readonly value: "MEDIUM";
    readonly label: "Medium";
}, {
    readonly value: "HIGH";
    readonly label: "High";
}, {
    readonly value: "URGENT";
    readonly label: "Urgent";
}];
export interface PushNotification {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, string | number | boolean | null>;
}
//# sourceMappingURL=notifications.d.ts.map