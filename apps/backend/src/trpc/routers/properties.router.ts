import { z } from 'zod'
import { router, tenantProcedure, protectedProcedure } from '../trpc'
import { PropertiesService } from '../../properties/properties.service'
import { TRPCError } from '@trpc/server'
import {
  createPropertySchema,
  updatePropertySchema,
  propertyQuerySchema,
  propertyIdSchema,
  propertySchema,
  propertyListSchema,
  propertyStatsSchema,
} from '../schemas/property.schemas'

export const createPropertiesRouter = (propertiesService: PropertiesService) => {
  return router({
    list: tenantProcedure
      .input(propertyQuerySchema)
      .output(z.object({
        properties: z.array(propertySchema),
        total: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const properties = await propertiesService.getPropertiesByOwner(
            ctx.user.id,
            input
          )
          return {
            properties,
            total: properties.length,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch properties',
            cause: error,
          })
        }
      }),

    stats: protectedProcedure
      .output(propertyStatsSchema)
      .query(async ({ ctx }) => {
        try {
          const stats = await propertiesService.getPropertyStats(ctx.user.id)
          return {
            totalProperties: stats.totalProperties,
            totalUnits: stats.totalUnits,
            occupiedUnits: 0,
            vacantUnits: stats.totalUnits,
            totalRent: 0,
            collectedRent: 0,
            pendingRent: 0,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch property statistics',
            cause: error,
          })
        }
      }),

    byId: tenantProcedure
      .input(propertyIdSchema)
      .output(propertySchema)
      .query(async ({ input, ctx }) => {
        try {
          const property = await propertiesService.getPropertyById(
            input.id,
            ctx.user.id
          )

          if (!property) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Property not found',
            })
          }

          return property
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch property',
            cause: error,
          })
        }
      }),

    create: protectedProcedure
      .input(createPropertySchema)
      .output(propertySchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await propertiesService.createProperty(
            ctx.user.id,
            input
          )
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create property',
            cause: error,
          })
        }
      }),

    update: tenantProcedure
      .input(updatePropertySchema)
      .output(propertySchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { id, ...updateData } = input
          return await propertiesService.updateProperty(
            id,
            ctx.user.id,
            updateData
          )
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update property',
            cause: error,
          })
        }
      }),

    delete: tenantProcedure
      .input(propertyIdSchema)
      .output(propertySchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await propertiesService.deleteProperty(
            input.id,
            ctx.user.id
          )
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete property',
            cause: error,
          })
        }
      }),
  })
}

// Export factory function for DI
export const propertiesRouter = createPropertiesRouter