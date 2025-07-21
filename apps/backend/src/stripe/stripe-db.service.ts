import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * StripeDBService - Uses Supabase foreign data wrapper to query Stripe data
 * This is more efficient than direct API calls and provides better caching
 */
@Injectable()
export class StripeDBService {
    private readonly logger = new Logger(StripeDBService.name)

    constructor(private readonly prisma: PrismaService) {
        this.logger.log('StripeDBService initialized with foreign data wrapper')
    }

    /**
     * Get Stripe customer by ID using foreign table
     */
    async getCustomer(customerId: string) {
        try {
            const result = await this.prisma.$queryRaw<{
                id: string
                created: number
                email: string
                name: string | null
                description: string | null
                metadata: any
                attrs: any
            }[]>`
                SELECT id, created, email, name, description, metadata, attrs
                FROM stripe_customers
                WHERE id = ${customerId}
                LIMIT 1
            `

            return result[0] || null
        } catch (error) {
            this.logger.error('Failed to get customer from Stripe foreign table:', error)
            return null
        }
    }

    /**
     * Get all customers with optional filtering
     */
    async getCustomers(limit = 100, email?: string) {
        try {
            if (email) {
                // Use parameterized query for email filter
                const result = await this.prisma.$queryRaw<{
                    id: string
                    created: number
                    email: string
                    name: string | null
                    description: string | null
                    metadata: any
                }[]>`
                    SELECT id, created, email, name, description, metadata
                    FROM stripe_customers
                    WHERE email = ${email}
                    ORDER BY created DESC
                    LIMIT ${limit}
                `
                return result
            } else {
                // Use parameterized query without WHERE clause
                const result = await this.prisma.$queryRaw<{
                    id: string
                    created: number
                    email: string
                    name: string | null
                    description: string | null
                    metadata: any
                }[]>`
                    SELECT id, created, email, name, description, metadata
                    FROM stripe_customers
                    ORDER BY created DESC
                    LIMIT ${limit}
                `
                return result
            }
        } catch (error) {
            this.logger.error('Failed to get customers from Stripe foreign table:', error)
            return []
        }
    }

    /**
     * Get customer's active subscriptions
     */
    async getCustomerSubscriptions(customerId: string) {
        try {
            const result = await this.prisma.$queryRaw<{
                id: string
                customer: string
                status: string
                current_period_start: number
                current_period_end: number
                trial_start: number | null
                trial_end: number | null
                cancel_at: number | null
                canceled_at: number | null
                created: number
                metadata: any
            }[]>`
                SELECT 
                    id, customer, status, 
                    current_period_start, current_period_end,
                    trial_start, trial_end,
                    cancel_at, canceled_at,
                    created, metadata
                FROM stripe_subscriptions
                WHERE customer = ${customerId}
                ORDER BY created DESC
            `

            return result
        } catch (error) {
            this.logger.error('Failed to get customer subscriptions:', error)
            return []
        }
    }

    /**
     * Get subscription by ID
     */
    async getSubscription(subscriptionId: string) {
        try {
            const result = await this.prisma.$queryRaw<{
                id: string
                customer: string
                status: string
                current_period_start: number
                current_period_end: number
                trial_start: number | null
                trial_end: number | null
                cancel_at: number | null
                canceled_at: number | null
                created: number
                metadata: any
            }[]>`
                SELECT 
                    id, customer, status, 
                    current_period_start, current_period_end,
                    trial_start, trial_end,
                    cancel_at, canceled_at,
                    created, metadata
                FROM stripe_subscriptions
                WHERE id = ${subscriptionId}
                LIMIT 1
            `

            return result[0] || null
        } catch (error) {
            this.logger.error('Failed to get subscription from Stripe foreign table:', error)
            return null
        }
    }

    /**
     * Get all active subscriptions
     */
    async getActiveSubscriptions(limit = 100) {
        try {
            const result = await this.prisma.$queryRaw<{
                id: string
                customer: string
                customer_email: string
                customer_name: string | null
                status: string
                current_period_start: number
                current_period_end: number
                trial_end: number | null
                created: number
            }[]>`
                SELECT 
                    s.id, s.customer, c.email as customer_email, c.name as customer_name,
                    s.status, s.current_period_start, s.current_period_end,
                    s.trial_end, s.created
                FROM stripe_subscriptions s
                JOIN stripe_customers c ON s.customer = c.id
                WHERE s.status IN ('active', 'trialing', 'past_due')
                ORDER BY s.created DESC
                LIMIT ${limit}
            `

            return result
        } catch (error) {
            this.logger.error('Failed to get active subscriptions:', error)
            return []
        }
    }

