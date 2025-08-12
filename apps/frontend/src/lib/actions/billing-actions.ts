'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger'
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import type { 
  Subscription, 
  Invoice, 
  PaymentMethod, 
  UsageData
} from '@repo/shared/types/billing';

// Interface for formatted subscription data for success page
interface FormattedSubscription {
  planName: string
  billingInterval: 'monthly' | 'annual'
  amount: number
  currency: string
  nextBillingDate: string
  features: string[]
}

// Response type interfaces for billing actions
interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

interface PortalSessionResponse {
  url: string;
}

interface SubscriptionUpdateResponse {
  subscription: Subscription;
}

interface InvoiceDownloadResponse {
  url: string;
}

// Billing form schemas
const CheckoutSessionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
  successUrl: z.string().url('Valid success URL is required').optional(),
  cancelUrl: z.string().url('Valid cancel URL is required').optional(),
  trialPeriodDays: z.number().min(0, 'Trial period cannot be negative').optional(),
  couponId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const PortalSessionSchema = z.object({
  returnUrl: z.string().url('Valid return URL is required').optional(),
});

const SubscriptionUpdateSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional(),
});

export interface BillingFormState {
  errors?: {
    priceId?: string[];
    quantity?: string[];
    successUrl?: string[];
    cancelUrl?: string[];
    trialPeriodDays?: string[];
    couponId?: string[];
    returnUrl?: string[];
    prorationBehavior?: string[];
    _form?: string[];
  };
  success?: boolean;
  message?: string;
  data?: {
    url?: string;
    sessionId?: string;
    subscriptionId?: string;
  };
}

