"use strict";
/**
 * Tenant management types
 * All types related to tenants and tenant management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVITATION_STATUS_OPTIONS = exports.INVITATION_STATUS = void 0;
exports.INVITATION_STATUS = {
    PENDING: 'PENDING',
    SENT: 'SENT',
    ACCEPTED: 'ACCEPTED',
    EXPIRED: 'EXPIRED'
};
exports.INVITATION_STATUS_OPTIONS = Object.values(exports.INVITATION_STATUS);
// Note: For complex relations, import from relations file to avoid circular imports
// import type { TenantWithDetails } from '@repo/shared/src/relations'
//# sourceMappingURL=tenants.js.map