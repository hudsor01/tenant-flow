import { z } from 'zod';
import type { SubscriptionService } from '../../stripe/subscription.service';
import type { SubscriptionsService } from '../../subscriptions/subscriptions.service';
export declare const createSubscriptionsRouter: (services: {
    subscriptionService: SubscriptionService;
    subscriptionsService: SubscriptionsService;
}) => import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context/app.context").Context;
    meta: object;
    errorShape: {
        data: {
            zodError: z.typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    current: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            userId: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            stripeCustomerId: string | null;
            startDate: Date;
            endDate: Date | null;
            cancelledAt: Date | null;
            stripeSubscriptionId: string | null;
            stripePriceId: string | null;
            planId: string | null;
            planType: string | null;
            billingPeriod: string | null;
            currentPeriodStart: Date | null;
            currentPeriodEnd: Date | null;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean | null;
            canceledAt: Date | null;
        } | null;
        meta: object;
    }>;
    createCheckoutSession: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planType: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
            billingInterval: "monthly" | "annual";
            successUrl: string;
            cancelUrl: string;
            collectPaymentMethod?: boolean | undefined;
            uiMode?: "embedded" | "hosted" | undefined;
        };
        output: {
            url?: string;
            clientSecret?: string;
        };
        meta: object;
    }>;
    createPortalSession: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            returnUrl: string;
        };
        output: {
            url: string;
        };
        meta: object;
    }>;
    startFreeTrial: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            subscriptionId: string;
            status: string;
            trialEnd: Date;
        };
        meta: object;
    }>;
    createDirect: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planType: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
            priceId: string;
        };
        output: {
            subscriptionId: string;
            clientSecret?: string;
            status: string;
        };
        meta: object;
    }>;
    updateDirect: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subscriptionId: string;
            newPriceId: string;
        };
        output: {
            subscriptionId: string;
            clientSecret?: string;
        };
        meta: object;
    }>;
    cancel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subscriptionId: string;
            cancelAtPeriodEnd?: boolean | undefined;
        };
        output: {
            subscriptionId: string;
            status: string;
            cancelAt?: number;
        };
        meta: object;
    }>;
    previewUpdate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subscriptionId: string;
            newPriceId: string;
        };
        output: {
            proratedAmount: number;
            immediatePayment: number;
            nextInvoiceAmount: number;
            currency: string;
        };
        meta: object;
    }>;
    canAccessPremiumFeatures: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            hasAccess: boolean;
            reason: string;
            subscription?: undefined;
        } | {
            hasAccess: boolean;
            subscription: {
                status: string;
                planId: string | null;
                trialEnd: Date | null;
                currentPeriodEnd: Date | null;
                cancelAtPeriodEnd: boolean | null;
            };
            reason?: undefined;
        };
        meta: object;
    }>;
    getPlans: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("../../subscriptions/subscriptions.service").Plan[];
        meta: object;
    }>;
}>>;
export type SubscriptionsRouter = ReturnType<typeof createSubscriptionsRouter>;
//# sourceMappingURL=subscriptions.router.d.ts.map