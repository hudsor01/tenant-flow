import { z } from 'zod';
import type { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import type { PortalService } from '../../stripe/services/portal.service';
import type { UsersService } from '../../users/users.service';
import type { AuthService } from '../../auth/auth.service';
export declare const createSubscriptionsRouter: (subscriptionsService: SubscriptionsService, portalService: PortalService, _usersService: UsersService, _authService: AuthService) => import("@trpc/server").TRPCBuiltRouter<{
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
    getCurrent: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
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
        };
        meta: object;
    }>;
    getUsage: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            tenants: number;
            properties: number;
        };
        meta: object;
    }>;
    getPlans: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
            name: string;
            price: number;
            limits: {
                tenants: number;
                properties: number;
            };
            stripePriceId?: string | undefined;
        }[];
        meta: object;
    }>;
    getPlan: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            planId: string;
        };
        output: {
            id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
            name: string;
            price: number;
            limits: {
                tenants: number;
                properties: number;
            };
            stripePriceId?: string | undefined;
        } | null;
        meta: object;
    }>;
    createWithSignup: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planId: string;
            userEmail: string;
            userName: string;
            userId?: string | undefined;
            billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
            paymentMethodCollection?: "always" | "if_required" | undefined;
            createAccount?: boolean | undefined;
        };
        output: {
            status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
            user: {
                id: string;
                email: string;
                fullName: string | null;
            };
            subscriptionId: string;
            accessToken: string;
            refreshToken: string;
            trialEnd?: number | null | undefined;
            clientSecret?: string | null | undefined;
            setupIntentId?: string | undefined;
        };
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planId: string;
            userId?: string | undefined;
            billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
            paymentMethodCollection?: "always" | "if_required" | undefined;
            userEmail?: string | undefined;
            userName?: string | undefined;
            createAccount?: boolean | undefined;
        };
        output: {
            status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
            subscriptionId: string;
            trialEnd?: number | null | undefined;
            clientSecret?: string | null | undefined;
            setupIntentId?: string | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planId?: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | undefined;
            billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
            subscriptionId?: string | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    cancel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subscriptionId: string;
        };
        output: {
            message: string;
            success: boolean;
        };
        meta: object;
    }>;
    createPortalSession: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            customerId?: string | undefined;
            returnUrl?: string | undefined;
        };
        output: {
            url: string;
            sessionId?: string | undefined;
        };
        meta: object;
    }>;
    startTrial: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            status: string;
            trialEnd: Date | null;
            success: boolean;
            subscriptionId: string;
        };
        meta: object;
    }>;
    canPerformAction: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            action: "property" | "tenant" | "api" | "storage" | "leaseGeneration";
        };
        output: {
            allowed: boolean;
            upgradeRequired: boolean;
            reason?: string | undefined;
        };
        meta: object;
    }>;
}>>;
export declare const subscriptionsRouter: (subscriptionsService: SubscriptionsService, portalService: PortalService, _usersService: UsersService, _authService: AuthService) => import("@trpc/server").TRPCBuiltRouter<{
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
    getCurrent: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
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
        };
        meta: object;
    }>;
    getUsage: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            tenants: number;
            properties: number;
        };
        meta: object;
    }>;
    getPlans: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
            name: string;
            price: number;
            limits: {
                tenants: number;
                properties: number;
            };
            stripePriceId?: string | undefined;
        }[];
        meta: object;
    }>;
    getPlan: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            planId: string;
        };
        output: {
            id: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
            name: string;
            price: number;
            limits: {
                tenants: number;
                properties: number;
            };
            stripePriceId?: string | undefined;
        } | null;
        meta: object;
    }>;
    createWithSignup: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planId: string;
            userEmail: string;
            userName: string;
            userId?: string | undefined;
            billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
            paymentMethodCollection?: "always" | "if_required" | undefined;
            createAccount?: boolean | undefined;
        };
        output: {
            status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
            user: {
                id: string;
                email: string;
                fullName: string | null;
            };
            subscriptionId: string;
            accessToken: string;
            refreshToken: string;
            trialEnd?: number | null | undefined;
            clientSecret?: string | null | undefined;
            setupIntentId?: string | undefined;
        };
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planId: string;
            userId?: string | undefined;
            billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
            paymentMethodCollection?: "always" | "if_required" | undefined;
            userEmail?: string | undefined;
            userName?: string | undefined;
            createAccount?: boolean | undefined;
        };
        output: {
            status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING";
            subscriptionId: string;
            trialEnd?: number | null | undefined;
            clientSecret?: string | null | undefined;
            setupIntentId?: string | undefined;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            planId?: "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE" | undefined;
            billingPeriod?: "MONTHLY" | "ANNUAL" | undefined;
            subscriptionId?: string | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    cancel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subscriptionId: string;
        };
        output: {
            message: string;
            success: boolean;
        };
        meta: object;
    }>;
    createPortalSession: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            customerId?: string | undefined;
            returnUrl?: string | undefined;
        };
        output: {
            url: string;
            sessionId?: string | undefined;
        };
        meta: object;
    }>;
    startTrial: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            status: string;
            trialEnd: Date | null;
            success: boolean;
            subscriptionId: string;
        };
        meta: object;
    }>;
    canPerformAction: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            action: "property" | "tenant" | "api" | "storage" | "leaseGeneration";
        };
        output: {
            allowed: boolean;
            upgradeRequired: boolean;
            reason?: string | undefined;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=subscriptions.router.d.ts.map