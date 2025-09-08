import { Injectable, Optional } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { PinoLogger } from 'nestjs-pino'

/**
 * Stripe Data Service
 * 
 * Ultra-native data access layer for querying stripe.* tables
 * Following Phase 4 of Stripe Sync Engine Integration Plan
 * Direct SQL queries with advanced analytics capabilities
 */

export interface StripeCustomerSubscription {
  id: string
  customer: string
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  current_period_start: string
  current_period_end: string
  created: string
  canceled_at?: string
  customer_data?: {
    id: string
    email: string
    name?: string
    created: string
  }
  price_data?: {
    id: string
    unit_amount: number
    currency: string
    recurring: {
      interval: 'month' | 'year'
      interval_count: number
    }
  }
  product_data?: {
    id: string
    name: string
    description?: string
  }
}

export interface RevenueAnalytics {
  period: string
  total_revenue: number
  subscription_revenue: number
  one_time_revenue: number
  customer_count: number
  new_customers: number
  churned_customers: number
  mrr: number
  arr: number
}

export interface ChurnAnalytics {
  month: string
  churned_subscriptions: number
  avg_lifetime_days: number
  churn_rate_percent: number
  total_active_start_month: number
}

export interface CustomerLifetimeValue {
  customer_id: string
  email: string
  total_revenue: number
  subscription_count: number
  first_subscription_date: string
  last_cancellation_date?: string
  avg_revenue_per_subscription: number
  status: 'Active' | 'Churned'
  lifetime_days?: number
}

