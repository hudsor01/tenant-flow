export declare const PLAN_TYPE: {
    readonly FREE: "FREE";
    readonly STARTER: "STARTER";
    readonly GROWTH: "GROWTH";
    readonly ENTERPRISE: "ENTERPRISE";
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
export interface Subscription {
    id: string;
    userId: string;
    planType: PlanType;
    status: SubStatus;
    billingPeriod: BillingPeriod;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
    stripePriceId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface Plan {
    id: PlanType;
    name: string;
    price: number;
    propertyLimit: number;
    stripePriceId: string | null;
    stripeMonthlyPriceId: string | null;
    stripeAnnualPriceId: string | null;
}
export interface UsageMetrics {
    id: string;
    userId: string;
    properties: number;
    units: number;
    tenants: number;
    storageUsed: number;
    apiCalls: number;
    period: Date;
    createdAt: Date;
}
export interface BillingHistory {
    id: string;
    userId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    status: 'PAID' | 'PENDING' | 'FAILED';
    stripeInvoiceId: string | null;
    billingDate: Date;
    createdAt: Date;
}
export interface PlanLimits {
    properties: number;
    units: number;
    tenants: number;
    storage: number;
    apiCalls: number;
}
export interface SubscriptionCreateRequest {
    planType: PlanType;
    billingPeriod: BillingPeriod;
    paymentMethodId?: string;
}
export interface SubscriptionCreateResponse {
    subscription: Subscription;
    clientSecret?: string;
    requiresPaymentMethod: boolean;
}
export interface CustomerPortalRequest {
    returnUrl: string;
}
export interface CustomerPortalResponse {
    url: string;
}
export interface CreateCheckoutSessionParams {
    priceId: string;
    userId: string;
    planType: PlanType;
    billingInterval?: 'monthly' | 'annual';
    uiMode?: string;
    successUrl?: string;
    cancelUrl?: string;
    collectPaymentMethod?: boolean;
}
export interface CreatePortalSessionParams {
    customerId: string;
    returnUrl: string;
}
export interface SubscriptionData {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
}
export interface PreviewInvoiceParams {
    customerId: string;
    priceId: string;
    quantity?: number;
}
export interface UpdateSubscriptionParams {
    subscriptionId: string;
    priceId: string;
    prorationBehavior?: 'create_prorations' | 'none';
}
export interface WebhookEventHandler {
    [eventType: string]: (event: StripeWebhookEvent) => Promise<void>;
}
export type WebhookEventType = string;
export interface StripeWebhookEvent {
    id: string;
    object: 'event';
    api_version: string;
    created: number;
    data: {
        object: Record<string, unknown>;
        previous_attributes?: Record<string, unknown>;
    };
    livemode: boolean;
    pending_webhooks: number;
    request: {
        id: string | null;
        idempotency_key: string | null;
    };
    type: string;
}
export declare const STRIPE_ERRORS: {
    readonly CARD_DECLINED: "card_declined";
    readonly EXPIRED_CARD: "expired_card";
    readonly INSUFFICIENT_FUNDS: "insufficient_funds";
    readonly PROCESSING_ERROR: "processing_error";
    readonly CONFIGURATION_ERROR: "configuration_error";
    readonly SUBSCRIPTION_ERROR: "subscription_error";
    readonly WEBHOOK_ERROR: "webhook_error";
    readonly WEBHOOK_SIGNATURE_INVALID: "webhook_signature_invalid";
    readonly RATE_LIMIT_EXCEEDED: "rate_limit_exceeded";
    readonly INVALID_REQUEST: "invalid_request";
    readonly API_CONNECTION_ERROR: "api_connection_error";
    readonly AUTHENTICATION_FAILED: "authentication_failed";
};
export type StripeError = typeof STRIPE_ERRORS[keyof typeof STRIPE_ERRORS];
export type BillingPlan = {
    id: PlanType;
    name: string;
    price: number;
    propertyLimit: number;
    stripePriceId: string | null;
    stripeMonthlyPriceId: string | null;
    stripeAnnualPriceId: string | null;
};
export declare const BILLING_PLANS: Record<PlanType, BillingPlan>;
export declare function getPlanById(planId: string): BillingPlan | undefined;
export declare function getPriceId(planId: string): string | undefined;
//# sourceMappingURL=billing.d.ts.map