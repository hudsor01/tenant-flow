/**
 * Lease utilities
 * Helper functions for lease status display and management
 */
type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export declare const getLeaseStatusLabel: (status: LeaseStatus) => string;
export declare const getLeaseStatusColor: (status: LeaseStatus) => string;
export {};
//# sourceMappingURL=leases.d.ts.map