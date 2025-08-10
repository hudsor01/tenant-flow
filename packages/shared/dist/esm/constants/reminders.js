/**
 * Reminder constants
 * Runtime constants and enums for reminder management
 */
// Reminder type enum - matches Prisma schema ReminderType enum
export const REMINDER_TYPE = {
    RENT_REMINDER: 'RENT_REMINDER',
    LEASE_EXPIRATION: 'LEASE_EXPIRATION',
    MAINTENANCE_DUE: 'MAINTENANCE_DUE',
    PAYMENT_OVERDUE: 'PAYMENT_OVERDUE'
};
// Reminder status enum - matches Prisma schema ReminderStatus enum
export const REMINDER_STATUS = {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED',
    DELIVERED: 'DELIVERED',
    OPENED: 'OPENED'
};
// Derived options arrays for frontend use
export const REMINDER_TYPE_OPTIONS = Object.values(REMINDER_TYPE);
export const REMINDER_STATUS_OPTIONS = Object.values(REMINDER_STATUS);
//# sourceMappingURL=reminders.js.map