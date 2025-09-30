import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import {
  IBillingRepository,
  StripeCustomer,
  StripeSubscription,
  StripeProduct,
  StripePrice,
  StripePaymentIntent,
  CustomerQueryOptions,
  SubscriptionQueryOptions,
  ProductQueryOptions,
  PriceQueryOptions,
  PaymentQueryOptions
} from '../interfaces/billing-repository.interface';
import { RepositoryError } from '../interfaces/base-repository.interface';

/**
 * Supabase Billing Repository
 *
 * RESPONSIBILITY: Simple CRUD operations for Stripe data using direct table queries
 * - NO complex calculations or analytics
 * - NO RPC function calls
 * - Direct table access only: supabase.from('table').select()
 */
@Injectable()
export class SupabaseBillingRepository implements IBillingRepository {
  private readonly logger = new Logger(SupabaseBillingRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Customer Management - Simple lookups
  async getCustomer(customerId: string): Promise<StripeCustomer | null> {
    try {
      this.logger.log('Fetching customer via direct table query', { customerId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('stripe_customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        this.logger.error('Failed to fetch customer', { error, customerId });
        throw new RepositoryError('Failed to fetch customer', error);
      }

      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching customer:', error);
      throw new RepositoryError('Failed to fetch customer');
    }
  }

  async getCustomers(options?: CustomerQueryOptions): Promise<StripeCustomer[]> {
    try {
      this.logger.log('Fetching customers via direct table query', { options });

      let query = this.supabase
        .getAdminClient()
        .from('stripe_customers')
        .select('*');

      // Apply filters
      if (options?.search) {
        query = query.or(`email.ilike.%${options.search}%,name.ilike.%${options.search}%`);
      }

      // Apply sorting
      if (options?.sort) {
        query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch customers', { error, options });
        throw new RepositoryError('Failed to fetch customers', error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching customers:', error);
      throw new RepositoryError('Failed to fetch customers');
    }
  }

  // Subscription Management - Basic filtering
  async getSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
    try {
      this.logger.log('Fetching subscription via direct table query', { subscriptionId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('stripe_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        this.logger.error('Failed to fetch subscription', { error, subscriptionId });
        throw new RepositoryError('Failed to fetch subscription', error);
      }

      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching subscription:', error);
      throw new RepositoryError('Failed to fetch subscription');
    }
  }

  async getCustomerSubscriptions(customerId: string): Promise<StripeSubscription[]> {
    try {
      this.logger.log('Fetching customer subscriptions via direct table query', { customerId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to fetch customer subscriptions', { error, customerId });
        throw new RepositoryError('Failed to fetch customer subscriptions', error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching customer subscriptions:', error);
      throw new RepositoryError('Failed to fetch customer subscriptions');
    }
  }

  async getSubscriptions(options?: SubscriptionQueryOptions): Promise<StripeSubscription[]> {
    try {
      this.logger.log('Fetching subscriptions via direct table query', { options });

      let query = this.supabase
        .getAdminClient()
        .from('stripe_subscriptions')
        .select('*');

      // Apply filters
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      // Apply sorting
      if (options?.sort) {
        query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch subscriptions', { error, options });
        throw new RepositoryError('Failed to fetch subscriptions', error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching subscriptions:', error);
      throw new RepositoryError('Failed to fetch subscriptions');
    }
  }

  // Product Catalog - Simple retrieval
  async getProduct(productId: string): Promise<StripeProduct | null> {
    try {
      this.logger.log('Fetching product via direct table query', { productId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('stripe_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        this.logger.error('Failed to fetch product', { error, productId });
        throw new RepositoryError('Failed to fetch product', error);
      }

      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching product:', error);
      throw new RepositoryError('Failed to fetch product');
    }
  }

  async getProducts(options?: ProductQueryOptions): Promise<StripeProduct[]> {
    try {
      this.logger.log('Fetching products via direct table query', { options });

      let query = this.supabase
        .getAdminClient()
        .from('stripe_products')
        .select('*');

      // Apply filters
      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }

      // Apply search
      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      // Apply sorting
      if (options?.sort) {
        query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
      } else {
        query = query.order('name', { ascending: true });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch products', { error, options });
        throw new RepositoryError('Failed to fetch products', error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching products:', error);
      throw new RepositoryError('Failed to fetch products');
    }
  }

  // Price Catalog - Basic filtering
  async getPrice(priceId: string): Promise<StripePrice | null> {
    try {
      this.logger.log('Fetching price via direct table query', { priceId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('stripe_prices')
        .select('*')
        .eq('id', priceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        this.logger.error('Failed to fetch price', { error, priceId });
        throw new RepositoryError('Failed to fetch price', error);
      }

      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching price:', error);
      throw new RepositoryError('Failed to fetch price');
    }
  }

  async getPrices(options?: PriceQueryOptions): Promise<StripePrice[]> {
    try {
      this.logger.log('Fetching prices via direct table query', { options });

      let query = this.supabase
        .getAdminClient()
        .from('stripe_prices')
        .select('*');

      // Apply filters
      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }
      if (options?.productId) {
        query = query.eq('product_id', options.productId);
      }

      // Apply sorting
      if (options?.sort) {
        query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch prices', { error, options });
        throw new RepositoryError('Failed to fetch prices', error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching prices:', error);
      throw new RepositoryError('Failed to fetch prices');
    }
  }

  async getProductPrices(productId: string): Promise<StripePrice[]> {
    return this.getPrices({ productId, active: true });
  }

  // Payment Data - Simple queries
  async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null> {
    try {
      this.logger.log('Fetching payment intent via direct table query', { paymentIntentId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('stripe_payment_intents')
        .select('*')
        .eq('id', paymentIntentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        this.logger.error('Failed to fetch payment intent', { error, paymentIntentId });
        throw new RepositoryError('Failed to fetch payment intent', error);
      }

      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching payment intent:', error);
      throw new RepositoryError('Failed to fetch payment intent');
    }
  }

  async getPaymentIntents(options?: PaymentQueryOptions): Promise<StripePaymentIntent[]> {
    try {
      this.logger.log('Fetching payment intents via direct table query', { options });

      let query = this.supabase
        .getAdminClient()
        .from('stripe_payment_intents')
        .select('*');

      // Apply filters
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.dateRange) {
        query = query
          .gte('createdAt', options.dateRange.start.toISOString())
          .lte('createdAt', options.dateRange.end.toISOString());
      }

      // Apply sorting
      if (options?.sort) {
        query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch payment intents', { error, options });
        throw new RepositoryError('Failed to fetch payment intents', error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error fetching payment intents:', error);
      throw new RepositoryError('Failed to fetch payment intents');
    }
  }

  async getCustomerPayments(customerId: string): Promise<StripePaymentIntent[]> {
    return this.getPaymentIntents({ customerId });
  }

  // Health Check - Simple table query check
  async isHealthy(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .getAdminClient()
        .from('stripe_customers')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      this.logger.error('Billing repository health check failed:', error);
      return false;
    }
  }

  // Count operations - Basic aggregations using direct table queries
  async countCustomers(options?: CustomerQueryOptions): Promise<number> {
    try {
      let query = this.supabase
        .getAdminClient()
        .from('stripe_customers')
        .select('*', { count: 'exact', head: true });

      if (options?.search) {
        query = query.or(`email.ilike.%${options.search}%,name.ilike.%${options.search}%`);
      }

      const { count, error } = await query;

      if (error) {
        this.logger.error('Failed to count customers', { error, options });
        throw new RepositoryError('Failed to count customers', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error counting customers:', error);
      throw new RepositoryError('Failed to count customers');
    }
  }

  async countSubscriptions(options?: SubscriptionQueryOptions): Promise<number> {
    try {
      let query = this.supabase
        .getAdminClient()
        .from('stripe_subscriptions')
        .select('*', { count: 'exact', head: true });

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { count, error } = await query;

      if (error) {
        this.logger.error('Failed to count subscriptions', { error, options });
        throw new RepositoryError('Failed to count subscriptions', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error counting subscriptions:', error);
      throw new RepositoryError('Failed to count subscriptions');
    }
  }

  async countPayments(options?: PaymentQueryOptions): Promise<number> {
    try {
      let query = this.supabase
        .getAdminClient()
        .from('stripe_payment_intents')
        .select('*', { count: 'exact', head: true });

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.dateRange) {
        query = query
          .gte('createdAt', options.dateRange.start.toISOString())
          .lte('createdAt', options.dateRange.end.toISOString());
      }

      const { count, error } = await query;

      if (error) {
        this.logger.error('Failed to count payments', { error, options });
        throw new RepositoryError('Failed to count payments', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.logger.error('Error counting payments:', error);
      throw new RepositoryError('Failed to count payments');
    }
  }
}