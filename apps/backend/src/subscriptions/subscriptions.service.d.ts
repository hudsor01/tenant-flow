import { PrismaService } from '../prisma/prisma.service';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import type { Subscription, PlanType } from '@prisma/client';
export interface Plan {
    id: PlanType;
    name: string;
    price: number;
    propertyLimit: number;
    stripeMonthlyPriceId: string | null;
    stripeAnnualPriceId: string | null;
}
export declare class SubscriptionsService {
    private readonly prismaService;
    private readonly errorHandler;
    private readonly logger;
    constructor(prismaService: PrismaService, errorHandler: ErrorHandlerService);
    getSubscription(userId: string): Promise<Subscription | null>;
    private createFreeSubscription;
    getAvailablePlans(): Promise<Plan[]>;
    getPropertyCount(userId: string): Promise<number>;
    canAddProperty(userId: string): Promise<boolean>;
    getUsageLimits(userId: string): Promise<{
        properties: {
            used: number;
            limit: number;
        };
        planName: string;
        canUpgrade: boolean;
    }>;
    updateSubscriptionStatus(userId: string, status: Subscription['status']): Promise<Subscription>;
    getUserSubscriptionWithPlan(userId: string): Promise<{
        subscription: Subscription | null;
        plan: Plan | null;
    }>;
    calculateUsageMetrics(userId: string): Promise<{
        properties: number;
        tenants: number;
    }>;
    getPlanById(planId: PlanType): Promise<Plan | null>;
    updateSubscriptionFromStripe(userId: string, planType: PlanType, stripeSubscriptionId: string, status?: Subscription['status']): Promise<Subscription>;
    updateSubscriptionCancellation(userId: string, cancelAtPeriodEnd: boolean, canceledAt?: Date): Promise<Subscription>;
}
//# sourceMappingURL=subscriptions.service.d.ts.map