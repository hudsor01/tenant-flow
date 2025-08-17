import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { StripeBillingService } from '../stripe/stripe-billing.service'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { Plan, PlanType } from '@repo/shared'

export type Subscription = Database['public']['Tables']['Subscription']['Row']

@Injectable()
export class SubscriptionsManagerService {
    private readonly logger = new Logger(SubscriptionsManagerService.name)

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly stripeBillingService: StripeBillingService
    ) {}

    async calculateUsageMetrics(_userId: string): Promise<{ properties: number }> {
        // TODO: replace with real calculation from DB or usage store
        return { properties: 0 }
    }

    async getUsageLimits(_userId: string): Promise<{ properties: number | { limit: number } }> {
        // TODO: replace with real lookup from plan definitions / DB
        return { properties: { limit: 0 } }
    }

    getPlanById(_planType: PlanType): Promise<Plan | null> {
        return Promise.resolve(null)
    }

    getSubscription(_userId: string): Promise<Subscription | null> {
        return Promise.resolve(null)
    }

    async getUserSubscription(userId: string): Promise<Subscription | null> {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('Subscription')
                .select('*')
                .eq('userId', userId)
                .single()

            if (error) {
                this.logger.error('Error fetching subscription:', error)
                return null
            }

            return data
        } catch (error) {
            this.logger.error('Failed to get user subscription:', error)
            return null
        }
    }

    async createOrUpdateSubscription(
        userId: string,
        subscriptionData: Partial<Subscription>
    ): Promise<Subscription | null> {
        try {
if (
    subscriptionData.startDate &&
    typeof subscriptionData.startDate !== 'string' &&
    Object.prototype.toString.call(subscriptionData.startDate) === '[object Date]'
) {
    subscriptionData.startDate = (subscriptionData.startDate as Date).toISOString()
}
const { data, error } = await this.supabaseService
    .getClient()
    .from('Subscription')
    .upsert(
        {
            ...subscriptionData,
            status: subscriptionData.status ?? 'ACTIVE',
            userId,
            updatedAt: new Date().toISOString()
        },
        { onConflict: 'userId' }
    )
    .select()
    .single()

            if (error) {
                this.logger.error('Error creating/updating subscription:', error)
                return null
            }

            return data
        } catch (error) {
            this.logger.error('Failed to create/update subscription:', error)
            return null
        }
    }

    async cancelSubscription(userId: string): Promise<boolean> {
        try {
            const subscription = await this.getUserSubscription(userId)
            if (!subscription?.stripeSubscriptionId) {
                return false
            }

            // Cancel in Stripe
            await this.stripeBillingService.cancelSubscription({
                subscriptionId: subscription.stripeSubscriptionId,
                userId
            })

            // Update local record
            await this.createOrUpdateSubscription(userId, {
                status: 'CANCELED',
                canceledAt: new Date().toISOString()
            })

            return true
        } catch (error) {
            this.logger.error('Failed to cancel subscription:', error)
            return false
        }
    }
}
