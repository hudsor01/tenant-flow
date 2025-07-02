import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function useCustomerPortal() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const redirectToPortal = async () => {
    if (!user) {
      toast.error('Please sign in to access billing portal');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the Supabase Edge Function to create portal session
      const { data, error: functionError } = await supabase.functions.invoke('create-portal-session', {
        body: {
          userId: user.id,
          returnUrl: `${window.location.origin}/dashboard?portal=return`
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to create portal session');
      }

      if (!data?.url) {
        throw new Error('Invalid portal session response');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToPortalWithFlow = async (flowType: 'payment_method_update' | 'subscription_cancel' | 'subscription_update') => {
    if (!user) {
      toast.error('Please sign in to access billing portal');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-portal-session', {
        body: {
          userId: user.id,
          returnUrl: `${window.location.origin}/dashboard?portal=return`,
          flowType
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to create portal session');
      }

      if (!data?.url) {
        throw new Error('Invalid portal session response');
      }

      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    redirectToPortal,
    redirectToPortalWithFlow,
    isLoading,
    error,
  };
}