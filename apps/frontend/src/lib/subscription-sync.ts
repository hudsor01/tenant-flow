/**
 * Subscription State Synchronization
 * 
 * This module handles real-time synchronization of user subscription state
 * between Stripe, Supabase, and the frontend application.
 */

import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePricingStore } from '@/stores/pricing-store'
import { useAuthStore } from '@/stores/auth-store'

export interface SubscriptionSyncConfig {
  pollingInterval?: number; // ms, default 5 minutes
  enableRealtime?: boolean; // Enable Supabase realtime updates
  enableWebhooks?: boolean; // Enable webhook processing
}

export interface SubscriptionState {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  ended_at?: Date;
  trial_start?: Date;
  trial_end?: Date;
  items: SubscriptionItem[];
  metadata?: Record<string, unknown>;
}

export interface SubscriptionItem {
  id: string;
  price_id: string;
  product_id: string;
  quantity: number;
}

export interface UsageMetrics {
  properties_count: number;
  units_count: number;
  tenants_count: number;
  team_members_count: number;
  storage_gb: number;
  api_calls_this_month: number;
  last_updated: Date;
}

class SubscriptionSyncService {
  private static instance: SubscriptionSyncService;
  private config: Required<SubscriptionSyncConfig>;
  private pollingTimer?: NodeJS.Timeout;
  private realtimeChannel?: unknown;
  private supabase = createClient();

  private constructor(config?: SubscriptionSyncConfig) {
    this.config = {
      pollingInterval: config?.pollingInterval ?? 5 * 60 * 1000, // 5 minutes
      enableRealtime: config?.enableRealtime ?? true,
      enableWebhooks: config?.enableWebhooks ?? true,
    };
  }

  static getInstance(config?: SubscriptionSyncConfig): SubscriptionSyncService {
    if (!SubscriptionSyncService.instance) {
      SubscriptionSyncService.instance = new SubscriptionSyncService(config);
    }
    return SubscriptionSyncService.instance;
  }

  /**
   * Initialize subscription synchronization
   */
  async initialize(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required for subscription sync');
    }

    // Initial fetch
    await this.syncSubscription(userId);

    // Setup polling
    if (this.config.pollingInterval > 0) {
      this.startPolling(userId);
    }

