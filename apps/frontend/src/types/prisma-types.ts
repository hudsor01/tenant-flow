// Re-export actual database enum types for frontend use
// NOTE: Subscription fields use strings, not enums in the database

// Plan Type enum - matches actual database enum values
export enum PlanType {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL', 
  ENTERPRISE = 'ENTERPRISE',
  FREE = 'FREE'
}

// String literal types for subscription fields (not database enums)
export type SubscriptionStatus = 
  | 'ACTIVE'
  | 'CANCELED' 
  | 'TRIALING'
  | 'PAST_DUE'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'UNPAID'

export type BillingPeriod = 'MONTHLY' | 'ANNUAL'

// Subscription type based on actual Prisma model (database uses strings, not enums)
export interface PrismaSubscription {
  id: string
  userId: string
  plan: string // Legacy field
  status: string // Database uses string, not enum
  planId?: string | null // Database uses string, not enum
  billingPeriod?: string | null // Database uses string, not enum
  startDate: Date
  endDate?: Date | null
  cancelledAt?: Date | null
  createdAt: Date
  updatedAt: Date
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  trialStart?: Date | null
  trialEnd?: Date | null
  cancelAtPeriodEnd?: boolean | null
  canceledAt?: Date | null
}