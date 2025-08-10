// Notification types for TenantFlow application
// Notification type enum
export var NotificationType;
(function (NotificationType) {
    NotificationType["MAINTENANCE"] = "MAINTENANCE";
    NotificationType["LEASE"] = "LEASE";
    NotificationType["PAYMENT"] = "PAYMENT";
    NotificationType["GENERAL"] = "GENERAL";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (NotificationType = {}));
// Notification priority enum
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["MEDIUM"] = "MEDIUM";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["URGENT"] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export const NOTIFICATION_PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
};
export const NOTIFICATION_PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
];
//# sourceMappingURL=notifications.js.map