/**
 * Lease constants
 * Runtime constants and enums for lease management
 */
// Lease status enum - matches Prisma schema LeaseStatus enum
export const LEASE_STATUS = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    TERMINATED: 'TERMINATED'
};
export const LEASE_STATUS_OPTIONS = Object.values(LEASE_STATUS);
export const LEASE_TYPE = {
    FIXED_TERM: 'FIXED_TERM',
    MONTH_TO_MONTH: 'MONTH_TO_MONTH',
    WEEK_TO_WEEK: 'WEEK_TO_WEEK'
};
export const LEASE_TYPE_OPTIONS = Object.values(LEASE_TYPE);
//# sourceMappingURL=leases.js.map