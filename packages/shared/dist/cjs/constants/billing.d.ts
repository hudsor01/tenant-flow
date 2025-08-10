/**
 * Billing constants
 * Central source of truth for billing enums and constants
 */
export declare const PLAN_TYPE: {
    readonly FREETRIAL: "FREETRIAL";
    readonly STARTER: "STARTER";
    readonly GROWTH: "GROWTH";
    readonly TENANTFLOW_MAX: "TENANTFLOW_MAX";
};
export type PlanType = typeof PLAN_TYPE[keyof typeof PLAN_TYPE];
export declare const BILLING_PERIOD: {
    readonly MONTHLY: "MONTHLY";
    readonly ANNUAL: "ANNUAL";
};
export type BillingPeriod = typeof BILLING_PERIOD[keyof typeof BILLING_PERIOD];
export declare const SUB_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly CANCELLED: "CANCELLED";
    readonly PAST_DUE: "PAST_DUE";
    readonly INCOMPLETE: "INCOMPLETE";
    readonly INCOMPLETE_EXPIRED: "INCOMPLETE_EXPIRED";
    readonly TRIALING: "TRIALING";
    readonly UNPAID: "UNPAID";
};
export type SubStatus = typeof SUB_STATUS[keyof typeof SUB_STATUS];
export declare const PLANS: {
    id: string;
    name: string;
    description: string;
    price: {
        monthly: number;
        annual: number;
    };
    features: string[];
    propertyLimit: number;
    storageLimit: number;
    apiCallLimit: number;
    priority: boolean;
}[];
export declare const PLAN_TYPE_OPTIONS: ("FREETRIAL" | "STARTER" | "GROWTH" | "TENANTFLOW_MAX")[];
export declare const BILLING_PERIOD_OPTIONS: ("MONTHLY" | "ANNUAL")[];
export declare const SUB_STATUS_OPTIONS: ("CANCELLED" | "ACTIVE" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING" | "PAST_DUE" | "UNPAID")[];
//# sourceMappingURL=billing.d.ts.map