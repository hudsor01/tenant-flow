"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
exports.hasOrganizationId = hasOrganizationId;
function hasOrganizationId(user) {
    const userWithOrg = user;
    return (typeof userWithOrg.organizationId === 'string' &&
        userWithOrg.organizationId.length > 0);
}
exports.Permission = {
    READ_PROPERTIES: 'READ_PROPERTIES',
    WRITE_PROPERTIES: 'WRITE_PROPERTIES',
    DELETE_PROPERTIES: 'DELETE_PROPERTIES',
    READ_TENANTS: 'READ_TENANTS',
    WRITE_TENANTS: 'WRITE_TENANTS',
    DELETE_TENANTS: 'DELETE_TENANTS',
    READ_LEASES: 'READ_LEASES',
    WRITE_LEASES: 'WRITE_LEASES',
    DELETE_LEASES: 'DELETE_LEASES',
    READ_MAINTENANCE: 'READ_MAINTENANCE',
    WRITE_MAINTENANCE: 'WRITE_MAINTENANCE',
    DELETE_MAINTENANCE: 'DELETE_MAINTENANCE',
    READ_FINANCIAL: 'READ_FINANCIAL',
    WRITE_FINANCIAL: 'WRITE_FINANCIAL',
    ADMIN_ACCESS: 'ADMIN_ACCESS',
    MANAGE_BILLING: 'MANAGE_BILLING',
    MANAGE_USERS: 'MANAGE_USERS'
};
