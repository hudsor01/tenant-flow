/**
 * Tenant constants
 * Runtime constants and enums for tenant management
 */
export declare const TENANT_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly EVICTED: "EVICTED";
    readonly PENDING: "PENDING";
};
export type TenantStatus = typeof TENANT_STATUS[keyof typeof TENANT_STATUS];
//# sourceMappingURL=tenants.d.ts.map