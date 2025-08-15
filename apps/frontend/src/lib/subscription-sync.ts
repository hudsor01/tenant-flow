/**
 * Subscription State Synchronization
 * 
 * This module handles real-time synchronization of user subscription state
 * between Stripe, Supabase, and the frontend application.
 */

import { useEffect } from 'react'
import { createClient } from './supabase/client'
import { usePricingStore } from '../stores/pricing-store'
import { useAuthStore } from '../stores/auth-store'

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

  private _debug(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SubscriptionSync]', ...args);
    }
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
      // Fetch subscription from backend API (not Supabase directly)
      const response = await fetch('/api/subscriptions/current', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No active subscription
          usePricingStore.getState().clearSubscription();
          return null;
        }
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }

      const { subscription } = await response.json();

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
        items: subscription.items?.map((item: unknown) => {
          const typedItem = item as Record<string, unknown>;
          return {
            id: typedItem.id as string,
            price_id: (typedItem.price as Record<string, unknown>)?.id as string || typedItem.price_id as string,
            product_id: ((typedItem.price as Record<string, unknown>)?.product as Record<string, unknown>)?.id as string || typedItem.product_id as string,
            quantity: typedItem.quantity as number,
          };
        }) || [],
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
  async syncUsageMetrics(_userId: string): Promise<UsageMetrics | null> {
    try {
      // Fetch usage metrics from backend API
      const response = await fetch('/api/subscriptions/usage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage metrics: ${response.statusText}`);
      }

      const { metrics } = await response.json();

      const usageMetrics: UsageMetrics = {
        properties_count: metrics.properties_count ?? 0,
        units_count: metrics.units_count ?? 0,
        tenants_count: metrics.tenants_count ?? 0,
        team_members_count: metrics.team_members_count ?? 0,
        storage_gb: metrics.storage_gb ?? 0,
        api_calls_this_month: metrics.api_calls_this_month ?? 0,
        last_updated: new Date(metrics.last_updated ?? Date.now()),
      };

      // Update store
      usePricingStore.getState().setUsageMetrics(usageMetrics);

      return usageMetrics;
    } catch (error) {
      console.error('Usage metrics sync error:', error);
      return null;
    }
  }

  /**
   * Setup realtime subscription updates
   * Note: Since frontend uses backend API, realtime sync is handled via polling
   */
  private async setupRealtimeSync(_userId: string): Promise<void> {
    // For now, we rely on polling since frontend goes through backend API
    // Future: Could implement WebSocket connection to backend for real-time updates
    this._debug('Realtime sync setup - using polling mode via backend API');
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
    
    // Clear any realtime references
    this.realtimeChannel = undefined;
  }
}

// Export singleton instance
export const subscriptionSync = SubscriptionSyncService.getInstance();

// Hook for React components
export function useSubscriptionSync() {
  const { user } = useAuthStore();
  const { subscription, usageMetrics } = usePricingStore();

  useEffect(() => {
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