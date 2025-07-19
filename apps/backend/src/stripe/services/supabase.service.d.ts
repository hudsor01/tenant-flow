import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
interface SubscriptionUpdate {
    status?: string;
    plan?: string;
    startDate?: string;
    endDate?: string | null;
    cancelledAt?: string | null;
    cancelAtPeriodEnd?: boolean;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    planId?: string;
    billingPeriod?: string;
    updatedAt?: string;
}
interface CreateSubscriptionData {
    userId: string;
    plan: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId?: string;
    planId?: string;
    billingPeriod?: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare class SupabaseService {
    private configService;
    private readonly supabase;
    constructor(configService: ConfigService);
    getClient(): SupabaseClient;
    getUserById(userId: string): Promise<{
        id: any;
        email: any;
        name: any;
    }>;
    getSubscriptionByUserId(userId: string): Promise<any>;
    updateSubscription(subscriptionId: string, updates: Partial<SubscriptionUpdate>): Promise<any>;
    createSubscription(subscriptionData: CreateSubscriptionData): Promise<any>;
    uploadFile(bucket: string, path: string, file: Buffer, options?: {
        contentType?: string;
        cacheControl?: string;
        upsert?: boolean;
    }): Promise<{
        id: string;
        path: string;
        fullPath: string;
    }>;
    getPublicUrl(bucket: string, path: string): Promise<string>;
    deleteFile(bucket: string, path: string): Promise<boolean>;
    listFiles(bucket: string, folder?: string): Promise<import("@supabase/storage-js").FileObject[]>;
}
export {};
//# sourceMappingURL=supabase.service.d.ts.map