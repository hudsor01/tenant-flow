/**
 * Reminder constants
 * Runtime constants and enums for reminder management
 */
export declare const REMINDER_TYPE: {
    readonly RENT_REMINDER: "RENT_REMINDER";
    readonly LEASE_EXPIRATION: "LEASE_EXPIRATION";
    readonly MAINTENANCE_DUE: "MAINTENANCE_DUE";
    readonly PAYMENT_OVERDUE: "PAYMENT_OVERDUE";
};
export type ReminderType = typeof REMINDER_TYPE[keyof typeof REMINDER_TYPE];
export declare const REMINDER_STATUS: {
    readonly PENDING: "PENDING";
    readonly SENT: "SENT";
    readonly FAILED: "FAILED";
    readonly DELIVERED: "DELIVERED";
    readonly OPENED: "OPENED";
};
export type ReminderStatus = typeof REMINDER_STATUS[keyof typeof REMINDER_STATUS];
export declare const REMINDER_TYPE_OPTIONS: ("RENT_REMINDER" | "LEASE_EXPIRATION" | "MAINTENANCE_DUE" | "PAYMENT_OVERDUE")[];
export declare const REMINDER_STATUS_OPTIONS: ("PENDING" | "FAILED" | "SENT" | "DELIVERED" | "OPENED")[];
//# sourceMappingURL=reminders.d.ts.map