@Injectable()
export class StripeDataService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Optional() private readonly logger?: PinoLogger
  ) {
    this.logger?.setContext(StripeDataService.name)
  }

  /**
   * Get customer subscriptions with full relationship data
   * Direct SQL queries against stripe.* tables (Ultra-native)
   */
  async getCustomerSubscriptions(customerId: string): Promise<StripeCustomerSubscription[]> {
    try {
      this.logger?.info('Fetching customer subscriptions', { customerId })

      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('stripe.subscriptions')
        .select(`
          id,
          customer,
          status,
          current_period_start,
          current_period_end,
          created,
          canceled_at,
          stripe.customers!inner (
            id,
            email,
            name,
            created
          ),
          stripe.prices (
            id,
            unit_amount,
            currency,
            recurring,
            stripe.products (
              id,
              name,
              description
            )
          )
        `)
        .eq('customer', customerId)
        .order('created', { ascending: false })

      if (error) {
        this.logger?.error('Failed to fetch customer subscriptions', { error, customerId })
        throw error
      }

      // Transform the data to match our interface
      return (data || []).map(sub => ({
        id: sub.id,
        customer: sub.customer,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        created: sub.created,
        canceled_at: sub.canceled_at,
        customer_data: (sub as any)['stripe.customers'],
        price_data: sub['stripe.prices'],
        product_data: sub['stripe.prices']?.['stripe.products']
      }))
    } catch (error) {
      this.logger?.error('Error fetching customer subscriptions:', error)
      throw error
    }
  }

  /**
   * Get revenue analytics for date range
   * Advanced SQL analytics with complex calculations
   */
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<RevenueAnalytics[]> {
    try {
      this.logger?.info('Calculating revenue analytics', { startDate, endDate })

      // Complex SQL query for revenue analytics
      const query = `
        WITH monthly_revenue AS (
          SELECT 
            DATE_TRUNC('month', created) as period,
            SUM(CASE WHEN amount_paid > 0 THEN amount_paid / 100.0 ELSE 0 END) as total_revenue,
            COUNT(DISTINCT customer) as customer_count,
            COUNT(*) FILTER (WHERE billing_reason = 'subscription_create') as new_customers,
            COUNT(*) FILTER (WHERE billing_reason = 'subscription_cycle') as recurring_revenue_invoices
          FROM stripe.invoices 
          WHERE created BETWEEN $1 AND $2
            AND status = 'paid'
          GROUP BY DATE_TRUNC('month', created)
        ),
        subscription_metrics AS (
          SELECT 
            DATE_TRUNC('month', created) as period,
            COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
            COUNT(*) FILTER (WHERE created BETWEEN $1 AND $2) as new_subscriptions,
            COUNT(*) FILTER (WHERE canceled_at BETWEEN $1 AND $2) as churned_subscriptions
          FROM stripe.subscriptions
          GROUP BY DATE_TRUNC('month', created)
        )
        SELECT 
          mr.period::text,
          COALESCE(mr.total_revenue, 0) as total_revenue,
          COALESCE(mr.total_revenue, 0) as subscription_revenue, -- Simplified for now
          0 as one_time_revenue, -- TODO: Calculate from one-time payments
          COALESCE(mr.customer_count, 0) as customer_count,
          COALESCE(mr.new_customers, 0) as new_customers,
          COALESCE(sm.churned_subscriptions, 0) as churned_customers,
          COALESCE(mr.total_revenue, 0) as mrr, -- Monthly Recurring Revenue
          COALESCE(mr.total_revenue * 12, 0) as arr -- Annual Recurring Revenue
        FROM monthly_revenue mr
        LEFT JOIN subscription_metrics sm ON mr.period = sm.period
        ORDER BY mr.period;
      `

      const { data, error } = await this.supabaseService
        .getAdminClient()
        .rpc('execute_sql', { 
          query,
          params: [startDate.toISOString(), endDate.toISOString()]
        })

      if (error) {
        this.logger?.error('Failed to calculate revenue analytics', { error })
        throw error
      }

      return data || []
    } catch (error) {
      this.logger?.error('Error calculating revenue analytics:', error)
      throw error
    }
  }

  /**
   * Get churn analytics with cohort analysis
   * Complex SQL for understanding customer lifecycle
   */
  async getChurnAnalytics(): Promise<ChurnAnalytics[]> {
    try {
      this.logger?.info('Calculating churn analytics')

      const query = `
        WITH monthly_churn AS (
          SELECT 
            DATE_TRUNC('month', canceled_at) as month,
            COUNT(*) as churned_subscriptions,
            AVG(EXTRACT(EPOCH FROM (canceled_at - created)) / 86400) as avg_lifetime_days
          FROM stripe.subscriptions 
          WHERE canceled_at IS NOT NULL
            AND canceled_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', canceled_at)
        ),
        monthly_active AS (
          SELECT 
            DATE_TRUNC('month', canceled_at) as month,
            COUNT(*) as active_at_start
          FROM stripe.subscriptions 
          WHERE created < DATE_TRUNC('month', canceled_at)
            AND (canceled_at IS NULL OR canceled_at >= DATE_TRUNC('month', canceled_at))
          GROUP BY DATE_TRUNC('month', canceled_at)
        )
        SELECT 
          mc.month::text,
          mc.churned_subscriptions,
          ROUND(mc.avg_lifetime_days::numeric, 1) as avg_lifetime_days,
          CASE 
            WHEN ma.active_at_start > 0 
            THEN ROUND((mc.churned_subscriptions::numeric / ma.active_at_start::numeric) * 100, 2)
            ELSE 0
          END as churn_rate_percent,
          COALESCE(ma.active_at_start, 0) as total_active_start_month
        FROM monthly_churn mc
        LEFT JOIN monthly_active ma ON mc.month = ma.month
        ORDER BY mc.month DESC;
      `

      const { data, error } = await this.supabaseService
        .getAdminClient()
        .rpc('execute_sql', { query })

      if (error) {
        this.logger?.error('Failed to calculate churn analytics', { error })
        throw error
      }

      return data || []
    } catch (error) {
      this.logger?.error('Error calculating churn analytics:', error)
      throw error
    }
  }

  /**
   * Calculate Customer Lifetime Value with advanced metrics
   * Comprehensive customer value analysis
   */
  async getCustomerLifetimeValue(): Promise<CustomerLifetimeValue[]> {
    try {
      this.logger?.info('Calculating customer lifetime value')

      const query = `
        WITH customer_revenue AS (
          SELECT 
            c.id as customer_id,
            c.email,
            COALESCE(SUM(i.amount_paid / 100.0), 0) as total_revenue,
            COUNT(DISTINCT s.id) as subscription_count,
            MIN(s.created) as first_subscription_date,
            MAX(s.canceled_at) as last_cancellation_date,
            MAX(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as has_active_subscription
          FROM stripe.customers c
          LEFT JOIN stripe.subscriptions s ON s.customer = c.id  
          LEFT JOIN stripe.invoices i ON i.customer = c.id AND i.status = 'paid'
          GROUP BY c.id, c.email
        )
        SELECT 
          customer_id,
          email,
          total_revenue,
          subscription_count,
          first_subscription_date::text,
          last_cancellation_date::text,
          CASE 
            WHEN subscription_count > 0 
            THEN ROUND(total_revenue / subscription_count, 2)
            ELSE 0 
          END as avg_revenue_per_subscription,
          CASE 
            WHEN has_active_subscription = 1 THEN 'Active'
            ELSE 'Churned'
          END as status,
          CASE 
            WHEN last_cancellation_date IS NOT NULL AND first_subscription_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (last_cancellation_date - first_subscription_date)) / 86400
            ELSE NULL
          END as lifetime_days
        FROM customer_revenue
        WHERE subscription_count > 0  -- Only customers with subscriptions
        ORDER BY total_revenue DESC;
      `

      const { data, error } = await this.supabaseService
        .getAdminClient()
        .rpc('execute_sql', { query })

      if (error) {
        this.logger?.error('Failed to calculate customer lifetime value', { error })
        throw error
      }

      return data || []
    } catch (error) {
      this.logger?.error('Error calculating customer lifetime value:', error)
      throw error
    }
  }

  /**
   * Get monthly recurring revenue (MRR) trend
   * Critical SaaS metric calculation
   */
  async getMRRTrend(months = 12): Promise<Array<{ month: string; mrr: number; active_subscriptions: number }>> {
    try {
      this.logger?.info('Calculating MRR trend', { months })

      const query = `
        SELECT 
          DATE_TRUNC('month', current_period_start)::text as month,
          COUNT(*) as active_subscriptions,
          COALESCE(SUM(
            CASE 
              WHEN p.recurring->>'interval' = 'month' 
              THEN p.unit_amount / 100.0
              WHEN p.recurring->>'interval' = 'year'
              THEN (p.unit_amount / 100.0) / 12  -- Convert annual to monthly
              ELSE 0
            END
          ), 0) as mrr
        FROM stripe.subscriptions s
        JOIN stripe.subscription_items si ON si.subscription = s.id
        JOIN stripe.prices p ON p.id = si.price
        WHERE s.status = 'active'
          AND current_period_start >= NOW() - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', current_period_start)
        ORDER BY month;
      `

      const { data, error } = await this.supabaseService
        .getAdminClient()
        .rpc('execute_sql', { query })

      if (error) {
        this.logger?.error('Failed to calculate MRR trend', { error })
        throw error
      }

      return data || []
    } catch (error) {
      this.logger?.error('Error calculating MRR trend:', error)
      throw error
    }
  }

  /**
   * Get subscription status breakdown
   * Current state analysis
   */
  async getSubscriptionStatusBreakdown(): Promise<Record<string, number>> {
    try {
      this.logger?.info('Getting subscription status breakdown')

      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('stripe.subscriptions')
        .select('status')

      if (error) {
        this.logger?.error('Failed to get subscription status breakdown', { error })
        throw error
      }

      // Count by status
      const breakdown = (data || []).reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return breakdown
    } catch (error) {
      this.logger?.error('Error getting subscription status breakdown:', error)
      throw error
    }
  }

  /**
   * Health check for Stripe data access
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple query to test stripe.* table access
      const { error } = await this.supabaseService
        .getAdminClient()
        .from('stripe.customers')
        .select('count')
        .limit(1)

      return !error
    } catch (error) {
      this.logger?.error('Stripe data service health check failed:', error)
      return false
    }
  }
}