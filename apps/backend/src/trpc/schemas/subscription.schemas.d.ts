import { z } from 'zod';
export declare const planTypeSchema: z.ZodEnum<["FREE", "STARTER", "GROWTH", "ENTERPRISE"]>;
export declare const subscriptionStatusSchema: z.ZodEnum<["ACTIVE", "CANCELED", "TRIALING", "PAST_DUE", "INCOMPLETE", "INCOMPLETE_EXPIRED", "UNPAID"]>;
export declare const billingPeriodSchema: z.ZodEnum<["MONTHLY", "ANNUAL"]>;
export declare const createSubscriptionSchema: z.ZodObject<{
    planId: z.ZodString;
    billingPeriod: z.ZodDefault<z.ZodOptional<z.ZodEnum<["MONTHLY", "ANNUAL"]>>>;
    paymentMethodCollection: z.ZodDefault<z.ZodOptional<z.ZodEnum<["always", "if_required"]>>>;
    userId: z.ZodOptional<z.ZodString>;
    userEmail: z.ZodOptional<z.ZodString>;
    userName: z.ZodOptional<z.ZodString>;
    createAccount: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    planId: string;
    billingPeriod: "MONTHLY" | "ANNUAL";
    paymentMethodCollection: "always" | "if_required";
    userId?: string | undefined;
    userEmail?: string | undefined;
    userName?: string | undefined;
    createAccount?: boolean | undefined;
}, {
    planId: string;
    userId?: string | undefined;
    billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
    paymentMethodCollection?: "always" | "if_required" | undefined;
    userEmail?: string | undefined;
    userName?: string | undefined;
    createAccount?: boolean | undefined;
}>;
export declare const cancelSubscriptionSchema: z.ZodObject<{
    subscriptionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subscriptionId: string;
}, {
    subscriptionId: string;
}>;
export declare const updateSubscriptionSchema: z.ZodObject<{
    subscriptionId: z.ZodOptional<z.ZodString>;
    planId: z.ZodOptional<z.ZodEnum<["FREE", "STARTER", "GROWTH", "ENTERPRISE"]>>;
    billingPeriod: z.ZodOptional<z.ZodEnum<["MONTHLY", "ANNUAL"]>>;
}, "strip", z.ZodTypeAny, {
    planId?: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | undefined;
    billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
    subscriptionId?: string | undefined;
}, {
    planId?: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | undefined;
    billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
    subscriptionId?: string | undefined;
}>;
export declare const createPortalSessionSchema: z.ZodObject<{
    customerId: z.ZodOptional<z.ZodString>;
    returnUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId?: string | undefined;
    returnUrl?: string | undefined;
}, {
    customerId?: string | undefined;
    returnUrl?: string | undefined;
}>;
export declare const usageMetricsSchema: z.ZodObject<{
    properties: z.ZodNumber;
    tenants: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tenants: number;
    properties: number;
}, {
    tenants: number;
    properties: number;
}>;
export declare const planLimitsSchema: z.ZodObject<{
    properties: z.ZodNumber;
    tenants: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tenants: number;
    properties: number;
}, {
    tenants: number;
    properties: number;
}>;
export declare const planDetailsSchema: z.ZodObject<{
    id: z.ZodEnum<["FREE", "STARTER", "GROWTH", "ENTERPRISE"]>;
    name: z.ZodString;
    price: z.ZodNumber;
    stripePriceId: z.ZodOptional<z.ZodString>;
    limits: z.ZodObject<{
        properties: z.ZodNumber;
        tenants: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tenants: number;
        properties: number;
    }, {
        tenants: number;
        properties: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
    name: string;
    price: number;
    limits: {
        tenants: number;
        properties: number;
    };
    stripePriceId?: string | undefined;
}, {
    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
    name: string;
    price: number;
    limits: {
        tenants: number;
        properties: number;
    };
    stripePriceId?: string | undefined;
}>;
export declare const subscriptionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    status: z.ZodString;
    planId: z.ZodNullable<z.ZodString>;
    billingPeriod: z.ZodNullable<z.ZodString>;
    currentPeriodStart: z.ZodNullable<z.ZodDate>;
    currentPeriodEnd: z.ZodNullable<z.ZodDate>;
    trialStart: z.ZodNullable<z.ZodDate>;
    trialEnd: z.ZodNullable<z.ZodDate>;
    cancelAtPeriodEnd: z.ZodNullable<z.ZodBoolean>;
    stripeCustomerId: z.ZodNullable<z.ZodString>;
    stripeSubscriptionId: z.ZodNullable<z.ZodString>;
    stripePriceId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    planId: string | null;
    billingPeriod: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    cancelAtPeriodEnd: boolean | null;
}, {
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    planId: string | null;
    billingPeriod: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    cancelAtPeriodEnd: boolean | null;
}>;
export declare const subscriptionWithPlanSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    plan: z.ZodObject<{
        id: z.ZodEnum<["FREE", "STARTER", "GROWTH", "ENTERPRISE"]>;
        name: z.ZodString;
        price: z.ZodNumber;
        stripePriceId: z.ZodOptional<z.ZodString>;
        limits: z.ZodObject<{
            properties: z.ZodNumber;
            tenants: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            tenants: number;
            properties: number;
        }, {
            tenants: number;
            properties: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
        name: string;
        price: number;
        limits: {
            tenants: number;
            properties: number;
        };
        stripePriceId?: string | undefined;
    }, {
        id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
        name: string;
        price: number;
        limits: {
            tenants: number;
            properties: number;
        };
        stripePriceId?: string | undefined;
    }>;
    status: z.ZodEnum<["ACTIVE", "CANCELED", "TRIALING", "PAST_DUE", "INCOMPLETE", "INCOMPLETE_EXPIRED", "UNPAID"]>;
    planId: z.ZodNullable<z.ZodEnum<["FREE", "STARTER", "GROWTH", "ENTERPRISE"]>>;
    currentPeriodStart: z.ZodNullable<z.ZodDate>;
    currentPeriodEnd: z.ZodNullable<z.ZodDate>;
    trialEnd: z.ZodNullable<z.ZodDate>;
    stripeCustomerId: z.ZodNullable<z.ZodString>;
    stripeSubscriptionId: z.ZodNullable<z.ZodString>;
    usage: z.ZodObject<{
        properties: z.ZodNumber;
        tenants: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tenants: number;
        properties: number;
    }, {
        tenants: number;
        properties: number;
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    planId: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
    plan: {
        id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
        name: string;
        price: number;
        limits: {
            tenants: number;
            properties: number;
        };
        stripePriceId?: string | undefined;
    };
    usage: {
        tenants: number;
        properties: number;
    };
}, {
    id: string;
    status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    planId: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
    plan: {
        id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
        name: string;
        price: number;
        limits: {
            tenants: number;
            properties: number;
        };
        stripePriceId?: string | undefined;
    };
    usage: {
        tenants: number;
        properties: number;
    };
}>;
export declare const createSubscriptionResponseSchema: z.ZodObject<{
    subscriptionId: z.ZodString;
    status: z.ZodEnum<["ACTIVE", "CANCELED", "TRIALING", "PAST_DUE", "INCOMPLETE", "INCOMPLETE_EXPIRED", "UNPAID"]>;
    clientSecret: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    setupIntentId: z.ZodOptional<z.ZodString>;
    trialEnd: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
    subscriptionId: string;
    trialEnd?: number | null | undefined;
    clientSecret?: string | null | undefined;
    setupIntentId?: string | undefined;
}, {
    status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
    subscriptionId: string;
    trialEnd?: number | null | undefined;
    clientSecret?: string | null | undefined;
    setupIntentId?: string | undefined;
}>;
export declare const portalSessionResponseSchema: z.ZodObject<{
    url: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    sessionId?: string | undefined;
}, {
    url: string;
    sessionId?: string | undefined;
}>;
export declare const plansListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodEnum<["FREE", "STARTER", "GROWTH", "ENTERPRISE"]>;
    name: z.ZodString;
    price: z.ZodNumber;
    stripePriceId: z.ZodOptional<z.ZodString>;
    limits: z.ZodObject<{
        properties: z.ZodNumber;
        tenants: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tenants: number;
        properties: number;
    }, {
        tenants: number;
        properties: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
    name: string;
    price: number;
    limits: {
        tenants: number;
        properties: number;
    };
    stripePriceId?: string | undefined;
}, {
    id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
    name: string;
    price: number;
    limits: {
        tenants: number;
        properties: number;
    };
    stripePriceId?: string | undefined;
}>, "many">;
export declare const subscriptionIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const userIdSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
//# sourceMappingURL=subscription.schemas.d.ts.map