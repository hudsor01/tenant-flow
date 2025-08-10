/**
 * Lease constants
 * Runtime constants and enums for lease management
 */
export declare const LEASE_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly ACTIVE: "ACTIVE";
    readonly EXPIRED: "EXPIRED";
    readonly TERMINATED: "TERMINATED";
};
export type LeaseStatus = typeof LEASE_STATUS[keyof typeof LEASE_STATUS];
export declare const LEASE_STATUS_OPTIONS: ("ACTIVE" | "EXPIRED" | "DRAFT" | "TERMINATED")[];
export declare const LEASE_TYPE: {
    readonly FIXED_TERM: "FIXED_TERM";
    readonly MONTH_TO_MONTH: "MONTH_TO_MONTH";
    readonly WEEK_TO_WEEK: "WEEK_TO_WEEK";
};
export type LeaseType = typeof LEASE_TYPE[keyof typeof LEASE_TYPE];
export declare const LEASE_TYPE_OPTIONS: ("FIXED_TERM" | "MONTH_TO_MONTH" | "WEEK_TO_WEEK")[];
//# sourceMappingURL=leases.d.ts.map