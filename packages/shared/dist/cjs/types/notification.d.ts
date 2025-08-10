/**
 * Shared notification types between frontend and backend
 * Used for API communication and state management
 */
export declare enum NotificationType {
    RENT_DUE_REMINDER = "RENT_DUE_REMINDER",
    RENT_OVERDUE = "RENT_OVERDUE",
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    LEASE_EXPIRING = "LEASE_EXPIRING",
    LEASE_EXPIRED = "LEASE_EXPIRED",
    LEASE_SIGNED = "LEASE_SIGNED",
    MAINTENANCE_REQUEST_SUBMITTED = "MAINTENANCE_REQUEST_SUBMITTED",
    MAINTENANCE_REQUEST_ASSIGNED = "MAINTENANCE_REQUEST_ASSIGNED",
    MAINTENANCE_REQUEST_COMPLETED = "MAINTENANCE_REQUEST_COMPLETED",
    MAINTENANCE_REQUEST_OVERDUE = "MAINTENANCE_REQUEST_OVERDUE",
    WELCOME_EMAIL = "WELCOME_EMAIL",
    TRIAL_ENDING_WARNING = "TRIAL_ENDING_WARNING",
    SUBSCRIPTION_ACTIVATED = "SUBSCRIPTION_ACTIVATED",
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED",
    PAYMENT_METHOD_REQUIRED = "PAYMENT_METHOD_REQUIRED",
    UPCOMING_INVOICE = "UPCOMING_INVOICE"
}
export declare enum NotificationChannel {
    EMAIL = "email",
    IN_APP = "in_app",
    SMS = "sms",
    PUSH = "push"
}
export declare enum NotificationPriority {
    LOW = "low",
    NORMAL = "normal",
    HIGH = "high",
    URGENT = "urgent"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SENT = "sent",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
/**
 * In-app notification for the notification center
 */
export interface InAppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    priority: NotificationPriority;
    isRead: boolean;
    readAt?: Date;
    metadata: Record<string, unknown>;
    organizationId?: string;
    propertyId?: string;
    tenantId?: string;
    leaseId?: string;
    maintenanceRequestId?: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Notification preferences for user settings
 */
export interface NotificationPreferences {
    userId: string;
    emailEnabled: boolean;
    rentRemindersEmail: boolean;
    paymentAlertsEmail: boolean;
    maintenanceUpdatesEmail: boolean;
    leaseNotificationsEmail: boolean;
    systemNotificationsEmail: boolean;
    inAppEnabled: boolean;
    rentRemindersInApp: boolean;
    paymentAlertsInApp: boolean;
    maintenanceUpdatesInApp: boolean;
    leaseNotificationsInApp: boolean;
    systemNotificationsInApp: boolean;
    smsEnabled: boolean;
    urgentOnlySms: boolean;
    pushEnabled: boolean;
    rentReminderDays: number[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Notification history entry
 */
export interface NotificationHistoryItem {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    priority: NotificationPriority;
    recipientEmail: string;
    status: NotificationStatus;
    sentAt?: Date;
    failureReason?: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
/**
 * API response for in-app notifications
 */
export interface InAppNotificationsResponse {
    notifications: InAppNotification[];
    unreadCount: number;
}
/**
 * Statistics for rent reminders
 */
export interface RentReminderStats {
    totalLeases: number;
    dueToday: number;
    dueTomorrow: number;
    dueThisWeek: number;
    overdue: number;
    overdueAmount: number;
}
/**
 * System notification statistics
 */
export interface NotificationSystemStats {
    queue: Record<string, {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    processing: {
        total: number;
        successful: number;
        failed: number;
        byType: Record<string, {
            total: number;
            successful: number;
            failed: number;
        }>;
        byChannel: Record<string, {
            total: number;
            successful: number;
            failed: number;
        }>;
    };
    rentReminders: RentReminderStats;
}
/**
 * API request/response types
 */
export interface UpdateNotificationPreferencesRequest {
    emailEnabled?: boolean;
    rentRemindersEmail?: boolean;
    paymentAlertsEmail?: boolean;
    maintenanceUpdatesEmail?: boolean;
    leaseNotificationsEmail?: boolean;
    systemNotificationsEmail?: boolean;
    inAppEnabled?: boolean;
    rentRemindersInApp?: boolean;
    paymentAlertsInApp?: boolean;
    maintenanceUpdatesInApp?: boolean;
    leaseNotificationsInApp?: boolean;
    systemNotificationsInApp?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    rentReminderDays?: number[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
}
export interface MarkNotificationsReadRequest {
    notificationIds: string[];
}
export interface SendNotificationRequest {
    type: NotificationType;
    channel: NotificationChannel;
    priority: NotificationPriority;
    recipients: {
        userId: string;
        email: string;
        name?: string;
    }[];
    content: string;
    templateData?: Record<string, unknown>;
    scheduledFor?: Date;
    organizationId?: string;
    propertyId?: string;
    tenantId?: string;
    leaseId?: string;
    maintenanceRequestId?: string;
}
export interface TriggerRentReminderRequest {
    propertyId?: string;
    tenantId?: string;
}
export interface NotificationApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
/**
 * Frontend notification center state
 */
export interface NotificationCenterState {
    notifications: InAppNotification[];
    unreadCount: number;
    isLoading: boolean;
    isOpen: boolean;
    preferences: NotificationPreferences | null;
    error?: string;
}
/**
 * Notification display helpers for UI
 */
export declare const NotificationTypeLabels: Record<NotificationType, string>;
export declare const NotificationPriorityColors: Record<NotificationPriority, string>;
export declare const NotificationTypeIcons: Record<NotificationType, string>;
//# sourceMappingURL=notification.d.ts.map