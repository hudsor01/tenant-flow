import { PLAN_TYPE } from '../constants';
export declare const BILLING_PLANS: {
    readonly [PLAN_TYPE.FREE]: {
        readonly id: any;
        readonly name: "Free Trial";
        readonly price: 0;
        readonly propertyLimit: 2;
        readonly stripePriceId: null;
        readonly stripeMonthlyPriceId: null;
        readonly stripeAnnualPriceId: null;
    };
    readonly [PLAN_TYPE.STARTER]: {
        readonly id: any;
        readonly name: "Starter";
        readonly price: 19;
        readonly propertyLimit: 10;
        readonly stripePriceId: string | null;
        readonly stripeMonthlyPriceId: string | null;
        readonly stripeAnnualPriceId: string | null;
    };
    readonly [PLAN_TYPE.GROWTH]: {
        readonly id: any;
        readonly name: "Growth";
        readonly price: 49;
        readonly propertyLimit: 50;
        readonly stripePriceId: string | null;
        readonly stripeMonthlyPriceId: string | null;
        readonly stripeAnnualPriceId: string | null;
    };
    readonly [PLAN_TYPE.ENTERPRISE]: {
        readonly id: any;
        readonly name: "Enterprise";
        readonly price: 149;
        readonly propertyLimit: -1;
        readonly stripePriceId: string | null;
        readonly stripeMonthlyPriceId: string | null;
        readonly stripeAnnualPriceId: string | null;
    };
};
export declare function getPlanById(planId: string): typeof BILLING_PLANS[keyof typeof BILLING_PLANS] | undefined;
export declare function getPriceId(planId: string): string | undefined;
export type BillingPlan = typeof BILLING_PLANS[keyof typeof BILLING_PLANS] & {
    stripeMonthlyPriceId?: string;
    stripeAnnualPriceId?: string;
};
//# sourceMappingURL=billing-plans.d.ts.map