import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'

type StripeCustomer = Record<string, unknown>
type StripeSubscription = Record<string, unknown>
type StripePaymentIntent = Record<string, unknown>

/**
 * Billing Service - Handles all database operations for Stripe billing entities
 *
 * Manages customer linking, subscription tracking, and payment records
 * following official Stripe documentation patterns.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Query Stripe customer from synced stripe schema (read-only)
   * The Stripe Sync Engine automatically syncs all customers to stripe.customers table
   */
  async getStripeCustomer(
    stripeCustomerId: string
  ): Promise<StripeCustomer | null> {
    const client = this.supabase.getAdminClient()
    // Stripe schema tables are synced at runtime but not in generated types
    const result = await (client
      .from('stripe.customers' as any) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('*')
      .eq('id', stripeCustomerId)
      .single()

    if (result.error && result.error.code !== 'PGRST116') {
      this.logger.error('Failed to get customer:', result.error)
      throw result.error
    }

    return result.data as StripeCustomer | null
  }

  /**
   * Find Stripe customer by owner ID
   * Links owner_id to their Stripe customer via users table
   */
  async findCustomerByOwnerId(
    ownerId: string
  ): Promise<StripeCustomer | null> {
    const { data: user, error } = await this.supabase
      .getAdminClient()
      .from('users')
      .select('stripe_customer_id')
      .eq('id', ownerId)
      .single()

    if (error || !user?.stripe_customer_id) {
      this.logger.warn('No stripe customer found for owner:', ownerId)
      return null
    }

    return this.getStripeCustomer(user.stripe_customer_id as string)
  }

  /**
   * Find Stripe customer by tenant ID
   * Links tenant_id to their Stripe customer via tenants table
   */
  async findCustomerByTenantId(
    tenantId: string
  ): Promise<StripeCustomer | null> {
    const { data: tenant, error } = await this.supabase
      .getAdminClient()
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', tenantId)
      .single()

    if (error || !tenant?.stripe_customer_id) {
      this.logger.warn('No stripe customer found for tenant:', tenantId)
      return null
    }

    return this.getStripeCustomer(tenant.stripe_customer_id as string)
  }

  /**
   * Link owner to their Stripe customer
   * Stores mapping in users table
   */
  async linkCustomerToOwner(
    stripeCustomerId: string,
    ownerId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .getAdminClient()
      .from('users')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', ownerId)

    if (error) {
      this.logger.error('Failed to link customer to owner:', error)
      throw error
    }
  }

  /**
   * Link tenant to their Stripe customer
   * Stores mapping in tenants table
   */
  async linkCustomerToTenant(
    stripeCustomerId: string,
    tenantId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .getAdminClient()
      .from('tenants')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)

    if (error) {
      this.logger.error('Failed to link customer to tenant:', error)
      throw error
    }
  }

  /**
   * Find subscription by Stripe subscription ID (read-only from stripe schema)
   * The Stripe Sync Engine automatically syncs all subscriptions
   */
  async findSubscriptionByStripeId(
    stripeSubscriptionId: string
  ): Promise<StripeSubscription | null> {
    const client = this.supabase.getAdminClient()
    // Stripe schema tables are synced at runtime but not in generated types
    const result = await (client
      .from('stripe.subscriptions' as any) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('*')
      .eq('id', stripeSubscriptionId)
      .single()

    if (result.error && result.error.code !== 'PGRST116') {
      this.logger.error('Failed to find subscription:', result.error)
      throw result.error
    }

    return result.data as StripeSubscription | null
  }

  /**
   * Find all subscriptions for a customer (read-only)
   * Returns all subscriptions synced by Stripe Sync Engine
   */
  async findSubscriptionsByCustomerId(
    stripeCustomerId: string
  ): Promise<StripeSubscription[]> {
    const client = this.supabase.getAdminClient()
    // Stripe schema tables are synced at runtime but not in generated types
    const result = await (client
      .from('stripe.subscriptions' as any) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('*')
      .eq('customer', stripeCustomerId)

    if (result.error) {
      this.logger.error('Failed to find subscriptions by customer:', result.error)
      throw result.error
    }

    return (result.data as StripeSubscription[]) || []
  }

  /**
   * Find payment intent by Stripe payment intent ID (read-only)
   * The Stripe Sync Engine automatically syncs all payment intents
   */
  async findPaymentIntentByStripeId(
    stripePaymentIntentId: string
  ): Promise<StripePaymentIntent | null> {
    const client = this.supabase.getAdminClient()
    // Stripe schema tables are synced at runtime but not in generated types
    const result = await (client
      .from('stripe.payment_intents' as any) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('*')
      .eq('id', stripePaymentIntentId)
      .single()

    if (result.error && result.error.code !== 'PGRST116') {
      this.logger.error('Failed to find payment intent:', result.error)
      throw result.error
    }

    return result.data as StripePaymentIntent | null
  }
}
