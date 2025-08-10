"use strict";
/**
 * Shared notification types between frontend and backend
 * Used for API communication and state management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationTypeIcons = exports.NotificationPriorityColors = exports.NotificationTypeLabels = exports.NotificationStatus = exports.NotificationPriority = exports.NotificationChannel = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    // Rent & Payment Related
    NotificationType["RENT_DUE_REMINDER"] = "RENT_DUE_REMINDER";
    NotificationType["RENT_OVERDUE"] = "RENT_OVERDUE";
    NotificationType["PAYMENT_RECEIVED"] = "PAYMENT_RECEIVED";
    NotificationType["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    // Lease Related
    NotificationType["LEASE_EXPIRING"] = "LEASE_EXPIRING";
    NotificationType["LEASE_EXPIRED"] = "LEASE_EXPIRED";
    NotificationType["LEASE_SIGNED"] = "LEASE_SIGNED";
    // Maintenance Related
    NotificationType["MAINTENANCE_REQUEST_SUBMITTED"] = "MAINTENANCE_REQUEST_SUBMITTED";
    NotificationType["MAINTENANCE_REQUEST_ASSIGNED"] = "MAINTENANCE_REQUEST_ASSIGNED";
    NotificationType["MAINTENANCE_REQUEST_COMPLETED"] = "MAINTENANCE_REQUEST_COMPLETED";
    NotificationType["MAINTENANCE_REQUEST_OVERDUE"] = "MAINTENANCE_REQUEST_OVERDUE";
    // System & Account Related
    NotificationType["WELCOME_EMAIL"] = "WELCOME_EMAIL";
    NotificationType["TRIAL_ENDING_WARNING"] = "TRIAL_ENDING_WARNING";
    NotificationType["SUBSCRIPTION_ACTIVATED"] = "SUBSCRIPTION_ACTIVATED";
    NotificationType["SUBSCRIPTION_CANCELLED"] = "SUBSCRIPTION_CANCELLED";
    NotificationType["PAYMENT_METHOD_REQUIRED"] = "PAYMENT_METHOD_REQUIRED";
    NotificationType["UPCOMING_INVOICE"] = "UPCOMING_INVOICE";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["IN_APP"] = "in_app";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["PUSH"] = "push";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["NORMAL"] = "normal";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["PROCESSING"] = "processing";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["CANCELLED"] = "cancelled";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
/**
 * Notification display helpers for UI
 */
exports.NotificationTypeLabels = {
    [NotificationType.RENT_DUE_REMINDER]: 'Rent Due Reminder',
    [NotificationType.RENT_OVERDUE]: 'Rent Overdue Notice',
    [NotificationType.PAYMENT_RECEIVED]: 'Payment Confirmation',
    [NotificationType.PAYMENT_FAILED]: 'Payment Failed',
    [NotificationType.LEASE_EXPIRING]: 'Lease Expiring',
    [NotificationType.LEASE_EXPIRED]: 'Lease Expired',
    [NotificationType.LEASE_SIGNED]: 'Lease Signed',
    [NotificationType.MAINTENANCE_REQUEST_SUBMITTED]: 'Maintenance Request',
    [NotificationType.MAINTENANCE_REQUEST_ASSIGNED]: 'Maintenance Assigned',
    [NotificationType.MAINTENANCE_REQUEST_COMPLETED]: 'Maintenance Complete',
    [NotificationType.MAINTENANCE_REQUEST_OVERDUE]: 'Maintenance Overdue',
    [NotificationType.WELCOME_EMAIL]: 'Welcome Message',
    [NotificationType.TRIAL_ENDING_WARNING]: 'Trial Ending',
    [NotificationType.SUBSCRIPTION_ACTIVATED]: 'Subscription Active',
    [NotificationType.SUBSCRIPTION_CANCELLED]: 'Subscription Cancelled',
    [NotificationType.PAYMENT_METHOD_REQUIRED]: 'Payment Method Required',
    [NotificationType.UPCOMING_INVOICE]: 'Upcoming Invoice',
};
exports.NotificationPriorityColors = {
    [NotificationPriority.LOW]: 'gray',
    [NotificationPriority.NORMAL]: 'blue',
    [NotificationPriority.HIGH]: 'yellow',
    [NotificationPriority.URGENT]: 'red',
};
exports.NotificationTypeIcons = {
    [NotificationType.RENT_DUE_REMINDER]: '💰',
    [NotificationType.RENT_OVERDUE]: '⚠️',
    [NotificationType.PAYMENT_RECEIVED]: '✅',
    [NotificationType.PAYMENT_FAILED]: '❌',
    [NotificationType.LEASE_EXPIRING]: '📅',
    [NotificationType.LEASE_EXPIRED]: '📋',
    [NotificationType.LEASE_SIGNED]: '📝',
    [NotificationType.MAINTENANCE_REQUEST_SUBMITTED]: '🔧',
    [NotificationType.MAINTENANCE_REQUEST_ASSIGNED]: '👷',
    [NotificationType.MAINTENANCE_REQUEST_COMPLETED]: '✅',
    [NotificationType.MAINTENANCE_REQUEST_OVERDUE]: '⏰',
    [NotificationType.WELCOME_EMAIL]: '👋',
    [NotificationType.TRIAL_ENDING_WARNING]: '⏳',
    [NotificationType.SUBSCRIPTION_ACTIVATED]: '🎉',
    [NotificationType.SUBSCRIPTION_CANCELLED]: '📴',
    [NotificationType.PAYMENT_METHOD_REQUIRED]: '💳',
    [NotificationType.UPCOMING_INVOICE]: '📄',
};
//# sourceMappingURL=notification.js.map