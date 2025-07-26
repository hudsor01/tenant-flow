import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import type { CreateCheckoutSessionParams } from '@tenantflow/types-core';
import type { PlanType } from '@prisma/client';
import type Stripe from 'stripe';
export declare class SubscriptionService {
    private readonly stripeService;
    private readonly prismaService;
    private readonly configService;
    private readonly errorHandler;
    private readonly logger;
    constructor(stripeService: StripeService, prismaService: PrismaService, configService: ConfigService, errorHandler: ErrorHandlerService);
    createSubscription(params: {
        userId: string;
        planType: PlanType;
        billingInterval: 'monthly' | 'annual';
        paymentMethodId?: string;
    }): Promise<{
        subscriptionId: string;
        clientSecret?: string;
        status: string;
    }>;
    createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
        url?: string;
        clientSecret?: string;
    }>;
    createPortalSession(userId: string, returnUrl: string): Promise<string>;
    startFreeTrial(userId: string): Promise<{
        subscriptionId: string;
        status: string;
        trialEnd: Date;
    }>;
    syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void>;
    handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void>;
    private mapStripeStatus;
    previewSubscriptionChange(params: {
        userId: string;
        newPriceId: string;
        prorationDate?: Date;
    }): Promise<Stripe.Invoice>;
    updateSubscriptionPlan(params: {
        userId: string;
        newPriceId: string;
        prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    }): Promise<{
        subscriptionId: string;
        clientSecret?: string;
    }>;
    cancelSubscription(params: {
        userId: string;
        cancelAtPeriodEnd?: boolean;
    }): Promise<{
        subscriptionId: string;
        status: string;
        cancelAt?: number;
    }>;
    private getPlanTypeFromPriceId;
}
//# sourceMappingURL=subscription.service.d.ts.map