/**
 * Billing constants
 * Runtime constants and enums for billing and subscription management
 */
export declare const PLAN_TYPE: {
    readonly FREE: "FREE";
    readonly STARTER: "STARTER";
    readonly GROWTH: "GROWTH";
    readonly ENTERPRISE: "ENTERPRISE";
};
export declare const PLAN_TYPE_OPTIONS: ("FREE" | "STARTER" | "GROWTH" | "ENTERPRISE")[];
export declare const BILLING_PERIOD: {
    readonly MONTHLY: "MONTHLY";
    readonly ANNUAL: "ANNUAL";
};
export declare const BILLING_PERIOD_OPTIONS: ("MONTHLY" | "ANNUAL")[];
export declare const SUB_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly CANCELLED: "CANCELLED";
    readonly PAST_DUE: "PAST_DUE";
    readonly UNPAID: "UNPAID";
    readonly INCOMPLETE: "INCOMPLETE";
    readonly INCOMPLETE_EXPIRED: "INCOMPLETE_EXPIRED";
    readonly TRIALING: "TRIALING";
    readonly PAUSED: "PAUSED";
};
export declare const SUB_STATUS_OPTIONS: ("ACTIVE" | "CANCELLED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING" | "PAUSED")[];
