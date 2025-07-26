import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
export declare class StripeService {
    private readonly configService;
    private readonly logger;
    private _stripe;
    constructor(configService: ConfigService);
    private get stripe();
    get client(): Stripe;
    createCustomer(params: {
        email: string;
        name?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Customer>;
    getCustomer(customerId: string): Promise<Stripe.Customer | null>;
    createCheckoutSession(params: {
        customerId?: string;
        customerEmail?: string;
        priceId?: string;
        mode: 'payment' | 'setup' | 'subscription';
        successUrl: string;
        cancelUrl: string;
        metadata?: Record<string, string>;
        subscriptionData?: {
            trialPeriodDays?: number;
            metadata?: Record<string, string>;
            trialSettings?: {
                endBehavior?: {
                    missingPaymentMethod?: 'pause' | 'cancel' | 'create_invoice';
                };
            };
        };
        paymentMethodCollection?: 'if_required' | 'always';
        allowPromotionCodes?: boolean;
        uiMode?: 'embedded' | 'hosted';
    }): Promise<Stripe.Checkout.Session>;
    createPortalSession(params: {
        customerId: string;
        returnUrl: string;
    }): Promise<Stripe.BillingPortal.Session>;
    getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null>;
    updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams): Promise<Stripe.Subscription>;
    cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<Stripe.Subscription>;
    createPreviewInvoice(params: {
        customerId: string;
        subscriptionId?: string;
        subscriptionItems?: {
            id?: string;
            price?: string;
            quantity?: number;
        }[];
        subscriptionProrationDate?: number;
    }): Promise<Stripe.Invoice>;
    updateSubscriptionWithProration(subscriptionId: string, params: {
        items?: {
            id?: string;
            price?: string;
            quantity?: number;
        }[];
        prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
        prorationDate?: number;
    }): Promise<Stripe.Subscription>;
    constructWebhookEvent(payload: string | Buffer, signature: string, secret: string, tolerance?: number): Stripe.Event;
    private handleStripeError;
}
//# sourceMappingURL=stripe.service.d.ts.map