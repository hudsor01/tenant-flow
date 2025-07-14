import { z } from 'zod'

// Payment status enum
export const paymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING', 
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
])

// Payment method enum  
export const paymentMethodSchema = z.enum([
  'CASH',
  'CHECK', 
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'ACH',
  'STRIPE',
  'OTHER'
])

// Create payment schema
export const createPaymentSchema = z.object({
  leaseId: z.string().uuid('Invalid lease ID'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime('Invalid date format'),
  dueDate: z.string().datetime('Invalid due date format').optional(),
  method: paymentMethodSchema.default('STRIPE'),
  description: z.string().max(500).optional(),
  reference: z.string().max(255).optional(),
  stripePaymentIntentId: z.string().optional(),
})

// Update payment schema
export const updatePaymentSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
  amount: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  method: paymentMethodSchema.optional(),
  status: paymentStatusSchema.optional(),
  description: z.string().max(500).optional(),
  reference: z.string().max(255).optional(),
  stripePaymentIntentId: z.string().optional(),
})

// Payment query schema
export const paymentQuerySchema = z.object({
  leaseId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

// Payment ID schema
export const paymentIdSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
})

// Stripe payment intent schema
export const createStripePaymentSchema = z.object({
  leaseId: z.string().uuid('Invalid lease ID'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  paymentMethodId: z.string().optional(),
})

// Stripe webhook schema
export const stripeWebhookSchema = z.object({
  eventType: z.string(),
  paymentIntentId: z.string(),
  amount: z.number(),
  status: z.string(),
  metadata: z.record(z.string()).optional(),
})

// Response schemas
export const leaseReferenceSchema = z.object({
  id: z.string(),
  monthlyRent: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.string(),
  Unit: z.object({
    id: z.string(),
    unitNumber: z.string(),
    Property: z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
    }),
  }),
  Tenant: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    User: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
    }).nullable(),
  }),
})

export const paymentSchema = z.object({
  id: z.string(),
  leaseId: z.string(),
  amount: z.number(),
  date: z.date(),
  dueDate: z.date().nullable(),
  status: paymentStatusSchema,
  method: paymentMethodSchema,
  description: z.string().nullable(),
  reference: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  Lease: leaseReferenceSchema.optional(),
})

export const paymentListSchema = z.object({
  payments: z.array(paymentSchema),
  total: z.number(),
  totalAmount: z.number(),
})

export const paymentStatsSchema = z.object({
  totalPayments: z.number(),
  totalAmount: z.number(),
  pendingAmount: z.number(),
  overdueAmount: z.number(),
  collectionRate: z.number(),
  monthlyTrend: z.array(z.object({
    month: z.string(),
    amount: z.number(),
    count: z.number(),
  })).optional(),
})

export const stripePaymentIntentSchema = z.object({
  id: z.string(),
  clientSecret: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
})

export const paymentReceiptSchema = z.object({
  payment: paymentSchema,
  receipt: z.object({
    id: z.string(),
    url: z.string().optional(),
    downloadUrl: z.string().optional(),
  }),
})