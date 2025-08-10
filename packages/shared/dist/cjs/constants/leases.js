"use strict";
/**
 * Lease constants
 * Runtime constants and enums for lease management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEASE_TYPE_OPTIONS = exports.LEASE_TYPE = exports.LEASE_STATUS_OPTIONS = exports.LEASE_STATUS = void 0;
// Lease status enum - matches Prisma schema LeaseStatus enum
exports.LEASE_STATUS = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    TERMINATED: 'TERMINATED'
};
exports.LEASE_STATUS_OPTIONS = Object.values(exports.LEASE_STATUS);
exports.LEASE_TYPE = {
    FIXED_TERM: 'FIXED_TERM',
    MONTH_TO_MONTH: 'MONTH_TO_MONTH',
    WEEK_TO_WEEK: 'WEEK_TO_WEEK'
};
exports.LEASE_TYPE_OPTIONS = Object.values(exports.LEASE_TYPE);
//# sourceMappingURL=leases.js.map