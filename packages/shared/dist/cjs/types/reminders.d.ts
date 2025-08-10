/**
 * Reminder types
 * Types for reminder and notification management
 */
import type { REMINDER_TYPE, REMINDER_STATUS } from '../constants/reminders';
export type ReminderType = typeof REMINDER_TYPE[keyof typeof REMINDER_TYPE];
export type ReminderStatus = typeof REMINDER_STATUS[keyof typeof REMINDER_STATUS];
export interface ReminderLog {
    id: string;
    leaseId: string | null;
    userId: string;
    type: ReminderType;
    status: ReminderStatus;
    recipientEmail: string;
    recipientName: string | null;
    subject: string | null;
    content: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    openedAt: string | null;
    errorMessage: string | null;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
}
export declare const getReminderTypeLabel: (type: ReminderType) => string;
export declare const getReminderStatusLabel: (status: ReminderStatus) => string;
export declare const getReminderStatusColor: (status: ReminderStatus) => string;
//# sourceMappingURL=reminders.d.ts.map