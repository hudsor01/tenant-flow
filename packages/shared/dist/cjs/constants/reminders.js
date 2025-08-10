"use strict";
/**
 * Reminder constants
 * Runtime constants and enums for reminder management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMINDER_STATUS_OPTIONS = exports.REMINDER_TYPE_OPTIONS = exports.REMINDER_STATUS = exports.REMINDER_TYPE = void 0;
// Reminder type enum - matches Prisma schema ReminderType enum
exports.REMINDER_TYPE = {
    RENT_REMINDER: 'RENT_REMINDER',
    LEASE_EXPIRATION: 'LEASE_EXPIRATION',
    MAINTENANCE_DUE: 'MAINTENANCE_DUE',
    PAYMENT_OVERDUE: 'PAYMENT_OVERDUE'
};
// Reminder status enum - matches Prisma schema ReminderStatus enum
exports.REMINDER_STATUS = {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED',
    DELIVERED: 'DELIVERED',
    OPENED: 'OPENED'
};
// Derived options arrays for frontend use
exports.REMINDER_TYPE_OPTIONS = Object.values(exports.REMINDER_TYPE);
exports.REMINDER_STATUS_OPTIONS = Object.values(exports.REMINDER_STATUS);
//# sourceMappingURL=reminders.js.map