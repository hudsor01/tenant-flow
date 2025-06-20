import { STRIPE_CONFIG } from '@/lib/stripe-config';

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  planId: 'free' | 'starter' | 'professional' | 'enterprise';
  billingPeriod: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  properties: number | 'unlimited';
  tenants: number | 'unlimited';
  storage: number; // in MB
  apiCalls: number | 'unlimited';
  teamMembers: number | 'unlimited';
}

export interface Plan {
  id: 'free' | 'starter' | 'professional' | 'enterprise';
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  limits: PlanLimits;
  features: string[];
  active: boolean;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  invoiceDate: string;
  dueDate: string;
  paidAt?: string;
  invoiceUrl?: string;
  invoicePdf?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageMetrics {
  id: string;
  userId: string;
  month: string; // YYYY-MM format
  propertiesCount: number;
  tenantsCount: number;
  storageUsed: number; // in MB
  apiCallsCount: number;
  teamMembersCount: number;
  leaseGenerationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistory {
  id: string;
  userId: string;
  type: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'invoice_created';
  description: string;
  amount?: number;
  currency?: string;
  stripeEventId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Plan definitions
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    description: 'Perfect for getting started with property management',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      properties: 2,
      tenants: 5,
      storage: 100, // 100MB
      apiCalls: 100,
      teamMembers: 1
    },
    features: [
      'Free lease generator (Texas)',
      'Up to 2 properties',
      'Up to 5 tenants',
      'Basic payment tracking',
      'Maintenance requests',
      'Email notifications',
      'Mobile responsive design'
    ],
    active: true
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal for small property owners and landlords',
    monthlyPrice: 29,
    annualPrice: 290,
    stripePriceIdMonthly: STRIPE_CONFIG.priceIds.starter.monthly,
    stripePriceIdAnnual: STRIPE_CONFIG.priceIds.starter.annual,
    limits: {
      properties: 10,
      tenants: 50,
      storage: 1024, // 1GB
      apiCalls: 1000,
      teamMembers: 2
    },
    features: [
      'Everything in Free',
      'Up to 10 properties',
      'Up to 50 tenants',
      'Advanced payment tracking',
      'Lease management',
      'Property analytics',
      'Tenant portal access',
      'Email support',
      'Custom lease templates',
      'Rent collection tools'
    ],
    active: true
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Best for growing property management businesses',
    monthlyPrice: 79,
    annualPrice: 790,
    stripePriceIdMonthly: STRIPE_CONFIG.priceIds.professional.monthly,
    stripePriceIdAnnual: STRIPE_CONFIG.priceIds.professional.annual,
    limits: {
      properties: 50,
      tenants: 500,
      storage: 10240, // 10GB
      apiCalls: 10000,
      teamMembers: 5
    },
    features: [
      'Everything in Starter',
      'Up to 50 properties',
      'Up to 500 tenants',
      'Advanced reporting & analytics',
      'Bulk operations',
      'API access',
      'Multi-user accounts',
      'Priority support',
      'Custom branding',
      'Integration support',
      'Late fee automation',
      'Financial reporting'
    ],
    active: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large property management companies',
    monthlyPrice: 199,
    annualPrice: 1990,
    stripePriceIdMonthly: STRIPE_CONFIG.priceIds.enterprise.monthly,
    stripePriceIdAnnual: STRIPE_CONFIG.priceIds.enterprise.annual,
    limits: {
      properties: 'unlimited',
      tenants: 'unlimited',
      storage: 'unlimited',
      apiCalls: 'unlimited',
      teamMembers: 'unlimited'
    },
    features: [
      'Everything in Professional',
      'Unlimited properties',
      'Unlimited tenants',
      'Custom integrations',
      'Dedicated account manager',
      'Phone support',
      'Custom onboarding',
      'SLA guarantees',
      'Advanced security',
      'Custom reporting',
      'White-label options',
      'Training & consulting'
    ],
    active: true
  }
];

// Helper functions
export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find(plan => plan.id === planId);
}

export function getPlanLimits(planId: string): PlanLimits | undefined {
  const plan = getPlanById(planId);
  return plan?.limits;
}

export function checkLimitExceeded(current: number, limit: number | 'unlimited'): boolean {
  if (limit === 'unlimited') return false;
  return current >= limit;
}

export function calculateUsagePercentage(current: number, limit: number | 'unlimited'): number {
  if (limit === 'unlimited') return 0;
  return Math.min((current / limit) * 100, 100);
}