import { z } from 'zod'
import { router, tenantProcedure, protectedProcedure, publicProcedure } from '../trpc'
import { PaymentsService } from '../../payments/payments.service'
import { TRPCError } from '@trpc/server'
import {
  createPaymentSchema,
  updatePaymentSchema,
  paymentQuerySchema,
  paymentIdSchema,
  createStripePaymentSchema,
  stripeWebhookSchema,
  paymentSchema,
  paymentListSchema,
  paymentStatsSchema,
  stripePaymentIntentSchema,
  paymentReceiptSchema,
} from '../schemas/payment.schemas'

export const createPaymentsRouter = (paymentsService: PaymentsService) => {
  return router({
    list: tenantProcedure
      .input(paymentQuerySchema)
      .output(z.object({
        payments: z.array(paymentSchema),
        total: z.number(),
        totalAmount: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          // Add owner filter to query
          const ownerQuery = {
            ...input,
            page: input.offset ? Math.floor(parseInt(input.offset) / parseInt(input.limit || '10')) + 1 : 1,
            limit: input.limit ? parseInt(input.limit) : 10,
          }

          const payments = await paymentsService.findAll(ownerQuery)
          
          // Filter payments by owner's properties
          const filteredPayments = payments.filter(payment => 
            payment.Lease?.Unit?.Property?.ownerId === ctx.user.id
          )

          const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)

          return {
            payments: filteredPayments,
            total: filteredPayments.length,
            totalAmount,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch payments',
            cause: error,
          })
        }
      }),

    stats: protectedProcedure
      .output(paymentStatsSchema)
      .query(async ({ ctx }) => {
        try {
          const stats = await paymentsService.getStats()
          return {
            ...stats,
            collectionRate: Math.round(stats.collectionRate * 100) / 100,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch payment statistics',
            cause: error,
          })
        }
      }),

    byId: tenantProcedure
      .input(paymentIdSchema)
      .output(paymentSchema)
      .query(async ({ input, ctx }) => {
        try {
          const payment = await paymentsService.findOne(input.id)

          if (!payment) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Payment not found',
            })
          }

          // Verify owner access
          if (payment.Lease?.Unit?.Property?.ownerId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Access denied',
            })
          }

          return payment
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch payment',
            cause: error,
          })
        }
      }),

    create: protectedProcedure
      .input(createPaymentSchema)
      .output(paymentSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // TODO: Verify lease belongs to owner
          const payment = await paymentsService.create({
            ...input,
            status: 'PENDING',
          })

          return payment
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create payment',
            cause: error,
          })
        }
      }),

    update: tenantProcedure
      .input(updatePaymentSchema)
      .output(paymentSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { id, ...updateData } = input
          
          // First verify payment exists and owner has access
          const existingPayment = await paymentsService.findOne(id)
          if (!existingPayment) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Payment not found',
            })
          }

          if (existingPayment.Lease?.Unit?.Property?.ownerId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Access denied',
            })
          }

          return await paymentsService.update(id, updateData)
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update payment',
            cause: error,
          })
        }
      }),

    delete: tenantProcedure
      .input(paymentIdSchema)
      .output(paymentSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // First verify payment exists and owner has access
          const existingPayment = await paymentsService.findOne(input.id)
          if (!existingPayment) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Payment not found',
            })
          }

          if (existingPayment.Lease?.Unit?.Property?.ownerId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Access denied',
            })
          }

          return await paymentsService.remove(input.id)
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete payment',
            cause: error,
          })
        }
      }),

    // Stripe Integration Endpoints
    createStripePayment: protectedProcedure
      .input(createStripePaymentSchema)
      .output(stripePaymentIntentSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // TODO: Implement Stripe payment intent creation
          // This would integrate with the Stripe service
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Stripe payment creation not yet implemented',
          })
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create Stripe payment',
            cause: error,
          })
        }
      }),

    // Webhook endpoint for Stripe
    handleStripeWebhook: publicProcedure
      .input(stripeWebhookSchema)
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement Stripe webhook handling
          // This would process Stripe events and update payment status
          console.log('Stripe webhook received:', input)
          
          return { success: true }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to process Stripe webhook',
            cause: error,
          })
        }
      }),

    // Generate payment receipt
    generateReceipt: tenantProcedure
      .input(paymentIdSchema)
      .output(paymentReceiptSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // First verify payment exists and owner has access
          const payment = await paymentsService.findOne(input.id)
          if (!payment) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Payment not found',
            })
          }

          if (payment.Lease?.Unit?.Property?.ownerId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Access denied',
            })
          }

          // TODO: Implement receipt generation
          // This would generate a PDF receipt and return download URL
          return {
            payment,
            receipt: {
              id: `receipt_${payment.id}`,
              url: `${process.env.FRONTEND_URL}/receipts/${payment.id}`,
              downloadUrl: `${process.env.FRONTEND_URL}/api/receipts/${payment.id}/download`,
            },
          }
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate receipt',
            cause: error,
          })
        }
      }),
  })
}

// Export factory function for DI
export const paymentsRouter = createPaymentsRouter