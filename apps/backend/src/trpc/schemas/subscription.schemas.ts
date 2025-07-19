import { z } from 'zod'
import { 
  uuidSchema, 
  emailSchema,
  nonEmptyStringSchema
} from './common.schemas'

// Database uses strings for most subscription fields, with only PlanType as an enum
export const planTypeSchema = z.enum(['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const)

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
  planId: nonEmptyStringSchema, // Accept string input, validate against available plans in service
  billingPeriod: billingPeriodSchema.optional().default('MONTHLY'),
  paymentMethodCollection: z.enum(['always', 'if_required']).optional().default('always'),
  userId: uuidSchema.optional(),
  userEmail: emailSchema.optional(),
  userName: nonEmptyStringSchema.optional(),
  createAccount: z.boolean().optional(),
})

export const cancelSubscriptionSchema = z.object({
  subscriptionId: uuidSchema,
})

export const updateSubscriptionSchema = z.object({
  subscriptionId: uuidSchema.optional(), // Make optional since we'll use user context
  planId: planTypeSchema.optional(),
  billingPeriod: billingPeriodSchema.optional(),
})

export const createPortalSessionSchema = z.object({
  customerId: z.string().optional(), // Made optional since we can get it from user context
  returnUrl: z.string().url('Invalid return URL').optional(),
})

// Usage metrics schema - simplified for MVP
export const usageMetricsSchema = z.object({
  properties: z.number().min(0),
  tenants: z.number().min(0),
})

// Plan limits schema - simplified for MVP
export const planLimitsSchema = z.object({
  properties: z.number().min(-1), // -1 = unlimited
  tenants: z.number().min(-1),
})

// Plan details schema - simplified for MVP
export const planDetailsSchema = z.object({
  id: planTypeSchema,
  name: z.string(),
  price: z.number().min(0),
  stripePriceId: z.string().optional(),
  limits: planLimitsSchema,
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
  planId: planTypeSchema.nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  trialEnd: z.date().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  usage: usageMetricsSchema,
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