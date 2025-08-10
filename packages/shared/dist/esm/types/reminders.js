/**
 * Reminder types
 * Types for reminder and notification management
 */
// Display helpers
export const getReminderTypeLabel = (type) => {
    const labels = {
        RENT_REMINDER: 'Rent Reminder',
        LEASE_EXPIRATION: 'Lease Expiration',
        MAINTENANCE_DUE: 'Maintenance Due',
        PAYMENT_OVERDUE: 'Payment Overdue'
    };
    return labels[type] || type;
};
export const getReminderStatusLabel = (status) => {
    const labels = {
        PENDING: 'Pending',
        SENT: 'Sent',
        FAILED: 'Failed',
        DELIVERED: 'Delivered',
        OPENED: 'Opened'
    };
    return labels[status] || status;
};
export const getReminderStatusColor = (status) => {
    const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        SENT: 'bg-blue-100 text-blue-800',
        FAILED: 'bg-red-100 text-red-800',
        DELIVERED: 'bg-green-100 text-green-800',
        OPENED: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
//# sourceMappingURL=reminders.js.map