    /**
     * Get all products
     */
    async getProducts(activeOnly = true) {
        try {
            if (activeOnly) {
                // Use parameterized query for active products
                const result = await this.prisma.$queryRaw<{
                    id: string
                    name: string
                    description: string | null
                    active: boolean
                    metadata: any
                    created: number
                    updated: number
                }[]>`
                    SELECT id, name, description, active, metadata, created, updated
                    FROM stripe_products
                    WHERE active = true
                    ORDER BY created DESC
                `
                return result
            } else {
                // Use parameterized query for all products
                const result = await this.prisma.$queryRaw<{
                    id: string
                    name: string
                    description: string | null
                    active: boolean
                    metadata: any
                    created: number
                    updated: number
                }[]>`
                    SELECT id, name, description, active, metadata, created, updated
                    FROM stripe_products
                    ORDER BY created DESC
                `
                return result
            }
        } catch (error) {
            this.logger.error('Failed to get products:', error)
            return []
        }
    }

    /**
     * Get prices for a product
     */
    async getProductPrices(productId: string) {
        try {
            const result = await this.prisma.$queryRaw<{
                id: string
                product: string
                currency: string
                unit_amount: number
                recurring: any
                active: boolean
                metadata: any
                created: number
            }[]>`
                SELECT 
                    id, product, currency, unit_amount, recurring, 
                    active, metadata, created
                FROM stripe_prices
                WHERE product = ${productId} AND active = true
                ORDER BY created DESC
            `

            return result
        } catch (error) {
            this.logger.error('Failed to get product prices:', error)
            return []
        }
    }

    /**
     * Get all active prices
     */
    async getActivePrices(limit = 100) {
        try {
            const result = await this.prisma.$queryRaw<{
                id: string
                product: string
                currency: string
                unit_amount: number
                recurring: any
                active: boolean
                metadata: any
                created: number
            }[]>`
                SELECT 
                    id, product, currency, unit_amount, recurring, 
                    active, metadata, created
                FROM stripe_prices
                WHERE active = true
                ORDER BY created DESC
                LIMIT ${limit}
            `

            return result
        } catch (error) {
            this.logger.error('Failed to get active prices:', error)
            return []
        }
    }

    /**
     * Check if customer exists in Stripe
     */
    async customerExists(customerId: string): Promise<boolean> {
        try {
            const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*) as count
                FROM stripe_customers
                WHERE id = ${customerId}
            `

            return Number(result[0]?.count || 0) > 0
        } catch (error) {
            this.logger.error('Failed to check customer existence:', error)
            return false
        }
    }

    /**
     * Get subscription counts by status
     */
    async getSubscriptionStats() {
        try {
            const result = await this.prisma.$queryRaw<{
                status: string
                count: bigint
            }[]>`
                SELECT status, COUNT(*) as count
                FROM stripe_subscriptions
                GROUP BY status
                ORDER BY count DESC
            `

            return result.map(row => ({
                status: row.status,
                count: Number(row.count)
            }))
        } catch (error) {
            this.logger.error('Failed to get subscription stats:', error)
            return []
        }
    }

    /**
     * Get recent subscription activity
     */
    async getRecentSubscriptionActivity(days = 30, limit = 100) {
        try {
            const cutoffTimestamp = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
            
            const result = await this.prisma.$queryRaw<{
                id: string
                customer: string
                customer_email: string
                status: string
                created: number
                current_period_start: number
                current_period_end: number
            }[]>`
                SELECT 
                    s.id, s.customer, c.email as customer_email,
                    s.status, s.created, s.current_period_start, s.current_period_end
                FROM stripe_subscriptions s
                JOIN stripe_customers c ON s.customer = c.id
                WHERE s.created >= ${cutoffTimestamp}
                ORDER BY s.created DESC
                LIMIT ${limit}
            `

            return result
        } catch (error) {
            this.logger.error('Failed to get recent subscription activity:', error)
            return []
        }
    }

    /**
     * Health check - test the foreign table connection
     */
    async healthCheck(): Promise<{ 
        connected: boolean
        customerCount?: number
        subscriptionCount?: number
        productCount?: number
        error?: string 
    }> {
        try {
            const [customerCount, subscriptionCount, productCount] = await Promise.all([
                this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM stripe_customers`,
                this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM stripe_subscriptions`,
                this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM stripe_products`
            ])

            return {
                connected: true,
                customerCount: Number(customerCount[0]?.count || 0),
                subscriptionCount: Number(subscriptionCount[0]?.count || 0),
                productCount: Number(productCount[0]?.count || 0)
            }
        } catch (error) {
            this.logger.error('Stripe foreign table health check failed:', error)
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
}