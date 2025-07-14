import { z } from 'zod'
import { PlanType } from '@prisma/client'

// Database uses strings for most subscription fields, with only PlanType as an enum
export const planTypeSchema = z.nativeEnum(PlanType)

// Define string schemas for fields that are stored as strings in the database
export const subscriptionStatusSchema = z.enum([
  'ACTIVE',
  'CANCELED', 
  'TRIALING',
  'PAST_DUE',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'UNPAID'
])

export const billingPeriodSchema = z.enum(['MONTHLY', 'ANNUAL'])

// Input schemas for API endpoints
export const createSubscriptionSchema = z.object({
  planId: z.string(), // Accept string input, validate against available plans in service
  billingPeriod: billingPeriodSchema,
  paymentMethodCollection: z.enum(['always', 'if_required']).optional().default('always'),
  userId: z.string().optional(),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  createAccount: z.boolean().optional(),
})

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
})

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID').optional(), // Make optional since we'll use user context
  planId: planTypeSchema.optional(),
  billingPeriod: billingPeriodSchema.optional(),
})

export const createPortalSessionSchema = z.object({
  customerId: z.string().optional(), // Made optional since we can get it from user context
  returnUrl: z.string().url('Invalid return URL').optional(),
})

// Usage metrics schema
export const usageMetricsSchema = z.object({
  properties: z.number().min(0),
  tenants: z.number().min(0),
  leases: z.number().min(0),
  documents: z.number().min(0),
  storage: z.number().min(0), // in MB
  leaseGeneration: z.number().min(0), // current month
})

// Plan limits schema
export const planLimitsSchema = z.object({
  properties: z.number().min(-1), // -1 = unlimited
  tenants: z.number().min(-1),
  storage: z.number().min(-1), // in MB
  leaseGeneration: z.number().min(-1),
  support: z.string(),
})

// Plan details schema - stripePriceId can be either string (FREE plan) or object (paid plans)
const stripePriceIdSchema = z.union([
  z.string(), // For FREE plan
  z.object({
    MONTHLY: z.string(),
    ANNUAL: z.string(),
  }) // For paid plans
]).optional()

export const planDetailsSchema = z.object({
  id: planTypeSchema,
  name: z.string(),
  price: z.number().min(0),
  billingPeriod: billingPeriodSchema,
  stripePriceId: stripePriceIdSchema,
  limits: planLimitsSchema,
  features: z.array(z.string()),
})

// Output schemas for API responses
export const subscriptionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.string(), // Database stores as string
  planId: z.string().nullable(), // Database stores as string
  billingPeriod: z.string().nullable(), // Database stores as string
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  trialStart: z.date().nullable(),
  trialEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const subscriptionWithPlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plan: planDetailsSchema,
  status: subscriptionStatusSchema,
  planId: planTypeSchema,
  billingPeriod: billingPeriodSchema,
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  trialStart: z.date().nullable(),
  trialEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  usage: usageMetricsSchema,
  isOverLimit: z.boolean(),
  limitsExceeded: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createSubscriptionResponseSchema = z.object({
  subscriptionId: z.string(),
  status: subscriptionStatusSchema,
  clientSecret: z.string().nullable().optional(),
  setupIntentId: z.string().optional(),
  trialEnd: z.number().nullable().optional(), // Unix timestamp
})

export const portalSessionResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string().optional(),
})

export const plansListSchema = z.array(planDetailsSchema)

// ID-only schemas for simple operations
export const subscriptionIdSchema = z.object({
  id: z.string().uuid('Invalid subscription ID'),
})

export const userIdSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
})