    // Setup realtime subscriptions
    if (this.config.enableRealtime) {
      await this.setupRealtimeSync(userId);
    }
  }

  /**
   * Sync subscription state from backend
   */
  async syncSubscription(userId: string): Promise<SubscriptionState | null> {
    try {
      // Fetch subscription from Supabase (via foreign data wrapper)
      const { data: subscription, error } = await this.supabase
        .from('stripe_subscriptions')
        .select(`
          *,
          items:stripe_subscription_items(
            id,
            price:stripe_prices(
              id,
              product:stripe_products(
                id,
                name,
                metadata
              ),
              unit_amount,
              currency,
              recurring
            ),
            quantity
          )
        `)
        .eq('customer', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Failed to fetch subscription:', error);
        return null;
      }

      if (!subscription) {
        // User has no active subscription
        usePricingStore.getState().clearSubscription();
        return null;
      }

      // Transform to our format
      const subscriptionState: SubscriptionState = {
        id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        items: subscription.items.map((item: unknown) => ({
          id: (item as unknown as {id: string; price: {id: string; product: {id: string}}; quantity: number}).id,
          price_id: (item as unknown as {id: string; price: {id: string; product: {id: string}}; quantity: number}).price.id,
          product_id: (item as unknown as {id: string; price: {id: string; product: {id: string}}; quantity: number}).price.product.id,
          quantity: (item as unknown as {id: string; price: {id: string; product: {id: string}}; quantity: number}).quantity,
        })),
        metadata: subscription.metadata,
      };

      // Update store
      usePricingStore.getState().setSubscription(subscriptionState);

      // Also sync usage metrics
      await this.syncUsageMetrics(userId);

      return subscriptionState;
    } catch (error) {
      console.error('Subscription sync error:', error);
      return null;
    }
  }

  /**
   * Sync usage metrics from backend
   */
  async syncUsageMetrics(userId: string): Promise<UsageMetrics | null> {
    try {
      const { data: org } = await this.supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (!org?.organization_id) {
        return null;
      }

      // Fetch usage metrics
      const [properties, units, tenants, teamMembers, storage] = await Promise.all([
        this.supabase
          .from('properties')
          .select('id', { count: 'exact' })
          .eq('organization_id', org.organization_id),
        this.supabase
          .from('units')
          .select('id', { count: 'exact' })
          .eq('organization_id', org.organization_id),
        this.supabase
          .from('tenants')
          .select('id', { count: 'exact' })
          .eq('organization_id', org.organization_id),
        this.supabase
          .from('organization_members')
          .select('id', { count: 'exact' })
          .eq('organization_id', org.organization_id),
        this.supabase
          .rpc('get_organization_storage_usage', { org_id: org.organization_id })
      ]);

      const metrics: UsageMetrics = {
        properties_count: properties.count ?? 0,
        units_count: units.count ?? 0,
        tenants_count: tenants.count ?? 0,
        team_members_count: teamMembers.count ?? 0,
        storage_gb: storage.data?.[0]?.storage_gb ?? 0,
        api_calls_this_month: 0, // TODO: Implement API call tracking
        last_updated: new Date(),
      };

      // Update store
      usePricingStore.getState().setUsageMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error('Usage metrics sync error:', error);
      return null;
    }
  }

  /**
   * Setup realtime subscription updates
   */
  private async setupRealtimeSync(userId: string): Promise<void> {
    // Clean up existing channel
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
    }

    // Create new channel for subscription updates
    this.realtimeChannel = this.supabase
      .channel(`subscription:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stripe_subscriptions',
          filter: `customer=eq.${userId}`,
        },
        (payload: unknown) => {
          console.log('Subscription update received:', payload);
          this.syncSubscription(userId);
        }
      )
      .subscribe();
  }

  /**
   * Start polling for subscription updates
   */
  private startPolling(userId: string): void {
    this.stopPolling();
    
    this.pollingTimer = setInterval(() => {
      this.syncSubscription(userId);
    }, this.config.pollingInterval);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  /**
   * Handle subscription upgrade
   */
  async upgradeSubscription(newPriceId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price_id: newPriceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade subscription');
      }

      const { subscription } = await response.json();
      
      // Update local state
      usePricingStore.getState().setSubscription(subscription);
      
      return true;
    } catch (error) {
      console.error('Subscription upgrade error:', error);
      return false;
    }
  }

  /**
   * Handle subscription downgrade
   */
  async downgradeSubscription(newPriceId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/subscriptions/downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price_id: newPriceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to downgrade subscription');
      }

      const { subscription } = await response.json();
      
      // Update local state
      usePricingStore.getState().setSubscription(subscription);
      
      return true;
    } catch (error) {
      console.error('Subscription downgrade error:', error);
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(immediately = false): Promise<boolean> {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ immediately }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const { subscription } = await response.json();
      
      // Update local state
      if (subscription) {
        usePricingStore.getState().setSubscription(subscription);
      } else {
        usePricingStore.getState().clearSubscription();
      }
      
      return true;
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      return false;
    }
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(): Promise<boolean> {
    try {
      const response = await fetch('/api/subscriptions/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to resume subscription');
      }

      const { subscription } = await response.json();
      
      // Update local state
      usePricingStore.getState().setSubscription(subscription);
      
      return true;
    } catch (error) {
      console.error('Subscription resume error:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopPolling();
    
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }
}

// Export singleton instance
export const subscriptionSync = SubscriptionSyncService.getInstance();

// Hook for React components
export function useSubscriptionSync() {
  const { user } = useAuthStore();
  const { subscription, usageMetrics } = usePricingStore();

  React.useEffect(() => {
    if (user?.id) {
      subscriptionSync.initialize(user.id);
    }

    return () => {
      subscriptionSync.cleanup();
    };
  }, [user?.id]);

  return {
    subscription,
    usageMetrics,
    upgradeSubscription: subscriptionSync.upgradeSubscription,
    downgradeSubscription: subscriptionSync.downgradeSubscription,
    cancelSubscription: subscriptionSync.cancelSubscription,
    resumeSubscription: subscriptionSync.resumeSubscription,
    syncNow: () => user?.id ? subscriptionSync.syncSubscription(user.id) : Promise.resolve(null),
  };
}