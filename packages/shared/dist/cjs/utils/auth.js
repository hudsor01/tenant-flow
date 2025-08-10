"use strict";
/**
 * Authentication utilities
 * Helper functions for user role display and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRoleColor = exports.getUserRoleLabel = void 0;
const getUserRoleLabel = (role) => {
    const labels = {
        OWNER: 'Property Owner',
        MANAGER: 'Property Manager',
        TENANT: 'Tenant',
        ADMIN: 'Administrator'
    };
    return labels[role] || role;
};
exports.getUserRoleLabel = getUserRoleLabel;
const getUserRoleColor = (role) => {
    const colors = {
        OWNER: 'bg-purple-100 text-purple-800',
        MANAGER: 'bg-blue-100 text-blue-800',
        TENANT: 'bg-green-100 text-green-800',
        ADMIN: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
};
exports.getUserRoleColor = getUserRoleColor;
//# sourceMappingURL=auth.js.map