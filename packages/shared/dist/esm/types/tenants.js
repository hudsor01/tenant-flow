/**
 * Tenant management types
 * All types related to tenants and tenant management
 */
export const INVITATION_STATUS = {
    PENDING: 'PENDING',
    SENT: 'SENT',
    ACCEPTED: 'ACCEPTED',
    EXPIRED: 'EXPIRED'
};
export const INVITATION_STATUS_OPTIONS = Object.values(INVITATION_STATUS);
// Note: For complex relations, import from relations file to avoid circular imports
// import type { TenantWithDetails } from '@repo/shared/src/relations'
//# sourceMappingURL=tenants.js.map