export async function createCheckoutSession(
  prevState: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const rawData = {
    priceId: formData.get('priceId'),
    quantity: formData.get('quantity') ? Number(formData.get('quantity')) : undefined,
    successUrl: formData.get('successUrl') || `${process.env.NEXT_PUBLIC_SITE_URL}/billing/success`,
    cancelUrl: formData.get('cancelUrl') || `${process.env.NEXT_PUBLIC_SITE_URL}/billing/cancel`,
    trialPeriodDays: formData.get('trialPeriodDays') ? Number(formData.get('trialPeriodDays')) : undefined,
    couponId: formData.get('couponId'),
    metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : undefined,
  };

  const result = CheckoutSessionSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post('/billing/create-checkout-session', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create checkout session'],
        },
      };
    }

    // Redirect to Stripe Checkout
    if (response.data && typeof response.data === 'object' && 'url' in response.data) {
      redirect((response.data as { url: string }).url);
    }

    return {
      success: true,
      data: response.data as CheckoutSessionResponse,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function createPortalSession(
  prevState: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const rawData = {
    returnUrl: formData.get('returnUrl') || `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
  };

  const result = PortalSessionSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post('/billing/create-portal-session', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create portal session'],
        },
      };
    }

    // Redirect to Stripe Customer Portal
    if (response.data && typeof response.data === 'object' && 'url' in response.data) {
      redirect((response.data as { url: string }).url);
    }

    return {
      success: true,
      data: response.data as PortalSessionResponse,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function updateSubscription(
  prevState: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const rawData = {
    priceId: formData.get('priceId'),
    quantity: formData.get('quantity') ? Number(formData.get('quantity')) : undefined,
    prorationBehavior: formData.get('prorationBehavior') || 'create_prorations',
  };

  const result = SubscriptionUpdateSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.put('/billing/subscription', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to update subscription'],
        },
      };
    }

    // Revalidate subscription data
    revalidateTag('subscription');
    revalidateTag('billing');
    revalidatePath('/settings');
    revalidatePath('/billing');

    return {
      success: true,
      message: 'Subscription updated successfully',
      data: {
        subscriptionId: (response.data as { subscription?: { id?: string } }).subscription?.id || ''
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function cancelSubscription(): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await apiClient.delete('/billing/subscription');

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to cancel subscription',
      };
    }

    // Revalidate subscription data
    revalidateTag('subscription');
    revalidateTag('billing');
    revalidatePath('/settings');
    revalidatePath('/billing');

    return {
      success: true,
      message: 'Subscription cancelled successfully',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function addPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await apiClient.post('/billing/payment-methods', { paymentMethodId });

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to add payment method',
      };
    }

    // Revalidate billing data
    revalidateTag('billing');
    revalidateTag('payment-methods');
    revalidatePath('/settings');
    revalidatePath('/billing');

    return {
      success: true,
      message: 'Payment method added successfully',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await apiClient.put('/billing/payment-methods/default', { paymentMethodId });

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to set default payment method',
      };
    }

    // Revalidate billing data
    revalidateTag('billing');
    revalidateTag('payment-methods');
    revalidatePath('/settings');
    revalidatePath('/billing');

    return {
      success: true,
      message: 'Default payment method updated successfully',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function downloadInvoice(invoiceId: string): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const response = await apiClient.get(`/billing/invoices/${invoiceId}/download`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to download invoice',
      };
    }

    return {
      success: true,
      url: (response.data as InvoiceDownloadResponse).url,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

// Server Component data fetchers with caching
export async function getSubscriptionData(): Promise<Subscription | null> {
  try {
    const response = await apiClient.get<Subscription>('/billing/subscription');
    return response.success ? response.data as Subscription : null;
  } catch (error: unknown) {
    logger.error('Get subscription data error:', error instanceof Error ? error : new Error(String(error)), { component: 'UbillingActions' });
    return null;
  }
}

export async function getPaymentMethodsData(): Promise<PaymentMethod[]> {
  try {
    const response = await apiClient.get<PaymentMethod[]>('/billing/payment-methods');
    return response.success ? response.data as PaymentMethod[] : [];
  } catch (error: unknown) {
    logger.error('Get payment methods data error:', error instanceof Error ? error : new Error(String(error)), { component: 'UbillingActions' });
    return [];
  }
}

export async function getInvoicesData(): Promise<Invoice[]> {
  try {
    const response = await apiClient.get<Invoice[]>('/billing/invoices');
    return response.success ? response.data as Invoice[] : [];
  } catch (error: unknown) {
    logger.error('Get invoices data error:', error instanceof Error ? error : new Error(String(error)), { component: 'UbillingActions' });
    return [];
  }
}

export async function getUsageData(): Promise<UsageData | null> {
  try {
    const response = await apiClient.get<UsageData>('/billing/usage');
    return response.success ? response.data as UsageData : null;
  } catch (error: unknown) {
    logger.error('Get usage data error:', error instanceof Error ? error : new Error(String(error)), { component: 'UbillingActions' });
    return null;
  }
}

// Quick action for subscription upgrades/downgrades
export async function upgradeSubscription(priceId: string) {
  try {
    const response = await apiClient.put('/billing/subscription', {
      priceId,
      prorationBehavior: 'create_prorations',
    });

    // Revalidate subscription data
    revalidateTag('subscription');
    revalidateTag('billing');
    revalidatePath('/settings');

    return { 
      success: response.success,
      data: response.data as SubscriptionUpdateResponse
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { 
      success: false, 
      error: message 
    };
  }
}

/**
 * Server Action - Verify Checkout Session
 * Fetches and formats subscription data after successful checkout
 */
export async function verifyCheckoutSession(_sessionId?: string | null): Promise<{
  subscription: FormattedSubscription | null
  error: string | null
}> {
  try {
    // Fetch current subscription status using existing function
    const subscription = await getSubscriptionData()

    if (!subscription) {
      return {
        subscription: null,
        error: null // No subscription yet is not an error
      }
    }

    // Format subscription data for client component
    const formattedSubscription: FormattedSubscription = {
      planName: formatPlanName(subscription.stripePriceId || subscription.plan || 'Subscription'),
      billingInterval: (subscription.billingPeriod as 'monthly' | 'annual') || 'monthly',
      amount: 0, // Amount would need to be fetched from plan data
      currency: 'usd',
      nextBillingDate: subscription.currentPeriodEnd?.toISOString() || new Date().toISOString(),
      features: getDefaultFeatures(subscription.stripePriceId || 'starter')
    }

    return {
      subscription: formattedSubscription,
      error: null
    }

  } catch (error) {
    logger.error('Failed to verify subscription:', error instanceof Error ? error : new Error(String(error)), { component: 'UbillingActions' })
    
    return {
      subscription: null,
      error: error instanceof Error 
        ? error.message 
        : 'Failed to verify subscription'
    }
  }
}

// Helper functions
function formatPlanName(priceIdOrPlan: string): string {
  const planNames: Record<string, string> = {
    'starter': 'Starter',
    'professional': 'Professional', 
    'enterprise': 'Enterprise',
    'basic': 'Basic',
    'premium': 'Premium',
    'pro': 'Professional'
  }
  
  // Extract plan name from price ID if it contains plan info
  const planType = priceIdOrPlan.toLowerCase()
  for (const [key, value] of Object.entries(planNames)) {
    if (planType.includes(key)) {
      return value
    }
  }
  
  return planNames[planType] || 'Subscription'
}

function getDefaultFeatures(priceIdOrPlan: string): string[] {
  const defaultFeatures: Record<string, string[]> = {
    'starter': [
      'Up to 5 properties',
      'Basic tenant management',
      'Maintenance tracking',
      'Email support'
    ],
    'professional': [
      'Up to 25 properties',
      'Advanced reporting',
      'Tenant portal',
      'Priority support',
      'Financial tracking'
    ],
    'enterprise': [
      'Unlimited properties',
      'Custom integrations',
      'Advanced analytics',
      'Dedicated support',
      'White-label options'
    ]
  }
  
  const planType = priceIdOrPlan.toLowerCase()
  for (const [key, features] of Object.entries(defaultFeatures)) {
    if (planType.includes(key)) {
      return features
    }
  }
  
  return defaultFeatures['starter'] || []
}