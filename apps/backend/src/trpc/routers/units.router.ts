import { z } from 'zod'
import { createRouter, protectedProcedure } from '../trpc'
import type { UnitsService } from '../../units/units.service'
import type { AuthenticatedContext } from '../types/common'
import { TRPCError } from '@trpc/server'

export const createUnitsRouter = (unitsService: UnitsService) =>
	createRouter({
		list: protectedProcedure
			.input(
				z
					.object({
						propertyId: z.string().optional()
					})
					.optional()
			)
			.query(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input?: { propertyId?: string }
				}) => {
					try {
						if (input?.propertyId) {
							return await unitsService.getUnitsByProperty(
								input.propertyId,
								ctx.user.id
							)
						}
						return await unitsService.getUnitsByOwner(ctx.user.id)
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch units'
						})
					}
				}
			),

		byId: protectedProcedure
			.input(z.object({ id: z.string() }))
			.query(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: { id: string }
				}) => {
					try {
						return await unitsService.getUnitById(
							input.id,
							ctx.user.id
						)
					} catch {
						throw new TRPCError({
							code: 'NOT_FOUND',
							message: 'Unit not found'
						})
					}
				}
			),

		create: protectedProcedure
			.input(
				z.object({
					propertyId: z.string(),
					unitNumber: z.string(),
					bedrooms: z.number().int().min(0),
					bathrooms: z.number().min(0),
					squareFeet: z.number().int().min(0).optional(),
					MONTHLYRent: z.number().min(0),
					description: z.string().optional(),
					amenities: z.array(z.string()).optional()
				})
			)
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: {
						propertyId: string
						unitNumber: string
						bedrooms: number
						bathrooms: number
						squareFeet?: number
						MONTHLYRent: number
						description?: string
						amenities?: string[]
					}
				}) => {
					try {
						return await unitsService.createUnit(ctx.user.id, {
							propertyId: input.propertyId,
							unitNumber: input.unitNumber,
							bedrooms: input.bedrooms,
							bathrooms: input.bathrooms,
							squareFeet: input.squareFeet,
							rent: input.MONTHLYRent
						})
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to create unit'
						})
					}
				}
			),

		update: protectedProcedure
			.input(
				z.object({
					id: z.string(),
					unitNumber: z.string().optional(),
					bedrooms: z.number().int().min(0).optional(),
					bathrooms: z.number().min(0).optional(),
					squareFeet: z.number().int().min(0).optional(),
					MONTHLYRent: z.number().min(0).optional(),
					description: z.string().optional(),
					amenities: z.array(z.string()).optional()
				})
			)
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: {
						id: string
						unitNumber?: string
						bedrooms?: number
						bathrooms?: number
						squareFeet?: number
						MONTHLYRent?: number
						description?: string
						amenities?: string[]
					}
				}) => {
					try {
						const { id, MONTHLYRent, ...updateData } = input
						return await unitsService.updateUnit(id, ctx.user.id, {
							...updateData,
							rent: MONTHLYRent
						})
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to update unit'
						})
					}
				}
			),

		delete: protectedProcedure
			.input(z.object({ id: z.string() }))
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: { id: string }
				}) => {
					try {
						await unitsService.deleteUnit(input.id, ctx.user.id)
						return { success: true }
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to delete unit'
						})
					}
				}
			)
	})

export type UnitsRouter = ReturnType<typeof createUnitsRouter>
