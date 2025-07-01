// Temporary safe version of useSubscription that handles missing tables
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { PLANS, getPlanById } from '@/types/subscription';

// Safe wrapper that returns free plan when subscription table is missing
export function useUserPlan() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        const freePlan = getPlanById('free');
        return { ...freePlan, isActive: true, subscription: null, trialDaysRemaining: 0 };
      }

      try {
        // Try to get subscription data
        const { data: subscription, error } = await supabase
          .from('Subscription')
          .select('*')
          .eq('userId', user.id)
          .eq('status', 'active')
          .single();

        if (error?.code === '42P01' || error?.code === '42501') { 
          // Table doesn't exist (42P01) or permission denied (42501)
          const freePlan = getPlanById('free');
          return { ...freePlan, isActive: true, subscription: null, trialDaysRemaining: 0 };
        }

        if (error) {
          // Handle any other errors (403, 400, etc.) by returning free plan
          console.warn('Subscription query error:', error);
          const freePlan = getPlanById('free');
          return { ...freePlan, isActive: true, subscription: null, trialDaysRemaining: 0 };
        }

        const planId = subscription?.planId || 'free';
        const plan = getPlanById(planId);
        
        return {
          ...plan,
          subscription,
          isActive: subscription?.status === 'active' || planId === 'free',
          trialDaysRemaining: 0
        };
      } catch {
        // Default to free plan on any error
        const freePlan = getPlanById('free');
        return { ...freePlan, isActive: true, subscription: null, trialDaysRemaining: 0 };
      }
    },
    enabled: true,
    retry: false, // Don't retry on failure
  });
}

// Safe usage metrics that handles missing tables
export function useUsageMetrics() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['usage-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      try {
        // Get counts from existing tables only
        const [propertiesResult, tenantsResult, leasesResult] = await Promise.all([
          supabase.from('Property').select('id', { count: 'exact' }).eq('ownerId', user.id),
          supabase.from('Tenant').select('id', { count: 'exact' }).eq('invitedBy', user.id),
          supabase.from('Lease').select('id', { count: 'exact' }),
        ]);

        return {
          properties: propertiesResult.count || 0,
          tenants: tenantsResult.count || 0,
          leases: leasesResult.count || 0,
          storageUsed: 0, // Default when Document table doesn't exist
          leaseGenerations: 0, // Default when UsageRecord table doesn't exist
        };
      } catch {
        // Return safe defaults on any error
        return {
          properties: 0,
          tenants: 0,
          leases: 0,
          storageUsed: 0,
          leaseGenerations: 0,
        };
      }
    },
    enabled: !!user?.id,
    retry: false,
  });
}

// Safe check for action permissions
export function useCanPerformAction(action: keyof typeof PLANS['free']['limits']) {
  const { data: userPlan } = useUserPlan();
  const { data: usage } = useUsageMetrics();

  const canPerform = () => {
    if (!userPlan || !usage) return true; // Allow by default if data not loaded
    
    const limit = userPlan.limits[action];
    if (limit === 'unlimited' || limit === undefined) return true;
    
    const currentUsage = usage[action as keyof typeof usage] || 0;
    return currentUsage < limit;
  };

  return {
    canPerform: canPerform(),
    currentUsage: usage?.[action as keyof typeof usage] || 0,
    limit: userPlan?.limits[action] || 'unlimited',
    isLoading: !userPlan || !usage,
  };
}