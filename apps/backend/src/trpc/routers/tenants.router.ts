import { z } from 'zod'
import { router, tenantProcedure, protectedProcedure, publicProcedure } from '../trpc'
import { TenantsService } from '../../tenants/tenants.service'
import { TRPCError } from '@trpc/server'
import {
  createTenantSchema,
  updateTenantSchema,
  tenantQuerySchema,
  tenantIdSchema,
  acceptInvitationSchema,
  verifyInvitationSchema,
  tenantSchema,
  tenantListSchema,
  tenantStatsSchema,
  invitationVerificationSchema,
  invitationAcceptanceSchema,
} from '../schemas/tenant.schemas'

export const createTenantsRouter = (tenantsService: TenantsService) => {
  return router({
    list: tenantProcedure
      .input(tenantQuerySchema)
      .output(z.object({
        tenants: z.array(tenantSchema),
        total: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const tenants = await tenantsService.getTenantsByOwner(
            ctx.user.id,
            input
          )
          return {
            tenants,
            total: tenants.length,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch tenants',
            cause: error,
          })
        }
      }),

    stats: protectedProcedure
      .output(tenantStatsSchema)
      .query(async ({ ctx }) => {
        try {
          return await tenantsService.getTenantStats(ctx.user.id)
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch tenant statistics',
            cause: error,
          })
        }
      }),

    byId: tenantProcedure
      .input(tenantIdSchema)
      .output(tenantSchema)
      .query(async ({ input, ctx }) => {
        try {
          const tenant = await tenantsService.getTenantById(
            input.id,
            ctx.user.id
          )

          if (!tenant) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Tenant not found',
            })
          }

          return tenant
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch tenant',
            cause: error,
          })
        }
      }),

    invite: protectedProcedure
      .input(createTenantSchema)
      .output(tenantSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await tenantsService.createTenant(
            ctx.user.id,
            input
          )
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to send tenant invitation',
            cause: error,
          })
        }
      }),

    update: tenantProcedure
      .input(updateTenantSchema)
      .output(tenantSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { id, ...updateData } = input
          return await tenantsService.updateTenant(
            id,
            ctx.user.id,
            updateData
          )
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update tenant',
            cause: error,
          })
        }
      }),

    delete: tenantProcedure
      .input(tenantIdSchema)
      .output(tenantSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await tenantsService.deleteTenant(
            input.id,
            ctx.user.id
          )
        } catch (error) {
          if (error.message === 'Tenant not found') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Tenant not found',
            })
          }
          if (error.message === 'Cannot delete tenant with active leases') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Cannot delete tenant with active leases',
            })
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete tenant',
            cause: error,
          })
        }
      }),

    // Public endpoints for invitation flow
    verifyInvitation: publicProcedure
      .input(verifyInvitationSchema)
      .output(invitationVerificationSchema)
      .query(async ({ input }) => {
        try {
          return await tenantsService.verifyInvitation(input.token)
        } catch (error) {
          if (error.message.includes('Invalid') || error.message.includes('expired')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            })
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify invitation',
            cause: error,
          })
        }
      }),

    acceptInvitation: publicProcedure
      .input(acceptInvitationSchema)
      .output(invitationAcceptanceSchema)
      .mutation(async ({ input }) => {
        try {
          return await tenantsService.acceptInvitation(input.token, {
            password: input.password,
            userInfo: input.userInfo,
          })
        } catch (error) {
          if (error.message.includes('Invalid') || error.message.includes('expired')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            })
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to accept invitation',
            cause: error,
          })
        }
      }),
  })
}

// Export factory function for DI
export const tenantsRouter = createTenantsRouter