"use strict";
/**
 * Maintenance utilities
 * Helper functions for maintenance priority and status display
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestStatusColor = exports.getRequestStatusLabel = exports.getPriorityColor = exports.getPriorityLabel = void 0;
const getPriorityLabel = (priority) => {
    const labels = {
        LOW: 'Low Priority',
        MEDIUM: 'Medium Priority',
        HIGH: 'High Priority',
        EMERGENCY: 'Emergency'
    };
    return labels[priority] || priority;
};
exports.getPriorityLabel = getPriorityLabel;
const getPriorityColor = (priority) => {
    const colors = {
        LOW: 'bg-green-100 text-green-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        HIGH: 'bg-orange-100 text-orange-800',
        EMERGENCY: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
};
exports.getPriorityColor = getPriorityColor;
const getRequestStatusLabel = (status) => {
    const labels = {
        OPEN: 'Open',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELED: 'Canceled',
        ON_HOLD: 'On Hold'
    };
    return labels[status] || status;
};
exports.getRequestStatusLabel = getRequestStatusLabel;
const getRequestStatusColor = (status) => {
    const colors = {
        OPEN: 'bg-yellow-100 text-yellow-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-green-100 text-green-800',
        CANCELED: 'bg-gray-100 text-gray-800',
        ON_HOLD: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
exports.getRequestStatusColor = getRequestStatusColor;
//# sourceMappingURL=maintenance.js.map