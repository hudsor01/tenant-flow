"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvitationStatusColor = exports.getInvitationStatusLabel = void 0;
const getInvitationStatusLabel = (status) => {
    const labels = {
        PENDING: 'Pending',
        ACCEPTED: 'Accepted',
        EXPIRED: 'Expired',
        DECLINED: 'Declined',
        CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
};
exports.getInvitationStatusLabel = getInvitationStatusLabel;
const getInvitationStatusColor = (status) => {
    const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        ACCEPTED: 'bg-green-100 text-green-800',
        EXPIRED: 'bg-red-100 text-red-800',
        DECLINED: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
exports.getInvitationStatusColor = getInvitationStatusColor;
