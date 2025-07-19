import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
export declare class StripeService {
    private configService;
    private readonly stripe;
    constructor(configService: ConfigService);
    getStripeInstance(): Stripe;
    getSecretKey(): string;
    getWebhookSecret(): string;
    getPriceId(planId: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'): string;
    createCustomer(params: {
        email: string;
        name?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Customer>;
    updateCustomer(customerId: string, params: {
        email?: string;
        name?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Customer>;
    createSubscription(params: {
        customer: string;
        items: {
            price: string;
            quantity?: number;
        }[];
        trial_period_days?: number;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Subscription>;
    updateSubscription(subscriptionId: string, params: {
        items?: {
            id?: string;
            price?: string;
            quantity?: number;
        }[];
        cancel_at_period_end?: boolean;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Subscription>;
    cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    createCheckoutSession(params: {
        customerId: string;
        priceId: string;
        successUrl: string;
        cancelUrl: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Checkout.Session>;
    createPortalSession(params: {
        customer: string;
        return_url?: string;
    }): Promise<Stripe.BillingPortal.Session>;
    constructWebhookEvent(payload: string | Buffer, signature: string, endpointSecret: string): Stripe.Event;
    getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]>;
}
//# sourceMappingURL=stripe.service.d.ts.map