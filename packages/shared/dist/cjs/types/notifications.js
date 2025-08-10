"use strict";
// Notification types for TenantFlow application
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_PRIORITY_OPTIONS = exports.NOTIFICATION_PRIORITY = exports.NotificationPriority = exports.NotificationType = void 0;
// Notification type enum
var NotificationType;
(function (NotificationType) {
    NotificationType["MAINTENANCE"] = "MAINTENANCE";
    NotificationType["LEASE"] = "LEASE";
    NotificationType["PAYMENT"] = "PAYMENT";
    NotificationType["GENERAL"] = "GENERAL";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Notification priority enum
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["MEDIUM"] = "MEDIUM";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["URGENT"] = "URGENT";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
exports.NOTIFICATION_PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
};
exports.NOTIFICATION_PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
];
//# sourceMappingURL=notifications.js.map