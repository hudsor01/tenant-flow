"use strict";
/**
 * Lease utilities
 * Helper functions for lease status display and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaseStatusColor = exports.getLeaseStatusLabel = void 0;
const getLeaseStatusLabel = (status) => {
    const labels = {
        DRAFT: 'Draft',
        ACTIVE: 'Active',
        EXPIRED: 'Expired',
        TERMINATED: 'Terminated'
    };
    return labels[status] || status;
};
exports.getLeaseStatusLabel = getLeaseStatusLabel;
const getLeaseStatusColor = (status) => {
    const colors = {
        DRAFT: 'bg-gray-100 text-gray-800',
        ACTIVE: 'bg-green-100 text-green-800',
        EXPIRED: 'bg-red-100 text-red-800',
        TERMINATED: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
exports.getLeaseStatusColor = getLeaseStatusColor;
//# sourceMappingURL=leases.js.map