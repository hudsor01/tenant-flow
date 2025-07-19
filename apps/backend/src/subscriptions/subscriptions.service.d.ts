import { PrismaService } from 'nestjs-prisma';
import { ApiResponse } from '../common/response.util';
import type { Subscription } from '@prisma/client';
export type PlanId = 'FREE' | 'GROWTH';
export type BillingPeriod = 'MONTHLY' | 'ANNUAL';
export interface Plan {
    id: PlanId;
    name: string;
    description: string;
    price: number;
    billingPeriod: BillingPeriod;
    features: string[];
    limits: {
        properties: number;
        tenants: number;
        storage: number;
    };
    stripeMonthlyPriceId: string | null;
    stripeAnnualPriceId: string | null;
}
export interface SubscriptionWithPlan extends Subscription {
    plan: Plan;
    limitsExceeded: string[];
    usage: {
        properties: number;
        tenants: number;
        limit: number;
        planName: string;
    };
}
export declare class SubscriptionsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private readonly plans;
    create(params: {
        userId: string;
        planId: string;
        billingPeriod?: string;
        status?: string;
        stripeSubscriptionId?: string;
        stripeCustomerId?: string;
    }): Promise<ApiResponse<Subscription | null>>;
    getUserSubscription(userId: string): Promise<ApiResponse<Subscription | null>>;
    update(subscriptionId: string, updates: {
        status?: string;
        planId?: string;
        endDate?: Date;
    }): Promise<ApiResponse<Subscription | null>>;
    cancel(subscriptionId: string): Promise<ApiResponse<Subscription | null>>;
    getUsage(userId: string): Promise<ApiResponse<{
        properties: number;
        tenants: number;
        limit: number;
        planName: string;
    } | null>>;
    createSubscription(params: {
        userId: string;
        planId: string;
        billingPeriod?: string;
        paymentMethodCollection?: string;
    }): Promise<ApiResponse<Subscription | null>>;
    updateSubscription(userId: string, params: {
        planId?: string;
        billingPeriod?: string;
    }): Promise<ApiResponse<Subscription | null>>;
    cancelSubscription(userId: string): Promise<void>;
    calculateUsageMetrics(userId: string): Promise<{
        properties: number;
        tenants: number;
        planName: string;
        limit: number;
    }>;
    getAvailablePlans(): Plan[];
    getPlanById(planId: string): Plan | null;
    getUserSubscriptionWithPlan(userId: string): Promise<SubscriptionWithPlan>;
    getStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
    }>;
}
//# sourceMappingURL=subscriptions.service.d.ts.map