/**
 * Usage tracking and analytics types
 * All types related to usage metrics, tracking, and analytics
 */

// Usage tracking entity types
export interface LeaseGeneratorUsage {
  id: string
  userId: string | null
  email: string
  ipAddress: string | null
  userAgent: string | null
  usageCount: number | null
  paymentStatus: string | null
  stripeSessionId: string | null
  stripeCustomerId: string | null
  amountPaid: number | null
  currency: string | null
  paymentDate: Date | null
  accessExpiresAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

// Usage metrics for subscription limits
export interface UsageMetrics {
  id: string
  userId: string
  month: string // YYYY-MM format
  propertiesCount: number
  tenantsCount: number
  storageUsed: number // in MB
  apiCallsCount: number
  leaseGenerationsCount: number
  createdAt: Date
  updatedAt: Date
}

// Plan limits configuration
export interface PlanLimits {
  properties: number | 'unlimited'
  tenants: number | 'unlimited'
  storage: number // in MB
  apiCalls: number | 'unlimited'
  features: string[]
}

/**
 * Lead magnet tracking for lease generation
 */
export interface LeaseGenerationLead {
  email: string
  state: string // US state for lease generation
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
  source?: string // 'organic', 'google-ads', 'social', etc.
  medium?: string // 'cpc', 'email', 'referral', etc.
  campaign?: string // specific campaign name
  ipAddress?: string
  userAgent?: string
  referrer?: string
}

/**
 * Basic usage metrics for dashboard display
 */
export interface BasicUsageMetrics {
  properties: number
  tenants: number
  leases: number
  documents: number
  storage: number
  leaseGeneration: number
}

/**
 * Lead generation analytics
 */
export interface LeadAnalytics {
  totalLeads: number
  uniqueEmails: number
  topStates: Array<{ state: string; count: number }>
  topSources: Array<{ source: string; count: number }>
  conversionsByPeriod: Array<{
    period: string
    leads: number
    signups: number
    conversionRate: number
  }>
  recentLeads: LeaseGeneratorUsage[]
}