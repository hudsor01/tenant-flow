/**
 * Billing and subscription management types
 * All types related to subscriptions, plans, invoices, and billing
 */
import type { PlanType, BillingPeriod, StripeWebhookEvent } from './stripe';
export declare const PLAN_TYPE: {
    readonly FREETRIAL: "FREETRIAL";
    readonly STARTER: "STARTER";
    readonly GROWTH: "GROWTH";
    readonly TENANTFLOW_MAX: "TENANTFLOW_MAX";
};
export type SubStatus = 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
export interface Plan {
    id: PlanType;
    uiId: string;
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
    subscription?: string;
    stripePriceIds: {
        monthly: string | null;
        annual: string | null;
    };
    ANNUALPrice?: number;
}
export interface ServicePlan {
    id: PlanType;
    name: string;
    price: number;
    propertyLimit: number;
    stripePriceIds: {
        monthly: string | null;
        annual: string | null;
    };
}
export interface PlanConfig {
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
}
export interface UserPlan extends PlanConfig {
    billingPeriod: BillingPeriod;
    status: SubStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
}
export declare const getPlanTypeLabel: (plan: PlanType) => string;
export interface Subscription {
    id: string;
    userId: string;
    plan: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    cancelledAt: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    planId: string | null;
    billingPeriod: BillingPeriod | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    cancelAtPeriodEnd: boolean | null;
    canceledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface Invoice {
    id: string;
    userId: string;
    subscriptionId: string | null;
    stripeInvoiceId: string;
    amountPaid: number;
    amountDue: number;
    currency: string;
    status: string;
    invoiceDate: Date;
    dueDate: Date | null;
    paidAt: Date | null;
    invoiceUrl: string | null;
    invoicePdf: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface StripePricing {
    id: string;
    priceFree: string;
    priceStarter: string;
    priceGrowth: string;
    priceEnterprise: string;
    productFree: string;
    productStarter: string;
    productGrowth: string;
    productEnterprise: string;
    pricingTableId: string;
    customerPortalUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface TrialConfig {
    trialPeriodDays: number;
    trialEndBehavior: 'cancel' | 'pause' | 'require_payment';
    collectPaymentMethod: boolean;
    reminderDaysBeforeEnd: number;
}
export interface ProductTierConfig {
    id: PlanType;
    name: string;
    description: string;
    price: {
        monthly: number;
        annual: number;
    };
    trial: TrialConfig;
    features: string[];
    limits: {
        properties: number;
        units: number;
        users?: number;
        storage?: number;
        apiCalls?: number;
    };
    support: 'email' | 'priority' | 'dedicated';
    stripePriceIds: {
        monthly: string | null;
        annual: string | null;
    };
}
export interface WebhookEvent {
    id: string;
    stripeEventId: string;
    eventType: string;
    processed: boolean;
    processingTime: number | null;
    errorMessage: string | null;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface UsageMetrics {
    properties: number;
    tenants?: number;
}
export interface BillingHistory {
    invoices: Invoice[];
    totalSpent: number;
    currentBalance: number;
}
export interface SubscriptionCreateRequest {
    planId: PlanType;
    paymentMethodId?: string;
}
export interface SubscriptionCreateResponse {
    subscription: Subscription;
    clientSecret?: string;
    requiresPaymentMethod: boolean;
    success: boolean;
    subscriptionId?: string;
}
export interface CustomerPortalRequest {
    returnUrl?: string;
}
export interface CustomerPortalResponse {
    url: string;
}
export type StripeErrorType = 'card_error' | 'rate_limit_error' | 'invalid_request_error' | 'api_error' | 'api_connection_error' | 'authentication_error' | 'idempotency_error';
export interface StripeWebhookError {
    type: StripeErrorType;
    message: string;
    stack?: string;
}
export interface CreateCheckoutSessionParams {
    userId: string;
    planType: PlanType;
    billingInterval: 'monthly' | 'annual';
    collectPaymentMethod?: boolean;
    successUrl: string;
    cancelUrl: string;
    uiMode?: 'embedded' | 'hosted';
    priceId?: string;
    mode?: 'payment' | 'subscription' | 'setup';
    currency?: string;
    locale?: string;
}
export interface CreatePortalSessionParams {
    customerId: string;
    returnUrl: string;
}
export interface SubscriptionData {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    planType: PlanType;
    status: SubStatus;
    trialEndsAt?: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
}
export interface WebhookEventHandler {
    'customer.subscription.created': (event: StripeWebhookEvent) => Promise<void>;
    'customer.subscription.updated': (event: StripeWebhookEvent) => Promise<void>;
    'customer.subscription.deleted': (event: StripeWebhookEvent) => Promise<void>;
    'customer.subscription.trial_will_end': (event: StripeWebhookEvent) => Promise<void>;
    'customer.subscription.paused': (event: StripeWebhookEvent) => Promise<void>;
    'customer.subscription.resumed': (event: StripeWebhookEvent) => Promise<void>;
    'invoice.payment_succeeded': (event: StripeWebhookEvent) => Promise<void>;
    'invoice.payment_failed': (event: StripeWebhookEvent) => Promise<void>;
    'invoice.payment_action_required': (event: StripeWebhookEvent) => Promise<void>;
    'invoice.upcoming': (event: StripeWebhookEvent) => Promise<void>;
    'checkout.session.completed': (event: StripeWebhookEvent) => Promise<void>;
    'payment_intent.requires_action': (event: StripeWebhookEvent) => Promise<void>;
    'charge.failed': (event: StripeWebhookEvent) => Promise<void>;
}
export type WebhookEventType = keyof WebhookEventHandler;
export declare const STRIPE_ERRORS: {
    readonly CUSTOMER_NOT_FOUND: "Customer not found";
    readonly SUBSCRIPTION_NOT_FOUND: "Subscription not found";
    readonly INVALID_PRICE_ID: "Invalid price ID";
    readonly WEBHOOK_SIGNATURE_INVALID: "Invalid webhook signature";
    readonly CONFIGURATION_ERROR: "Stripe configuration error";
    readonly RATE_LIMIT_EXCEEDED: "Rate limit exceeded";
    readonly PAYMENT_DECLINED: "Payment declined";
    readonly AUTHENTICATION_FAILED: "Authentication failed";
    readonly INVALID_REQUEST: "Invalid request parameters";
    readonly API_CONNECTION_ERROR: "API connection error";
    readonly CARD_DECLINED: "Card declined";
    readonly PROCESSING_ERROR: "Processing error";
};
export interface PreviewInvoiceParams {
    userId: string;
    newPriceId: string;
    prorationDate?: Date;
}
export interface UpdateSubscriptionParams extends Record<string, unknown> {
    userId: string;
    newPriceId: string;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    prorationDate?: Date;
    allowIncomplete?: boolean;
    planId?: string;
}
export interface SubscriptionChangePreview {
    prorationAmount: number;
    immediateCharge: number;
    nextBillingAmount: number;
    nextBillingDate: Date;
    creditApplied: number;
}
export interface StripeElementEvent {
    elementType: string;
    empty: boolean;
    complete: boolean;
    error?: {
        type: string;
        code: string;
        message: string;
    };
}
export interface StripeCardElementEvent extends StripeElementEvent {
    brand?: string;
    country?: string;
}
export interface StripePaymentElementEvent extends StripeElementEvent {
    value?: {
        type: string;
    };
}
export type StripeElementEventCallback = (event: StripeElementEvent) => void;
export type StripeCardElementEventCallback = (event: StripeCardElementEvent) => void;
export type StripePaymentElementEventCallback = (event: StripePaymentElementEvent) => void;
/**
 * Payment method type compatible with Stripe's PaymentMethod
 * Simplified version for shared usage between frontend and backend
 */
export interface PaymentMethod {
    id: string;
    object: 'payment_method';
    type: string;
    created: number;
    customer: string | null;
    livemode: boolean;
    metadata: Record<string, string>;
    card?: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
        funding: string;
        country: string | null;
    };
    billing_details: {
        address: {
            city: string | null;
            country: string | null;
            line1: string | null;
            line2: string | null;
            postal_code: string | null;
            state: string | null;
        };
        email: string | null;
        name: string | null;
        phone: string | null;
    };
}
/**
 * Enhanced usage metrics with detailed tracking
 * Extends basic UsageMetrics with comprehensive usage data
 */
export interface UsageMetricsExtended extends UsageMetrics {
    id: string;
    userId: string;
    month: string;
    leaseGenerationsCount: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Detailed usage metrics for comprehensive tracking
 * Used for dashboard analytics and billing calculations
 */
export interface DetailedUsageMetrics {
    propertiesCount: number;
    tenantsCount: number;
    leasesCount: number;
    storageUsedMB: number;
    apiCallsCount: number;
    leaseGenerationsCount: number;
    month: string;
}
/**
 * Plan limits interface for subscription enforcement
 * Defines the maximum allowed usage for each plan tier
 */
export interface PlanLimits {
    properties: number;
    tenants: number;
    storage: number;
    apiCalls: number;
}
/**
 * Limit checks interface for real-time validation
 * Indicates which limits have been exceeded
 */
export interface LimitChecks {
    propertiesExceeded: boolean;
    tenantsExceeded: boolean;
    storageExceeded: boolean;
    apiCallsExceeded: boolean;
}
/**
 * Combined usage data with limits and checks
 * Provides complete usage context with enforcement data
 */
export interface UsageData extends DetailedUsageMetrics {
    limits: PlanLimits | null;
    limitChecks: LimitChecks | null;
}
/**
 * Billing history event for audit trail
 * Tracks all billing-related activities and changes
 */
export interface BillingHistoryEvent {
    id: string;
    userId: string;
    type: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'invoice_created';
    description: string;
    amount?: number;
    currency?: string;
    stripeEventId?: string;
    metadata?: Record<string, string | number | boolean>;
    createdAt: Date;
}
export interface LocalSubscriptionData {
    id: string;
    userId: string;
    status: string;
    planId: string | null;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface EnhancedUserPlan extends Omit<Plan, 'subscription'> {
    id: keyof typeof PLAN_TYPE;
    billingPeriod: 'monthly' | 'annual';
    status: string;
    subscription: LocalSubscriptionData | null;
    isActive: boolean;
    trialDaysRemaining: number;
    accessExpiresAt: Date | null;
    statusReason: string;
}
//# sourceMappingURL=billing.d.ts.map