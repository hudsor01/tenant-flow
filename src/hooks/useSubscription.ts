import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import type { Subscription, Invoice } from '@/types/subscription';
import { PLANS, getPlanById, checkLimitExceeded } from '@/types/subscription';

// Get user's current subscription
export function useSubscription() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('Subscription')
        .select('*')
        .eq('userId', user.id)
        .eq('status', 'active')
        .single();

      if (error) {
        // If no active subscription found, user is on free plan
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as Subscription;
    },
    enabled: !!user?.id,
  });
}

// Get user's current plan with limits
export function useUserPlan() {
  const { data: subscription } = useSubscription();

  return useQuery({
    queryKey: ['user-plan', subscription?.planId],
    queryFn: async () => {
      const planId = subscription?.planId || 'free';
      const plan = getPlanById(planId);
      
      if (!plan) {
        throw new Error('Plan not found');
      }

      return {
        ...plan,
        subscription,
        isActive: subscription?.status === 'active' || planId === 'free',
        trialDaysRemaining: subscription?.trialEnd 
          ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0
      };
    },
    enabled: true,
  });
}

// Get user's usage metrics
export function useUsageMetrics() {
  const { user } = useAuthStore();
  const { data: userPlan } = useUserPlan();

  return useQuery({
    queryKey: ['usage-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Get current month usage
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Get counts from actual data
      const [propertiesResult, tenantsResult, leasesResult] = await Promise.all([
        supabase.from('Property').select('id', { count: 'exact' }).eq('ownerId', user.id),
        supabase.from('Tenant').select('id', { count: 'exact' }).eq('ownerId', user.id),
        supabase.from('Lease').select('id', { count: 'exact' }).eq('ownerId', user.id)
      ]);

      const usage = {
        propertiesCount: propertiesResult.count || 0,
        tenantsCount: tenantsResult.count || 0,
        leasesCount: leasesResult.count || 0,
        storageUsed: 0, // TODO: Calculate actual storage usage
        apiCallsCount: 0, // TODO: Track API calls
        teamMembersCount: 1, // TODO: Implement team members
        leaseGenerationsCount: 0, // TODO: Track lease generations
      };

      // Check limits
      const limits = userPlan?.limits;
      const limitChecks = limits ? {
        propertiesExceeded: checkLimitExceeded(usage.propertiesCount, limits.properties),
        tenantsExceeded: checkLimitExceeded(usage.tenantsCount, limits.tenants),
        storageExceeded: checkLimitExceeded(usage.storageUsed, limits.storage),
        apiCallsExceeded: checkLimitExceeded(usage.apiCallsCount, limits.apiCalls),
        teamMembersExceeded: checkLimitExceeded(usage.teamMembersCount, limits.teamMembers || 1),
      } : null;

      return {
        ...usage,
        limits,
        limitChecks,
        month: currentMonth
      };
    },
    enabled: !!user?.id && !!userPlan,
  });
}

// Create Stripe checkout session
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ 
      planId, 
      billingPeriod,
      successUrl,
      cancelUrl,
      userEmail,
      userName,
      createAccount = false
    }: {
      planId: string;
      billingPeriod: 'monthly' | 'annual';
      successUrl?: string;
      cancelUrl?: string;
      userEmail?: string;
      userName?: string;
      createAccount?: boolean;
    }) => {
      // Call Vercel API route to create checkout session
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingPeriod,
          userId: user?.id || null,
          userEmail: user?.email || userEmail,
          userName: user?.name || userName,
          createAccount: createAccount || !user,
          successUrl: successUrl || `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: cancelUrl || `${window.location.origin}/pricing?checkout=cancelled`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error('Checkout session creation failed:', error);
      toast.error('Failed to start checkout process. Please try again.');
    },
  });
}

// Create Stripe Customer Portal session
export function useCreatePortalSession() {
  const { user } = useAuthStore();
  const { data: subscription } = useSubscription();

  return useMutation({
    mutationFn: async ({ returnUrl }: { returnUrl?: string } = {}) => {
      if (!user?.id) throw new Error('No user ID');
      if (!subscription?.stripeCustomerId) throw new Error('No Stripe customer ID');

      // Call Supabase Edge Function to create portal session
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId: subscription.stripeCustomerId,
          returnUrl: returnUrl || `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error('Portal session creation failed:', error);
      toast.error('Failed to open billing portal. Please try again.');
    },
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ cancelAtPeriodEnd = true }: { cancelAtPeriodEnd?: boolean } = {}) => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          userId: user.id,
          cancelAtPeriodEnd
        }
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      
      if (variables.cancelAtPeriodEnd) {
        toast.success('Subscription will be cancelled at the end of your billing period.');
      } else {
        toast.success('Subscription cancelled immediately.');
      }
    },
    onError: (error) => {
      console.error('Subscription cancellation failed:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    },
  });
}

// Get billing history
export function useBillingHistory() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['billing-history', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('Invoice')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116') {
          return [];
        }
        throw error;
      }

      return data as Invoice[];
    },
    enabled: !!user?.id,
  });
}

// Check if user can perform an action based on plan limits
export function useCanPerformAction() {
  const { data: usage } = useUsageMetrics();

  return {
    canAddProperty: () => {
      if (!usage?.limitChecks) return true;
      return !usage.limitChecks.propertiesExceeded;
    },
    canAddTenant: () => {
      if (!usage?.limitChecks) return true;
      return !usage.limitChecks.tenantsExceeded;
    },
    canAddTeamMember: () => {
      if (!usage?.limitChecks) return true;
      return !usage.limitChecks.teamMembersExceeded;
    },
    canUseAPI: () => {
      if (!usage?.limitChecks) return true;
      return !usage.limitChecks.apiCallsExceeded;
    },
    getUpgradeReason: (action: 'property' | 'tenant' | 'team' | 'api') => {
      const plan = usage?.limits;
      if (!plan) return '';

      switch (action) {
        case 'property':
          return `You've reached the limit of ${plan.properties} properties on your current plan.`;
        case 'tenant':
          return `You've reached the limit of ${plan.tenants} tenants on your current plan.`;
        case 'team':
          return `You've reached the limit of ${plan.teamMembers} team members on your current plan.`;
        case 'api':
          return `You've reached the limit of ${plan.apiCalls} API calls on your current plan.`;
        default:
          return 'Upgrade your plan to access this feature.';
      }
    }
  };
}

// Get all available plans
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      return PLANS.filter(plan => plan.active);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}